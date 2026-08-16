-- 0088 — שכפול בקלות שכבה 3
-- מסך הפנייה אינו יכול לשאול מה קרה לפני ההכרעה האחרונה.
--
-- מי כתב את הקו הזה: 0602701 (heartbeat 624), בסופה, מילה במילה: «פתוח: אף קורא
-- אינו מחזיר את היומן. bkalot_clone_admin_case אינה יודעת עליו — has_history=false
-- ו-has_decisions=false נמדדו גם אחרי המיגרציה, ובמכוון... ההיסטוריה נכתבת ואיש
-- אינו רואה אותה — זו הלבנה הבאה, אותו פיצול כמו 0083 → 0084 → UI → פריסה».
-- כאן נלקח bkalot_clone_admin_case ורק היא.
--
-- מה היה: 0087 בנתה את bkalot_clone.case_status_log ונתנה ל-set_status לכתוב אליו
-- שורה בכל מעבר. מאז כל הכרעה נשמרת — ואף מסך אינו יודע לשאול עליה. cases.decided_by
-- ו-cases.decided_at ממשיכים להיות מה שהם: ערך אחרון. מנהל שפותח פנייה שנדחתה רואה
-- את מי שדחה, ולא את מי שלקח אותה שבוע קודם ולא את מי שסגר אותה לפני הדחייה. ההפרש
-- בין 0087 לכאן הוא ההפרש בין נתון ששמור לבין נתון שניתן לשאול עליו.
--
-- מה נבנה כאן: בלוק status_history בתשובת מסך הפנייה — שורה לכל מעבר, לפי הסדר,
-- עם מי שהכריע ועם שמו. אין שינוי סכמה, אין כתיבה, אין נגיעה ב-set_status,
-- ב-render, ב-admin_cases, ב-admin_document, ב-edge ולא ב-apps/37. קריאה בלבד.
--
-- שש הכרעות:
--
-- (1) הבלוק הוא top-level ליד rights/documents/templates, ולא שדה בתוך case.
--     בתוך case יושבות עובדות יחידות — id, status, decided_by — ומפתח אחד לכל
--     עובדה; מערך בתוכו היה הופך את הבלוק הזה למה שהוא אינו. נמדד לפני: ל-case
--     17 מפתחות ולתשובה 6 (ok, case, rights, documents, templates, admin), והבחירה
--     היא ש-17 יישאר 17. status_history ולא history או decisions, מפני שהיומן מדבר
--     על status ורק עליו: ל-kind, ל-topic_no ול-situation אין היסטוריה, ושם רחב
--     היה מבטיח אותה.
--
-- (2) הסדר הוא at asc, id asc — סדר מלא ולא at לבדו. at אינו ייחודי: שני מעברים
--     באותה עסקה מקבלים את אותו now() בדיוק, וזו הכרעה (3) של 0082 והכרעה (2) של
--     0086 מילה במילה. בלי שובר שוויון היה הרצף רשאי להתהפך מרענון לרענון בלי
--     שגיאה. עולה ולא יורד, ובמכוון: הכרעה (4) של 0087 היא שכל שורה היא משפט שלם
--     — to_status של כל שורה שווה ל-from_status של הבאה — והקריאה הזו נכונה
--     בכיוון אחד בלבד. מי שרוצה את האחרון למעלה יהפוך בלקוח.
--
-- (3) LEFT JOIN על admin_users ולא INNER. הכרעה (2) של 0087 השאירה את admin_id
--     בלי FK דווקא כדי שהראיה שפנייה נדחתה בידי מי שכבר עזב תשרוד את מחיקת
--     החשבון — ו-INNER כאן היה זורק בקריאה בדיוק את מה שנשמר בכתיבה, כלומר מוחק
--     את שורת הדחייה מההיסטוריה מפני שעובד התפטר. זו אותה הכרעה של 0084, 0085
--     ו-0086, וכאן בחומרה הגדולה מכולן: שם נמחק שדה, כאן נמחק מעבר.
--
-- (4) admin_id ו-admin_name שניהם חוזרים, ואינם מפוענחים בשדה נגזר שלישי. שם ריק
--     כשהזהות מלאה פירושו שהחשבון שהכריע אינו קיים עוד — ולא שאין לו שם; זה בדיוק
--     הניסוח של הערת העמודה של 0083 ושל decided_by_name במסך הזה עצמו. full_name
--     הוא NOT NULL ב-admin_users (נמדד על הסכמה החיה), ולכן ההבחנה חדה. admin_id
--     עצמו nullable בטבלה, אך הכותב היחיד הוא הנתיב שמאחורי השער — שניהם null
--     פירושו מעבר שנכתב בלי זהות, ואינו קיים היום בשום שורה.
--
-- (5) id של השורה חוזר, והוא מפתח ולא מונה. ⚠️ 0087 רשמה ששתי הכנסות שנדחו שרפו
--     את מזהי 4 ו-5 של ה-identity, ולכן מספרי השורות ביומן אינם רצף — לקוח שיסיק
--     מהם «כמה הכרעות היו» יטעה. הוא חוזר כדי שתהיה לשורה זהות יציבה ברשימה
--     שתצויר עליה, ולא כדי להיספר.
--
-- (6) אין limit, אין מפתח קלט חדש ואין סינון. לפנייה יש מעברים מעטים, וגג היה
--     מסתיר בשקט את הישנות — כלומר בדיוק את «מי לקח את זה», השאלה שבגללה נבנה
--     היומן מלכתחילה. שאר התשובה זהה בייט-בייט: case, rights, documents ו-templates
--     לא נגעו, השערים לא נגעו, ולכן הפעימה ניתנת לביטול בלי לגעת בדבר.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, והפונקציה היא
-- SECURITY DEFINER — grant execute ל-anon כאן היה חושף את היסטוריית ההכרעות על
-- פניות של אנשים אמיתיים לכל מחזיק מפתח anon. הבסיס שנמדד לפני: anon=false,
-- authenticated=false, service_role=true. bkalot_clone.case_status_log עצמה נותנת
-- ל-postgres בלבד ו-RLS מופעל עליה עם אפס policies (0087 הכרעה (7)), ולכן הדרך
-- היחידה לקרוא אותה עוברת בפונקציה הזו — כפי שהדרך היחידה לכתוב אליה עוברת
-- ב-set_status.
--
-- 🚫 מצב טסט: פונקציית קריאה בלבד — אין בה UPDATE, אין INSERT, אין נגיעה
--    ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה, ולא יוצאת ממנה ולו
--    הודעה אחת.
--
-- 🔒 מוגן: 08, 09, bkalut-app, bkalot-admin, zr_*, NEDARIM3873 וסכמות csj/csj_src/
--    igud לא נגעו ואינן מוזכרות כאן.

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
           -- שלושת אלה הם ההכרעה האחרונה בלבד; הרצף כולו יושב ב-status_history
           -- שלמטה, והכרעה (1) של 0088 היא ששני אלה לא יתערבבו.
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
    -- ראה הכרעות (1)–(6) של 0088. הרצף עולה ונקרא כמשפט אחד: to_status של כל
    -- שורה שווה ל-from_status של הבאה. hau ולא au ולא pau — au הוא מי שהכריע
    -- אחרון על הפנייה, pau (במסמכים שלמטה) הוא מי שהפיק מסמך, וכאן נשאל מי
    -- הכריע במעבר הזה; שימוש חוזר היה מדביק אדם אחד לכל שורות ההיסטוריה.
    'status_history', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id',          h.id,
                 'from_status', h.from_status,
                 'to_status',   h.to_status,
                 'admin_id',    h.admin_id,
                 'admin_name',  hau.full_name,
                 'at',          h.at)
               order by h.at, h.id)
          from bkalot_clone.case_status_log h
          left join bkalot_clone.admin_users hau on hau.id = h.admin_id
         where h.case_id = p_id), '[]'::jsonb),
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
