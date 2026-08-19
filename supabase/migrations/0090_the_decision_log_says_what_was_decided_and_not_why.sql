-- 0090 — שכפול בקלות שכבה 3
-- יומן ההכרעות אומר מה הוכרע ואינו אומר למה.
--
-- מי כתב את הקו הזה: כל פעימה מאז 0087, בסופה ובאותן מילים — «מה שלא נבנה: אין
-- note/reason ביומן — למה הוכרע ולא רק מה». 0602701 כתבה אותו ראשונה, ואחריה
-- 86cf183, 8a577bc, c3b7c45, 9ea1991, 74dbf7d ו-24f8a7d. שבע פעימות רשמו אותו
-- ואף אחת לא לקחה אותו. כאן הוא נלקח, ורק הוא.
--
-- מה יש היום: 0087 בנתה את bkalot_clone.case_status_log ושורה בה על כל מעבר
-- שקרה בפועל, 0088 החזירה את הרצף למסך הפנייה, 0089 את שני המונים לשורת
-- הרשימה, ושתי לבנות UI ושתי פריסות הביאו את הכל אל הכתובת החיה. הרצף שלם
-- וקריא — «חדשה → בטיפול (מנהל 82) → נסגרה (83) → נדחתה (83)» — ואין בו ולו
-- מילה אחת על הסיבה.
--
-- למה זה חשוב כאן ולא רק כרעיון: 'rejected' פירושו שאזרח לא יקבל את מה שביקש.
-- היומן יודע לומר מי דחה ומתי, ולשאלה היחידה שאדם באמת שואל כשהוא פותח פנייה
-- שנדחתה — «למה» — אין תשובה במערכת. מנהל שני שיפתח אותה מחר יראה החלטה בלי
-- נימוק, ויכריע מחדש מאפס או יבטל הכרעה שהייתה נכונה. תיעוד שאומר מה קרה ולא
-- למה הוא תיעוד שאי אפשר להסתמך עליו כדי להמשיך.
--
-- מה נבנה כאן: עמודה אחת, bkalot_clone.case_status_log.note, ו-set_status
-- קוראת אותה מגוף הבקשה וכותבת אותה באותה שורה שהיא כותבת ממילא. אין נגיעה
-- ב-cases, ב-render, ב-intake, ב-admin_case (0088), ב-admin_cases (0089),
-- ב-admin_document, ב-supabase/functions ולא ב-apps/37. אף קורא אינו מחזיר
-- עדיין את השדה הזה — זו הלבנה הבאה.
--
-- שבע הכרעות:
--
-- (1) הנימוק על שורת היומן ולא על cases. cases מחזיקה מצב אחרון: decided_by
--     ו-decided_at נדרסים בכל מעבר, וזו בדיוק התקלה ש-0087 נבנתה כדי לתקן.
--     עמודת reason על cases הייתה נדרסת יחד איתם — כלומר הסיבה לדחייה הייתה
--     נמחקת ברגע שמישהו יחזיר את הפנייה לטיפול. הנימוק שייך למעבר שהוא מנמק,
--     והמעבר יושב ביומן. נמדד ולא הונח: שני מעברים על אותה פנייה עם שני
--     נימוקים שונים — שניהם קיימים אחרי, כל אחד על השורה שלו.
--
-- (2) הנימוק נוסע בתוך p ולא כארגומנט שלישי, בניגוד גמור ל-p_admin_id. זו אינה
--     חוסר עקביות אלא אותה הכרעה בדיוק, קראה נכון: 0076 הוציאה את הזהות מהגוף
--     מפני שהיא נקבעת בשער ולא בדפדפן, וזהות שנקראת מהגוף ניתנת לזיוף. הנימוק
--     הוא ההפך המדויק — הוא הטקסט שאדם הקליד בדפדפן, ואין לו מקור אחר שאפשר
--     לקרוא ממנו. הגוף הוא מקומו הנכון.
--     תוצאה נמדדת ולא הבטחה: bkalot-clone-admin מעבירה את הגוף כפי שהוא ובלי
--     סינון מפתחות, ולכן הנימוק מגיע מהכתובת החיה דרך v8 בלי שורת קוד אחת
--     בשער ובלי פריסת edge. אם היה ארגומנט שלישי, הפעימה הזו הייתה מחייבת
--     פריסה של פונקציית קצה כדי שיהיה לה טעם.
--
-- (3) note ולא reason. השדה חופשי, אינו רשימת היתר ואינו חובה, ו-'reason' על
--     שדה כזה מבטיח סיווג שאין בו. וגם: cases.note כבר קיימת — מה שהאזרח כתב
--     בטופס — ואותו שם על שני דברים היה מבלבל, אלמלא היו אלה באמת אותו סוג
--     דבר: טקסט חופשי שאדם כתב. set_status אינה נוגעת ב-cases.note ואינה
--     קוראת אותה; שתי העמודות נושאות שני כותבים שונים באותה כוונה בדיוק.
--
-- (4) ריק, רווחים בלבד ומפתח חסר הם כולם null אחד. btrim ואז nullif, ואילוץ
--     על הטבלה שאוסר גם על כתיבה ישירה לאחסן '' או ' '. '' ו-null היו נראים
--     זהים בכל מסך ומתנהגים שונה בכל שאילתה — coalesce, is null, אורך — וזה
--     בדיוק סוג ההבדל שנבלע ומתגלה חודשיים אחר כך. נמדד: נימוק של רווחים
--     בלבד נשמר כ-null ולא כמחרוזת ריקה.
--
-- (5) נימוק ארוך מדי נדחה ואינו נחתך. 500 תווים, והחריגה מחזירה note_too_long
--     לפני שהסטטוס משתנה — כלומר הפנייה נשארת בדיוק כפי שהייתה והמנהל מקבל
--     הודעה, במקום הכרעה שנרשמה ונימוק שנקטע באמצע משפט. חיתוך שקט הוא
--     הגרוע משניהם: הוא מייצר תיעוד שנראה שלם ואינו. הבדיקה יושבת עם שערי
--     הקלט האחרים, לפני החיפוש אחר הפנייה, מאותה סיבה: מה שאינו תקין בצורתו
--     נדחה לפני שנוגעים בנתונים.
--     ⚠️ יש תקרה שנייה שאינה כאן: MAX_BODY=4096 בפונקציית הקצה. 500 תווי
--     עברית הם כאלף בייט, ולכן הדחייה שמגיעה ללקוח היא זו של המסד ועם שמה
--     המדויק; טקסט ארוך פי כמה ייעצר קודם ב-body_too_large. שתי התקרות
--     מוצהרות ואינן מתחזות זו לזו.
--
-- (6) אין נימוק כשאין מעבר. הכרעה חוזרת יוצאת מוקדם עם changed=false, ומאז
--     0087 גם היומן יוצא איתה — הנימוק יוצא עכשיו שלישי. נימוק שנשמר בלי מעבר
--     היה הופך את היומן ליומן הערות, ואת «שלוש שורות» למספר שאינו מספר
--     המעברים. השדה note מוחזר null בתשובה ולא מושמט, באותו נוסח בדיוק של
--     log_id בהכרעה (5) של 0087: קורא צריך להבחין בין «לא נשמר» לבין «אין שדה
--     כזה».
--
-- (7) אין backfill ואין ברירת מחדל. שורות היומן הקיימות מקבלות null, וזה מה
--     שהן: מעבר שנרשם לפני שהיה איפה לכתוב נימוק אינו מעבר שנימוקו אבד — הוא
--     מעבר שלא נשאל עליו. טקסט שהיה נכתב לתוכן היה טענה שאיש לא כתב. (בפועל
--     הטבלה החיה ריקה בזמן הכתיבה — case_status_log=0.)
--
-- ההרשאות של הפונקציה אינן ניתנות מחדש בכוונה: create or replace שומר ACL.
-- הבסיס שנמדד לפני: anon=false, authenticated=false, service_role=true.
-- ההרשאות של הטבלה אינן נוגעות: 0087 הכרעה (7) — אפס לכולם, RLS בלי policy,
-- והדרך היחידה לכתוב ליומן עוברת בפונקציה. עמודה חדשה אינה משנה בכך דבר.
--
-- מה שלא נבנה כאן ונאמר במפורש: אף קורא אינו מחזיר את note. bkalot_clone_admin_case
-- מחזירה את status_history מאז 0088 בלי השדה הזה, bkalot_clone_admin_cases אינה
-- יודעת עליו, ו-apps/37-bkalot-clone/admin.html אינו מציג אותו ואין בו תיבה
-- להקליד אותו. הנימוק ניתן לכתיבה מהכתובת החיה ואינו ניתן לקריאה משום מסך —
-- זו הלבנה הבאה, אותו פיצול כמו 0087 → 0088 → UI → פריסה.
--
-- 🚫 מצב טסט: הפונקציה נוגעת בעמודת status של bkalot_clone.cases ובטבלת היומן
--    ותו לא. אין בה נגיעה ב-outbound_queue, ב-delivery_log ולא בשום ערוץ
--    שליחה, ולא יוצאת ממנה ולו הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

alter table bkalot_clone.case_status_log
  add column if not exists note text;

comment on column bkalot_clone.case_status_log.note is
  'למה הוכרע — טקסט חופשי שהמכריע כתב על המעבר הזה. null = לא נכתב נימוק.';

-- הכרעה (4) כאילוץ ולא כהסכמה: '' ו-' ' אינם «נימוק ריק» אלא היעדר נימוק, וגם
-- כתיבה ישירה לטבלה אינה רשאית להמציא מצב שלישי. הכרעה (5) באותו מקום: התקרה
-- היא של הטבלה ולא רק של הפונקציה שכותבת אליה היום.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'bkalot_clone.case_status_log'::regclass
                    and conname  = 'case_status_log_note_not_blank') then
    alter table bkalot_clone.case_status_log
      add constraint case_status_log_note_not_blank
      check (note is null or btrim(note) <> '');
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'bkalot_clone.case_status_log'::regclass
                    and conname  = 'case_status_log_note_len') then
    alter table bkalot_clone.case_status_log
      add constraint case_status_log_note_len
      check (note is null or length(note) <= 500);
  end if;
end
$$;

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
  -- הכרעה (1) כאן: הנימוק נכתב אל השורה הזו ולא אל cases — כלומר המעבר הבא
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
