-- Same class of gap as 20260831080000/170000 (materials) and 20260831200000
-- (forum_posts): 20260831130000 already added a BEFORE INSERT/UPDATE
-- trigger (protect_lessons_moderation_fields) that locks `is_approved` to
-- moderators and `is_active` to the row's own `rabbi_user_id` (or a
-- moderator), fixing the self-service "pause my own listing" surface in
-- src/pages/portal/Lessons.tsx. It never touched DELETE.
--
-- `lessons_tenant_write_del` grants DELETE to `member`/`moderator`/
-- `tenant_admin`/super_admin alike, with no ownership check at all (RLS
-- restricts rows, not the operation's relationship to `rabbi_user_id`).
-- `src/pages/portal/Lessons.tsx` (line ~149) correctly scopes its own
-- delete with `.eq("rabbi_user_id", profileId)`, but that is a client-side
-- filter, not enforced server-side -- and a second live, routed screen,
-- `src/pages/portal/Schedule.tsx` (App.tsx: `PortalSchedule`, route
-- "לוח שיעורים"), calls `.from("lessons").delete().eq("id", id)` with NO
-- ownership filter whatsoever. Any plain `member` of a tenant can therefore
-- delete ANY other teacher's lesson listing in that tenant via that screen
-- (or a direct REST/JS call), not just their own.
--
-- Live-verified against bieebmnmkffwbqlsfozh in a rolled-back transaction
-- before this migration: a real user granted a temporary `member` role
-- (no other role) in a real tenant successfully deleted a lesson row owned
-- by a different real user's `rabbi_user_id` -- `remaining_before_fix = 0`
-- confirmed the delete went through with no error.
--
-- Fix follows the same shape as protect_materials_delete/
-- protect_forum_posts_delete: a BEFORE DELETE trigger that raises unless
-- the caller is super_admin/tenant_admin/moderator, or the row's own
-- `rabbi_user_id` (self-delete, matching the existing legitimate
-- self-service pattern in portal/Lessons.tsx). No existing RLS policy or
-- other trigger on `lessons` is touched.
create or replace function public.protect_lessons_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not (
    public.is_super_admin(auth.uid())
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'moderator')
    or auth.uid() = old.rabbi_user_id
  ) then
    raise exception 'only the lesson owner, a moderator, or a tenant admin may delete a lesson';
  end if;
  return old;
end;
$$;

drop trigger if exists lessons_protect_delete on public.lessons;
create trigger lessons_protect_delete
  before delete on public.lessons
  for each row execute function public.protect_lessons_delete();
