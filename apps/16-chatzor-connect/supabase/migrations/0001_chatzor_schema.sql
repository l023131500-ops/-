-- ============================================================================
-- Chatzor Connect — schema `chatzor`  (migration 0001)
-- ----------------------------------------------------------------------------
-- A SEPARATE schema on the shared hub project (uhnrgujbdxhhmoxcjria). It does
-- NOT touch the live `public` schema or the protected `zr_*` schema.
--
-- ⚠️ NOT auto-applied. Apply only after explicit approval, e.g. via the Supabase
--    MCP `apply_migration`, then expose `chatzor` under Dashboard → API settings.
--
-- Design: multi-tenant from day one (`organization_id` everywhere) so the system
-- built for the Chatzor Hagelilit council can later be duplicated to others.
-- Security: RLS on every table. Public sees only PUBLISHED content. Writes are
-- limited to org admins / synagogue gabaim. PII tables allow public INSERT only.
-- ============================================================================

create schema if not exists chatzor;

-- updated_at helper -----------------------------------------------------------
create or replace function chatzor.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================================
-- Organizations & membership
-- ============================================================================
create table if not exists chatzor.organizations (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  logo_url     text,
  latitude     double precision,
  longitude    double precision,
  elevation    integer default 0,
  time_zone    text not null default 'Asia/Jerusalem',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Platform/council administrators (super_admin) per organization.
create table if not exists chatzor.org_admins (
  organization_id uuid not null references chatzor.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ============================================================================
-- Synagogues & their managers (gabaim)
-- ============================================================================
create table if not exists chatzor.synagogues (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references chatzor.organizations(id) on delete cascade,
  slug            text not null,
  name            text not null,
  nusach          text,
  address         text,
  latitude        double precision,
  longitude       double precision,
  brand_gradient  text,
  brand_primary   text,
  logo_url        text,
  description     text,
  donation_link   text,
  contact_phone   text,
  contact_email   text,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists chatzor.synagogue_admins (
  synagogue_id uuid not null references chatzor.synagogues(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (synagogue_id, user_id)
);

-- ============================================================================
-- Content: prayer times, teachers, lessons, announcements, activities
-- ============================================================================
create table if not exists chatzor.prayer_times (
  id           uuid primary key default gen_random_uuid(),
  synagogue_id uuid not null references chatzor.synagogues(id) on delete cascade,
  prayer_type  text not null check (prayer_type in ('shacharit','mincha','arvit','special')),
  label        text not null,
  time         text not null,           -- HH:MM (fixed community time, not a zman)
  day_rule     text,                    -- e.g. 'weekday' | 'shabbat' | 'sunday'
  sort_order   integer not null default 0,
  note         text,
  updated_at   timestamptz not null default now()
);

create table if not exists chatzor.teachers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references chatzor.organizations(id) on delete cascade,
  name            text not null,
  title           text,
  photo_url       text,
  created_at      timestamptz not null default now()
);

create table if not exists chatzor.lessons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references chatzor.organizations(id) on delete cascade,
  synagogue_id    uuid references chatzor.synagogues(id) on delete cascade,  -- null = community-wide
  teacher_id      uuid references chatzor.teachers(id) on delete set null,
  title           text not null,
  day             text,
  time            text,
  location        text,
  audience        text,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists chatzor.announcements (
  id           uuid primary key default gen_random_uuid(),
  synagogue_id uuid references chatzor.synagogues(id) on delete cascade,
  organization_id uuid references chatzor.organizations(id) on delete cascade,
  title        text not null,
  body         text,
  starts_at    timestamptz,
  ends_at      timestamptz,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists chatzor.community_services (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references chatzor.organizations(id) on delete cascade,
  name            text not null,
  category        text,
  description     text,
  contact         text,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================================
-- PII / inbound (public may INSERT only; reads restricted to admins/gabaim)
-- ============================================================================
create table if not exists chatzor.inquiries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references chatzor.organizations(id) on delete cascade,
  synagogue_id    uuid references chatzor.synagogues(id) on delete cascade,
  name            text not null,
  phone           text,
  email           text,
  subject         text,
  body            text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists chatzor.rabbi_questions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references chatzor.organizations(id) on delete cascade,
  name            text,
  contact         text,
  question        text not null,
  answer          text,
  is_public       boolean not null default false,
  answered_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists chatzor.azkarot_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references chatzor.organizations(id) on delete cascade,
  requester_name  text,
  contact         text,
  deceased_name   text,
  details         text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- Auto / cache
-- ============================================================================
create table if not exists chatzor.zmanim_cache (
  organization_id uuid not null references chatzor.organizations(id) on delete cascade,
  date            date not null,
  data            jsonb not null,
  computed_at     timestamptz not null default now(),
  primary key (organization_id, date)
);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','synagogues','lessons','announcements','community_services'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on chatzor.%I; '
      'create trigger set_updated_at before update on chatzor.%I '
      'for each row execute function chatzor.set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================================
-- Authorization helpers
-- ============================================================================
create or replace function chatzor.is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = chatzor as $$
  select exists (
    select 1 from chatzor.org_admins a
    where a.organization_id = org and a.user_id = auth.uid()
  );
$$;

create or replace function chatzor.manages_synagogue(syn uuid)
returns boolean language sql stable security definer set search_path = chatzor as $$
  select exists (
    select 1 from chatzor.synagogue_admins m
    where m.synagogue_id = syn and m.user_id = auth.uid()
  ) or exists (
    select 1 from chatzor.synagogues s
    join chatzor.org_admins a on a.organization_id = s.organization_id
    where s.id = syn and a.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table chatzor.organizations      enable row level security;
alter table chatzor.org_admins          enable row level security;
alter table chatzor.synagogues          enable row level security;
alter table chatzor.synagogue_admins    enable row level security;
alter table chatzor.prayer_times        enable row level security;
alter table chatzor.teachers            enable row level security;
alter table chatzor.lessons             enable row level security;
alter table chatzor.announcements       enable row level security;
alter table chatzor.community_services  enable row level security;
alter table chatzor.inquiries           enable row level security;
alter table chatzor.rabbi_questions     enable row level security;
alter table chatzor.azkarot_requests    enable row level security;
alter table chatzor.zmanim_cache        enable row level security;

-- Public, read-only content ---------------------------------------------------
create policy "org public read"        on chatzor.organizations     for select using (true);
create policy "syn public read"        on chatzor.synagogues        for select using (is_published);
create policy "prayer public read"     on chatzor.prayer_times      for select using (true);
create policy "teachers public read"   on chatzor.teachers          for select using (true);
create policy "lessons public read"    on chatzor.lessons           for select using (is_published);
create policy "ann public read"        on chatzor.announcements     for select using (is_published);
create policy "services public read"   on chatzor.community_services for select using (is_published);
create policy "zmanim public read"     on chatzor.zmanim_cache      for select using (true);
create policy "rabbi public answers"   on chatzor.rabbi_questions   for select using (is_public);

-- Admin manages the whole organization ---------------------------------------
create policy "org admin write"     on chatzor.organizations    for all
  using (chatzor.is_org_admin(id)) with check (chatzor.is_org_admin(id));
create policy "syn admin write"     on chatzor.synagogues       for all
  using (chatzor.is_org_admin(organization_id)) with check (chatzor.is_org_admin(organization_id));
create policy "teachers admin write" on chatzor.teachers        for all
  using (chatzor.is_org_admin(organization_id)) with check (chatzor.is_org_admin(organization_id));
create policy "services admin write" on chatzor.community_services for all
  using (chatzor.is_org_admin(organization_id)) with check (chatzor.is_org_admin(organization_id));

-- Gabaim manage their own synagogue's content --------------------------------
create policy "prayer gabai write"  on chatzor.prayer_times     for all
  using (chatzor.manages_synagogue(synagogue_id)) with check (chatzor.manages_synagogue(synagogue_id));
create policy "lessons gabai write" on chatzor.lessons          for all
  using (synagogue_id is not null and chatzor.manages_synagogue(synagogue_id))
  with check (synagogue_id is not null and chatzor.manages_synagogue(synagogue_id));
create policy "ann gabai write"     on chatzor.announcements    for all
  using (synagogue_id is not null and chatzor.manages_synagogue(synagogue_id))
  with check (synagogue_id is not null and chatzor.manages_synagogue(synagogue_id));

-- PII: public may INSERT (submit a form), only admins/gabaim may read/update ---
create policy "inquiries insert"    on chatzor.inquiries        for insert with check (true);
create policy "inquiries admin read" on chatzor.inquiries       for select
  using (chatzor.is_org_admin(organization_id) or (synagogue_id is not null and chatzor.manages_synagogue(synagogue_id)));
create policy "inquiries admin upd" on chatzor.inquiries        for update
  using (chatzor.is_org_admin(organization_id) or (synagogue_id is not null and chatzor.manages_synagogue(synagogue_id)));

create policy "rabbiq insert"       on chatzor.rabbi_questions  for insert with check (true);
create policy "rabbiq admin all"    on chatzor.rabbi_questions  for all
  using (chatzor.is_org_admin(organization_id)) with check (chatzor.is_org_admin(organization_id));

create policy "azkarot insert"      on chatzor.azkarot_requests for insert with check (true);
create policy "azkarot admin read"  on chatzor.azkarot_requests for select using (chatzor.is_org_admin(organization_id));
create policy "azkarot admin upd"   on chatzor.azkarot_requests for update using (chatzor.is_org_admin(organization_id));

-- Membership tables: readable/manageable by org admins ------------------------
create policy "orgadmins read"  on chatzor.org_admins       for select using (chatzor.is_org_admin(organization_id));
create policy "synadmins read"  on chatzor.synagogue_admins for select
  using (chatzor.manages_synagogue(synagogue_id));

-- ============================================================================
-- Seed: the founding organization (Chatzor Hagelilit religious council)
-- ============================================================================
insert into chatzor.organizations (slug, name, description, latitude, longitude, elevation, time_zone)
values ('chatzor-hagelilit', 'המועצה הדתית חצור הגלילית',
        'כל המידע התורני והקהילתי של חצור הגלילית במקום אחד.',
        32.9797, 35.5386, 350, 'Asia/Jerusalem')
on conflict (slug) do nothing;
