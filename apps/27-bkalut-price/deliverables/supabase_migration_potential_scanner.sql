-- Migration: Potential rights scanner (profile-based eligibility hinting).
--
-- This adds the two tables used by the public /#/potential flow and the
-- admin /#/potential-admin page. The dynamic config (sections + rules) lives
-- inside automation_configs (key='potential_scanner', config_json blob), so
-- no separate config table is needed.
--
-- Safe to run multiple times — uses IF NOT EXISTS everywhere.

CREATE TABLE IF NOT EXISTS potential_links (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  presets_json TEXT NOT NULL DEFAULT '{}',
  hidden_sections_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS potential_submissions (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT,
  profile_json TEXT NOT NULL DEFAULT '{}',
  suggestions_json TEXT NOT NULL DEFAULT '[]',
  selected_ids_json TEXT NOT NULL DEFAULT '[]',
  contact_consent INTEGER NOT NULL DEFAULT 0,
  contact_full_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_id_number TEXT,
  legal_accepted_json TEXT NOT NULL DEFAULT '{}',
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_log_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

-- Seed the automation_configs row that the server reads/writes for
-- enable/disable + dynamic config (sections + matching rules).
INSERT INTO automation_configs (key, label, description, enabled, endpoint_url, secret_ref, config_json, last_status, last_tested_at, last_result, updated_at)
SELECT
  'potential_scanner',
  'סורק פוטנציאל זכויות (שאלון פרופיל)',
  'שאלון פרופיל אישי ציבורי שמציע אילו זכויות שווה לבדוק. ניתן להפעיל/לכבות, לערוך סעיפים, אפשרויות וכללי מיפוי, ולהפיק קישורים מותאמים אישית.',
  1,
  '',
  '',
  '{"enabled":true}',
  'idle',
  NULL,
  NULL,
  NOW()::text
WHERE NOT EXISTS (SELECT 1 FROM automation_configs WHERE key = 'potential_scanner');
