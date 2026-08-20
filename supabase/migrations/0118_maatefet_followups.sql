-- more30 · 39-maatefet — stage 3 begins: module 5, ליווי אחרי החתונה (the
-- spec's explicit differentiator module) + first roadmap item of stage 3
-- ============================================================================
-- MAATEFET_BUILD.md roadmap: "שלב 3: ליווי אחרי החתונה + דירקטוריז (הזנה
-- הדרגתית) + ארגון חתונה." Stage 2 (chatan-segment branding, module 6
-- instructor coordination, module 7 professional forum, module 2 content
-- studio + personal branding) closed in 0117 with "עדיין לא נבנה בשלב 2: כלום".
--
-- The gap: once a couple is married, MAATEFET_BUILD.md's own "החלטות יסוד
-- מחייבות" calls out post-wedding follow-up as "הבידול" — the thing that
-- makes this platform more than a pre-wedding CRM. Until this migration there
-- was no way for an instructor to schedule a check-in after the wedding date,
-- and no way for the couple to answer one from their own portal. This adds
-- exactly that, reusing every pattern this schema has already proven:
--
-- - `maatefet.followups`: one row per scheduled check-in (30/90/180-day or
--   1-year milestone, or a custom date), owned by the instructor, scoped to
--   one of their own clients — same `instructor_id`+`client_id` shape as
--   appointments/reminders (0114), so it reuses `guard_client_belongs_to_
--   instructor()` unchanged rather than writing a near-duplicate trigger.
-- - Milestone → suggested date is computed server-side from the client's
--   `wedding_date` (30/90/180/365 days out) when the instructor leaves the
--   date blank, so the common case needs one click, not manual arithmetic;
--   `custom` requires an explicit date since there's nothing to default from.
-- - Lifecycle mirrors `appointments.status` deliberately (`pending` → `sent`
--   → `completed`/`skipped`), but the *mutation surface* is narrower and
--   asymmetric on purpose: the instructor manages everything except the
--   answers themselves; the couple can only ever submit their own answers
--   through one SECURITY DEFINER RPC (`maatefet_followup_respond`), exactly
--   the same "no raw client write policy, one narrow RPC" shape 0114
--   established for `maatefet_appointment_rsvp`.
-- - `flagged`/`instructor_note` are instructor-only fields (a quiet, manual
--   "needs a closer look" marker on a couple's answers — MAATEFET_BUILD.md's
--   "תוספות מתקדמות" describes an eventual AI-assisted version of this; this
--   migration builds the manual, non-diagnostic version the spec's stage
--   ordering actually calls for right now, not the AI version, which needs
--   its own scoping). These must never reach the couple's own view of their
--   answers — same privacy shape as the counseling notes leak fixed in 0114
--   (`maatefet_me()`'s client branch dropping `notes`). Rather than repeat
--   that mistake with a shared `select *` wrapper, this migration ships two
--   separate read functions from the start: `maatefet_followups_list()`
--   (instructor-facing, every column, RLS-scoped to their own clients) and
--   `maatefet_followup_my_list()` (couple-facing, explicit column list that
--   omits `flagged`/`instructor_note` entirely — not just filtered client-side).
--
-- Standard privilege check repeated from 0111/0114/0115/0116/0117 (this
-- project's `public` schema does not have PostgREST's usual "revoke from
-- public also blocks anon" behaviour — anon gets a separate default grant):
-- every new `public.maatefet_*` function below gets an explicit
-- `revoke ... from anon` verified live after creation, not assumed.

-- ---------- followups (module 5: ליווי אחרי החתונה) ----------
create table maatefet.followups (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  client_id uuid not null references maatefet.clients(id) on delete cascade,
  milestone text not null
    check (milestone in ('30_day', '90_day', '180_day', '1_year', 'custom')),
  scheduled_at date not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'completed', 'skipped')),
  sent_at timestamptz,
  completed_at timestamptz,
  answers jsonb,
  instructor_note text,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_followups_instructor on maatefet.followups(instructor_id);
create index idx_maatefet_followups_client on maatefet.followups(client_id);
create index idx_maatefet_followups_scheduled on maatefet.followups(scheduled_at);
alter table maatefet.followups enable row level security;
grant select, insert, update, delete on maatefet.followups to authenticated;
grant all on maatefet.followups to service_role;

create trigger trg_maatefet_followups_updated_at
  before update on maatefet.followups
  for each row execute function maatefet.set_updated_at();

-- reuses the 0114 guard unchanged — same (instructor_id, client_id) shape.
create trigger trg_maatefet_followups_guard_client
  before insert or update on maatefet.followups
  for each row execute function maatefet.guard_client_belongs_to_instructor();

create policy followups_instructor_all on maatefet.followups
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- row-level only; column-level privacy (hiding flagged/instructor_note from
-- the couple) is enforced by maatefet_followup_my_list() below, never by a
-- raw `select *` reachable from a client session — same shape 0108/0114
-- already rely on for maatefet.clients (RLS scopes rows, the public wrapper
-- function scopes columns).
create policy followups_client_read on maatefet.followups
  for select to authenticated
  using (client_id = maatefet.my_client_id());

-- ============================================================================
-- public.maatefet_* wrappers
-- ============================================================================

-- instructor-facing: every column, RLS scopes rows to their own clients (or
-- super-admin, same as every other _list function in this schema).
create or replace function public.maatefet_followups_list()
returns setof maatefet.followups
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.followups order by scheduled_at desc
$$;

revoke all on function public.maatefet_followups_list() from public;
revoke all on function public.maatefet_followups_list() from anon;
grant execute on function public.maatefet_followups_list() to authenticated;

-- couple-facing: explicit column list, deliberately omitting flagged/
-- instructor_note — those are the instructor's own private read on a
-- check-in, not something the couple should ever see about themselves.
create or replace function public.maatefet_followup_my_list()
returns table (
  id uuid, milestone text, scheduled_at date, status text,
  sent_at timestamptz, completed_at timestamptz, answers jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = maatefet, public
as $$
  select f.id, f.milestone, f.scheduled_at, f.status,
         f.sent_at, f.completed_at, f.answers, f.created_at
  from maatefet.followups f
  where f.client_id = maatefet.my_client_id()
  order by f.scheduled_at desc
$$;

revoke all on function public.maatefet_followup_my_list() from public;
revoke all on function public.maatefet_followup_my_list() from anon;
grant execute on function public.maatefet_followup_my_list() to authenticated;

-- instructor create/update. Milestone → suggested date computed server-side
-- from the client's wedding_date when left blank on create (nothing to
-- default from on update, so an update always requires an explicit date if
-- it changes anything about scheduling).
create or replace function public.maatefet_followup_upsert(
  p_id uuid default null,
  p_client_id uuid default null,
  p_milestone text default null,
  p_scheduled_at date default null,
  p_instructor_note text default null
)
returns maatefet.followups
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_instructor_id uuid;
  v_wedding_date date;
  v_offset_days int;
  v_scheduled date;
  v_row maatefet.followups;
begin
  v_instructor_id := maatefet.my_instructor_id();
  if v_instructor_id is null then
    raise exception 'only a verified instructor can manage follow-ups';
  end if;

  if p_id is null then
    if p_client_id is null or p_milestone is null then
      raise exception 'client and milestone are required';
    end if;

    v_scheduled := p_scheduled_at;
    if v_scheduled is null then
      if p_milestone = 'custom' then
        raise exception 'a custom follow-up requires an explicit date';
      end if;
      select wedding_date into v_wedding_date from maatefet.clients where id = p_client_id;
      if v_wedding_date is null then
        raise exception 'client has no wedding date on file — set an explicit date instead';
      end if;
      v_offset_days := case p_milestone
        when '30_day' then 30 when '90_day' then 90
        when '180_day' then 180 when '1_year' then 365
        else null
      end;
      v_scheduled := v_wedding_date + v_offset_days;
    end if;

    insert into maatefet.followups
      (instructor_id, client_id, milestone, scheduled_at, instructor_note)
    values (v_instructor_id, p_client_id, p_milestone, v_scheduled, p_instructor_note)
    returning * into v_row;
  else
    update maatefet.followups
    set milestone = coalesce(p_milestone, milestone),
        scheduled_at = coalesce(p_scheduled_at, scheduled_at),
        instructor_note = coalesce(p_instructor_note, instructor_note)
    where id = p_id and instructor_id = v_instructor_id
    returning * into v_row;
    if v_row.id is null then
      raise exception 'follow-up not found';
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_followup_upsert(uuid, uuid, text, date, text) from public;
revoke all on function public.maatefet_followup_upsert(uuid, uuid, text, date, text) from anon;
grant execute on function public.maatefet_followup_upsert(uuid, uuid, text, date, text) to authenticated;

create or replace function public.maatefet_followup_mark_sent(p_id uuid)
returns maatefet.followups
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.followups
  set status = 'sent', sent_at = now()
  where id = p_id and instructor_id = maatefet.my_instructor_id() and status = 'pending'
  returning *
$$;

revoke all on function public.maatefet_followup_mark_sent(uuid) from public;
revoke all on function public.maatefet_followup_mark_sent(uuid) from anon;
grant execute on function public.maatefet_followup_mark_sent(uuid) to authenticated;

create or replace function public.maatefet_followup_mark_skipped(p_id uuid)
returns maatefet.followups
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.followups
  set status = 'skipped'
  where id = p_id and instructor_id = maatefet.my_instructor_id() and status in ('pending', 'sent')
  returning *
$$;

revoke all on function public.maatefet_followup_mark_skipped(uuid) from public;
revoke all on function public.maatefet_followup_mark_skipped(uuid) from anon;
grant execute on function public.maatefet_followup_mark_skipped(uuid) to authenticated;

create or replace function public.maatefet_followup_flag(p_id uuid, p_flagged boolean)
returns maatefet.followups
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.followups
  set flagged = p_flagged
  where id = p_id and instructor_id = maatefet.my_instructor_id()
  returning *
$$;

revoke all on function public.maatefet_followup_flag(uuid, boolean) from public;
revoke all on function public.maatefet_followup_flag(uuid, boolean) from anon;
grant execute on function public.maatefet_followup_flag(uuid, boolean) to authenticated;

-- the couple's only mutation on this table: submit their own answers to
-- their own follow-up, once. Not available once completed/skipped — same
-- "narrow RPC, no raw write policy" shape as maatefet_appointment_rsvp.
create or replace function public.maatefet_followup_respond(p_id uuid, p_answers jsonb)
returns maatefet.followups
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_client_id uuid;
  v_row maatefet.followups;
begin
  v_client_id := maatefet.my_client_id();
  if v_client_id is null then
    raise exception 'must be a client with a verified 2FA session to respond to a follow-up';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be a JSON object';
  end if;

  update maatefet.followups
  set status = 'completed', answers = p_answers, completed_at = now()
  where id = p_id and client_id = v_client_id and status in ('pending', 'sent')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'follow-up not found or already answered';
  end if;

  return v_row;
end;
$$;

revoke all on function public.maatefet_followup_respond(uuid, jsonb) from public;
revoke all on function public.maatefet_followup_respond(uuid, jsonb) from anon;
grant execute on function public.maatefet_followup_respond(uuid, jsonb) to authenticated;

-- ---------- registry note ----------
update core.projects
set note = note || E'\n\n[20/08/2026 Loop C סבב 12] שלב 3 התחיל — מודול 5, ליווי אחרי החתונה '
  || '("הבידול" לפי סעיף היסוד המחייב של האפיון). maatefet.followups: בדיקת-מעקב אחת לכל אבן-דרך '
  || '(30/90/180 יום או שנה, או תאריך מותאם-אישית), בבעלות המדריך/ה, בטווח לקוח שלו/ה בלבד — אותה '
  || 'צורת instructor_id+client_id כמו appointments/reminders (0114), משתמשת מחדש ב-guard_client_belongs_to_instructor '
  || 'ללא שינוי. תאריך מוצע מחושב בשרת מ-wedding_date כשהמדריך/ה משאיר/ה את השדה ריק (custom דורש תאריך מפורש). '
  || 'מחזור-חיים: pending → sent → completed/skipped, אך המדריך/ה היחיד/ה שיכול/ה לגעת ברוב השדות — הזוג יכול/ה '
  || 'רק להגיש תשובות לשאלון של עצמו/ה, פעם אחת, דרך RPC יחיד ומצומצם (maatefet_followup_respond, SECURITY DEFINER), '
  || 'אותו דפוס בדיוק כמו maatefet_appointment_rsvp. flagged/instructor_note (סימון-ידני "לבדיקה נוספת", לא אבחון AI — '
  || 'זו מהגרסה הבנויה עכשיו, לא הגרסה מבוססת-הבינה שתועדה ב"תוספות מתקדמות") נשארים אצל המדריך/ה בלבד: '
  || 'נבנו מההתחלה שתי פונקציות קריאה נפרדות במקום select * משותפת (כדי לא לחזור על פער-הפרטיות שתוקן ב-0114) — '
  || 'maatefet_followups_list (מדריך/ה, כל העמודות, RLS-מוגבל) ו-maatefet_followup_my_list (זוג, רשימת עמודות '
  || 'מפורשת שמשמיטה flagged/instructor_note לגמרי, לא רק מסתירה בצד הלקוח). UI: instructor.html קיבל טאב '
  || '"ליווי אחרי החתונה" (יצירת בדיקת-מעקב עם הצעת-תאריך אוטומטית, רשימה, סימון-כנשלח/כדולג, סימון/הסרת דגל, '
  || 'צפייה בתשובות). portal.html קיבל כרטיס "מעקב אחרי החתונה" — שאלון קצר למילוי (סולם 1-5 + טקסט חופשי) '
  || 'ותשובות שכבר הוגשו כתצוגה-בלבד. אפס רגרסיה: אף טאב/כרטיס/RPC קיים לא נגע. עדיין לא נבנה בשלב 3: דירקטוריז '
  || '(פוסקים/מקוואות/מסדרי קידושין/בודקות/יועצים), ארגון חתונה.'
where number = '39';
