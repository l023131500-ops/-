-- build_tasks#47: tenants.status was never actually enforced as an access
-- gate. has_tenant_role(...) -- the function nearly every _tenant_write RLS
-- policy calls, plus several read-restriction policies added in the
-- 20260831* rounds (rabbi_questions, materials moderation fields) -- only
-- checked user_roles membership, never public.tenants.status. A pending or
-- suspended tenant's invited/existing members could write to every
-- tenant-scoped table exactly like an active tenant's members, and the
-- approve/suspend buttons added in build_tasks#46 (admin/Tenants.tsx,
-- admin/TenantDetail.tsx) had zero effect beyond the admin-console badge.
--
-- Verified live (uhnrgujbdxhhmoxcjria core.build_tasks + this project) before
-- applying: `select id, slug, status from public.tenants` returns all 5 live
-- tenants as status='active', so this is a no-op for every current write path.
--
-- is_super_admin(_uid) keeps its unconditional bypass (unchanged from the
-- original definition) so platform admins are never locked out by a tenant's
-- own status.
create or replace function public.has_tenant_role(_uid uuid, _tenant_id uuid, _role app_role)
returns boolean
language sql security definer stable
as $$
  select public.is_super_admin(_uid) or exists (
    select 1
    from public.user_roles ur
    join public.tenants t on t.id = ur.tenant_id
    where ur.user_id = _uid
      and ur.tenant_id = _tenant_id
      and ur.role = _role
      and t.status = 'active'
  );
$$;
