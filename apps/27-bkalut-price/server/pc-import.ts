/**
 * Price Comparison — ETL import service.
 *
 * Imports Israeli "price transparency" style feeds into the standalone pc_*
 * tables. Supports three feed kinds — Stores, PriceFull, PromoFull — delivered
 * as XML or gzipped XML (.gz). Parsing is deliberately defensive: the public
 * format is loosely standardized and field names vary between chains, so we
 * accept several common variants for every field and fall back to saving raw
 * metadata when a record cannot be mapped confidently.
 *
 * Nothing here touches the rights database or the financial CRM. All writes go
 * through the pc_* upsert helpers in ./price-comparison.
 */
import zlib from "node:zlib";
import * as pc from "./price-comparison";

// ---------------------------------------------------------------------------
// Tiny, dependency-free XML helpers.
// The transparency files are flat: a root, a header, and a repeated record
// element (Item / Store / Promotion). We extract repeated blocks by tag and
// read leaf values case-insensitively, tolerating namespaces and attributes.
// ---------------------------------------------------------------------------

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** All blocks `<tag ...>...</tag>` for the given tag (case-insensitive). */
function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

/** First leaf value among candidate tag names within a block. */
function field(block: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
    const m = re.exec(block);
    if (m) {
      const v = decodeEntities(stripCdata(m[1]));
      if (v) return v;
    }
  }
  return null;
}

/**
 * Resolve a store's city from a record/header block. The `<City>` element is
 * the only valid source, but Cerberus feeds frequently fill it with a numeric
 * placeholder (e.g. `<City>0</City>`, a zip-like `5000`) instead of a real
 * Hebrew name. Reject empty or purely numeric values so search-by-city never
 * matches junk.
 */
function resolveCity(block: string): string | null {
  const raw = field(block, ["City", "CITY", "c_city", "CityName", "StoreCity"]);
  if (raw == null) return null;
  const v = raw.trim();
  if (!v || /^[0-9]+$/.test(v)) return null;
  return v;
}

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Find the repeated record tag by trying known variants, else heuristic. */
function detectRecordTag(xml: string, candidates: string[]): string | null {
  for (const c of candidates) {
    if (new RegExp(`<${c}\\b`, "i").test(xml)) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Decompress when needed. Accepts a Buffer; gz detected by magic bytes or flag.
// ---------------------------------------------------------------------------
export function maybeGunzip(buf: Buffer, isGz: boolean): string {
  const looksGz = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  if (isGz || looksGz) {
    try {
      return zlib.gunzipSync(buf).toString("utf8");
    } catch {
      // fall through — maybe it was already plain text
    }
  }
  return buf.toString("utf8");
}

// ---------------------------------------------------------------------------
// Header-level chain/store identifiers (shared across record blocks).
// ---------------------------------------------------------------------------
function readHeader(xml: string) {
  const head = xml.slice(0, 4000);
  return {
    chainId: field(head, ["ChainId", "ChainID", "CHAINID"]),
    storeCode: field(head, ["StoreId", "StoreID", "STOREID", "BranchId"]),
    subChainId: field(head, ["SubChainId", "SubChainID"]),
  };
}

export interface ImportResult {
  kind: string;
  storesUpserted: number;
  productsUpserted: number;
  pricesUpserted: number;
  promotionsUpserted: number;
  errors: number;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Kind detection from filename and/or content.
// ---------------------------------------------------------------------------
export function detectKind(filename: string, xml: string): "Stores" | "PriceFull" | "PromoFull" | "unknown" {
  const f = filename.toLowerCase();
  if (/store/.test(f) || /<stores\b/i.test(xml) || /<store\b/i.test(xml.slice(0, 2000))) {
    if (!/price|promo/.test(f)) return "Stores";
  }
  if (/promo/.test(f) || /<promotion\b/i.test(xml)) return "PromoFull";
  if (/price/.test(f) || /<item\b/i.test(xml)) return "PriceFull";
  if (/<store\b/i.test(xml)) return "Stores";
  return "unknown";
}

/**
 * Resolve the kind of a SINGLE file. `feedKinds` is the *set of kinds a feed
 * offers* (Shufersal advertises "Stores,PriceFull,PromoFull"), not the kind of
 * the file in hand. Forcing feedKinds[0] onto every file made real PriceFull
 * downloads parse as Stores → 0 rows, 0 errors. Trust per-file detection first;
 * only fall back to feedKinds when detection is inconclusive AND the feed
 * declares exactly one kind.
 */
export function resolveKind(filename: string, xml: string, feedKinds: string | null | undefined): "Stores" | "PriceFull" | "PromoFull" | "unknown" {
  const detected = detectKind(filename, xml);
  if (detected !== "unknown") return detected;
  const declared = (feedKinds || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k): k is "Stores" | "PriceFull" | "PromoFull" => k === "Stores" || k === "PriceFull" || k === "PromoFull");
  const unique = Array.from(new Set(declared));
  return unique.length === 1 ? unique[0] : "unknown";
}

// ---------------------------------------------------------------------------
// Importers. Each takes XML text + a logger, returns counts.
// ---------------------------------------------------------------------------
type Logger = (level: "info" | "warn" | "error", msg: string) => void;

export function importStores(xml: string, log: Logger): Pick<ImportResult, "storesUpserted" | "errors"> {
  const header = readHeader(xml);
  const tag = detectRecordTag(xml, ["StoreInfo", "Store", "Branch"]) || "Store";
  const recs = blocks(xml, tag);
  log("info", `Stores: found ${recs.length} <${tag}> records (chainId=${header.chainId ?? "?"}).`);
  let upserted = 0, errors = 0;
  for (const rec of recs) {
    try {
      const name = field(rec, ["StoreName", "STORENAME", "BranchName", "Name"]);
      const storeCode = field(rec, ["StoreId", "StoreID", "STOREID", "BranchId"]) || header.storeCode;
      const city = resolveCity(rec);
      const address = field(rec, ["Address", "ADDRESS"]);
      if (!name && !storeCode) { errors++; continue; }
      pc.upsertStoreByCode({
        chainId: header.chainId,
        storeCode,
        name: name || `סניף ${storeCode}`,
        branch: address || null,
        city,
        neighborhood: null,
      });
      upserted++;
    } catch (e) {
      errors++;
      log("warn", `Stores: failed to map a record — ${(e as Error).message}`);
    }
  }
  log("info", `Stores: upserted ${upserted}, errors ${errors}.`);
  return { storesUpserted: upserted, errors };
}

export function importPriceFull(xml: string, log: Logger): Pick<ImportResult, "storesUpserted" | "productsUpserted" | "pricesUpserted" | "errors"> {
  const header = readHeader(xml);
  // Resolve (or create) the store this price file belongs to.
  const storeName = field(xml.slice(0, 4000), ["StoreName", "BranchName"]) || (header.storeCode ? `סניף ${header.storeCode}` : `רשת ${header.chainId ?? ""}`);
  const store = pc.upsertStoreByCode({
    chainId: header.chainId,
    storeCode: header.storeCode,
    name: storeName.trim() || "חנות",
    branch: null,
    city: resolveCity(xml.slice(0, 4000)),
    neighborhood: null,
  });

  const tag = detectRecordTag(xml, ["Item", "Product", "Line"]) || "Item";
  const recs = blocks(xml, tag);
  log("info", `PriceFull: store="${store.name}" (#${store.id}), found ${recs.length} <${tag}> records.`);
  let products = 0, prices = 0, errors = 0;
  for (const rec of recs) {
    try {
      const name = field(rec, ["ItemName", "ITEMNAME", "ProductName", "ManufacturerItemDescription", "Name"]);
      const barcode = field(rec, ["ItemCode", "Barcode", "ITEMCODE", "GTIN"]);
      const itemCode = field(rec, ["ItemCode", "InternalCode", "ProductCode"]);
      const brand = field(rec, ["ManufacturerName", "Brand", "ManufactureName"]);
      const unit = field(rec, ["UnitQty", "Unit", "UnitOfMeasure", "Quantity"]);
      const priceRaw = num(field(rec, ["ItemPrice", "Price", "ITEMPRICE", "UnitPrice"]));
      const unitPrice = num(field(rec, ["UnitOfMeasurePrice", "PricePerUnit"]));
      if (!name || priceRaw == null) { errors++; continue; }
      const product = pc.upsertProductByCode({
        barcode: barcode && /^\d{6,}$/.test(barcode) ? barcode : null,
        itemCode,
        name,
        brand,
        unit,
        categoryId: null,
      });
      products++;
      const r = pc.upsertPrice({
        productId: product.id,
        storeId: store.id,
        price: priceRaw,
        unitPrice,
        unitOfMeasure: unit,
        onSale: false,
      });
      if (r.created) prices++;
    } catch (e) {
      errors++;
      log("warn", `PriceFull: failed to map a record — ${(e as Error).message}`);
    }
  }
  log("info", `PriceFull: products ${products}, new prices ${prices}, errors ${errors}.`);
  return { storesUpserted: 1, productsUpserted: products, pricesUpserted: prices, errors };
}

export function importPromoFull(xml: string, log: Logger): Pick<ImportResult, "promotionsUpserted" | "errors"> {
  const header = readHeader(xml);
  const store = header.storeCode
    ? pc.upsertStoreByCode({ chainId: header.chainId, storeCode: header.storeCode, name: `סניף ${header.storeCode}`, branch: null, city: null, neighborhood: null })
    : null;
  const tag = detectRecordTag(xml, ["Promotion", "Promo", "Sale"]) || "Promotion";
  const recs = blocks(xml, tag);
  log("info", `PromoFull: found ${recs.length} <${tag}> records.`);
  let upserted = 0, errors = 0;
  for (const rec of recs) {
    try {
      const title = field(rec, ["PromotionDescription", "PromoDescription", "Description", "PromotionName"]);
      if (!title) { errors++; continue; }
      const startsAt = field(rec, ["PromotionStartDate", "StartDate"]);
      const endsAt = field(rec, ["PromotionEndDate", "EndDate"]);
      pc.createPromotion({
        storeId: store?.id ?? null,
        title: title.slice(0, 200),
        description: field(rec, ["Remark", "AdditionalRestrictions"]) || undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
      });
      upserted++;
    } catch (e) {
      errors++;
      log("warn", `PromoFull: failed to map a record — ${(e as Error).message}`);
    }
  }
  log("info", `PromoFull: upserted ${upserted}, errors ${errors}.`);
  return { promotionsUpserted: upserted, errors };
}

// ---------------------------------------------------------------------------
// Orchestrator: import a single file buffer into a job.
// ---------------------------------------------------------------------------
export function importBuffer(opts: {
  jobId: number;
  filename: string;
  buffer: Buffer;
  isGz: boolean;
  /** The set of kinds the feed offers (e.g. "Stores,PriceFull,PromoFull"). Used
   *  only as a fallback when per-file detection is inconclusive. */
  feedKinds?: string | null;
  /** Hard override chosen explicitly by an admin on the manual-upload screen.
   *  Wins over detection because the admin knows exactly what they uploaded. */
  forceKind?: "Stores" | "PriceFull" | "PromoFull";
}): ImportResult {
  const log: Logger = (level, msg) => pc.logImport(opts.jobId, level, msg);
  const result: ImportResult = { kind: "unknown", storesUpserted: 0, productsUpserted: 0, pricesUpserted: 0, promotionsUpserted: 0, errors: 0, notes: [] };

  const xml = maybeGunzip(opts.buffer, opts.isGz);
  if (!xml || xml.length < 20) {
    log("error", `File "${opts.filename}" produced no parseable text.`);
    result.errors++;
    return result;
  }

  const kind = opts.forceKind || resolveKind(opts.filename, xml, opts.feedKinds);
  result.kind = kind;
  log("info", `File "${opts.filename}" resolved as kind=${kind}, size=${xml.length} chars.`);

  if (kind === "Stores") {
    const r = importStores(xml, log);
    result.storesUpserted += r.storesUpserted; result.errors += r.errors;
    if (r.storesUpserted === 0) {
      result.errors++;
      log("error", `Stores: no store records parsed from "${opts.filename}" (unsupported schema?). Tried StoreInfo/Store/Branch.`);
    }
  } else if (kind === "PriceFull") {
    const r = importPriceFull(xml, log);
    result.storesUpserted += r.storesUpserted; result.productsUpserted += r.productsUpserted;
    result.pricesUpserted += r.pricesUpserted; result.errors += r.errors;
    if (r.productsUpserted === 0) {
      result.errors++;
      log("error", `PriceFull: no product/price records parsed from "${opts.filename}" (unsupported schema?). Tried Item/Product/Line with ItemName+ItemPrice.`);
    }
  } else if (kind === "PromoFull") {
    const r = importPromoFull(xml, log);
    result.promotionsUpserted += r.promotionsUpserted; result.errors += r.errors;
    if (r.promotionsUpserted === 0) {
      result.errors++;
      log("error", `PromoFull: no promotion records parsed from "${opts.filename}" (unsupported schema?). Tried Promotion/Promo/Sale.`);
    }
  } else {
    log("error", `Unknown feed kind for "${opts.filename}" — not Stores/PriceFull/PromoFull by filename or XML content. File not imported.`);
    result.notes.push(`unknown:${opts.filename}`);
    result.errors++;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Fetch + import a feed source by URL. Best-effort: many transparency portals
// publish an index page linking to dated files; we try the configured URL
// directly and import whatever bytes come back. If the source is a manual
// placeholder (no URL / unverified) we record a clear, non-fatal message.
// ---------------------------------------------------------------------------
export async function runFeedSource(feedSourceId: number, trigger: "manual" | "cron"): Promise<pc.PcImportJob> {
  const feed = pc.getFeedSource(feedSourceId);
  if (!feed) throw new Error("feed source not found");
  const job = pc.createImportJob({ feedSourceId, trigger, kind: feed.feedKinds || undefined });
  const log: Logger = (level, msg) => pc.logImport(job.id, level, msg);

  log("info", `Starting ${trigger} import for "${feed.chainName}" (type=${feed.sourceType}, format=${feed.feedFormat}).`);

  if (!feed.active) {
    log("warn", "Feed source is inactive — enable it in the admin before importing.");
    pc.markFeedRun(feedSourceId, "error", "מקור לא פעיל");
    return pc.finishImportJob(job.id, { status: "error", message: "מקור לא פעיל" })!;
  }
  // Prefer the admin-verified direct file URL (set manually or by the daily
  // importer's discovery); fall back to the base source URL.
  const fetchUrl = feed.directFileUrl || feed.sourceUrl;
  if (!fetchUrl) {
    log("warn", "Feed source has no direct file URL — add a verified .gz/.xml URL in the admin (or upload files manually). The daily GitHub Actions importer can discover it for adapters like Shufersal.");
    pc.markFeedRun(feedSourceId, "error", "אין כתובת קובץ ישירה");
    return pc.finishImportJob(job.id, { status: "error", message: "אין כתובת קובץ ישירה — הזינו direct_file_url מאומת, או הריצו את ייבוא ה-GitHub Actions שמגלה קישורים אוטומטית, או העלו קובץ ידנית." })!;
  }

  const agg: ImportResult = { kind: feed.feedKinds || "mixed", storesUpserted: 0, productsUpserted: 0, pricesUpserted: 0, promotionsUpserted: 0, errors: 0, notes: [] };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(fetchUrl, { signal: controller.signal, headers: { "user-agent": "bkalut-pc-import/1.0" } }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      log("error", `Fetch failed: HTTP ${res.status}.`);
      pc.markFeedRun(feedSourceId, "error", `HTTP ${res.status}`);
      return pc.finishImportJob(job.id, { status: "error", errors: 1, message: `שגיאת הורדה HTTP ${res.status}` })!;
    }
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const isGz = feed.feedFormat === "gz" || fetchUrl.toLowerCase().endsWith(".gz");
    const r = importBuffer({ jobId: job.id, filename: fetchUrl, buffer, isGz, feedKinds: feed.feedKinds });
    agg.storesUpserted += r.storesUpserted; agg.productsUpserted += r.productsUpserted;
    agg.pricesUpserted += r.pricesUpserted; agg.promotionsUpserted += r.promotionsUpserted;
    agg.errors += r.errors; agg.notes.push(...r.notes);
  } catch (e) {
    log("error", `Import crashed: ${(e as Error).message}`);
    pc.markFeedRun(feedSourceId, "error", (e as Error).message);
    return pc.finishImportJob(job.id, { status: "error", errors: 1, message: (e as Error).message })!;
  }

  const status = agg.errors > 0 && agg.pricesUpserted === 0 && agg.storesUpserted === 0 && agg.promotionsUpserted === 0 ? "error" : "ok";
  const message = `סטטוס: ${status}. חנויות+${agg.storesUpserted}, מוצרים+${agg.productsUpserted}, מחירים+${agg.pricesUpserted}, מבצעים+${agg.promotionsUpserted}, שגיאות ${agg.errors}.`;
  pc.markFeedRun(feedSourceId, status, message);
  return pc.finishImportJob(job.id, {
    status,
    storesUpserted: agg.storesUpserted, productsUpserted: agg.productsUpserted,
    pricesUpserted: agg.pricesUpserted, promotionsUpserted: agg.promotionsUpserted,
    errors: agg.errors, rawMeta: agg.notes.length ? { notes: agg.notes } : undefined, message,
  })!;
}

// Run all active+verified feed sources (cron entrypoint).
export async function runDailyImport(trigger: "manual" | "cron" = "cron"): Promise<{ ran: number; jobs: number[]; summary: string }> {
  const sources = pc.listFeedSources(true).filter((s) => s.active);
  const jobs: number[] = [];
  for (const s of sources) {
    try {
      const job = await runFeedSource(s.id, trigger);
      jobs.push(job.id);
    } catch {
      /* individual failures are logged inside runFeedSource */
    }
  }
  return { ran: sources.length, jobs, summary: `הופעלו ${sources.length} מקורות פעילים.` };
}
