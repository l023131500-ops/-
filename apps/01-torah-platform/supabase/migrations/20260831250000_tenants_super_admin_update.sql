-- Spec gap (docs/architecture.md §4.3/§5.3/§8): the Super Admin is supposed to
-- be able to assign a custom domain to any tenant (`ניהול דומיינים`), and
-- `tenants.custom_domain` already exists + is already read by src/lib/tenant.ts
-- for host-based tenant resolution -- but there was never a UI for it, and
-- more fundamentally `tenants` had no UPDATE policy for `is_super_admin` at
-- all: only `tenants_admin_update_own` (a given tenant's own `tenant_admin`)
-- could update a tenant row. A super admin with no `tenant_admin` membership
-- on a given tenant (the normal case -- union staff, not that tenant's own
-- staff) could not have set `custom_domain` even from a raw client call, let
-- alone a UI. `tenants_super_admin_insert`/`tenants_super_admin_delete`
-- already exist for super admins; this adds the matching UPDATE policy so the
-- same actor can also edit a row, unrestricted by column, same as insert/
-- delete already are. Purely additive -- does not touch the existing
-- `tenants_admin_update_own` policy, so tenant_admin self-service is unchanged.
create policy "tenants_super_admin_update"
  on public.tenants
  for update
  using (public.is_super_admin((select auth.uid())))
  with check (public.is_super_admin((select auth.uid())));
