-- more30 · 39-maatefet — stage 4 continues: rule-based red-flag suggestion on
-- post-wedding follow-up answers (module 5)
-- ============================================================================
-- MAATEFET_BUILD.md's "תוספות מתקדמות" (§383-388) lists "זיהוי דגלים אדומים
-- ב-AI על שאלוני המעקב אחרי החתונה — התראה עדינה ומכובדת למדריך/ה (בלי
-- לאבחן, רק לסמן לבדיקה)" as a future extra. 0118's own comment explicitly
-- deferred this, calling the manual `flagged`/`instructor_note` pair "the
-- non-AI version... the AI version needs its own scoping." Round 15
-- (0121, cross-instructor analytics) set the bar for scoping an item out of
-- "תוספות מתקדמות" early: build the real, working version of whatever part
-- doesn't actually need an external provider/API key, rather than stub an
-- integration this session has no credential for. The "בלי לאבחן, רק לסמן
-- לבדיקה" (no diagnosis, only flag for review) instruction in the spec text
-- itself describes exactly a threshold rule, not a model call — so that's
-- what this migration builds: real, deterministic, and fully inspectable by
-- the instructor via `auto_flag_reason`, not an invented LLM dependency.
--
-- Two 1-5 scale questions already exist on the follow-up questionnaire
-- (portal.html/instructor.html FOLLOWUP_QUESTIONS: `mood`, `communication`).
-- A low score (<=2 of 5) on either is a plain, explainable signal worth a
-- gentle nudge to look closer — computed server-side in
-- `maatefet_followup_respond` at the moment the couple submits, the one
-- place both scale answers are already validated as a JSON object.
--
-- `auto_flagged`/`auto_flag_reason` are kept **separate** from the existing
-- manual `flagged`/`instructor_note` pair, not merged into it: `flagged` is
-- the instructor's own confirmed judgment (0118), and collapsing a system
-- suggestion into that field would make every auto-suggestion look like an
-- instructor decision nobody made. The instructor can still promote a
-- suggestion into their own `flagged` via the existing
-- `maatefet_followup_flag` (unchanged), or dismiss the suggestion via the
-- new `maatefet_followup_autoflag_dismiss` without that touching `flagged`
-- at all — two independent signals, exactly like flagged/instructor_note
-- already are two independent fields.
--
-- Same privacy shape as 0118: `maatefet_followup_my_list()` (couple-facing)
-- already ships an explicit column list that omits `flagged`/
-- `instructor_note` — it is *not* touched here, so the two new columns are
-- excluded from the couple's own view the same way, by construction, not by
-- an added filter. `maatefet_followups_list()` (instructor-facing `select *`)
-- picks the new columns up automatically.
--
-- Standard privilege check repeated from 0111/.../0122: every new
-- `public.maatefet_*` function gets an explicit `revoke ... from anon`.

alter table maatefet.followups
  add column auto_flagged boolean not null default false,
  add column auto_flag_reason text;

-- replaces 0118's version: same signature, same couple-only-once contract —
-- adds the threshold check between validating p_answers and the update.
create or replace function public.maatefet_followup_respond(p_id uuid, p_answers jsonb)
returns maatefet.followups
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_client_id uuid;
  v_row maatefet.followups;
  v_mood int;
  v_comm int;
  v_reasons text[] := '{}';
  v_auto_flagged boolean := false;
  v_auto_reason text := null;
begin
  v_client_id := maatefet.my_client_id();
  if v_client_id is null then
    raise exception 'must be a client with a verified 2FA session to respond to a follow-up';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'answers must be a JSON object';
  end if;

  -- non-diagnostic threshold rule, not a model call: a low score on either
  -- 1-5 scale question is a plain signal worth a nudge, never a conclusion.
  -- Wrapped per-field so a non-numeric/out-of-range value on one question
  -- (free text under `topic`/`notes` never reaches here) never blocks the
  -- couple's answer from saving — it just skips that one signal.
  begin
    v_mood := (p_answers->>'mood')::int;
  exception when others then v_mood := null;
  end;
  begin
    v_comm := (p_answers->>'communication')::int;
  exception when others then v_comm := null;
  end;

  -- array_append(), not `||`: with v_reasons declared text[], `v_reasons ||
  -- 'literal'` resolves to the anyarray||anyarray overload for an untyped
  -- string literal, and a multi-word Hebrew string isn't valid `{a,b}` array
  -- syntax — it throws "malformed array literal" at the first real low
  -- score, not at deploy time. Caught live via MCP (see registry note below)
  -- and fixed before this ever reached a real couple's submission.
  if v_mood is not null and v_mood between 1 and 5 and v_mood <= 2 then
    v_reasons := array_append(v_reasons, 'מצב הזוגיות דורג נמוך');
  end if;
  if v_comm is not null and v_comm between 1 and 5 and v_comm <= 2 then
    v_reasons := array_append(v_reasons, 'קלות השיח על קשיים דורגה נמוך');
  end if;
  if array_length(v_reasons, 1) > 0 then
    v_auto_flagged := true;
    v_auto_reason := array_to_string(v_reasons, '; ');
  end if;

  update maatefet.followups
  set status = 'completed', answers = p_answers, completed_at = now(),
      auto_flagged = v_auto_flagged, auto_flag_reason = v_auto_reason
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

-- instructor-only: clears the system suggestion after it's been reviewed,
-- without touching the instructor's own `flagged`/`instructor_note`. Keeps
-- `auto_flag_reason` in place as a record of what was suggested — only the
-- instructor (or super-admin) can ever read it via maatefet_followups_list,
-- so there's no privacy reason to erase it, and re-suggesting later (there
-- is no re-submission path today — status leaves 'pending'/'sent' for good
-- on respond) would otherwise have nothing to compare against.
create or replace function public.maatefet_followup_autoflag_dismiss(p_id uuid)
returns maatefet.followups
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.followups
  set auto_flagged = false
  where id = p_id and instructor_id = maatefet.my_instructor_id()
  returning *
$$;

revoke all on function public.maatefet_followup_autoflag_dismiss(uuid) from public;
revoke all on function public.maatefet_followup_autoflag_dismiss(uuid) from anon;
grant execute on function public.maatefet_followup_autoflag_dismiss(uuid) to authenticated;

-- ---------- registry note ----------
update core.projects
set note = note || E'\n\n[20/08/2026 Loop C סבב 17] תוספת מ"תוספות מתקדמות": זיהוי דגלים-אדומים על שאלוני המעקב '
  || 'אחרי החתונה — לא סוכן AI (שדורש מפתח API חיצוני שאין לסבב הזה), אלא הגרסה הדטרמיניסטית והשקופה שהטקסט '
  || 'של הספֵּק עצמו מתאר ("בלי לאבחן, רק לסמן לבדיקה"): כלל-סף פשוט על שתי שאלות הסולם הקיימות '
  || '(mood/communication, 1-5) — ציון 2 ומטה באחת מהן מדליק auto_flagged+auto_flag_reason בזמן ההגשה '
  || '(maatefet_followup_respond). נשמר בכוונה **נפרד** מ-flagged/instructor_note הידני (0118): הצעת-מערכת '
  || 'אינה החלטת-מדריך/ה שאיש לא קיבל בפועל. מדריך/ה יכול/ה לאמץ את ההצעה לתוך flagged הידני (RPC קיים, ללא שינוי) '
  || 'או לבטל אותה דרך maatefet_followup_autoflag_dismiss החדש (revoke מ-anon, כמו כל RPC בסכימה). פרטיות: '
  || 'maatefet_followup_my_list (הזוג) לא נגעה — רשימת עמודות מפורשת ממילא משמיטה את שתי העמודות החדשות, '
  || 'כמו flagged/instructor_note; maatefet_followups_list (מדריך/ה, select *) קולטת אותן אוטומטית. UI: '
  || 'instructor.html — תג "⚠ מוצע לבדיקה" (צבע gold, שונה מ-rose של flagged הידני) + כפתור "בטל הצעה" בטבלת '
  || 'הליווי, עם סיבת ההצעה כ-title. אפס רגרסיה: עמודות חדשות בלבד + overload קיים הוחלף באותה חתימה בדיוק '
  || '(uuid, jsonb) — כל קריאה קיימת ל-maatefet_followup_respond ממשיכה לעבוד זהה. '
  || 'אומת חי דרך MCP (משתמש בדיקה עם auth.users+2FA מדומה): נמצא ותוקן באג אמיתי לפני שהגיע למשתמש אמיתי — '
  || '`v_reasons || \'טקסט עברי עם רווחים\'` על משתנה text[] פונה ל-overload anyarray||anyarray ולא anyarray||anyelement, '
  || 'וקורס ב-"malformed array literal" בדיוק ברגע שציון נמוך ראשון היה מגיע; הוחלף ב-array_append(). אומת מחדש: '
  || 'ציון נמוך ב-mood בלבד → auto_flagged עם הסיבה הנכונה, שני ציונים תקינים → ללא דגל, ביטול-הצעה על ידי המדריך '
  || 'מנקה auto_flagged בלבד, anon נדחה (permission denied) על שתי הפונקציות. 0 שורות בדיקה שיוריות.'
where number = '39';
