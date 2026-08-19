-- Migration: Price Comparison module (standalone).
--
-- Adds the `pc_*` tables used by the public /#/price-comparison site and the
-- admin /#/price-comparison-admin management area. This module is fully
-- separate from the rights database and the financial CRM — nothing here
-- references rights or fin_* tables.
--
-- Safe to run multiple times — uses IF NOT EXISTS everywhere.

CREATE TABLE IF NOT EXISTS pc_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pc_stores (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  branch TEXT,
  city TEXT,
  logo_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pc_products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT,
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
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  store_id BIGINT NOT NULL,
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  on_sale INTEGER NOT NULL DEFAULT 0,
  sale_note TEXT,
  valid_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pc_promotions (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- ETL foundation tables (feed sources, import jobs/logs, price history,
-- product aliases, search requests, automation logs). Added alongside the
-- original catalog tables above; still fully separate from rights/fin_*.
-- ---------------------------------------------------------------------------

-- Additive columns on the original tables (safe re-run). The SQLite runtime
-- adds these via ensureColumn(); Postgres uses ADD COLUMN IF NOT EXISTS.
ALTER TABLE pc_stores   ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE pc_stores   ADD COLUMN IF NOT EXISTS chain_id TEXT;
ALTER TABLE pc_stores   ADD COLUMN IF NOT EXISTS store_code TEXT;
-- is_sample: 1 marks demo/sample rows that the public site hides unless the
-- admin explicitly enables "show sample data". Imported (real) rows are 0.
ALTER TABLE pc_stores   ADD COLUMN IF NOT EXISTS is_sample INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pc_products ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE pc_products ADD COLUMN IF NOT EXISTS is_sample INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pc_prices   ADD COLUMN IF NOT EXISTS unit_price DOUBLE PRECISION;
ALTER TABLE pc_prices   ADD COLUMN IF NOT EXISTS unit_of_measure TEXT;
ALTER TABLE pc_prices   ADD COLUMN IF NOT EXISTS source TEXT;   -- import | manual | seed | supplier
-- Two-track labelling. 'official_feed' = mandatory published chain prices,
-- 'supplier_submitted' = approved business-submitted offers. Existing rows are
-- official feed (the only track that existed before this migration).
ALTER TABLE pc_stores   ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'official_feed';
ALTER TABLE pc_prices   ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'official_feed';

-- A registry of price-transparency feed sources. Inactive + unverified by
-- default — an admin must add a verified URL and enable it before import.
CREATE TABLE IF NOT EXISTS pc_feed_sources (
  id BIGSERIAL PRIMARY KEY,
  chain_name TEXT NOT NULL,
  chain_id TEXT,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',   -- gov_il | publishprice | cerberus | url | manual
  feed_format TEXT NOT NULL DEFAULT 'xml',       -- xml | gz | json
  feed_kinds TEXT,                               -- comma list: Stores,PriceFull,PromoFull
  auth_user TEXT,
  notes TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 0,
  last_status TEXT,
  last_run_at TEXT,
  last_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Adapter + discovery metadata (added for the live daily importer). The
-- standalone script (script/pc-daily-import.ts) reads these to pick the right
-- adapter and remember the last directly-importable file URL it discovered.
ALTER TABLE pc_feed_sources ADD COLUMN IF NOT EXISTS adapter TEXT;            -- shufersal | cerberus | nibit | matrix | url | openisrael
ALTER TABLE pc_feed_sources ADD COLUMN IF NOT EXISTS direct_file_url TEXT;    -- a single GZ/XML URL inferred by discovery
ALTER TABLE pc_feed_sources ADD COLUMN IF NOT EXISTS discovery_url TEXT;      -- listing page to scrape for file links
ALTER TABLE pc_feed_sources ADD COLUMN IF NOT EXISTS max_files_per_run INTEGER NOT NULL DEFAULT 10;
ALTER TABLE pc_feed_sources ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE pc_feed_sources ADD COLUMN IF NOT EXISTS last_success_at TEXT;

CREATE TABLE IF NOT EXISTS pc_import_jobs (
  id BIGSERIAL PRIMARY KEY,
  feed_source_id BIGINT,
  trigger TEXT NOT NULL DEFAULT 'manual',        -- manual | cron | upload
  kind TEXT,                                     -- Stores | PriceFull | PromoFull | mixed
  status TEXT NOT NULL DEFAULT 'running',        -- running | ok | error
  stores_upserted INTEGER NOT NULL DEFAULT 0,
  products_upserted INTEGER NOT NULL DEFAULT 0,
  prices_upserted INTEGER NOT NULL DEFAULT 0,
  promotions_upserted INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  raw_meta TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  message TEXT
);

CREATE TABLE IF NOT EXISTS pc_import_logs (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',            -- info | warn | error
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- File-hash dedupe ledger: one row per (feed, file URL, content hash) so a
-- daily run skips files it has already imported and never wipes existing data.
CREATE TABLE IF NOT EXISTS pc_import_files (
  id BIGSERIAL PRIMARY KEY,
  feed_source_id BIGINT,
  job_id BIGINT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  content_hash TEXT NOT NULL,
  byte_size BIGINT,
  kind TEXT,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS pc_import_files_hash_idx ON pc_import_files (content_hash);
CREATE INDEX IF NOT EXISTS pc_import_files_feed_idx ON pc_import_files (feed_source_id);

CREATE TABLE IF NOT EXISTS pc_price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  store_id BIGINT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  on_sale INTEGER NOT NULL DEFAULT 0,
  source TEXT,                                   -- import | manual
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pc_product_aliases (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'barcode',    -- barcode | item_code | chain_code
  alias_value TEXT NOT NULL,
  chain_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pc_search_requests (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'web',           -- web | voice | email | whatsapp | n8n | api
  query TEXT,
  filters_json TEXT,
  result_count INTEGER NOT NULL DEFAULT 0,
  best_price DOUBLE PRECISION,
  best_store TEXT,
  contact TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pc_automation_logs (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  query TEXT,
  payload_json TEXT,
  endpoint TEXT,
  status INTEGER NOT NULL DEFAULT 0,
  response TEXT,
  created_at TEXT NOT NULL
);

-- Supplier / business-submitted prices (the second track). Raw submissions land
-- here as 'pending' and are NEVER shown publicly until an admin approves them;
-- on approval they are upserted into pc_prices with source_type='supplier_submitted'.
-- The mandatory official comparison only uses source_type='official_feed' rows.
CREATE TABLE IF NOT EXISTS pc_price_submissions (
  id BIGSERIAL PRIMARY KEY,
  merchant_name TEXT NOT NULL,
  merchant_contact TEXT,
  store_id BIGINT,
  store_name TEXT NOT NULL,
  city TEXT,
  product_id BIGINT,
  product_name TEXT NOT NULL,
  brand TEXT,
  unit TEXT,
  barcode TEXT,
  price DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  on_sale INTEGER NOT NULL DEFAULT 0,
  sale_note TEXT,
  valid_until TEXT,
  note TEXT,
  trust TEXT NOT NULL DEFAULT 'unverified',   -- unverified | verified | trusted
  status TEXT NOT NULL DEFAULT 'pending',     -- pending | approved | rejected
  approved INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT,
  review_note TEXT,
  reviewed_at TEXT,
  price_id BIGINT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pc_price_submissions_status_idx ON pc_price_submissions (status);

CREATE INDEX IF NOT EXISTS pc_products_category_idx ON pc_products (category_id);
CREATE INDEX IF NOT EXISTS pc_products_barcode_idx ON pc_products (barcode);
CREATE INDEX IF NOT EXISTS pc_prices_product_idx ON pc_prices (product_id);
CREATE INDEX IF NOT EXISTS pc_prices_store_idx ON pc_prices (store_id);
CREATE INDEX IF NOT EXISTS pc_price_history_product_idx ON pc_price_history (product_id);
CREATE INDEX IF NOT EXISTS pc_aliases_value_idx ON pc_product_aliases (alias_value);
CREATE INDEX IF NOT EXISTS pc_import_logs_job_idx ON pc_import_logs (job_id);
CREATE INDEX IF NOT EXISTS pc_feed_sources_active_idx ON pc_feed_sources (active);
