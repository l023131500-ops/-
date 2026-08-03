-- ============================================================================
-- Torah Platform · Migration 001 · Core Multi-Tenant Schema
-- ============================================================================
-- Foundation: tenants, memberships, roles, branding, features.
-- Every business table downstream references tenant_id and uses RLS.
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================
do $$ begin
  create type tenant_type as enum (
    'super_admin',         -- איגוד השיעורים – המנהל העליון
    'religious_council',   -- מועצה דתית
    'organization',        -- ארגון תורני
    'synagogue',           -- בית כנסת
    'maggid',              -- מגיד שיעור עצמאי
    'rabbi',               -- רב / מורה הוראה
    'mori_horaah'          -- מורה הוראה
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tenant_status as enum ('pending','active','suspended','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum (
    'super_admin',     -- אדמין של איגוד השיעורים
    'tenant_admin',    -- אדמין של טננט ספציפי
    'moderator',
    'member',          -- חבר רגיל (גבאי / חבר ארגון / מתפלל / מגיד שיעור)
    'viewer'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TENANTS – שורש המערכת
-- ============================================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                       -- "igud", "mc-galil", "mehubarim"
  type tenant_type not null,
  name text not null,                              -- "איגוד השיעורים"
  display_name text,                               -- שם תצוגה ארוך יותר
  parent_tenant_id uuid references public.tenants(id) on delete set null,
  status tenant_status not null default 'pending',
  custom_domain text unique,                       -- "mc-galil.org.il" (אופציונלי)
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  region text,                                     -- "צפון", "ירושלים", וכו'
  city text,
  address text,
  description text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz
);

create index if not exists idx_tenants_type on public.tenants(type);
create index if not exists idx_tenants_parent on public.tenants(parent_tenant_id);
create index if not exists idx_tenants_status on public.tenants(status);

-- ============================================================================
-- TENANT BRANDING – White-Label לכל טננט
-- ============================================================================
create table if not exists public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  primary_color text not null default '#1A2E5A',
  secondary_color text not null default '#C9A84C',
  accent_color text not null default '#F2D678',
  background_color text not null default '#FFFFFF',
  text_color text not null default '#0F172A',
  font_heading text not null default 'Noto Serif Hebrew',
  font_body text not null default 'Rubik',
  background_style text default 'plain',           -- "plain", "gradient-1"..."gradient-24", "image"
  background_image_url text,
  animations_enabled boolean not null default true,
  logo_url text,
  favicon_url text,
  hero_image_url text,
  site_name text,
  site_tagline text,
  footer_text text default 'מבית איגוד השיעורים',
  show_union_footer boolean not null default true,
  social_links jsonb not null default '{}'::jsonb,
  custom_css text,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- TENANT FEATURES – מתג ON/OFF פר מודול
-- ============================================================================
create table if not exists public.tenant_features (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,

  -- Core
  public_site boolean not null default true,
  member_portal boolean not null default true,
  forums boolean not null default true,
  leads_inbox boolean not null default true,
  questionnaires boolean not null default true,

  -- Torah-content
  lessons boolean not null default true,
  study_schedule boolean not null default true,     -- לוח הספק לימודי
  prayer_times boolean not null default false,
  zmanim boolean not null default true,
  halacha_daily boolean not null default false,
  ask_rabbi boolean not null default false,

  -- Religious-council specifics
  kashrut boolean not null default false,
  mourning_guide boolean not null default false,
  mikvaot boolean not null default false,
  community_services boolean not null default false,
  newsletter boolean not null default false,
  ad_banners boolean not null default false,

  -- Maggid specifics
  participants boolean not null default true,
  materials_upload boolean not null default true,
  png_export boolean not null default true,
  matching_available boolean not null default false, -- "פנוי למסירת שיעורים נוספים"

  -- Organization specifics
  bulk_lesson_upload boolean not null default false,
  ivr_builder boolean not null default false,
  lesson_directory boolean not null default false,

  -- Commerce
  donations boolean not null default false,
  recurring_donations boolean not null default false,
  shop boolean not null default false,
  dedications boolean not null default false,

  -- Communication
  whatsapp_integration boolean not null default false,
  email_integration boolean not null default false,
  yemot_integration boolean not null default false,

  -- AI
  ai_matching boolean not null default false,

  custom_features jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- TENANT SUBSCRIPTIONS – רישיון
-- ============================================================================
create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan text not null default 'standard',            -- "trial","standard","premium","union"
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  payment_method text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_subs_tenant on public.tenant_subscriptions(tenant_id);

-- ============================================================================
-- USER ROLES – הרשאות פר משתמש פר טננט
-- ============================================================================
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,  -- null = global (super_admin)
  role app_role not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_user_roles_tenant on public.user_roles(tenant_id);

-- ============================================================================
-- PROFILES – פרופיל משתמש מאוחד (גלובלי)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  phone text,
  whatsapp text,
  city text,
  neighborhood text,
  address text,
  language text default 'he',
  birthday date,
  avatar_url text,
  bio text,
  preferred_tenant_id uuid references public.tenants(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- MEMBERSHIPS – קישור user↔tenant
-- ============================================================================
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'member',
  status text not null default 'active',  -- active / invited / suspended
  joined_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  unique (tenant_id, user_id)
);
create index if not exists idx_memberships_tenant on public.memberships(tenant_id);
create index if not exists idx_memberships_user on public.memberships(user_id);

-- ============================================================================
-- TENANT INVITES
-- ============================================================================
create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  invite_code text unique not null default encode(gen_random_bytes(8),'hex'),
  initial_password text not null,
  role app_role not null default 'tenant_admin',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_at timestamptz,
  user_id uuid references auth.users(id) on delete set null
);
create index if not exists idx_invites_code on public.tenant_invites(invite_code);
create index if not exists idx_invites_email on public.tenant_invites(email);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  diff jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_tenant on public.audit_log(tenant_id);
create index if not exists idx_audit_action on public.audit_log(action);

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER – למניעת רקורסיה ב-RLS)
-- ============================================================================
create or replace function public.is_super_admin(_uid uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _uid
      and role = 'super_admin'
      and tenant_id is null
  );
$$;

create or replace function public.has_tenant_role(_uid uuid, _tenant_id uuid, _role app_role)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _uid
      and tenant_id = _tenant_id
      and role = _role
  ) or public.is_super_admin(_uid);
$$;

create or replace function public.user_tenants(_uid uuid)
returns setof uuid
language sql security definer stable
as $$
  select tenant_id from public.memberships where user_id = _uid and status = 'active'
  union
  select tenant_id from public.user_roles where user_id = _uid and tenant_id is not null;
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.tenants enable row level security;
alter table public.tenant_branding enable row level security;
alter table public.tenant_features enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.tenant_invites enable row level security;
alter table public.audit_log enable row level security;

-- TENANTS – everyone reads active+public tenants; only super_admin / tenant_admin write
drop policy if exists "tenants_read_public" on public.tenants;
create policy "tenants_read_public" on public.tenants
  for select using (status = 'active' or auth.uid() in (
    select user_id from public.memberships where memberships.tenant_id = tenants.id
  ) or public.is_super_admin(auth.uid()));

drop policy if exists "tenants_super_admin_all" on public.tenants;
create policy "tenants_super_admin_all" on public.tenants
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

drop policy if exists "tenants_admin_update_own" on public.tenants;
create policy "tenants_admin_update_own" on public.tenants
  for update using (public.has_tenant_role(auth.uid(), id, 'tenant_admin'));

-- BRANDING – read public, write by tenant admin
drop policy if exists "branding_read" on public.tenant_branding;
create policy "branding_read" on public.tenant_branding for select using (true);

drop policy if exists "branding_write" on public.tenant_branding;
create policy "branding_write" on public.tenant_branding
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  with check (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

-- FEATURES – read public, write only super_admin
drop policy if exists "features_read" on public.tenant_features;
create policy "features_read" on public.tenant_features for select using (true);

drop policy if exists "features_write" on public.tenant_features;
create policy "features_write" on public.tenant_features
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- USER_ROLES – self read, super_admin write
drop policy if exists "user_roles_self_read" on public.user_roles;
create policy "user_roles_self_read" on public.user_roles for select using (user_id = auth.uid() or public.is_super_admin(auth.uid()));

drop policy if exists "user_roles_super_admin_write" on public.user_roles;
create policy "user_roles_super_admin_write" on public.user_roles
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- PROFILES – self full access, others read minimal
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_read_basic" on public.profiles;
create policy "profiles_read_basic" on public.profiles for select using (true);

-- MEMBERSHIPS – members see own tenants, tenant_admin sees all in tenant
drop policy if exists "memberships_self_read" on public.memberships;
create policy "memberships_self_read" on public.memberships
  for select using (user_id = auth.uid()
    or public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin')
    or public.is_super_admin(auth.uid()));

drop policy if exists "memberships_admin_write" on public.memberships;
create policy "memberships_admin_write" on public.memberships
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  with check (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

-- INVITES – tenant_admin manages, public can validate code via Edge Function (service_role)
drop policy if exists "invites_admin" on public.tenant_invites;
create policy "invites_admin" on public.tenant_invites
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  with check (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

-- AUDIT – read by tenant admin / super admin
drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log
  for select using (
    public.is_super_admin(auth.uid())
    or (tenant_id is not null and public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  );

-- SUBSCRIPTIONS – read by tenant_admin, write super_admin only
drop policy if exists "subs_read" on public.tenant_subscriptions;
create policy "subs_read" on public.tenant_subscriptions
  for select using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

drop policy if exists "subs_super_admin_write" on public.tenant_subscriptions;
create policy "subs_super_admin_write" on public.tenant_subscriptions
  for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- AUTO-CREATE BRANDING + FEATURES ON TENANT INSERT
-- ============================================================================
create or replace function public.handle_new_tenant()
returns trigger language plpgsql security definer as $$
begin
  insert into public.tenant_branding (tenant_id, site_name)
  values (new.id, new.name)
  on conflict (tenant_id) do nothing;

  insert into public.tenant_features (tenant_id)
  values (new.id)
  on conflict (tenant_id) do nothing;
  return new;
end $$;

drop trigger if exists on_tenant_created on public.tenants;
create trigger on_tenant_created
  after insert on public.tenants
  for each row execute function public.handle_new_tenant();

-- ============================================================================
-- updated_at auto-bump
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_tenants_upd on public.tenants;
create trigger trg_tenants_upd before update on public.tenants for each row execute function public.set_updated_at();

drop trigger if exists trg_branding_upd on public.tenant_branding;
create trigger trg_branding_upd before update on public.tenant_branding for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_upd on public.profiles;
create trigger trg_profiles_upd before update on public.profiles for each row execute function public.set_updated_at();
