-- more30 · 39-maatefet — stage 4 continues: Google/Apple/Outlook calendar
-- sync via a secret-URL ICS feed
-- ============================================================================
-- MAATEFET_BUILD.md §386 ("תזמון חכם: ... סנכרון ליומן Google") was split
-- across two rounds by 0124's own note: the free-slot-suggestion half needed
-- nothing external and was built there; "the Google Calendar sync half [was]
-- explicitly deferred (it needs OAuth credentials this session does not
-- have) rather than fake it." This migration delivers the real, deterministic
-- part of that remaining half without inventing an OAuth app: a secret,
-- unguessable ICS feed URL per instructor/client — the same "subscribe by
-- secret address" mechanism Google Calendar itself offers for its own
-- calendars, and one that Google Calendar, Apple Calendar and Outlook all
-- already know how to subscribe to natively (Settings → Add calendar → From
-- URL). No client id/secret, no consent screen, no external dependency —
-- just data this schema already owns (maatefet.appointments, 0114).
--
-- Design:
-- - One unguessable token per instructor and per client (encode(gen_random_
--   bytes(20),'hex'), the exact idiom 0108's invites.code already uses for
--   an unguessable capability), gated behind an explicit opt-in boolean
--   (calendar_feed_enabled, default false) — an appointment's topic/location
--   can be sensitive (this is a marriage-counseling context), so the feed
--   must never be live before the instructor/client deliberately turns it
--   on, unlike invites.code which is safe-by-default (useless without a
--   matching pending row).
-- - maatefet_ics_feed(token): SECURITY DEFINER, looks the token up itself
--   (not relying on RLS, because the caller here is never an authenticated
--   maatefet user — it's the Edge Function below, running as service_role,
--   fetched by Google/Apple/Outlook's own servers on a schedule with no
--   Supabase session at all). Granted to service_role only — never callable
--   from a browser session, anon or authenticated, so the only way to reach
--   it is through the Edge Function's own token check.
-- - maatefet_calendar_feed_get/toggle/regenerate: the in-app management
--   surface (instructor.html + portal.html), gated the ordinary way through
--   my_instructor_id()/my_client_id() (both already require aal2 — 0112/
--   0114). toggle/regenerate are SECURITY DEFINER because maatefet.clients
--   has no self-update RLS policy for the client role (0108: clients only
--   ever got clients_self_read) — same shape as maatefet_appointment_rsvp
--   (0114), which solved the identical problem for attendance responses.

alter table maatefet.instructors
  add column if not exists calendar_feed_token text unique default encode(gen_random_bytes(20), 'hex'),
  add column if not exists calendar_feed_enabled boolean not null default false;

alter table maatefet.clients
  add column if not exists calendar_feed_token text unique default encode(gen_random_bytes(20), 'hex'),
  add column if not exists calendar_feed_enabled boolean not null default false;

-- ---------- service-role-only feed reader (the Edge Function's data source) ----------
create or replace function public.maatefet_ics_feed(p_token text)
returns table(
  role text,
  counterpart_name text,
  scheduled_at timestamptz,
  duration_minutes int,
  location text,
  topic text,
  status text,
  appt_id uuid
)
language plpgsql
stable
security definer
set search_path = maatefet, public
as $$
declare
  v_instructor maatefet.instructors;
  v_client maatefet.clients;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'missing token';
  end if;

  select * into v_instructor from maatefet.instructors
  where calendar_feed_token = p_token and calendar_feed_enabled = true;

  if v_instructor.id is not null then
    return query
      select 'instructor', c.full_name, a.scheduled_at, a.duration_minutes, a.location, a.topic, a.status, a.id
      from maatefet.appointments a
      join maatefet.clients c on c.id = a.client_id
      where a.instructor_id = v_instructor.id
        and a.status not in ('cancelled', 'declined')
      order by a.scheduled_at;
    return;
  end if;

  select * into v_client from maatefet.clients
  where calendar_feed_token = p_token and calendar_feed_enabled = true;

  if v_client.id is not null then
    return query
      select 'client', i.full_name, a.scheduled_at, a.duration_minutes, a.location, a.topic, a.status, a.id
      from maatefet.appointments a
      join maatefet.instructors i on i.id = a.instructor_id
      where a.client_id = v_client.id
        and a.status not in ('cancelled', 'declined')
      order by a.scheduled_at;
    return;
  end if;

  raise exception 'invalid or disabled calendar feed token';
end;
$$;

revoke all on function public.maatefet_ics_feed(text) from public;
revoke all on function public.maatefet_ics_feed(text) from anon;
revoke all on function public.maatefet_ics_feed(text) from authenticated;
grant execute on function public.maatefet_ics_feed(text) to service_role;

-- ---------- in-app management (instructor + client, own row only) ----------
create or replace function public.maatefet_calendar_feed_get()
returns jsonb
language plpgsql
stable
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_client_id uuid;
  v_token text;
  v_enabled boolean;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is not null then
    select calendar_feed_token, calendar_feed_enabled into v_token, v_enabled
    from maatefet.instructors where id = v_instructor_id;
    return jsonb_build_object('role', 'instructor', 'token', v_token, 'enabled', v_enabled);
  end if;

  v_client_id := maatefet.my_client_id();
  if v_client_id is not null then
    select calendar_feed_token, calendar_feed_enabled into v_token, v_enabled
    from maatefet.clients where id = v_client_id;
    return jsonb_build_object('role', 'client', 'token', v_token, 'enabled', v_enabled);
  end if;

  raise exception 'not an authenticated instructor or client session';
end;
$$;

revoke all on function public.maatefet_calendar_feed_get() from public;
revoke all on function public.maatefet_calendar_feed_get() from anon;
grant execute on function public.maatefet_calendar_feed_get() to authenticated;

create or replace function public.maatefet_calendar_feed_toggle(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_client_id uuid;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is not null then
    update maatefet.instructors set calendar_feed_enabled = coalesce(p_enabled, false) where id = v_instructor_id;
  else
    v_client_id := maatefet.my_client_id();
    if v_client_id is null then
      raise exception 'not an authenticated instructor or client session';
    end if;
    update maatefet.clients set calendar_feed_enabled = coalesce(p_enabled, false) where id = v_client_id;
  end if;

  return public.maatefet_calendar_feed_get();
end;
$$;

revoke all on function public.maatefet_calendar_feed_toggle(boolean) from public;
revoke all on function public.maatefet_calendar_feed_toggle(boolean) from anon;
grant execute on function public.maatefet_calendar_feed_toggle(boolean) to authenticated;

create or replace function public.maatefet_calendar_feed_regenerate()
returns jsonb
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_client_id uuid;
  v_new_token text := encode(gen_random_bytes(20), 'hex');
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is not null then
    update maatefet.instructors set calendar_feed_token = v_new_token where id = v_instructor_id;
  else
    v_client_id := maatefet.my_client_id();
    if v_client_id is null then
      raise exception 'not an authenticated instructor or client session';
    end if;
    update maatefet.clients set calendar_feed_token = v_new_token where id = v_client_id;
  end if;

  return public.maatefet_calendar_feed_get();
end;
$$;

revoke all on function public.maatefet_calendar_feed_regenerate() from public;
revoke all on function public.maatefet_calendar_feed_regenerate() from anon;
grant execute on function public.maatefet_calendar_feed_regenerate() to authenticated;

-- ---------- registry note ----------
update core.projects
set note = note || ' [20/08/2026 סבב 21] שלב 4 ממשיך — סנכרון יומן Google/Apple/Outlook '
  || 'דרך פיד ICS בכתובת-סוד (בלי OAuth — לא היה client id/secret בסבב הזה, אז נבנה המנגנון האמיתי '
  || 'החלופי: אותו "subscribe by secret URL" ש-Google Calendar עצמו מציע ליומנים שלו, ושכל שלושת '
  || 'הלקוחות — Google/Apple/Outlook — יודעים להירשם אליו נטיבית). טוקן ייחודי בלתי-ניתן-לניחוש '
  || '(160 סיביות) לכל מדריך/ה ולכל זוג בנפרד, כבוי כברירת מחדל (calendar_feed_enabled=false) — '
  || 'נושא/מיקום פגישה עלול להיות רגיש בהקשר ליווי-זוגי, אז הפיד לא חי עד הפעלה מפורשת. פונקציית '
  || 'הקריאה (maatefet_ics_feed) מוגבלת ל-service_role בלבד ונקראת רק דרך Edge Function ייעודי '
  || '(maatefet-ics, verify_jwt=false בכוונה — מנוי-לוח-שנה חיצוני מגיע בלי JWT בכלל). '
  || 'הפעלה/כיבוי/החלפת-טוקן דרך שלוש פונקציות חדשות ב-public, עם אותה חסימת aal2 הקיימת בכל '
  || 'מקום אחר (my_instructor_id/my_client_id). נותר בשלב 4: סליקת מנויים בפועל (מחכה ל-live=true) + '
  || 'סוכן AI + וואטסאפ דו-כיווני. מפרט מלא: MAATEFET_BUILD.md.'
where number = '39';
