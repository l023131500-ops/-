-- 0064 — bkalot_clone שכבה 3, לבנה 3: קריאת גוף המסמך (core.issues #233 סעיף 2)
--
-- מה היה: 0063 בנתה את bkalot_clone_render, ובפעימה הקודמת היא קיבלה כתובת HTTP
-- ונמדדה — document_id=7, 5,223 תווי HTML בשורה במסד. ואין ולו נתיב אחד שקורא
-- את הגוף הזה בחזרה. bkalot_clone_admin_case מחזירה מטא-דאטה בלבד, במפורש
-- (0060 שורה 215: «גוף המסמך אינו נשלח ברשימה»), ולכן מסך הניהול יכול להציג
-- «מסמכים (1)» ולא את המסמך. זו הפונקציה החסרה, והיא קריאה בלבד.
--
-- זה בדיוק המצב שממנו נולדו #224 ו-#233: שכבה נבנתה, נמדדה, ואין מי שמגיע
-- אליה. ההפרש כאן הוא שהצריכה כבר מוגדרת — #233 מבקש «פונקציית קריאה אחת לגוף
-- המסמך מאחורי אותו שער, ורק אז המסך». זו האחת, ולא יותר מאחת.
--
-- ההכרעות:
--
-- (1) 0060 שורה 215 נשארת כפי שהיא. ההחלטה שלא לשלוח גוף ברשימה היא נכונה
--     ואינה תקלה: פנייה עם ארבעה מסמכים הייתה גוררת ~20KB לכל פתיחת פנייה,
--     והמסך צריך אותו רק כשנלחץ מסמך אחד. לכן פונקציה נפרדת ולא הרחבה של
--     admin_case — הרחבה שם הייתה משנה את מה שכבר נמדד ב-25 בדיקות.
--
-- (2) הארגומנט jsonb ולא bigint, בניגוד ל-admin_case(p_id bigint). זה נגזר
--     ממדידה ולא מהעדפה: rpc עם bigint ומחרוזת שאינה מספר מפיל את PostgREST
--     על casting, והרשת הזו כותבת סטטוסי שגיאה מחדש ל-400 — כלומר הכשל הזה
--     אינו ניתן להבחנה מנפילת שער. עם jsonb שום ערך אינו מפיל דבר, והבדיקה
--     יושבת כאן פעם אחת במקום עותק שני שלה בקוד ה-edge (אותה הכרעה כמו render).
--
-- (3) length(digits) נבדק לפני ה-cast. '9' כפול 25 הוא ספרות בלבד ועובר כל
--     regex, ו-::bigint עליו זורק numeric_value_out_of_range — שגיאת מסד על
--     קלט קורא לגיטימי-בצורתו. מספר שאינו יכול להיות מזהה הוא פשוט מסמך שאינו
--     קיים, ולכן document_not_found ולא נפילה.
--
-- (4) הגוף מוחזר כמות שהוא — body_html ללא סניטציה נוספת. ה-escape נעשה בזמן
--     ההפקה (0063 הכרעה 4) ולא בזמן הקריאה, וסניטציה שנייה כאן הייתה אומרת
--     שאיננו סומכים על הראשונה — ואז המסמך ששלחנו החוצה שונה ממה שהמנהל ראה.
--     המקור היחיד לגוף הוא bkalot_clone_render, ומי שקורא אותו מקבל בדיוק את
--     מה שנשלח בהמשך. מה שכן נוסף: html_chars/text_chars, כדי שמסך שקיבל גוף
--     ריק יידע להבחין בינו לבין גוף שלא הגיע.
--
-- (5) case_id, kind ו-queue_id חוזרים עם הגוף. הראשון כדי שהמסך יוכל לוודא
--     שהמסמך שנפתח שייך לפנייה שעל המסך; האחרון כי הוא ההבדל בין מסמך שהופק
--     למסמך שנשלח — queue_id null הוא «טרם נשלח», ושכבת השליחה תמלא אותו.
--     queued מוחזר מפורשות ולא נגזר במסך, כדי שלא ייגזר שם פעמיים בשתי דרכים.
--
-- 🚫 קריאה בלבד: אין כאן INSERT/UPDATE/DELETE, אין נגיעה ב-outbound_queue
--    וב-delivery_log, ואין שום מסלול יוצא. מצב טסט נשמר מעצם היעדר הכתיבה.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

create or replace function public.bkalot_clone_admin_document(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_raw text;
  v_id  bigint;
  v_out jsonb;
begin
  v_raw := nullif(btrim(coalesce(p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'document_id_required');
  end if;
  -- ראה הכרעה (3): ספרות בלבד עדיין יכולות לחרוג מ-bigint.
  if length(v_raw) > 18 then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_raw);
  end if;
  v_id := v_raw::bigint;

  select jsonb_build_object(
           'id',           d.id,
           'case_id',      d.case_id,
           'kind',         d.kind,
           'title',        d.title,
           'body_html',    d.body_html,
           'body_text',    d.body_text,
           'html_chars',   coalesce(length(d.body_html), 0),
           'text_chars',   coalesce(length(d.body_text), 0),
           'storage_path', d.storage_path,
           'queue_id',     d.queue_id,
           -- «הופק» מול «נשלח»: הבחנה אחת, במקום אחד. ראה הכרעה (5).
           'queued',       (d.queue_id is not null),
           'created_at',   d.created_at)
    into v_out
    from bkalot_clone.documents d
   where d.id = v_id;

  if v_out is null then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_id);
  end if;

  return jsonb_build_object('ok', true, 'document', v_out);
end;
$fn$;

comment on function public.bkalot_clone_admin_document(jsonb) is
  'שכבה 3 של שכפול בקלות: גוף מסמך בודד (HTML+טקסט) לפי מזהה. קריאה בלבד, '
  'אין בה בדיקת זהות — service_role בלבד, השער יושב ב-bkalot-clone-admin.';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- פונקציה חדשה ב-public מקבלת EXECUTE ל-PUBLIC כברירת מחדל. בלי ה-revoke הזה,
-- SECURITY DEFINER כאן היה פותח לכל מחזיק מפתח anon את גוף כל מסמך שהופק —
-- והגוף מכיל שם מלא, טלפון ומייל של מי שהשאיר פרטים, כלומר יותר ממה שהיה
-- נחשף ב-0060 בלי ה-revoke שם.
revoke all on function public.bkalot_clone_admin_document(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_document(jsonb) to service_role;
