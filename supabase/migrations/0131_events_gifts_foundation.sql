-- more30 · 38-events-gifts — stage-0 foundation: schema + 4-role RLS + public API
-- ============================================================================
-- EVENTS_BUILD.md §5.1: "מהתיאור (יש) — בונים שלד מלא". The capture phase
-- (EVENTS_CAPTURE.md) is genuinely blocked on the user (NEEDS_USER.md §38 —
-- landing-page URL + admin screenshots), but the build spec itself says the
-- full skeleton is built FROM THE DESCRIPTION first and refined when capture
-- material arrives. This migration is that skeleton, done exactly the way
-- 39-maatefet's stage-0 was done (0108/0110): new bare schema + thin public.*
-- wrapper RPCs, because this project's PostgREST does not expose new schemas
-- without a restart (verified then; the wrapper convention keeps working
-- either way, like public.maatefet_* and public.np_*).
--
-- Four roles from EVENTS_BUILD.md §1, mapped to mechanisms:
--   super-admin  -> public.more30_is_super_admin() (same global gate as every
--                   other more30 admin surface — no new admin table)
--   hall owner   -> events.halls.owner_auth_user_id; halls start unpublished,
--                   only a super-admin can flip `published` (guard trigger,
--                   same shape as maatefet's instructor-verification guard)
--   event owner  -> events.events.owner_auth_user_id
--   guest/giver  -> NO account. One personal token per guest / one share
--                   token per event, usable only through SECURITY DEFINER
--                   RPCs that take the exact token and never list (the same
--                   anti-enumeration lesson 0110 fixed for maatefet invites —
--                   applied here from day one: anon has zero table grants).
--
-- Payments (EVENTS_BUILD.md §3): NO PAN ever touches this platform, and live
-- charging is BLOCKED AT THE DATABASE — a trigger rejects any gift row with
-- mode='live' until a payment provider (נדרים פלוס / PayMe split) is approved
-- by the user (that approval is an open NEEDS_USER item). Test-mode gifts are
-- real rows, clearly flagged, so the whole flow (gift -> wallet split ->
-- dashboards) is exercisable end-to-end today without a single real charge.
--
-- Additive only: new schema `events`, nothing touched in core/public/nadlan/
-- maatefet/zr_*/any protected schema.

create schema if not exists events;
grant usage on schema events to authenticated, anon, service_role;

-- ---------- enums ----------
do $$ begin
  create type events.event_type as enum
    ('wedding', 'bar_mitzvah', 'bat_mitzvah', 'brit', 'engagement', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type events.event_status as enum ('draft', 'active', 'done', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type events.rsvp_status as enum ('pending', 'yes', 'no', 'maybe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type events.gift_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type events.lead_status as enum ('new', 'contacted', 'closed');
exception when duplicate_object then null; end $$;

-- ---------- helpers ----------
create or replace function events.set_updated_at()
returns trigger
language plpgsql
set search_path = events
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 122 bits of entropy, URL-safe, no pgcrypto dependency (gen_random_uuid is
-- built-in on pg17). Used for guest personal links and event share links.
create or replace function events.new_token()
returns text
language sql
volatile
set search_path = events
as $$
  select replace(gen_random_uuid()::text, '-', '')
$$;

-- ---------- halls (חלון הראווה + לידים) ----------
create table events.halls (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  name text not null check (btrim(name) <> ''),
  city text,
  address text,
  phone text,
  description text,
  cover_url text,
  gallery jsonb not null default '[]'::jsonb,
  brand jsonb not null default '{}'::jsonb,
  -- optional hall cut of gifts for events hosted there (marketplace split)
  hall_share_bps integer not null default 0 check (hall_share_bps between 0 and 2000),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_halls_owner on events.halls(owner_auth_user_id);
alter table events.halls enable row level security;
grant select, insert, update, delete on events.halls to authenticated;
grant all on events.halls to service_role;

create trigger trg_events_halls_updated_at
  before update on events.halls
  for each row execute function events.set_updated_at();

-- only a super-admin can publish/unpublish a hall or change its revenue share
-- (quality gate for the public window + money split — same guard shape as
-- maatefet.guard_instructor_status_change)
create or replace function events.guard_hall_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public, events
as $$
begin
  if (new.published is distinct from old.published
      or new.hall_share_bps is distinct from old.hall_share_bps)
     and not public.more30_is_super_admin() then
    raise exception 'only a super-admin can publish a hall or change its revenue share';
  end if;
  return new;
end;
$$;

create trigger trg_events_guard_hall_admin
  before update on events.halls
  for each row execute function events.guard_hall_admin_fields();

create policy halls_owner_or_admin on events.halls
  for all
  using (owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  with check (owner_auth_user_id = auth.uid() or public.more30_is_super_admin());

-- ---------- hall leads (טופס פנייה בדף הנחיתה) ----------
create table events.hall_leads (
  id uuid primary key default gen_random_uuid(),
  hall_id uuid not null references events.halls(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone text not null check (char_length(btrim(phone)) between 7 and 30),
  email text check (email is null or char_length(email) <= 160),
  event_type events.event_type,
  event_date date,
  message text check (message is null or char_length(message) <= 2000),
  status events.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_hall_leads_hall on events.hall_leads(hall_id, status);
alter table events.hall_leads enable row level security;
grant select on events.hall_leads to authenticated;
grant update (status) on events.hall_leads to authenticated;
grant all on events.hall_leads to service_role;

create trigger trg_events_hall_leads_updated_at
  before update on events.hall_leads
  for each row execute function events.set_updated_at();

-- insert happens only through the anon RPC (definer); owners read + triage
create policy hall_leads_owner_or_admin on events.hall_leads
  for select
  using (exists (
    select 1 from events.halls h
    where h.id = hall_id
      and (h.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ));

create policy hall_leads_owner_update on events.hall_leads
  for update
  using (exists (
    select 1 from events.halls h
    where h.id = hall_id
      and (h.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ))
  with check (exists (
    select 1 from events.halls h
    where h.id = hall_id
      and (h.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ));

-- ---------- events ----------
create table events.events (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  hall_id uuid references events.halls(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 2 and 140),
  event_type events.event_type not null default 'wedding',
  event_date date,
  event_time text check (event_time is null or event_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  venue_name text,
  address text,
  description text check (description is null or char_length(description) <= 4000),
  share_token text not null unique default events.new_token(),
  rsvp_enabled boolean not null default true,
  gifts_enabled boolean not null default true,
  gift_goal_agorot bigint check (gift_goal_agorot is null or gift_goal_agorot > 0),
  -- platform commission on gifts, applied at gift time into wallet_entries
  platform_fee_bps integer not null default 250 check (platform_fee_bps between 0 and 2000),
  status events.event_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_events_owner on events.events(owner_auth_user_id);
create index idx_events_events_hall on events.events(hall_id);
alter table events.events enable row level security;
grant select, insert, update, delete on events.events to authenticated;
grant all on events.events to service_role;

create trigger trg_events_events_updated_at
  before update on events.events
  for each row execute function events.set_updated_at();

create policy events_owner_or_admin on events.events
  for all
  using (owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  with check (owner_auth_user_id = auth.uid() or public.more30_is_super_admin());

-- hall owner sees (read-only) events hosted at their hall
create policy events_hall_owner_read on events.events
  for select
  using (exists (
    select 1 from events.halls h
    where h.id = hall_id and h.owner_auth_user_id = auth.uid()
  ));

-- ---------- guests (קישור אישי לכל מוזמן — בלי הרשמה) ----------
create table events.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  phone text,
  email text,
  group_name text,
  invited_count integer not null default 1 check (invited_count between 1 and 50),
  personal_token text not null unique default events.new_token(),
  rsvp_status events.rsvp_status not null default 'pending',
  rsvp_count integer check (rsvp_count is null or rsvp_count between 0 and 50),
  rsvp_note text check (rsvp_note is null or char_length(rsvp_note) <= 500),
  rsvp_at timestamptz,
  checkin_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_guests_event on events.guests(event_id, rsvp_status);
alter table events.guests enable row level security;
grant select, insert, update, delete on events.guests to authenticated;
grant all on events.guests to service_role;

create trigger trg_events_guests_updated_at
  before update on events.guests
  for each row execute function events.set_updated_at();

create policy guests_event_owner on events.guests
  for all
  using (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ))
  with check (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ));

-- ---------- gifts (מתנות באשראי — מצב טסט נעול ברמת ה-DB) ----------
create table events.gifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events(id) on delete cascade,
  guest_id uuid references events.guests(id) on delete set null,
  donor_name text not null check (char_length(btrim(donor_name)) between 1 and 120),
  donor_phone text,
  greeting text check (greeting is null or char_length(greeting) <= 1000),
  amount_agorot bigint not null check (amount_agorot between 100 and 10000000),
  currency text not null default 'ILS' check (currency = 'ILS'),
  -- 'test' until a provider is approved; the trigger below makes 'live'
  -- impossible to insert or update into existence
  mode text not null default 'test' check (mode in ('test', 'live')),
  provider text not null default 'test' check (provider in ('test', 'nedarim', 'payme')),
  provider_ref text,
  status events.gift_status not null default 'pending',
  thanked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_gifts_event on events.gifts(event_id, status);
alter table events.gifts enable row level security;
grant select on events.gifts to authenticated;
-- owner may only mark "thanked" — amounts/status are provider/RPC territory
grant update (thanked_at) on events.gifts to authenticated;
grant all on events.gifts to service_role;

create trigger trg_events_gifts_updated_at
  before update on events.gifts
  for each row execute function events.set_updated_at();

-- HARD test-mode lock: no code path (not even service_role) can record a live
-- charge until the provider integration + user approval exist and this guard
-- is replaced in a reviewed migration.
create or replace function events.guard_no_live_charges()
returns trigger
language plpgsql
set search_path = events
as $$
begin
  if new.mode = 'live' or new.provider <> 'test' then
    raise exception 'live charging is not enabled: payment provider (נדרים פלוס/PayMe split) pending user approval — TEST MODE only';
  end if;
  return new;
end;
$$;

create trigger trg_events_gifts_no_live
  before insert or update on events.gifts
  for each row execute function events.guard_no_live_charges();

-- event owner (and their hall, read-only) see gifts; giving is anon-RPC-only
create policy gifts_event_owner_read on events.gifts
  for select
  using (exists (
    select 1 from events.events e
    left join events.halls h on h.id = e.hall_id
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid()
           or h.owner_auth_user_id = auth.uid()
           or public.more30_is_super_admin())
  ));

-- owner may mark a gift as thanked (מעקב תודות) — nothing else
create policy gifts_event_owner_thank on events.gifts
  for update
  using (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ))
  with check (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ));

-- ---------- wallet ledger (ארנקים ועמלות — split לכל מתנה) ----------
create table events.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references events.gifts(id) on delete cascade,
  event_id uuid not null references events.events(id) on delete cascade,
  beneficiary text not null check (beneficiary in ('event_owner', 'platform', 'hall')),
  amount_agorot bigint not null check (amount_agorot >= 0),
  mode text not null default 'test' check (mode in ('test', 'live')),
  created_at timestamptz not null default now()
);
create index idx_events_wallet_event on events.wallet_entries(event_id, beneficiary);
alter table events.wallet_entries enable row level security;
grant select on events.wallet_entries to authenticated;
grant all on events.wallet_entries to service_role;

create policy wallet_event_owner_read on events.wallet_entries
  for select
  using (exists (
    select 1 from events.events e
    left join events.halls h on h.id = e.hall_id
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid()
           or h.owner_auth_user_id = auth.uid()
           or public.more30_is_super_admin())
  ));

-- ============================================================================
-- public.* API surface (evg_*) — same convention as maatefet_*/np_*
-- ============================================================================

-- ---------- anon: hall landing page ----------
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
    'cover_url', h.cover_url, 'gallery', h.gallery, 'brand', h.brand
  )
  from events.halls h
  where h.slug = lower(btrim(p_slug)) and h.published
  limit 1
$$;

revoke all on function public.evg_hall_public(text) from public;
grant execute on function public.evg_hall_public(text) to anon, authenticated;

-- ---------- anon: hall lead (טופס פנייה → ליד) ----------
create or replace function public.evg_hall_lead_create(
  p_slug text,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_event_type text default null,
  p_event_date date default null,
  p_message text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_hall_id uuid;
begin
  select id into v_hall_id from events.halls
  where slug = lower(btrim(p_slug)) and published;
  if v_hall_id is null then
    raise exception 'hall not found';
  end if;
  if p_event_type is not null
     and p_event_type not in ('wedding','bar_mitzvah','bat_mitzvah','brit','engagement','other') then
    raise exception 'invalid event type';
  end if;

  insert into events.hall_leads (hall_id, full_name, phone, email, event_type, event_date, message)
  values (v_hall_id, btrim(p_full_name), btrim(p_phone), nullif(btrim(coalesce(p_email,'')),''),
          p_event_type::events.event_type, p_event_date, nullif(btrim(coalesce(p_message,'')),''));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_hall_lead_create(text, text, text, text, text, date, text) from public;
grant execute on function public.evg_hall_lead_create(text, text, text, text, text, date, text) to anon, authenticated;

-- ---------- shared shape: public event payload + gift progress ----------
create or replace function events.event_public_payload(p_event_id uuid)
returns jsonb
language sql
stable
set search_path = events
as $$
  select jsonb_build_object(
    'title', e.title, 'event_type', e.event_type::text,
    'event_date', e.event_date, 'event_time', e.event_time,
    'venue_name', coalesce(e.venue_name, h.name),
    'address', coalesce(e.address, h.address),
    'description', e.description,
    'rsvp_enabled', e.rsvp_enabled, 'gifts_enabled', e.gifts_enabled,
    'status', e.status::text,
    'gift_goal_agorot', e.gift_goal_agorot,
    'gift_total_agorot', coalesce((
      select sum(g.amount_agorot) from events.gifts g
      where g.event_id = e.id and g.status = 'paid'), 0),
    'gift_count', coalesce((
      select count(*) from events.gifts g
      where g.event_id = e.id and g.status = 'paid'), 0),
    'test_mode', true
  )
  from events.events e
  left join events.halls h on h.id = e.hall_id
  where e.id = p_event_id
$$;

-- internal helper: only the definer wrappers below may call it
revoke all on function events.event_public_payload(uuid) from public, anon, authenticated;

-- ---------- anon: guest personal link (t=) ----------
create or replace function public.evg_guest_view(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = events, public
as $$
  select events.event_public_payload(g.event_id) || jsonb_build_object(
    'guest', jsonb_build_object(
      'full_name', g.full_name,
      'invited_count', g.invited_count,
      'rsvp_status', g.rsvp_status::text,
      'rsvp_count', g.rsvp_count,
      'rsvp_note', g.rsvp_note
    )
  )
  from events.guests g
  join events.events e on e.id = g.event_id
  where g.personal_token = btrim(p_token) and e.status <> 'canceled'
  limit 1
$$;

revoke all on function public.evg_guest_view(text) from public;
grant execute on function public.evg_guest_view(text) to anon, authenticated;

-- ---------- anon: open share link (s=) ----------
create or replace function public.evg_event_public(p_share_token text)
returns jsonb
language sql
stable
security definer
set search_path = events, public
as $$
  select events.event_public_payload(e.id)
  from events.events e
  where e.share_token = btrim(p_share_token) and e.status <> 'canceled'
  limit 1
$$;

revoke all on function public.evg_event_public(text) from public;
grant execute on function public.evg_event_public(text) to anon, authenticated;

-- ---------- anon: RSVP by personal token ----------
create or replace function public.evg_rsvp_submit(
  p_token text,
  p_status text,
  p_count integer default null,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_guest events.guests;
begin
  if p_status not in ('yes', 'no', 'maybe') then
    raise exception 'invalid rsvp status';
  end if;

  select g.* into v_guest
  from events.guests g
  join events.events e on e.id = g.event_id
  where g.personal_token = btrim(p_token)
    and e.status = 'active' and e.rsvp_enabled;
  if v_guest.id is null then
    raise exception 'invitation link not found or RSVP closed';
  end if;

  update events.guests set
    rsvp_status = p_status::events.rsvp_status,
    rsvp_count = case when p_status = 'yes'
                      then least(greatest(coalesce(p_count, invited_count), 0), 50)
                      else coalesce(p_count, 0) end,
    rsvp_note = nullif(btrim(coalesce(p_note,'')),''),
    rsvp_at = now()
  where id = v_guest.id;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

revoke all on function public.evg_rsvp_submit(text, text, integer, text) from public;
grant execute on function public.evg_rsvp_submit(text, text, integer, text) to anon, authenticated;

-- ---------- anon: give a gift (TEST MODE — no charge, DB-enforced) ----------
create or replace function public.evg_gift_create(
  p_token text,               -- guest personal token OR event share token
  p_donor_name text,
  p_amount_agorot bigint,
  p_donor_phone text default null,
  p_greeting text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_event events.events;
  v_guest_id uuid;
  v_guest_event_id uuid;
  v_gift_id uuid;
  v_fee bigint;
  v_hall_cut bigint := 0;
  v_hall_share_bps integer := 0;
begin
  -- resolve: personal token first, then share token; never list
  select g.id, g.event_id into v_guest_id, v_guest_event_id
  from events.guests g
  where g.personal_token = btrim(p_token)
  limit 1;
  if v_guest_event_id is not null then
    select e.* into v_event from events.events e where e.id = v_guest_event_id;
  else
    select e.* into v_event from events.events e
    where e.share_token = btrim(p_token) limit 1;
  end if;
  if v_event.id is null or v_event.status <> 'active' or not v_event.gifts_enabled then
    raise exception 'event not found or gifts closed';
  end if;

  insert into events.gifts (event_id, guest_id, donor_name, donor_phone, greeting,
                            amount_agorot, mode, provider, provider_ref, status)
  values (v_event.id, v_guest_id, btrim(p_donor_name),
          nullif(btrim(coalesce(p_donor_phone,'')),''),
          nullif(btrim(coalesce(p_greeting,'')),''),
          p_amount_agorot, 'test', 'test',
          'TEST-' || events.new_token(), 'paid')
  returning id into v_gift_id;

  -- wallet split: platform fee + optional hall share; remainder to the owner
  v_fee := (p_amount_agorot * v_event.platform_fee_bps) / 10000;
  if v_event.hall_id is not null then
    select hall_share_bps into v_hall_share_bps from events.halls where id = v_event.hall_id;
    v_hall_cut := (p_amount_agorot * coalesce(v_hall_share_bps, 0)) / 10000;
  end if;

  insert into events.wallet_entries (gift_id, event_id, beneficiary, amount_agorot, mode) values
    (v_gift_id, v_event.id, 'event_owner', p_amount_agorot - v_fee - v_hall_cut, 'test'),
    (v_gift_id, v_event.id, 'platform', v_fee, 'test');
  if v_hall_cut > 0 then
    insert into events.wallet_entries (gift_id, event_id, beneficiary, amount_agorot, mode)
    values (v_gift_id, v_event.id, 'hall', v_hall_cut, 'test');
  end if;

  return jsonb_build_object('ok', true, 'mode', 'test', 'amount_agorot', p_amount_agorot);
end;
$$;

revoke all on function public.evg_gift_create(text, text, bigint, text, text) from public;
grant execute on function public.evg_gift_create(text, text, bigint, text, text) to anon, authenticated;

-- ---------- authenticated: my state ----------
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

revoke all on function public.evg_me() from public;
grant execute on function public.evg_me() to authenticated;

-- ---------- authenticated: create/update hall ----------
create or replace function public.evg_hall_create(
  p_name text,
  p_slug text,
  p_city text default null,
  p_phone text default null,
  p_description text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;
  insert into events.halls (owner_auth_user_id, name, slug, city, phone, description)
  values (auth.uid(), btrim(p_name), lower(btrim(p_slug)),
          nullif(btrim(coalesce(p_city,'')),''), nullif(btrim(coalesce(p_phone,'')),''),
          nullif(btrim(coalesce(p_description,'')),''))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
exception when unique_violation then
  raise exception 'slug already taken';
end;
$$;

revoke all on function public.evg_hall_create(text, text, text, text, text) from public;
grant execute on function public.evg_hall_create(text, text, text, text, text) to authenticated;

create or replace function public.evg_hall_publish(p_hall_id uuid, p_published boolean)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  -- the halls guard trigger enforces super-admin; this is just the entrypoint
  update events.halls set published = p_published where id = p_hall_id;
  if not found then raise exception 'hall not found'; end if;
  return jsonb_build_object('ok', true, 'published', p_published);
end;
$$;

revoke all on function public.evg_hall_publish(uuid, boolean) from public;
grant execute on function public.evg_hall_publish(uuid, boolean) to authenticated;

-- ---------- authenticated: hall leads triage ----------
create or replace function public.evg_hall_leads_list(p_hall_id uuid)
returns setof events.hall_leads
language sql
stable
security invoker
set search_path = events, public
as $$
  select * from events.hall_leads
  where hall_id = p_hall_id
  order by (status = 'new') desc, created_at desc
$$;

revoke all on function public.evg_hall_leads_list(uuid) from public;
grant execute on function public.evg_hall_leads_list(uuid) to authenticated;

create or replace function public.evg_hall_lead_status(p_lead_id uuid, p_status text)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  if p_status not in ('new', 'contacted', 'closed') then
    raise exception 'invalid lead status';
  end if;
  update events.hall_leads set status = p_status::events.lead_status
  where id = p_lead_id;
  if not found then raise exception 'lead not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_hall_lead_status(uuid, text) from public;
grant execute on function public.evg_hall_lead_status(uuid, text) to authenticated;

-- ---------- authenticated: create/update event ----------
create or replace function public.evg_event_create(
  p_title text,
  p_event_type text default 'wedding',
  p_event_date date default null,
  p_event_time text default null,
  p_venue_name text default null,
  p_address text default null,
  p_description text default null,
  p_gift_goal_agorot bigint default null,
  p_hall_slug text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_hall_id uuid;
  v_row events.events;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;
  if p_event_type not in ('wedding','bar_mitzvah','bat_mitzvah','brit','engagement','other') then
    raise exception 'invalid event type';
  end if;
  if p_hall_slug is not null and btrim(p_hall_slug) <> '' then
    select id into v_hall_id from events.halls
    where slug = lower(btrim(p_hall_slug)) and published;
    if v_hall_id is null then raise exception 'hall not found'; end if;
  end if;

  insert into events.events (owner_auth_user_id, hall_id, title, event_type, event_date,
                             event_time, venue_name, address, description, gift_goal_agorot)
  values (auth.uid(), v_hall_id, btrim(p_title), p_event_type::events.event_type,
          p_event_date, nullif(btrim(coalesce(p_event_time,'')),''),
          nullif(btrim(coalesce(p_venue_name,'')),''),
          nullif(btrim(coalesce(p_address,'')),''),
          nullif(btrim(coalesce(p_description,'')),''), p_gift_goal_agorot)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'share_token', v_row.share_token);
end;
$$;

revoke all on function public.evg_event_create(text, text, date, text, text, text, text, bigint, text) from public;
grant execute on function public.evg_event_create(text, text, date, text, text, text, text, bigint, text) to authenticated;

create or replace function public.evg_event_status(p_event_id uuid, p_status text)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  if p_status not in ('draft', 'active', 'done', 'canceled') then
    raise exception 'invalid event status';
  end if;
  update events.events set status = p_status::events.event_status
  where id = p_event_id;
  if not found then raise exception 'event not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_event_status(uuid, text) from public;
grant execute on function public.evg_event_status(uuid, text) to authenticated;

-- ---------- authenticated: guests ----------
-- p_guests: [{full_name, phone?, group_name?, invited_count?}, ...] (max 500/call)
create or replace function public.evg_guests_add(p_event_id uuid, p_guests jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_inserted integer := 0;
  v_g jsonb;
begin
  if jsonb_typeof(p_guests) <> 'array' or jsonb_array_length(p_guests) = 0 then
    raise exception 'guests must be a non-empty array';
  end if;
  if jsonb_array_length(p_guests) > 500 then
    raise exception 'max 500 guests per call';
  end if;

  for v_g in select * from jsonb_array_elements(p_guests) loop
    insert into events.guests (event_id, full_name, phone, group_name, invited_count)
    values (
      p_event_id,
      btrim(v_g->>'full_name'),
      nullif(btrim(coalesce(v_g->>'phone','')),''),
      nullif(btrim(coalesce(v_g->>'group_name','')),''),
      least(greatest(coalesce((v_g->>'invited_count')::integer, 1), 1), 50)
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', v_inserted);
end;
$$;

revoke all on function public.evg_guests_add(uuid, jsonb) from public;
grant execute on function public.evg_guests_add(uuid, jsonb) to authenticated;

create or replace function public.evg_guest_delete(p_guest_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  delete from events.guests where id = p_guest_id;
  if not found then raise exception 'guest not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_guest_delete(uuid) from public;
grant execute on function public.evg_guest_delete(uuid) to authenticated;

-- QR check-in foundation (צ'ק-אין בכניסה): owner scans/click-marks arrival
create or replace function public.evg_guest_checkin(p_guest_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  update events.guests set checkin_at = now()
  where id = p_guest_id and checkin_at is null;
  if not found then raise exception 'guest not found or already checked in'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_guest_checkin(uuid) from public;
grant execute on function public.evg_guest_checkin(uuid) to authenticated;

-- ---------- authenticated: full event dashboard ----------
create or replace function public.evg_event_dashboard(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = events, public
as $$
  select jsonb_build_object(
    'event', (
      select jsonb_build_object(
        'id', e.id, 'title', e.title, 'event_type', e.event_type::text,
        'event_date', e.event_date, 'event_time', e.event_time,
        'venue_name', e.venue_name, 'address', e.address,
        'description', e.description, 'status', e.status::text,
        'share_token', e.share_token,
        'gift_goal_agorot', e.gift_goal_agorot,
        'platform_fee_bps', e.platform_fee_bps
      ) from events.events e where e.id = p_event_id
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'full_name', g.full_name, 'phone', g.phone,
        'group_name', g.group_name, 'invited_count', g.invited_count,
        'personal_token', g.personal_token,
        'rsvp_status', g.rsvp_status::text, 'rsvp_count', g.rsvp_count,
        'rsvp_note', g.rsvp_note, 'checkin_at', g.checkin_at
      ) order by g.created_at)
      from events.guests g where g.event_id = p_event_id), '[]'::jsonb),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'donor_name', g.donor_name, 'greeting', g.greeting,
        'amount_agorot', g.amount_agorot, 'mode', g.mode,
        'status', g.status::text, 'thanked_at', g.thanked_at,
        'created_at', g.created_at
      ) order by g.created_at desc)
      from events.gifts g where g.event_id = p_event_id and g.status = 'paid'), '[]'::jsonb),
    'wallet', coalesce((
      select jsonb_object_agg(w.beneficiary, w.total) from (
        select beneficiary, sum(amount_agorot) as total
        from events.wallet_entries where event_id = p_event_id
        group by beneficiary
      ) w), '{}'::jsonb)
  )
$$;

revoke all on function public.evg_event_dashboard(uuid) from public;
grant execute on function public.evg_event_dashboard(uuid) to authenticated;
