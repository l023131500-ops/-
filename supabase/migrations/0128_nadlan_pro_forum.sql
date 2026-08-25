-- more30 · 36 nadlan-pro — cross-office forum (module 8, "פורום")
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-25 without a
-- matching repo file until now. Captures the final live state.
-- ============================================================================
--
-- Unlike every other nadlan_pro table (scoped to one's own office via
-- nadlan_pro.can_touch), the forum is deliberately network-open: any active
-- member of ANY office can read every post; only the author can edit, and
-- either the author or the publishing office's manager can delete (moderation).
--
-- office_name/author_name are snapshotted onto the row at write time rather
-- than joined at read time. A first version joined to nadlan_pro.offices/
-- office_members to resolve those names — but those tables' own RLS
-- restricts SELECT to "my own office" (nadlan_pro.my_office_ids()), and since
-- the forum RPCs are SECURITY INVOKER like every other np_* function, that
-- inner join silently hid every post from an office the viewer doesn't belong
-- to — the exact opposite of the feature. Snapshotting avoids the cross-
-- tenant join entirely: a writer can always read their own office/membership
-- row, so the snapshot itself never requires elevated privilege.

do $$ begin
  create type nadlan_pro.forum_post_kind as enum ('has_buyer', 'has_property', 'question');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.forum_post_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists nadlan_pro.forum_posts (
  id           uuid primary key default gen_random_uuid(),
  office_id    uuid not null references nadlan_pro.offices(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  kind         nadlan_pro.forum_post_kind not null default 'question',
  title        text not null,
  body         text,
  city         text,
  status       nadlan_pro.forum_post_status not null default 'open',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  office_name  text not null,
  author_name  text not null
);

create index if not exists forum_posts_office_idx on nadlan_pro.forum_posts(office_id);
create index if not exists forum_posts_feed_idx on nadlan_pro.forum_posts(created_at desc);

create table if not exists nadlan_pro.forum_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references nadlan_pro.forum_posts(id) on delete cascade,
  created_by  uuid not null references auth.users(id),
  body        text not null,
  created_at  timestamptz not null default now(),
  author_name text not null
);

create index if not exists forum_comments_post_idx on nadlan_pro.forum_comments(post_id);

alter table nadlan_pro.forum_posts enable row level security;
alter table nadlan_pro.forum_comments enable row level security;

do $$ begin
  create policy np_forum_posts_select on nadlan_pro.forum_posts for select
    using (exists (select 1 from nadlan_pro.office_members m where m.user_id = auth.uid() and m.is_active));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_forum_posts_insert on nadlan_pro.forum_posts for insert
    with check (created_by = auth.uid() and office_id in (select nadlan_pro.my_office_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_forum_posts_update on nadlan_pro.forum_posts for update
    using (created_by = auth.uid())
    with check (created_by = auth.uid() and office_id in (select nadlan_pro.my_office_ids()));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_forum_posts_delete on nadlan_pro.forum_posts for delete
    using (created_by = auth.uid() or nadlan_pro.manages_office(office_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_forum_comments_select on nadlan_pro.forum_comments for select
    using (exists (select 1 from nadlan_pro.office_members m where m.user_id = auth.uid() and m.is_active));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_forum_comments_insert on nadlan_pro.forum_comments for insert
    with check (created_by = auth.uid()
      and exists (select 1 from nadlan_pro.office_members m where m.user_id = auth.uid() and m.is_active));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_forum_comments_delete on nadlan_pro.forum_comments for delete
    using (created_by = auth.uid());
exception when duplicate_object then null; end $$;

revoke all on nadlan_pro.forum_posts from anon;
revoke all on nadlan_pro.forum_comments from anon;

create or replace function public.np_forum_posts(
  p_kind text default null, p_status text default 'open', p_search text default null, p_limit int default 100
) returns table(
  id uuid, kind text, title text, body text, city text, status text, created_at timestamptz,
  office_id uuid, office_name text, author_name text, comment_count int, is_mine boolean
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select fp.id, fp.kind::text, fp.title, fp.body, fp.city, fp.status::text, fp.created_at,
         fp.office_id, fp.office_name, fp.author_name,
         (select count(*)::int from nadlan_pro.forum_comments fc where fc.post_id = fp.id),
         (fp.created_by = auth.uid())
  from nadlan_pro.forum_posts fp
  where (p_kind is null or fp.kind::text = p_kind)
    and (p_status is null or fp.status::text = p_status)
    and (p_search is null or fp.title ilike '%'||p_search||'%' or fp.body ilike '%'||p_search||'%' or fp.city ilike '%'||p_search||'%')
  order by fp.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 300));
$$;

create or replace function public.np_forum_post_get(p_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'post', jsonb_build_object(
      'id', fp.id, 'kind', fp.kind::text, 'title', fp.title, 'body', fp.body,
      'city', fp.city, 'status', fp.status::text, 'created_at', fp.created_at,
      'office_id', fp.office_id, 'office_name', fp.office_name,
      'author_name', fp.author_name,
      'is_mine', (fp.created_by = auth.uid())
    ),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', fc.id, 'body', fc.body, 'created_at', fc.created_at,
        'author_name', fc.author_name,
        'is_mine', (fc.created_by = auth.uid())
      ) order by fc.created_at)
      from nadlan_pro.forum_comments fc
      where fc.post_id = fp.id
    ), '[]'::jsonb)
  )
  from nadlan_pro.forum_posts fp
  where fp.id = p_id;
$$;

create or replace function public.np_forum_post_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_title text := nullif(trim(p->>'title'), '');
  v_office_name text;
  v_author_name text;
begin
  if v_id is null then
    if v_title is null then
      raise exception 'כותרת היא שדה חובה';
    end if;
    -- Both reads below are the caller's own office/membership row, which
    -- np_offices_read/np_members_read always allow (my_office_ids()) — this
    -- is the one-time snapshot the read-side RPCs now rely on instead of
    -- joining across a tenant boundary at query time.
    select o.name, coalesce(m.full_name, 'מתווך')
      into v_office_name, v_author_name
      from nadlan_pro.offices o
      left join nadlan_pro.office_members m on m.office_id = o.id and m.user_id = auth.uid()
      where o.id = (p->>'office_id')::uuid;
    if v_office_name is null then
      raise exception 'המשרד לא נמצא, או שאין לך הרשאה לפרסם ממנו';
    end if;
    insert into nadlan_pro.forum_posts (office_id, created_by, kind, title, body, city, status, office_name, author_name)
    values (
      (p->>'office_id')::uuid,
      auth.uid(),
      coalesce(nullif(p->>'kind',''), 'question')::nadlan_pro.forum_post_kind,
      v_title,
      p->>'body',
      nullif(p->>'city',''),
      coalesce(nullif(p->>'status',''),'open')::nadlan_pro.forum_post_status,
      v_office_name, v_author_name
    )
    returning id into v_id;
  else
    update nadlan_pro.forum_posts fp set
      kind   = coalesce(nullif(p->>'kind','')::nadlan_pro.forum_post_kind, fp.kind),
      title  = coalesce(v_title, fp.title),
      body   = coalesce(p->>'body', fp.body),
      city   = coalesce(nullif(p->>'city',''), fp.city),
      status = coalesce(nullif(p->>'status','')::nadlan_pro.forum_post_status, fp.status)
    where fp.id = v_id;
    if not found then
      raise exception 'הפוסט לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.np_forum_post_delete(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  delete from nadlan_pro.forum_posts where id = p_id;
  if not found then
    raise exception 'הפוסט לא נמצא, או שאין לך הרשאה למחוק אותו';
  end if;
end $$;

create or replace function public.np_forum_comment_add(p_post uuid, p_body text)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_id uuid;
  v_body text := nullif(trim(p_body), '');
  v_author_name text;
begin
  if v_body is null then
    raise exception 'תגובה ריקה';
  end if;
  if not exists (select 1 from nadlan_pro.forum_posts where id = p_post) then
    raise exception 'הפוסט לא נמצא';
  end if;
  select coalesce(m.full_name, 'מתווך') into v_author_name
    from nadlan_pro.office_members m
    where m.user_id = auth.uid() and m.is_active
    order by m.office_id limit 1;
  insert into nadlan_pro.forum_comments (post_id, created_by, body, author_name)
  values (p_post, auth.uid(), v_body, coalesce(v_author_name, 'מתווך'))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.np_forum_comment_delete(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  delete from nadlan_pro.forum_comments where id = p_id;
  if not found then
    raise exception 'התגובה לא נמצאה, או שאין לך הרשאה למחוק אותה';
  end if;
end $$;
