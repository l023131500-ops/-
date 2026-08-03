/**
 * Price Comparison — seed/upsert known feed sources into Supabase.
 *
 * Idempotent: upserts by chain_id (falls back to chain_name) so re-running
 * never duplicates rows and never wipes the table. Every source is seeded
 * INACTIVE + UNVERIFIED — an admin must verify + activate a source only after
 * the adapter actually imports a real file. This list mirrors KNOWN_FEED_SOURCES
 * in server/price-comparison.ts but is duplicated here so this script depends
 * only on @supabase/supabase-js (no SQLite / server bundle).
 *
 * Usage:
 *   tsx script/pc-seed-feeds.ts            # upsert known chains
 *   tsx script/pc-seed-feeds.ts --dry-run  # print what would change
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required).
 */
import { createClient } from "@supabase/supabase-js";

interface SeedFeed {
  chainName: string;
  chainId: string;
  adapter: string;
  sourceType: string;
  discoveryUrl: string;
  authUser?: string;
  feedKinds: string;
  notes: string;
}

// Chain ids are the official Israeli price-transparency ChainIds. discoveryUrl
// is the public listing page when publicly known. NO direct file URLs are
// hard-coded — discovery (or an admin) fills direct_file_url.
const KNOWN_FEEDS: SeedFeed[] = [
  { chainName: "שופרסל", chainId: "7290027600007", adapter: "shufersal", sourceType: "url", discoveryUrl: "https://prices.shufersal.co.il", feedKinds: "Stores,PriceFull,PromoFull", notes: "עמוד ציבורי המפרסם קובצי GZ. גילוי קישורים אוטומטי דרך מתאם shufersal." },
  { chainName: "רמי לוי", chainId: "7290058140886", adapter: "cerberus", sourceType: "cerberus", discoveryUrl: "https://url.publishedprices.co.il", authUser: "RamiLevi", feedKinds: "Stores,PriceFull,PromoFull", notes: "פורטל Cerberus (publishedprices) — דורש התחברות/סשן. מתאם בשלב שלד." },
  { chainName: "אושר עד", chainId: "7290103152017", adapter: "cerberus", sourceType: "cerberus", discoveryUrl: "https://url.publishedprices.co.il", authUser: "osherad", feedKinds: "Stores,PriceFull,PromoFull", notes: "פורטל Cerberus — דורש התחברות/סשן." },
  { chainName: "יוחננוף", chainId: "7290803800003", adapter: "cerberus", sourceType: "cerberus", discoveryUrl: "https://url.publishedprices.co.il", authUser: "yohananof", feedKinds: "Stores,PriceFull,PromoFull", notes: "פורטל Cerberus — דורש התחברות/סשן." },
  { chainName: "ויקטורי", chainId: "7290696200003", adapter: "matrix", sourceType: "matrix", discoveryUrl: "https://laibcatalog.co.il", feedKinds: "Stores,PriceFull,PromoFull", notes: "מתאם Matrix/Nibit — בשלב שלד." },
  { chainName: "טיב טעם", chainId: "7290873255550", adapter: "cerberus", sourceType: "cerberus", discoveryUrl: "https://url.publishedprices.co.il", authUser: "TivTaam", feedKinds: "Stores,PriceFull,PromoFull", notes: "פורטל Cerberus — דורש התחברות/סשן." },
  { chainName: "חצי חינם", chainId: "7290700100008", adapter: "cerberus", sourceType: "cerberus", discoveryUrl: "https://url.publishedprices.co.il", authUser: "HaziHinam", feedKinds: "Stores,PriceFull,PromoFull", notes: "פורטל Cerberus — דורש התחברות/סשן." },
  { chainName: "מגה / קרפור", chainId: "7290055700007", adapter: "cerberus", sourceType: "cerberus", discoveryUrl: "https://url.publishedprices.co.il", authUser: "Carrefour", feedKinds: "Stores,PriceFull,PromoFull", notes: "פורטל Cerberus — דורש התחברות/סשן." },
  { chainName: "סופר פארם", chainId: "7290172900007", adapter: "nibit", sourceType: "nibit", discoveryUrl: "https://prices.super-pharm.co.il", feedKinds: "Stores,PriceFull,PromoFull", notes: "מתאם Nibit — בשלב שלד." },
  { chainName: "סטופ מרקט", chainId: "7290639000004", adapter: "matrix", sourceType: "matrix", discoveryUrl: "https://laibcatalog.co.il", feedKinds: "Stores,PriceFull,PromoFull", notes: "מתאם Matrix/Nibit — בשלב שלד." },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("שגיאה: חסרים SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY. ראו docs/price-comparison-live-import.md.");
    process.exit(2);
  }
  const client = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  let inserted = 0, updated = 0;
  for (const f of KNOWN_FEEDS) {
    const { data: existing, error: selErr } = await client
      .from("pc_feed_sources")
      .select("id")
      .eq("chain_id", f.chainId)
      .limit(1);
    if (selErr) { console.error(`שגיאת קריאה עבור ${f.chainName}: ${selErr.message}`); continue; }

    const base = {
      chain_name: f.chainName, chain_id: f.chainId, adapter: f.adapter, source_type: f.sourceType,
      discovery_url: f.discoveryUrl, auth_user: f.authUser ?? null, feed_format: "gz",
      feed_kinds: f.feedKinds, notes: f.notes, max_files_per_run: 10, updated_at: now,
    };

    if (existing && existing.length > 0) {
      if (dryRun) { console.log(`[dry] עדכון ${f.chainName} (id=${existing[0].id})`); updated++; continue; }
      // Only refresh adapter/discovery metadata — never flip verified/active here.
      const { error } = await client.from("pc_feed_sources").update(base).eq("id", existing[0].id);
      if (error) console.error(`שגיאת עדכון ${f.chainName}: ${error.message}`);
      else { console.log(`עודכן: ${f.chainName}`); updated++; }
    } else {
      if (dryRun) { console.log(`[dry] הוספת ${f.chainName}`); inserted++; continue; }
      const { error } = await client.from("pc_feed_sources").insert({
        ...base, verified: 0, active: 0, last_status: "never", created_at: now,
      });
      if (error) console.error(`שגיאת הוספה ${f.chainName}: ${error.message}`);
      else { console.log(`נוסף: ${f.chainName}`); inserted++; }
    }
  }
  console.log(`\nהושלם: נוספו ${inserted}, עודכנו ${updated}${dryRun ? " (dry-run)" : ""}.`);
  console.log("כל המקורות נזרעו לא-מאומתים ולא-פעילים. הפעילו אותם באדמין רק לאחר ייבוא קובץ אמיתי.");
}

main().catch((e) => { console.error("pc-seed-feeds crashed:", e); process.exit(1); });
