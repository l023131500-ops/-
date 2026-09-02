-- Same class of gap as materials/rabbi_questions/forum_posts (20260831070000/
-- 080000/110000): RLS restricts rows, not columns. `lessons_tenant_write_upd`
-- grants UPDATE to `moderator`/`tenant_admin` AND plain `member` alike
-- (`is_super_admin(...) OR has_tenant_role(..., 'tenant_admin') OR
-- has_tenant_role(..., 'moderator') OR has_tenant_role(..., 'member')`), with
-- no column restriction and a `with_check` identical to `using`.
--
-- `lessons.is_approved` is the moderation gate the public search actually
-- reads (supabase/functions/search-lessons/index.ts: `.eq("is_approved",
-- true)`) -- the only place any UI writes it today is the legacy admin
-- moderation screen (src/pages/legacy/AdminDashboard.tsx), but any
-- authenticated `member` of the tenant already carries RLS write access to
-- the same row and can call `.from("lessons").update({is_approved:true})`
-- directly on their own (self-approve, skipping review) or -- since the
-- policy is tenant-scoped, not owner-scoped -- on ANY lesson in the tenant.
-- `lessons_tenant_write_ins`'s `with_check` has the same member branch with
-- no column guard, so a member can also INSERT a lesson with
-- `is_approved:true` set explicitly, bypassing the column default (`false`)
-- entirely.
--
-- `lessons.is_active` is different: src/pages/portal/Lessons.tsx's
-- `toggleActive()` already ships a legitimate self-service "pause my own
-- listing" UI for a `member` (maggid), so it isn't a moderator-only field --
-- but that same call has no ownership filter
-- (`.from("lessons").update({is_active:...}).eq("id", id)`, no
-- `.eq("rabbi_user_id", ...)`), and RLS doesn't add one either, so today a
-- member can deactivate (or reactivate) ANY other teacher's lesson in the
-- tenant, not just their own. This locks `is_active` to the row's own
-- `rabbi_user_id` (or moderator/tenant_admin) instead of moderator-only, to
-- keep the existing self-toggle feature working for its owner.
--
-- A trigger, not a narrower RLS policy, is required because RLS cannot
-- restrict individual columns. title/description/city/day_of_week/etc. stay
-- freely editable by any tenant member with row access, matching the
-- existing edit surface -- only is_approved/is_active are locked down.
create or replace function public.protect_lessons_moderation_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_moderator boolean := public.has_tenant_role(auth.uid(), new.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), new.tenant_id, 'moderator');
begin
  if tg_op = 'INSERT' then
    if not is_moderator then
      new.is_approved := false;
    end if;
    return new;
  end if;

  if not is_moderator then
    if new.is_approved is distinct from old.is_approved then
      new.is_approved := old.is_approved;
    end if;
    if new.is_active is distinct from old.is_active
      and old.rabbi_user_id is distinct from auth.uid() then
      new.is_active := old.is_active;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_protect_moderation_fields on public.lessons;
create trigger lessons_protect_moderation_fields
  before insert or update on public.lessons
  for each row execute function public.protect_lessons_moderation_fields();
