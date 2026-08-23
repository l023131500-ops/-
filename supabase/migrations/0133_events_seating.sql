-- 38 events-gifts · seating (EVENTS_BUILD.md §4: "סידורי הושבה — גרירה של
-- שולחנות ומוזמנים, ייצוא").
--
-- Tables belong to an event; a guest may sit at exactly one table of the SAME
-- event (cross-event assignment is blocked by a trigger, not just by UI).
-- Capacity is advisory — the dashboard shows over-capacity loudly instead of
-- the DB refusing a real family that showed up with one extra chair.
--
-- The seat closes the QR loop end-to-end: the guest's entry pass (g.html)
-- shows their table, and the gate scan (evg_guest_checkin_by_token) announces
-- it to the person holding the door tablet — scan, greet, point at the table.
--
-- Same security stance as 0131/0132: anon has zero table access; owner-side
-- RPCs are security invoker on top of RLS; guest-side data flows only through
-- the exact-token definer RPC (evg_guest_view), which exposes the table NAME
-- only — never ids or other guests.

-- ---------- tables ----------
create table events.seating_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  capacity integer not null default 10 check (capacity between 1 and 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_events_seating_tables_event on events.seating_tables(event_id, sort_order);
alter table events.seating_tables enable row level security;
grant select, insert, update, delete on events.seating_tables to authenticated;
grant all on events.seating_tables to service_role;

create trigger trg_events_seating_tables_updated_at
  before update on events.seating_tables
  for each row execute function events.set_updated_at();

create policy seating_tables_event_owner on events.seating_tables
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

-- ---------- guest -> table ----------
alter table events.guests
  add column table_id uuid references events.seating_tables(id) on delete set null;
create index idx_events_guests_table on events.guests(table_id);

-- a guest can only sit at a table of their own event. security invoker: the
-- owner can see their own tables through RLS, and a foreign table is simply
-- invisible -> same error path as a nonexistent one.
create or replace function events.guard_guest_table_same_event()
returns trigger
language plpgsql
set search_path = events
as $$
declare
  v_table_event uuid;
begin
  if new.table_id is null then
    return new;
  end if;
  select event_id into v_table_event from events.seating_tables where id = new.table_id;
  if v_table_event is null or v_table_event <> new.event_id then
    raise exception 'table does not belong to this event';
  end if;
  return new;
end;
$$;

create trigger trg_events_guests_table_same_event
  before insert or update of table_id, event_id on events.guests
  for each row execute function events.guard_guest_table_same_event();

-- ---------- owner RPCs ----------
create or replace function public.evg_table_create(
  p_event_id uuid,
  p_name text,
  p_capacity integer default 10
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
  insert into events.seating_tables (event_id, name, capacity, sort_order)
  values (p_event_id, btrim(p_name),
          least(greatest(coalesce(p_capacity, 10), 1), 200),
          coalesce((select max(sort_order) + 1 from events.seating_tables
                    where event_id = p_event_id), 0))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.evg_table_create(uuid, text, integer) from public;
grant execute on function public.evg_table_create(uuid, text, integer) to authenticated;

create or replace function public.evg_table_update(
  p_table_id uuid,
  p_name text default null,
  p_capacity integer default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  update events.seating_tables set
    name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
    capacity = case when p_capacity is null then capacity
                    else least(greatest(p_capacity, 1), 200) end
  where id = p_table_id;
  if not found then raise exception 'table not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_table_update(uuid, text, integer) from public;
grant execute on function public.evg_table_update(uuid, text, integer) to authenticated;

create or replace function public.evg_table_delete(p_table_id uuid)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  -- guests at this table fall back to "unseated" via on delete set null
  delete from events.seating_tables where id = p_table_id;
  if not found then raise exception 'table not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_table_delete(uuid) from public;
grant execute on function public.evg_table_delete(uuid) to authenticated;

create or replace function public.evg_guest_set_table(p_guest_id uuid, p_table_id uuid default null)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  -- RLS scopes the guest to the owner; the guard trigger pins the table to
  -- the guest's own event
  update events.guests set table_id = p_table_id where id = p_guest_id;
  if not found then raise exception 'guest not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_guest_set_table(uuid, uuid) from public;
grant execute on function public.evg_guest_set_table(uuid, uuid) to authenticated;

-- ---------- dashboard now carries seating ----------
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
        'platform_fee_bps', e.platform_fee_bps
      ) from events.events e where e.id = p_event_id
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'full_name', g.full_name, 'phone', g.phone,
        'group_name', g.group_name, 'invited_count', g.invited_count,
        'personal_token', g.personal_token,
        'rsvp_status', g.rsvp_status::text, 'rsvp_count', g.rsvp_count,
        'rsvp_note', g.rsvp_note, 'checkin_at', g.checkin_at,
        'table_id', g.table_id
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
        'id', g.id, 'donor_name', g.donor_name, 'greeting', g.greeting,
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
      ) w), '{}'::jsonb)
  )
$$;

-- ---------- the guest's pass shows their table ----------
create or replace function public.evg_guest_view(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = events, public
as $$
  select events.event_public_payload(g.event_id) || jsonb_build_object(
    'guest', jsonb_build_object(
      'full_name', g.full_name,
      'invited_count', g.invited_count,
      'rsvp_status', g.rsvp_status::text,
      'rsvp_count', g.rsvp_count,
      'rsvp_note', g.rsvp_note,
      'table_name', (select t.name from events.seating_tables t where t.id = g.table_id)
    )
  )
  from events.guests g
  join events.events e on e.id = g.event_id
  where g.personal_token = btrim(p_token) and e.status <> 'canceled'
  limit 1
$$;

-- ---------- the gate announces the table ----------
create or replace function public.evg_guest_checkin_by_token(p_event_id uuid, p_token text)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_g events.guests;
  v_already boolean := false;
begin
  if p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_g from events.guests
  where personal_token = btrim(p_token);
  if v_g.id is null then
    -- unknown token, or a token whose event this caller doesn't own (RLS)
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_g.event_id <> p_event_id then
    -- valid token of this owner's OTHER event — a guest of event A must not
    -- be waved into event B just because both belong to the same organizer
    return jsonb_build_object('ok', false, 'reason', 'wrong_event');
  end if;

  if v_g.checkin_at is not null then
    v_already := true;
  else
    update events.guests set checkin_at = now()
    where id = v_g.id and checkin_at is null
    returning * into v_g;
    if v_g.id is null then
      -- lost the race to a second scanner at the same door — report theirs
      select * into v_g from events.guests where personal_token = btrim(p_token);
      v_already := true;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', v_already,
    'guest', jsonb_build_object(
      'id', v_g.id, 'full_name', v_g.full_name, 'group_name', v_g.group_name,
      'invited_count', v_g.invited_count,
      'rsvp_status', v_g.rsvp_status::text, 'rsvp_count', v_g.rsvp_count,
      'checkin_at', v_g.checkin_at,
      'table_name', (select t.name from events.seating_tables t where t.id = v_g.table_id)
    ),
    'counts', (
      select jsonb_build_object(
        'checked_in', count(*) filter (where g.checkin_at is not null),
        'total', count(*),
        'souls_in', coalesce(sum(coalesce(g.rsvp_count, g.invited_count))
                             filter (where g.checkin_at is not null), 0)
      ) from events.guests g where g.event_id = p_event_id
    )
  );
end;
$$;
