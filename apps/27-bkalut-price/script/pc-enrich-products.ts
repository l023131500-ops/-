/**
 * Price Comparison — product ENRICHMENT script (Open Food Facts).
 *
 * Runs OUTSIDE the web server (GitHub Actions weekly cron, or `npm run pc:enrich`).
 * For products that still lack a category and/or image, it looks the barcode up
 * on the Open Food Facts (OFF) public API and fills in:
 *   - category_id  (mapped from OFF categories_tags onto our pc_categories)
 *   - image_url    (OFF front image, when present)
 * It NEVER overwrites a value that already exists and never touches prices or
 * the rights/fin_* tables.
 *
 * OFF etiquette: we send a descriptive User-Agent and throttle requests. The
 * public read API is rate-limited to ~100 req/min per the OFF docs, so we cap
 * concurrency and pause between batches.
 *
 * Usage:
 *   tsx script/pc-enrich-products.ts                 # enrich up to --limit products
 *   tsx script/pc-enrich-products.ts --dry-run       # look up, write nothing
 *   tsx script/pc-enrich-products.ts --limit=2000    # cap products this run (default 3000)
 *   tsx script/pc-enrich-products.ts --concurrency=4 # parallel OFF lookups (default 4)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required unless --dry-run).
 *      PC_ENRICH_LIMIT / PC_ENRICH_CONCURRENCY optionally override the CLI.
 *      OFF_USER_AGENT optionally overrides the contact User-Agent.
 */
// --- TLS bootstrap (mirrors pc-daily-import.ts; harmless for OFF too) ------
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PC_CA_PATH = resolvePath(dirname(fileURLToPath(import.meta.url)), "pc/certs/sectigo-server-auth-dv-r36.pem");
if (existsSync(PC_CA_PATH) && process.env.NODE_EXTRA_CA_CERTS !== PC_CA_PATH && process.env.PC_CA_BOOTSTRAPPED !== "1") {
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, NODE_EXTRA_CA_CERTS: PC_CA_PATH, PC_CA_BOOTSTRAPPED: "1" },
  });
  process.exit(r.status ?? 1);
}
// --------------------------------------------------------------------------

import { PcSupabaseRepo } from "./pc/supabase-repo.ts";

interface Args {
  dryRun: boolean;
  limit: number;
  concurrency: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string): string | undefined => {
    const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (!hit) return undefined;
    const eq = hit.indexOf("=");
    return eq === -1 ? "true" : hit.slice(eq + 1);
  };
  const num = (v: string | undefined, fallback: number) => (v && Number.isFinite(Number(v)) ? Math.max(1, Number(v)) : fallback);
  return {
    dryRun: get("dry-run") === "true",
    limit: num(get("limit") ?? process.env.PC_ENRICH_LIMIT, 3000),
    concurrency: num(get("concurrency") ?? process.env.PC_ENRICH_CONCURRENCY, 4),
  };
}

const OFF_USER_AGENT = process.env.OFF_USER_AGENT
  || "bkalut-price-compare/1.0 (https://bkalut; contact: l023131500@gmail.com)";

// Our pc_categories slugs → matched here by slug, resolved to ids at runtime.
// Ordered MOST-SPECIFIC first: the first rule whose keyword appears in any OFF
// category tag wins, so e.g. "baby-food" beats the generic "snacks".
const CATEGORY_RULES: Array<{ slug: string; keywords: string[] }> = [
  { slug: "baby", keywords: ["baby", "infant", "follow-on", "babies"] },
  { slug: "pets", keywords: ["pet-food", "cat-food", "dog-food", "pet-"] },
  { slug: "alcohol", keywords: ["alcoholic", "wines", "beers", "spirits", "vodka", "whisky", "liqueur", "arak"] },
  { slug: "coffee-tea", keywords: ["coffees", "coffee", "teas", "-tea", "hot-beverages", "cocoa-and-chocolate-powders"] },
  { slug: "beverages", keywords: ["beverages", "drinks", "sodas", "juices", "waters", "energy-drinks", "iced-teas"] },
  { slug: "dairy-eggs", keywords: ["dairies", "dairy", "milks", "cheeses", "yogurts", "eggs", "butters", "creams"] },
  { slug: "meat-poultry", keywords: ["meats", "poultry", "chickens", "beef", "sausages", "hams", "deli", "kebab"] },
  { slug: "fish", keywords: ["fishes", "seafood", "tuna", "salmon", "canned-fish"] },
  { slug: "frozen", keywords: ["frozen", "ice-cream", "ice-creams", "sorbet"] },
  { slug: "bakery", keywords: ["breads", "bakery", "pastries", "viennoiserie", "buns", "pita"] },
  { slug: "grains-pasta-rice", keywords: ["pastas", "rice", "cereals", "couscous", "flours", "noodles", "legumes", "lentils"] },
  { slug: "snacks-sweets", keywords: ["snacks", "chocolates", "candies", "biscuits", "crackers", "sweet-snacks", "confectioneries", "chips", "wafers", "cookies"] },
  { slug: "canned-cooking", keywords: ["canned", "preserves", "tinned", "ready-meals", "soups", "meals"] },
  { slug: "spices-sauces", keywords: ["sauces", "condiments", "spices", "seasonings", "ketchup", "mayonnaise", "mustard", "tahini", "hummus", "dips"] },
  { slug: "oil-vinegar", keywords: ["vegetable-oils", "olive-oils", "oils", "vinegars", "salt"] },
  { slug: "baking", keywords: ["baking", "sugars", "honeys", "jams", "spreads", "syrups", "desserts", "puddings"] },
  { slug: "fruits-vegetables", keywords: ["fruits", "vegetables", "legume", "fresh-foods", "plant-based"] },
  { slug: "toiletries", keywords: ["hygiene", "cosmetics", "shampoos", "soaps", "toothpastes", "deodorants", "body-care"] },
  { slug: "cleaning-disposable", keywords: ["cleaning", "detergents", "household", "paper-products", "disposable"] },
  { slug: "health-supplements", keywords: ["dietary-supplements", "supplements", "vitamins", "medicines", "health"] },
];

interface OffLookup {
  found: boolean;
  imageUrl: string | null;
  categorySlug: string | null;
}

async function lookupOff(barcode: string): Promise<OffLookup> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
    + "?fields=product_name,image_url,image_front_url,categories_tags";
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": OFF_USER_AGENT, accept: "application/json" } });
  } catch {
    return { found: false, imageUrl: null, categorySlug: null };
  }
  if (res.status === 404) return { found: false, imageUrl: null, categorySlug: null };
  if (!res.ok) return { found: false, imageUrl: null, categorySlug: null };
  let body: any;
  try { body = await res.json(); } catch { return { found: false, imageUrl: null, categorySlug: null }; }
  if (body?.status !== 1 || !body.product) return { found: false, imageUrl: null, categorySlug: null };
  const p = body.product;
  const imageUrl: string | null = p.image_front_url || p.image_url || null;
  const tags: string[] = Array.isArray(p.categories_tags) ? p.categories_tags.map((t: string) => String(t).toLowerCase()) : [];
  let categorySlug: string | null = null;
  for (const rule of CATEGORY_RULES) {
    if (tags.some((t) => rule.keywords.some((k) => t.includes(k)))) { categorySlug = rule.slug; break; }
  }
  return { found: true, imageUrl, categorySlug };
}

interface ProductRow { id: number; barcode: string; }

async function main() {
  const args = parseArgs();
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("\nשגיאה: חסרים סודות Supabase (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).\n");
    process.exit(2);
  }

  const repo = new PcSupabaseRepo(url, key, args.dryRun);
  const client = repo.client;

  // Resolve category slug → id.
  const { data: cats, error: catErr } = await client.from("pc_categories").select("id,slug");
  if (catErr) { console.error(`קריאת קטגוריות נכשלה: ${catErr.message}`); process.exit(3); }
  const slugToId = new Map<string, number>();
  for (const c of (cats ?? []) as Array<{ id: number; slug: string | null }>) {
    if (c.slug) slugToId.set(c.slug, c.id);
  }
  const uncategorizedId = slugToId.get("uncategorized") ?? null;

  // Candidates: products with a usable barcode that still miss a category OR
  // image. We march through the catalog across runs by ordering least-recently
  // -checked first (NULLs = never checked first), so a permanent OFF-miss is not
  // re-queried every week before we have even tried the rest of the catalogue.
  // PostgREST caps every response at 1000 rows regardless of .limit(), so we
  // page with .range() until we have args.limit rows or run out.
  const PAGE = 1000;
  const rows: ProductRow[] = [];
  for (let from = 0; rows.length < args.limit; from += PAGE) {
    const to = from + PAGE - 1;
    const { data, error: selErr } = await client
      .from("pc_products")
      .select("id,barcode")
      .not("barcode", "is", null)
      .neq("barcode", "")
      .or("category_id.is.null,image_url.is.null")
      .order("enrich_checked_at", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true })
      .range(from, to);
    if (selErr) { console.error(`קריאת מוצרים נכשלה: ${selErr.message}`); process.exit(3); }
    const page = (data ?? []) as ProductRow[];
    rows.push(...page);
    if (page.length < PAGE) break; // last page
  }

  const candidates = rows.slice(0, args.limit).filter((r) => r.barcode && r.barcode.length >= 8);
  console.log(`מועמדים להעשרה: ${candidates.length} (limit=${args.limit}, concurrency=${args.concurrency}, dryRun=${args.dryRun}).`);
  if (candidates.length === 0) { console.log("אין מוצרים להעשרה."); return; }

  let processed = 0, offFound = 0, catSet = 0, imgSet = 0, errors = 0;
  let nextIndex = 0;

  const worker = async () => {
    for (;;) {
      const i = nextIndex++;
      if (i >= candidates.length) return;
      const prod = candidates[i];
      try {
        const off = await lookupOff(prod.barcode);
        processed++;
        // Stamp every attempt (found or not) so the next run advances through the
        // catalogue instead of re-checking permanent OFF-misses. Best-effort.
        const checkedAt = new Date().toISOString();
        if (!args.dryRun) {
          await client.from("pc_products").update({ enrich_checked_at: checkedAt }).eq("id", prod.id);
        }
        if (off.found) {
          offFound++;
          const patch: Record<string, unknown> = {};
          if (off.imageUrl) { patch.image_url = off.imageUrl; }
          // Map to a real category, or fall back to the explicit "uncategorized"
          // bucket only when OFF *did* find the product but we could not map it —
          // products OFF never heard of stay NULL so a future run can retry.
          const catId = off.categorySlug ? slugToId.get(off.categorySlug) : undefined;
          if (catId) patch.category_id = catId;
          if (Object.keys(patch).length > 0) {
            patch.updated_at = new Date().toISOString();
            if (!args.dryRun) {
              // Only fill blanks — never clobber an existing category/image.
              const upd: Record<string, unknown> = { updated_at: patch.updated_at };
              if (patch.image_url) upd.image_url = patch.image_url;
              if (patch.category_id) upd.category_id = patch.category_id;
              const { error: uErr } = await client
                .from("pc_products")
                .update(upd)
                .eq("id", prod.id)
                .or("category_id.is.null,image_url.is.null");
              if (uErr) { errors++; continue; }
            }
            if (patch.category_id) catSet++;
            if (patch.image_url) imgSet++;
          }
        }
      } catch {
        errors++;
      }
      // Gentle throttle: ~each worker pauses briefly so we stay well under OFF limits.
      await new Promise((r) => setTimeout(r, 120));
      if (processed % 250 === 0) console.log(`  ...עובדו ${processed}/${candidates.length} (OFF נמצאו ${offFound}, קטגוריות ${catSet}, תמונות ${imgSet}).`);
    }
  };

  const n = Math.min(args.concurrency, candidates.length);
  await Promise.all(Array.from({ length: n }, () => worker()));

  console.log("\n===== סיכום העשרה =====");
  console.log(`עובדו: ${processed} | נמצאו ב-OFF: ${offFound} | קטגוריות שהוגדרו: ${catSet} | תמונות שהוגדרו: ${imgSet} | שגיאות: ${errors}`);
  if (args.dryRun) console.log("(dry-run — לא נכתב דבר ל-Supabase.)");
  void uncategorizedId; // reserved for future fallback policy
}

main().catch((e) => {
  console.error("pc-enrich-products crashed:", e);
  process.exit(1);
});
