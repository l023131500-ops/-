-- =============================================================================
-- Bkalut — Row Level Security (RLS) for financial tables.
--
-- Purpose:
--   The Supabase advisory shows RLS disabled on 13 fin_* tables. The backend
--   uses the service_role key only (server-side; bypasses RLS), and the
--   frontend MUST go through the Express API at /api/* — it never talks to
--   Supabase directly with the anon key. Enabling RLS without anon policies
--   therefore closes anon/auth direct access while leaving server-side
--   (service_role) access untouched.
--
-- Safety:
--   * Additive only. No table is dropped or altered destructively.
--   * No data is deleted.
--   * service_role bypasses RLS by Postgres design, so the Express backend
--     continues to work unchanged.
--   * No broad anon policies are created. A locked-down "deny by default"
--     posture is achieved by enabling RLS with zero permissive policies.
--   * `FORCE ROW LEVEL SECURITY` is intentionally NOT applied — that would
--     restrict service_role too, which would break the backend.
--
-- Frontend note:
--   The browser MUST NOT use the Supabase anon key directly against fin_*
--   tables. All financial reads/writes go through Express routes that hold
--   the service_role key server-side. If you ever need direct client access,
--   add explicit `USING (auth.uid()::text = app_user_id::text)` style
--   policies — never `USING (true)` for anon.
--
-- How to apply:
--   1. Review this file.
--   2. In Supabase SQL Editor (project ref: bieebmnmkffwbqlsfozh) run the
--      whole file. It is idempotent — re-running is safe.
--   3. Confirm with: select tablename, rowsecurity from pg_tables
--      where schemaname='public' and tablename like 'fin_%';
--      All 13 rows should report rowsecurity = true.
--
-- IMPORTANT: Do not apply this from a subagent. The main agent will apply
-- after review.
-- =============================================================================

-- The 13 financial tables flagged by the advisory.
-- ENABLE RLS one by one so a failure on one table doesn't roll the rest back.
ALTER TABLE IF EXISTS public.fin_clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_budgets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_recurring      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_opportunities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_tips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_debts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_goals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fin_notes          ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Deny-by-default policy posture for anon + authenticated roles.
--
-- Why explicit policies at all if "no policy = no access"?
--   Postgres semantics: when RLS is enabled and *no policies exist*, all
--   non-bypassing roles get zero rows. That is exactly what we want for anon
--   and authenticated, but Supabase's policy-linter often warns about
--   "RLS enabled but no policy". The explicit `USING (false)` policies below
--   silence the linter, make intent unambiguous in code review, and make it
--   harder to accidentally widen access by adding a permissive policy later.
--
-- service_role is unaffected — Postgres BYPASSES RLS for that role.
-- =============================================================================

DO $do$
DECLARE
  t text;
  tables text[] := ARRAY[
    'fin_clients','fin_categories','fin_budgets','fin_transactions',
    'fin_recurring','fin_opportunities','fin_leads','fin_tips',
    'fin_debts','fin_goals','fin_alerts','fin_plans','fin_notes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip tables that don't exist (defensive — older projects).
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t
    ) THEN
      CONTINUE;
    END IF;

    -- Drop any previous bkalut deny policies before recreating (idempotent).
    EXECUTE format('DROP POLICY IF EXISTS bkalut_deny_anon ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS bkalut_deny_auth ON public.%I', t);

    -- Deny anon entirely.
    EXECUTE format(
      'CREATE POLICY bkalut_deny_anon ON public.%I '
      'AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)',
      t
    );

    -- Deny authenticated (Supabase Auth users) entirely too.
    -- The bkalut app does not use Supabase Auth for end-users — login goes
    -- through the Express /api/user/login route, which talks to Postgres
    -- via service_role. So `authenticated` should have no direct access
    -- either. If/when Supabase Auth is adopted, replace this with a per-row
    -- policy like USING (auth.uid()::text = app_user_id::text).
    EXECUTE format(
      'CREATE POLICY bkalut_deny_auth ON public.%I '
      'AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false)',
      t
    );
  END LOOP;
END
$do$;

-- =============================================================================
-- Verification queries (run manually after applying):
--
--   -- 1. RLS on all 13 tables:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname='public' AND tablename LIKE 'fin_%'
--   ORDER BY tablename;
--
--   -- 2. Policies present:
--   SELECT tablename, policyname, permissive, roles, qual
--   FROM pg_policies
--   WHERE schemaname='public' AND tablename LIKE 'fin_%'
--   ORDER BY tablename, policyname;
--
--   -- 3. Confirm backend still works:
--   curl -s http://localhost:5000/api/admin/financial/clients -H "Authorization: Bearer <admin-token>"
--   should still return data (service_role bypasses RLS).
-- =============================================================================
