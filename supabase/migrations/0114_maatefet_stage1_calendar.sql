-- more30 · 39-maatefet — stage 1 begins: couple portal + calendar/reminders/
-- attendance confirmations + full access control
-- ============================================================================
-- MAATEFET_BUILD.md roadmap: "שלב 1: פורטל זוג + יומן/תזכורות/אישורי הגעה +
-- בקרת גישה מלאה". Stage 0 (CRM + content library + super-admin panel + 2FA +
-- field-level encryption) closed in 0113. This migration is the DB half of
-- stage 1: two new tables (appointments, reminders) an instructor manages for
-- their own clients, readable by the client themselves once their own session
-- has completed 2FA — the couple's personal area has no screen to protect
-- until this round, so client-facing MFA (flagged as deferred in 0112) is
-- enforced here at the same DB choke-point pattern already proven for
-- instructors (maatefet.my_instructor_id()).
--
-- Design, mirroring 0108/0112's established shape:
-- - maatefet.my_client_id(): the client-side equivalent of my_instructor_id()
--   — returns the caller's own client id only if auth_user_id matches AND the
--   session is aal2. Used to gate the *read* policies below; it deliberately
--   does NOT gate maatefet.clients itself (0108's clients_self_read policy
--   stays as-is) because the app needs to read "do I have a client row at
--   all" before it can offer the 2FA enrollment screen — same bootstrapping
--   reason instructors_self_read has no aal2 gate while my_instructor_id()
--   does.
-- - appointments/reminders: instructor has full CRUD scoped to their own
--   clients (guarded by a trigger, not just the RLS predicate, so an
--   instructor can never attach an appointment/reminder to another
--   instructor's client even by supplying a mismatched client_id). The client
--   gets read-only RLS access to their own rows; there is deliberately no
--   client insert/update/delete policy on either table — the only client
--   mutation allowed is confirming/declining attendance, and that goes
--   through one narrow SECURITY DEFINER RPC (maatefet_appointment_rsvp) below,
--   not a raw table grant, so a client session can never edit an
--   appointment's time/location/topic or touch someone else's row.
--
-- Independent finding while wiring maatefet_me() for the client's own portal
-- (its first real consumer — 0112/0113 both left it unused by any UI): the
-- 'client' branch of maatefet_me() decrypts and returns notes_enc via
-- maatefet.decrypt_note(), i.e. the instructor's private counseling notes
-- about the couple. Those notes are for the instructor only (module 1's own
-- CRM, "הערות ליווי" the couple never sees) — returning them from the couple's
-- own self-view function would hand every client their instructor's private
-- notes about them the moment the portal calls maatefet_me(). Fixed here,
-- before that leak ever ships: the client branch drops the notes field
-- entirely. The instructor's own maatefet_clients_list()/maatefet_me()
-- ('instructor' branch has no notes field to begin with) are untouched.
--
-- Second independent finding, caught by re-checking exactly what 0111
-- documented and re-testing it against these new functions: `revoke all on
-- function ... from public` does NOT revoke `anon`'s ability to execute a
-- function in the `public` schema on this project — Supabase's default
-- privileges there grant `anon`/`authenticated` execute directly, separate
-- from the `public` pseudo-role. 0111 fixed this once for the stage-0
-- functions; every function this migration adds had the exact same gap
-- (verified live via has_function_privilege('anon', ..., 'execute') = true
-- before the explicit `revoke ... from anon` below, false after). Not
-- currently exploitable for a data leak (the underlying tables have no grant
-- to `anon` at all, and the one SECURITY DEFINER RPC checks auth.uid() itself
-- inside the function body), but closed anyway as the same defense-in-depth
-- 0111 established — a table-level fix is a project-wide default-privilege
-- change out of this migration's scope, tracked as a standing lesson, not a
-- fix applied here.

-- ---------- client-side 2FA choke point (mirrors my_instructor_id()) ----------
create or replace function maatefet.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = maatefet
as $$
  select id from maatefet.clients
  where auth_user_id = auth.uid()
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
  limit 1
$$;

-- ---------- shared guard: a row's client_id must belong to its instructor_id ----------
-- reusable across appointments/reminders (both use these exact column names) —
-- prevents an instructor from ever pointing a row at a client that belongs to
-- a different instructor, even though the RLS predicate below already scopes
-- instructor_id to their own id (defense in depth, same shape as 0108's
-- guard_instructor_status_change).
create or replace function maatefet.guard_client_belongs_to_instructor()
returns trigger
language plpgsql
security definer
set search_path = maatefet
as $$
begin
  if not exists (
    select 1 from maatefet.clients c
    where c.id = new.client_id and c.instructor_id = new.instructor_id
  ) then
    raise exception 'client does not belong to this instructor';
  end if;
  return new;
end;
$$;

-- ---------- appointments (יומן + אישורי הגעה) ----------
create table maatefet.appointments (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  client_id uuid not null references maatefet.clients(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  location text,
  topic text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'declined', 'cancelled', 'completed')),
  client_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_appt_instructor on maatefet.appointments(instructor_id);
create index idx_maatefet_appt_client on maatefet.appointments(client_id);
create index idx_maatefet_appt_scheduled on maatefet.appointments(scheduled_at);
alter table maatefet.appointments enable row level security;
grant select, insert, update, delete on maatefet.appointments to authenticated;
grant all on maatefet.appointments to service_role;

create trigger trg_maatefet_appointments_updated_at
  before update on maatefet.appointments
  for each row execute function maatefet.set_updated_at();

create trigger trg_maatefet_appointments_guard_client
  before insert or update on maatefet.appointments
  for each row execute function maatefet.guard_client_belongs_to_instructor();

create policy appointments_instructor_all on maatefet.appointments
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- read-only for the client themselves; no insert/update/delete policy for
-- the client role at all — attendance response goes through the RPC below.
create policy appointments_client_read on maatefet.appointments
  for select to authenticated
  using (client_id = maatefet.my_client_id());

-- ---------- reminders (תזכורות) ----------
create table maatefet.reminders (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  client_id uuid not null references maatefet.clients(id) on delete cascade,
  title text not null,
  detail text,
  remind_at timestamptz,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_reminders_instructor on maatefet.reminders(instructor_id);
create index idx_maatefet_reminders_client on maatefet.reminders(client_id);
alter table maatefet.reminders enable row level security;
grant select, insert, update, delete on maatefet.reminders to authenticated;
grant all on maatefet.reminders to service_role;

create trigger trg_maatefet_reminders_updated_at
  before update on maatefet.reminders
  for each row execute function maatefet.set_updated_at();

create trigger trg_maatefet_reminders_guard_client
  before insert or update on maatefet.reminders
  for each row execute function maatefet.guard_client_belongs_to_instructor();

create policy reminders_instructor_all on maatefet.reminders
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

create policy reminders_client_read on maatefet.reminders
  for select to authenticated
  using (client_id = maatefet.my_client_id());

-- ============================================================================
-- public.maatefet_* wrappers — same convention as 0110/0113 (maatefet schema
-- still not in the Data API's exposed-schemas list; thin SECURITY INVOKER
-- pass-throughs in public keep everything reachable from the browser today).
-- ============================================================================

create or replace function public.maatefet_appointments_list()
returns setof maatefet.appointments
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.appointments order by scheduled_at asc
$$;

revoke all on function public.maatefet_appointments_list() from public;
revoke all on function public.maatefet_appointments_list() from anon;
grant execute on function public.maatefet_appointments_list() to authenticated;

create or replace function public.maatefet_appointment_upsert(
  p_id uuid default null,
  p_client_id uuid default null,
  p_scheduled_at timestamptz default null,
  p_duration_minutes int default 60,
  p_location text default null,
  p_topic text default null,
  p_status text default null
)
returns maatefet.appointments
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.appointments;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can manage appointments';
  end if;

  if p_id is null then
    if p_client_id is null or p_scheduled_at is null then
      raise exception 'client and scheduled time are required';
    end if;
    insert into maatefet.appointments
      (instructor_id, client_id, scheduled_at, duration_minutes, location, topic, status)
    values (
      v_instructor_id, p_client_id, p_scheduled_at, coalesce(p_duration_minutes, 60),
      p_location, p_topic, coalesce(p_status, 'scheduled')
    )
    returning * into v_row;
  else
    update maatefet.appointments
    set scheduled_at = coalesce(p_scheduled_at, scheduled_at),
        duration_minutes = coalesce(p_duration_minutes, duration_minutes),
        location = coalesce(p_location, location),
        topic = coalesce(p_topic, topic),
        status = coalesce(p_status, status)
    where id = p_id and instructor_id = v_instructor_id
    returning * into v_row;
    if v_row.id is null then
      raise exception 'appointment not found';
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_appointment_upsert(uuid, uuid, timestamptz, int, text, text, text) from public;
revoke all on function public.maatefet_appointment_upsert(uuid, uuid, timestamptz, int, text, text, text) from anon;
grant execute on function public.maatefet_appointment_upsert(uuid, uuid, timestamptz, int, text, text, text) to authenticated;

create or replace function public.maatefet_appointment_cancel(p_id uuid)
returns maatefet.appointments
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.appointments
  set status = 'cancelled'
  where id = p_id and instructor_id = maatefet.my_instructor_id()
  returning *
$$;

revoke all on function public.maatefet_appointment_cancel(uuid) from public;
revoke all on function public.maatefet_appointment_cancel(uuid) from anon;
grant execute on function public.maatefet_appointment_cancel(uuid) to authenticated;

-- client attendance confirmation/decline — the only mutation a client session
-- can ever perform on maatefet.appointments, and only on their own row, and
-- only the status/response fields.
create or replace function public.maatefet_appointment_rsvp(p_id uuid, p_attending boolean)
returns maatefet.appointments
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_client_id uuid;
  v_row maatefet.appointments;
begin
  v_client_id := maatefet.my_client_id();
  if v_client_id is null then
    raise exception 'must be a client with a verified 2FA session to respond to an appointment';
  end if;

  update maatefet.appointments
  set status = case when p_attending then 'confirmed' else 'declined' end,
      client_responded_at = now()
  where id = p_id and client_id = v_client_id and status not in ('cancelled', 'completed')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'appointment not found or can no longer be responded to';
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_appointment_rsvp(uuid, boolean) from public;
revoke all on function public.maatefet_appointment_rsvp(uuid, boolean) from anon;
grant execute on function public.maatefet_appointment_rsvp(uuid, boolean) to authenticated;

create or replace function public.maatefet_reminders_list()
returns setof maatefet.reminders
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.reminders order by coalesce(remind_at, created_at) asc
$$;

revoke all on function public.maatefet_reminders_list() from public;
revoke all on function public.maatefet_reminders_list() from anon;
grant execute on function public.maatefet_reminders_list() to authenticated;

create or replace function public.maatefet_reminder_upsert(
  p_id uuid default null,
  p_client_id uuid default null,
  p_title text default null,
  p_detail text default null,
  p_remind_at timestamptz default null,
  p_is_done boolean default null
)
returns maatefet.reminders
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_row maatefet.reminders;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can manage reminders';
  end if;

  if p_id is null then
    if p_client_id is null or p_title is null or btrim(p_title) = '' then
      raise exception 'client and title are required';
    end if;
    insert into maatefet.reminders (instructor_id, client_id, title, detail, remind_at)
    values (v_instructor_id, p_client_id, btrim(p_title), p_detail, p_remind_at)
    returning * into v_row;
  else
    update maatefet.reminders
    set title = coalesce(nullif(btrim(p_title), ''), title),
        detail = coalesce(p_detail, detail),
        remind_at = coalesce(p_remind_at, remind_at),
        is_done = coalesce(p_is_done, is_done)
    where id = p_id and instructor_id = v_instructor_id
    returning * into v_row;
    if v_row.id is null then
      raise exception 'reminder not found';
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_reminder_upsert(uuid, uuid, text, text, timestamptz, boolean) from public;
revoke all on function public.maatefet_reminder_upsert(uuid, uuid, text, text, timestamptz, boolean) from anon;
grant execute on function public.maatefet_reminder_upsert(uuid, uuid, text, text, timestamptz, boolean) to authenticated;

create or replace function public.maatefet_reminder_delete(p_id uuid)
returns boolean
language sql
security invoker
set search_path = maatefet, public
as $$
  with deleted as (
    delete from maatefet.reminders
    where id = p_id and instructor_id = maatefet.my_instructor_id()
    returning 1
  )
  select exists(select 1 from deleted)
$$;

revoke all on function public.maatefet_reminder_delete(uuid) from public;
revoke all on function public.maatefet_reminder_delete(uuid) from anon;
grant execute on function public.maatefet_reminder_delete(uuid) to authenticated;

-- ---------- maatefet_me(): drop the instructor-private notes leak, add aal
-- was already exposed (0112) so the portal can gate on it exactly like
-- instructor.html already does ----------
create or replace function public.maatefet_me()
returns jsonb
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select jsonb_build_object(
    'instructor', (select to_jsonb(i) from maatefet.instructors i where i.auth_user_id = auth.uid()),
    'client', (
      select jsonb_build_object(
        'id', c.id, 'instructor_id', c.instructor_id, 'invite_id', c.invite_id,
        'auth_user_id', c.auth_user_id, 'segment', c.segment,
        'full_name', c.full_name, 'partner_name', c.partner_name,
        'phone', c.phone, 'email', c.email, 'wedding_date', c.wedding_date,
        'created_at', c.created_at, 'updated_at', c.updated_at
      )
      from maatefet.clients c where c.auth_user_id = auth.uid()
    ),
    'is_super_admin', public.more30_is_super_admin(),
    'aal', auth.jwt() ->> 'aal'
  )
$$;

revoke all on function public.maatefet_me() from public;
grant execute on function public.maatefet_me() to authenticated;

-- ---------- registry note ----------
update core.projects
set stage = 'wip',
    note = 'שלב 0 סגור (CRM + ספריית תוכן + פאנל סופר-אדמין + 2FA + הצפנת-שדה). '
  || '[20/08/2026 סבב 7] שלב 1 התחיל: יומן/אישורי הגעה + תזכורות + בקרת גישה מלאה לזוג. '
  || 'שתי טבלאות חדשות — maatefet.appointments, maatefet.reminders — עם RLS מדורג זהה לדפוס הקיים: '
  || 'מדריך/ה מנהל/ת CRUD מלא רק על הזוגות שלו/ה (אכוף גם בטריגר guard_client_belongs_to_instructor, לא רק ב-RLS), '
  || 'הזוג מקבל קריאה-בלבד לשורות שלו בלבד, ואישור/דחיית הגעה עוברים דרך RPC יחיד ומצומצם '
  || '(maatefet_appointment_rsvp) ולא דרך הרשאת כתיבה גולמית. נוסף maatefet.my_client_id() — מקביל ל-my_instructor_id — '
  || 'שדורש aal2 (2FA) לפני שהזוג יכול לקרוא יומן/תזכורות משלו/ה; זה סוגר את הפער שתועד ב-0112 '
  || '("2FA ללקוח לא נבנה — אין עדיין מסך אזור-אישי לשער"), כי עכשיו יש מסך. '
  || 'תוך כדי בניית maatefet_me() לפורטל הזוג נמצא ותוקן פער פרטיות אמיתי: ה-branch של "client" בפונקציה '
  || 'החזיר עד כה (0113) את שדה notes המפוענח — הערות הליווי הפרטיות של המדריך/ה על הזוג — היישר לזוג עצמו '
  || 'דרך maatefet_me() (לא נעשה בו שימוש עד עכשיו, אז הפער היה רדום). הוסר לגמרי משדה "client"; מסך ה-CRM של '
  || 'המדריך/ה (maatefet_clients_list) ממשיך להציג הערות כרגיל — רק פונקציית "אני" של הזוג עצמו לא. '
  || 'נמצא ותוקן גם פער הרשאה חוזר מ-0111: revoke all ... from public לא שולל הרצה מ-anon בפרויקט הזה (הרשאת ברירת מחדל נפרדת) — '
  || 'כל 7 פונקציות ה-public.maatefet_* החדשות היו ניתנות להרצה ע"י anon עד שנוסף revoke ... from anon מפורש לכל אחת (אומת חי לפני/אחרי). '
  || 'לא היה בר-ניצול בפועל (אין הרשאת anon על הטבלאות עצמן, וה-RPC המוגן היחיד בודק auth.uid() בעצמו) — נסגר כהגנת-עומק בהתאם לתקדים. '
  || 'נותר לשלב 1: פרופיל בסיסי לזוג בפורטל (רק תצוגה, לא עריכה — עריכה נשארת אצל המדריך/ה). מפרט מלא: MAATEFET_BUILD.md.'
where number = '39';
