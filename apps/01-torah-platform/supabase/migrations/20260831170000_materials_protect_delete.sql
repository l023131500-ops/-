-- Same class of gap as 20260831070000 (materials moderation-field UPDATE
-- guard), but on the DELETE path, which that migration explicitly did not
-- cover. `materials_tenant_write_del` (the generic tenant-write policy loop
-- in 20260519000002) grants DELETE to `is_super_admin` OR tenant_admin OR
-- moderator OR plain `member` alike -- tenant-scoped, not owner/role-scoped.
--
-- The only UI that ever deletes from `materials` is admin/Content.tsx's
-- moderation screen (`remove()`), meant to be reachable only by a tenant's
-- moderator/tenant_admin -- but any authenticated `member` of that tenant
-- already carries DELETE access to the same row via RLS and can call
-- `.from("materials").delete().eq("id", id)` directly on ANY material in
-- the tenant (approved, featured_on_homepage, or otherwise), including ones
-- they don't own. Unlike the table's edit surface, there is no legitimate
-- portal self-delete UI either (portal/Materials.tsx only selects+inserts),
-- so there is no owner-delete path to preserve.
--
-- A trigger, not a narrower RLS policy, is required for the same reason as
-- 20260831070000: this mirrors that migration's exact role check.
create or replace function public.protect_materials_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not (
    public.is_super_admin(auth.uid())
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'moderator')
  ) then
    raise exception 'only a moderator or tenant admin may delete materials';
  end if;
  return old;
end;
$$;

drop trigger if exists materials_protect_delete on public.materials;
create trigger materials_protect_delete
  before delete on public.materials
  for each row execute function public.protect_materials_delete();
