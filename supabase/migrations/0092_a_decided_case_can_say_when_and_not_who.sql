-- 0092 — שכפול בקלות שכבה 3
-- פנייה שהוכרעה יכולה לומר מתי ולא מי, והמסד מקבל את זה.
--
-- מי כתב את הקו הזה: 81e3307 בסופה, מילה במילה: «decided_at מלא עם decided_by
-- null אפשרי». לפניה כתבו אותו b1fcca7, 9c96135, aff6455, c6e4a81 ו-af752d9,
-- באותן מילים ובאותו מקום — קו שנרשם בכל פעימה מאז 0087 ולא נלקח באף אחת מהן.
-- כאן הוא נלקח, ורק הוא. נתיב הנימוק נסגר מקצה לקצה ב-81e3307 ואין בו קו פתוח.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה: פנייה #266 נקלטה דרך
-- bkalot_clone_intake (situation=unemployed, 37 זכויות, queued=false), ומיד
-- אחריה נקראה bkalot_clone_admin_set_status עם p_admin_id => null — בדיוק הערך
-- שהשער שולח כשהזהות שחזרה ממנו אינה מספר שלם בטוח (v7 של הפונקציה, ⚠️ השני).
-- התשובה הייתה ok=true, changed=true, log_id=65, status='rejected',
-- decided_at='2026-08-16T03:38:24.429075+00:00' ו-decided_by=null. השורה במסד
-- נמדדה אחריה: status='rejected', decided_at מלא, decided_by null; שורת היומן
-- היחידה new → rejected עם admin_id null; ו-bkalot_clone_admin_case(266)
-- החזירה decided_by_name null. כלומר פניית אזרח נדחתה, המסד יודע לומר מתי,
-- ואין במערכת ולו מקום אחד שיודע מי. התגלגל אחורה מיד: cases 0,
-- case_status_log 0, case_rights 0, contacts 4 — בסיס בדיוק.
--
-- למה זה חשוב כאן ולא רק כרעיון: זו בדיוק התקלה ש-0076 באה למנוע ושהעברת
-- הזהות ב-v7 סגרה בנתיב אחד — נתיב הדפדפן. אבל מה ש-v7 תיקן הוא הקורא, ולא
-- הכלל. הכלל עדיין אומר שמצב «הוכרע ואיננו יודעים מי» הוא מצב חוקי בטבלה,
-- ולכן כל כותב עתידי — נתיב שני, סקריפט תחזוקה, קריאה ידנית ב-SQL, או אותו
-- p_admin_id שנופל ל-null בקצה — כותב אותו בשקט ובלי שדבר יסרב. 'rejected'
-- פירושו שאזרח לא יקבל את מה שביקש; חצי-רישום על הכרעה כזו גרוע מהיעדר רישום,
-- כי הוא נראה כמו תיעוד. עמודה שנועדה לתעד ואינה נדרשת אינה מתעדת — היא רק
-- מציעה.
--
-- מה נבנה כאן: אילוץ אחד על bkalot_clone.cases, ושער אחד בתוך
-- bkalot_clone_admin_set_status שמחזיר שגיאה בשם לפני שהאילוץ נדרש לעבוד. אין
-- נגיעה בטבלה אחרת, אין עמודה חדשה, אין backfill, אין נגיעה ב-render,
-- ב-intake, ב-admin_case, ב-admin_cases, ב-admin_document, ב-queue,
-- ב-dispatch, ב-edge (נשארת v8) ולא ב-apps/37.
--
-- שש הכרעות:
--
-- (1) אילוץ ולא NOT NULL על שתי העמודות. פנייה שאיש לא הכריע עליה — וזה המצב
--     של כל פנייה שנקלטת — מחזיקה שתי עמודות ריקות, וזה מצב נכון שחייב להישאר
--     חוקי. מה שאינו חוקי הוא שהן ייפרדו זו מזו. לכן הכלל הוא על הזוג.
--
-- (2) שקילות ולא גרירה: (decided_at is null) = (decided_by is null), ולא
--     «decided_at מלא ⇐ decided_by מלא». הכיוון ההפוך — מי בלי מתי — הוא אותו
--     חצי-רישום בדיוק, רק הפוך: «מנהל 4 הכריע» בלי שיהיה מתי, ליד decided_at
--     שהוא השדה היחיד שלפיו 0082 ממיינת את רשימת העבודה. שני הכיוונים נמדדו
--     אחרי המיגרציה, לא רק זה שנפל בפועל.
--
-- (3) האילוץ נבדק עכשיו ולא NOT VALID. הטבלה ריקה בזמן הכתיבה (cases=0, נמדד
--     ולא הונח), ולכן אין ולו שורה אחת שדחיפת הבדיקה קדימה הייתה מגינה עליה —
--     והייתה רק משאירה אילוץ שאיש לא יודע אם הוא נכון על העבר.
--
-- (4) שער בפונקציה ולא הסתמכות על האילוץ. בלעדיו, אותה קריאה בדיוק שנמדדה
--     למעלה הייתה מקבלת 23514 — כלומר PostgREST מחזיר שגיאת שרת, המסך מציג
--     תקלה כללית, ומי שלוחץ אינו יודע שהבעיה היא הזהות שלו ולא הפנייה. שגיאה
--     בשם, decider_required, אומרת בדיוק מה חסר. האילוץ נשאר מתחתיה כרשת: הוא
--     חל על כל כותב, גם על כזה שאינו עובר בפונקציה הזו.
--
-- (5) השער יושב עם שערי הקלט, לפני שנקראת הפנייה — באותו מקום בדיוק שבו יושב
--     note_too_long מ-0090 ומאותו טעם: הסטטוס נשאר בדיוק כפי שהיה, ולא נוגעים
--     בשורה כדי לגלות בסופה שאסור היה. ומכיוון שכך הוא חל גם על ההכרעה החוזרת
--     (v_prev = v_status), שאינה כותבת דבר: קורא בלי זהות אינו מקבל «כן, לא
--     השתנה דבר» — הוא אינו מקבל תשובה על הפנייה כלל. מי שאין לו זהות אין לו
--     מה לשאול כאן; הקריאה חוזרת עם ok=false לפני שנקראה שורה אחת מהמסד.
--
-- (6) case_status_log.admin_id נשאר nullable ובלי FK — הכרעה (2) של 0087 עומדת
--     במקומה ואינה משתנה כאן. מה שמשתנה הוא שאין יותר דרך לכתוב לשם null דרך
--     הפונקציה, מפני שהיא יוצאת קודם. הכלל הזה אינו כפול כאילוץ על היומן: יומן
--     שמסרב לשורה הוא יומן שמפיל כתיבה, וההכרעה מה מותר להכריע יושבת במקום אחד
--     — בשער — ולא בשני מקומות שיכולים להסתעף.
--
-- ההרשאות של הפונקציה אינן ניתנות מחדש בכוונה: create or replace שומר ACL.
-- הבסיס שנמדד לפני: anon=false, authenticated=false, service_role=true.
--
-- מה שלא נבנה כאן ונאמר במפורש: אין FK מ-cases.decided_by אל admin_users —
-- מאותו טעם בדיוק כמו (2) של 0087 ו-0083, ולכן מזהה של מנהל שנמחק נשאר בשורה
-- ואינו נמחק איתו. אין backfill (הטבלה ריקה). אין נוסח עברי ל-decider_required
-- ב-apps/37-bkalot-clone/admin.html — MESSAGES שם מציג קוד שאין לו תרגום כפי
-- שהוא ואינו בולע אותו מאחורי נוסח כללי (ההערה מעל MESSAGES), ולכן המסך אומר
-- את הקוד ולא שקר. הנוסח הוא הלבנה הבאה, אותו פיצול כמו 0087 → 8a577bc
-- וכמו 0090 → c6e4a81.
--
-- 🚫 מצב טסט: המיגרציה נוגעת בעמודות decided_at/decided_by ובעמודת status של
--    bkalot_clone.cases ותו לא. אין בה נגיעה ב-outbound_queue, ב-delivery_log
--    ולא בשום ערוץ שליחה, ולא יוצאת ממנה ולו הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

-- הכרעות (1)(2)(3): הזוג, בשני הכיוונים, נבדק עכשיו.
alter table bkalot_clone.cases
  drop constraint if exists cases_decided_pair;

alter table bkalot_clone.cases
  add constraint cases_decided_pair
  check ((decided_at is null) = (decided_by is null));

comment on constraint cases_decided_pair on bkalot_clone.cases is
  'הכרעה מתועדת בשלמותה או לא מתועדת כלל — מתי ומי נכתבים יחד או שניהם ריקים.';

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
  v_note   text;
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

  -- הכרעה (4): מפתח חסר, מחרוזת ריקה ורווחים בלבד — כולם null אחד.
  v_note := nullif(btrim(coalesce(p->>'note', '')), '');
  -- הכרעה (5): נדחה ואינו נחתך, וכאן — עם שערי הקלט ולפני שנוגעים בפנייה —
  -- כדי שהסטטוס יישאר בדיוק כפי שהיה.
  if v_note is not null and length(v_note) > 500 then
    return jsonb_build_object(
             'ok', false, 'error', 'note_too_long',
             'max_chars', 500, 'chars', length(v_note));
  end if;

  -- 0092, הכרעות (4)(5): הזהות היא קלט כמו כל קלט, ונבדקת איתם. בלי זהות אין
  -- הכרעה — לא כתיבה ואפילו לא «changed=false» — מפני שהשורה שהייתה נכתבת
  -- אומרת «הוכרע» ואינה יודעת לומר בידי מי, ואת זה cases_decided_pair כבר אינו
  -- מתיר. השגיאה בשם ולא 23514: מי שלוחץ צריך לדעת שהחסר הוא הזהות שלו.
  if p_admin_id is null then
    return jsonb_build_object('ok', false, 'error', 'decider_required');
  end if;

  select c.status into v_prev
    from bkalot_clone.cases c
   where c.id = v_id
     and c.app_key = 'bkalot-clone';

  if v_prev is null then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', v_id);
  end if;

  -- הכרעה (5) של 0087, ועכשיו גם הכרעה (6) כאן: היציאה המוקדמת היא גם היציאה
  -- של היומן וגם של הנימוק. שניהם מוחזרים null ואינם מושמטים, כדי שקורא יבחין
  -- בין «לא נשמר» לבין «אין שדה כזה».
  if v_prev = v_status then
    return jsonb_build_object(
             'ok', true, 'case_id', v_id, 'status', v_status,
             'previous', v_prev, 'changed', false, 'log_id', null, 'note', null,
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

  -- הכרעה (6) של 0087: אותו v_now בדיוק שנכתב אל decided_at, ולא now() שני.
  -- הכרעה (1) של 0090: הנימוק נכתב אל השורה הזו ולא אל cases — כלומר המעבר הבא
  -- אינו דורס אותו.
  insert into bkalot_clone.case_status_log (case_id, from_status, to_status, admin_id, at, note)
  values (v_id, v_prev, v_status, p_admin_id, v_now, v_note)
  returning id into v_log;

  return jsonb_build_object(
           'ok', true, 'case_id', v_id, 'status', v_status,
           'previous', v_prev, 'changed', true, 'log_id', v_log, 'note', v_note,
           'decided_by', p_admin_id, 'decided_at', v_now);
end;
$function$;
