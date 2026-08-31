-- architecture.md §5.2 "organization" tenant type requires
-- "ניהול מגידי שיעור משויכים לארגון" (manage teachers associated with the org).
-- public.teachers has a tenant_id column but only ever had a public SELECT
-- policy gated to is_active AND is_approved -- an organization tenant had no
-- read access to its own unapproved/inactive teacher rows and NO write policy
-- (insert/update/delete) existed at all, so no UI could ever have let an org
-- manage its teachers even if one were built. Mirrors the synagogues_tenant_*
-- policy set (same has_tenant_role/is_super_admin pattern).

create policy "teachers_tenant_read" on public.teachers
  for select
  to public
  using (
    (tenant_id is not null and user_in_tenant(tenant_id))
    or is_super_admin((select auth.uid()))
  );

create policy "teachers_tenant_write_ins" on public.teachers
  for insert
  to public
  with check (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
  );

create policy "teachers_tenant_write_upd" on public.teachers
  for update
  to public
  using (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
  )
  with check (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
  );

create policy "teachers_tenant_write_del" on public.teachers
  for delete
  to public
  using (
    is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'moderator'::app_role)
    or has_tenant_role((select auth.uid()), tenant_id, 'member'::app_role)
  );
