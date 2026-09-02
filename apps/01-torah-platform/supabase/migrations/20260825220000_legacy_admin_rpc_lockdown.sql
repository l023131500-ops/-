-- public.app_users / public.admin_sessions are a pre-Supabase-Auth admin
-- login mechanism (a "bkalut"-template scaffold reused when this project was
-- first created on 2026-05-14/19, before torah_platform_001_core_tenants)
-- with a live active row: app_users.id=3, username '023131500',
-- role=super_admin, status=active, password_hash set, 143 rows already in
-- admin_sessions (real historical use, last login 2026-07-04/last session
-- 2026-07-20). It was superseded by the real Supabase Auth + is_super_admin()/
-- user_roles system (see 20260519000001_core_tenants.sql,
-- 20260820100000_seed_std_admin_account.sql) that
-- src/pages/legacy/AdminLogin.tsx and src/pages/auth/SignIn.tsx actually use
-- today (supabase.auth.signInWithPassword / signInWithOAuth) -- confirmed
-- zero references to app_users/admin_sessions or any of the nine functions
-- below anywhere in apps/01-torah-platform/src or supabase/functions.
--
-- Two independent live holes, both unused by any current code path:
--
-- 1. Both tables have RLS enabled but carry a single leftover policy
--    ("bkalut backend full access", FOR ALL, USING true, WITH CHECK true,
--    roles anon+authenticated) plus plain GRANTs to anon/authenticated. The
--    anon key ships in every browser bundle for every app on this shared
--    project (01/02/03/10/18), so app_users.password_hash (a real bcrypt
--    hash) was directly readable via `GET .../rest/v1/app_users`, and any
--    anon caller could INSERT their own super_admin row or UPDATE/DELETE the
--    real one directly -- no cracking required, verify_super_admin() below
--    was not even the weakest link.
--
-- 2. verify_super_admin/get_super_admin_dashboard/get_admin_tenant/
--    check_super_admin_session/get_public_teacher/get_public_tenant/
--    public_directory/submit_public_lead/tenant_accepts_public_intake are
--    SECURITY DEFINER (RLS bypass) and were EXECUTE-granted to anon and
--    authenticated. verify_super_admin(username, password) has no rate
--    limiting, so even without hole #1 it was brute-forceable against the
--    real super_admin account; get_super_admin_dashboard/get_admin_tenant
--    read the actual tenants/teachers/lessons/portal_messages/tenant_ads
--    data this app owns once a session token is presented. get_advisors
--    already flags all nine as anon/authenticated_security_definer_function_
--    executable.
--
-- Fix: drop the permissive policy (RLS stays enabled with zero policies =
-- full lockout for anon/authenticated, same pattern as
-- 20260825183100_knowledge_chunks_rls_lockdown.sql), revoke the table
-- grants, and revoke EXECUTE on all nine functions from anon/authenticated.
-- service_role (rolbypassrls=true) and postgres are untouched, so nothing
-- that legitimately needs this data (there is no such consumer today) would
-- have been affected anyway. Nothing dropped, nothing deleted -- additive
-- lockdown only.

drop policy if exists "bkalut backend full access" on public.app_users;
drop policy if exists "bkalut backend full access" on public.admin_sessions;

revoke all on public.app_users from anon, authenticated;
revoke all on public.admin_sessions from anon, authenticated;

revoke execute on function public.verify_super_admin(text, text) from public, anon, authenticated;
revoke execute on function public.get_super_admin_dashboard(text) from public, anon, authenticated;
revoke execute on function public.get_admin_tenant(text) from public, anon, authenticated;
revoke execute on function public.check_super_admin_session(text) from public, anon, authenticated;
revoke execute on function public.get_public_teacher(text) from public, anon, authenticated;
revoke execute on function public.get_public_tenant(text) from public, anon, authenticated;
revoke execute on function public.public_directory(text, text, text) from public, anon, authenticated;
revoke execute on function public.submit_public_lead(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.tenant_accepts_public_intake(uuid) from public, anon, authenticated;
