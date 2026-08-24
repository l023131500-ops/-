-- 0140 — events-gifts round 10: the shop window finally opens.
--
-- Audit finding (the loop's audit mandate): events.halls has carried
-- cover_url / gallery / brand since 0131, and the public landing page
-- (hall.html) renders all three — but no RPC could ever set them.
-- evg_hall_create takes only name/slug/city/phone/description, and there is
-- no update function at all: a hall owner could not even fix a typo in the
-- description, let alone build the "showcase" EVENTS_BUILD §0/§7 says is the
-- thing that sells the platform to hall owners. §1 role 2 explicitly includes
-- "ניהול המיתוג שלו" and §4 lists white-label branding + hall analytics.
--
-- This migration adds:
--   1. showcase columns: capacity_guests, amenities, video_url
--   2. evg_hall_update  — owner/super-admin edit of the full showcase
--      (invoker: halls RLS is owner-or-admin; the 0131 guard trigger keeps
--      published/hall_share_bps super-admin-only and is untouched here)
--   3. evg_hall_stats   — hall-owner analytics: lead funnel, 30-day pulse,
--      by-type and by-month breakdowns, events hosted at the hall
--      (definer with an explicit ownership check: events.events RLS is
--      owner-only, so an invoker could not count other people's events
--      hosted at the hall — only counts leave this function, never rows)
--   4. evg_hall_public / evg_me redefined to carry the new fields
--      (evg_me feeds the owner's edit form, so it returns everything editable)

alter table events.halls
  add column capacity_guests integer
    check (capacity_guests is null or capacity_guests between 1 and 10000),
  add column amenities jsonb not null default '[]'::jsonb,
  add column video_url text
    check (video_url is null
           or (video_url ~ '^https://' and char_length(video_url) <= 500));

-- ---------- owner: edit the hall showcase ----------
create or replace function public.evg_hall_update(
  p_hall_id uuid,
  p_name text,
  p_city text default null,
  p_address text default null,
  p_phone text default null,
  p_description text default null,
  p_cover_url text default null,
  p_gallery jsonb default '[]'::jsonb,
  p_brand jsonb default '{}'::jsonb,
  p_capacity_guests integer default null,
  p_amenities jsonb default '[]'::jsonb,
  p_video_url text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_gallery jsonb;
  v_amenities jsonb;
  v_brand jsonb;
  v_accent text;
  v_logo text;
  v_tagline text;
  v_rows integer;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'hall name is required'; end if;
  if char_length(btrim(p_name)) > 120 then raise exception 'hall name too long'; end if;
  if p_description is not null and char_length(p_description) > 4000 then
    raise exception 'description too long';
  end if;
  if p_cover_url is not null
     and (p_cover_url !~ '^https://' or char_length(p_cover_url) > 500) then
    raise exception 'cover image must be an https:// URL';
  end if;
  if p_video_url is not null
     and (p_video_url !~ '^https://' or char_length(p_video_url) > 500) then
    raise exception 'video must be an https:// URL';
  end if;
  if p_capacity_guests is not null
     and p_capacity_guests not between 1 and 10000 then
    raise exception 'capacity must be between 1 and 10000';
  end if;

  -- gallery: keep only https string entries, hard cap 12 (hall.html shows 12)
  select coalesce(jsonb_agg(g.u), '[]'::jsonb) into v_gallery
  from (
    select value #>> '{}' as u
    from jsonb_array_elements(
      case when jsonb_typeof(p_gallery) = 'array' then p_gallery else '[]'::jsonb end)
    where jsonb_typeof(value) = 'string'
      and value #>> '{}' ~ '^https://'
      and char_length(value #>> '{}') <= 500
    limit 12
  ) g;

  -- amenities: trimmed non-empty strings, ≤40 chars each, hard cap 16
  select coalesce(jsonb_agg(a.v), '[]'::jsonb) into v_amenities
  from (
    select btrim(value #>> '{}') as v
    from jsonb_array_elements(
      case when jsonb_typeof(p_amenities) = 'array' then p_amenities else '[]'::jsonb end)
    where jsonb_typeof(value) = 'string'
      and btrim(value #>> '{}') <> ''
      and char_length(btrim(value #>> '{}')) <= 40
    limit 16
  ) a;

  -- brand: whitelist of three keys, each validated; anything else is dropped
  if p_brand is null or jsonb_typeof(p_brand) <> 'object' then
    p_brand := '{}'::jsonb;
  end if;
  v_accent := case
    when (p_brand ->> 'accent') ~ '^#[0-9A-Fa-f]{6}$' then p_brand ->> 'accent'
  end;
  v_logo := case
    when (p_brand ->> 'logo_url') ~ '^https://'
         and char_length(p_brand ->> 'logo_url') <= 500 then p_brand ->> 'logo_url'
  end;
  v_tagline := left(nullif(btrim(coalesce(p_brand ->> 'tagline', '')), ''), 140);
  v_brand := jsonb_strip_nulls(jsonb_build_object(
    'accent', v_accent, 'logo_url', v_logo, 'tagline', v_tagline));

  -- RLS (halls_owner_or_admin) scopes this to the caller's own hall;
  -- published/hall_share_bps are not touched, so the 0131 guard trigger passes
  update events.halls set
    name = btrim(p_name),
    city = nullif(btrim(coalesce(p_city, '')), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    cover_url = p_cover_url,
    gallery = v_gallery,
    brand = v_brand,
    capacity_guests = p_capacity_guests,
    amenities = v_amenities,
    video_url = p_video_url
  where id = p_hall_id;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'hall not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_hall_update(uuid, text, text, text, text, text, text, jsonb, jsonb, integer, jsonb, text) from public, anon;
grant execute on function public.evg_hall_update(uuid, text, text, text, text, text, text, jsonb, jsonb, integer, jsonb, text) to authenticated;

-- ---------- owner: hall analytics (EVENTS_BUILD §4) ----------
create or replace function public.evg_hall_stats(p_hall_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = events, public
as $$
declare
  v_ok boolean;
begin
  select true into v_ok
  from events.halls h
  where h.id = p_hall_id
    and (h.owner_auth_user_id = auth.uid() or public.more30_is_super_admin());
  if v_ok is not true then raise exception 'hall not found'; end if;

  return (
    select jsonb_build_object(
      'leads_total', count(*),
      'leads_new', count(*) filter (where status = 'new'),
      'leads_contacted', count(*) filter (where status = 'contacted'),
      'leads_closed', count(*) filter (where status = 'closed'),
      'leads_30d', count(*) filter (where created_at > now() - interval '30 days')
    )
    from events.hall_leads where hall_id = p_hall_id
  ) || jsonb_build_object(
    'leads_by_type', coalesce((
      select jsonb_object_agg(s.t, s.c) from (
        select coalesce(event_type::text, 'other') as t, count(*) as c
        from events.hall_leads
        where hall_id = p_hall_id
        group by 1
      ) s), '{}'::jsonb),
    'leads_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', s.m, 'count', s.c) order by s.m) from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as m, count(*) as c
        from events.hall_leads
        where hall_id = p_hall_id
          and created_at > date_trunc('month', now()) - interval '5 months'
        group by 1
      ) s), '[]'::jsonb),
    -- counts only — event rows belong to their owners, not the hall
    'events_hosted', (
      select count(*) from events.events e where e.hall_id = p_hall_id),
    'events_upcoming', (
      select count(*) from events.events e
      where e.hall_id = p_hall_id and e.event_date >= current_date)
  );
end;
$$;

revoke all on function public.evg_hall_stats(uuid) from public, anon;
grant execute on function public.evg_hall_stats(uuid) to authenticated;

-- ---------- public landing payload learns the new fields ----------
create or replace function public.evg_hall_public(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = events, public
as $$
  select jsonb_build_object(
    'name', h.name, 'slug', h.slug, 'city', h.city, 'address', h.address,
    'phone', h.phone, 'description', h.description,
    'cover_url', h.cover_url, 'gallery', h.gallery, 'brand', h.brand,
    'capacity_guests', h.capacity_guests, 'amenities', h.amenities,
    'video_url', h.video_url
  )
  from events.halls h
  where h.slug = lower(btrim(p_slug)) and h.published
  limit 1
$$;

-- ---------- evg_me carries the full editable hall record ----------
-- (0131 body + the showcase fields; the events block is unchanged)
create or replace function public.evg_me()
returns jsonb
language sql
stable
security invoker
set search_path = events, public
as $$
  select jsonb_build_object(
    'halls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'slug', h.slug, 'name', h.name, 'city', h.city,
        'address', h.address, 'phone', h.phone, 'description', h.description,
        'cover_url', h.cover_url, 'gallery', h.gallery, 'brand', h.brand,
        'capacity_guests', h.capacity_guests, 'amenities', h.amenities,
        'video_url', h.video_url,
        'published', h.published,
        'lead_count', (select count(*) from events.hall_leads l
                       where l.hall_id = h.id and l.status = 'new')
      ) order by h.created_at desc)
      from events.halls h where h.owner_auth_user_id = auth.uid()), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'event_type', e.event_type::text,
        'event_date', e.event_date, 'status', e.status::text,
        'share_token', e.share_token,
        'guest_count', (select count(*) from events.guests g where g.event_id = e.id),
        'yes_count', (select coalesce(sum(g.rsvp_count), 0) from events.guests g
                      where g.event_id = e.id and g.rsvp_status = 'yes'),
        'gift_total_agorot', (select coalesce(sum(g.amount_agorot), 0)
                              from events.gifts g
                              where g.event_id = e.id and g.status = 'paid')
      ) order by e.created_at desc)
      from events.events e where e.owner_auth_user_id = auth.uid()), '[]'::jsonb),
    'is_super_admin', public.more30_is_super_admin()
  )
$$;
