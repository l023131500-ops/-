/**
 * Price Comparison — Step-3 PUSH ingestion.
 *
 * A push intake path that complements the daily pull-based adapters
 * (script/pc/adapters.ts). It accepts a price/promo file — uploaded or fetched
 * from a remote URL — auto-detects the container (gzip / zip) and the format
 * (XML vs JSON), parses the standard Israeli price-transparency schema (and an
 * equivalent JSON shape), and idempotently upserts into the pc_* tables via the
 * write helpers in ./price-comparison.
 *
 * It also parses the lighter CSV/XLSX/JSON shape used by the VOLUNTARY
 * self-submit feature (columns: barcode, product_name, brand, unit, price).
 *
 * Parsing is pure (no DB, no I/O); the orchestrator `ingestParsed` is the only
 * part that writes, and it does so exclusively through pc.* upserts so the
 * existing SQLite/Supabase write flow is never bypassed. Barcode (ItemCode) is
 * THE cross-chain matching key for products.
 */
import zlib from "node:zlib";
import * as XLSX from "xlsx";
import * as pc from "./price-comparison";

// ---------------------------------------------------------------------------
// Container + format detection
// ---------------------------------------------------------------------------

/** Extract the first entry of a single-file ZIP (PK\x03\x04) without a dep. */
function unzipFirstEntry(buf: Buffer): Buffer | null {
  if (buf.length < 30 || buf.readUInt32LE(0) !== 0x04034b50) return null;
  const method = buf.readUInt16LE(8);
  const compSize = buf.readUInt32LE(18);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + nameLen + extraLen;
  let end = compSize > 0 ? dataStart + compSize : buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), dataStart);
  if (end < 0 || end > buf.length) end = buf.length;
  const data = buf.subarray(dataStart, end);
  try {
    if (method === 0) return Buffer.from(data);
    return zlib.inflateRawSync(data);
  } catch {
    return null;
  }
}

/** Decode a buffer to text, honouring UTF-16 (LE/BE) and UTF-8 byte-order marks. */
function decodeBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString("utf8");
  const probe = buf.subarray(0, Math.min(buf.length, 64));
  let nulOdd = 0;
  for (let i = 1; i < probe.length; i += 2) if (probe[i] === 0x00) nulOdd++;
  if (probe.length >= 8 && nulOdd > probe.length / 4) return buf.toString("utf16le");
  return buf.toString("utf8");
}

/** Returns the raw (decompressed) bytes — unwraps gzip and single-entry zip. */
export function decompress(buf: Buffer): Buffer {
  const looksGz = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const looksZip = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (looksZip) {
    const inner = unzipFirstEntry(buf);
    if (inner) return inner;
  }
  if (looksGz) {
    try {
      return zlib.gunzipSync(buf);
    } catch {
      /* fall through — treat as plain bytes */
    }
  }
  return buf;
}

export type IngestFormat = "xml" | "json" | "csv" | "xlsx";

/** Sniff format from already-decompressed bytes (XLSX is binary zip-based). */
export function sniffFormat(buf: Buffer): IngestFormat {
  // XLSX is itself a ZIP; if decompress() handed back zip bytes it's a workbook.
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) return "xlsx";
  const text = decodeBuffer(buf.subarray(0, 4096)).replace(/^﻿/, "").trimStart();
  if (text.startsWith("<")) return "xml";
  if (text.startsWith("{") || text.startsWith("[")) return "json";
  return "csv";
}

// ---------------------------------------------------------------------------
// Tiny dependency-free XML helpers (mirrors server/pc-import.ts + script/pc/xml.ts).
// ---------------------------------------------------------------------------
function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}
function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}
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
function detectRecordTag(xml: string, candidates: string[]): string | null {
  for (const c of candidates) if (new RegExp(`<${c}\\b`, "i").test(xml)) return c;
  return null;
}
function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
const validBarcode = (b: string | null | undefined): string | null => (b && /^\d{6,}$/.test(String(b).trim()) ? String(b).trim() : null);

/**
 * Sanitise a city value. The `<City>` element is the only valid source, but
 * Cerberus feeds frequently fill it with a numeric placeholder (e.g.
 * `<City>0</City>`, a zip-like `5000`) instead of a real Hebrew name. Reject
 * empty or purely numeric values so search-by-city never matches junk.
 */
function cleanCity(raw: string | null): string | null {
  if (raw == null) return null;
  const v = raw.trim();
  if (!v || /^[0-9]+$/.test(v)) return null;
  return v;
}
function resolveCity(block: string): string | null {
  return cleanCity(field(block, ["City", "CITY", "c_city", "CityName", "StoreCity"]));
}

// ---------------------------------------------------------------------------
// Parsed record shapes
// ---------------------------------------------------------------------------
export interface IngestItem {
  barcode: string | null;
  itemCode: string | null;
  name: string;
  brand: string | null;
  unit: string | null;
  price: number;
  unitPrice: number | null;
  onSale: boolean;
  saleNote: string | null;
  validUntil: string | null;
}
export interface IngestStore {
  chainId: string | null;
  storeCode: string | null;
  name: string;
  branch: string | null;
  city: string | null;
}
export interface IngestPromotion {
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
}
export type IngestKind = "price" | "stores" | "promo" | "mixed" | "unknown";
export interface ParsedDocument {
  format: IngestFormat;
  kind: IngestKind;
  header: { chainId: string | null; storeCode: string | null };
  storeName: string | null;
  storeCity: string | null;
  items: IngestItem[];
  stores: IngestStore[];
  promotions: IngestPromotion[];
  skipped: number;
}

// ---------------------------------------------------------------------------
// XML parsing — the standard Israeli transparency schema.
// ---------------------------------------------------------------------------
function readHeader(xml: string) {
  const head = xml.slice(0, 4000);
  return {
    chainId: field(head, ["ChainId", "ChainID", "CHAINID"]),
    storeCode: field(head, ["StoreId", "StoreID", "STOREID", "BranchId"]),
  };
}

export function parseItemsXml(xml: string): { items: IngestItem[]; skipped: number } {
  const tag = detectRecordTag(xml, ["Item", "Product", "Line"]) || "Item";
  const items: IngestItem[] = [];
  let skipped = 0;
  for (const rec of blocks(xml, tag)) {
    const name = field(rec, ["ItemName", "ITEMNAME", "ProductName", "ManufacturerItemDescription", "Name"]);
    const barcode = field(rec, ["ItemCode", "Barcode", "ITEMCODE", "GTIN"]);
    const itemCode = field(rec, ["ItemCode", "InternalCode", "ProductCode"]);
    const brand = field(rec, ["ManufacturerName", "Brand", "ManufactureName"]);
    const unit = field(rec, ["UnitQty", "Unit", "UnitOfMeasure", "Quantity"]);
    const price = toNum(field(rec, ["ItemPrice", "Price", "ITEMPRICE", "UnitPrice"]));
    const unitPrice = toNum(field(rec, ["UnitOfMeasurePrice", "PricePerUnit"]));
    if (!name || price == null) { skipped++; continue; }
    items.push({ barcode: validBarcode(barcode), itemCode, name, brand, unit, price, unitPrice, onSale: false, saleNote: null, validUntil: null });
  }
  return { items, skipped };
}

export function parseStoresXml(xml: string): { stores: IngestStore[]; skipped: number } {
  const header = readHeader(xml);
  const tag = detectRecordTag(xml, ["StoreInfo", "Store", "Branch"]) || "Store";
  const stores: IngestStore[] = [];
  let skipped = 0;
  for (const rec of blocks(xml, tag)) {
    const name = field(rec, ["StoreName", "STORENAME", "BranchName", "Name"]);
    const storeCode = field(rec, ["StoreId", "StoreID", "STOREID", "BranchId"]) || header.storeCode;
    const city = resolveCity(rec);
    const address = field(rec, ["Address", "ADDRESS"]);
    if (!name && !storeCode) { skipped++; continue; }
    stores.push({ chainId: header.chainId, storeCode, name: name || `סניף ${storeCode}`, branch: address, city });
  }
  return { stores, skipped };
}

export function parsePromotionsXml(xml: string): { promotions: IngestPromotion[]; skipped: number } {
  const tag = detectRecordTag(xml, ["Promotion", "Promo", "Sale"]) || "Promotion";
  const promotions: IngestPromotion[] = [];
  let skipped = 0;
  for (const rec of blocks(xml, tag)) {
    const title = field(rec, ["PromotionDescription", "PromoDescription", "Description", "PromotionName"]);
    if (!title) { skipped++; continue; }
    promotions.push({
      title: title.slice(0, 200),
      description: field(rec, ["Remark", "AdditionalRestrictions"]),
      startsAt: field(rec, ["PromotionStartDate", "StartDate"]),
      endsAt: field(rec, ["PromotionEndDate", "EndDate"]),
    });
  }
  return { promotions, skipped };
}

function parseXml(xml: string): ParsedDocument {
  const header = readHeader(xml);
  const hasItems = /<item\b/i.test(xml);
  const hasStores = /<store\b/i.test(xml) || /<storeinfo\b/i.test(xml) || /<branch\b/i.test(xml);
  const hasPromos = /<promotion\b/i.test(xml) || /<promo\b/i.test(xml);
  const items = hasItems ? parseItemsXml(xml) : { items: [], skipped: 0 };
  const stores = hasStores && !hasItems ? parseStoresXml(xml) : { stores: [], skipped: 0 };
  const promotions = hasPromos && !hasItems ? parsePromotionsXml(xml) : { promotions: [], skipped: 0 };
  const storeName = field(xml.slice(0, 4000), ["StoreName", "BranchName"]);
  const storeCity = resolveCity(xml.slice(0, 4000));
  const kind: IngestKind = items.items.length ? "price" : stores.stores.length ? "stores" : promotions.promotions.length ? "promo" : "unknown";
  return {
    format: "xml", kind, header, storeName, storeCity,
    items: items.items, stores: stores.stores, promotions: promotions.promotions,
    skipped: items.skipped + stores.skipped + promotions.skipped,
  };
}

// ---------------------------------------------------------------------------
// JSON parsing — an equivalent JSON shape. Tolerant of casing and wrappers:
//   { Root: { Items: { Item: [...] } } } | { items: [...] } | [ ... ]
// Each item accepts Israeli (ItemCode/ItemName/ManufacturerName/UnitQty/
// ItemPrice) or generic (barcode/product_name/brand/unit/price) field names.
// ---------------------------------------------------------------------------
function pick(obj: Record<string, unknown>, names: string[]): string | null {
  for (const n of names) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === n.toLowerCase()) {
        const v = obj[k];
        if (v != null && String(v).trim() !== "") return String(v).trim();
      }
    }
  }
  return null;
}

function asArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (v && typeof v === "object") return [v as Record<string, unknown>];
  return [];
}

/** Dig out a nested array under a set of candidate keys (case-insensitive). */
function digArray(root: unknown, keys: string[]): Record<string, unknown>[] {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): Record<string, unknown>[] | null => {
    if (!node || typeof node !== "object" || seen.has(node) || depth > 6) return null;
    seen.add(node);
    const obj = node as Record<string, unknown>;
    for (const key of keys) {
      for (const k of Object.keys(obj)) {
        if (k.toLowerCase() === key.toLowerCase()) {
          const arr = asArray((obj as any)[k]);
          if (arr.length) return arr;
        }
      }
    }
    for (const k of Object.keys(obj)) {
      const found = walk(obj[k], depth + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(root, 0) || [];
}

function itemFromObj(o: Record<string, unknown>): IngestItem | null {
  const name = pick(o, ["ItemName", "ProductName", "product_name", "name", "ManufacturerItemDescription"]);
  const price = toNum(pick(o, ["ItemPrice", "price", "UnitPrice"]));
  if (!name || price == null) return null;
  const barcode = pick(o, ["ItemCode", "barcode", "Barcode", "GTIN"]);
  return {
    barcode: validBarcode(barcode),
    itemCode: pick(o, ["ItemCode", "InternalCode", "ProductCode", "item_code"]),
    name,
    brand: pick(o, ["ManufacturerName", "brand", "Brand"]),
    unit: pick(o, ["UnitQty", "unit", "Unit", "UnitOfMeasure", "Quantity"]),
    price,
    unitPrice: toNum(pick(o, ["UnitOfMeasurePrice", "unit_price", "PricePerUnit"])),
    onSale: false, saleNote: null, validUntil: null,
  };
}

export function parseJson(text: string): ParsedDocument {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return { format: "json", kind: "unknown", header: { chainId: null, storeCode: null }, storeName: null, storeCity: null, items: [], stores: [], promotions: [], skipped: 0 };
  }
  const headerObj = (root && typeof root === "object" && !Array.isArray(root)) ? (root as Record<string, unknown>) : {};
  const header = { chainId: pick(headerObj, ["ChainId", "ChainID", "chain_id"]), storeCode: pick(headerObj, ["StoreId", "StoreID", "store_id"]) };

  const itemObjs = Array.isArray(root) ? asArray(root) : digArray(root, ["Item", "Items", "items", "products", "Products", "lines"]);
  const items: IngestItem[] = [];
  let skipped = 0;
  for (const o of itemObjs) {
    const it = itemFromObj(o);
    if (it) items.push(it); else skipped++;
  }

  const stores: IngestStore[] = [];
  if (!items.length) {
    for (const o of digArray(root, ["Store", "Stores", "stores", "Branch"])) {
      const name = pick(o, ["StoreName", "store_name", "BranchName", "name"]);
      const storeCode = pick(o, ["StoreId", "StoreID", "store_id", "BranchId"]);
      if (!name && !storeCode) continue;
      stores.push({ chainId: pick(o, ["ChainId", "chain_id"]) || header.chainId, storeCode, name: name || `סניף ${storeCode}`, branch: pick(o, ["Address", "address"]), city: cleanCity(pick(o, ["City", "city", "c_city", "CityName", "StoreCity"])) });
    }
  }

  const promotions: IngestPromotion[] = [];
  if (!items.length && !stores.length) {
    for (const o of digArray(root, ["Promotion", "Promotions", "promotions", "Promo"])) {
      const title = pick(o, ["PromotionDescription", "Description", "title", "PromotionName"]);
      if (!title) continue;
      promotions.push({ title: title.slice(0, 200), description: pick(o, ["Remark", "description"]), startsAt: pick(o, ["PromotionStartDate", "StartDate", "starts_at"]), endsAt: pick(o, ["PromotionEndDate", "EndDate", "ends_at"]) });
    }
  }

  const kind: IngestKind = items.length ? "price" : stores.length ? "stores" : promotions.length ? "promo" : "unknown";
  return {
    format: "json", kind, header,
    storeName: pick(headerObj, ["StoreName", "store_name", "BranchName"]),
    storeCity: cleanCity(pick(headerObj, ["City", "city", "c_city", "CityName", "StoreCity"])),
    items, stores, promotions, skipped,
  };
}

// ---------------------------------------------------------------------------
// Tabular parsing (voluntary self-submit): CSV + XLSX, with a fixed column set
// barcode, product_name, brand, unit, price (Hebrew header aliases accepted).
// ---------------------------------------------------------------------------
const HEADER_ALIASES: Record<keyof Pick<IngestItem, "barcode" | "name" | "brand" | "unit" | "price">, string[]> = {
  barcode: ["barcode", "ברקוד", "itemcode", "item_code", "מק\"ט", "מקט"],
  name: ["product_name", "productname", "name", "שם מוצר", "שם המוצר", "מוצר", "itemname", "תיאור"],
  brand: ["brand", "מותג", "manufacturer", "manufacturername", "יצרן"],
  unit: ["unit", "יחידה", "unitqty", "מידה", "כמות"],
  price: ["price", "מחיר", "itemprice", "עלות"],
};

function matchColumn(headers: string[], aliases: string[]): number {
  const norm = headers.map((h) => h.trim().toLowerCase());
  for (const a of aliases) {
    const i = norm.indexOf(a.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

function rowsToItems(rows: string[][]): { items: IngestItem[]; skipped: number } {
  const items: IngestItem[] = [];
  let skipped = 0;
  if (!rows.length) return { items, skipped };
  const headers = rows[0];
  const col = {
    barcode: matchColumn(headers, HEADER_ALIASES.barcode),
    name: matchColumn(headers, HEADER_ALIASES.name),
    brand: matchColumn(headers, HEADER_ALIASES.brand),
    unit: matchColumn(headers, HEADER_ALIASES.unit),
    price: matchColumn(headers, HEADER_ALIASES.price),
  };
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => String(c ?? "").trim() === "")) continue;
    const cell = (idx: number) => (idx >= 0 && idx < r.length ? String(r[idx] ?? "").trim() : "");
    const name = cell(col.name);
    const price = toNum(cell(col.price));
    if (!name || price == null) { skipped++; continue; }
    items.push({
      barcode: validBarcode(cell(col.barcode)),
      itemCode: cell(col.barcode) || null,
      name, brand: cell(col.brand) || null, unit: cell(col.unit) || null,
      price, unitPrice: null, onSale: false, saleNote: null, validUntil: null,
    });
  }
  return { items, skipped };
}

/** Minimal RFC-4180-ish CSV split (handles quotes, commas, CRLF). */
export function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cur); cur = "";
    } else if (ch === "\n") {
      row.push(cur); rows.push(row); row = []; cur = "";
    } else if (ch === "\r") {
      /* skip — handled by \n */
    } else {
      cur += ch;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
}

export function parseCsv(text: string): ParsedDocument {
  const { items, skipped } = rowsToItems(parseCsvRows(text));
  return { format: "csv", kind: items.length ? "price" : "unknown", header: { chainId: null, storeCode: null }, storeName: null, storeCity: null, items, stores: [], promotions: [], skipped };
}

export function parseXlsx(buf: Buffer): ParsedDocument {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid = sheet ? (XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: false, defval: "" }) as unknown[][]) : [];
  const rows = grid.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : []));
  const { items, skipped } = rowsToItems(rows);
  return { format: "xlsx", kind: items.length ? "price" : "unknown", header: { chainId: null, storeCode: null }, storeName: null, storeCity: null, items, stores: [], promotions: [], skipped };
}

// ---------------------------------------------------------------------------
// Top-level parse: decompress → sniff → parse.
// ---------------------------------------------------------------------------
export function parseDocument(buf: Buffer): ParsedDocument {
  const raw = decompress(buf);
  const fmt = sniffFormat(raw);
  if (fmt === "xlsx") return parseXlsx(raw);
  const text = decodeBuffer(raw);
  if (fmt === "xml") return parseXml(text);
  if (fmt === "json") return parseJson(text);
  return parseCsv(text);
}

// ---------------------------------------------------------------------------
// Orchestrator — idempotent upsert of a parsed document into pc_* tables.
// ---------------------------------------------------------------------------
export type Logger = (level: "info" | "warn" | "error", msg: string) => void;

export interface IngestOptions {
  /** regulatory | voluntary track for the chain (default regulatory). */
  sourceKind?: pc.PcChainKind;
  /** Chain id to tag rows with. Falls back to the file header's ChainId. */
  chainId?: string | null;
  /** Friendly chain name (used when provisioning a feed-source row). */
  chainName?: string | null;
  /** Force every item onto this existing store (voluntary self-submit). */
  storeId?: number | null;
  /** Provenance tag written to pc_prices.source. */
  source?: string;
  /** official_feed (default) | supplier_submitted. */
  sourceType?: pc.PcSourceType;
}

export interface IngestResult {
  format: IngestFormat;
  kind: IngestKind;
  chainId: string | null;
  sourceKind: pc.PcChainKind;
  storesUpserted: number;
  productsUpserted: number;
  pricesCreated: number;
  pricesUpdated: number;
  promotionsUpserted: number;
  skipped: number;
  errors: number;
  notes: string[];
}

function ensurePromotion(storeId: number | null, p: IngestPromotion): boolean {
  const existing = pc.listPromotions(true).find((x) => x.storeId === storeId && x.title === p.title.slice(0, 200));
  if (existing) return false;
  pc.createPromotion({ storeId, title: p.title, description: p.description || undefined, startsAt: p.startsAt || undefined, endsAt: p.endsAt || undefined });
  return true;
}

export function ingestParsed(doc: ParsedDocument, opts: IngestOptions = {}, log: Logger = () => {}): IngestResult {
  const sourceKind: pc.PcChainKind = opts.sourceKind === "voluntary" ? "voluntary" : "regulatory";
  const sourceType: pc.PcSourceType = opts.sourceType === "supplier_submitted" ? "supplier_submitted" : "official_feed";
  const source = opts.source || "ingest";
  const chainId = (opts.chainId || doc.header.chainId || "") || null;

  const result: IngestResult = {
    format: doc.format, kind: doc.kind, chainId, sourceKind,
    storesUpserted: 0, productsUpserted: 0, pricesCreated: 0, pricesUpdated: 0,
    promotionsUpserted: 0, skipped: doc.skipped, errors: 0, notes: [],
  };

  // Tag the chain's track so the comparison view classifies it correctly.
  if (chainId) {
    try {
      pc.ensureChainKind(chainId, sourceKind, opts.chainName || doc.storeName || undefined);
    } catch (e) {
      log("warn", `ensureChainKind failed: ${(e as Error).message}`);
    }
  }

  // 1) Stores file → upsert store rows.
  for (const s of doc.stores) {
    try {
      pc.upsertStoreByCode({ chainId: s.chainId || chainId, storeCode: s.storeCode, name: s.name, branch: s.branch, city: s.city, neighborhood: null });
      result.storesUpserted++;
    } catch (e) {
      result.errors++;
      log("warn", `store upsert failed — ${(e as Error).message}`);
    }
  }

  // 2) Price/items file → resolve the target store, then upsert products+prices.
  if (doc.items.length) {
    let storeId = opts.storeId ?? null;
    if (storeId == null) {
      const storeName = doc.storeName || (doc.header.storeCode ? `סניף ${doc.header.storeCode}` : `רשת ${chainId ?? ""}`);
      const store = pc.upsertStoreByCode({ chainId, storeCode: doc.header.storeCode, name: storeName.trim() || "חנות", branch: null, city: doc.storeCity, neighborhood: null });
      storeId = store.id;
      result.storesUpserted++;
    }
    for (const it of doc.items) {
      try {
        const product = pc.upsertProductByCode({ barcode: it.barcode, itemCode: it.itemCode, name: it.name, brand: it.brand, unit: it.unit, categoryId: null });
        result.productsUpserted++;
        const r = pc.upsertPrice({
          productId: product.id, storeId, price: it.price, unitPrice: it.unitPrice, unitOfMeasure: it.unit,
          onSale: it.onSale, saleNote: it.saleNote, validUntil: it.validUntil, source, sourceType,
        });
        if (r.created) result.pricesCreated++; else result.pricesUpdated++;
      } catch (e) {
        result.errors++;
        log("warn", `item upsert failed — ${(e as Error).message}`);
      }
    }
  }

  // 3) Promotions file → dedupe by (store, title) so re-ingest is idempotent.
  if (doc.promotions.length) {
    const storeId = opts.storeId ?? null;
    for (const p of doc.promotions) {
      try {
        if (ensurePromotion(storeId, p)) result.promotionsUpserted++;
      } catch (e) {
        result.errors++;
        log("warn", `promotion upsert failed — ${(e as Error).message}`);
      }
    }
  }

  log("info", `ingest(${doc.format}/${doc.kind}): stores+${result.storesUpserted}, products ${result.productsUpserted}, prices +${result.pricesCreated}/~${result.pricesUpdated}, promos+${result.promotionsUpserted}, skipped ${result.skipped}, errors ${result.errors}.`);
  return result;
}

/** Parse + ingest a raw file buffer in one call. */
export function ingestBuffer(buf: Buffer, opts: IngestOptions = {}, log: Logger = () => {}): IngestResult {
  const doc = parseDocument(buf);
  return ingestParsed(doc, opts, log);
}
