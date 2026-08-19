-- 0072 — סגירת פנייה היא הכרעה של אדם, ואין ולו נתיב אחד שיכול לכתוב אותה (§5ב)
--
-- מה היה: 0071 בנתה את המעבר האוטומטי היחיד שיש לשכפול — new → in_progress
-- כשמופק מסמך — ובכך הפכה שניים מחמשת ערכי cases_status_known לניתנים להשגה.
-- שלושת הנותרים לא: 'sent' בלתי-ניתן-להשגה בכוונה (אין מסלול שליחה אמיתי),
-- ו-'closed'/'rejected' הן הכרעות של אדם שאין ולו נתיב אחד בכל השכפול שכותב
-- אותן. נמדד ולא הונח: בפעימה הקודמת, המצב C של הבדיקה נסגר בקריאת SQL ישירה
-- מכאן — כלומר הבדיקה עצמה נאלצה לעקוף את המוצר כדי להגיע למצב שהמוצר מציג.
--
-- למה זו תקלה של מוצר ולא הערה על סכמה: admin.html כבר מציע את חמשת הערכים
-- במסנן ומציג תג בכל שורה. מנהל שמסתכל על פנייה שטופלה מחוץ למערכת, או על
-- פנייה שאינה רלוונטית, רואה «בטיפול» לנצח ואין לו דרך לומר אחרת. הרשימה
-- גדלה ולא מתרוקנת לעולם.
--
-- מה נבנה כאן: פונקציה אחת, bkalot_clone_admin_set_status, service_role בלבד
-- — בדיוק כמו render/queue/dispatch לפניה. אין כאן נתיב HTTP ואין שינוי בקוד
-- הלקוח: הכתובת והכפתור הם הלבנה הבאה, וזה אותו פיצול בדיוק שנעשה ב-0067→v4
-- וב-0070→v5.
--
-- ההכרעות:
--
-- (1) שלושה יעדים מותרים בלבד — 'in_progress', 'closed', 'rejected' — ולא
--     חמישה. 'sent' נדחה במפורש, אותה הכרעה כמו (5) של 0070 ו-(3) של 0071:
--     שום דבר לא נשלח, וערך שהוא שקר שאי אפשר לכתוב עדיף על ערך שממתין למי
--     שיכתוב אותו בטעות. פונקציית ניהול שמקבלת 'sent' הייתה הופכת אותו לשקר
--     שאפשר לכתוב בלחיצה.
--
-- (2) 'new' נדחה גם הוא. הוא מצב הלידה של השורה ולא הכרעה — פנייה שהופק לה
--     מסמך אינה יכולה לחזור להיות «חדשה», והחזרה כזו הייתה גם שקר וגם מצב
--     שהטריגר של 0071 לא יתקן לעולם (הוא AFTER INSERT, והפקה חוזרת היא
--     UPDATE). «פתיחה מחדש» של פנייה סגורה היא 'in_progress', וזה מה שהיא.
--
-- (3) אין כאן פרדיקט על הסטטוס הנוכחי. שלושת היעדים חוקיים מכל מצב, כולל
--     closed → rejected ו-rejected → in_progress: אלה הכרעות אדם, ומכונה
--     שמסרבת לתקן הכרעת אדם קודמת משאירה את המנהל בלי דרך לתקן טעות. זה
--     ההפך הגמור מהפרדיקט status='new' של 0071 — שם הכותב הוא טריגר שאינו
--     יודע דבר, כאן הכותב הוא אדם שמסתכל על המסך.
--
-- (4) קריאה חוזרת עם אותו ערך אינה שגיאה. היא מחזירה ok:true עם changed:false
--     ואינה נוגעת ב-updated_at — לחיצה כפולה במסך אינה כשל, וגם אינה אירוע.
--     זו אותה עמדה כמו האידמפוטנטיות של logout ב-0061.
--
-- (5) app_key='bkalot-clone' בפרדיקט של ה-UPDATE, אותה עמדה בדיוק כמו (5) של
--     0071 ו-(1) של 0070: אינו יכול לסנן ולו שורה אחת היום, וכתוב כדי
--     שה-UPDATE יאמר של מי השורה שהוא נוגע בה.
--
-- (6) הארגומנט jsonb ולא bigint, ו-length(digits) נבדק לפני ה-cast — אותן שתי
--     הכרעות של 0064 (2) ו-(3) ומאותה סיבה בדיוק: rpc עם bigint וקלט שאינו
--     מספר מפיל את PostgREST על casting, והרשת הזו כותבת סטטוסי שגיאה מחדש
--     ל-400, כלומר הכשל אינו ניתן להבחנה מנפילת שער.
--
-- ⚠️ מה שאין כאן ואינו נשכח: אין בסכמה bkalot_clone טבלת יומן, ולכן «מי שינה
--    את הסטטוס ומתי» אינו נכתב לשום מקום מלבד updated_at. לא הומצאה כאן עמודה
--    ולא נוסף ארגומנט admin_id שאין לו לאן ללכת — ארגומנט שנבלע בשקט גרוע
--    מארגומנט שאינו קיים. זהו קו פתוח מוצהר.
--
-- 🚫 מצב טסט: הפונקציה נוגעת בעמודה status של bkalot_clone.cases ותו לא. אין
--    כאן נגיעה ב-outbound_queue, ב-delivery_log, ב-documents ולא בשום ערוץ
--    שליחה, ואין ולו קריאה יוצאת אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

create or replace function public.bkalot_clone_admin_set_status(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_raw    text;
  v_id     bigint;
  v_status text;
  v_prev   text;
begin
  v_raw := nullif(btrim(coalesce(p->>'case_id', p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
  end if;
  -- ראה הכרעה (6): ספרות בלבד עדיין יכולות לחרוג מ-bigint.
  if length(v_raw) > 18 then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', v_raw);
  end if;
  v_id := v_raw::bigint;

  v_status := nullif(btrim(coalesce(p->>'status', '')), '');
  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'status_required');
  end if;
  -- שני נוסחים שונים במכוון: ערך שאינו קיים בסכמה כלל אינו אותה תקלה כמו ערך
  -- קיים שהפונקציה הזו מסרבת לכתוב. הראשון הוא באג במסך, השני הוא הכרעה.
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

  -- ראה הכרעה (4): אותו ערך אינו כשל וגם אינו אירוע — updated_at אינו זז.
  if v_prev = v_status then
    return jsonb_build_object(
             'ok', true, 'case_id', v_id, 'status', v_status,
             'previous', v_prev, 'changed', false);
  end if;

  update bkalot_clone.cases c
     set status = v_status,
         updated_at = now()
   where c.id = v_id
     and c.app_key = 'bkalot-clone';

  return jsonb_build_object(
           'ok', true, 'case_id', v_id, 'status', v_status,
           'previous', v_prev, 'changed', true);
end;
$fn$;

comment on function public.bkalot_clone_admin_set_status(jsonb) is
  'שכבה 3 של שכפול בקלות: הכרעת אדם על סטטוס פנייה — in_progress/closed/rejected בלבד. '
  'new הוא מצב לידה ו-sent בלתי-ניתן-להשגה כל עוד אין מסלול שליחה. אין בה בדיקת זהות — '
  'service_role בלבד, השער יושב ב-bkalot-clone-admin (0072).';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- פונקציה חדשה ב-public מקבלת EXECUTE ל-PUBLIC כברירת מחדל. בלי ה-revoke הזה,
-- SECURITY DEFINER כאן היה נותן לכל מחזיק מפתח anon לסגור כל פנייה במערכת —
-- כלומר להעלים פניות של אנשים אמיתיים ממסך הניהול בלי להשאיר עקבות (ראה
-- הקו הפתוח על היעדר יומן).
revoke all on function public.bkalot_clone_admin_set_status(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_set_status(jsonb) to service_role;
