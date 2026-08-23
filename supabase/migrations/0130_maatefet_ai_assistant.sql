-- more30 · 39-maatefet — stage 4 continues: סוכן AI למדריך/ה (the "AI agent
-- for the instructor" item from MAATEFET_BUILD.md's advanced-additions list —
-- the last stage-4 item that is buildable right now: WhatsApp needs a paid
-- provider decision and Google-Calendar OAuth needs user-supplied credentials,
-- but the platform already holds a global ANTHROPIC_API_KEY in core.secrets).
-- ============================================================================
-- What this migration adds is deliberately NOT the AI call itself — that
-- lives in the maatefet-ai Edge Function (supabase/functions/maatefet-ai),
-- because a browser page must never see the Anthropic key and PostgREST
-- functions cannot make outbound HTTP calls. What belongs in the database is
-- exactly the part that must be tamper-proof even if the function is called
-- in unexpected ways: WHO may spend AI money, and HOW MUCH per day.
--
-- Shape, reusing patterns this schema has already proven:
-- - maatefet.ai_usage: one row per successful AI call (instructor_id +
--   action + created_at) — same "counts are real rows, not estimates"
--   stance as core.system_entry_events (0127) and report_exports (32).
-- - The couple/client role has no access at all: the assistant is an
--   instructor tool (the spec's item is "סוכן AI **למדריך**"), and couples
--   don't pay — cost controls key off the paying seat.
-- - Writes happen ONLY via public.maatefet_ai_consume(), EXECUTE granted to
--   service_role alone (the Edge Function's key) — same service-role-only
--   surface as maatefet_ics_feed (0126). The cap check + insert are
--   serialized per instructor with an advisory xact lock so two concurrent
--   requests cannot both pass the "under the cap" check.
-- - The instructor sees their own remaining quota via
--   public.maatefet_ai_my_usage(), security invoker over an RLS read policy
--   gated on maatefet.my_instructor_id() (verified + aal2), same as every
--   other instructor read in this schema.
--
-- Standard privilege check repeated from every prior maatefet migration
-- (0111/0114/0115/0116/0117/0118/0119/0120): this project's `public` schema
-- gives anon a separate default EXECUTE grant, so every new function below
-- gets an explicit `revoke ... from anon`, verified live via
-- has_function_privilege() after creation.

-- ---------- ai_usage (audit + quota ledger, one row per successful call) ----
create table maatefet.ai_usage (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  action text not null
    check (action in ('lesson_plan', 'reminder', 'summary')),
  created_at timestamptz not null default now()
);
create index idx_maatefet_ai_usage_instructor_time
  on maatefet.ai_usage(instructor_id, created_at);
alter table maatefet.ai_usage enable row level security;
grant select on maatefet.ai_usage to authenticated;
grant all on maatefet.ai_usage to service_role;

create policy ai_usage_instructor_read on maatefet.ai_usage
  for select to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());
-- no insert/update/delete policy for authenticated on purpose: the only
-- writer is the Edge Function through service_role (bypasses RLS), and even
-- that goes through the capped RPC below, never a raw insert.

-- ---------- daily cap, defined once ----------------------------------------
create or replace function maatefet.ai_daily_cap()
returns integer
language sql
immutable
as $$ select 25 $$;

revoke all on function maatefet.ai_daily_cap() from public;
revoke all on function maatefet.ai_daily_cap() from anon;
grant execute on function maatefet.ai_daily_cap() to authenticated, service_role;

-- "today" is the Israel calendar day, not UTC — the audience lives in
-- Asia/Jerusalem and a UTC rollover at 02:00/03:00 local would reset the
-- quota mid-evening. Same timezone stance as maatefet_suggest_slots (0124).
create or replace function maatefet.ai_used_today(p_instructor_id uuid)
returns integer
language sql
stable
set search_path = maatefet, public
as $$
  select count(*)::int
    from maatefet.ai_usage
   where instructor_id = p_instructor_id
     and created_at >= ((now() at time zone 'Asia/Jerusalem')::date::timestamp
                        at time zone 'Asia/Jerusalem')
$$;

revoke all on function maatefet.ai_used_today(uuid) from public;
revoke all on function maatefet.ai_used_today(uuid) from anon;
grant execute on function maatefet.ai_used_today(uuid) to authenticated, service_role;

-- ---------- consume (service_role only — called by the maatefet-ai function)
create or replace function public.maatefet_ai_consume(
  p_instructor_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_status text;
  v_used integer;
  v_cap integer := maatefet.ai_daily_cap();
begin
  if p_action not in ('lesson_plan', 'reminder', 'summary') then
    raise exception 'unknown AI action';
  end if;

  select status into v_status from maatefet.instructors where id = p_instructor_id;
  if v_status is distinct from 'verified' then
    raise exception 'not a verified instructor';
  end if;

  -- serialize per instructor: without this, two concurrent requests both
  -- read used=cap-1, both pass, and the cap is exceeded by one.
  perform pg_advisory_xact_lock(hashtext('maatefet_ai_' || p_instructor_id::text));

  v_used := maatefet.ai_used_today(p_instructor_id);
  if v_used >= v_cap then
    raise exception 'daily AI quota reached (% of %)', v_used, v_cap;
  end if;

  insert into maatefet.ai_usage (instructor_id, action)
  values (p_instructor_id, p_action);

  return jsonb_build_object('used', v_used + 1, 'cap', v_cap);
end;
$$;

revoke all on function public.maatefet_ai_consume(uuid, text) from public;
revoke all on function public.maatefet_ai_consume(uuid, text) from anon;
revoke all on function public.maatefet_ai_consume(uuid, text) from authenticated;
grant execute on function public.maatefet_ai_consume(uuid, text) to service_role;

-- ---------- my usage (instructor UI: "X of Y used today") -------------------
create or replace function public.maatefet_ai_my_usage()
returns jsonb
language plpgsql
stable
security invoker
set search_path = maatefet, public
as $$
declare
  v_id uuid := maatefet.my_instructor_id();
begin
  if v_id is null then
    raise exception 'only a verified instructor can use the AI assistant';
  end if;
  return jsonb_build_object(
    'used', maatefet.ai_used_today(v_id),
    'cap', maatefet.ai_daily_cap()
  );
end;
$$;

revoke all on function public.maatefet_ai_my_usage() from public;
revoke all on function public.maatefet_ai_my_usage() from anon;
grant execute on function public.maatefet_ai_my_usage() to authenticated;
