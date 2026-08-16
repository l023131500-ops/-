-- 0095 — שכפול בקלות שכבה 3
-- אפשר לדחות פנייה בלי לומר למה, והיומן שומר את הריק הזה.
--
-- מאיפה הקו: נרשם ב-heartbeat 647 ברשימת «מה שלא נבנה», מילה במילה — «אין חובת
-- נימוק על rejected». נתיב החיתוך (a795108, 3322ca5, e2ea093, f8f2dfc) נסגר
-- מקצה לקצה ולא השאיר קו משלו, ולכן הקו נלקח מהרשימה הפתוחה.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. פנייה אחת נוצרה דרך
-- public.bkalot_clone_intake — «אברהם פרידמן», 0503330003, טיפול, 42 זכויות —
-- וקיבלה case 362 / contact 369. מיד אחריה, במנהל 4:
--
--   set_status(case_id 362, status 'rejected')   ⇐ בלי מפתח note כלל
--     → ok=true, changed=true, previous='new', log_id=73, note=null,
--       decided_by=4, decided_at=2026-08-16T11:34:29.992925+00
--
-- כלומר: הפנייה נדחתה, המעבר נכתב ביומן, ושורת היומן אומרת «new → rejected»
-- ומחזיקה null במקום שבו 0090 בנתה את הנימוק.
--
-- למה זה חשוב ולא ליטוש: 0090 בנתה את case_status_log.note בדיוק כדי שהכרעה
-- תוכל לומר למה, ו-0091 הביאה אותה למסך. אבל השדה נשאר רשות בכל מעבר, ובדיוק
-- במעבר שבו הוא הכי נחוץ — דחייה. פנייה שנסגרה («closed») נסגרה מפני שטופלה,
-- והמסמך שהופק הוא ההסבר. פנייה שנדחתה לא קיבלה כלום, והדבר היחיד שיכול לענות
-- לאזרח שחוזר ושואל, או למנהל אחר שמסתכל על השורה חודשיים אחר כך, הוא הנימוק.
-- בלעדיו היומן אומר «מישהו דחה, ביום הזה, בשעה הזו» — ואת השאלה היחידה שנשאלת
-- בפועל הוא אינו יכול לענות. זה גם המעבר שאין ממנו ראיה אחרת: אין מסמך, אין
-- שורת תור, אין משלוח.
--
-- מה נבנה: שער אחד בנתיב הכתיבה — דחייה בלי נימוק מוחזרת בשגיאה בשם
-- note_required, והפנייה נשארת בדיוק כפי שהייתה. שש הכרעות:
--
-- (1) על rejected בלבד. closed ו-in_progress לא נגעו — closed הוא סוף של טיפול
--     שיש לו מסמך, ו-in_progress הוא לקיחה לידיים ולא הכרעה. חובה גורפת על כל
--     מעבר הייתה הופכת את הנימוק לטקס: מי שנדרש לנמק כל לחיצה כותב תו אחד.
--
-- (2) השער יושב אחרי היציאה המוקדמת של v_prev = v_status ולפני v_now, ולא בין
--     שערי הקלט למעלה. זו ההכרעה המרכזית כאן: הנימוק שייך לשורת המעבר, ואילו
--     היציאה המוקדמת אומרת שאין מעבר כלל — היא מחזירה changed=false ואינה
--     כותבת שורת יומן (האילוץ case_status_log_is_a_change). איפה שאין מעבר אין
--     נימוק לדרוש, ולכן שליחה חוזרת של 'rejected' על פנייה שכבר דחויה ממשיכה
--     לענות changed=false בדיוק כמו קודם, ולא מתחילה לדרוש טקסט.
--
-- (3) ומאותה סיבה גם אחרי decider_required (0092) ואחרי בדיקת קיום הפנייה: מי
--     שסשן שלו אינו נושא זהות, או שלחץ על פנייה שאינה קיימת, אינו צריך לקבל
--     «חסר נימוק» ולהקליד טקסט שלא יישמר ממילא. הזהות והפנייה נבדקות ראשונות
--     והנימוק אחריהן.
--
-- (4) note_too_long נשאר במקומו למעלה, ולא הועבר לכאן לצדו. הוא פסול של הערך
--     עצמו — נמדד בלי לדעת דבר על הפנייה — ולכן הוא ממשיך לענות מוקדם ככל
--     האפשר. השניים אינם יכולים להתנגש: ארוך מדי פירושו שיש טקסט.
--
-- (5) שגיאה בשם ולא אילוץ על הטבלה. אילוץ check על case_status_log היה עונה
--     23514, והמסך מתרגם קודים בשם בלבד — 53a3e5a קבע את זה במפורש. נמדד ולא
--     הונח: היומן מחזיק כרגע 0 שורות, ולכן backfill אינו קיים כאן ואינו הנימוק;
--     הנימוק הוא מי עונה למי שלחץ.
--     ⚠️ המשמעות: הכלל חי בנתיב הכתיבה היחיד ולא בטבלה. כותב עתידי אחר יוכל
--     לכתוב שורת דחייה בלי נימוק, ואין היום כותב כזה — bkalot_clone_dispatch
--     אינו נוגע ביומן כלל (נמדד: position('case_status_log' in prosrc) = 0).
--
-- (6) התשובה נושאת status ו-max_chars? לא. היא נושאת 'status','rejected' בלבד —
--     המסך צריך לדעת על איזה מעבר מדובר, ואין כאן מספר לומר. שם השדה שחסר
--     נאמר בשם השגיאה עצמה.
--
-- מה נמדד אחרי המיגרציה. שתי פניות חדשות דרך אותו intake — case 363 (contact
-- 370) ו-case 364 (contact 371), 42 זכויות כל אחת — ואחת עשרה קריאות במנהל 4:
--
--   1  363 rejected, בלי מפתח note        → ok=false, note_required, status rejected
--   2  363 rejected, note '   ' (רווחים)  → ok=false, note_required   ⇐ הכרעה (4) של 0090
--   3  363 אחרי שתי הדחיות                → status 'new', decided_at null,
--                                            decided_by null, 0 שורות יומן
--   4  363 rejected + נימוק אמיתי          → ok=true, changed=true, log_id 74,
--                                            note נשמר מילה במילה
--   5  363 rejected שוב, בלי note          → ok=true, changed=false, log_id null
--                                            ⇐ הכרעה (2): אין מעבר, אין דרישה
--   6  364 closed, בלי note               → ok=true, changed=true, log_id 75  (בקרה)
--   7  364 in_progress, בלי note          → ok=true, changed=true, log_id 76  (בקרה)
--   8  364 rejected, p_admin_id null      → decider_required   ⇐ הכרעה (3)
--   9  פנייה 999999999 rejected           → case_not_found     ⇐ הכרעה (3)
--  10  364 rejected + נימוק בן 501 תווים  → note_too_long, chars 501  ⇐ הכרעה (4)
--  11  364 אחרי 8, 9 ו-10                 → status 'in_progress', 2 שורות יומן,
--                                            decided_at לא זז
--
-- שורות 3 ו-11 הן העיקר: שער שנסגר אינו נוגע בפנייה. שורות 6 ו-7 הן ההיפוך —
-- הכלל הוא על rejected בלבד ולא על כל מעבר.
-- ⚠️ המדידה רצה ב-SQL על הפונקציה עצמה ולא מהדפדפן. אין כאן מדידת HTTP ואין
-- צילום מסך, מפני שהמסך עוד אינו מכיר note_required — ראה למטה.
-- ⚠️ הנתונים שנוצרו לצורך המדידה גולגלו אחורה במלואם: cases 0, case_status_log 0,
-- case_rights 0, documents 0, contacts 4, outbound_queue 8, delivery_log 3,
-- admin_users 1, rights_catalog 888 — בסיס בדיוק.
--
-- מה לא נבנה כאן: המסך. תיבת «למה» ב-admin.html מסומנת «(לא חובה)» ומפת
-- ההודעות שם אינה מכירה note_required, ולכן מי שילחץ «דחייה» בלי נימוק יראה
-- את הקוד באנגלית. זה הקו הפתוח שנשאר לצעד הבא, והוא נרשם ולא נבלע.
--
-- מוגן: אין נגיעה ב-08/09, ב-bkalut-app/bkalot-admin/zr_*/NEDARIM3873, ולא
-- בסכמות csj/csj_src/igud. bkalot_clone_intake, _admin_case, _admin_cases,
-- _admin_document, _render, _queue, _dispatch לא נגעו; apps/37 לא נגעה;
-- bkalot-clone-admin נשארת v8 ו-bkalot-clone-intake v1.

create or replace function public.bkalot_clone_admin_set_status(p jsonb, p_admin_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
  -- 0095 הכרעה (4): וכאן הוא נשאר. פסול של הערך עצמו עונה מוקדם ככל האפשר.
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

  -- 0095 — הכרעות (1), (2), (3) ו-(6). מכאן ולמטה יש מעבר אמיתי, ומעבר לדחייה
  -- חייב לומר למה. השער אחרי היציאה המוקדמת שלמעלה ולפני v_now: הפנייה עוד לא
  -- נגעה, ולכן היא נשארת בדיוק כפי שהייתה — הסטטוס, decided_at, decided_by
  -- והיומן, כולם.
  if v_status = 'rejected' and v_note is null then
    return jsonb_build_object(
             'ok', false, 'error', 'note_required', 'status', 'rejected');
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
