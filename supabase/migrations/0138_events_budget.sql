-- more30 · 38-events-gifts — round 8: תקציב אירוע (event budget)
-- ============================================================================
-- EVENTS_BUILD.md §4: "תקציב אירוע לבעל האירוע (הכנסות מתנות מול הוצאות)".
-- The income side has existed since 0131 (gifts -> wallet_entries split, the
-- event_owner beneficiary is exactly the owner's net income) — but there was
-- nowhere to put the other half of the equation. This adds the expense ledger:
-- what the event costs (planned estimate vs. closed price), who the vendor is,
-- what was already paid — so the dashboard can answer the one question every
-- event owner actually asks: "do the gifts cover the event?"
--
-- Owner-only surface: expenses are the event owner's private bookkeeping.
-- No anon grants, no token path — guests never see the budget. RLS is the
-- same event-owner-or-admin shape as guests/seating_tables. All RPCs are
-- SECURITY INVOKER so RLS does the access control.
--
-- Additive only: one new table + 3 new RPCs + evg_event_dashboard replaced
-- with a strict superset of its 0137 definition (adds 'expenses').

-- ---------- expense ledger ----------
create table events.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events(id) on delete cascade,
  -- fixed category list (mirrored by the UI's Hebrew labels) so per-category
  -- rollups stay possible; free detail lives in `name`
  category text not null default 'other' check (category in
    ('venue','catering','music','photography','clothing','design','transport','ceremony','other')),
  name text not null check (char_length(btrim(name)) between 1 and 140),
  vendor_name text check (vendor_name is null or char_length(vendor_name) <= 140),
  vendor_phone text check (vendor_phone is null or char_length(vendor_phone) <= 30),
  -- planned = the estimate while shopping around; actual = the closed price
  -- once a contract is signed. The effective cost is coalesce(actual, planned).
  planned_agorot bigint not null default 0 check (planned_agorot between 0 and 100000000),
  actual_agorot bigint check (actual_agorot is null or actual_agorot between 0 and 100000000),
  paid boolean not null default false,
  due_date date,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_expenses_event on events.expenses(event_id);
alter table events.expenses enable row level security;
grant select, insert, update, delete on events.expenses to authenticated;
grant all on events.expenses to service_role;

create trigger trg_events_expenses_updated_at
  before update on events.expenses
  for each row execute function events.set_updated_at();

create policy expenses_event_owner on events.expenses
  for all
  using (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ))
  with check (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ));

-- ---------- authenticated: add an expense ----------
create or replace function public.evg_expense_add(
  p_event_id uuid,
  p_name text,
  p_category text default 'other',
  p_planned_agorot bigint default 0,
  p_vendor_name text default null,
  p_vendor_phone text default null,
  p_due_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_id uuid;
begin
  -- RLS-scoped: a non-owner simply doesn't see the event
  if not exists (select 1 from events.events where id = p_event_id) then
    raise exception 'event not found';
  end if;
  if p_category not in ('venue','catering','music','photography','clothing',
                        'design','transport','ceremony','other') then
    raise exception 'invalid expense category';
  end if;

  insert into events.expenses (event_id, category, name, vendor_name, vendor_phone,
                               planned_agorot, due_date, notes)
  values (p_event_id, p_category, btrim(p_name),
          nullif(btrim(coalesce(p_vendor_name,'')),''),
          nullif(btrim(coalesce(p_vendor_phone,'')),''),
          greatest(coalesce(p_planned_agorot, 0), 0),
          p_due_date, nullif(btrim(coalesce(p_notes,'')),''))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.evg_expense_add(uuid, text, text, bigint, text, text, date, text) from public;
grant execute on function public.evg_expense_add(uuid, text, text, bigint, text, text, date, text) to authenticated;

-- ---------- authenticated: patch an expense in place ----------
-- same jsonb-patch convention as evg_guest_update: only keys present in the
-- patch change; an explicit null on actual_agorot/due_date clears the value
create or replace function public.evg_expense_update(p_expense_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch must be an object';
  end if;
  if p_patch ? 'category' and p_patch->>'category' not in
     ('venue','catering','music','photography','clothing','design','transport','ceremony','other') then
    raise exception 'invalid expense category';
  end if;

  update events.expenses set
    category = case when p_patch ? 'category' then p_patch->>'category' else category end,
    name = case when p_patch ? 'name'
                then btrim(coalesce(p_patch->>'name', '')) else name end,
    vendor_name = case when p_patch ? 'vendor_name'
                       then nullif(btrim(coalesce(p_patch->>'vendor_name', '')), '') else vendor_name end,
    vendor_phone = case when p_patch ? 'vendor_phone'
                        then nullif(btrim(coalesce(p_patch->>'vendor_phone', '')), '') else vendor_phone end,
    planned_agorot = case when p_patch ? 'planned_agorot'
                          then greatest(coalesce((p_patch->>'planned_agorot')::bigint, 0), 0)
                          else planned_agorot end,
    actual_agorot = case when p_patch ? 'actual_agorot'
                         then (case when p_patch->>'actual_agorot' is null then null
                               else greatest((p_patch->>'actual_agorot')::bigint, 0) end)
                         else actual_agorot end,
    paid = case when p_patch ? 'paid'
                then coalesce((p_patch->>'paid')::boolean, false) else paid end,
    due_date = case when p_patch ? 'due_date'
                    then (p_patch->>'due_date')::date else due_date end,
    notes = case when p_patch ? 'notes'
                 then nullif(btrim(coalesce(p_patch->>'notes', '')), '') else notes end
  where id = p_expense_id;
  if not found then raise exception 'expense not found'; end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_expense_update(uuid, jsonb) from public;
grant execute on function public.evg_expense_update(uuid, jsonb) to authenticated;

-- ---------- authenticated: delete an expense ----------
create or replace function public.evg_expense_delete(p_expense_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  delete from events.expenses where id = p_expense_id;
  if not found then raise exception 'expense not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_expense_delete(uuid) from public;
grant execute on function public.evg_expense_delete(uuid) to authenticated;

-- ---------- dashboard: + expenses (strict superset of the 0137 shape) ----------
create or replace function public.evg_event_dashboard(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = events, public
as $$
  select jsonb_build_object(
    'event', (
      select jsonb_build_object(
        'id', e.id, 'title', e.title, 'event_type', e.event_type::text,
        'event_date', e.event_date, 'event_time', e.event_time,
        'venue_name', e.venue_name, 'address', e.address,
        'description', e.description, 'status', e.status::text,
        'share_token', e.share_token,
        'gift_goal_agorot', e.gift_goal_agorot,
        'platform_fee_bps', e.platform_fee_bps,
        'invite_theme', e.invite_theme,
        'invite_hosts', e.invite_hosts,
        'invite_message', e.invite_message,
        'msg_invite_tpl', e.msg_invite_tpl,
        'msg_reminder_tpl', e.msg_reminder_tpl,
        'msg_thanks_tpl', e.msg_thanks_tpl
      ) from events.events e where e.id = p_event_id
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'full_name', g.full_name, 'phone', g.phone,
        'email', g.email,
        'group_name', g.group_name, 'invited_count', g.invited_count,
        'personal_token', g.personal_token,
        'rsvp_status', g.rsvp_status::text, 'rsvp_count', g.rsvp_count,
        'rsvp_note', g.rsvp_note, 'checkin_at', g.checkin_at,
        'table_id', g.table_id,
        'invite_sent_at', (select max(m.created_at) from events.messages m
                           where m.guest_id = g.id and m.kind = 'invite'),
        'reminder_sent_at', (select max(m.created_at) from events.messages m
                             where m.guest_id = g.id and m.kind = 'reminder')
      ) order by g.created_at)
      from events.guests g where g.event_id = p_event_id), '[]'::jsonb),
    'tables', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'capacity', t.capacity,
        'sort_order', t.sort_order
      ) order by t.sort_order, t.created_at)
      from events.seating_tables t where t.event_id = p_event_id), '[]'::jsonb),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'donor_name', g.donor_name, 'donor_phone', g.donor_phone,
        'greeting', g.greeting,
        'amount_agorot', g.amount_agorot, 'mode', g.mode,
        'status', g.status::text, 'thanked_at', g.thanked_at,
        'created_at', g.created_at
      ) order by g.created_at desc)
      from events.gifts g where g.event_id = p_event_id and g.status = 'paid'), '[]'::jsonb),
    'wallet', coalesce((
      select jsonb_object_agg(w.beneficiary, w.total) from (
        select beneficiary, sum(amount_agorot) as total
        from events.wallet_entries where event_id = p_event_id
        group by beneficiary
      ) w), '{}'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'category', x.category, 'name', x.name,
        'vendor_name', x.vendor_name, 'vendor_phone', x.vendor_phone,
        'planned_agorot', x.planned_agorot, 'actual_agorot', x.actual_agorot,
        'paid', x.paid, 'due_date', x.due_date, 'notes', x.notes
      ) order by x.created_at)
      from events.expenses x where x.event_id = p_event_id), '[]'::jsonb)
  )
$$;
