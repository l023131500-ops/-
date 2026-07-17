-- more30 · core registry schema
-- ============================================================================
-- SAFETY: This migration is ADDITIVE ONLY. It creates a NEW schema `core` and
-- new tables. It does NOT touch `public`, `zr_*`, or any existing live table.
-- It is NOT auto-applied. Review, then apply intentionally (see supabase/README.md).
-- ============================================================================

create schema if not exists core;

-- Category / stage enums kept in sync with packages/config/src/types.ts
do $$ begin
  create type core.project_category as enum (
    'hub','transcription','advertising','torah','finance','health',
    'commerce','rights','marketing','realestate','events','crm','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type core.project_stage as enum ('live','beta','wip','archived','protected');
exception when duplicate_object then null; end $$;

-- Registry: one row per system --------------------------------------------------
create table if not exists core.projects (
  number          text primary key,                 -- '01', '02', ...
  slug            text not null unique,
  repo            text not null,
  name            text not null,
  category        core.project_category not null default 'other',
  stage           core.project_stage not null default 'wip',
  live            boolean not null default false,
  supabase_schema text,                              -- null = not yet verified
  deploy_target   text,                              -- railway | vercel | netlify | lovable | unknown
  is_protected    boolean not null default false,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Bugs per project --------------------------------------------------------------
create table if not exists core.project_bugs (
  id          uuid primary key default gen_random_uuid(),
  project_num text not null references core.projects(number) on delete cascade,
  title       text not null,
  severity    text not null default 'medium',        -- low | medium | high | critical
  status      text not null default 'open',          -- open | in_progress | closed
  created_at  timestamptz not null default now()
);

-- Tasks per project -------------------------------------------------------------
create table if not exists core.project_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_num text not null references core.projects(number) on delete cascade,
  title       text not null,
  status      text not null default 'todo',          -- todo | doing | done
  created_at  timestamptz not null default now()
);

create index if not exists idx_project_bugs_project on core.project_bugs(project_num);
create index if not exists idx_project_tasks_project on core.project_tasks(project_num);

-- Convenience view for the admin dashboard --------------------------------------
create or replace view core.project_overview as
select
  p.number, p.slug, p.name, p.category, p.stage, p.live, p.deploy_target,
  p.is_protected, p.supabase_schema, p.note,
  coalesce(b.open_bugs, 0)  as open_bugs,
  coalesce(t.open_tasks, 0) as open_tasks
from core.projects p
left join (
  select project_num, count(*) as open_bugs
  from core.project_bugs where status <> 'closed' group by project_num
) b on b.project_num = p.number
left join (
  select project_num, count(*) as open_tasks
  from core.project_tasks where status <> 'done' group by project_num
) t on t.project_num = p.number
order by p.number;

-- RLS: consistent with the rest of the project (all tables RLS-enabled) ----------
alter table core.projects       enable row level security;
alter table core.project_bugs   enable row level security;
alter table core.project_tasks  enable row level security;

-- Read: anyone authenticated may read the registry (portal/admin).
do $$ begin
  create policy core_projects_read on core.projects
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Write: restricted to platform admins. Adjust to your existing admin table if
-- different (public.platform_admins exists in this project).
do $$ begin
  create policy core_projects_admin_write on core.projects
    for all using (
      exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
