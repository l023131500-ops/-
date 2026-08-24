/**
 * Price Comparison — standalone module.
 *
 * Deliberately kept separate from the rights database and the financial CRM.
 * All tables are prefixed `pc_` and all HTTP routes live under `/api/pc/*`.
 * Storage uses the same local SQLite handle as the rest of the app (auto
 * CREATE TABLE IF NOT EXISTS), and a parallel Supabase migration deliverable
 * (deliverables/supabase_migration_price_comparison.sql) defines the same
 * tables for the hosted DB. Nothing here touches fin_* or rights tables.
 */
import Database from "better-sqlite3";

let _db: Database.Database | null = null;

export function bindPriceComparisonDb(db: Database.Database) {
  _db = db;
  db.exec(`
  CREATE TABLE IF NOT EXISTS pc_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pc_stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    branch TEXT,
    city TEXT,
    logo_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pc_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    brand TEXT,
    unit TEXT,
    barcode TEXT,
    image_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pc_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'ILS',
    on_sale INTEGER NOT NULL DEFAULT 0,
    sale_note TEXT,
    valid_until TEXT,
    source TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pc_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    starts_at TEXT,
    ends_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- ETL foundation -----------------------------------------------------------
  -- A feed source = one chain/provider endpoint the importer pulls from.
  CREATE TABLE IF NOT EXISTS pc_feed_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_name TEXT NOT NULL,          -- e.g. "רמי לוי", "שופרסל"
    chain_id TEXT,                     -- official chain id when known
    source_url TEXT,                   -- base URL / file URL to fetch
    source_type TEXT NOT NULL DEFAULT 'manual',  -- gov_il | publishprice | cerberus | url | manual
    feed_format TEXT NOT NULL DEFAULT 'xml',     -- xml | gz | json
    feed_kinds TEXT,                   -- comma list: Stores,PriceFull,PromoFull
    auth_user TEXT,                    -- optional portal username (not a secret store)
    notes TEXT,
    verified INTEGER NOT NULL DEFAULT 0,  -- 0 = needs manual review, 1 = verified URL
    active INTEGER NOT NULL DEFAULT 0,    -- inactive until verified+enabled by admin
    last_status TEXT,                  -- ok | error | running | never
    last_run_at TEXT,
    last_message TEXT,
    adapter TEXT,                      -- shufersal | cerberus | nibit | matrix | url | openisrael
    direct_file_url TEXT,              -- a single GZ/XML URL inferred by discovery
    discovery_url TEXT,                -- listing page to scrape for file links
    max_files_per_run INTEGER NOT NULL DEFAULT 10,
    last_error TEXT,
    last_success_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- File-hash dedupe ledger so re-runs skip already-imported files.
  CREATE TABLE IF NOT EXISTS pc_import_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_source_id INTEGER,
    job_id INTEGER,
    file_url TEXT NOT NULL,
    file_name TEXT,
    content_hash TEXT NOT NULL,
    byte_size INTEGER,
    kind TEXT,
    rows_imported INTEGER NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL
  );

  -- One run of the importer against a feed source (or a manual upload).
  CREATE TABLE IF NOT EXISTS pc_import_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_source_id INTEGER,
    trigger TEXT NOT NULL DEFAULT 'manual',  -- manual | cron | upload
    kind TEXT,                         -- Stores | PriceFull | PromoFull | mixed
    status TEXT NOT NULL DEFAULT 'running',  -- running | ok | error
    stores_upserted INTEGER NOT NULL DEFAULT 0,
    products_upserted INTEGER NOT NULL DEFAULT 0,
    prices_upserted INTEGER NOT NULL DEFAULT 0,
    promotions_upserted INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    raw_meta TEXT,                     -- JSON metadata when field mapping uncertain
    started_at TEXT NOT NULL,
    finished_at TEXT,
    message TEXT
  );

  -- Per-job log lines (info/warn/error) for admin visibility.
  CREATE TABLE IF NOT EXISTS pc_import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',  -- info | warn | error
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Append-only price history so trends survive re-imports.
  CREATE TABLE IF NOT EXISTS pc_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    price REAL NOT NULL,
    on_sale INTEGER NOT NULL DEFAULT 0,
    source TEXT,                       -- import | manual
    recorded_at TEXT NOT NULL
  );

  -- Barcode/item-code aliases mapping external codes to our product ids.
  CREATE TABLE IF NOT EXISTS pc_product_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    alias_type TEXT NOT NULL DEFAULT 'barcode',  -- barcode | item_code | chain_code
    alias_value TEXT NOT NULL,
    chain_id TEXT,
    created_at TEXT NOT NULL
  );

  -- Logged public/automation search requests (analytics + automation linkage).
  CREATE TABLE IF NOT EXISTS pc_search_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL DEFAULT 'web',  -- web | voice | email | whatsapp | n8n | api
    query TEXT,
    filters_json TEXT,
    result_count INTEGER NOT NULL DEFAULT 0,
    best_price REAL,
    best_store TEXT,
    contact TEXT,
    created_at TEXT NOT NULL
  );

  -- Outbound automation attempts (separate from the rights webhook_log).
  CREATE TABLE IF NOT EXISTS pc_automation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    query TEXT,
    payload_json TEXT,
    endpoint TEXT,
    status INTEGER NOT NULL DEFAULT 0,
    response TEXT,
    created_at TEXT NOT NULL
  );

  -- Supplier / business-submitted prices (the second track, separate from the
  -- mandatory official chain feeds). Raw submissions land here as 'pending' and
  -- are NEVER shown publicly until an admin approves them; on approval they are
  -- upserted into pc_prices tagged source_type='supplier_submitted'. The
  -- official comparison only ever uses source_type='official_feed' rows.
  CREATE TABLE IF NOT EXISTS pc_price_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_name TEXT NOT NULL,        -- submitting business/supplier
    merchant_contact TEXT,              -- phone/email for follow-up (not public)
    store_id INTEGER,                   -- linked pc_stores row once approved
    store_name TEXT NOT NULL,           -- store/branch as submitted
    city TEXT,
    product_id INTEGER,                 -- linked pc_products row once matched
    product_name TEXT NOT NULL,
    brand TEXT,
    unit TEXT,
    barcode TEXT,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ILS',
    on_sale INTEGER NOT NULL DEFAULT 0,
    sale_note TEXT,
    valid_until TEXT,
    note TEXT,
    trust TEXT NOT NULL DEFAULT 'unverified',  -- unverified | verified | trusted
    status TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected
    approved INTEGER NOT NULL DEFAULT 0,
    reviewed_by TEXT,
    review_note TEXT,
    reviewed_at TEXT,
    price_id INTEGER,                   -- the pc_prices row created on approval
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS pc_price_submissions_status_idx ON pc_price_submissions (status);

  -- Per-store upload tokens for the VOLUNTARY self-submit track. A local shop
  -- that is not regulatory-obligated gets a random token → a shareable
  -- /submit/<token> link. Files uploaded through that link land tagged as the
  -- token's store on the voluntary chain (so they stay on the distinct
  -- voluntary search path). Tokens can be revoked (active=0) without deleting
  -- the store or its already-imported prices.
  CREATE TABLE IF NOT EXISTS pc_voluntary_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    store_id INTEGER,                   -- linked pc_stores row (voluntary chain)
    store_name TEXT NOT NULL,
    city TEXT,
    chain_id TEXT,                      -- the voluntary chain id this store sits on
    contact_email TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    last_upload_at TEXT,
    upload_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pc_voluntary_tokens_token_idx ON pc_voluntary_tokens (token);

  CREATE UNIQUE INDEX IF NOT EXISTS pc_import_files_hash_idx ON pc_import_files (content_hash);
  CREATE INDEX IF NOT EXISTS pc_import_files_feed_idx ON pc_import_files (feed_source_id);
  CREATE INDEX IF NOT EXISTS pc_products_barcode_idx ON pc_products (barcode);
  CREATE INDEX IF NOT EXISTS pc_prices_product_idx2 ON pc_prices (product_id);
  CREATE INDEX IF NOT EXISTS pc_prices_store_idx2 ON pc_prices (store_id);
  CREATE INDEX IF NOT EXISTS pc_price_history_product_idx ON pc_price_history (product_id);
  CREATE INDEX IF NOT EXISTS pc_aliases_value_idx ON pc_product_aliases (alias_value);
  `);
  // Defensive: older DBs may miss columns added after first deploy.
  ensureColumn("pc_stores", "neighborhood", "TEXT");
  ensureColumn("pc_stores", "chain_id", "TEXT");
  ensureColumn("pc_stores", "store_code", "TEXT");
  ensureColumn("pc_stores", "is_sample", "INTEGER");
  ensureColumn("pc_products", "item_code", "TEXT");
  ensureColumn("pc_products", "is_sample", "INTEGER");
  ensureColumn("pc_prices", "unit_price", "REAL");
  ensureColumn("pc_prices", "unit_of_measure", "TEXT");
  ensureColumn("pc_prices", "source", "TEXT");
  // Two-track labelling: 'official_feed' = mandatory published chain prices,
  // 'supplier_submitted' = business-submitted offers (approved only). Existing
  // rows are treated as official feed (the only track that existed before).
  ensureColumn("pc_stores", "source_type", "TEXT");
  ensureColumn("pc_prices", "source_type", "TEXT");
  backfillSourceType();
  ensureColumn("pc_feed_sources", "adapter", "TEXT");
  ensureColumn("pc_feed_sources", "direct_file_url", "TEXT");
  ensureColumn("pc_feed_sources", "discovery_url", "TEXT");
  ensureColumn("pc_feed_sources", "max_files_per_run", "INTEGER");
  ensureColumn("pc_feed_sources", "last_error", "TEXT");
  ensureColumn("pc_feed_sources", "last_success_at", "TEXT");
  // Regulatory vs voluntary track for the chain itself. Regulatory chains are
  // covered by the daily mandatory price-transparency import; voluntary chains
  // are locally/self-submitted and kept as a distinct search path. Pre-existing
  // rows default to 'regulatory' (the only track that existed before).
  ensureColumn("pc_feed_sources", "source_kind", "TEXT");
  backfillSourceKind();
  seedIfEmpty();
  seedFeedSourcesIfEmpty();
}

// Default any NULL source_type to 'official_feed' so pre-existing rows keep
// flowing into the official comparison after the column is added.
function backfillSourceType() {
  try {
    db().exec(`UPDATE pc_stores SET source_type = 'official_feed' WHERE source_type IS NULL`);
    db().exec(`UPDATE pc_prices SET source_type = 'official_feed' WHERE source_type IS NULL`);
  } catch {
    /* columns may not exist yet on a brand-new DB — ignore */
  }
}

// Default any NULL source_kind to 'regulatory' so pre-existing chains keep
// flowing into the regulatory (mandatory) search path after the column is added.
function backfillSourceKind() {
  try {
    db().exec(`UPDATE pc_feed_sources SET source_kind = 'regulatory' WHERE source_kind IS NULL OR source_kind = ''`);
  } catch {
    /* column may not exist yet on a brand-new DB — ignore */
  }
}

// Add a column if it does not already exist (SQLite has no IF NOT EXISTS for columns).
function ensureColumn(table: string, column: string, type: string) {
  try {
    const cols = db().prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === column)) {
      db().exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  } catch {
    /* table may not exist yet — ignore */
  }
}

function db(): Database.Database {
  if (!_db) throw new Error("price-comparison: sqlite db not bound");
  return _db;
}

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PcCategory {
  id: number;
  name: string;
  slug: string | null;
  sortOrder: number;
  active: boolean;
}
export interface PcStore {
  id: number;
  name: string;
  branch: string | null;
  city: string | null;
  neighborhood: string | null;
  chainId: string | null;
  storeCode: string | null;
  logoUrl: string | null;
  active: boolean;
  isSample: boolean;
  sourceType: PcSourceType;
}
export interface PcProduct {
  id: number;
  categoryId: number | null;
  name: string;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
  itemCode: string | null;
  imageUrl: string | null;
  active: boolean;
  isSample: boolean;
}
export interface PcPrice {
  id: number;
  productId: number;
  storeId: number;
  price: number;
  unitPrice: number | null;
  unitOfMeasure: string | null;
  currency: string;
  onSale: boolean;
  saleNote: string | null;
  validUntil: string | null;
  sourceType: PcSourceType;
  updatedAt?: string | null;
}

/** Which data track a store/price belongs to. */
export type PcSourceType = "official_feed" | "supplier_submitted";
export const OFFICIAL: PcSourceType = "official_feed";
export const SUPPLIER: PcSourceType = "supplier_submitted";
function normSourceType(v: unknown): PcSourceType {
  return v === SUPPLIER ? SUPPLIER : OFFICIAL;
}

/**
 * Regulatory vs voluntary feed track. This is a separate axis from
 * PcSourceType: regulatory chains publish under the price-transparency law,
 * voluntary chains opt in. The two are kept as distinct search/grouping paths.
 */
export type PcChainKind = "regulatory" | "voluntary";
export const REGULATORY: PcChainKind = "regulatory";
export const VOLUNTARY: PcChainKind = "voluntary";
function normChainKind(v: unknown): PcChainKind {
  return v === VOLUNTARY ? VOLUNTARY : REGULATORY;
}
export interface PcPromotion {
  id: number;
  storeId: number | null;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
const toBool = (v: unknown) => Number(v) === 1;
const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function mapCategory(r: any): PcCategory {
  return { id: r.id, name: r.name, slug: r.slug ?? null, sortOrder: num(r.sort_order), active: toBool(r.active) };
}
function mapStore(r: any): PcStore {
  return {
    id: r.id, name: r.name, branch: r.branch ?? null, city: r.city ?? null,
    neighborhood: r.neighborhood ?? null, chainId: r.chain_id ?? null, storeCode: r.store_code ?? null,
    logoUrl: r.logo_url ?? null, active: toBool(r.active), isSample: toBool(r.is_sample),
    sourceType: normSourceType(r.source_type),
  };
}
function mapProduct(r: any): PcProduct {
  return {
    id: r.id, categoryId: r.category_id ?? null, name: r.name, brand: r.brand ?? null,
    unit: r.unit ?? null, barcode: r.barcode ?? null, itemCode: r.item_code ?? null,
    imageUrl: r.image_url ?? null, active: toBool(r.active), isSample: toBool(r.is_sample),
  };
}
function mapPrice(r: any): PcPrice {
  return {
    id: r.id, productId: r.product_id, storeId: r.store_id, price: num(r.price),
    unitPrice: r.unit_price != null ? num(r.unit_price) : null, unitOfMeasure: r.unit_of_measure ?? null,
    currency: r.currency ?? "ILS", onSale: toBool(r.on_sale), saleNote: r.sale_note ?? null,
    validUntil: r.valid_until ?? null, sourceType: normSourceType(r.source_type), updatedAt: r.updated_at ?? null,
  };
}
function mapPromotion(r: any): PcPromotion {
  return {
    id: r.id, storeId: r.store_id ?? null, title: r.title, description: r.description ?? null,
    startsAt: r.starts_at ?? null, endsAt: r.ends_at ?? null, active: toBool(r.active),
  };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export function listCategories(includeInactive = false): PcCategory[] {
  const rows = db()
    .prepare(`SELECT * FROM pc_categories ${includeInactive ? "" : "WHERE active = 1"} ORDER BY sort_order, name`)
    .all();
  return rows.map(mapCategory);
}
export function createCategory(input: { name: string; slug?: string; sortOrder?: number; active?: boolean }): PcCategory {
  const ts = now();
  const info = db()
    .prepare(`INSERT INTO pc_categories (name, slug, sort_order, active, created_at, updated_at) VALUES (?,?,?,?,?,?)`)
    .run(input.name.trim(), input.slug?.trim() || null, num(input.sortOrder), input.active === false ? 0 : 1, ts, ts);
  return getCategory(Number(info.lastInsertRowid))!;
}
export function getCategory(id: number): PcCategory | undefined {
  const r = db().prepare(`SELECT * FROM pc_categories WHERE id = ?`).get(id);
  return r ? mapCategory(r) : undefined;
}
export function updateCategory(id: number, patch: { name?: string; slug?: string; sortOrder?: number; active?: boolean }): PcCategory | undefined {
  const cur = getCategory(id);
  if (!cur) return undefined;
  db().prepare(`UPDATE pc_categories SET name=?, slug=?, sort_order=?, active=?, updated_at=? WHERE id=?`).run(
    patch.name?.trim() ?? cur.name,
    patch.slug !== undefined ? (patch.slug.trim() || null) : cur.slug,
    patch.sortOrder !== undefined ? num(patch.sortOrder) : cur.sortOrder,
    patch.active !== undefined ? (patch.active ? 1 : 0) : (cur.active ? 1 : 0),
    now(), id,
  );
  return getCategory(id);
}
export function deleteCategory(id: number): void {
  db().prepare(`DELETE FROM pc_categories WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------
export function listStores(includeInactive = false): PcStore[] {
  const rows = db()
    .prepare(`SELECT * FROM pc_stores ${includeInactive ? "" : "WHERE active = 1"} ORDER BY name`)
    .all();
  return rows.map(mapStore);
}
export function createStore(input: { name: string; branch?: string; city?: string; neighborhood?: string; chainId?: string; storeCode?: string; logoUrl?: string; active?: boolean; isSample?: boolean; sourceType?: PcSourceType }): PcStore {
  const ts = now();
  const info = db()
    .prepare(`INSERT INTO pc_stores (name, branch, city, neighborhood, chain_id, store_code, logo_url, active, is_sample, source_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(input.name.trim(), input.branch?.trim() || null, input.city?.trim() || null, input.neighborhood?.trim() || null, input.chainId?.trim() || null, input.storeCode?.trim() || null, input.logoUrl?.trim() || null, input.active === false ? 0 : 1, input.isSample ? 1 : 0, normSourceType(input.sourceType), ts, ts);
  return getStore(Number(info.lastInsertRowid))!;
}
export function getStore(id: number): PcStore | undefined {
  const r = db().prepare(`SELECT * FROM pc_stores WHERE id = ?`).get(id);
  return r ? mapStore(r) : undefined;
}
export function updateStore(id: number, patch: { name?: string; branch?: string; city?: string; neighborhood?: string; chainId?: string; storeCode?: string; logoUrl?: string; active?: boolean }): PcStore | undefined {
  const cur = getStore(id);
  if (!cur) return undefined;
  db().prepare(`UPDATE pc_stores SET name=?, branch=?, city=?, neighborhood=?, chain_id=?, store_code=?, logo_url=?, active=?, updated_at=? WHERE id=?`).run(
    patch.name?.trim() ?? cur.name,
    patch.branch !== undefined ? (patch.branch.trim() || null) : cur.branch,
    patch.city !== undefined ? (patch.city.trim() || null) : cur.city,
    patch.neighborhood !== undefined ? (patch.neighborhood.trim() || null) : cur.neighborhood,
    patch.chainId !== undefined ? (patch.chainId.trim() || null) : cur.chainId,
    patch.storeCode !== undefined ? (patch.storeCode.trim() || null) : cur.storeCode,
    patch.logoUrl !== undefined ? (patch.logoUrl.trim() || null) : cur.logoUrl,
    patch.active !== undefined ? (patch.active ? 1 : 0) : (cur.active ? 1 : 0),
    now(), id,
  );
  return getStore(id);
}
export function deleteStore(id: number): void {
  db().prepare(`DELETE FROM pc_stores WHERE id = ?`).run(id);
  db().prepare(`DELETE FROM pc_prices WHERE store_id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export function listProducts(opts: { categoryId?: number; search?: string; includeInactive?: boolean } = {}): PcProduct[] {
  const where: string[] = [];
  const args: unknown[] = [];
  if (!opts.includeInactive) where.push("active = 1");
  if (opts.categoryId) { where.push("category_id = ?"); args.push(opts.categoryId); }
  if (opts.search && opts.search.trim()) {
    where.push("(name LIKE ? OR brand LIKE ? OR barcode LIKE ?)");
    const q = `%${opts.search.trim()}%`;
    args.push(q, q, q);
  }
  const sql = `SELECT * FROM pc_products ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY name LIMIT 500`;
  return db().prepare(sql).all(...args).map(mapProduct);
}
export function createProduct(input: { categoryId?: number | null; name: string; brand?: string; unit?: string; barcode?: string; itemCode?: string; imageUrl?: string; active?: boolean; isSample?: boolean }): PcProduct {
  const ts = now();
  const info = db()
    .prepare(`INSERT INTO pc_products (category_id, name, brand, unit, barcode, item_code, image_url, active, is_sample, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(input.categoryId ?? null, input.name.trim(), input.brand?.trim() || null, input.unit?.trim() || null, input.barcode?.trim() || null, input.itemCode?.trim() || null, input.imageUrl?.trim() || null, input.active === false ? 0 : 1, input.isSample ? 1 : 0, ts, ts);
  return getProduct(Number(info.lastInsertRowid))!;
}
export function getProduct(id: number): PcProduct | undefined {
  const r = db().prepare(`SELECT * FROM pc_products WHERE id = ?`).get(id);
  return r ? mapProduct(r) : undefined;
}
export function updateProduct(id: number, patch: { categoryId?: number | null; name?: string; brand?: string; unit?: string; barcode?: string; itemCode?: string; imageUrl?: string; active?: boolean }): PcProduct | undefined {
  const cur = getProduct(id);
  if (!cur) return undefined;
  db().prepare(`UPDATE pc_products SET category_id=?, name=?, brand=?, unit=?, barcode=?, item_code=?, image_url=?, active=?, updated_at=? WHERE id=?`).run(
    patch.categoryId !== undefined ? patch.categoryId : cur.categoryId,
    patch.name?.trim() ?? cur.name,
    patch.brand !== undefined ? (patch.brand.trim() || null) : cur.brand,
    patch.unit !== undefined ? (patch.unit.trim() || null) : cur.unit,
    patch.barcode !== undefined ? (patch.barcode.trim() || null) : cur.barcode,
    patch.itemCode !== undefined ? (patch.itemCode.trim() || null) : cur.itemCode,
    patch.imageUrl !== undefined ? (patch.imageUrl.trim() || null) : cur.imageUrl,
    patch.active !== undefined ? (patch.active ? 1 : 0) : (cur.active ? 1 : 0),
    now(), id,
  );
  return getProduct(id);
}
export function deleteProduct(id: number): void {
  db().prepare(`DELETE FROM pc_products WHERE id = ?`).run(id);
  db().prepare(`DELETE FROM pc_prices WHERE product_id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------
export function listPrices(productId?: number): PcPrice[] {
  const rows = productId
    ? db().prepare(`SELECT * FROM pc_prices WHERE product_id = ? ORDER BY price`).all(productId)
    : db().prepare(`SELECT * FROM pc_prices ORDER BY product_id, price`).all();
  return rows.map(mapPrice);
}
export function createPrice(input: { productId: number; storeId: number; price: number; unitPrice?: number | null; unitOfMeasure?: string; currency?: string; onSale?: boolean; saleNote?: string; validUntil?: string; sourceType?: PcSourceType; recordHistory?: boolean }): PcPrice {
  const ts = now();
  const info = db()
    .prepare(`INSERT INTO pc_prices (product_id, store_id, price, unit_price, unit_of_measure, currency, on_sale, sale_note, valid_until, source_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(input.productId, input.storeId, num(input.price), input.unitPrice != null ? num(input.unitPrice) : null, input.unitOfMeasure?.trim() || null, input.currency?.trim() || "ILS", input.onSale ? 1 : 0, input.saleNote?.trim() || null, input.validUntil?.trim() || null, normSourceType(input.sourceType), ts, ts);
  if (input.recordHistory !== false) {
    recordPriceHistory(input.productId, input.storeId, num(input.price), !!input.onSale, "manual");
  }
  return mapPrice(db().prepare(`SELECT * FROM pc_prices WHERE id = ?`).get(Number(info.lastInsertRowid)));
}
export function updatePrice(id: number, patch: { price?: number; unitPrice?: number | null; unitOfMeasure?: string; currency?: string; onSale?: boolean; saleNote?: string; validUntil?: string }): PcPrice | undefined {
  const r = db().prepare(`SELECT * FROM pc_prices WHERE id = ?`).get(id) as any;
  if (!r) return undefined;
  const cur = mapPrice(r);
  db().prepare(`UPDATE pc_prices SET price=?, unit_price=?, unit_of_measure=?, currency=?, on_sale=?, sale_note=?, valid_until=?, updated_at=? WHERE id=?`).run(
    patch.price !== undefined ? num(patch.price) : cur.price,
    patch.unitPrice !== undefined ? (patch.unitPrice != null ? num(patch.unitPrice) : null) : cur.unitPrice,
    patch.unitOfMeasure !== undefined ? (patch.unitOfMeasure.trim() || null) : cur.unitOfMeasure,
    patch.currency !== undefined ? (patch.currency.trim() || "ILS") : cur.currency,
    patch.onSale !== undefined ? (patch.onSale ? 1 : 0) : (cur.onSale ? 1 : 0),
    patch.saleNote !== undefined ? (patch.saleNote.trim() || null) : cur.saleNote,
    patch.validUntil !== undefined ? (patch.validUntil.trim() || null) : cur.validUntil,
    now(), id,
  );
  if (patch.price !== undefined) {
    recordPriceHistory(cur.productId, cur.storeId, num(patch.price), patch.onSale !== undefined ? !!patch.onSale : cur.onSale, "manual");
  }
  return mapPrice(db().prepare(`SELECT * FROM pc_prices WHERE id = ?`).get(id));
}

export function recordPriceHistory(productId: number, storeId: number, price: number, onSale: boolean, source: string) {
  db().prepare(`INSERT INTO pc_price_history (product_id, store_id, price, on_sale, source, recorded_at) VALUES (?,?,?,?,?,?)`)
    .run(productId, storeId, num(price), onSale ? 1 : 0, source, now());
}
export function listPriceHistory(productId: number, limit = 50): Array<{ storeId: number; price: number; onSale: boolean; source: string | null; recordedAt: string }> {
  const rows = db().prepare(`SELECT * FROM pc_price_history WHERE product_id = ? ORDER BY recorded_at DESC LIMIT ?`).all(productId, limit) as any[];
  return rows.map((r) => ({ storeId: r.store_id, price: num(r.price), onSale: toBool(r.on_sale), source: r.source ?? null, recordedAt: r.recorded_at }));
}
export function deletePrice(id: number): void {
  db().prepare(`DELETE FROM pc_prices WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------
export function listPromotions(includeInactive = false): PcPromotion[] {
  const rows = db()
    .prepare(`SELECT * FROM pc_promotions ${includeInactive ? "" : "WHERE active = 1"} ORDER BY id DESC`)
    .all();
  return rows.map(mapPromotion);
}
export function createPromotion(input: { storeId?: number | null; title: string; description?: string; startsAt?: string; endsAt?: string; active?: boolean }): PcPromotion {
  const ts = now();
  const info = db()
    .prepare(`INSERT INTO pc_promotions (store_id, title, description, starts_at, ends_at, active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(input.storeId ?? null, input.title.trim(), input.description?.trim() || null, input.startsAt?.trim() || null, input.endsAt?.trim() || null, input.active === false ? 0 : 1, ts, ts);
  return mapPromotion(db().prepare(`SELECT * FROM pc_promotions WHERE id = ?`).get(Number(info.lastInsertRowid)));
}
export function updatePromotion(id: number, patch: { storeId?: number | null; title?: string; description?: string; startsAt?: string; endsAt?: string; active?: boolean }): PcPromotion | undefined {
  const r = db().prepare(`SELECT * FROM pc_promotions WHERE id = ?`).get(id) as any;
  if (!r) return undefined;
  const cur = mapPromotion(r);
  db().prepare(`UPDATE pc_promotions SET store_id=?, title=?, description=?, starts_at=?, ends_at=?, active=?, updated_at=? WHERE id=?`).run(
    patch.storeId !== undefined ? patch.storeId : cur.storeId,
    patch.title?.trim() ?? cur.title,
    patch.description !== undefined ? (patch.description.trim() || null) : cur.description,
    patch.startsAt !== undefined ? (patch.startsAt.trim() || null) : cur.startsAt,
    patch.endsAt !== undefined ? (patch.endsAt.trim() || null) : cur.endsAt,
    patch.active !== undefined ? (patch.active ? 1 : 0) : (cur.active ? 1 : 0),
    now(), id,
  );
  return mapPromotion(db().prepare(`SELECT * FROM pc_promotions WHERE id = ?`).get(id));
}
export function deletePromotion(id: number): void {
  db().prepare(`DELETE FROM pc_promotions WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Public search — products with the best (lowest) price across stores.
// ---------------------------------------------------------------------------
export interface PcSearchOffer {
  storeId: number;
  storeName: string;
  city: string | null;
  neighborhood: string | null;
  price: number;
  unitPrice: number | null;
  onSale: boolean;
  saleNote: string | null;
  updatedAt: string | null;
  sourceType: PcSourceType;
}
export interface PcSearchRow {
  product: PcProduct;
  categoryName: string | null;
  bestPrice: number | null;
  bestStore: string | null;
  bestUnitPrice: number | null;
  offers: PcSearchOffer[];
}

export interface PcSearchFilters {
  categoryId?: number;
  search?: string;          // matches name, brand, barcode, item code
  barcode?: string;
  brand?: string;
  city?: string;
  neighborhood?: string;
  storeId?: number;
  storeName?: string;       // matches store name OR branch (substring)
  minPrice?: number;
  maxPrice?: number;
  promoOnly?: boolean;
  updatedSince?: string;    // ISO date
  sort?: "price" | "unitPrice" | "name" | "updated";
  includeSample?: boolean;  // when false (default) sample/demo rows are excluded
  // Which data track to return. "official" (default) = mandatory published chain
  // prices ONLY. "supplier" = approved business-submitted offers only. "all" =
  // both tracks, each offer carries its own sourceType label. Unapproved
  // supplier submissions are never reachable here — they live in pc_price_submissions.
  track?: "official" | "supplier" | "all";
}

export function publicSearch(opts: PcSearchFilters = {}): PcSearchRow[] {
  // Product-level text/category/barcode/brand filtering first.
  const products = listProductsAdvanced(opts);
  const cats = new Map(listCategories(true).map((c) => [c.id, c.name]));
  const stores = new Map(listStores(true).filter((s) => s.active && (opts.includeSample || !s.isSample)).map((s) => [s.id, s]));

  const cityF = opts.city?.trim().toLowerCase() || "";
  const hoodF = opts.neighborhood?.trim().toLowerCase() || "";
  const storeF = opts.storeName?.trim().toLowerCase() || "";

  const track = opts.track || "official";
  const rows: PcSearchRow[] = products.map((p) => {
    let prices = listPrices(p.id).filter((pr) => stores.has(pr.storeId));
    // Track gate: official comparison NEVER includes supplier-submitted offers
    // unless the caller explicitly asks for the supplier or combined track.
    if (track === "official") prices = prices.filter((pr) => pr.sourceType === OFFICIAL);
    else if (track === "supplier") prices = prices.filter((pr) => pr.sourceType === SUPPLIER);
    if (opts.storeId) prices = prices.filter((pr) => pr.storeId === opts.storeId);
    if (storeF) prices = prices.filter((pr) => matchesStore(stores.get(pr.storeId), storeF));
    if (opts.promoOnly) prices = prices.filter((pr) => pr.onSale);
    if (opts.minPrice != null) prices = prices.filter((pr) => pr.price >= opts.minPrice!);
    if (opts.maxPrice != null) prices = prices.filter((pr) => pr.price <= opts.maxPrice!);
    if (opts.updatedSince) prices = prices.filter((pr) => (pr.updatedAt || "") >= opts.updatedSince!);

    const offers: PcSearchOffer[] = prices
      .map((pr) => {
        const s = stores.get(pr.storeId)!;
        return {
          storeId: pr.storeId,
          storeName: s.name,
          city: s.city,
          neighborhood: s.neighborhood,
          price: pr.price,
          unitPrice: pr.unitPrice,
          onSale: pr.onSale,
          saleNote: pr.saleNote,
          updatedAt: pr.updatedAt ?? null,
          sourceType: pr.sourceType,
        };
      })
      .filter((o) => (cityF ? (o.city || "").toLowerCase().includes(cityF) : true))
      .filter((o) => (hoodF ? (o.neighborhood || "").toLowerCase().includes(hoodF) : true))
      .sort((a, b) => a.price - b.price);

    const best = offers[0] ?? null;
    return {
      product: p,
      categoryName: p.categoryId ? cats.get(p.categoryId) ?? null : null,
      bestPrice: best ? best.price : null,
      bestStore: best ? best.storeName : null,
      bestUnitPrice: best ? best.unitPrice : null,
      offers,
    };
  });

  // When location/store/price/promo filters are active, drop products with no
  // matching offer so the public list stays relevant.
  const offerFiltered = !!(opts.storeId || opts.promoOnly || opts.minPrice != null || opts.maxPrice != null || cityF || hoodF || storeF || opts.updatedSince);
  const filtered = offerFiltered ? rows.filter((r) => r.offers.length > 0) : rows;

  const sort = opts.sort || "price";
  filtered.sort((a, b) => {
    if (sort === "name") return a.product.name.localeCompare(b.product.name, "he");
    if (sort === "unitPrice") return (a.bestUnitPrice ?? Infinity) - (b.bestUnitPrice ?? Infinity);
    if (sort === "updated") return (b.offers[0]?.updatedAt || "").localeCompare(a.offers[0]?.updatedAt || "");
    return (a.bestPrice ?? Infinity) - (b.bestPrice ?? Infinity);
  });
  return filtered;
}

function listProductsAdvanced(opts: PcSearchFilters): PcProduct[] {
  const where: string[] = ["p.active = 1"];
  const args: unknown[] = [];
  if (!opts.includeSample) where.push("IFNULL(p.is_sample, 0) = 0");
  if (opts.categoryId) { where.push("p.category_id = ?"); args.push(opts.categoryId); }
  if (opts.barcode && opts.barcode.trim()) { where.push("p.barcode = ?"); args.push(opts.barcode.trim()); }
  if (opts.brand && opts.brand.trim()) { where.push("p.brand LIKE ?"); args.push(`%${opts.brand.trim()}%`); }
  if (opts.search && opts.search.trim()) {
    where.push("(p.name LIKE ? OR p.brand LIKE ? OR p.barcode LIKE ? OR p.item_code LIKE ?)");
    const q = `%${opts.search.trim()}%`;
    args.push(q, q, q, q);
  }

  // Location/store filters constrain by STORE, not product columns. Narrow the
  // candidate products to those that actually have a matching offer BEFORE the
  // LIMIT, so a city/store search can't be silently truncated by products that
  // happen to sort first but carry no matching offer. The offer-level filtering
  // in publicSearch/catalogSearch remains authoritative for the returned rows.
  const city = opts.city?.trim();
  const hood = opts.neighborhood?.trim();
  const storeName = opts.storeName?.trim();
  if (city || hood || opts.storeId || storeName) {
    const sub: string[] = ["pr.product_id = p.id", "s.active = 1"];
    const subArgs: unknown[] = [];
    if (!opts.includeSample) sub.push("IFNULL(s.is_sample, 0) = 0");
    if (city) { sub.push("s.city LIKE ?"); subArgs.push(`%${city}%`); }
    if (hood) { sub.push("s.neighborhood LIKE ?"); subArgs.push(`%${hood}%`); }
    if (opts.storeId) { sub.push("s.id = ?"); subArgs.push(opts.storeId); }
    if (storeName) { sub.push("(s.name LIKE ? OR s.branch LIKE ?)"); subArgs.push(`%${storeName}%`, `%${storeName}%`); }
    where.push(`EXISTS (SELECT 1 FROM pc_prices pr JOIN pc_stores s ON s.id = pr.store_id WHERE ${sub.join(" AND ")})`);
    args.push(...subArgs);
  }

  const sql = `SELECT p.* FROM pc_products p WHERE ${where.join(" AND ")} ORDER BY p.name LIMIT 1000`;
  return db().prepare(sql).all(...args).map(mapProduct);
}

export function getDistinctCities(includeSample = false): string[] {
  const rows = db().prepare(`SELECT DISTINCT city FROM pc_stores WHERE active = 1 ${includeSample ? "" : "AND IFNULL(is_sample,0) = 0"} AND city IS NOT NULL AND city != '' ORDER BY city`).all() as any[];
  return rows.map((r) => r.city as string);
}
export function getDistinctBrands(includeSample = false): string[] {
  const rows = db().prepare(`SELECT DISTINCT brand FROM pc_products WHERE active = 1 ${includeSample ? "" : "AND IFNULL(is_sample,0) = 0"} AND brand IS NOT NULL AND brand != '' ORDER BY brand LIMIT 200`).all() as any[];
  return rows.map((r) => r.brand as string);
}

// Product detail with full price table + cheapest store.
export function productDetail(id: number, includeSample = false, track: "official" | "supplier" | "all" = "official"): (PcSearchRow & { history: ReturnType<typeof listPriceHistory> }) | undefined {
  const p = getProduct(id);
  if (!p) return undefined;
  if (!includeSample && p.isSample) return undefined;
  const stores = new Map(listStores(true).filter((s) => s.active && (includeSample || !s.isSample)).map((s) => [s.id, s]));
  const cats = new Map(listCategories(true).map((c) => [c.id, c.name]));
  const offers: PcSearchOffer[] = listPrices(p.id)
    .filter((pr) => stores.has(pr.storeId))
    .filter((pr) => (track === "official" ? pr.sourceType === OFFICIAL : track === "supplier" ? pr.sourceType === SUPPLIER : true))
    .map((pr) => {
      const s = stores.get(pr.storeId)!;
      return { storeId: pr.storeId, storeName: s.name, city: s.city, neighborhood: s.neighborhood, price: pr.price, unitPrice: pr.unitPrice, onSale: pr.onSale, saleNote: pr.saleNote, updatedAt: pr.updatedAt ?? null, sourceType: pr.sourceType };
    })
    .sort((a, b) => a.price - b.price);
  const best = offers[0] ?? null;
  return {
    product: p,
    categoryName: p.categoryId ? cats.get(p.categoryId) ?? null : null,
    bestPrice: best ? best.price : null,
    bestStore: best ? best.storeName : null,
    bestUnitPrice: best ? best.unitPrice : null,
    offers,
    history: listPriceHistory(p.id),
  };
}

// ---------------------------------------------------------------------------
// Barcode-keyed catalog + comparison (the live price-comparison core).
//
// Barcode is THE cross-chain matching key. These read paths surface, per
// product: how many distinct chains carry it, the cheapest offer, the price
// spread, and the regulatory/voluntary split — all from OUR SQLite mirror.
// ---------------------------------------------------------------------------

/** chain_id -> regulatory|voluntary, derived from pc_feed_sources. */
export function chainKindMap(): Map<string, PcChainKind> {
  const rows = db()
    .prepare(`SELECT chain_id, source_kind FROM pc_feed_sources WHERE chain_id IS NOT NULL AND chain_id != ''`)
    .all() as any[];
  const m = new Map<string, PcChainKind>();
  for (const r of rows) m.set(String(r.chain_id), normChainKind(r.source_kind));
  return m;
}

/** Store name/branch substring match (mirrors the SQL name-OR-branch narrowing). */
function matchesStore(s: PcStore | undefined, needle: string): boolean {
  if (!s) return false;
  return (s.name || "").toLowerCase().includes(needle) || (s.branch || "").toLowerCase().includes(needle);
}

/** A chain key for a store: its chain_id, or a per-store fallback when unset. */
function storeChainKey(s: PcStore): string {
  const cid = (s.chainId || "").trim();
  return cid ? cid : `store:${s.id}`;
}

export interface PcCatalogOffer {
  storeId: number;
  storeName: string;
  chainId: string | null;
  chainKey: string;
  chainKind: PcChainKind;
  city: string | null;
  neighborhood: string | null;
  price: number;
  unitPrice: number | null;
  onSale: boolean;
  saleNote: string | null;
  updatedAt: string | null;
}
export interface PcCatalogRow {
  product: PcProduct;
  categoryName: string | null;
  chainCount: number;
  cheapestPrice: number | null;
  cheapestStore: string | null;
  cheapestChainKind: PcChainKind | null;
  dearestPrice: number | null;
  spreadPct: number | null;
  kinds: PcChainKind[];
  offers: PcCatalogOffer[];
}
export interface PcCatalogFilters extends PcSearchFilters {
  /** Only return products carried by at least this many distinct chains. */
  minChains?: number;
  /** Restrict to a single regulatory/voluntary track. */
  kind?: PcChainKind;
}

function spreadPct(min: number, max: number): number | null {
  if (min <= 0) return null;
  return Math.round(((max - min) / min) * 1000) / 10;
}

function buildCatalogOffers(productId: number, stores: Map<number, PcStore>, kinds: Map<string, PcChainKind>, opts: PcCatalogFilters): PcCatalogOffer[] {
  let prices = listPrices(productId).filter((pr) => stores.has(pr.storeId));
  const track = opts.track || "official";
  if (track === "official") prices = prices.filter((pr) => pr.sourceType === OFFICIAL);
  else if (track === "supplier") prices = prices.filter((pr) => pr.sourceType === SUPPLIER);
  if (opts.promoOnly) prices = prices.filter((pr) => pr.onSale);
  if (opts.minPrice != null) prices = prices.filter((pr) => pr.price >= opts.minPrice!);
  if (opts.maxPrice != null) prices = prices.filter((pr) => pr.price <= opts.maxPrice!);

  const cityF = opts.city?.trim().toLowerCase() || "";
  const hoodF = opts.neighborhood?.trim().toLowerCase() || "";
  const storeF = opts.storeName?.trim().toLowerCase() || "";
  if (opts.storeId) prices = prices.filter((pr) => pr.storeId === opts.storeId);
  if (storeF) prices = prices.filter((pr) => matchesStore(stores.get(pr.storeId), storeF));
  const offers = prices
    .map((pr) => {
      const s = stores.get(pr.storeId)!;
      const chainKey = storeChainKey(s);
      const chainKind = kinds.get((s.chainId || "").trim()) ?? REGULATORY;
      return {
        storeId: pr.storeId, storeName: s.name, chainId: s.chainId, chainKey, chainKind,
        city: s.city, neighborhood: s.neighborhood, price: pr.price, unitPrice: pr.unitPrice,
        onSale: pr.onSale, saleNote: pr.saleNote, updatedAt: pr.updatedAt ?? null,
      } as PcCatalogOffer;
    })
    .filter((o) => (cityF ? (o.city || "").toLowerCase().includes(cityF) : true))
    .filter((o) => (hoodF ? (o.neighborhood || "").toLowerCase().includes(hoodF) : true))
    .filter((o) => (opts.kind ? o.chainKind === opts.kind : true))
    .sort((a, b) => a.price - b.price);
  return offers;
}

function summarizeOffers(offers: PcCatalogOffer[]) {
  const chainKeys = new Set(offers.map((o) => o.chainKey));
  const kindSet = new Set(offers.map((o) => o.chainKind));
  const cheapest = offers[0] ?? null;
  const dearest = offers.length ? offers[offers.length - 1] : null;
  return {
    chainCount: chainKeys.size,
    kinds: Array.from(kindSet) as PcChainKind[],
    cheapestPrice: cheapest ? cheapest.price : null,
    cheapestStore: cheapest ? cheapest.storeName : null,
    cheapestChainKind: cheapest ? cheapest.chainKind : null,
    dearestPrice: dearest ? dearest.price : null,
    spreadPct: cheapest && dearest ? spreadPct(cheapest.price, dearest.price) : null,
  };
}

/** Consumer catalog search: barcode-keyed rows with chain count + spread. */
export function catalogSearch(opts: PcCatalogFilters = {}): PcCatalogRow[] {
  const products = listProductsAdvanced(opts);
  const cats = new Map(listCategories(true).map((c) => [c.id, c.name]));
  const stores = new Map(listStores(true).filter((s) => s.active && (opts.includeSample || !s.isSample)).map((s) => [s.id, s]));
  const kinds = chainKindMap();
  const minChains = opts.minChains != null && opts.minChains > 0 ? opts.minChains : 0;

  const rows: PcCatalogRow[] = products.map((p) => {
    const offers = buildCatalogOffers(p.id, stores, kinds, opts);
    const sum = summarizeOffers(offers);
    return {
      product: p,
      categoryName: p.categoryId ? cats.get(p.categoryId) ?? null : null,
      offers,
      ...sum,
    };
  });

  const offerFiltered = !!(opts.promoOnly || opts.minPrice != null || opts.maxPrice != null || opts.city || opts.neighborhood || opts.storeId || opts.storeName || opts.kind);
  let filtered = offerFiltered ? rows.filter((r) => r.offers.length > 0) : rows;
  if (minChains > 0) filtered = filtered.filter((r) => r.chainCount >= minChains);

  const sort = opts.sort || "price";
  filtered.sort((a, b) => {
    if (sort === "name") return a.product.name.localeCompare(b.product.name, "he");
    if (sort === "updated") return (b.offers[0]?.updatedAt || "").localeCompare(a.offers[0]?.updatedAt || "");
    return (a.cheapestPrice ?? Infinity) - (b.cheapestPrice ?? Infinity);
  });
  return filtered;
}

export interface PcCompareOffer extends PcCatalogOffer {
  isCheapest: boolean;
}
export interface PcComparison {
  product: PcProduct;
  categoryName: string | null;
  barcode: string;
  chainCount: number;
  cheapestPrice: number | null;
  dearestPrice: number | null;
  spreadPct: number | null;
  offers: PcCompareOffer[];
  regulatory: PcCompareOffer[];
  voluntary: PcCompareOffer[];
  history: ReturnType<typeof listPriceHistory>;
}

/** Product comparison keyed by barcode — all chains carrying it, cheapest→dearest. */
export function comparisonByBarcode(barcode: string, opts: { includeSample?: boolean; track?: "official" | "supplier" | "all" } = {}): PcComparison | undefined {
  const code = String(barcode || "").trim();
  if (!code) return undefined;
  const includeSample = !!opts.includeSample;
  const row = db()
    .prepare(`SELECT * FROM pc_products WHERE barcode = ? AND active = 1 ${includeSample ? "" : "AND IFNULL(is_sample,0)=0"} ORDER BY id LIMIT 1`)
    .get(code);
  if (!row) return undefined;
  const p = mapProduct(row);
  const cats = new Map(listCategories(true).map((c) => [c.id, c.name]));
  const stores = new Map(listStores(true).filter((s) => s.active && (includeSample || !s.isSample)).map((s) => [s.id, s]));
  const kinds = chainKindMap();
  const base = buildCatalogOffers(p.id, stores, kinds, { track: opts.track || "official", includeSample });
  const offers: PcCompareOffer[] = base.map((o, i) => ({ ...o, isCheapest: i === 0 }));
  const sum = summarizeOffers(base);
  return {
    product: p,
    categoryName: p.categoryId ? cats.get(p.categoryId) ?? null : null,
    barcode: code,
    chainCount: sum.chainCount,
    cheapestPrice: sum.cheapestPrice,
    dearestPrice: sum.dearestPrice,
    spreadPct: sum.spreadPct,
    offers,
    regulatory: offers.filter((o) => o.chainKind === REGULATORY),
    voluntary: offers.filter((o) => o.chainKind === VOLUNTARY),
    history: listPriceHistory(p.id),
  };
}

// ---------------------------------------------------------------------------
// Feed sources (ETL registry)
// ---------------------------------------------------------------------------
export interface PcFeedSource {
  id: number;
  chainName: string;
  chainId: string | null;
  sourceUrl: string | null;
  sourceType: string;
  feedFormat: string;
  feedKinds: string | null;
  authUser: string | null;
  notes: string | null;
  sourceKind: PcChainKind;
  verified: boolean;
  active: boolean;
  lastStatus: string | null;
  lastRunAt: string | null;
  lastMessage: string | null;
  adapter: string | null;
  directFileUrl: string | null;
  discoveryUrl: string | null;
  maxFilesPerRun: number;
  lastError: string | null;
  lastSuccessAt: string | null;
}
function mapFeed(r: any): PcFeedSource {
  return {
    id: r.id, chainName: r.chain_name, chainId: r.chain_id ?? null, sourceUrl: r.source_url ?? null,
    sourceType: r.source_type, feedFormat: r.feed_format, feedKinds: r.feed_kinds ?? null,
    authUser: r.auth_user ?? null, notes: r.notes ?? null, sourceKind: normChainKind(r.source_kind),
    verified: toBool(r.verified), active: toBool(r.active),
    lastStatus: r.last_status ?? null, lastRunAt: r.last_run_at ?? null, lastMessage: r.last_message ?? null,
    adapter: r.adapter ?? null, directFileUrl: r.direct_file_url ?? null, discoveryUrl: r.discovery_url ?? null,
    maxFilesPerRun: r.max_files_per_run != null ? num(r.max_files_per_run, 10) : 10,
    lastError: r.last_error ?? null, lastSuccessAt: r.last_success_at ?? null,
  };
}
export function listFeedSources(includeInactive = true): PcFeedSource[] {
  const rows = db().prepare(`SELECT * FROM pc_feed_sources ${includeInactive ? "" : "WHERE active = 1"} ORDER BY chain_name`).all();
  return rows.map(mapFeed);
}
export function getFeedSource(id: number): PcFeedSource | undefined {
  const r = db().prepare(`SELECT * FROM pc_feed_sources WHERE id = ?`).get(id);
  return r ? mapFeed(r) : undefined;
}
export function createFeedSource(input: Partial<PcFeedSource> & { chainName: string }): PcFeedSource {
  const ts = now();
  const info = db().prepare(`INSERT INTO pc_feed_sources
    (chain_name, chain_id, source_url, source_type, source_kind, feed_format, feed_kinds, auth_user, notes, verified, active, last_status, adapter, direct_file_url, discovery_url, max_files_per_run, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    input.chainName.trim(), input.chainId?.trim() || null, input.sourceUrl?.trim() || null,
    input.sourceType?.trim() || "manual", normChainKind(input.sourceKind),
    input.feedFormat?.trim() || "xml", input.feedKinds?.trim() || null,
    input.authUser?.trim() || null, input.notes?.trim() || null, input.verified ? 1 : 0, input.active ? 1 : 0,
    "never", input.adapter?.trim() || null, input.directFileUrl?.trim() || null, input.discoveryUrl?.trim() || null,
    input.maxFilesPerRun != null ? num(input.maxFilesPerRun, 10) : 10, ts, ts,
  );
  return getFeedSource(Number(info.lastInsertRowid))!;
}
export function updateFeedSource(id: number, patch: Partial<PcFeedSource>): PcFeedSource | undefined {
  const cur = getFeedSource(id);
  if (!cur) return undefined;
  const s = (v: string | null | undefined, d: string | null) => (v !== undefined ? (v ? String(v).trim() || null : null) : d);
  db().prepare(`UPDATE pc_feed_sources SET chain_name=?, chain_id=?, source_url=?, source_type=?, source_kind=?, feed_format=?, feed_kinds=?, auth_user=?, notes=?, verified=?, active=?, adapter=?, direct_file_url=?, discovery_url=?, max_files_per_run=?, updated_at=? WHERE id=?`).run(
    patch.chainName !== undefined ? patch.chainName.trim() : cur.chainName,
    s(patch.chainId, cur.chainId), s(patch.sourceUrl, cur.sourceUrl),
    patch.sourceType !== undefined ? patch.sourceType : cur.sourceType,
    patch.sourceKind !== undefined ? normChainKind(patch.sourceKind) : cur.sourceKind,
    patch.feedFormat !== undefined ? patch.feedFormat : cur.feedFormat,
    s(patch.feedKinds, cur.feedKinds), s(patch.authUser, cur.authUser), s(patch.notes, cur.notes),
    patch.verified !== undefined ? (patch.verified ? 1 : 0) : (cur.verified ? 1 : 0),
    patch.active !== undefined ? (patch.active ? 1 : 0) : (cur.active ? 1 : 0),
    s(patch.adapter, cur.adapter), s(patch.directFileUrl, cur.directFileUrl), s(patch.discoveryUrl, cur.discoveryUrl),
    patch.maxFilesPerRun !== undefined ? num(patch.maxFilesPerRun, 10) : cur.maxFilesPerRun,
    now(), id,
  );
  return getFeedSource(id);
}
export function deleteFeedSource(id: number): void {
  db().prepare(`DELETE FROM pc_feed_sources WHERE id = ?`).run(id);
}
export function markFeedRun(id: number, status: string, message: string) {
  const ts = now();
  if (status === "ok") {
    db().prepare(`UPDATE pc_feed_sources SET last_status=?, last_run_at=?, last_message=?, last_success_at=?, last_error=NULL, updated_at=? WHERE id=?`)
      .run(status, ts, message.slice(0, 500), ts, ts, id);
  } else {
    db().prepare(`UPDATE pc_feed_sources SET last_status=?, last_run_at=?, last_message=?, last_error=?, updated_at=? WHERE id=?`)
      .run(status, ts, message.slice(0, 500), message.slice(0, 500), ts, id);
  }
}

// ---------------------------------------------------------------------------
// Import jobs + logs
// ---------------------------------------------------------------------------
export interface PcImportJob {
  id: number; feedSourceId: number | null; trigger: string; kind: string | null; status: string;
  storesUpserted: number; productsUpserted: number; pricesUpserted: number; promotionsUpserted: number;
  errors: number; rawMeta: string | null; startedAt: string; finishedAt: string | null; message: string | null;
}
function mapJob(r: any): PcImportJob {
  return {
    id: r.id, feedSourceId: r.feed_source_id ?? null, trigger: r.trigger, kind: r.kind ?? null, status: r.status,
    storesUpserted: num(r.stores_upserted), productsUpserted: num(r.products_upserted), pricesUpserted: num(r.prices_upserted),
    promotionsUpserted: num(r.promotions_upserted), errors: num(r.errors), rawMeta: r.raw_meta ?? null,
    startedAt: r.started_at, finishedAt: r.finished_at ?? null, message: r.message ?? null,
  };
}
export function createImportJob(input: { feedSourceId?: number | null; trigger: string; kind?: string }): PcImportJob {
  const info = db().prepare(`INSERT INTO pc_import_jobs (feed_source_id, trigger, kind, status, started_at) VALUES (?,?,?,?,?)`)
    .run(input.feedSourceId ?? null, input.trigger, input.kind ?? null, "running", now());
  return getImportJob(Number(info.lastInsertRowid))!;
}
export function getImportJob(id: number): PcImportJob | undefined {
  const r = db().prepare(`SELECT * FROM pc_import_jobs WHERE id = ?`).get(id);
  return r ? mapJob(r) : undefined;
}
export function finishImportJob(id: number, patch: { status: string; storesUpserted?: number; productsUpserted?: number; pricesUpserted?: number; promotionsUpserted?: number; errors?: number; rawMeta?: unknown; message?: string }): PcImportJob | undefined {
  const cur = getImportJob(id);
  if (!cur) return undefined;
  db().prepare(`UPDATE pc_import_jobs SET status=?, stores_upserted=?, products_upserted=?, prices_upserted=?, promotions_upserted=?, errors=?, raw_meta=?, finished_at=?, message=? WHERE id=?`).run(
    patch.status,
    patch.storesUpserted ?? cur.storesUpserted, patch.productsUpserted ?? cur.productsUpserted,
    patch.pricesUpserted ?? cur.pricesUpserted, patch.promotionsUpserted ?? cur.promotionsUpserted,
    patch.errors ?? cur.errors,
    patch.rawMeta !== undefined ? JSON.stringify(patch.rawMeta).slice(0, 8000) : cur.rawMeta,
    now(), patch.message?.slice(0, 1000) ?? cur.message, id,
  );
  return getImportJob(id);
}
export function listImportJobs(limit = 50): PcImportJob[] {
  return (db().prepare(`SELECT * FROM pc_import_jobs ORDER BY id DESC LIMIT ?`).all(limit) as any[]).map(mapJob);
}
export function logImport(jobId: number, level: "info" | "warn" | "error", message: string) {
  db().prepare(`INSERT INTO pc_import_logs (job_id, level, message, created_at) VALUES (?,?,?,?)`)
    .run(jobId, level, message.slice(0, 1000), now());
}
export function listImportLogs(jobId: number, limit = 500): Array<{ id: number; level: string; message: string; createdAt: string }> {
  const rows = db().prepare(`SELECT * FROM pc_import_logs WHERE job_id = ? ORDER BY id ASC LIMIT ?`).all(jobId, limit) as any[];
  return rows.map((r) => ({ id: r.id, level: r.level, message: r.message, createdAt: r.created_at }));
}

// ---------------------------------------------------------------------------
// Upserts used by the importer (dedupe by chain/store/barcode/item code).
// ---------------------------------------------------------------------------
export function upsertStoreByCode(input: { chainId: string | null; storeCode: string | null; name: string; branch?: string | null; city?: string | null; neighborhood?: string | null }): PcStore {
  let existing: any = null;
  if (input.chainId && input.storeCode) {
    existing = db().prepare(`SELECT * FROM pc_stores WHERE chain_id = ? AND store_code = ?`).get(input.chainId, input.storeCode);
  }
  if (!existing) existing = db().prepare(`SELECT * FROM pc_stores WHERE name = ? AND IFNULL(branch,'') = ?`).get(input.name, input.branch || "");
  if (existing) {
    const updated = updateStore(existing.id, {
      name: input.name, branch: input.branch || undefined, city: input.city || undefined,
      neighborhood: input.neighborhood || undefined, chainId: input.chainId || undefined, storeCode: input.storeCode || undefined,
      active: true,
    })!;
    // Imported data is real — clear any leftover sample flag on a matched row.
    db().prepare(`UPDATE pc_stores SET is_sample = 0 WHERE id = ?`).run(existing.id);
    return { ...updated, isSample: false };
  }
  return createStore({
    name: input.name, branch: input.branch || undefined, city: input.city || undefined,
    neighborhood: input.neighborhood || undefined, chainId: input.chainId || undefined, storeCode: input.storeCode || undefined,
    active: true, isSample: false, sourceType: OFFICIAL,
  });
}

export function upsertProductByCode(input: { barcode: string | null; itemCode: string | null; name: string; brand?: string | null; unit?: string | null; categoryId?: number | null }): PcProduct {
  let existing: any = null;
  if (input.barcode) existing = db().prepare(`SELECT * FROM pc_products WHERE barcode = ?`).get(input.barcode);
  if (!existing && input.itemCode) existing = db().prepare(`SELECT * FROM pc_products WHERE item_code = ?`).get(input.itemCode);
  if (!existing) existing = db().prepare(`SELECT * FROM pc_products WHERE name = ? AND IFNULL(brand,'') = ?`).get(input.name, input.brand || "");
  if (existing) {
    const p = updateProduct(existing.id, {
      name: input.name, brand: input.brand || undefined, unit: input.unit || undefined,
      barcode: input.barcode || undefined, itemCode: input.itemCode || undefined,
      categoryId: input.categoryId !== undefined ? input.categoryId : undefined, active: true,
    })!;
    // Imported data is real — clear any leftover sample flag on a matched row.
    db().prepare(`UPDATE pc_products SET is_sample = 0 WHERE id = ?`).run(existing.id);
    if (input.barcode) addAlias(p.id, "barcode", input.barcode, input.barcode);
    return { ...p, isSample: false };
  }
  const p = createProduct({
    name: input.name, brand: input.brand || undefined, unit: input.unit || undefined,
    barcode: input.barcode || undefined, itemCode: input.itemCode || undefined, categoryId: input.categoryId ?? null, active: true, isSample: false,
  });
  if (input.barcode) addAlias(p.id, "barcode", input.barcode, null);
  return p;
}

function addAlias(productId: number, type: string, value: string, chainId: string | null) {
  const exists = db().prepare(`SELECT id FROM pc_product_aliases WHERE product_id = ? AND alias_type = ? AND alias_value = ?`).get(productId, type, value);
  if (exists) return;
  db().prepare(`INSERT INTO pc_product_aliases (product_id, alias_type, alias_value, chain_id, created_at) VALUES (?,?,?,?,?)`)
    .run(productId, type, value, chainId, now());
}

// Upsert a price for a (product, store) pair. One current price per pair;
// history is appended on change.
export function upsertPrice(input: { productId: number; storeId: number; price: number; unitPrice?: number | null; unitOfMeasure?: string | null; onSale?: boolean; saleNote?: string | null; validUntil?: string | null; source?: string; sourceType?: PcSourceType }): { created: boolean; priceId: number } {
  const source = input.source || "import";
  const sourceType = normSourceType(input.sourceType);
  const existing = db().prepare(`SELECT * FROM pc_prices WHERE product_id = ? AND store_id = ?`).get(input.productId, input.storeId) as any;
  const ts = now();
  if (existing) {
    const changed = num(existing.price) !== num(input.price) || toBool(existing.on_sale) !== !!input.onSale;
    db().prepare(`UPDATE pc_prices SET price=?, unit_price=?, unit_of_measure=?, on_sale=?, sale_note=?, valid_until=?, source=?, source_type=?, updated_at=? WHERE id=?`).run(
      num(input.price), input.unitPrice != null ? num(input.unitPrice) : (existing.unit_price ?? null),
      input.unitOfMeasure || existing.unit_of_measure || null, input.onSale ? 1 : 0,
      input.saleNote || null, input.validUntil || null, source, sourceType, ts, existing.id,
    );
    if (changed) recordPriceHistory(input.productId, input.storeId, num(input.price), !!input.onSale, source);
    return { created: false, priceId: Number(existing.id) };
  }
  const info = db().prepare(`INSERT INTO pc_prices (product_id, store_id, price, unit_price, unit_of_measure, currency, on_sale, sale_note, valid_until, source, source_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    input.productId, input.storeId, num(input.price), input.unitPrice != null ? num(input.unitPrice) : null,
    input.unitOfMeasure || null, "ILS", input.onSale ? 1 : 0, input.saleNote || null, input.validUntil || null, source, sourceType, ts, ts,
  );
  recordPriceHistory(input.productId, input.storeId, num(input.price), !!input.onSale, source);
  return { created: true, priceId: Number(info.lastInsertRowid) };
}

// ---------------------------------------------------------------------------
// Search + automation logging
// ---------------------------------------------------------------------------
export function logSearchRequest(input: { channel: string; query?: string; filters?: unknown; resultCount: number; bestPrice?: number | null; bestStore?: string | null; contact?: string | null }): number {
  const info = db().prepare(`INSERT INTO pc_search_requests (channel, query, filters_json, result_count, best_price, best_store, contact, created_at) VALUES (?,?,?,?,?,?,?,?)`).run(
    input.channel, input.query || null, input.filters ? JSON.stringify(input.filters).slice(0, 4000) : null,
    num(input.resultCount), input.bestPrice ?? null, input.bestStore || null, input.contact || null, now(),
  );
  return Number(info.lastInsertRowid);
}
export function logAutomation(input: { channel: string; query?: string; payload?: unknown; endpoint?: string; status: number; response?: string }): number {
  const info = db().prepare(`INSERT INTO pc_automation_logs (channel, query, payload_json, endpoint, status, response, created_at) VALUES (?,?,?,?,?,?,?)`).run(
    input.channel, input.query || null, input.payload ? JSON.stringify(input.payload).slice(0, 8000) : null,
    input.endpoint || null, num(input.status), (input.response || "").slice(0, 2000), now(),
  );
  return Number(info.lastInsertRowid);
}
export function listAutomationLogs(limit = 50): Array<Record<string, unknown>> {
  return db().prepare(`SELECT * FROM pc_automation_logs ORDER BY id DESC LIMIT ?`).all(limit) as any[];
}
export function listSearchRequests(limit = 50): Array<Record<string, unknown>> {
  return db().prepare(`SELECT * FROM pc_search_requests ORDER BY id DESC LIMIT ?`).all(limit) as any[];
}

// Counts for the admin dashboard.
export function getStats() {
  const c = (sql: string) => (db().prepare(sql).get() as any).c as number;
  return {
    categories: c(`SELECT COUNT(*) c FROM pc_categories`),
    stores: c(`SELECT COUNT(*) c FROM pc_stores`),
    realStores: c(`SELECT COUNT(*) c FROM pc_stores WHERE IFNULL(is_sample,0) = 0`),
    products: c(`SELECT COUNT(*) c FROM pc_products`),
    realProducts: c(`SELECT COUNT(*) c FROM pc_products WHERE IFNULL(is_sample,0) = 0`),
    prices: c(`SELECT COUNT(*) c FROM pc_prices`),
    officialPrices: c(`SELECT COUNT(*) c FROM pc_prices WHERE IFNULL(source_type,'official_feed') = 'official_feed'`),
    supplierPrices: c(`SELECT COUNT(*) c FROM pc_prices WHERE source_type = 'supplier_submitted'`),
    pendingSubmissions: c(`SELECT COUNT(*) c FROM pc_price_submissions WHERE status = 'pending'`),
    approvedSubmissions: c(`SELECT COUNT(*) c FROM pc_price_submissions WHERE status = 'approved'`),
    promotions: c(`SELECT COUNT(*) c FROM pc_promotions`),
    feedSources: c(`SELECT COUNT(*) c FROM pc_feed_sources`),
    activeFeedSources: c(`SELECT COUNT(*) c FROM pc_feed_sources WHERE active = 1`),
    importJobs: c(`SELECT COUNT(*) c FROM pc_import_jobs`),
    priceHistory: c(`SELECT COUNT(*) c FROM pc_price_history`),
    lastImportAt: ((db().prepare(`SELECT finished_at FROM pc_import_jobs WHERE finished_at IS NOT NULL AND status = 'ok' ORDER BY id DESC LIMIT 1`).get() as any)?.finished_at) ?? null,
    lastSuccessAt: ((db().prepare(`SELECT last_success_at FROM pc_feed_sources WHERE last_success_at IS NOT NULL ORDER BY last_success_at DESC LIMIT 1`).get() as any)?.last_success_at) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Data-health dashboard — coverage metrics for the admin area. All figures
// come from real (non-sample) rows so the admin sees true catalog depth.
// ---------------------------------------------------------------------------
export interface PcDataHealth {
  products: number;
  withBarcode: number;
  uniqueBarcodes: number;
  categorized: number;
  uncategorized: number;
  withImage: number;
  withAnyPrice: number;
  inChains2Plus: number;
  inChains3Plus: number;
  inChains4Plus: number;
  chains: number;
  regulatoryChains: number;
  voluntaryChains: number;
}
export function dataHealth(): PcDataHealth {
  const c = (sql: string) => (db().prepare(sql).get() as any).c as number;
  const realProd = `FROM pc_products WHERE active = 1 AND IFNULL(is_sample,0) = 0`;
  // Per-product distinct chain counts (a chain = pc_stores.chain_id, falling
  // back to a per-store key when chain_id is unset). Official prices only, so
  // this matches the public comparison's notion of "carried by N chains".
  const chainRows = db().prepare(`
    SELECT p.id AS pid,
           COUNT(DISTINCT COALESCE(NULLIF(TRIM(s.chain_id), ''), 'store:' || s.id)) AS chains
    FROM pc_products p
    JOIN pc_prices pr ON pr.product_id = p.id
    JOIN pc_stores s ON s.id = pr.store_id
    WHERE p.active = 1 AND IFNULL(p.is_sample,0) = 0
      AND IFNULL(s.is_sample,0) = 0
      AND IFNULL(pr.source_type,'official_feed') = 'official_feed'
    GROUP BY p.id
  `).all() as Array<{ pid: number; chains: number }>;
  let in2 = 0, in3 = 0, in4 = 0;
  for (const r of chainRows) {
    if (r.chains >= 2) in2++;
    if (r.chains >= 3) in3++;
    if (r.chains >= 4) in4++;
  }
  return {
    products: c(`SELECT COUNT(*) c ${realProd}`),
    withBarcode: c(`SELECT COUNT(*) c ${realProd} AND barcode IS NOT NULL AND barcode != ''`),
    uniqueBarcodes: c(`SELECT COUNT(*) c FROM (SELECT DISTINCT barcode ${realProd} AND barcode IS NOT NULL AND barcode != '')`),
    categorized: c(`SELECT COUNT(*) c ${realProd} AND category_id IS NOT NULL`),
    uncategorized: c(`SELECT COUNT(*) c ${realProd} AND category_id IS NULL`),
    withImage: c(`SELECT COUNT(*) c ${realProd} AND image_url IS NOT NULL AND image_url != ''`),
    withAnyPrice: chainRows.length,
    inChains2Plus: in2,
    inChains3Plus: in3,
    inChains4Plus: in4,
    chains: c(`SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(chain_id),''),'store:'||id)) c FROM pc_stores WHERE IFNULL(is_sample,0)=0`),
    regulatoryChains: c(`SELECT COUNT(*) c FROM pc_feed_sources WHERE IFNULL(source_kind,'regulatory') = 'regulatory'`),
    voluntaryChains: c(`SELECT COUNT(*) c FROM pc_feed_sources WHERE source_kind = 'voluntary'`),
  };
}

// ---------------------------------------------------------------------------
// AI-style recommendation — DB-only. Returns best verified savings, or a clear
// "no verified data yet" signal. Never invents prices.
// ---------------------------------------------------------------------------
export interface PcRecommendation {
  hasData: boolean;
  message: string;
  product?: { id: number; name: string; brand: string | null; unit: string | null };
  bestPrice?: number;
  bestStore?: string;
  worstPrice?: number;
  savings?: number;
  savingsPct?: number;
  offers?: PcSearchOffer[];
  alternatives?: Array<{ name: string; bestPrice: number | null; bestStore: string | null }>;
}
export function recommend(opts: PcSearchFilters = {}): PcRecommendation {
  const rows = publicSearch(opts).filter((r) => r.bestPrice != null && r.offers.length > 0);
  if (rows.length === 0) {
    return {
      hasData: false,
      message: "אין עדיין נתוני מחירים מאומתים עבור החיפוש הזה. ברגע שיתווספו מקורות נתונים פעילים, נוכל להציג המלצת חיסכון מבוססת נתונים בלבד.",
    };
  }
  // Pick the product with the largest absolute spread (clearest saving signal).
  let bestRow = rows[0];
  let bestSpread = -1;
  for (const r of rows) {
    if (r.offers.length < 2) continue;
    const spread = r.offers[r.offers.length - 1].price - r.offers[0].price;
    if (spread > bestSpread) { bestSpread = spread; bestRow = r; }
  }
  const offers = bestRow.offers;
  const best = offers[0];
  const worst = offers[offers.length - 1];
  const savings = worst ? Math.round((worst.price - best.price) * 100) / 100 : 0;
  const savingsPct = worst && worst.price > 0 ? Math.round((savings / worst.price) * 1000) / 10 : 0;
  const message = savings > 0
    ? `על ${bestRow.product.name} ניתן לחסוך עד ₪${savings.toFixed(2)} (${savingsPct}%) בקנייה ב${best.storeName} במקום ב${worst.storeName}. הנתונים מבוססים על המאגר בלבד.`
    : `המחיר הזול ביותר עבור ${bestRow.product.name} הוא ₪${best.price.toFixed(2)} ב${best.storeName}, על בסיס הנתונים שבמאגר.`;
  return {
    hasData: true,
    message,
    product: { id: bestRow.product.id, name: bestRow.product.name, brand: bestRow.product.brand, unit: bestRow.product.unit },
    bestPrice: best.price,
    bestStore: best.storeName,
    worstPrice: worst?.price,
    savings,
    savingsPct,
    offers,
    alternatives: rows.slice(0, 5).map((r) => ({ name: r.product.name, bestPrice: r.bestPrice, bestStore: r.bestStore })),
  };
}

// ---------------------------------------------------------------------------
// Supplier / business-submitted prices (the second track).
//
// Businesses submit an offer via the public site; it lands here as 'pending'
// and is invisible to the public comparison. An admin reviews and approves or
// rejects it. On approval the offer is upserted into pc_prices tagged
// source_type='supplier_submitted' (matched/created store + product), so it can
// appear in the supplier track only — never inside the official comparison.
// ---------------------------------------------------------------------------
export interface PcPriceSubmission {
  id: number;
  merchantName: string;
  merchantContact: string | null;
  storeId: number | null;
  storeName: string;
  city: string | null;
  productId: number | null;
  productName: string;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
  price: number;
  currency: string;
  onSale: boolean;
  saleNote: string | null;
  validUntil: string | null;
  note: string | null;
  trust: "unverified" | "verified" | "trusted";
  status: "pending" | "approved" | "rejected";
  approved: boolean;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  priceId: number | null;
  createdAt: string;
  updatedAt: string;
}
function mapSubmission(r: any): PcPriceSubmission {
  return {
    id: r.id, merchantName: r.merchant_name, merchantContact: r.merchant_contact ?? null,
    storeId: r.store_id ?? null, storeName: r.store_name, city: r.city ?? null,
    productId: r.product_id ?? null, productName: r.product_name, brand: r.brand ?? null,
    unit: r.unit ?? null, barcode: r.barcode ?? null, price: num(r.price), currency: r.currency ?? "ILS",
    onSale: toBool(r.on_sale), saleNote: r.sale_note ?? null, validUntil: r.valid_until ?? null,
    note: r.note ?? null, trust: (["unverified", "verified", "trusted"].includes(r.trust) ? r.trust : "unverified"),
    status: (["pending", "approved", "rejected"].includes(r.status) ? r.status : "pending"),
    approved: toBool(r.approved), reviewedBy: r.reviewed_by ?? null, reviewNote: r.review_note ?? null,
    reviewedAt: r.reviewed_at ?? null, priceId: r.price_id ?? null, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function createSubmission(input: {
  merchantName: string; merchantContact?: string | null; storeName: string; city?: string | null;
  productName: string; brand?: string | null; unit?: string | null; barcode?: string | null;
  price: number; onSale?: boolean; saleNote?: string | null; validUntil?: string | null; note?: string | null;
}): PcPriceSubmission {
  const ts = now();
  const info = db().prepare(`INSERT INTO pc_price_submissions
    (merchant_name, merchant_contact, store_name, city, product_name, brand, unit, barcode, price, currency, on_sale, sale_note, valid_until, note, trust, status, approved, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    input.merchantName.trim(), input.merchantContact?.trim() || null, input.storeName.trim(), input.city?.trim() || null,
    input.productName.trim(), input.brand?.trim() || null, input.unit?.trim() || null, input.barcode?.trim() || null,
    num(input.price), "ILS", input.onSale ? 1 : 0, input.saleNote?.trim() || null, input.validUntil?.trim() || null,
    input.note?.trim() || null, "unverified", "pending", 0, ts, ts,
  );
  return getSubmission(Number(info.lastInsertRowid))!;
}
export function getSubmission(id: number): PcPriceSubmission | undefined {
  const r = db().prepare(`SELECT * FROM pc_price_submissions WHERE id = ?`).get(id);
  return r ? mapSubmission(r) : undefined;
}
export function listSubmissions(opts: { status?: string; limit?: number } = {}): PcPriceSubmission[] {
  const limit = opts.limit ?? 200;
  const rows = opts.status
    ? db().prepare(`SELECT * FROM pc_price_submissions WHERE status = ? ORDER BY id DESC LIMIT ?`).all(opts.status, limit)
    : db().prepare(`SELECT * FROM pc_price_submissions ORDER BY id DESC LIMIT ?`).all(limit);
  return (rows as any[]).map(mapSubmission);
}
export function countPendingSubmissions(): number {
  return (db().prepare(`SELECT COUNT(*) c FROM pc_price_submissions WHERE status = 'pending'`).get() as any).c as number;
}

/** Approve a submission: link/create a supplier store + product, upsert a
 *  supplier-tagged price, and mark the submission approved. */
export function approveSubmission(id: number, opts: { reviewedBy?: string; trust?: PcPriceSubmission["trust"]; reviewNote?: string } = {}): PcPriceSubmission | undefined {
  const sub = getSubmission(id);
  if (!sub || sub.status === "approved") return sub;
  // Supplier offers live on their own store rows so they never collide with the
  // official chain stores. Reuse by (name, city) within the supplier track.
  let store = db().prepare(`SELECT * FROM pc_stores WHERE name = ? AND IFNULL(city,'') = ? AND source_type = ?`).get(sub.storeName, sub.city || "", SUPPLIER) as any;
  const storeId = store ? Number(store.id) : createStore({ name: sub.storeName, city: sub.city || undefined, active: true, isSample: false, sourceType: SUPPLIER }).id;
  const product = upsertProductByCode({ barcode: sub.barcode, itemCode: null, name: sub.productName, brand: sub.brand, unit: sub.unit, categoryId: null });
  const { priceId } = upsertPrice({
    productId: product.id, storeId, price: sub.price, onSale: sub.onSale, saleNote: sub.saleNote,
    validUntil: sub.validUntil, source: "supplier", sourceType: SUPPLIER,
  });
  const ts = now();
  db().prepare(`UPDATE pc_price_submissions SET status='approved', approved=1, store_id=?, product_id=?, price_id=?, trust=?, reviewed_by=?, review_note=?, reviewed_at=?, updated_at=? WHERE id=?`).run(
    storeId, product.id, priceId, opts.trust ?? sub.trust, opts.reviewedBy || null, opts.reviewNote?.slice(0, 1000) || null, ts, ts, id,
  );
  return getSubmission(id);
}

export function rejectSubmission(id: number, opts: { reviewedBy?: string; reviewNote?: string } = {}): PcPriceSubmission | undefined {
  const sub = getSubmission(id);
  if (!sub) return undefined;
  // If it was previously approved, retract the supplier price it created.
  if (sub.approved && sub.priceId) {
    db().prepare(`DELETE FROM pc_prices WHERE id = ? AND source_type = ?`).run(sub.priceId, SUPPLIER);
  }
  const ts = now();
  db().prepare(`UPDATE pc_price_submissions SET status='rejected', approved=0, price_id=NULL, reviewed_by=?, review_note=?, reviewed_at=?, updated_at=? WHERE id=?`).run(
    opts.reviewedBy || null, opts.reviewNote?.slice(0, 1000) || null, ts, ts, id,
  );
  return getSubmission(id);
}

// ---------------------------------------------------------------------------
// Chain-kind registry helper.
//
// The regulatory/voluntary axis is derived from pc_feed_sources.source_kind,
// keyed by chain_id (see chainKindMap). Both the PUSH ingestion API and the
// voluntary self-submit feature need a feed-source row to exist for the chain
// they tag, so the comparison view classifies its offers correctly. This
// upserts that row by chain_id without disturbing an admin-managed source.
// ---------------------------------------------------------------------------
export function ensureChainKind(chainId: string, kind: PcChainKind, chainName?: string): PcFeedSource {
  const cid = String(chainId || "").trim();
  if (!cid) throw new Error("ensureChainKind: chainId is required");
  const existing = db().prepare(`SELECT * FROM pc_feed_sources WHERE chain_id = ?`).get(cid) as any;
  if (existing) {
    db().prepare(`UPDATE pc_feed_sources SET source_kind = ?, updated_at = ? WHERE id = ?`).run(normChainKind(kind), now(), existing.id);
    return getFeedSource(Number(existing.id))!;
  }
  return createFeedSource({
    chainName: (chainName || `רשת ${cid}`).trim(), chainId: cid, sourceKind: kind,
    sourceType: kind === VOLUNTARY ? "voluntary" : "manual", feedFormat: "xml",
    notes: kind === VOLUNTARY ? "נוצר אוטומטית עבור ספק וולונטרי / הגשה עצמית" : "נוצר אוטומטית דרך נתיב ה-ingest",
    verified: kind === VOLUNTARY, active: false,
  });
}

// ---------------------------------------------------------------------------
// Voluntary self-submit tokens (the per-store personalized upload link).
// ---------------------------------------------------------------------------
export interface PcVoluntaryToken {
  id: number;
  token: string;
  storeId: number | null;
  storeName: string;
  city: string | null;
  chainId: string | null;
  contactEmail: string | null;
  active: boolean;
  lastUploadAt: string | null;
  uploadCount: number;
  createdAt: string;
  updatedAt: string;
}
function mapVoluntaryToken(r: any): PcVoluntaryToken {
  return {
    id: r.id, token: r.token, storeId: r.store_id ?? null, storeName: r.store_name,
    city: r.city ?? null, chainId: r.chain_id ?? null, contactEmail: r.contact_email ?? null,
    active: toBool(r.active), lastUploadAt: r.last_upload_at ?? null, uploadCount: num(r.upload_count),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

/**
 * Create a voluntary upload token for a store. Provisions a dedicated voluntary
 * chain + store so submissions land on the distinct voluntary search path.
 * `token` must be supplied by the caller (crypto.randomBytes — never hard-coded).
 */
export function createVoluntaryToken(input: { token: string; storeName: string; city?: string | null; contactEmail?: string | null }): PcVoluntaryToken {
  const token = String(input.token || "").trim();
  if (!token) throw new Error("createVoluntaryToken: token is required");
  const storeName = String(input.storeName || "").trim();
  if (!storeName) throw new Error("createVoluntaryToken: storeName is required");
  const chainId = `vol-${token.slice(0, 16)}`;
  ensureChainKind(chainId, VOLUNTARY, storeName);
  const store = upsertStoreByCode({
    chainId, storeCode: token.slice(0, 16), name: storeName, branch: null,
    city: input.city || null, neighborhood: null,
  });
  const ts = now();
  const info = db().prepare(`INSERT INTO pc_voluntary_tokens (token, store_id, store_name, city, chain_id, contact_email, active, upload_count, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    token, store.id, storeName, input.city?.trim() || null, chainId, input.contactEmail?.trim() || null, 1, 0, ts, ts,
  );
  return getVoluntaryToken(Number(info.lastInsertRowid))!;
}
export function getVoluntaryToken(id: number): PcVoluntaryToken | undefined {
  const r = db().prepare(`SELECT * FROM pc_voluntary_tokens WHERE id = ?`).get(id);
  return r ? mapVoluntaryToken(r) : undefined;
}
export function getVoluntaryTokenByToken(token: string): PcVoluntaryToken | undefined {
  const r = db().prepare(`SELECT * FROM pc_voluntary_tokens WHERE token = ?`).get(String(token || "").trim());
  return r ? mapVoluntaryToken(r) : undefined;
}
export function listVoluntaryTokens(): PcVoluntaryToken[] {
  return (db().prepare(`SELECT * FROM pc_voluntary_tokens ORDER BY id DESC`).all() as any[]).map(mapVoluntaryToken);
}
export function setVoluntaryTokenActive(id: number, active: boolean): PcVoluntaryToken | undefined {
  const cur = getVoluntaryToken(id);
  if (!cur) return undefined;
  db().prepare(`UPDATE pc_voluntary_tokens SET active = ?, updated_at = ? WHERE id = ?`).run(active ? 1 : 0, now(), id);
  return getVoluntaryToken(id);
}
export function markVoluntaryUpload(id: number): void {
  db().prepare(`UPDATE pc_voluntary_tokens SET last_upload_at = ?, upload_count = upload_count + 1, updated_at = ? WHERE id = ?`).run(now(), now(), id);
}

// ---------------------------------------------------------------------------
// Seed sample data once (only if completely empty) so links open real pages.
// ---------------------------------------------------------------------------
function seedIfEmpty() {
  const count = (db().prepare(`SELECT COUNT(*) AS c FROM pc_products`).get() as any).c as number;
  if (count > 0) return;

  const catNames = ["מוצרי חלב", "ירקות ופירות", "מאפים ולחם", "שימורים ויבשים", "ניקיון", "תינוקות"];
  const catIds: number[] = catNames.map((n, i) => createCategory({ name: n, sortOrder: i }).id);

  const storeDefs = [
    { name: "רמי לוי", branch: "סניף ראשי", city: "ירושלים" },
    { name: "שופרסל", branch: "דיל", city: "בני ברק" },
    { name: "ויקטורי", branch: "סניף שכונתי", city: "בית שמש" },
    { name: "אושר עד", branch: "מרכז", city: "מודיעין עילית" },
  ];
  const storeIds = storeDefs.map((s) => createStore({ ...s, isSample: true }).id);

  const productDefs: { name: string; brand?: string; unit?: string; cat: number; base: number }[] = [
    { name: "חלב 3% תנובה", brand: "תנובה", unit: "ליטר", cat: 0, base: 6.9 },
    { name: "גבינה לבנה 5%", brand: "תנובה", unit: "250 גרם", cat: 0, base: 5.5 },
    { name: "ביצים L", brand: "", unit: "תריסר", cat: 0, base: 12.9 },
    { name: "עגבניות", brand: "", unit: 'ק"ג', cat: 1, base: 6.5 },
    { name: "מלפפונים", brand: "", unit: 'ק"ג', cat: 1, base: 5.9 },
    { name: "תפוחים", brand: "", unit: 'ק"ג', cat: 1, base: 8.9 },
    { name: "לחם אחיד פרוס", brand: "", unit: "יחידה", cat: 2, base: 7.2 },
    { name: "חלה מתוקה", brand: "", unit: "יחידה", cat: 2, base: 12.0 },
    { name: "טונה במים", brand: "סטארקיסט", unit: "5 יח'", cat: 3, base: 24.9 },
    { name: "אורז בסמטי", brand: "", unit: 'ק"ג', cat: 3, base: 11.5 },
    { name: "נוזל כלים", brand: "פיירי", unit: "ליטר", cat: 4, base: 14.9 },
    { name: "טיטולים שלב 4", brand: "האגיס", unit: "מארז", cat: 5, base: 49.9 },
  ];

  for (const pd of productDefs) {
    const prod = createProduct({ categoryId: catIds[pd.cat], name: pd.name, brand: pd.brand, unit: pd.unit, isSample: true });
    storeIds.forEach((storeId, idx) => {
      // deterministic spread around base so comparison is meaningful
      const delta = ((idx - 1.5) * 0.6) + (pd.name.length % 3) * 0.3;
      const price = Math.max(1, Math.round((pd.base + delta) * 10) / 10);
      const onSale = idx === 2 && pd.cat % 2 === 0;
      createPrice({
        productId: prod.id,
        storeId,
        price,
        onSale,
        saleNote: onSale ? "מבצע השבוע" : undefined,
      });
    });
  }

  createPromotion({ storeId: storeIds[0], title: "מבצע סוף שבוע על מוצרי חלב", description: "הנחות על מבחר מוצרי חלב נבחרים." });
  createPromotion({ storeId: storeIds[2], title: "ירקות ופירות במחירי עלות", description: "סבסוד שכונתי לקראת החג." });
}

// Registry of well-known Israeli price-transparency chains. Seeded INACTIVE and
// UNVERIFIED — no source URLs are hard-coded. An admin adds a verified URL and
// enables the source from the admin UI; no code change is needed to go live.
function seedFeedSourcesIfEmpty() {
  const count = (db().prepare(`SELECT COUNT(*) AS c FROM pc_feed_sources`).get() as any).c as number;
  if (count > 0) return;
  for (const p of KNOWN_FEED_SOURCES) {
    createFeedSource({ ...p, feedFormat: "gz", verified: false, active: false });
  }
}

// Registry of known Israeli price-transparency chains used by both the in-app
// seed and the standalone seed script (script/pc-seed-feeds.ts). Adapters map
// to the discovery logic in script/pc-daily-import.ts. All seeded INACTIVE +
// UNVERIFIED — an admin enables a source only after the adapter imports a real
// file. discoveryUrl is the public listing page when publicly known.
export const KNOWN_FEED_SOURCES: Array<Partial<PcFeedSource> & { chainName: string }> = [
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
