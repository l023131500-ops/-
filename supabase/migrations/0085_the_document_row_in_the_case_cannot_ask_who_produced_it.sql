-- 0085 — שכפול בקלות שכבה 3
-- מסך המסמך אומר מי הפיק; שורת המסמך שברשימה של אותה פנייה עדיין שותקת.
--
-- מי כתב את הקו הזה: 7d7dcf2, בסופה, מילה במילה: «bkalot_clone_admin_case
-- (בלוק documents) ו-bkalot_clone_admin_cases אינן יודעות על produced_by, ולכן
-- שורת המסמך ברשימה עדיין שותקת — רק מסך המסמך מדבר». כאן נלקח
-- bkalot_clone_admin_case ורק הוא — אותו פיצול בדיוק שבו 0077 לקחה את מסך
-- הפנייה והשאירה את רשימת העבודה פתוחה, ומאותו טעם הפוך: «מי הפיק» על מסמך
-- בודד כבר נענה ב-0084, ומה שחסר הוא ההשוואה בין שני מסמכים של אותה פנייה —
-- וזו נשאלת ברשימה, לא במסך שמציג אחד.
--
-- מה היה: 0083 בנתה את העמודה, v8 (f1c2a18) העבירה את הזהות בשער, 0084 החזירה
-- אותה במסך המסמך, ו-042e60f + 7d7dcf2 הציגו ופרסו. חמש לבנים, ובכל זאת:
-- מנהל שפותח פנייה עם שלושה מסמכים רואה שלוש שורות שכולן אנונימיות, ונדרש
-- לפתוח כל אחת בנפרד כדי לדעת מי כתב אותה. הכרעה (5) של 0083 — הפקה חוזרת
-- דורסת גוף ומפיק יחד — הופכת את זה למדיד ולא תיאורטי: השורה היא המקום היחיד
-- שבו שני מסמכים של אותה פנייה נראים זה לצד זה.
--
-- מה נבנה כאן: בלוק documents של bkalot_clone_admin_case מחזיר שני שדות —
-- produced_by ו-produced_by_name. אין שינוי סכמה, אין שינוי כתיבה, אין נגיעה
-- ב-render, ב-edge, ב-bkalot_clone_admin_cases ולא ב-apps/37. תוספת קריאה בלבד.
--
-- חמש הכרעות:
--
-- (1) ה-JOIN יושב בתת-השאילתה של documents ולא נשען על au שכבר קיים בפונקציה.
--     au שם מחובר על c.decided_by — מי שהכריע על הפנייה — וזה אדם אחר מהמפיק,
--     ולכל מסמך משלו. שימוש חוזר באליאס היה מדביק את שם המכריע לכל שורת מסמך.
--     האליאס כאן pau, ולא au, כדי שהטעות לא תהיה אפשרית בעריכה הבאה.
--
-- (2) LEFT JOIN ולא INNER, כהכרעה (1) של 0084 ומאותו נימוק: הכרעה (4) של 0083
--     קובעת ש-produced_by אינו FK אלא רישום, ולכן חשבון שנמחק הוא מצב חוקי.
--     INNER JOIN כאן חמור אף יותר מאשר ב-0084 — הוא לא היה מרוקן שדה אחד אלא
--     מעלים את שורת המסמך מהרשימה כולה, כלומר מוחק ראיה שמסמך נשלח בכלל.
--
-- (3) שם ריק כשהזהות מלאה פירושו «החשבון שהפיק אינו קיים עוד», ולא «אין לו שם»:
--     full_name הוא NOT NULL ב-bkalot_clone.admin_users (נמדד על הסכמה החיה,
--     לא הונח). שני ה-null יחד פירושם הפקה בלי זהות בשער — מצב v7 — בדיוק
--     כלשון הערת העמודה של 0083. אותה סמנטיקה בדיוק כמו ב-0084, ובמכוון: שני
--     המסכים קוראים את אותו נתון ואסור שיפרשו אותו אחרת.
--
-- (4) שני שדות ולא שלושה: אין produced_at ואין שדה נגזר בעל שם
--     ('anonymous'/'known'). זו הכרעה (4) של 0084 בלי סטייה, והיא נשמרת כאן גם
--     מפני ש-overwritten כבר יושב בשורה — צירוף produced_by עם overwritten הוא
--     המשפט השלם («נדרס, בידי מי»), ושדה נגזר היה שם חדש למה שכבר ביד הלקוח.
--
-- (5) התוספת היא לבלוק documents בלבד. שם שדה קיים לא השתנה, סדר השורות
--     (created_at, id) לא השתנה, שערי הקלט (case_id_required / case_not_found)
--     לא השתנו, ובלוקי case / rights / templates זהים בייט-בייט — כדי שהפעימה
--     תהיה ניתנת לביטול בלי לגעת בדבר.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, והפונקציה היא
-- SECURITY DEFINER — grant execute ל-anon כאן היה חושף כל פנייה, על איש הקשר
-- שבתוכה, לכל מחזיק מפתח anon. הבסיס נשמר: anon=false, authenticated=false,
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
                 -- ראה הכרעות (1)–(3): pau ולא au — au למעלה הוא מי שהכריע על
                 -- הפנייה, וכאן נשאל מי הפיק את המסמך הזה. שם ריק כשהזהות מלאה
                 -- פירושו שהחשבון שהפיק אינו קיים עוד; שניהם null פירושו הפקה
                 -- בלי שהשער העביר זהות (מצב v7), כלשון הערת העמודה של 0083.
                 'produced_by',      d.produced_by,
                 'produced_by_name', pau.full_name,
                 'created_at',    d.created_at,
                 'updated_at',    d.updated_at,
                 'overwritten',   case when d.updated_at is null then null
                                       else (d.updated_at is distinct from d.created_at) end)
               order by d.created_at, d.id)
          from bkalot_clone.documents d
          left join bkalot_auto.outbound_queue q on q.id = d.queue_id
          left join bkalot_clone.templates t on t.key = d.template_key
          left join bkalot_clone.admin_users pau on pau.id = d.produced_by
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
-- — רשימת העבודה — עדיין אינה יודעת על produced_by, ולא נגעה. וכך גם admin.html:
-- התשובה כוללת מעכשיו את שני השדות בכל שורת מסמך, ואין עדיין מי שמציג אותם —
-- זו הלבנה הבאה, ואחריה פריסת פורטל.
