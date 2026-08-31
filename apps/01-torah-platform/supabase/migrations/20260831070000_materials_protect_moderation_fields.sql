-- Same class of gap as 20260831050000/20260831060000 (raised_ils, orders/
-- donations payment fields): RLS restricts rows, not columns.
-- `materials_tenant_write_upd` grants UPDATE to `moderator`/`tenant_admin`
-- AND `member` alike (`is_super_admin(...) OR has_tenant_role(..., 'tenant_admin')
-- OR has_tenant_role(..., 'moderator') OR has_tenant_role(..., 'member')`),
-- with no column restriction and no `with_check` narrower than the `using`
-- clause. The only UI that ever calls `.update()` on `materials` is
-- admin/Content.tsx's moderation screen (`updateStatus()`), which is meant
-- to be reachable only by a tenant's moderator/tenant_admin -- but any
-- authenticated `member` of that tenant already carries write access to the
-- same row via RLS and can call
-- `.from("materials").update({status:"approved"})` on ANY material in the
-- tenant directly (the policy is tenant-scoped, not owner-scoped), self- or
-- cross-approving/rejecting a colleague's pending upload without ever
-- touching the admin screen. `display_in_public_profile` and
-- `featured_on_homepage` are also moderator-only surfaces once the public
-- teacher portal starts reading them, so they're protected the same way.
--
-- Left open, a plain tenant member could bypass moderation entirely (self-
-- approve their own upload, or maliciously reject/feature someone else's)
-- with a direct client call, no admin UI involved.
--
-- A trigger, not a narrower RLS policy, is required because RLS cannot
-- restrict individual columns. `title`/`description`/`category`/
-- `subcategory` stay freely editable by any tenant member with row access,
-- matching this table's existing (if currently unused by any UI) edit
-- surface -- only the moderation-decision columns are locked down.
create or replace function public.protect_materials_moderation_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not (
    public.has_tenant_role(auth.uid(), old.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'moderator')
  ) then
    if new.status is distinct from old.status then
      new.status := old.status;
    end if;
    if new.rejection_reason is distinct from old.rejection_reason then
      new.rejection_reason := old.rejection_reason;
    end if;
    if new.display_in_public_profile is distinct from old.display_in_public_profile then
      new.display_in_public_profile := old.display_in_public_profile;
    end if;
    if new.featured_on_homepage is distinct from old.featured_on_homepage then
      new.featured_on_homepage := old.featured_on_homepage;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists materials_protect_moderation_fields on public.materials;
create trigger materials_protect_moderation_fields
  before update on public.materials
  for each row execute function public.protect_materials_moderation_fields();
