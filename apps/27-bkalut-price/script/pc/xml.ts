/**
 * Dependency-free XML helpers + record mappers for Israeli price-transparency
 * feeds. Mirrors the parsing logic in server/pc-import.ts, but lives here so
 * the standalone daily importer can run with only `tsx` + `@supabase/supabase-js`
 * (no server bundle, no SQLite). Pure functions — no I/O, no DB.
 */
import zlib from "node:zlib";

export type FeedKind = "Stores" | "PriceFull" | "PromoFull" | "unknown";

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

export function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

export function field(block: string, names: string[]): string | null {
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
 * Resolve a store's city from a record/header block. The transparency `<City>`
 * element is the only valid source, but Cerberus feeds frequently fill it with
 * a numeric placeholder (e.g. `<City>0</City>`, a zip-like `5000`) instead of a
 * real Hebrew name. We read the City element (tolerating case/namespace
 * variants via the case-insensitive `field` matcher) and reject empty or purely
 * numeric values so search-by-city never matches junk.
 */
export function resolveCity(block: string): string | null {
  const raw = field(block, ["City", "CITY", "c_city", "CityName", "StoreCity"]);
  if (raw == null) return null;
  const v = raw.trim();
  if (!v || /^[0-9]+$/.test(v)) return null;
  return v;
}

export function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function detectRecordTag(xml: string, candidates: string[]): string | null {
  for (const c of candidates) {
    if (new RegExp(`<${c}\\b`, "i").test(xml)) return c;
  }
  return null;
}

/**
 * Extract the first entry of a single-file ZIP archive (PK\x03\x04), without
 * any third-party dependency. Israeli transparency portals (notably Cerberus /
 * publishedprices) serve files with a `.gz` extension that are in fact ZIP
 * archives wrapping one XML file. The ZIP entry is normally DEFLATE (method 8)
 * or STORE (method 0). We read the local file header, locate the compressed
 * bytes and inflate them with zlib.inflateRawSync.
 */
function unzipFirstEntry(buf: Buffer): Buffer | null {
  // Local file header: 0x04034b50 (little-endian "PK\x03\x04").
  if (buf.length < 30 || buf.readUInt32LE(0) !== 0x04034b50) return null;
  const method = buf.readUInt16LE(8);
  const compSize = buf.readUInt32LE(18);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + nameLen + extraLen;
  // When sizes are in a data descriptor (bit 3 of the GP flag), compSize may be
  // 0; fall back to “everything until the central directory”.
  let end = compSize > 0 ? dataStart + compSize : buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), dataStart);
  if (end < 0 || end > buf.length) end = buf.length;
  const data = buf.subarray(dataStart, end);
  try {
    if (method === 0) return Buffer.from(data); // STORE (no compression)
    return zlib.inflateRawSync(data); // DEFLATE
  } catch {
    return null;
  }
}

/**
 * Decode a (decompressed) buffer to a string, honouring a byte-order mark.
 * Several transparency feeds (e.g. Cerberus Stores files) are UTF-16LE with a
 * BOM; decoding those as UTF-8 produces “� < R o o t >” garbage where every
 * character is interleaved with NULs. We also handle UTF-16BE and a UTF-8 BOM,
 * and as a last resort sniff for interleaved-NUL UTF-16 without a BOM.
 */
function decodeBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // UTF-16BE: swap byte pairs then decode as LE.
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  // BOM-less UTF-16LE sniff: lots of NUL bytes in the even/odd positions of the
  // first chunk is the tell-tale sign (ASCII-range XML => high byte is 0x00).
  const probe = buf.subarray(0, Math.min(buf.length, 64));
  let nulOdd = 0;
  for (let i = 1; i < probe.length; i += 2) if (probe[i] === 0x00) nulOdd++;
  if (probe.length >= 8 && nulOdd > probe.length / 4) {
    return buf.toString("utf16le");
  }
  return buf.toString("utf8");
}

/**
 * Decompress + decode when needed. Returns text. Handles, by magic bytes (so a
 * misleading extension never matters):
 *   - gzip      (0x1f 0x8b)
 *   - zip       (PK\x03\x04)  — single-entry, the Cerberus “.gz-that-is-zip” case
 *   - plain XML (anything else)
 * and then decodes UTF-8 / UTF-16 (with or without BOM) via decodeBuffer.
 * `isGz` is accepted for backwards-compatibility but magic-byte detection wins.
 */
export function maybeGunzip(buf: Buffer, isGz: boolean): string {
  const looksGz = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const looksZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (looksZip) {
    const inner = unzipFirstEntry(buf);
    if (inner) return decodeBuffer(inner);
  }
  if (isGz || looksGz) {
    try {
      return decodeBuffer(zlib.gunzipSync(buf));
    } catch {
      /* fall through — maybe it was already plain text */
    }
  }
  return decodeBuffer(buf);
}

export function readHeader(xml: string) {
  const head = xml.slice(0, 4000);
  return {
    chainId: field(head, ["ChainId", "ChainID", "CHAINID"]),
    storeCode: field(head, ["StoreId", "StoreID", "STOREID", "BranchId"]),
    subChainId: field(head, ["SubChainId", "SubChainID"]),
  };
}

export function detectKind(filename: string, xml: string): FeedKind {
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
 * Resolve the kind of a SINGLE downloaded file.
 *
 * `feed_kinds` is the *set of kinds a feed offers* (e.g. Shufersal advertises
 * "Stores,PriceFull,PromoFull"), NOT a classification of the file in hand. The
 * earlier importer took `feed_kinds.split(",")[0]` and forced it onto every
 * file — so a real PriceFull download was parsed as Stores, found zero <Store>
 * records, and reported "0 rows, 0 errors" (silent no-op). The fix: trust the
 * per-file detector first; only fall back to feed_kinds when detection is
 * inconclusive AND the feed declares exactly one kind (then there is no
 * ambiguity to resolve). A multi-kind feed never forces a kind.
 */
export function resolveKind(filename: string, xml: string, feedKinds: string | null): FeedKind {
  const detected = detectKind(filename, xml);
  if (detected !== "unknown") return detected;
  const declared = (feedKinds || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k): k is Exclude<FeedKind, "unknown"> => k === "Stores" || k === "PriceFull" || k === "PromoFull");
  const unique = Array.from(new Set(declared));
  return unique.length === 1 ? unique[0] : "unknown";
}

// ---------------------------------------------------------------------------
// Structured record extraction — turns XML into plain objects the Supabase repo
// can upsert. No DB access here.
// ---------------------------------------------------------------------------
export interface ParsedStore {
  chainId: string | null;
  storeCode: string | null;
  name: string;
  branch: string | null;
  city: string | null;
}
export interface ParsedPrice {
  barcode: string | null;
  itemCode: string | null;
  name: string;
  brand: string | null;
  unit: string | null;
  price: number;
  unitPrice: number | null;
}
export interface ParsedPromotion {
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export function parseStores(xml: string): { header: ReturnType<typeof readHeader>; stores: ParsedStore[]; skipped: number } {
  const header = readHeader(xml);
  const tag = detectRecordTag(xml, ["StoreInfo", "Store", "Branch"]) || "Store";
  const recs = blocks(xml, tag);
  const stores: ParsedStore[] = [];
  let skipped = 0;
  for (const rec of recs) {
    const name = field(rec, ["StoreName", "STORENAME", "BranchName", "Name"]);
    const storeCode = field(rec, ["StoreId", "StoreID", "STOREID", "BranchId"]) || header.storeCode;
    const city = resolveCity(rec);
    const address = field(rec, ["Address", "ADDRESS"]);
    if (!name && !storeCode) { skipped++; continue; }
    stores.push({ chainId: header.chainId, storeCode, name: name || `סניף ${storeCode}`, branch: address, city });
  }
  return { header, stores, skipped };
}

export function parsePrices(xml: string): { header: ReturnType<typeof readHeader>; storeName: string; storeCity: string | null; prices: ParsedPrice[]; skipped: number } {
  const header = readHeader(xml);
  const storeName = field(xml.slice(0, 4000), ["StoreName", "BranchName"]) || (header.storeCode ? `סניף ${header.storeCode}` : `רשת ${header.chainId ?? ""}`);
  const storeCity = resolveCity(xml.slice(0, 4000));
  const tag = detectRecordTag(xml, ["Item", "Product", "Line"]) || "Item";
  const recs = blocks(xml, tag);
  const prices: ParsedPrice[] = [];
  let skipped = 0;
  for (const rec of recs) {
    const name = field(rec, ["ItemName", "ITEMNAME", "ProductName", "ManufacturerItemDescription", "Name"]);
    const barcode = field(rec, ["ItemCode", "Barcode", "ITEMCODE", "GTIN"]);
    const itemCode = field(rec, ["ItemCode", "InternalCode", "ProductCode"]);
    const brand = field(rec, ["ManufacturerName", "Brand", "ManufactureName"]);
    const unit = field(rec, ["UnitQty", "Unit", "UnitOfMeasure", "Quantity"]);
    const price = num(field(rec, ["ItemPrice", "Price", "ITEMPRICE", "UnitPrice"]));
    const unitPrice = num(field(rec, ["UnitOfMeasurePrice", "PricePerUnit"]));
    if (!name || price == null) { skipped++; continue; }
    prices.push({
      barcode: barcode && /^\d{6,}$/.test(barcode) ? barcode : null,
      itemCode, name, brand, unit, price, unitPrice,
    });
  }
  return { header, storeName: storeName.trim() || "חנות", storeCity, prices, skipped };
}

export function parsePromotions(xml: string): { header: ReturnType<typeof readHeader>; promotions: ParsedPromotion[]; skipped: number } {
  const header = readHeader(xml);
  const tag = detectRecordTag(xml, ["Promotion", "Promo", "Sale"]) || "Promotion";
  const recs = blocks(xml, tag);
  const promotions: ParsedPromotion[] = [];
  let skipped = 0;
  for (const rec of recs) {
    const title = field(rec, ["PromotionDescription", "PromoDescription", "Description", "PromotionName"]);
    if (!title) { skipped++; continue; }
    promotions.push({
      title: title.slice(0, 200),
      description: field(rec, ["Remark", "AdditionalRestrictions"]),
      startsAt: field(rec, ["PromotionStartDate", "StartDate"]),
      endsAt: field(rec, ["PromotionEndDate", "EndDate"]),
    });
  }
  return { header, promotions, skipped };
}
