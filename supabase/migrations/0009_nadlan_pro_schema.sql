-- more30 · 36 nadlan-pro — the broker/advisor management system (B2B)
-- ============================================================================
-- ADDITIVE ONLY. Creates a NEW schema `nadlan_pro`. Touches nothing in
-- `public`, `nadlan`, `core`, `zr_*`, or any existing live table.
--
-- Why `nadlan_pro` and not `crm`: system 30 (zchuyotpro-crm) already owns the
-- name `crm` as its public path, and `core.app_memberships.app_key` is derived
-- from that path. A schema called `crm` next to a system called crm that is a
-- different product would be a trap for whoever reads this next.
--
-- The consumer report (system 32) stays the single truth engine. Nothing here
-- recomputes a valuation or re-fetches a deal registry; property cards call
-- system 32 over HTTP and store the answer with the timestamp it was given.
-- ============================================================================

create schema if not exists nadlan_pro;

-- Enums ----------------------------------------------------------------------
-- Spelled out rather than left as free text: a pipeline whose stage names drift
-- between the UI and the database cannot be reported on.
do $$ begin
  create type nadlan_pro.member_role as enum ('owner', 'manager', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.contact_kind as enum ('buyer', 'seller', 'renter', 'landlord', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.lead_source as enum
    ('website_form', 'consumer_report', 'manual', 'import', 'referral', 'portal', 'other');
exception when duplicate_object then null; end $$;

-- The pipeline, in order. `lost` is terminal and deliberately outside the
-- ordering used for progress: a lost deal has not advanced, it has stopped.
do $$ begin
  create type nadlan_pro.deal_stage as enum
    ('lead', 'contacted', 'meeting', 'offer', 'contract', 'closed', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.property_status as enum ('active', 'under_offer', 'sold', 'frozen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.asset_type as enum
    ('apartment', 'house', 'penthouse', 'garden_apartment', 'duplex', 'land', 'commercial', 'office', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.activity_kind as enum
    ('note', 'call', 'meeting', 'showing', 'email', 'task', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.commission_status as enum ('pending', 'invoiced', 'collected', 'written_off');
exception when duplicate_object then null; end $$;

-- Offices and membership -----------------------------------------------------
-- An office is the tenant boundary. Every other row in this schema carries
-- office_id, and every policy starts from it.
create table if not exists nadlan_pro.offices (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  -- Broker licence number. Required on every offer and contract by the 2024
  -- ethics rules, so it lives on the office rather than being retyped.
  license_number  text,
  phone           text,
  email           text,
  address         text,
  city            text,
  logo_url        text,
  -- The office's own invoice-provider link. Null means "not connected", and
  -- the invoice button says so instead of producing a document.
  invoice_provider     text,
  invoice_provider_ref text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists nadlan_pro.office_members (
  office_id      uuid not null references nadlan_pro.offices(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           nadlan_pro.member_role not null default 'agent',
  full_name      text,
  -- An agent's personal licence number. Distinct from the office's: the
  -- disclosure on a contract names the individual who brokered it.
  license_number text,
  phone          text,
  email          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  primary key (office_id, user_id)
);

-- Contacts -------------------------------------------------------------------
create table if not exists nadlan_pro.contacts (
  id           uuid primary key default gen_random_uuid(),
  office_id    uuid not null references nadlan_pro.offices(id) on delete cascade,
  -- The agent who owns the relationship. An agent sees their own contacts; a
  -- manager sees the whole office.
  owner_id     uuid references auth.users(id) on delete set null,
  kind         nadlan_pro.contact_kind not null default 'buyer',
  full_name    text not null,
  phone        text,
  email        text,
  id_number    text,
  address      text,
  city         text,
  source       nadlan_pro.lead_source not null default 'manual',
  -- Free-form campaign / referrer label behind the source, for CAC. Kept
  -- separate from `source` so the enum stays reportable.
  source_detail text,
  tags         text[] not null default '{}',
  notes        text,
  -- Buyer criteria, used by the property matcher. Null fields mean "no
  -- preference" and are skipped by the match rather than treated as zero.
  want_city       text,
  want_min_rooms  numeric(3,1),
  want_max_price  numeric(14,2),
  want_min_area   int,
  want_asset_type nadlan_pro.asset_type,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_np_contacts_office  on nadlan_pro.contacts(office_id);
create index if not exists idx_np_contacts_owner   on nadlan_pro.contacts(owner_id);
create index if not exists idx_np_contacts_name    on nadlan_pro.contacts(office_id, full_name);
create index if not exists idx_np_contacts_phone   on nadlan_pro.contacts(office_id, phone);

-- Properties -----------------------------------------------------------------
create table if not exists nadlan_pro.properties (
  id            uuid primary key default gen_random_uuid(),
  office_id     uuid not null references nadlan_pro.offices(id) on delete cascade,
  owner_id      uuid references auth.users(id) on delete set null,
  -- The seller/landlord, as a contact.
  seller_contact_id uuid references nadlan_pro.contacts(id) on delete set null,
  title         text,
  address       text,
  city          text,
  -- The platform-wide property key. Same three fields system 32 keys on, so a
  -- card here and a report there are talking about the same object.
  gush          text,
  helka         text,
  tat_helka     text,
  asset_type    nadlan_pro.asset_type not null default 'apartment',
  rooms         numeric(3,1),
  area_sqm      int,
  floor         int,
  total_floors  int,
  price         numeric(14,2),
  status        nadlan_pro.property_status not null default 'active',
  -- Exclusivity has a legal expiry date; storing the flag without the date
  -- would make an expired exclusive look current.
  is_exclusive       boolean not null default false,
  exclusivity_until  date,
  description   text,
  images        text[] not null default '{}',
  -- The last truth-engine answer for this property, cached with the moment it
  -- was fetched. Never recomputed here — see the header.
  truth_report        jsonb,
  truth_report_at     timestamptz,
  truth_report_error  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_np_props_office on nadlan_pro.properties(office_id);
create index if not exists idx_np_props_owner  on nadlan_pro.properties(owner_id);
create index if not exists idx_np_props_status on nadlan_pro.properties(office_id, status);
create index if not exists idx_np_props_key    on nadlan_pro.properties(gush, helka, tat_helka);

-- Deals ----------------------------------------------------------------------
create table if not exists nadlan_pro.deals (
  id                uuid primary key default gen_random_uuid(),
  office_id         uuid not null references nadlan_pro.offices(id) on delete cascade,
  owner_id          uuid references auth.users(id) on delete set null,
  property_id       uuid references nadlan_pro.properties(id) on delete set null,
  buyer_contact_id  uuid references nadlan_pro.contacts(id) on delete set null,
  seller_contact_id uuid references nadlan_pro.contacts(id) on delete set null,
  title             text,
  stage             nadlan_pro.deal_stage not null default 'lead',
  price             numeric(14,2),
  -- Commission is stored as both the rate and the money. The rate alone would
  -- silently restate history every time a deal's price is corrected.
  commission_pct    numeric(5,2),
  commission_amount numeric(14,2),
  expected_close    date,
  closed_at         timestamptz,
  lost_reason       text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_np_deals_office on nadlan_pro.deals(office_id);
create index if not exists idx_np_deals_owner  on nadlan_pro.deals(owner_id);
create index if not exists idx_np_deals_stage  on nadlan_pro.deals(office_id, stage);

-- Every stage change, kept. "How long does an offer sit before it becomes a
-- contract" is unanswerable from a current-state column alone.
create table if not exists nadlan_pro.deal_stage_events (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references nadlan_pro.deals(id) on delete cascade,
  from_stage nadlan_pro.deal_stage,
  to_stage   nadlan_pro.deal_stage not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists idx_np_stage_events_deal on nadlan_pro.deal_stage_events(deal_id, changed_at);

-- The closing checklist. Rows are created per deal from a fixed default list
-- so a step can be renamed or reordered on one deal without touching others.
create table if not exists nadlan_pro.deal_checklist (
  id        uuid primary key default gen_random_uuid(),
  deal_id   uuid not null references nadlan_pro.deals(id) on delete cascade,
  step_key  text not null,
  label     text not null,
  sort      int  not null default 0,
  is_done   boolean not null default false,
  done_at   timestamptz,
  done_by   uuid references auth.users(id),
  note      text,
  unique (deal_id, step_key)
);

-- Activities and tasks --------------------------------------------------------
create table if not exists nadlan_pro.activities (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references nadlan_pro.offices(id) on delete cascade,
  -- An activity hangs off whichever of the three it is about. All three may be
  -- null for a standalone task.
  contact_id  uuid references nadlan_pro.contacts(id) on delete cascade,
  deal_id     uuid references nadlan_pro.deals(id) on delete cascade,
  property_id uuid references nadlan_pro.properties(id) on delete cascade,
  kind        nadlan_pro.activity_kind not null default 'note',
  title       text not null,
  body        text,
  due_at      timestamptz,
  is_done     boolean not null default false,
  done_at     timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create index if not exists idx_np_act_office  on nadlan_pro.activities(office_id, created_at desc);
create index if not exists idx_np_act_contact on nadlan_pro.activities(contact_id, created_at desc);
create index if not exists idx_np_act_deal    on nadlan_pro.activities(deal_id, created_at desc);
create index if not exists idx_np_act_due     on nadlan_pro.activities(assigned_to, due_at) where is_done = false;

-- Commissions ------------------------------------------------------------------
-- Split per member, so an office can pay two agents off one deal and still
-- reconcile. amount is money, not a share of a share.
create table if not exists nadlan_pro.commissions (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references nadlan_pro.offices(id) on delete cascade,
  deal_id    uuid not null references nadlan_pro.deals(id) on delete cascade,
  member_id  uuid references auth.users(id) on delete set null,
  -- Which side of the deal this commission is charged to.
  payer      text not null default 'buyer' check (payer in ('buyer', 'seller', 'both')),
  pct        numeric(5,2),
  amount     numeric(14,2),
  status     nadlan_pro.commission_status not null default 'pending',
  collected_at timestamptz,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_np_comm_deal   on nadlan_pro.commissions(deal_id);
create index if not exists idx_np_comm_office on nadlan_pro.commissions(office_id, status);

-- RLS ==========================================================================
-- Three levels, exactly as specified: an agent sees their own, a manager sees
-- the office, the global super admin sees everything.

-- The super-admin check reads core.super_admin_emails, which is the single
-- source of truth for the whole platform. Reading it needs SECURITY DEFINER
-- because the caller has no rights on `core`.
create or replace function nadlan_pro.is_super_admin()
returns boolean
language sql stable security definer
set search_path = core, public, pg_temp
as $$
  select exists (
    select 1 from core.super_admin_emails s
    where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Offices the caller belongs to. SECURITY DEFINER so that the membership
-- lookup itself is not subject to the policy that depends on it — without it
-- every policy on office_members would recurse.
create or replace function nadlan_pro.my_office_ids()
returns setof uuid
language sql stable security definer
set search_path = nadlan_pro, public, pg_temp
as $$
  select m.office_id from nadlan_pro.office_members m
  where m.user_id = auth.uid() and m.is_active;
$$;

-- True when the caller manages the office (owner or manager) or is the global
-- super admin. This is the "sees the whole office" test.
create or replace function nadlan_pro.manages_office(p_office uuid)
returns boolean
language sql stable security definer
set search_path = nadlan_pro, public, pg_temp
as $$
  select nadlan_pro.is_super_admin() or exists (
    select 1 from nadlan_pro.office_members m
    where m.office_id = p_office and m.user_id = auth.uid()
      and m.is_active and m.role in ('owner', 'manager')
  );
$$;

-- The row-level test used by every owned table: a manager (or the super admin)
-- reaches everything in the office; a member reaches rows that are theirs or
-- unassigned.
--
-- Membership is required on the non-manager path, and that is the whole point.
-- An earlier version read
--
--   manages_office(office) OR owner = auth.uid() OR (owner is null AND member)
--
-- whose middle branch never asked whether the caller belonged to that office.
-- It was meant as "an agent reaches their own rows" but said "anyone reaches
-- any row they claim to own" — and since the caller chooses owner_id on INSERT,
-- it granted write access to every office in the system. Caught by the
-- cross-office case in scripts/qa/nadlan-pro-smoke.ps1, which is why that test
-- signs in as a second real user instead of trusting the policy by reading it.
create or replace function nadlan_pro.can_touch(p_office uuid, p_owner uuid)
returns boolean
language sql stable security definer
set search_path = nadlan_pro, public, pg_temp
as $$
  select nadlan_pro.manages_office(p_office)
      or (
        p_office in (select nadlan_pro.my_office_ids())
        and (p_owner is null or p_owner = auth.uid())
      );
$$;

alter table nadlan_pro.offices            enable row level security;
alter table nadlan_pro.office_members     enable row level security;
alter table nadlan_pro.contacts           enable row level security;
alter table nadlan_pro.properties         enable row level security;
alter table nadlan_pro.deals              enable row level security;
alter table nadlan_pro.deal_stage_events  enable row level security;
alter table nadlan_pro.deal_checklist     enable row level security;
alter table nadlan_pro.activities         enable row level security;
alter table nadlan_pro.commissions        enable row level security;

-- Offices: any member reads; only a manager or the super admin writes.
do $$ begin
  create policy np_offices_read on nadlan_pro.offices for select
    using (nadlan_pro.is_super_admin() or id in (select nadlan_pro.my_office_ids()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy np_offices_write on nadlan_pro.offices for all
    using (nadlan_pro.manages_office(id))
    with check (nadlan_pro.manages_office(id));
exception when duplicate_object then null; end $$;

-- Membership: a member sees the roster of their own office (they need to know
-- who to assign a lead to); only a manager changes it.
do $$ begin
  create policy np_members_read on nadlan_pro.office_members for select
    using (nadlan_pro.is_super_admin() or office_id in (select nadlan_pro.my_office_ids()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy np_members_write on nadlan_pro.office_members for all
    using (nadlan_pro.manages_office(office_id))
    with check (nadlan_pro.manages_office(office_id));
exception when duplicate_object then null; end $$;

-- The owned tables all take the same shape: office_id says which tenant, and
-- owner_id says which agent inside it.
do $$ begin
  create policy np_contacts_all on nadlan_pro.contacts for all
    using (nadlan_pro.can_touch(office_id, owner_id))
    with check (nadlan_pro.can_touch(office_id, owner_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_properties_all on nadlan_pro.properties for all
    using (nadlan_pro.can_touch(office_id, owner_id))
    with check (nadlan_pro.can_touch(office_id, owner_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_deals_all on nadlan_pro.deals for all
    using (nadlan_pro.can_touch(office_id, owner_id))
    with check (nadlan_pro.can_touch(office_id, owner_id));
exception when duplicate_object then null; end $$;

-- Activities and commissions carry office_id but no owner column of their own;
-- office membership is the test, with managers able to reach everything.
do $$ begin
  create policy np_activities_all on nadlan_pro.activities for all
    using (nadlan_pro.can_touch(office_id, assigned_to))
    with check (nadlan_pro.can_touch(office_id, assigned_to));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_commissions_all on nadlan_pro.commissions for all
    using (nadlan_pro.can_touch(office_id, member_id))
    with check (nadlan_pro.can_touch(office_id, member_id));
exception when duplicate_object then null; end $$;

-- Children of a deal inherit the deal's reachability. Written as an EXISTS on
-- the parent rather than a duplicated office_id, so a deal that moves cannot
-- leave its checklist behind under the old rule.
do $$ begin
  create policy np_checklist_all on nadlan_pro.deal_checklist for all
    using (exists (select 1 from nadlan_pro.deals d
                   where d.id = deal_id and nadlan_pro.can_touch(d.office_id, d.owner_id)))
    with check (exists (select 1 from nadlan_pro.deals d
                        where d.id = deal_id and nadlan_pro.can_touch(d.office_id, d.owner_id)));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_stage_events_all on nadlan_pro.deal_stage_events for all
    using (exists (select 1 from nadlan_pro.deals d
                   where d.id = deal_id and nadlan_pro.can_touch(d.office_id, d.owner_id)))
    with check (exists (select 1 from nadlan_pro.deals d
                        where d.id = deal_id and nadlan_pro.can_touch(d.office_id, d.owner_id)));
exception when duplicate_object then null; end $$;

-- Triggers ---------------------------------------------------------------------
create or replace function nadlan_pro.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['offices', 'contacts', 'properties', 'deals'] loop
    execute format('drop trigger if exists trg_%1$s_touch on nadlan_pro.%1$s', t);
    execute format(
      'create trigger trg_%1$s_touch before update on nadlan_pro.%1$s
         for each row execute function nadlan_pro.touch_updated_at()', t);
  end loop;
end $$;

-- A stage change writes its own history row. Doing this in the database rather
-- than the API means a change made from SQL, an import or a future service is
-- recorded too — the audit is a property of the table, not of one caller.
create or replace function nadlan_pro.log_stage_change()
returns trigger language plpgsql
set search_path = nadlan_pro, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into nadlan_pro.deal_stage_events (deal_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, auth.uid());
  elsif new.stage is distinct from old.stage then
    insert into nadlan_pro.deal_stage_events (deal_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
    -- Closing is a fact with a time; recording it here keeps it true no matter
    -- which screen moved the card.
    if new.stage = 'closed' and new.closed_at is null then
      new.closed_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_deals_stage_log on nadlan_pro.deals;
create trigger trg_deals_stage_log
  after insert on nadlan_pro.deals
  for each row execute function nadlan_pro.log_stage_change();

drop trigger if exists trg_deals_stage_log_upd on nadlan_pro.deals;
create trigger trg_deals_stage_log_upd
  before update on nadlan_pro.deals
  for each row execute function nadlan_pro.log_stage_change();

-- Grants -----------------------------------------------------------------------
-- `nadlan_pro` is not an exposed schema and adding it needs a project restart
-- the owner declined (see NEEDS_USER). The app therefore reaches this schema
-- through SECURITY DEFINER functions in `public`, exactly as kesef does — see
-- 0010. These grants are for the service-role path and for the day the schema
-- is exposed; they are not what the app depends on today.
grant usage on schema nadlan_pro to authenticated, service_role;
grant select, insert, update, delete on all tables in schema nadlan_pro to authenticated;
grant all on all tables in schema nadlan_pro to service_role;
alter default privileges in schema nadlan_pro
  grant select, insert, update, delete on tables to authenticated;

revoke all on function nadlan_pro.is_super_admin()          from public, anon;
revoke all on function nadlan_pro.my_office_ids()           from public, anon;
revoke all on function nadlan_pro.manages_office(uuid)      from public, anon;
revoke all on function nadlan_pro.can_touch(uuid, uuid)     from public, anon;
grant execute on function nadlan_pro.is_super_admin()       to authenticated;
grant execute on function nadlan_pro.my_office_ids()        to authenticated;
grant execute on function nadlan_pro.manages_office(uuid)   to authenticated;
grant execute on function nadlan_pro.can_touch(uuid, uuid)  to authenticated;
