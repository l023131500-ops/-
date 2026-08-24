-- more30 · 38-events-gifts — round 11: סוכן ה-AI של האירוע (the last
-- advanced-features item from EVENTS_BUILD.md §4 that is buildable now:
-- "סוכן AI: ניסוח הזמנות/תזכורות, סיכום אישורי הגעה, זיהוי מי לא ענה").
-- ============================================================================
-- Same split as maatefet's assistant (0130): the AI call itself lives in an
-- Edge Function (supabase/functions/events-ai) because the Anthropic key must
-- never reach a browser and PostgREST cannot make outbound HTTP calls. What
-- belongs HERE is the tamper-proof part: WHO may spend AI money, on WHICH
-- event, and HOW MUCH per day — enforced in the database so no way of calling
-- the function can spend past the cap or draft against someone else's event.
--
-- Ownership matters more here than in maatefet: events.events has an
-- events_hall_owner_read policy (0131) that lets a HALL owner read events at
-- their hall, so "the caller can see the dashboard" is NOT the same as "the
-- caller owns the event". evg_ai_consume() therefore re-checks
-- owner_auth_user_id itself — the assistant is a tool for the event OWNER
-- (the paying seat), not for the hall watching from the side.

-- ---------- ai_usage (audit + quota ledger, one row per successful call) ----
create table events.ai_usage (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null,
  event_id uuid not null references events.events(id) on delete cascade,
  action text not null
    check (action in ('invite', 'reminder', 'thanks', 'rsvp_summary')),
  created_at timestamptz not null default now()
);
create index idx_events_ai_usage_owner_time
  on events.ai_usage(owner_auth_user_id, created_at);
alter table events.ai_usage enable row level security;
grant select on events.ai_usage to authenticated;
grant all on events.ai_usage to service_role;

create policy ai_usage_owner_read on events.ai_usage
  for select to authenticated
  using (owner_auth_user_id = auth.uid() or public.more30_is_super_admin());
-- no insert/update/delete policy for authenticated on purpose: the only
-- writer is the Edge Function through service_role (bypasses RLS), and even
-- that goes through the capped RPC below, never a raw insert.

-- ---------- daily cap, defined once ----------------------------------------
create or replace function events.ai_daily_cap()
returns integer
language sql
immutable
as $$ select 20 $$;

revoke all on function events.ai_daily_cap() from public;
revoke all on function events.ai_daily_cap() from anon;
grant execute on function events.ai_daily_cap() to authenticated, service_role;

-- "today" is the Israel calendar day, not UTC — same stance as
-- maatefet.ai_used_today (0130): a UTC rollover at 02:00/03:00 local would
-- reset the quota mid-evening for the audience this platform serves.
create or replace function events.ai_used_today(p_owner uuid)
returns integer
language sql
stable
set search_path = events, public
as $$
  select count(*)::int
    from events.ai_usage
   where owner_auth_user_id = p_owner
     and created_at >= ((now() at time zone 'Asia/Jerusalem')::date::timestamp
                        at time zone 'Asia/Jerusalem')
$$;

revoke all on function events.ai_used_today(uuid) from public;
revoke all on function events.ai_used_today(uuid) from anon;
grant execute on function events.ai_used_today(uuid) to authenticated, service_role;

-- ---------- consume (service_role only — called by the events-ai function) --
create or replace function public.evg_ai_consume(
  p_owner_auth_user_id uuid,
  p_event_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = events, public
as $$
declare
  v_owner uuid;
  v_used integer;
  v_cap integer := events.ai_daily_cap();
begin
  if p_action not in ('invite', 'reminder', 'thanks', 'rsvp_summary') then
    raise exception 'unknown AI action';
  end if;

  -- the event must exist AND belong to the caller: dashboard read access is
  -- wider (hall owners), so this is the gate that makes ownership real.
  select owner_auth_user_id into v_owner
    from events.events where id = p_event_id;
  if v_owner is null then
    raise exception 'event not found';
  end if;
  if v_owner is distinct from p_owner_auth_user_id then
    raise exception 'not the event owner';
  end if;

  -- serialize per owner: without this, two concurrent requests both read
  -- used=cap-1, both pass, and the cap is exceeded by one.
  perform pg_advisory_xact_lock(hashtext('evg_ai_' || p_owner_auth_user_id::text));

  v_used := events.ai_used_today(p_owner_auth_user_id);
  if v_used >= v_cap then
    raise exception 'daily AI quota reached (% of %)', v_used, v_cap;
  end if;

  insert into events.ai_usage (owner_auth_user_id, event_id, action)
  values (p_owner_auth_user_id, p_event_id, p_action);

  return jsonb_build_object('used', v_used + 1, 'cap', v_cap);
end;
$$;

revoke all on function public.evg_ai_consume(uuid, uuid, text) from public;
revoke all on function public.evg_ai_consume(uuid, uuid, text) from anon;
revoke all on function public.evg_ai_consume(uuid, uuid, text) from authenticated;
grant execute on function public.evg_ai_consume(uuid, uuid, text) to service_role;

-- ---------- my usage (owner UI: "נוצלו X מתוך Y היום") ----------------------
create or replace function public.evg_ai_my_usage()
returns jsonb
language plpgsql
stable
security invoker
set search_path = events, public
as $$
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;
  return jsonb_build_object(
    'used', events.ai_used_today(auth.uid()),
    'cap', events.ai_daily_cap()
  );
end;
$$;

revoke all on function public.evg_ai_my_usage() from public;
revoke all on function public.evg_ai_my_usage() from anon;
grant execute on function public.evg_ai_my_usage() to authenticated;
