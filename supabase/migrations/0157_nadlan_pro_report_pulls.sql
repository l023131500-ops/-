-- build_tasks id=14 (system 36, priority 70): "Management: every search and
-- produced report fully visible - full detail, who produced, when, status;
-- full audit trail." np_property_truth_set (0010) already overwrites
-- properties.truth_report/truth_report_at/truth_report_error on every pull
-- (fetchTruth in app.html) — but only the *latest* pull survives, and there
-- was never any record of *who* on the team pulled it. Unlike system 32's
-- equivalent gap (id=7, saved_reports audit trail), 36 is an authenticated
-- office CRM, not a public no-login report, so "who" is a real, answerable
-- question here.

create table if not exists nadlan_pro.report_pulls (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references nadlan_pro.offices(id) on delete cascade,
  property_id uuid not null references nadlan_pro.properties(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  status text not null check (status in ('success', 'error')),
  error_text text
);

create index if not exists report_pulls_property_idx
  on nadlan_pro.report_pulls (property_id, requested_at desc);
create index if not exists report_pulls_office_idx
  on nadlan_pro.report_pulls (office_id, requested_at desc);
create index if not exists report_pulls_requested_by_idx
  on nadlan_pro.report_pulls (requested_by);

alter table nadlan_pro.report_pulls enable row level security;

-- Owner/manager see every pull in the office (the "management" audit trail);
-- a plain agent sees only their own pulls, mirroring the commissions RLS
-- split (id=1 in this same journal) rather than inventing a new shape.
drop policy if exists report_pulls_select on nadlan_pro.report_pulls;
create policy report_pulls_select on nadlan_pro.report_pulls
  for select
  using (nadlan_pro.manages_office(office_id) or requested_by = auth.uid());

-- can_touch(office_id, requested_by) with requested_by always = auth.uid()
-- reduces to "manages_office(office_id) OR office_id in my_office_ids()" —
-- the same office-membership test already enforced on the properties UPDATE
-- inside np_property_truth_set below, so this insert can never fail for a
-- caller whose truth_report write just succeeded.
drop policy if exists report_pulls_insert on nadlan_pro.report_pulls;
create policy report_pulls_insert on nadlan_pro.report_pulls
  for insert
  with check (nadlan_pro.can_touch(office_id, requested_by) and requested_by = auth.uid());

revoke all on table nadlan_pro.report_pulls from public, anon, authenticated;
grant select, insert on table nadlan_pro.report_pulls to authenticated;

-- Same signature/behavior as before (0010) — only addition is the audit
-- row, written in the same transaction as the truth_report write it logs.
create or replace function public.np_property_truth_set(
  p_id uuid, p_report jsonb, p_error text default null)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_office_id uuid;
begin
  update nadlan_pro.properties
     set truth_report = p_report,
         truth_report_at = now(),
         truth_report_error = p_error
   where id = p_id
   returning office_id into v_office_id;
  if not found then
    raise exception 'הנכס לא נמצא, או שאין לך הרשאה לערוך אותו';
  end if;

  insert into nadlan_pro.report_pulls (office_id, property_id, requested_by, status, error_text)
  values (v_office_id, p_id, auth.uid(),
          case when p_error is null then 'success' else 'error' end, p_error);
end $$;

revoke all on function public.np_property_truth_set(uuid, jsonb, text) from public, anon;
grant execute on function public.np_property_truth_set(uuid, jsonb, text) to authenticated;

-- Listing RPC: RLS on report_pulls above already scopes the result set to
-- "everything" for owner/manager or "my own" for a plain agent, so this
-- function needs no extra role check of its own.
create or replace function public.np_report_pulls(p_office uuid, p_limit int default 200)
returns table(
  id uuid, property_id uuid, property_title text, property_address text,
  requested_by uuid, requested_by_name text, requested_at timestamptz,
  status text, error_text text
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select rp.id, rp.property_id, p.title, p.address,
         rp.requested_by, coalesce(m.full_name, '—'),
         rp.requested_at, rp.status, rp.error_text
  from nadlan_pro.report_pulls rp
  join nadlan_pro.properties p on p.id = rp.property_id
  left join nadlan_pro.office_members m
    on m.office_id = rp.office_id and m.user_id = rp.requested_by
  where rp.office_id = p_office
  order by rp.requested_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

revoke all on function public.np_report_pulls(uuid, int) from public, anon;
grant execute on function public.np_report_pulls(uuid, int) to authenticated;
