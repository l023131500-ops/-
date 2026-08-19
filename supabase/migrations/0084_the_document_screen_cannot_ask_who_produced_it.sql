-- 0084 — שכפול בקלות שכבה 3
-- השורה יודעת מי הפיק את המסמך, ולמסך אין דרך לשאול.
--
-- מי כתב את הקו הזה: f1c2a18, בסופה, מילה במילה: «אף קורא אינו מחזיר את
-- produced_by (bkalot_clone_admin_document ו-bkalot_clone_admin_cases אינן
-- יודעות עליו), כמו 0076 → 0077». כאן נלקח מסך המסמך ורק הוא — אותו פיצול
-- בדיוק שבו 0077 לקחה את bkalot_clone_admin_case והשאירה את רשימת העבודה
-- פתוחה, ומאותו טעם: «מי הפיק» נשאל על המסמך שפתוח לפניך, לא בסריקת רשימה.
--
-- מה היה: 0083 בנתה על bkalot_clone.documents את produced_by, ו-v8 של
-- bkalot-clone-admin (f1c2a18) העבירה את הזהות מהשער אל הארגומנט השני של
-- bkalot_clone_render — כלומר מרגע f1c2a18 כל לחיצת «הפק» בייצור כותבת אותה.
-- הנתון קיים ומדויק, ואינו נגיש לשום מסך: bkalot_clone_admin_document מונה את
-- עמודות המסמך אחת-אחת ב-jsonb_build_object, ולכן עמודה חדשה אינה מופיעה
-- בתשובה מאליה — אותו מנגנון בדיוק שבגללו נכתבה 0075 ואחריה 0077.
--
-- למה זו תקלת מוצר: מסך המסמך הוא המסך היחיד שבו מנהל פותח גוף שנכתב אל אדם
-- אמיתי ושואל «מי כתב את זה». היום הוא רואה created_at, updated_at ו-overwritten
-- — כלומר הוא יודע שהגוף נדרס, ואינו יודע בידי מי. הכרעה (5) של 0083 מחדדת את
-- זה: הפקה חוזרת דורסת את הגוף ואת produced_by יחד, ולכן שני מנהלים שהפיקו על
-- אותה שורה משאירים עקבה אחת בלבד — והמסך אינו מראה גם אותה.
--
-- מה נבנה כאן: bkalot_clone_admin_document מחזירה בבלוק document שני שדות —
-- produced_by ו-produced_by_name. אין שינוי סכמה, אין שינוי כתיבה, אין נגיעה
-- ב-render, ב-edge או ב-apps/37. תוספת קריאה בלבד.
--
-- חמש הכרעות:
--
-- (1) השם נפתר בשרת ב-LEFT JOIN על bkalot_clone.admin_users, ו-null כששורת
--     המנהל אינה קיימת. זו הכרעה (1) של 0077 מילה במילה, והיא מחוייבת כאן אף
--     יותר: הכרעה (4) של 0083 קובעת ש-produced_by אינו FK אלא רישום, כלומר
--     מנהל שחשבונו נמחק הוא מצב חוקי וצפוי ולא שחיתות נתונים. INNER JOIN היה
--     מעלים את המסמך כולו מהמסך ברגע שהמפיק עזב — כלומר מוחק את הגוף שנכתב אל
--     אזרח מפני שעובד התפטר.
--
-- (2) ולכן ה-null הזה אומר דבר אחד בדיוק, ולא שניים: full_name הוא NOT NULL
--     ב-admin_users (נמדד על הסכמה החיה, לא הונח). produced_by מלא ושם ריק
--     פירושו «החשבון שהפיק כאן כבר אינו קיים» — עובדה — ולא «יש חשבון בלי שם».
--
-- (3) email של המנהל אינו חוזר, אף שהוא זמין באותו JOIN. זו הכרעה (3) של 0077,
--     ובלי סטייה: המסך שואל «מי הפיק» ותשובתו היא שם.
--
-- (4) אין כאן שדה נגזר שממיר את שני המצבים למצב בעל שם ('anonymous'/'known'),
--     ואין produced_at. שניהם היו שם חדש למשהו שכבר ביד הלקוח: שני ה-null
--     עוברים JSON כפי שהם, ו«מתי הופק» הוא updated_at — שהערת העמודה של 0083
--     כבר קובעת ש-render היא הכותבת היחידה שלו. הכרעה (2) של 0083 נשמרת כאן
--     ולא נפרמת מצד הקריאה.
--
-- (5) הבלוק היחיד שמשתנה הוא document, והשינוי הוא תוספת בלבד: אין שינוי בשמות
--     שדות קיימים, בשערי הקלט (document_id_required / אורך 18 / not_found) ולא
--     בשום שדה שהמסך כבר קורא — כדי שהפעימה תהיה ניתנת לביטול בלי לגעת בדבר.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, והפונקציה היא
-- SECURITY DEFINER — grant execute ל-anon כאן היה חושף את גופו של כל מסמך
-- שנכתב אל אדם אמיתי לכל מחזיק מפתח anon. הבסיס נשמר: anon=false,
-- authenticated=false, service_role=true.
--
-- 🚫 מצב טסט: פונקציית קריאה בלבד — אין בה UPDATE, אין INSERT, אין נגיעה
--    ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה, ולא יוצאת ממנה ולו
--    הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

create or replace function public.bkalot_clone_admin_document(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_raw text;
  v_id  bigint;
  v_out jsonb;
begin
  v_raw := nullif(btrim(coalesce(p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'document_id_required');
  end if;
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
           'queued',       (d.queue_id is not null),
           'queue_status', q.status,
           'queue_mode',   q.mode,
           'template_key',      d.template_key,
           'template_name_he',  t.name_he,
           'template_fallback', d.template_fallback,
           -- ראה הכרעות (1)–(3): הזהות והשם שנפתר בשרת. שם ריק כשהזהות מלאה
           -- פירושו שהחשבון שהפיק אינו קיים עוד — ולא שאין לו שם. שניהם null
           -- פירושו הפקה שנעשתה בלי שהשער העביר זהות (מצב v7), כלשון הערת
           -- העמודה של 0083.
           'produced_by',      d.produced_by,
           'produced_by_name', au.full_name,
           'created_at',   d.created_at,
           'updated_at',   d.updated_at,
           'overwritten',  case when d.updated_at is null then null
                                else (d.updated_at is distinct from d.created_at) end)
    into v_out
    from bkalot_clone.documents d
    left join bkalot_auto.outbound_queue q on q.id = d.queue_id
    left join bkalot_clone.templates t on t.key = d.template_key
    left join bkalot_clone.admin_users au on au.id = d.produced_by
   where d.id = v_id;

  if v_out is null then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_id);
  end if;

  return jsonb_build_object('ok', true, 'document', v_out);
end;
$function$;

-- מה שאין כאן ואינו נשכח, ומוצהר כדי שלא ייקרא כהשלמה: bkalot_clone_admin_case
-- — מסך הפנייה — מונה בבלוק documents שורה לכל מסמך, ואינה יודעת על produced_by;
-- bkalot_clone_admin_cases — רשימת העבודה — אף היא לא. שתיהן לא נגעו, בדיוק
-- כפי ש-0077 השאירה את הרשימה פתוחה. וכך גם admin.html: התשובה כוללת מעכשיו את
-- שני השדות, ואין עדיין מי שמציג אותם — זו הלבנה הבאה, ואחריה פריסת פורטל.
