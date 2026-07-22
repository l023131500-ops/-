-- more30 · core registry — Phase 1 extension
-- ============================================================================
-- ADDITIVE ONLY. Extends the `core` schema created in 0001. Touches nothing in
-- `public` except creating NEW read-only views/RPCs prefixed `more30_`. Does not
-- touch `zr_*`, `nadlan`, or any live table.
--
-- IMPORTANT CORRECTION vs the original design: systems are NOT on one shared
-- Supabase project. Verified by reading every repo — there are ~10 distinct
-- projects (uhnrgujb=nadlan, bieebmnm=igud group, csjekrvu=bkalut/kupot cluster,
-- mwljkonw=chatzor/galilee, pwcswdfg=bkalut-app, trerolyv=get-your-rights,
-- jhbeelzv=zchuyotpro, hkkky=egod, aypsq=mthbram, ygaqq=hebrew-bridge). core lives
-- on uhnrgujb (the ops project) only, as a registry — it does NOT connect to them.
-- ============================================================================

-- 1) New scalar columns on the registry ----------------------------------------
alter table core.projects add column if not exists department   text;
alter table core.projects add column if not exists is_deployed  boolean not null default false;
alter table core.projects add column if not exists live_url     text;
alter table core.projects add column if not exists admin_url     text;
alter table core.projects add column if not exists to_delete    boolean not null default false;

-- 2) Bidirectional tasks: who authored the task (claude adds, user adds) --------
alter table core.project_tasks add column if not exists author text not null default 'claude';
-- author: 'claude' | 'user'

-- 3) Missing-token registry (Phase D) ------------------------------------------
create table if not exists core.missing_tokens (
  id             uuid primary key default gen_random_uuid(),
  project_num    text references core.projects(number) on delete cascade,
  env_var        text not null,
  purpose        text,
  obtain_url     text,           -- where to generate the key
  paste_location text,           -- where to paste it (deploy service Variables page)
  status         text not null default 'missing',   -- missing | provided
  created_at     timestamptz not null default now()
);
create index if not exists idx_missing_tokens_project on core.missing_tokens(project_num);

-- 4) Automations registry (Phase E — registration ONLY, not built) -------------
create table if not exists core.automations (
  id              uuid primary key default gen_random_uuid(),
  key             text unique not null,     -- yemot | resend | n8n
  name            text not null,
  kind            text not null,            -- telephony | email | orchestration
  status          text not null default 'planned', -- planned | connected
  required_tokens jsonb not null default '[]'::jsonb,
  note            text,
  is_protected    boolean not null default false,   -- n8n NEDARIM3873 = true
  created_at      timestamptz not null default now()
);

alter table core.missing_tokens enable row level security;
alter table core.automations    enable row level security;

-- Read: authenticated (for direct core access); write: super admins only.
do $$ begin
  create policy core_tokens_read on core.missing_tokens for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy core_tokens_admin_write on core.missing_tokens for all
    using (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()))
    with check (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy core_autom_read on core.automations for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy core_autom_admin_write on core.automations for all
    using (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()))
    with check (exists (select 1 from public.super_admins sa where sa.user_id = auth.uid()));
exception when duplicate_object then null; end $$;

grant usage on schema core to anon, authenticated, service_role;
grant select on core.missing_tokens, core.automations to anon, authenticated;
grant all on core.missing_tokens, core.automations to service_role;

-- 5) Rebuild the overview to include the new fields ----------------------------
drop view if exists public.more30_project_overview;
drop view if exists core.project_overview;
create or replace view core.project_overview as
select
  p.number, p.slug, p.name, p.department, p.category, p.stage, p.live,
  p.is_deployed, p.deploy_target, p.live_url, p.admin_url, p.is_protected,
  p.to_delete, p.supabase_project, p.supabase_schema, p.note,
  coalesce(b.open_bugs, 0)   as open_bugs,
  coalesce(t.open_tasks, 0)  as open_tasks,
  coalesce(m.missing_count,0) as missing_tokens
from core.projects p
left join (select project_num, count(*) open_bugs from core.project_bugs where status <> 'closed' group by project_num) b on b.project_num = p.number
left join (select project_num, count(*) open_tasks from core.project_tasks where status <> 'done' group by project_num) t on t.project_num = p.number
left join (select project_num, count(*) missing_count from core.missing_tokens where status = 'missing' group by project_num) m on m.project_num = p.number
order by p.number;

-- 6) PUBLIC read-only surface so the admin dashboard works with the ANON key
--    WITHOUT exposing the whole `core` schema over the Data API. These views run
--    as owner (security definer semantics) and are the ONLY public exposure.
create or replace view public.more30_project_overview as select * from core.project_overview;
create or replace view public.more30_tasks   as select id, project_num, title, status, author, created_at from core.project_tasks;
create or replace view public.more30_tokens  as select id, project_num, env_var, purpose, obtain_url, paste_location, status from core.missing_tokens;
create or replace view public.more30_automations as select id, key, name, kind, status, required_tokens, note, is_protected from core.automations;
grant select on public.more30_project_overview, public.more30_tasks, public.more30_tokens, public.more30_automations to anon, authenticated;

-- 7) Write RPCs (SECURITY DEFINER, gated to a signed-in super admin). The admin
--    dashboard calls these; without an authenticated super-admin session they
--    raise. No anonymous writes to the control panel.
create or replace function public.more30_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.super_admins sa where sa.user_id = auth.uid());
$$;

create or replace function public.more30_add_task(p_num text, p_title text, p_author text default 'user')
returns uuid language plpgsql security definer set search_path = public, core as $$
declare new_id uuid;
begin
  if not public.more30_is_admin() then raise exception 'not authorized'; end if;
  insert into core.project_tasks(project_num, title, status, author)
  values (p_num, p_title, 'todo', coalesce(p_author,'user')) returning id into new_id;
  return new_id;
end $$;

create or replace function public.more30_set_task_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public, core as $$
begin
  if not public.more30_is_admin() then raise exception 'not authorized'; end if;
  update core.project_tasks set status = p_status where id = p_id;
end $$;

create or replace function public.more30_set_delete(p_num text, p_flag boolean)
returns void language plpgsql security definer set search_path = public, core as $$
begin
  if not public.more30_is_admin() then raise exception 'not authorized'; end if;
  update core.projects set to_delete = p_flag, updated_at = now() where number = p_num;
end $$;

revoke all on function public.more30_add_task(text,text,text) from public;
revoke all on function public.more30_set_task_status(uuid,text) from public;
revoke all on function public.more30_set_delete(text,boolean) from public;
grant execute on function public.more30_is_admin() to anon, authenticated;
grant execute on function public.more30_add_task(text,text,text) to authenticated;
grant execute on function public.more30_set_task_status(uuid,text) to authenticated;
grant execute on function public.more30_set_delete(text,boolean) to authenticated;
