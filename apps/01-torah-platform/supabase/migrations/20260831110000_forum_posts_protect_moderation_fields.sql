-- Same class of gap as 20260831050000/60000/70000/80000 (raised_ils, orders/
-- donations payment fields, materials moderation fields, rabbi_questions
-- answer fields): RLS restricts rows, not columns. `forum_posts_tenant_write`
-- (the single ALL policy on forum_posts) grants INSERT/UPDATE/DELETE to
-- `moderator`/`tenant_admin` AND plain `member` alike, with no column
-- restriction. admin/Forums.tsx's pin/lock toggles
-- (`.from("forum_posts").update({is_pinned})` / `.update({is_locked})`) are
-- presented as a moderation-only screen, but nothing in the RLS stops any
-- signed-in tenant `member` from calling that same update directly on ANY
-- post in the tenant (not just their own) to pin their own post to the top
-- of the forum, or lock/unlock someone else's thread -- moderation
-- decisions a plain member should never be able to make.
--
-- `title`/`body`/`attachments` stay freely editable by any tenant member --
-- those are shared discussion content, not moderation-decision fields (same
-- reasoning already applied to materials' title/description/category and
-- rabbi_questions' question/contact fields), and no UI restricts them.
create or replace function public.protect_forum_posts_moderation_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.has_tenant_role(auth.uid(), new.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), new.tenant_id, 'moderator')
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_pinned := false;
    new.is_locked := false;
    return new;
  end if;

  -- UPDATE: revert the moderation-decision columns to their prior value,
  -- leave everything else (title, body, attachments) freely editable.
  if new.is_pinned is distinct from old.is_pinned then
    new.is_pinned := old.is_pinned;
  end if;
  if new.is_locked is distinct from old.is_locked then
    new.is_locked := old.is_locked;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_posts_protect_moderation_fields on public.forum_posts;
create trigger forum_posts_protect_moderation_fields
  before insert or update on public.forum_posts
  for each row execute function public.protect_forum_posts_moderation_fields();
