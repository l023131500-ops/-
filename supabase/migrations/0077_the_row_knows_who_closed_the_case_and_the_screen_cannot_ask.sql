-- 0077 — שכפול בקלות שכבה 3
-- השורה יודעת מי סגר את הפנייה, ולמסך אין דרך לשאול.
--
-- מי כתב את הקו הזה: f1ba90c, בסופה, מילה במילה: «המסך עדיין אינו מציג את זה —
-- bkalot_clone_admin_case אינה מחזירה את שתי העמודות, ולכן admin.html אינו יכול
-- לומר מי סגר. זו הלבנה הבאה, אותו פיצול כמו 0074 → 0075 → UI». כאן נלקחת
-- הלבנה הזו, ורק היא.
--
-- מה היה: 0076 בנתה על bkalot_clone.cases את decided_by ואת decided_at, ו-v7
-- של bkalot-clone-admin העבירה את הזהות מהשער אל p_admin_id — כלומר מרגע f1ba90c
-- כל לחיצת «נסגרה»/«נדחתה»/«בטיפול» בייצור כותבת את שתיהן. נמדד עכשיו על המסד
-- החי: פנייה 98 היא closed, decided_by=27, decided_at=2026-08-14 04:41:35+00,
-- והשם ב-admin_users הוא «QA 0077 שני»; פנייה 99 — שתיהן null. הנתון קיים,
-- מדויק, ואינו נגיש לשום מסך: bkalot_clone_admin_case מונה את עמודות הפנייה
-- אחת-אחת ב-jsonb_build_object, ולכן עמודה חדשה אינה מופיעה בתשובה מאליה — אותו
-- מנגנון בדיוק שבגללו נכתבה 0075.
--
-- למה זו תקלת מוצר: מסך הפנייה הוא המסך היחיד שבו מנהל שני פותח פנייה סגורה
-- ושואל «מי סגר את זו, ומתי». היום הוא רואה status=closed ו-updated_at, ומ-0076
-- ידוע במפורש ש-updated_at אינו יודע לומר אם אדם הכריע בכלל — הטריגר
-- documents_advance_case מזיז אותו גם הוא. כלומר: נכתבה במסד תשובה מלאה לשאלה
-- שהמנהל שואל, והמסך אינו יכול לשאול אותה. זהו המצב השלישי של הכרעה (2) של 0076
-- («אדם ידוע הכריע ומתי») — הוא מושג מאז f1ba90c, והוא בלתי נראה.
--
-- מה נבנה כאן: bkalot_clone_admin_case מחזירה בבלוק case שלוש שדות —
-- decided_by, decided_at, decided_by_name. אין שינוי סכמה, אין שינוי כתיבה, אין
-- נגיעה ב-set_status, ב-edge או ב-apps/37. תוספת קריאה בלבד.
--
-- חמש הכרעות:
--
-- (1) השם נפתר בשרת ב-LEFT JOIN על bkalot_clone.admin_users, ו-null כששורת
--     המנהל אינה קיימת. זו אותה הכרעה כמו (1) של 0075 על template_name_he,
--     ומאותו טעם המחודד על ידי הכרעה (4) של 0076: decided_by אינו FK, ולכן
--     מנהל שחשבונו נסגר הוא מצב חוקי וצפוי ולא שחיתות נתונים. INNER JOIN היה
--     מעלים את הפנייה כולה מהמסך ברגע שהמכריע עזב, ומיפוי בלקוח מרשימת מנהלים
--     — רשימה שאינה חוזרת בתשובה הזו כלל — לא היה קיים.
--
-- (2) ולכן ה-null הזה אומר דבר אחד בדיוק, ולא שניים: full_name הוא NOT NULL
--     ב-admin_users (נמדד על הסכמה החיה, לא הונח). כלומר decided_by מלא ושם
--     ריק פירושו «החשבון שהכריע כאן כבר אינו קיים» — עובדה — ולא «יש חשבון
--     בלי שם». אילו היה השם nullable, השדה היה מכסה שני מצבים שונים באותו
--     null, והיה צריך כאן שדה נוסף שיאמר אם השורה קיימת. אין בו צורך.
--
-- (3) email של המנהל אינו חוזר, אף שהוא זמין באותו JOIN. המסך שואל «מי הכריע»
--     ותשובתו היא שם. הכנסת כתובת המייל של איש צוות לתוך כל תשובת פנייה מרחיבה
--     את מה שהתשובה הזו מספרת על העובדים בלי שמסך אחד ביקש זאת, וכל שדה שחוזר
--     הופך לשדה שמישהו יתחיל להישען עליו.
--
-- (4) אין כאן שדה נגזר שממיר את שני ה-null למצב בעל שם ('none'/'anonymous'/
--     'known'). זו אינה הימנעות מנוחות אלא ההבדל מ-0075: שם נגזר overwritten
--     כי השוואת שתי חותמות timestamptz בשרת אינה אותה שאלה כמו השוואת שתי
--     מחרוזות שהלקוח מקבל אחרי סריאליזציה. כאן שלושת המצבים של הכרעה (2) של
--     0076 הם בדיוק שני ה-null, ו-null עובר JSON כפי שהוא — שדה כזה היה שם
--     חדש שנולד כאן למשהו שכבר נמצא ביד הלקוח, ושם חדש הוא דבר שצריך לתחזק.
--
-- (5) הבלוק היחיד שמשתנה הוא case, והשינוי הוא תוספת בלבד: אין שינוי במיון,
--     בסינון, בשמות שדות קיימים, בבלוקים rights/documents/templates ולא בשום
--     שדה שהמסך כבר קורא — כדי שהפעימה תהיה ניתנת לביטול בלי לגעת בדבר.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, והפונקציה היא
-- SECURITY DEFINER — grant execute ל-anon כאן היה חושף כל פנייה של אדם אמיתי
-- לכל מחזיק מפתח anon. הבסיס נשמר: anon=false, authenticated=false,
-- service_role=true.
--
-- 🚫 מצב טסט: פונקציית קריאה בלבד — אין בה UPDATE, אין INSERT, אין נגיעה
--    ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה, ולא יוצאת ממנה ולו
--    הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

create or replace function public.bkalot_clone_admin_case(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_case jsonb;
begin
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
  end if;

  select jsonb_build_object(
           'id',         c.id,
           'created_at', c.created_at,
           'updated_at', c.updated_at,
           'kind',       c.kind,
           'status',     c.status,
           'source',     c.source,
           'situation',  c.situation,
           'topic_no',   c.topic_no,
           'note',       c.note,
           'raw',        c.raw,
           'to_email',   c.to_email,
           'consent',    c.consent,
           -- ראה הכרעות (1)–(3): הזהות, החותמת, והשם שנפתר בשרת. שם ריק כשהזהות
           -- מלאה פירושו שהחשבון שהכריע אינו קיים עוד — ולא שאין לו שם.
           'decided_by',      c.decided_by,
           'decided_at',      c.decided_at,
           'decided_by_name', au.full_name,
           'contact_email_differs',
                         case when ct.id is null or c.to_email is null then null
                              else (c.to_email is distinct from ct.email) end,
           'contact',    case when ct.id is null then null
                              else jsonb_build_object(
                                     'id',         ct.id,
                                     'full_name',  ct.full_name,
                                     'phone',      ct.phone,
                                     'email',      ct.email,
                                     'extension',  ct.extension,
                                     'consent',    ct.consent,
                                     'source',     ct.source,
                                     'created_at', ct.created_at) end)
    into v_case
    from bkalot_clone.cases c
    left join bkalot_auto.contacts ct on ct.id = c.contact_id
    left join bkalot_clone.admin_users au on au.id = c.decided_by
   where c.id = p_id;

  if v_case is null then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', p_id);
  end if;

  return jsonb_build_object(
    'ok',   true,
    'case', v_case,
    'rights', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'right_code',  r.right_code,
                 'rank',        r.rank,
                 'chosen',      r.chosen,
                 'in_catalog',  (rc.code is not null),
                 'no',          rc.no,
                 'name',        rc.name,
                 'cat',         rc.cat,
                 'prov',        rc.prov,
                 'amt',         rc.amt,
                 'prio',        rc.prio)
               order by r.rank nulls last, r.right_code)
          from bkalot_clone.case_rights r
          left join bkalot_clone.rights_catalog rc on rc.code = r.right_code
         where r.case_id = p_id), '[]'::jsonb),
    'documents', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id',            d.id,
                 'kind',          d.kind,
                 'title',         d.title,
                 'storage_path',  d.storage_path,
                 'queue_id',      d.queue_id,
                 'queue_status',  q.status,
                 'queue_mode',    q.mode,
                 'queue_missing', (d.queue_id is not null and q.id is null),
                 'has_body',      (d.body_html is not null or d.body_text is not null),
                 'template_key',      d.template_key,
                 'template_name_he',  t.name_he,
                 'template_fallback', d.template_fallback,
                 'created_at',    d.created_at,
                 'updated_at',    d.updated_at,
                 'overwritten',   case when d.updated_at is null then null
                                       else (d.updated_at is distinct from d.created_at) end)
               order by d.created_at, d.id)
          from bkalot_clone.documents d
          left join bkalot_auto.outbound_queue q on q.id = d.queue_id
          left join bkalot_clone.templates t on t.key = d.template_key
         where d.case_id = p_id), '[]'::jsonb),
    'templates', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'key',      t.key,
                 'name_he',  t.name_he,
                 'subject',  t.subject,
                 'channels', to_jsonb(t.channels),
                 'enabled',  t.enabled)
               order by t.enabled desc, t.name_he)
          from bkalot_clone.templates t), '[]'::jsonb));
end;
$function$;

-- מה שאין כאן ואינו נשכח, ומוצהר כדי שלא ייקרא כהשלמה: bkalot_clone_admin_cases
-- — רשימת העבודה — לא נגעה. שורה ברשימה אומרת status ואינה אומרת מי הכריע,
-- והשאלה «מי סגר» נשאלת בפנייה עצמה ולא בסריקת הרשימה. הקו נשאר פתוח.
-- וכך גם admin.html: התשובה כוללת מעכשיו את שלושת השדות, ואין עדיין מי שמציג
-- אותם — זו הלבנה הבאה, ואחריה פריסת פורטל.
