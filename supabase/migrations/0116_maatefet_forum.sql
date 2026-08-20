-- more30 · 39-maatefet — stage 2 continues: module 7, professional forum
-- ============================================================================
-- MAATEFET_BUILD.md roadmap: stage 2 = "מגזר חתנים (מיתוג נפרד) + תיאום
-- מדריך↔מדריכה (0115, closed) + פורום + סטודיו מלא". This migration is the
-- forum: a shared discussion space for every verified instructor, both
-- segments, so a kallah-instructor and a chatan-instructor can trade
-- experience/questions the way module 6 already lets them coordinate on one
-- specific couple. Deliberately cross-segment (no segment filter on
-- visibility) — the spec's own "one core, two faces" principle (module 15's
-- access control) governs *client* data, not instructor-to-instructor
-- professional discussion, and restricting the forum by segment would defeat
-- its purpose (a kallah-instructor asking a chatan-instructor how his side
-- handles a shared couple's coordination, for example).
--
-- Design, same shape as every prior maatefet round:
-- - `maatefet.forum_posts`/`maatefet.forum_replies`: RLS lets any verified,
--   2FA'd instructor (`maatefet.my_instructor_id() is not null`, same choke
--   point as everything else) read every row, but only the author can
--   insert/update/delete their own row, and only through the owner-scoped
--   RLS predicate — no separate RPC needed for plain create/edit/delete,
--   same convention `maatefet_content_save`/`maatefet_client_update` already
--   use (security invoker, RLS does the enforcement).
-- - Pinning is the one action that must NOT be self-service: an instructor
--   pinning their own post to the top would be a trivial abuse of a shared
--   space. RLS alone can't express "any column may change except this one",
--   so `guard_forum_post_pin` (a BEFORE UPDATE trigger, same "trigger
--   backstops RLS" shape as `guard_instructor_status_change` in 0108) blocks
--   any change to `is_pinned` unless `public.more30_is_super_admin()` is
--   true — a raw UPDATE from an instructor's own client can never flip it,
--   even though the owner-update RLS policy would otherwise allow updating
--   the row.
-- - Author identity: forum listing needs to show *who* posted, but
--   `maatefet.instructors` RLS (0108) only lets an instructor read their own
--   row (or super-admin) — a plain invoker-mode join from the forum list
--   into `instructors` would silently return every other author as NULL.
--   `public.maatefet_forum_posts_list()`/`_thread()` are therefore SECURITY
--   DEFINER (same reason `maatefet_couple_partner_info` in 0115 is): they
--   re-check the caller is a verified 2FA instructor themselves, then join
--   in only `full_name`/`segment` for the author — never phone/email/notes,
--   the same "just enough for the professional context, nothing private"
--   boundary 0115 already drew for coordination info.
-- - Every new function gets the explicit `revoke ... from anon` this project
--   has needed since 0111 (`revoke all ... from public` alone does not cover
--   `anon` here) — applied up front this round, not discovered live again.

-- ---------- forum_posts ----------
create table maatefet.forum_posts (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_forum_posts_pinned_created on maatefet.forum_posts(is_pinned desc, created_at desc);
alter table maatefet.forum_posts enable row level security;
grant select, insert, update, delete on maatefet.forum_posts to authenticated;
grant all on maatefet.forum_posts to service_role;

create trigger trg_maatefet_forum_posts_updated_at
  before update on maatefet.forum_posts
  for each row execute function maatefet.set_updated_at();

create or replace function maatefet.guard_forum_post_pin()
returns trigger
language plpgsql
security definer
set search_path = maatefet, public
as $$
begin
  if new.is_pinned is distinct from old.is_pinned and not public.more30_is_super_admin() then
    raise exception 'only a super-admin can pin or unpin a forum post';
  end if;
  return new;
end;
$$;

create trigger trg_maatefet_forum_posts_guard_pin
  before update on maatefet.forum_posts
  for each row execute function maatefet.guard_forum_post_pin();

create policy forum_posts_read on maatefet.forum_posts
  for select to authenticated
  using (maatefet.my_instructor_id() is not null or public.more30_is_super_admin());

create policy forum_posts_insert on maatefet.forum_posts
  for insert to authenticated
  with check (instructor_id = maatefet.my_instructor_id());

create policy forum_posts_update on maatefet.forum_posts
  for update to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

create policy forum_posts_delete on maatefet.forum_posts
  for delete to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- ---------- forum_replies ----------
create table maatefet.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references maatefet.forum_posts(id) on delete cascade,
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_maatefet_forum_replies_post on maatefet.forum_replies(post_id, created_at asc);
alter table maatefet.forum_replies enable row level security;
grant select, insert, update, delete on maatefet.forum_replies to authenticated;
grant all on maatefet.forum_replies to service_role;

create policy forum_replies_read on maatefet.forum_replies
  for select to authenticated
  using (maatefet.my_instructor_id() is not null or public.more30_is_super_admin());

create policy forum_replies_insert on maatefet.forum_replies
  for insert to authenticated
  with check (instructor_id = maatefet.my_instructor_id());

create policy forum_replies_update on maatefet.forum_replies
  for update to authenticated
  using (instructor_id = maatefet.my_instructor_id())
  with check (instructor_id = maatefet.my_instructor_id());

create policy forum_replies_delete on maatefet.forum_replies
  for delete to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- ============================================================================
-- public.maatefet_* wrappers
-- ============================================================================

create or replace function public.maatefet_forum_posts_list()
returns table (
  id uuid, title text, body text, is_pinned boolean,
  created_at timestamptz, updated_at timestamptz,
  author_instructor_id uuid, author_name text, author_segment maatefet.segment,
  reply_count bigint, is_mine boolean
)
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_caller_instructor_id uuid;
begin
  v_caller_instructor_id := maatefet.my_instructor_id();
  if v_caller_instructor_id is null and not public.more30_is_super_admin() then
    raise exception 'only a verified instructor can read the forum';
  end if;

  return query
    select
      p.id, p.title, p.body, p.is_pinned, p.created_at, p.updated_at,
      i.id, i.full_name, i.segment,
      (select count(*) from maatefet.forum_replies r where r.post_id = p.id),
      p.instructor_id = v_caller_instructor_id
    from maatefet.forum_posts p
    join maatefet.instructors i on i.id = p.instructor_id
    order by p.is_pinned desc, p.created_at desc;
end;
$$;

revoke all on function public.maatefet_forum_posts_list() from public;
revoke all on function public.maatefet_forum_posts_list() from anon;
grant execute on function public.maatefet_forum_posts_list() to authenticated;

create or replace function public.maatefet_forum_post_create(p_title text, p_body text)
returns maatefet.forum_posts
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.forum_posts;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can post to the forum';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'title is required';
  end if;
  if p_body is null or btrim(p_body) = '' then
    raise exception 'body is required';
  end if;

  insert into maatefet.forum_posts (instructor_id, title, body)
  values (v_instructor_id, btrim(p_title), btrim(p_body))
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.maatefet_forum_post_create(text, text) from public;
revoke all on function public.maatefet_forum_post_create(text, text) from anon;
grant execute on function public.maatefet_forum_post_create(text, text) to authenticated;

create or replace function public.maatefet_forum_post_delete(p_id uuid)
returns boolean
language sql
security invoker
set search_path = maatefet, public
as $$
  with deleted as (
    delete from maatefet.forum_posts
    where id = p_id and (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
    returning 1
  )
  select exists(select 1 from deleted)
$$;

revoke all on function public.maatefet_forum_post_delete(uuid) from public;
revoke all on function public.maatefet_forum_post_delete(uuid) from anon;
grant execute on function public.maatefet_forum_post_delete(uuid) to authenticated;

create or replace function public.maatefet_forum_post_pin(p_id uuid, p_pinned boolean)
returns maatefet.forum_posts
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.forum_posts set is_pinned = p_pinned where id = p_id
  returning *
$$;

revoke all on function public.maatefet_forum_post_pin(uuid, boolean) from public;
revoke all on function public.maatefet_forum_post_pin(uuid, boolean) from anon;
grant execute on function public.maatefet_forum_post_pin(uuid, boolean) to authenticated;

create or replace function public.maatefet_forum_thread(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_caller_instructor_id uuid;
  v_post jsonb;
  v_replies jsonb;
begin
  v_caller_instructor_id := maatefet.my_instructor_id();
  if v_caller_instructor_id is null and not public.more30_is_super_admin() then
    raise exception 'only a verified instructor can read the forum';
  end if;

  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'body', p.body, 'is_pinned', p.is_pinned,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'author_instructor_id', i.id, 'author_name', i.full_name, 'author_segment', i.segment,
    'is_mine', p.instructor_id = v_caller_instructor_id
  )
  into v_post
  from maatefet.forum_posts p join maatefet.instructors i on i.id = p.instructor_id
  where p.id = p_post_id;

  if v_post is null then
    raise exception 'post not found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'body', r.body, 'created_at', r.created_at,
    'author_instructor_id', i.id, 'author_name', i.full_name, 'author_segment', i.segment,
    'is_mine', r.instructor_id = v_caller_instructor_id
  ) order by r.created_at asc), '[]'::jsonb)
  into v_replies
  from maatefet.forum_replies r join maatefet.instructors i on i.id = r.instructor_id
  where r.post_id = p_post_id;

  return jsonb_build_object('post', v_post, 'replies', v_replies);
end;
$$;

revoke all on function public.maatefet_forum_thread(uuid) from public;
revoke all on function public.maatefet_forum_thread(uuid) from anon;
grant execute on function public.maatefet_forum_thread(uuid) to authenticated;

create or replace function public.maatefet_forum_reply_create(p_post_id uuid, p_body text)
returns maatefet.forum_replies
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.forum_replies;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can reply on the forum';
  end if;
  if p_body is null or btrim(p_body) = '' then
    raise exception 'reply body is required';
  end if;

  insert into maatefet.forum_replies (post_id, instructor_id, body)
  values (p_post_id, v_instructor_id, btrim(p_body))
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.maatefet_forum_reply_create(uuid, text) from public;
revoke all on function public.maatefet_forum_reply_create(uuid, text) from anon;
grant execute on function public.maatefet_forum_reply_create(uuid, text) to authenticated;

create or replace function public.maatefet_forum_reply_delete(p_id uuid)
returns boolean
language sql
security invoker
set search_path = maatefet, public
as $$
  with deleted as (
    delete from maatefet.forum_replies
    where id = p_id and (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
    returning 1
  )
  select exists(select 1 from deleted)
$$;

revoke all on function public.maatefet_forum_reply_delete(uuid) from public;
revoke all on function public.maatefet_forum_reply_delete(uuid) from anon;
grant execute on function public.maatefet_forum_reply_delete(uuid) to authenticated;
