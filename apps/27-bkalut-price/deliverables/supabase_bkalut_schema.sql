-- =============================================================================
-- Bkalut — Supabase / Postgres schema for the FULL feature set.
--
-- Run in Supabase SQL editor (or `supabase db push`). Re-runnable: every
-- statement uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so applying it on
-- an already-migrated project will not destroy data.
--
-- Tables covered:
--   users, clients, service_submissions, app_users, user_sessions,
--   premium_requests, webhook_log, delivery_queue, automation_configs,
--   admin_sessions, legal_acceptances,
--   fin_clients, fin_categories, fin_budgets, fin_transactions, fin_recurring,
--   fin_opportunities, fin_leads, fin_tips, fin_debts, fin_goals, fin_alerts,
--   fin_plans, fin_notes,
--   inbound_leads        (new — public webhook landing table for external sites).
-- Plus the `service_submission_rows` view used by the admin submissions screen.
-- =============================================================================

-- ---------- Legacy template users -------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- ---------- Lead-style clients (consumers of rights) ------------------------
CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  id_number TEXT,
  birth_date TEXT,
  city TEXT,
  family_status TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ---------- Rights service submissions --------------------------------------
CREATE TABLE IF NOT EXISTS service_submissions (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  right_id BIGINT NOT NULL,
  topic TEXT NOT NULL,
  category TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'info',
  potential_percent INTEGER NOT NULL,
  potential_level TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  details_json TEXT NOT NULL,
  documents_json TEXT NOT NULL,
  additional_topics_json TEXT NOT NULL,
  terms_accepted INTEGER NOT NULL DEFAULT 0,
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_response TEXT,
  webhook_sent_at TEXT,
  created_at TEXT NOT NULL
);
ALTER TABLE service_submissions ADD COLUMN IF NOT EXISTS webhook_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE service_submissions ADD COLUMN IF NOT EXISTS webhook_response TEXT;
ALTER TABLE service_submissions ADD COLUMN IF NOT EXISTS webhook_sent_at TEXT;

-- ---------- App / managed users (real login users) --------------------------
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  username TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT,
  password_plain TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  product_access_json TEXT NOT NULL DEFAULT '[]',
  plan TEXT NOT NULL DEFAULT 'basic',
  fin_client_id BIGINT,
  notes TEXT,
  last_login_at TEXT,
  credentials_delivered_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Migrate older app_users rows missing these columns.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_plain TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS fin_client_id BIGINT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS credentials_delivered_at TEXT;

-- ---------- User sessions (financial-client login) --------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);

-- ---------- Premium upgrade requests ----------------------------------------
CREATE TABLE IF NOT EXISTS premium_requests (
  id BIGSERIAL PRIMARY KEY,
  app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL
);

-- ---------- Webhook delivery log --------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_log (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  related_kind TEXT,
  related_id BIGINT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  response_text TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  next_retry_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_log_created_at ON webhook_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_status ON webhook_log(status);

-- ---------- Outbound delivery / credential queue ----------------------------
CREATE TABLE IF NOT EXISTS delivery_queue (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id BIGINT,
  recipient_label TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  callback_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  status_detail TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  endpoint_used TEXT,
  response_text TEXT,
  scheduled_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

-- ---------- Automation connector configs ------------------------------------
CREATE TABLE IF NOT EXISTS automation_configs (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  endpoint_url TEXT,
  secret_ref TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  last_status TEXT,
  last_tested_at TEXT,
  last_result TEXT,
  updated_at TEXT NOT NULL
);

-- ---------- Admin sessions --------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  identity TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- ---------- Legal acceptances -----------------------------------------------
CREATE TABLE IF NOT EXISTS legal_acceptances (
  id BIGSERIAL PRIMARY KEY,
  document_key TEXT NOT NULL,
  document_version TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id BIGINT,
  full_name TEXT,
  identifier TEXT,
  signature_method TEXT NOT NULL DEFAULT 'checkbox',
  signature_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_subject ON legal_acceptances(subject_kind, subject_id);

-- ============================================================================
-- Financial management domain
-- ============================================================================

CREATE TABLE IF NOT EXISTS fin_clients (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  mode TEXT NOT NULL DEFAULT 'household',
  family_size INTEGER,
  city TEXT,
  monthly_income INTEGER,
  coach_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Re-runnable upgrade: add coach_id on environments where fin_clients was
-- created before the financial-coaches assignment feature shipped.
ALTER TABLE fin_clients
  ADD COLUMN IF NOT EXISTS coach_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_fin_clients_coach_id ON fin_clients(coach_id);

CREATE TABLE IF NOT EXISTS fin_categories (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES fin_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'expense',
  color TEXT,
  icon TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_budgets (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES fin_categories(id) ON DELETE CASCADE,
  monthly_limit INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_transactions (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES fin_categories(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'expense',
  amount INTEGER NOT NULL,
  description TEXT,
  occurred_on TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fin_tx_client ON fin_transactions(client_id);

CREATE TABLE IF NOT EXISTS fin_recurring (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount INTEGER,
  kind TEXT NOT NULL DEFAULT 'reminder',
  category_id BIGINT REFERENCES fin_categories(id) ON DELETE SET NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  next_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_opportunities (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES fin_clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  topic TEXT,
  category TEXT,
  right_id BIGINT,
  estimated_yearly_value INTEGER,
  status TEXT NOT NULL DEFAULT 'new',
  recommendation TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_leads (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  mode TEXT,
  message TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_response TEXT,
  webhook_sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_tips (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_debts (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  creditor TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'loan',
  original_amount INTEGER,
  current_balance INTEGER NOT NULL,
  monthly_payment INTEGER,
  interest_rate INTEGER,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_goals (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  saved_amount INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  monthly_contribution INTEGER,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_alerts (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  source TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_plans (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  steps_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  premium INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fin_notes (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES fin_clients(id) ON DELETE CASCADE,
  author_role TEXT NOT NULL DEFAULT 'admin',
  title TEXT,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'both',
  created_at TEXT NOT NULL
);

-- ============================================================================
-- Inbound leads — external sites POST to /api/inbound/leads, server persists
-- here and fans out to the configured n8n endpoint.
-- ============================================================================
CREATE TABLE IF NOT EXISTS inbound_leads (
  id BIGSERIAL PRIMARY KEY,
  source_site TEXT,
  source_page TEXT,
  origin TEXT,
  category TEXT,
  topic TEXT,
  request_type TEXT,
  selected_path TEXT,
  potential_score INTEGER,
  potential_level TEXT,
  contact_full_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  contact_id_number TEXT,
  answers_json TEXT NOT NULL DEFAULT '{}',
  documents_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  legal_accepted_json TEXT NOT NULL DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  external_id TEXT,
  lead_kind TEXT NOT NULL DEFAULT 'rights',  -- rights | financial | other
  raw_payload_json TEXT NOT NULL DEFAULT '{}',
  auth_status TEXT NOT NULL DEFAULT 'unauthenticated', -- authenticated | unauthenticated | rejected
  webhook_status TEXT NOT NULL DEFAULT 'pending',
  webhook_log_id BIGINT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inbound_leads_created_at ON inbound_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_leads_external_id ON inbound_leads(external_id);

-- ============================================================================
-- View: service_submission_rows  (joined view used by admin UI)
-- ============================================================================
CREATE OR REPLACE VIEW service_submission_rows AS
SELECT
  s.id                                AS id,
  s.created_at                        AS "createdAt",
  s.client_id                         AS "clientId",
  c.full_name                         AS "fullName",
  c.phone                             AS phone,
  COALESCE(c.email, '')               AS email,
  COALESCE(c.id_number, '')           AS "idNumber",
  COALESCE(c.birth_date, '')          AS "birthDate",
  COALESCE(c.family_status, '')       AS "familyStatus",
  COALESCE(c.city, '')                AS city,
  s.right_id                          AS "rightId",
  s.topic                             AS topic,
  s.category                          AS category,
  s.request_type                      AS "requestType",
  s.potential_percent                 AS "potentialPercent",
  s.potential_level                   AS "potentialLevel",
  s.answers_json                      AS "answersJson",
  s.details_json                      AS "detailsJson",
  s.documents_json                    AS "documentsJson",
  s.additional_topics_json            AS "additionalTopicsJson",
  s.webhook_status                    AS "webhookStatus",
  COALESCE(s.webhook_response, '')    AS "webhookResponse",
  COALESCE(s.webhook_sent_at, '')     AS "webhookSentAt"
FROM service_submissions s
JOIN clients c ON c.id = s.client_id
ORDER BY s.id DESC;

-- ============================================================================
-- Row Level Security
--
-- The server uses the service-role key, which bypasses RLS, so policies here
-- are optional defense-in-depth. We enable RLS on tables that *might* be
-- exposed to anon/authenticated keys and explicitly deny by default — service
-- role still works. If you decide to expose anon access, add SELECT/INSERT
-- policies for the specific tables/rows you want.
-- ============================================================================
ALTER TABLE inbound_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
-- No explicit policies => no anon/authenticated access; service-role bypasses.

-- =============================================================================
-- Done.
-- =============================================================================
