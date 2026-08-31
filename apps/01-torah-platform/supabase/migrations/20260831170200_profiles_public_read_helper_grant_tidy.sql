-- Cosmetic follow-up: is_tenant_role_holder (added in the preceding
-- migration) picked up Postgres's default bare-PUBLIC execute grant on
-- function creation, which the Supabase advisor flags
-- (anon/authenticated_security_definer_function_executable). The sibling
-- helpers it mirrors (is_super_admin, has_tenant_role) only carry explicit
-- grants to anon/authenticated/service_role/postgres, not a PUBLIC grant.
-- Match that shape. No behavior change: the RLS policy that calls this
-- function still works identically (anon/authenticated keep EXECUTE), this
-- only removes the redundant PUBLIC grant line.

revoke execute on function public.is_tenant_role_holder(uuid) from public;
grant execute on function public.is_tenant_role_holder(uuid) to anon, authenticated, service_role, postgres;
