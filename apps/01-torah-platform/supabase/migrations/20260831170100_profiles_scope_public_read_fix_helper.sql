-- Follow-up to the immediately-preceding migration. The inline
--   exists (select 1 from public.user_roles ur where ur.user_id = profiles.id)
-- looked right but is silently defeated by user_roles' own RLS: policy
-- "user_roles_self_read" restricts SELECT on user_roles to
-- `user_id = auth.uid() or is_super_admin(auth.uid())`, so when a
-- non-super-admin authenticated caller (e.g. a public visitor viewing
-- someone else's /rabbi/:id page) triggers this subquery as part of
-- evaluating profiles_read_basic, the subquery itself can only ever see
-- the caller's own user_roles rows -- never the target profile's -- so the
-- exists() came back false for every role-holder profile that wasn't the
-- caller's own. Verified live: an authenticated caller unrelated to either
-- profile got zero rows back for a real super_admin-role profile it should
-- have been allowed to read.
--
-- Fix: route the check through a SECURITY DEFINER helper (same shape and
-- purpose as is_super_admin/has_tenant_role, defined in this file's
-- original core-tenants migration specifically "to avoid RLS recursion"),
-- which evaluates against the full user_roles table regardless of the
-- caller's own row-level visibility into it.

-- Scoped to tenant_id is not null: a bare global super_admin role (no
-- tenant_id) is a platform-operator account, not a public rabbi/teacher
-- portal, so it shouldn't be pulled into the "public page" read branch --
-- super_admin callers already get full read access via the is_super_admin
-- branch of profiles_read_basic below regardless.
create or replace function public.is_tenant_role_holder(_uid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _uid and tenant_id is not null
  );
$$;

drop policy if exists "profiles_read_basic" on public.profiles;

create policy "profiles_read_basic" on public.profiles for select
using (
  id = (select auth.uid())
  or is_super_admin((select auth.uid()))
  or is_tenant_role_holder(id)
);
