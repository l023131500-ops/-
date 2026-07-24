-- more30 · startup intake (portal form) + admin ideas screen. Additive.
-- Applied live on uhnrgujb. The submissions table (public.startup_intake_submissions)
-- pre-exists and holds PII — it stays UNREADABLE by anon. Public writes go through
-- a controlled SECURITY DEFINER RPC; admin reads/updates through gated RPCs.

alter type core.project_stage add value if not exists 'idea';
alter table public.startup_intake_submissions add column if not exists converted_project_num text;

-- Public bugs view for the admin dashboard.
create or replace view public.more30_bugs as select id, project_num, title, severity, status, created_at from core.project_bugs;
grant select on public.more30_bugs to anon, authenticated;

-- Public submit (anon): controlled insert, status forced 'new'.
create or replace function public.submit_startup_idea(payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare nid uuid;
begin
  if coalesce(trim(payload->>'full_name'),'')='' then raise exception 'full_name required'; end if;
  insert into public.startup_intake_submissions
    (full_name, phone, email, city, project_name, stage, short_description, problem, solution,
     target_customer, market_size_notes, demand_validation, revenue_model, cost_notes, pricing_notes,
     competitors, differentiation, team_notes, needs_partners, has_existing_product, tech_notes,
     seeking_investment, raised_so_far, funding_needed, launch_timeline, goals_next_year,
     services_wanted, dream_free_text, status)
  values
    (payload->>'full_name', payload->>'phone', payload->>'email', payload->>'city', payload->>'project_name',
     payload->>'stage', payload->>'short_description', payload->>'problem', payload->>'solution',
     payload->>'target_customer', payload->>'market_size_notes', payload->>'demand_validation',
     payload->>'revenue_model', payload->>'cost_notes', payload->>'pricing_notes', payload->>'competitors',
     payload->>'differentiation', payload->>'team_notes',
     (payload->>'needs_partners')::boolean, (payload->>'has_existing_product')::boolean, payload->>'tech_notes',
     (payload->>'seeking_investment')::boolean, payload->>'raised_so_far', payload->>'funding_needed',
     payload->>'launch_timeline', payload->>'goals_next_year',
     case when payload->'services_wanted' is not null then array(select jsonb_array_elements_text(payload->'services_wanted')) else null end,
     payload->>'dream_free_text', 'new')
  returning id into nid; return nid;
end $$;
revoke all on function public.submit_startup_idea(jsonb) from public;
grant execute on function public.submit_startup_idea(jsonb) to anon, authenticated;

-- Admin-gated reads/writes on submissions (PII — never anon).
create or replace function public.more30_intake_list()
returns setof public.startup_intake_submissions language sql stable security definer set search_path=public as $$
  select * from public.startup_intake_submissions where public.more30_is_admin() order by created_at desc;
$$;
revoke all on function public.more30_intake_list() from public;
grant execute on function public.more30_intake_list() to authenticated;

create or replace function public.more30_intake_set_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.more30_is_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('new','reviewing','approved','rejected') then raise exception 'bad status'; end if;
  update public.startup_intake_submissions set status=p_status where id=p_id;
end $$;
revoke all on function public.more30_intake_set_status(uuid,text) from public;
grant execute on function public.more30_intake_set_status(uuid,text) to authenticated;

create or replace function public.more30_intake_to_project(p_id uuid, p_slug text, p_department text, p_category text)
returns text language plpgsql security definer set search_path=public, core as $$
declare sub public.startup_intake_submissions; newnum text;
begin
  if not public.more30_is_admin() then raise exception 'not authorized'; end if;
  select * into sub from public.startup_intake_submissions where id=p_id;
  if not found then raise exception 'submission not found'; end if;
  select lpad((coalesce(max(number::int),0)+1)::text,2,'0') into newnum from core.projects where number ~ '^[0-9]+$';
  insert into core.projects (number, slug, repo, name, department, category, stage, live, is_deployed, is_protected, note)
  values (newnum, p_slug, p_slug, coalesce(nullif(sub.project_name,''), sub.full_name),
          coalesce(nullif(p_department,''),'misc'), coalesce(nullif(p_category,'')::core.project_category,'other'),
          'idea', false, false, false, 'נוצר מרעיון נכנס: ' || coalesce(sub.short_description,''));
  update public.startup_intake_submissions set status='approved', converted_project_num=newnum where id=p_id;
  return newnum;
end $$;
revoke all on function public.more30_intake_to_project(uuid,text,text,text) from public;
grant execute on function public.more30_intake_to_project(uuid,text,text,text) to authenticated;
