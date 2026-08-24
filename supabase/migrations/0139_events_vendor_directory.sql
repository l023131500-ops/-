-- more30 · 38-events-gifts — round 9: דירקטורי ספקים (vendor directory)
-- ============================================================================
-- EVENTS_BUILD.md §4: "דירקטורי ספקים (צלם/תזמורת/קייטרינג) — הכנסה נוספת
-- לפלטפורמה". Until now the budget (0138) let owners type a vendor by hand;
-- the platform itself had nothing to offer. This adds a curated directory the
-- super-admin manages, a public browse surface (the directory is marketing —
-- anon may read published vendors, same posture as evg_hall_public), and a
-- lead channel: a contact request through the platform is the revenue trail.
-- Directory categories reuse the exact events.expenses category list so a
-- vendor can be dropped straight into an event budget with zero mapping.
--
-- Additive only: two new tables + 7 new RPCs. Nothing existing is replaced.

-- ---------- curated vendor listings ----------
create table events.vendors (
  id uuid primary key default gen_random_uuid(),
  -- same fixed list as events.expenses.category — "add to budget" maps 1:1
  category text not null check (category in
    ('venue','catering','music','photography','clothing','design','transport','ceremony','other')),
  name text not null check (char_length(btrim(name)) between 1 and 140),
  city text check (city is null or char_length(city) <= 80),
  phone text check (phone is null or char_length(phone) <= 30),
  description text check (description is null or char_length(description) <= 1000),
  price_from_agorot bigint check (price_from_agorot is null
    or price_from_agorot between 0 and 100000000),
  website text check (website is null or char_length(website) <= 300),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_vendors_pub on events.vendors(category) where published;
alter table events.vendors enable row level security;
grant select, insert, update, delete on events.vendors to authenticated;
grant all on events.vendors to service_role;

create trigger trg_events_vendors_updated_at
  before update on events.vendors
  for each row execute function events.set_updated_at();

-- curation is super-admin only; everyone else reads through the definer RPC
create policy vendors_super_admin on events.vendors
  for all
  using (public.more30_is_super_admin())
  with check (public.more30_is_super_admin());

-- ---------- contact requests through the platform ----------
create table events.vendor_leads (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references events.vendors(id) on delete cascade,
  -- optional: which event the request came from (owner browsing their budget)
  event_id uuid references events.events(id) on delete set null,
  requester_auth_user_id uuid,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  phone text not null check (char_length(btrim(phone)) between 3 and 30),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);
create index idx_events_vendor_leads_vendor on events.vendor_leads(vendor_id);
alter table events.vendor_leads enable row level security;
grant select, insert, update, delete on events.vendor_leads to authenticated;
grant all on events.vendor_leads to service_role;

create policy vendor_leads_super_admin on events.vendor_leads
  for all
  using (public.more30_is_super_admin())
  with check (public.more30_is_super_admin());

-- ---------- public: browse published vendors ----------
create or replace function public.evg_vendors_list(p_category text default null)
returns jsonb
language sql
stable
security definer
set search_path = events, public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id, 'category', v.category, 'name', v.name, 'city', v.city,
    'phone', v.phone, 'description', v.description,
    'price_from_agorot', v.price_from_agorot, 'website', v.website
  ) order by v.category, v.name), '[]'::jsonb)
  from events.vendors v
  where v.published
    and (p_category is null or v.category = p_category)
$$;

revoke all on function public.evg_vendors_list(text) from public;
grant execute on function public.evg_vendors_list(text) to anon, authenticated;

-- ---------- public: contact request → vendor lead ----------
create or replace function public.evg_vendor_lead_create(
  p_vendor_id uuid,
  p_full_name text,
  p_phone text,
  p_note text default null,
  p_event_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
begin
  if not exists (select 1 from events.vendors where id = p_vendor_id and published) then
    raise exception 'vendor not found';
  end if;
  -- an event may only be attached by its own owner — otherwise the lead would
  -- leak "who is planning what" into the admin view under a forged event id
  if p_event_id is not null and not exists (
    select 1 from events.events e
    where e.id = p_event_id and e.owner_auth_user_id = auth.uid()
  ) then
    raise exception 'event not found';
  end if;

  insert into events.vendor_leads (vendor_id, event_id, requester_auth_user_id,
                                   full_name, phone, note)
  values (p_vendor_id, p_event_id, auth.uid(),
          btrim(p_full_name), btrim(p_phone),
          nullif(btrim(coalesce(p_note,'')),''));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_vendor_lead_create(uuid, text, text, text, uuid) from public;
grant execute on function public.evg_vendor_lead_create(uuid, text, text, text, uuid) to anon, authenticated;

-- ---------- super-admin: full directory + lead counts ----------
create or replace function public.evg_admin_vendors_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = events, public, auth
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;

  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', v.id, 'category', v.category, 'name', v.name, 'city', v.city,
    'phone', v.phone, 'description', v.description,
    'price_from_agorot', v.price_from_agorot, 'website', v.website,
    'published', v.published,
    'leads_total', (select count(*) from events.vendor_leads l where l.vendor_id = v.id),
    'leads_new', (select count(*) from events.vendor_leads l
                  where l.vendor_id = v.id and l.status = 'new')
  ) order by v.category, v.name) from events.vendors v), '[]'::jsonb);
end;
$$;

revoke all on function public.evg_admin_vendors_list() from public, anon;
grant execute on function public.evg_admin_vendors_list() to authenticated;

-- ---------- super-admin: create / update a listing ----------
create or replace function public.evg_admin_vendor_upsert(
  p_name text,
  p_category text,
  p_id uuid default null,
  p_city text default null,
  p_phone text default null,
  p_description text default null,
  p_price_from_agorot bigint default null,
  p_website text default null,
  p_published boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public, auth
as $$
declare
  v_id uuid;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;
  if p_category not in ('venue','catering','music','photography','clothing',
                        'design','transport','ceremony','other') then
    raise exception 'invalid vendor category';
  end if;

  if p_id is null then
    insert into events.vendors (category, name, city, phone, description,
                                price_from_agorot, website, published)
    values (p_category, btrim(p_name),
            nullif(btrim(coalesce(p_city,'')),''),
            nullif(btrim(coalesce(p_phone,'')),''),
            nullif(btrim(coalesce(p_description,'')),''),
            case when p_price_from_agorot is null then null
                 else greatest(p_price_from_agorot, 0) end,
            nullif(btrim(coalesce(p_website,'')),''),
            coalesce(p_published, true))
    returning id into v_id;
  else
    update events.vendors set
      category = p_category,
      name = btrim(p_name),
      city = nullif(btrim(coalesce(p_city,'')),''),
      phone = nullif(btrim(coalesce(p_phone,'')),''),
      description = nullif(btrim(coalesce(p_description,'')),''),
      price_from_agorot = case when p_price_from_agorot is null then null
                               else greatest(p_price_from_agorot, 0) end,
      website = nullif(btrim(coalesce(p_website,'')),''),
      published = coalesce(p_published, true)
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'vendor not found'; end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.evg_admin_vendor_upsert(text, text, uuid, text, text, text, bigint, text, boolean) from public, anon;
grant execute on function public.evg_admin_vendor_upsert(text, text, uuid, text, text, text, bigint, text, boolean) to authenticated;

-- ---------- super-admin: remove a listing ----------
create or replace function public.evg_admin_vendor_delete(p_vendor_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public, auth
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;
  delete from events.vendors where id = p_vendor_id;
  if not found then raise exception 'vendor not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_admin_vendor_delete(uuid) from public, anon;
grant execute on function public.evg_admin_vendor_delete(uuid) to authenticated;

-- ---------- super-admin: all contact requests ----------
create or replace function public.evg_admin_vendor_leads_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = events, public, auth
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;

  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', l.id, 'vendor_id', l.vendor_id,
    'vendor_name', v.name, 'vendor_category', v.category,
    'full_name', l.full_name, 'phone', l.phone, 'note', l.note,
    'status', l.status, 'created_at', l.created_at,
    'event_title', (select e.title from events.events e where e.id = l.event_id),
    'requester_email', (select u.email from auth.users u
                        where u.id = l.requester_auth_user_id)
  ) order by l.created_at desc)
  from (select * from events.vendor_leads order by created_at desc limit 200) l
  join events.vendors v on v.id = l.vendor_id), '[]'::jsonb);
end;
$$;

revoke all on function public.evg_admin_vendor_leads_list() from public, anon;
grant execute on function public.evg_admin_vendor_leads_list() to authenticated;

-- ---------- super-admin: work a lead ----------
create or replace function public.evg_admin_vendor_lead_status(p_lead_id uuid, p_status text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public, auth
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;
  if p_status not in ('new','contacted','closed') then
    raise exception 'invalid lead status';
  end if;
  update events.vendor_leads set status = p_status where id = p_lead_id;
  if not found then raise exception 'lead not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_admin_vendor_lead_status(uuid, text) from public, anon;
grant execute on function public.evg_admin_vendor_lead_status(uuid, text) to authenticated;
