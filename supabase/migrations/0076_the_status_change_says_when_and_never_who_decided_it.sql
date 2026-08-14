-- 0076 — שינוי הסטטוס אומר מתי, ולעולם לא מי הכריע
-- (§5ב)
--
-- מה היה, ומי כתב את הקו הזה: 0072 עצמה. בסופה, בסעיף «מה שאין כאן ואינו
-- נשכח», נכתב מילה במילה: «אין בסכמה bkalot_clone טבלת יומן, ולכן מי שינה את
-- הסטטוס ומתי אינו נכתב לשום מקום מלבד updated_at. לא הומצאה כאן עמודה ולא
-- נוסף ארגומנט admin_id שאין לו לאן ללכת — ארגומנט שנבלע בשקט גרוע מארגומנט
-- שאינו קיים». כל פעימה מאז (2a067be, 188bd04, 3fd1524, 978ab68, fb607a0,
-- 3f96141, 12966aa, e9e949c, 530fb44) חזרה על הקו הזה ולא נגעה בו. כאן נבנה
-- המקום שאליו הארגומנט הולך.
--
-- למה זו תקלת מוצר ולא הערה על סכמה, ולמה דווקא עכשיו: מאז 188bd04 יש במסך
-- הניהול החי שלושה כפתורים שכל אחד מהם מוציא פנייה של אדם אמיתי מרשימת העבודה
-- — «נסגרה» ו«נדחתה» מסתירות אותה מכל מסנן שהמנהל פותח בו את היום. עד היום
-- לחיצה כזו משאירה בדיוק סימן אחד: updated_at זז. הוא אינו אומר מי לחץ, והוא
-- אינו אומר שהייתה כאן בכלל הכרעת אדם — הטריגר documents_advance_case מזיז
-- אותו גם הוא (0071), וכך גם כל UPDATE עתידי על השורה. מנהל שני שמסתכל על
-- פנייה סגורה אינו יכול לדעת אם אדם סגר אותה או שהמערכת עשתה משהו, ואם אדם —
-- מי. במערכת שיש בה יותר ממשתמש ניהול אחד זו הכחשה שאי אפשר להפריך.
--
-- מה נבנה כאן: שתי עמודות על cases, ו-bkalot_clone_admin_set_status כותבת
-- אותן. מיגרציה בלבד — apps/37 לא נגעה, bkalot-clone-admin נשארת v6,
-- supabase/functions לא נגעה ואין פריסת פורטל. העברת הזהות מהשער אל הפונקציה
-- (v7), החזרתה בקריאה והצגתה במסך הן הלבנים הבאות, אותו פיצול כמו
-- 0074 → 0075 → e9e949c → 530fb44.
--
-- שש הכרעות:
--
-- (1) הזהות אינה נוסעת בתוך p. הפונקציה מקבלת ארגומנט שני, p_admin_id, ולא
--     מפתח admin_id בתוך ה-jsonb — וזו ההכרעה שקונה את כל השאר. נתיב
--     /set-status ב-bkalot-clone-admin מעביר את גוף הבקשה כפי שהוא ובכוונה
--     בלי סינון מפתחות (כך נכתב שם, וכך גם ב-queue וב-dispatch). מפתח
--     admin_id בתוך p היה מגיע מהדפדפן, כלומר כל מחזיק טוקן היה יכול לחתום
--     את ההכרעה שלו בשם מנהל אחר — ורישום זהות שניתן לזיוף גרוע מהיעדר
--     רישום, כי הוא נראה בדיוק כמו האמת. ארגומנט שני אינו נגיש מהגוף: ה-edge
--     בונה את אובייקט הארגומנטים בעצמו, והוא היחיד שיכול למלא אותו.
--
-- (2) שתי עמודות ולא אחת, ושתיהן nullable, כי הן מפרידות בין שלושה מצבים
--     שהיום נראים זהים: שתיהן null — לא הייתה ולו הכרעת אדם אחת על השורה
--     (וזו האמת גם על פנייה שהטריגר קידם ל-in_progress: מכונה קידמה, אדם לא
--     הכריע); decided_at מלא ו-decided_by ריק — אדם הכריע ואין לנו את זהותו
--     (השער עדיין אינו מעביר אותה, v6); שתיהן מלאות — אדם ידוע הכריע ומתי.
--     עמודה אחת לא הייתה מסוגלת לומר את ההבדל בין הראשון לשני.
--
-- (3) decided_at נכתב גם כשהזהות אינה ידועה, ולא נמנע. «אדם הכריע ואיננו
--     יודעים מי» הוא נתון אמיתי, והוא הנתון היחיד שהמוצר מסוגל לומר היום —
--     הפונקציה נגישה ל-service_role בלבד, והקורא היחיד שלה הוא הנתיב שיושב
--     מאחורי שער הסשן. להמתין עם שתיהן עד v7 היה מוחק גם את מה שכן ידוע.
--
-- (4) decided_by הוא bigint ואינו מפתח זר ל-admin_users, אותה הכרעה בדיוק
--     כמו (1) של 0074 ומאותו טעם: זהו רישום של הכרעה שהייתה ולא מצביע חי.
--     ON DELETE SET NULL היה מוחק את שם המכריע מכל פנייה שהכריע בה ברגע
--     שהחשבון שלו נסגר — כלומר שכחה שקטה בדיוק במקום שבו הרישום נדרש;
--     ו-ON DELETE RESTRICT היה הופך סגירת חשבון לבלתי אפשרית. השם נפתר
--     ב-LEFT JOIN בצד הקריאה ומוחזר null כששורת המנהל אינה קיימת, אותה
--     הכרעה כמו (1) של 0075 על template_name_he.
--
-- (5) קריאה חוזרת עם אותו ערך אינה נוגעת בשתיהן. זו הכרעה (4) של 0072 —
--     «לחיצה כפולה במסך אינה כשל, וגם אינה אירוע» — והיא נכונה כאן חזק
--     יותר: לחיצה שנייה על «נסגרה» אינה הכרעה חדשה, וכתיבתה הייתה מזיזה את
--     החותמת מהרגע שבו ההכרעה נפלה אל הרגע שבו מישהו לחץ שוב.
--
-- (6) אין כאן טבלת יומן ולא היסטוריה. שתי העמודות אומרות את ההכרעה האחרונה
--     בלבד, והכרעה קודמת נדרסת. טבלה כזו היא מבנה נפרד עם מסך משלו, והמצאתה
--     כאן הייתה מרחיבה את הפעימה הרבה מעבר לקו שנפתח. הקו הזה נשאר פתוח
--     ומוצהר: «מי הכריע קודם» עדיין אינו נשמר.
--
-- ⚠️ ה-DROP: הוספת ארגומנט שני יוצרת חתימה חדשה, ו-create or replace היה
--    משאיר את bkalot_clone_admin_set_status(jsonb) הישנה לצד החדשה — שתי
--    פונקציות באותו שם, וקריאה עם ארגומנט אחד הופכת ל-function is not unique,
--    כלומר נתיב /set-status החי היה נשבר בלי ששום דבר כאן ידווח שגיאה. לכן
--    drop ואז create. וההשלכה השנייה של ה-drop, שאינה מובנת מאליה: drop מוחק
--    את ה-ACL. create or replace שומר הרשאות ו-drop+create אינו — פונקציה
--    חדשה ב-public מקבלת EXECUTE ל-PUBLIC כברירת מחדל, ובלי ה-revoke שלמטה
--    היה כאן רגע שבו כל מחזיק מפתח anon יכול לסגור כל פנייה במערכת.
--
-- 🚫 מצב טסט: הפונקציה נוגעת ב-status, decided_by, decided_at ו-updated_at של
--    bkalot_clone.cases ותו לא. אין כאן נגיעה ב-outbound_queue, ב-delivery_log,
--    ב-documents ולא בשום ערוץ שליחה, ואין בה net.http, אין pg_net ואין ולו
--    קריאה יוצאת אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

alter table bkalot_clone.cases
  add column if not exists decided_by bigint,
  add column if not exists decided_at timestamptz;

-- אין מילוי לאחור, ולא משום ששכחנו: אין ולו שורה אחת שאפשר למלא ממנה. cases
-- ריקה היום (נמדד: 0 שורות), ו-updated_at של שורה קיימת אינו יודע להבדיל בין
-- הכרעת אדם לבין הטריגר של 0071 — מילוי ממנו היה ממציא הכרעות שלא היו.

comment on column bkalot_clone.cases.decided_by is
  'מזהה משתמש הניהול שהכריע את הסטטוס האחרון. null = ההכרעה נעשתה בלי שהשער העביר זהות, או שלא הייתה הכרעת אדם כלל (יש להבדיל לפי decided_at). אינו FK: רישום ולא מצביע (0076 הכרעה 4).';
comment on column bkalot_clone.cases.decided_at is
  'מתי הכריע אדם על הסטטוס. null = לא הייתה הכרעת אדם — כולל פנייה שהטריגר documents_advance_case קידם ל-in_progress. אינו updated_at, שזז מכל UPDATE (0076 הכרעה 2).';

-- ── set_status כותבת את השתיים ────────────────────────────────────────────────
-- ראה ⚠️ למעלה: drop ואז create, ולא create or replace.
drop function if exists public.bkalot_clone_admin_set_status(jsonb);

create function public.bkalot_clone_admin_set_status(p jsonb, p_admin_id bigint default null)
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
  v_now    timestamptz;
begin
  v_raw := nullif(btrim(coalesce(p->>'case_id', p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
  end if;
  -- ראה הכרעה (6) של 0072: ספרות בלבד עדיין יכולות לחרוג מ-bigint.
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

  -- ראה הכרעה (4) של 0072 והכרעה (5) כאן: אותו ערך אינו כשל וגם אינו אירוע —
  -- updated_at אינו זז, ושתי העמודות החדשות אינן נכתבות. התשובה מחזירה את מה
  -- שכתוב בשורה כרגע ולא את מה שנשלח עכשיו, כדי שלחיצה כפולה לא תיראה במסך
  -- כאילו הכריעה.
  if v_prev = v_status then
    return jsonb_build_object(
             'ok', true, 'case_id', v_id, 'status', v_status,
             'previous', v_prev, 'changed', false,
             'decided_by', (select c.decided_by from bkalot_clone.cases c where c.id = v_id),
             'decided_at', (select c.decided_at from bkalot_clone.cases c where c.id = v_id));
  end if;

  -- אותה חותמת לשתי העמודות ול-updated_at: now() בתוך טרנזקציה אחת הוא ערך
  -- אחד, והשמתו למשתנה אומרת זאת במפורש במקום להישען על כך.
  v_now := now();

  update bkalot_clone.cases c
     set status     = v_status,
         updated_at = v_now,
         -- ראה הכרעה (3): החותמת נכתבת גם כשהזהות אינה ידועה. decided_by
         -- נכתב כפי שהתקבל, כולל null — coalesce על הערך הקודם היה מייחס
         -- הכרעה חדשה למי שהכריע את הקודמת.
         decided_at = v_now,
         decided_by = p_admin_id
   where c.id = v_id
     and c.app_key = 'bkalot-clone';

  return jsonb_build_object(
           'ok', true, 'case_id', v_id, 'status', v_status,
           'previous', v_prev, 'changed', true,
           'decided_by', p_admin_id, 'decided_at', v_now);
end;
$fn$;

comment on function public.bkalot_clone_admin_set_status(jsonb, bigint) is
  'שכבה 3 של שכפול בקלות: הכרעת אדם על סטטוס פנייה — in_progress/closed/rejected בלבד. '
  'new הוא מצב לידה ו-sent בלתי-ניתן-להשגה כל עוד אין מסלול שליחה. אין בה בדיקת זהות — '
  'service_role בלבד, השער יושב ב-bkalot-clone-admin. p_admin_id הוא ארגומנט שני ולא מפתח '
  'ב-p, כדי שגוף הבקשה מהדפדפן לא יוכל למלא אותו (0072, 0076).';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- ראה ⚠️ למעלה: ה-DROP מחק את ה-ACL, ולכן ה-revoke הזה אינו טקס אלא הדבר
-- היחיד שמונע מכל מחזיק מפתח anon לסגור כל פנייה במערכת — כלומר להעלים פניות
-- של אנשים אמיתיים ממסך הניהול.
revoke all on function public.bkalot_clone_admin_set_status(jsonb, bigint) from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_set_status(jsonb, bigint) to service_role;
