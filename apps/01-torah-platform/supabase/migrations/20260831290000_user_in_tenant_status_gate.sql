-- Completes build_tasks#47 on the read side. has_tenant_role (20260831270000)
-- closed the write-path gap; the generic "%_tenant_read" policy (migration
-- 20260519000002) is:
--   tenant_id is null OR user_in_tenant(tenant_id) OR (tenant.status='active')
-- The third clause already correctly makes an active tenant's content
-- publicly readable and a non-active tenant's content NOT publicly readable.
-- But user_in_tenant() never checked tenant status either, so a pending or
-- suspended tenant's own member could still read all of that tenant's
-- content via the membership clause, and could still write to the
-- newsletters/materials-media/site-images storage buckets and public.teachers
-- (all three explicitly call user_in_tenant for their write checks). Adding
-- the same status='active' requirement here (is_super_admin keeps its
-- unconditional bypass, unchanged) closes that for reads and those 3 extra
-- write paths in one place, matching has_tenant_role's shape.
--
-- CREATE OR REPLACE FUNCTION does not preserve a function's proconfig/ACL
-- (confirmed the hard way in 20260831270000/280000) -- this migration restores
-- both search_path hardening and the anon/public execute revocation from
-- 20260519000005_security_hardening.sql in the SAME migration this time.
create or replace function public.user_in_tenant(_tenant_id uuid)
returns boolean
language sql security definer stable
as $$
  select public.is_super_admin(auth.uid())
    or (
      _tenant_id in (select public.user_tenants(auth.uid()))
      and exists (
        select 1 from public.tenants t
        where t.id = _tenant_id and t.status = 'active'
      )
    );
$$;

alter function public.user_in_tenant(uuid) set search_path = public, pg_temp;
revoke execute on function public.user_in_tenant(uuid) from public, anon;
