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
