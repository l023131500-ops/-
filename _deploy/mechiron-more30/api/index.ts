/**
 * Public price-comparison API for the more30.com/mechiron deployment.
 *
 * The origin app (apps/27-bkalut-price) serves these routes from a long-lived
 * Express process. Here the same routes run as a single Vercel Function, and
 * every read goes through `_lib/pc-supabase-read.ts` — the app's own Supabase
 * read path, copied verbatim — so response shapes are identical to production
 * and the client bundle needs no changes beyond its API base.
 *
 * Read-only. Admin routes are deliberately absent: the origin app gates them on
 * an `admin.` hostname, which this deployment never has.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import * as pc from "./_lib/pc-supabase-read";
import { renderReportHtml } from "./_lib/pc-report";
import type { PcSearchFilters, PcCatalogFilters, PcChainKind } from "./_lib/pc-types";

// ---------------------------------------------------------------------------
// Settings — same resolution order as server/routes.ts `getPcSettings()`:
// the `automation_configs` row keyed "pc_settings", else these defaults.
// The defaults are the shipped production values, not placeholders.
// ---------------------------------------------------------------------------
const DEFAULTS = {
  publicEnabled: true,
  merchantPortalEnabled: false,
  showSampleData: false,
  publicTitle: "השוואת מחירים — חוסכים בקלות",
  publicSubtitle:
    "השוו מחירים של מוצרים נפוצים בין חנויות וסניפים, ומצאו היכן משתלם לקנות.",
  contactText: "",
  automationEndpoint: "",
  updatedAt: null as string | null,
};

let settingsCache: { at: number; value: typeof DEFAULTS } | null = null;

async function getPcSettings(): Promise<typeof DEFAULTS> {
  if (settingsCache && Date.now() - settingsCache.at < 60_000) return settingsCache.value;
  let value = { ...DEFAULTS };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await sb
        .from("automation_configs")
        .select("config_json, updated_at")
        .eq("key", "pc_settings")
        .maybeSingle();
      const blob = (data?.config_json ?? {}) as Record<string, unknown>;
      value = {
        publicEnabled: blob.publicEnabled !== false,
        merchantPortalEnabled: blob.merchantPortalEnabled === true,
        showSampleData: blob.showSampleData === true,
        publicTitle:
          typeof blob.publicTitle === "string" && blob.publicTitle.trim()
            ? String(blob.publicTitle)
            : DEFAULTS.publicTitle,
        publicSubtitle:
          typeof blob.publicSubtitle === "string" && blob.publicSubtitle.trim()
            ? String(blob.publicSubtitle)
            : DEFAULTS.publicSubtitle,
        contactText: typeof blob.contactText === "string" ? String(blob.contactText) : "",
        automationEndpoint:
          typeof blob.automationEndpoint === "string" ? String(blob.automationEndpoint) : "",
        updatedAt: (data?.updated_at as string | undefined) ?? null,
      };
    } catch {
      // The anon role cannot read automation_configs on every project; the
      // defaults above are the same ones the origin app falls back to.
    }
  }
  settingsCache = { at: Date.now(), value };
  return value;
}

// ---------------------------------------------------------------------------
// Filter parsing — copied from `parsePcFilters` in server/routes.ts.
// ---------------------------------------------------------------------------
function parsePcFilters(src: Record<string, unknown>): PcSearchFilters {
  const s = (k: string) =>
    src[k] !== undefined && src[k] !== null && String(src[k]).trim() !== ""
      ? String(src[k]).trim()
      : undefined;
  const n = (k: string) =>
    src[k] !== undefined &&
    src[k] !== null &&
    String(src[k]).trim() !== "" &&
    Number.isFinite(Number(src[k]))
      ? Number(src[k])
      : undefined;
  const sort = s("sort");
  const track = s("track");
  return {
    categoryId: n("categoryId"),
    search: s("q") ?? s("search") ?? s("query"),
    barcode: s("barcode"),
    brand: s("brand"),
    city: s("city"),
    neighborhood: s("neighborhood"),
    storeId: n("storeId"),
    storeName: s("storeName") ?? s("store"),
    minPrice: n("minPrice"),
    maxPrice: n("maxPrice"),
    promoOnly: src.promoOnly === true || src.promoOnly === "true" || src.promoOnly === "1",
    updatedSince: s("updatedSince"),
    sort:
      sort === "price" || sort === "unitPrice" || sort === "name" || sort === "updated"
        ? sort
        : undefined,
    track: track === "official" || track === "supplier" || track === "all" ? track : "official",
  };
}

function trackOf(q: Record<string, unknown>): "official" | "supplier" | "all" {
  const raw = q.track ? String(q.track) : "official";
  return raw === "official" || raw === "supplier" || raw === "all" ? raw : "official";
}

const DISABLED = { message: "האתר אינו זמין כעת", enabled: false };

// Env values set through a Windows shell pipe can arrive with a UTF-8 BOM or
// stray whitespace, which then blows up as an invalid HTTP header byte the
// first time supabase-js builds a request. Normalise once, at cold start.
for (const k of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"]) {
  const v = process.env[k];
  if (v) process.env[k] = v.replace(/^\uFEFF+/, "").trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = (req.query ?? {}) as Record<string, unknown>;

  // The portal proxies `/mechiron/api/<path>` here; vercel.json passes the
  // matched suffix as `__path`. Fall back to the raw URL for direct hits.
  let path = typeof q.__path === "string" ? q.__path : "";
  if (!path) {
    path = String(req.url || "").split("?")[0].replace(/^\/+/, "").replace(/^mechiron\//, "");
  }
  path = path.replace(/^api\//, "").replace(/\/+$/, "");
  delete q.__path;

  if (!pc.isSupabasePcEnabled()) {
    res.status(503).json({
      message: "מקור הנתונים אינו מוגדר בפריסה זו (SUPABASE_URL + מפתח anon).",
      enabled: false,
    });
    return;
  }

  try {
    const s = await getPcSettings();

    // ---- settings ---------------------------------------------------------
    if (path === "pc/public/settings") {
      res.setHeader("cache-control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json({
        enabled: s.publicEnabled,
        title: s.publicTitle,
        subtitle: s.publicSubtitle,
        contactText: s.contactText,
      });
      return;
    }

    // ---- meta -------------------------------------------------------------
    if (path === "pc/public/meta") {
      const stats = await pc.getStats();
      res.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=900");
      res.json({
        enabled: s.publicEnabled,
        showSampleData: s.showSampleData,
        lastUpdatedAt: stats.lastSuccessAt ?? stats.lastImportAt ?? null,
        activeSources: stats.activeFeedSources,
        productCount: s.showSampleData ? stats.products : stats.realProducts,
        storeCount: s.showSampleData ? stats.stores : stats.realStores,
        hasRealData: stats.realProducts > 0 && stats.realStores > 0,
        merchantPortalEnabled: s.merchantPortalEnabled,
        hasSupplierData: stats.supplierPrices > 0,
        supplierPriceCount: stats.supplierPrices,
      });
      return;
    }

    // ---- public chatbot config --------------------------------------------
    // The widget asks for this on every page load. Until now the route did not
    // exist here, so the function answered with its own 404 and the browser
    // logged an error on a page that is otherwise clean.
    //
    // It is answered rather than enabled. The origin app reads
    // `automation_configs` keyed "public_chatbot"; so does this, through the
    // same Supabase credentials the settings route already uses — which is what
    // makes it a real check and not a guess. `enabled` is whatever that row
    // says. If the row is absent, or the anon role cannot read it, the answer is
    // `enabled: false` and the widget stays hidden.
    //
    // Deliberately not implemented: `/answer` and `/lead`. Both need the rights
    // corpus and the inbound-leads plumbing, neither of which exists in this
    // deployment. A chatbot that opens and then cannot answer is worse than one
    // that never opens, so the config route reports honestly and stops there.
    if (path === "public/chatbot/config") {
      let enabled = false;
      let raw: Record<string, unknown> = {};
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
      if (url && key) {
        try {
          const sb = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data } = await sb
            .from("automation_configs")
            .select("enabled, config_json")
            .eq("key", "public_chatbot")
            .maybeSingle();
          if (data) {
            enabled = data.enabled === true || Number(data.enabled) === 1;
            const blob = data.config_json;
            if (blob && typeof blob === "object") raw = blob as Record<string, unknown>;
          }
        } catch {
          // Unreadable is not enabled. Falling through leaves `enabled` false.
        }
      }
      const contact =
        raw.contact && typeof raw.contact === "object"
          ? (raw.contact as Record<string, unknown>)
          : {};
      const str = (v: unknown, fallback: string) =>
        typeof v === "string" && v.trim() ? v : fallback;
      res.setHeader("cache-control", "public, s-maxage=60, stale-while-revalidate=300");
      res.json({
        enabled,
        intro: str(raw.intro, "שלום! אני העוזר של ארגון בקלות. איך אפשר לעזור?"),
        ctaText: str(
          raw.ctaText,
          "מעניין אותך לקבל את פרטי הנושא המלאים? אוכל לשלוח לך אותם ללא עלות. אפשר גם להפעיל תזכורת או טיפול מלא של צוות בקלות.",
        ),
        closingText: str(
          raw.closingText,
          "שמחנו שפנית אלינו! צוות בקלות תמיד כאן עבורך. אפשר לחזור אלינו בטלפון 02-3131500, בוואטסאפ או במייל.",
        ),
        contact: {
          phone: str(contact.phone, "02-3131500"),
          email: str(contact.email, "l023131500@gmail.com"),
          whatsapp: str(contact.whatsapp, "https://wa.me/972237131500"),
        },
      });
      return;
    }

    if (!s.publicEnabled) {
      res.status(403).json(DISABLED);
      return;
    }

    // ---- categories -------------------------------------------------------
    if (path === "pc/public/categories") {
      res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=1800");
      res.json(await pc.listCategories());
      return;
    }

    // ---- promotions -------------------------------------------------------
    if (path === "pc/public/promotions") {
      res.setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=900");
      res.json(await pc.listPromotions());
      return;
    }

    // ---- filters ----------------------------------------------------------
    if (path === "pc/public/filters") {
      const [categories, cities, brands, storeList] = await Promise.all([
        pc.listCategories(),
        pc.getDistinctCities(s.showSampleData),
        pc.getDistinctBrands(s.showSampleData),
        pc.listStores(),
      ]);
      res.setHeader("cache-control", "public, s-maxage=600, stale-while-revalidate=1800");
      res.json({
        categories,
        cities,
        brands,
        stores: storeList
          .filter((st) => s.showSampleData || !st.isSample)
          .map((st) => ({ id: st.id, name: st.name, city: st.city })),
      });
      return;
    }

    // ---- simple search ----------------------------------------------------
    if (path === "pc/public/search") {
      const searchOpts: PcSearchFilters = {
        categoryId: q.categoryId ? Number(q.categoryId) : undefined,
        search: q.q ? String(q.q) : undefined,
        includeSample: s.showSampleData,
        track: trackOf(q),
      };
      const [categories, results] = await Promise.all([
        pc.listCategories(),
        pc.publicSearch(searchOpts),
      ]);
      res.json({ categories, results });
      return;
    }

    // ---- advanced search --------------------------------------------------
    if (path === "pc/public/search/advanced") {
      const filters = { ...parsePcFilters(q), includeSample: s.showSampleData };
      const results = await pc.publicSearch(filters);
      res.json({ filters, count: results.length, results });
      return;
    }

    // ---- catalog ----------------------------------------------------------
    if (path === "pc/public/catalog") {
      const minChainsRaw = Number(q.minChains);
      const kindRaw = q.kind ? String(q.kind) : "";
      const filters: PcCatalogFilters = {
        ...parsePcFilters(q),
        includeSample: s.showSampleData,
        minChains: Number.isFinite(minChainsRaw) && minChainsRaw > 0 ? minChainsRaw : undefined,
        kind:
          kindRaw === "regulatory" || kindRaw === "voluntary"
            ? (kindRaw as PcChainKind)
            : undefined,
      };
      const results = await pc.catalogSearch(filters);
      res.json({ filters, count: results.length, results });
      return;
    }

    // ---- compare by barcode ----------------------------------------------
    if (path.startsWith("pc/public/compare/")) {
      const barcode = decodeURIComponent(path.slice("pc/public/compare/".length));
      const cmp = await pc.comparisonByBarcode(barcode, {
        includeSample: s.showSampleData,
        track: trackOf(q),
      });
      if (!cmp) {
        res.status(404).json({ message: "המוצר לא נמצא" });
        return;
      }
      res.json(cmp);
      return;
    }

    // ---- product detail ---------------------------------------------------
    if (path.startsWith("pc/public/product/")) {
      const id = Number(decodeURIComponent(path.slice("pc/public/product/".length)));
      const detail = await pc.productDetail(id, s.showSampleData, trackOf(q));
      if (!detail) {
        res.status(404).json({ message: "המוצר לא נמצא" });
        return;
      }
      res.json(detail);
      return;
    }

    // ---- recommendation ---------------------------------------------------
    if (path === "pc/public/recommend") {
      const src =
        req.method === "POST" ? { ...((req.body as object) ?? {}), ...q } : q;
      const filters = {
        ...parsePcFilters(src as Record<string, unknown>),
        includeSample: s.showSampleData,
      };
      res.json(await pc.recommend(filters));
      return;
    }

    // ---- printable report -------------------------------------------------
    if (path === "pc/public/report") {
      const filters = { ...parsePcFilters(q), includeSample: s.showSampleData };
      const results = await pc.publicSearch(filters);
      const parts: string[] = [];
      if (filters.search) parts.push(`חיפוש: ${filters.search}`);
      if (filters.city) parts.push(`עיר: ${filters.city}`);
      if (filters.brand) parts.push(`מותג: ${filters.brand}`);
      if (filters.promoOnly) parts.push("מבצעים בלבד");
      const html = renderReportHtml({
        title: s.publicTitle,
        subtitle: s.publicSubtitle,
        rows: results,
        filtersLabel: parts.join(" · ") || "כל המוצרים",
        autoPrint: String(q.print || "") === "1",
      });
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(html);
      return;
    }

    // ---- merchant submissions --------------------------------------------
    // Writes need the service_role key, which this public deployment does not
    // carry. The origin app also refuses when the merchant portal is off.
    if (path === "pc/public/submit-price") {
      res.status(403).json({
        message: "הגשת מחירים על-ידי עסקים אינה פעילה כעת.",
        enabled: false,
      });
      return;
    }

    res.status(404).json({ message: "not found", path });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mechiron-api]", path, message);
    res.status(500).json({ message: "שגיאה בקריאת נתוני המחירים", detail: message });
  }
}
