-- igud-ads schema. Run in Supabase SQL Editor.

create schema if not exists ads;
grant usage on schema ads to anon, authenticated, service_role;
grant all on all tables in schema ads to service_role;
grant all on all sequences in schema ads to service_role;
alter default privileges in schema ads grant all on tables to service_role;
alter default privileges in schema ads grant all on sequences to service_role;

create table if not exists ads.ad_coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  max_designs int not null default 3,
  used_designs int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  note text,
  created_at timestamptz default now()
);

create table if not exists ads.ad_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  thumbnail_url text,
  category text not null check (category in ('shiur','gmach','beis_knesset','tefilla','event','other')),
  layout_json jsonb,
  is_active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists ads.ad_projects (
  id uuid default gen_random_uuid() primary key,
  coupon_id uuid references ads.ad_coupons,
  uploader_email text,
  mode text not null check (mode in ('new','clone')),
  status text not null default 'draft' check (status in ('draft','generating','ready','completed','error')),
  parameters jsonb not null default '{}'::jsonb,
  source_image_path text,
  selected_generation_id uuid,
  category text,
  title text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists ad_projects_status_idx on ads.ad_projects(status);
create index if not exists ad_projects_email_idx on ads.ad_projects(uploader_email);

create table if not exists ads.ad_generations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references ads.ad_projects on delete cascade,
  variation_num int not null,
  image_url text,
  storage_path text,
  prompt_used text,
  composited boolean not null default false,
  whatsapp_url text,
  pdf_url text,
  selected boolean not null default false,
  model_used text,
  cost_estimate numeric(10,4),
  created_at timestamptz default now()
);
create index if not exists ad_generations_project_idx on ads.ad_generations(project_id);

create table if not exists ads.ad_jobs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references ads.ad_projects on delete cascade,
  type text not null check (type in ('generate','clone_analyze','composite','pdf_export')),
  status text not null default 'pending' check (status in ('pending','running','done','error')),
  payload jsonb, result jsonb, error_message text,
  attempts int not null default 0,
  started_at timestamptz, finished_at timestamptz, created_at timestamptz default now()
);
create index if not exists ad_jobs_status_idx on ads.ad_jobs(status);

create table if not exists ads.ad_settings (
  key text primary key, value text, updated_at timestamptz default now()
);

create table if not exists ads.ad_audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_email text, action text not null,
  entity_type text, entity_id uuid, details jsonb,
  created_at timestamptz default now()
);

alter table ads.ad_coupons enable row level security;
alter table ads.ad_templates enable row level security;
alter table ads.ad_projects enable row level security;
alter table ads.ad_generations enable row level security;
alter table ads.ad_jobs enable row level security;
alter table ads.ad_settings enable row level security;
alter table ads.ad_audit_log enable row level security;

create policy templates_public_read on ads.ad_templates for select using (is_active = true);
create policy projects_own_read on ads.ad_projects for select using (uploader_email = auth.email());
create policy generations_own_read on ads.ad_generations for select
  using (exists (select 1 from ads.ad_projects p where p.id = project_id and p.uploader_email = auth.email()));

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ad-sources','ad-sources', false, 20971520, ARRAY['image/png','image/jpeg','image/webp','image/jpg']),
  ('ad-outputs','ad-outputs', false, 52428800, ARRAY['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Added after the original bootstrap above (payments, notifications, per-app
-- settings, admin users) -- synced 20/08/2026 against the live schema so this
-- file is a complete, runnable setup script again, not partial documentation.
-- ---------------------------------------------------------------------------

alter table ads.ad_projects add column if not exists template_id uuid references ads.ad_templates;
alter table ads.ad_projects add column if not exists logo_path text;
alter table ads.ad_projects add column if not exists customer_data jsonb default '{}'::jsonb;

alter table ads.ad_coupons add column if not exists owner_email text;
create index if not exists ad_coupons_owner_email_idx on ads.ad_coupons(owner_email);

alter table ads.ad_templates add column if not exists prompt_template text;
alter table ads.ad_templates add column if not exists required_fields jsonb default '[]'::jsonb;
alter table ads.ad_templates add column if not exists optional_fields jsonb default '[]'::jsonb;
alter table ads.ad_templates add column if not exists style_rules jsonb default '{}'::jsonb;
alter table ads.ad_templates add column if not exists price_nis int default 0;
alter table ads.ad_templates add column if not exists allows_logo boolean default true;
alter table ads.ad_templates add column if not exists allows_custom_colors boolean default true;
alter table ads.ad_templates add column if not exists aspect_ratio text default '1:1';
alter table ads.ad_templates add column if not exists dalle_size text default '1024x1024';

create table if not exists ads.ad_app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  label text,
  updated_by uuid,
  updated_at timestamptz default now()
);

create table if not exists ads.ad_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid unique references auth.users on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'customer' check (role in ('super_admin','admin','customer','viewer')),
  permissions jsonb default '{}'::jsonb,
  is_active boolean default true,
  coupon_id uuid references ads.ad_coupons,
  notes text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists ad_users_email_idx on ads.ad_users(email);
create index if not exists ad_users_role_idx on ads.ad_users(role);

create table if not exists ads.ad_payments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references ads.ad_projects on delete set null,
  user_email text,
  user_id uuid references auth.users on delete set null,
  amount numeric not null default 0,
  currency text default 'ILS',
  status text not null default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  provider text default 'nedarim_plus',
  provider_transaction_id text,
  description text,
  payer_name text,
  payer_phone text,
  raw_webhook jsonb,
  coupon_granted_id uuid references ads.ad_coupons,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists ad_payments_project_idx on ads.ad_payments(project_id);
create index if not exists ad_payments_email_idx on ads.ad_payments(user_email);
create index if not exists ad_payments_status_idx on ads.ad_payments(status);
create index if not exists ad_payments_created_idx on ads.ad_payments(created_at desc);
-- Webhook idempotency guard -- see app/api/payments/webhook/route.ts.
create unique index if not exists ad_payments_project_txn_uniq
  on ads.ad_payments(project_id, provider_transaction_id)
  where provider_transaction_id is not null;

create table if not exists ads.ad_notifications (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  user_id uuid references auth.users on delete cascade,
  type text not null check (type in ('payment_success','payment_failed','project_ready','transcribe_ready','coupon_low','welcome','custom')),
  title text not null,
  body text,
  link_url text,
  is_read boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists ad_notifications_user_email_idx on ads.ad_notifications(user_email, is_read);
create index if not exists ad_notifications_user_id_idx on ads.ad_notifications(user_id, is_read);
create index if not exists ad_notifications_created_idx on ads.ad_notifications(created_at desc);

alter table ads.ad_app_settings enable row level security;
alter table ads.ad_users enable row level security;
alter table ads.ad_payments enable row level security;
alter table ads.ad_notifications enable row level security;

-- ---------------------------------------------------------------------------
-- Public bridge views + security fix (20/08/2026).
--
-- The server code (lib/supabase/server.ts) queries these table names through
-- PostgREST's default "public" schema, so each `ads.*` table needs a same-name
-- view in `public`. These were originally created SECURITY DEFINER with
-- SELECT/INSERT/UPDATE/DELETE granted to anon + authenticated -- meaning
-- anyone holding the public anon key (shipped in every client bundle) could
-- read and write payment records (amounts, payer name/phone, raw Nedarim
-- webhook payloads) and admin-user records (email, role, permissions) with
-- zero authentication, because a SECURITY DEFINER view bypasses the querying
-- role's own grants/RLS and runs as the view owner.
--
-- Fixed live via Supabase migration `lock_down_public_ads_security_definer_views`
-- (revoke anon/authenticated + switch to security_invoker) after confirming
-- every real call site uses the service-role client only. This block
-- reproduces that fix here so a fresh environment set up from this file
-- starts locked down, not exposed.
-- ---------------------------------------------------------------------------

create or replace view public.ad_app_settings with (security_invoker = true) as
  select key, value, label, updated_by, updated_at from ads.ad_app_settings;
create or replace view public.ad_coupons with (security_invoker = true) as
  select id, code, max_designs, used_designs, expires_at, is_active, note, created_at, owner_email from ads.ad_coupons;
create or replace view public.ad_notifications with (security_invoker = true) as
  select id, user_email, user_id, type, title, body, link_url, is_read, metadata, created_at from ads.ad_notifications;
create or replace view public.ad_payments with (security_invoker = true) as
  select id, project_id, user_email, user_id, amount, currency, status, provider, provider_transaction_id,
         description, payer_name, payer_phone, raw_webhook, coupon_granted_id, created_at, updated_at
    from ads.ad_payments;
create or replace view public.ad_projects with (security_invoker = true) as
  select id, coupon_id, uploader_email, mode, status, parameters, source_image_path, selected_generation_id,
         category, title, error_message, created_at, updated_at, template_id, logo_path, customer_data
    from ads.ad_projects;
create or replace view public.ad_templates with (security_invoker = true) as
  select id, name, description, thumbnail_url, category, layout_json, is_active, sort_order, created_at,
         prompt_template, required_fields, optional_fields, style_rules, price_nis, allows_logo,
         allows_custom_colors, aspect_ratio, dalle_size
    from ads.ad_templates;
create or replace view public.ad_users with (security_invoker = true) as
  select id, user_id, email, display_name, role, permissions, is_active, coupon_id, notes, created_by, created_at, updated_at
    from ads.ad_users;

revoke all on public.ad_app_settings, public.ad_coupons, public.ad_notifications, public.ad_payments,
  public.ad_projects, public.ad_templates, public.ad_users
  from anon, authenticated, public;
grant all on public.ad_app_settings, public.ad_coupons, public.ad_notifications, public.ad_payments,
  public.ad_projects, public.ad_templates, public.ad_users
  to service_role;
