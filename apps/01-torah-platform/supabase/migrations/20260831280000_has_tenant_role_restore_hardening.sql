-- The status-gate replacement of has_tenant_role in 20260831270000 used
-- CREATE OR REPLACE FUNCTION, which does NOT preserve a function's
-- proconfig (ALTER FUNCTION ... SET search_path) or reset its ACL back to
-- 20260519000005_security_hardening.sql's tightened grants -- confirmed live
-- via pg_proc immediately after applying: proconfig went back to null and
-- anon regained EXECUTE. This restores both, matching migration 005 exactly.
alter function public.has_tenant_role(uuid, uuid, public.app_role) set search_path = public, pg_temp;
revoke execute on function public.has_tenant_role(uuid, uuid, public.app_role) from public, anon;
