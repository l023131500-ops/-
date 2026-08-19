-- =============================================================================
-- Bkalut — Row Level Security (RLS) for the Price Comparison (pc_*) and
-- Community Gabbai Questionnaire (community_*) modules.
--
-- Purpose:
--   The Supabase advisory shows RLS disabled on the new pc_* and community_*
--   tables. These tables are written/read only by the Express backend using
--   the Supabase service_role key. The public sites read/submit exclusively
--   through the app's HTTP API (/api/pc/public/* and /api/public/community/*),
--   never via direct PostgREST/anon table access.
--
--   Enabling RLS without anon/authenticated policies closes off direct
--   anon/auth access while leaving service_role untouched: Postgres bypasses
--   RLS for service_role by design. This matches the existing posture in
--   supabase_rls_potential_scanner.sql and supabase_rls_financial_tables.sql.
--
-- Safety:
--   * Additive only — does NOT drop or alter any data.
--   * service_role continues to work unchanged (used by the backend).
--   * No permissive anon/authenticated policies are created. Deny-by-default.
--   * Public reads are NOT granted at the table level — they go through the
--     app API, so anon direct access stays closed.
--   * FORCE ROW LEVEL SECURITY is intentionally NOT applied, so the backend
--     (service_role) keeps working without any policy churn.
--   * Idempotent — re-running is safe (ENABLE on an already-enabled table is
--     a no-op).
--
-- Apply:
--   In the Supabase SQL Editor (project ref: bieebmnmkffwbqlsfozh) run the
--   whole file once. The parent agent / user applies this after review.
--
-- IMPORTANT: Do not apply from a subagent. The main agent / user will run
-- this after review.
-- =============================================================================

-- ---- Price Comparison module -------------------------------------------------
ALTER TABLE IF EXISTS public.pc_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_stores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_prices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_promotions  ENABLE ROW LEVEL SECURITY;

-- ETL foundation tables (admin/backend only — never read by anon directly).
ALTER TABLE IF EXISTS public.pc_feed_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_import_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_import_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_price_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_product_aliases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_search_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pc_automation_logs  ENABLE ROW LEVEL SECURITY;
-- Supplier-submitted prices (backend-only; submissions arrive via the app API).
ALTER TABLE IF EXISTS public.pc_price_submissions ENABLE ROW LEVEL SECURITY;

-- ---- Community Gabbai Questionnaire module -----------------------------------
ALTER TABLE IF EXISTS public.community_questionnaires            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_questions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_questionnaire_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_questionnaire_submissions ENABLE ROW LEVEL SECURITY;

-- (Intentionally no permissive anon/authenticated policies.)
-- service_role bypasses RLS automatically; the public sites use the app API.

-- Verification:
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--     and tablename in (
--       'pc_categories','pc_stores','pc_products','pc_prices','pc_promotions',
--       'pc_feed_sources','pc_import_jobs','pc_import_logs','pc_price_history',
--       'pc_product_aliases','pc_search_requests','pc_automation_logs',
--       'pc_price_submissions',
--       'community_questionnaires','community_questions',
--       'community_questionnaire_links','community_questionnaire_submissions'
--     )
--   order by tablename;
--   Every row should report rowsecurity = true.
