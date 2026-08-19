-- 0087 — שכפול בקלות שכבה 3
-- הכרעה על פנייה דורסת את זו שלפניה, ולכן אין היסטוריית הכרעות.
--
-- מי כתב את הקו הזה: 839386a בסופה, מילה במילה: «קווים שממשיכים ולא נגעו: אין
-- היסטוריית הכרעות». לפניה כתבו אותו a6e8844, 7d7dcf2, e28a004 ו-147c39d,
-- באותן מילים ובאותו מקום — קו שנרשם בכל פעימה מאז 0076 ולא נלקח באף אחת מהן.
-- כאן הוא נלקח, ורק הוא.
--
-- מה היה: 0076 בנתה על bkalot_clone.cases את decided_by ואת decided_at, ונתנה
-- ל-bkalot_clone_admin_set_status ארגומנט שני, p_admin_id, שהשער ממלא מהטוקן.
-- מאז כל הכרעה נרשמת — אבל אל אותן שתי עמודות בדיוק, ב-UPDATE. שתי עמודות
-- מחזיקות ערך אחד, ולכן פנייה שמנהל אחד לקח, שני סגר ושלישי דחה מציגה את
-- השלישי בלבד; שני הראשונים אינם קיימים בשום מקום במסד, ולא כשדה ריק אלא
-- כהיעדר גמור. נמדד ולא הונח לפני המיגרציה: פנייה #222 עברה new → in_progress
-- (מנהל 76), in_progress → closed (77) ו-closed → rejected (77), שלוש הכרעות
-- אמיתיות דרך נתיב set-status שמאחורי השער — ואחריהן השורה החזיקה
-- decided_by=77 ו-decided_at אחד. ההכרעה של 76 לא הייתה ניתנת לשחזור.
--
-- למה זה חשוב כאן ולא רק כרעיון: status הוא השדה היחיד בשכפול שאדם משנה ידנית
-- על פניית אדם אחר. 'rejected' פירושו שאזרח לא יקבל את מה שביקש, ואם מי שדחה
-- נדרס בידי מי שנגע אחריו — השאלה «מי דחה את הפנייה הזו ומתי» אין לה תשובה
-- במערכת. זה ההבדל בין מצב לבין תיעוד.
--
-- מה נבנה כאן: טבלה אחת, bkalot_clone.case_status_log, ושורה בה על כל מעבר
-- שקרה בפועל; ו-bkalot_clone_admin_set_status כותבת אליה באותה עסקה שבה היא
-- מעדכנת את השורה. אין נגיעה ב-cases (decided_by/decided_at נשארים ומתעדכנים
-- כמקודם), אין נגיעה ב-render, ב-intake, ב-admin_case, ב-admin_cases,
-- ב-admin_document, ב-edge ולא ב-apps/37. אף קורא אינו מחזיר עדיין את הטבלה
-- הזו — זו הלבנה הבאה.
--
-- שבע הכרעות:
--
-- (1) טבלה ולא עמודת jsonb על cases. מערך שנדחף ב-UPDATE הוא כתיבה מחדש של כל
--     מה שכבר נרשם, ולכן באג יחיד בביטוי הדחיפה מוחק היסטוריה במקום להוסיף לה
--     — בדיוק הכישלון שהפעימה הזו נבנתה כדי למנוע. insert-only פירושו שאין
--     בפונקציה משפט אחד שיכול לגעת בשורה שכבר נכתבה.
--
-- (2) admin_id בלי FK, במכוון — אותה הכרעה בדיוק כמו documents.produced_by
--     ב-0083. FK עם cascade היה מוחק את שורות היומן של עובד שהתפטר, כלומר מוחק
--     את הראיה שפנייה נדחתה מפני שמי שדחה אותה עזב; FK עם restrict היה הופך
--     מחיקת עובד לשגיאה. נמדד ולא הונח: אחרי מחיקת חשבון 77 שתי שורות היומן
--     שנושאות אותו נשארו במקומן עם 77 בתוכן.
--
-- (3) case_id עם FK ו-ON DELETE CASCADE, ולא כמו (2). היומן הוא על פנייה, ואינו
--     נועד לשרוד אותה: case_rights ו-documents שתיהן cascade מאותו טעם, ושורת
--     יומן שמצביעה על פנייה שאינה קיימת אינה ראיה אלא רעש. עובד ופנייה אינם
--     אותו דבר — האחד יוצא מהארגון והשנייה נמחקת מהמערכת.
--
-- (4) from_status נרשם ולא רק to_status. יומן שמחזיק יעד בלבד ניתן לקריאה רק
--     ברצף מלא ולפי סדר, ולכן שורה בודדת — או רצף עם פער — אינה אומרת דבר.
--     שני השדות בשורה אחת פירושם שכל שורה היא משפט שלם בפני עצמו, ושפער ביומן
--     נראה לעין (to של שורה ≠ from של הבאה) במקום להיבלע.
--
-- (5) אין שורה כשלא השתנה דבר. set_status מחזירה כבר היום changed=false על
--     הכרעה חוזרת ויוצאת לפני ה-UPDATE; היומן יוצא איתה. אחרת לחיצה כפולה על
--     אותו כפתור הייתה כותבת «in_progress → in_progress», ויומן שמתמלא ברעש
--     הוא יומן שמפסיקים לקרוא. נמדד: ארבע קריאות set-status, אחת מהן חוזרת,
--     שלוש שורות ביומן — לא ארבע; ועל הקריאה החוזרת log_id חזר null.
--
-- (6) at הוא v_now עצמו ולא now() שני. הפונקציה כותבת את אותו ערך אל
--     cases.decided_at ואל שורת היומן, ולכן שני המקומות אומרים את אותה שנייה
--     מעצם הבנייה. now() נוסף היה נכון היום (stable בתוך עסקה) ושבור ביום שבו
--     מישהו יוציא את הכתיבה החוצה — הכרעה (2) של 0082 באותו נוסח.
--
-- (7) אין grant ואין policy. RLS מופעל בלי ולו policy אחת, ולא ניתנת הרשאה
--     לאיש — גם לא ל-service_role, בשונה מ-cases/case_rights/documents ובדומה
--     ל-admin_users ול-admin_sessions. הפונקציה היא SECURITY DEFINER ורצה
--     כבעלים, ולכן הדרך היחידה לכתוב ליומן הזה עוברת דרכה. זו כל הנקודה של
--     יומן: שלא יהיה מסלול שכותב בו בלי לעבור במקום שמחליט מה נכתב.
--
-- ההרשאות של הפונקציה אינן ניתנות מחדש בכוונה: create or replace שומר ACL.
-- הבסיס שנמדד לפני: anon=false, authenticated=false, service_role=true.
--
-- מה שלא נבנה כאן ונאמר במפורש: אין backfill. ל-cases קיימות שיושבות היום עם
-- decided_by ו-decided_at יש עובדה אחת ואין ידיעה כמה הכרעות היו לפניה, ושורת
-- יומן שהייתה נוצרת מהן הייתה טוענת «new → הסטטוס הנוכחי» — מעבר שאיש לא מדד
-- ושייתכן שמעולם לא קרה. יומן שמתחיל מהיום הוא נכון; יומן שמתחיל מהמצאה אינו.
-- (בפועל הטבלה החיה ריקה בזמן הכתיבה — cases=0 — ולכן אין כאן אפילו שורה אחת
-- שהיה אפשר להסיק עליה משהו.)
--
-- 🚫 מצב טסט: הפונקציה נוגעת בעמודת status של bkalot_clone.cases ובטבלת היומן
--    החדשה ותו לא. אין בה נגיעה ב-outbound_queue, ב-delivery_log ולא בשום ערוץ
--    שליחה, ולא יוצאת ממנה ולו הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

create table if not exists bkalot_clone.case_status_log (
  id          bigint generated always as identity primary key,
  case_id     bigint      not null references bkalot_clone.cases(id) on delete cascade,
  from_status text        not null,
  to_status   text        not null,
  admin_id    bigint,
  at          timestamptz not null default now(),
  -- אותה רשימת היתר של cases_status_known, ובאותו נוסח: שורת יומן שמתעדת מעבר
  -- אל סטטוס שהטבלה עצמה אינה מתירה היא שורה שמתארת מצב שלא היה.
  constraint case_status_log_from_known
    check (from_status = any (array['new','in_progress','sent','closed','rejected'])),
  constraint case_status_log_to_known
    check (to_status   = any (array['new','in_progress','sent','closed','rejected'])),
  -- הכרעה (5) כאילוץ ולא כהסכמה: שורה שבה המקור והיעד זהים אינה מעבר.
  constraint case_status_log_is_a_change check (from_status <> to_status)
);

comment on table bkalot_clone.case_status_log is
  'היסטוריית הכרעות על פנייה — שורה לכל מעבר סטטוס שקרה בפועל. insert-only.';

-- קריאת היומן היא תמיד «כל ההכרעות על הפנייה הזו, לפי הסדר». id בסוף כשובר
-- שוויון: at אינו ייחודי (שתי קריאות באותה עסקה מקבלות את אותו now()).
create index if not exists case_status_log_case_at_idx
  on bkalot_clone.case_status_log (case_id, at, id);

alter table bkalot_clone.case_status_log enable row level security;

create or replace function public.bkalot_clone_admin_set_status(p jsonb, p_admin_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_raw    text;
  v_id     bigint;
  v_status text;
  v_prev   text;
  v_now    timestamptz;
  v_log    bigint;
begin
  v_raw := nullif(btrim(coalesce(p->>'case_id', p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
  end if;
  if length(v_raw) > 18 then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', v_raw);
  end if;
  v_id := v_raw::bigint;

  v_status := nullif(btrim(coalesce(p->>'status', '')), '');
  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'status_required');
  end if;
  if v_status not in ('new', 'in_progress', 'sent', 'closed', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'status_unknown', 'status', v_status);
  end if;
  if v_status not in ('in_progress', 'closed', 'rejected') then
    return jsonb_build_object(
             'ok', false, 'error', 'status_not_settable', 'status', v_status,
             'settable', jsonb_build_array('in_progress', 'closed', 'rejected'));
  end if;

  select c.status into v_prev
    from bkalot_clone.cases c
   where c.id = v_id
     and c.app_key = 'bkalot-clone';

  if v_prev is null then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', v_id);
  end if;

  -- הכרעה (5): היציאה המוקדמת שכבר הייתה כאן היא גם היציאה של היומן. log_id
  -- מוחזר null ולא מושמט, כדי שקורא יבחין בין «לא נרשם» לבין «אין שדה כזה».
  if v_prev = v_status then
    return jsonb_build_object(
             'ok', true, 'case_id', v_id, 'status', v_status,
             'previous', v_prev, 'changed', false, 'log_id', null,
             'decided_by', (select c.decided_by from bkalot_clone.cases c where c.id = v_id),
             'decided_at', (select c.decided_at from bkalot_clone.cases c where c.id = v_id));
  end if;

  v_now := now();

  update bkalot_clone.cases c
     set status     = v_status,
         updated_at = v_now,
         decided_at = v_now,
         decided_by = p_admin_id
   where c.id = v_id
     and c.app_key = 'bkalot-clone';

  -- הכרעה (6): אותו v_now בדיוק שנכתב אל decided_at, ולא now() שני.
  insert into bkalot_clone.case_status_log (case_id, from_status, to_status, admin_id, at)
  values (v_id, v_prev, v_status, p_admin_id, v_now)
  returning id into v_log;

  return jsonb_build_object(
           'ok', true, 'case_id', v_id, 'status', v_status,
           'previous', v_prev, 'changed', true, 'log_id', v_log,
           'decided_by', p_admin_id, 'decided_at', v_now);
end;
$function$;
