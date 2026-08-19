-- =============================================================================
-- Bkalut — Row Level Security (RLS) for the Health-Fund Comparison (hf_*) module.
--
-- Purpose:
--   The Supabase advisory shows RLS disabled on new public tables. The hf_*
--   tables are written/read only by the Express backend using the Supabase
--   service_role key. The public site reads/submits exclusively through the
--   app's HTTP API (/api/hf/public/*), never via direct PostgREST/anon access.
--
--   Enabling RLS without anon/authenticated policies closes off direct
--   anon/auth access while leaving service_role untouched: Postgres bypasses
--   RLS for service_role by design. This matches the existing posture in
--   supabase_rls_price_comparison_and_community.sql.
--
-- Safety:
--   * Additive only — does NOT drop or alter any data.
--   * service_role continues to work unchanged (used by the backend).
--   * No permissive anon/authenticated policies are created. Deny-by-default.
--   * FORCE ROW LEVEL SECURITY is intentionally NOT applied.
--   * Idempotent — re-running is safe.
--
-- Apply:
--   In the Supabase SQL Editor run the whole file once, after the
--   supabase_migration_health_funds.sql migration has been applied.
-- =============================================================================

ALTER TABLE IF EXISTS public.hf_topics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hf_tiers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hf_requests ENABLE ROW LEVEL SECURITY;
