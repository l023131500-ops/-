-- Migration: Health-Fund Comparison module (standalone).
--
-- Adds the `hf_*` tables used by the public /#/health-funds site and the
-- admin /#/health-funds-admin management area ("השוואת קופות חולים מבית בקלות").
-- This module is fully separate from the rights database, the price-comparison
-- module and the financial CRM — nothing here references rights, pc_* or
-- fin_* tables.
--
-- Public catalog numbering starts at 500 (catalog_no) so it slots cleanly
-- after the existing rights database and the n8n automation can route
-- callbacks by number exactly the way the rights DB does.
--
-- Safe to run multiple times — uses IF NOT EXISTS everywhere.

CREATE TABLE IF NOT EXISTS hf_topics (
  id BIGSERIAL PRIMARY KEY,
  catalog_no INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'fund',          -- fund | gov
  category TEXT NOT NULL DEFAULT '',
  sub_category TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT '',
  benefit_summary TEXT NOT NULL DEFAULT '',
  range_text TEXT NOT NULL DEFAULT '',
  range_min DOUBLE PRECISION,
  range_max DOUBLE PRECISION,
  best_fund TEXT NOT NULL DEFAULT '',
  public_site_text TEXT NOT NULL DEFAULT '',
  treating_body TEXT NOT NULL DEFAULT '',
  full_benefit TEXT NOT NULL DEFAULT '',
  conditions TEXT NOT NULL DEFAULT '',
  qualifying_cases TEXT NOT NULL DEFAULT '',
  preparation TEXT NOT NULL DEFAULT '',
  documents TEXT NOT NULL DEFAULT '',
  how_to_apply TEXT NOT NULL DEFAULT '',
  official_links TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  ai_search TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hf_tiers (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL,
  col INTEGER NOT NULL DEFAULT 0,
  fund TEXT NOT NULL DEFAULT '',
  fund_key TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL DEFAULT '',
  prog TEXT NOT NULL DEFAULT '',
  value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hf_requests (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT,
  catalog_no INTEGER,
  topic TEXT,
  request_type TEXT NOT NULL DEFAULT 'info',   -- info | reminder | treatment
  full_name TEXT,
  phone TEXT,
  email TEXT,
  note TEXT,
  channel TEXT NOT NULL DEFAULT 'web',
  webhook_status TEXT,
  webhook_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hf_tiers_topic    ON hf_tiers(topic_id);
CREATE INDEX IF NOT EXISTS idx_hf_topics_catalog ON hf_topics(catalog_no);
CREATE INDEX IF NOT EXISTS idx_hf_topics_kind    ON hf_topics(kind);
