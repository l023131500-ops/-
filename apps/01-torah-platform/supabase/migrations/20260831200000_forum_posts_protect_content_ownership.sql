-- Same class of gap as 20260831070000/090000 (materials/rabbi_questions
-- ownership), but on forum_posts: 20260831110000 already stopped plain
-- `member`s from touching is_pinned/is_locked, but explicitly left
-- title/body/attachments "freely editable by any tenant member" on the
-- assumption that forum content is tenant-shared like materials' catalog
-- fields. It isn't -- forum_posts.user_id is a real per-row author, and
-- admin/Forums.tsx's delete()/update() calls carry no ownership filter,
-- relying entirely on forum_posts_tenant_write (a single tenant-scoped ALL
-- policy with no user_id check). Any plain `member` of a tenant can
-- therefore UPDATE (deface title/body/attachments/claim authorship via
-- user_id) or DELETE any OTHER member's forum post in the same tenant via a
-- direct REST/JS call -- moderator/tenant_admin should be able to do this
-- for moderation, and an author should be able to edit/delete their own
-- post, but a random member should not be able to touch someone else's
-- post at all.
--
-- Extends the existing protect_forum_posts_moderation_fields trigger (added
-- 20260831110000) to also revert title/body/attachments/user_id on UPDATE
-- unless the caller is tenant_admin/moderator/super_admin OR the post's own
-- author, and adds a matching BEFORE DELETE guard (same shape as
-- 20260831080000's protect_materials_delete) that additionally allows the
-- author to delete their own post.
create or replace function public.protect_forum_posts_moderation_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_mod boolean;
begin
  is_mod := public.is_super_admin(auth.uid())
    or public.has_tenant_role(auth.uid(), new.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), new.tenant_id, 'moderator');

  if is_mod then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_pinned := false;
    new.is_locked := false;
    return new;
  end if;

  -- UPDATE: moderation-decision columns always revert for non-moderators.
  if new.is_pinned is distinct from old.is_pinned then
    new.is_pinned := old.is_pinned;
  end if;
  if new.is_locked is distinct from old.is_locked then
    new.is_locked := old.is_locked;
  end if;

  -- Content + authorship columns: only the post's own author may change
  -- them; any other plain member gets silently reverted to the stored
  -- value (same revert-not-reject shape already used above).
  if auth.uid() is distinct from old.user_id then
    new.title := old.title;
    new.body := old.body;
    new.attachments := old.attachments;
    new.user_id := old.user_id;
  end if;

  return new;
end;
$$;

create or replace function public.protect_forum_posts_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not (
    public.is_super_admin(auth.uid())
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'moderator')
    or auth.uid() = old.user_id
  ) then
    raise exception 'only the post author, a moderator, or a tenant admin may delete a forum post';
  end if;
  return old;
end;
$$;

drop trigger if exists forum_posts_protect_delete on public.forum_posts;
create trigger forum_posts_protect_delete
  before delete on public.forum_posts
  for each row execute function public.protect_forum_posts_delete();
