-- more30 · 39-maatefet — stage 4 continues: smart scheduling (free-slot
-- suggestions), module "תוספות מתקדמות"
-- ============================================================================
-- MAATEFET_BUILD.md §386 lists "תזמון חכם: הצעת מועדי מפגש פנויים אוטומטית;
-- סנכרון ליומן Google." Same scoping rule this round's predecessors used
-- (0121 analytics, 0123 auto-flag): build the part that is real, deterministic,
-- and needs no external provider/API key today; leave the Google Calendar
-- sync half explicitly deferred (it needs OAuth credentials this session
-- does not have) rather than fake it.
--
-- The "propose free meeting times" half needs nothing external: every signal
-- it needs already lives in maatefet.appointments (0114) — an instructor's
-- own scheduled/confirmed meetings, which occupy time and should not be
-- double-booked. This adds one read-only function,
-- maatefet_suggest_slots(), that walks a work-week grid (Sun-Thu, Israel
-- weekend Fri/Sat excluded — this is an Orthodox wedding-guidance context,
-- not a generic scheduler) in Asia/Jerusalem local time, within configurable
-- business hours, and returns the slots that don't overlap an existing
-- non-cancelled/non-declined appointment for the calling instructor.
--
-- Security shape mirrors maatefet_appointments_list() (0114): security
-- invoker, gated on maatefet.my_instructor_id() (an instructor with no
-- verified 2FA session gets null and the function raises — same choke point
-- as every other instructor-only RPC in this schema), reads
-- maatefet.appointments through the instructor's own existing RLS policy
-- (appointments_instructor_all) so this function can never see another
-- instructor's calendar even if called directly. No new table, no new RLS
-- surface — read-only over data the instructor already owns.
create or replace function public.maatefet_suggest_slots(
  p_from date default null,
  p_days int default 7,
  p_duration_minutes int default 60,
  p_day_start_hour int default 9,
  p_day_end_hour int default 21,
  p_slot_step_minutes int default 30
)
returns table(slot_start timestamptz)
language plpgsql
stable
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_from date;
  v_days int;
  v_duration int;
  v_start_hour int;
  v_end_hour int;
  v_step int;
  v_day date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_slot timestamptz;
  v_found int := 0;
  v_max_results constant int := 40;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can request scheduling suggestions';
  end if;

  -- clamp every input to a sane range: this function is reachable by any
  -- authenticated instructor session, so a malformed/hostile argument must
  -- degrade to a safe default, never an unbounded loop or a huge scan.
  v_from := coalesce(p_from, ((now() at time zone 'Asia/Jerusalem')::date) + 1);
  v_days := least(greatest(coalesce(p_days, 7), 1), 30);
  v_duration := least(greatest(coalesce(p_duration_minutes, 60), 15), 240);
  v_start_hour := least(greatest(coalesce(p_day_start_hour, 9), 0), 23);
  v_end_hour := least(greatest(coalesce(p_day_end_hour, 21), v_start_hour + 1), 24);
  v_step := least(greatest(coalesce(p_slot_step_minutes, 30), 15), 120);

  for v_day in
    select generate_series(v_from, v_from + (v_days - 1), interval '1 day')::date
  loop
    exit when v_found >= v_max_results;

    -- Israel work week: Sunday(0)..Thursday(4). Friday(5)/Saturday(6) are
    -- the weekend for this audience and are never offered.
    if extract(dow from v_day) in (5, 6) then
      continue;
    end if;

    v_day_start := (v_day::text || ' ' || lpad(v_start_hour::text, 2, '0') || ':00')::timestamp
      at time zone 'Asia/Jerusalem';
    v_day_end := (v_day::text || ' ' || lpad(v_end_hour::text, 2, '0') || ':00')::timestamp
      at time zone 'Asia/Jerusalem';
    v_slot := v_day_start;

    while v_slot + make_interval(mins => v_duration) <= v_day_end loop
      exit when v_found >= v_max_results;

      if v_slot > now() and not exists (
        select 1 from maatefet.appointments a
        where a.instructor_id = v_instructor_id
          and a.status not in ('cancelled', 'declined')
          and a.scheduled_at < v_slot + make_interval(mins => v_duration)
          and v_slot < a.scheduled_at + make_interval(mins => a.duration_minutes)
      ) then
        slot_start := v_slot;
        v_found := v_found + 1;
        return next;
      end if;

      v_slot := v_slot + make_interval(mins => v_step);
    end loop;
  end loop;

  return;
end;
$$;

-- same anon-execute gap every prior maatefet RPC needed closing (0111 and
-- on): default privileges on this project grant `anon`/`authenticated`
-- execute on new public-schema functions regardless of `revoke ... from
-- public`, so the anon revoke must be explicit.
revoke all on function public.maatefet_suggest_slots(date, int, int, int, int, int) from public;
revoke all on function public.maatefet_suggest_slots(date, int, int, int, int, int) from anon;
grant execute on function public.maatefet_suggest_slots(date, int, int, int, int, int) to authenticated;
