-- =============================================================================
-- Bkalut — Row Level Security (RLS) for potential scanner tables.
--
-- Purpose:
--   The Supabase advisory shows RLS disabled on `potential_links` and
--   `potential_submissions`. These tables are written/read only by the
--   Express backend (service_role key). Enabling RLS without anon policies
--   closes off direct anon/auth access while leaving service_role untouched
--   (Postgres bypasses RLS for service_role by design).
--
-- Safety:
--   * Additive only — does not drop/alter data.
--   * service_role continues to work unchanged.
--   * No permissive anon policies are created. Deny-by-default posture.
--   * FORCE ROW LEVEL SECURITY is intentionally NOT applied so the backend
--     (service_role) keeps working without policy churn.
--
-- Apply:
--   In Supabase SQL Editor (project ref: bieebmnmkffwbqlsfozh) run the whole
--   file. Idempotent — re-running is safe.
--
-- IMPORTANT: Do not apply from a subagent. The main agent / user will run
-- this after review.
-- =============================================================================

ALTER TABLE IF EXISTS public.potential_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.potential_submissions ENABLE ROW LEVEL SECURITY;

-- (Intentionally no permissive anon/authenticated policies.)
-- service_role bypasses RLS automatically.

-- Verification:
--   select tablename, rowsecurity from pg_tables
--   where schemaname='public'
--     and tablename in ('potential_links','potential_submissions');
--   Both rows should report rowsecurity = true.
