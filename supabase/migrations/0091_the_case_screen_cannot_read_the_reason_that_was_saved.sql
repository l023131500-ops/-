-- 0091 — שכפול בקלות שכבה 3
-- מסך הפנייה אינו יכול לקרוא את הנימוק ששמור.
--
-- מי כתב את הקו הזה: 0090 עצמה, בסופה ובמילים האלה — «פתוח: אף קורא אינו מחזיר
-- את note. bkalot_clone_admin_case מחזירה את status_history מאז 0088 בלי השדה —
-- has_note_key=false נמדד גם אחרי המיגרציה, ובמכוון... הנימוק ניתן לכתיבה
-- מהכתובת החיה ואינו ניתן לקריאה משום מסך — זו הלבנה הבאה, אותו פיצול כמו
-- 0087 → 0088 → UI → פריסה». כאן נלקחת הלבנה הראשונה מבין השלוש, ורק היא.
--
-- מה יש היום: 0090 בנתה את bkalot_clone.case_status_log.note ו-set_status
-- כותבת אותה מהכתובת החיה — נמדד שם, על נימוק שנשלח מהגוף דרך v8 בלי שורת קוד
-- אחת בשער. הנתון קיים במסד, מדויק, ואין דרך אחת להוציא אותו: bkalot_clone_admin_case
-- בונה כל שורת status_history משישה מפתחות (id, from_status, to_status,
-- admin_id, admin_name, at) ו-note אינו ביניהם. נמדד לפני ולא הונח: בריצת
-- ה-before של הפעימה הזו, על אותן ארבע פניות, has_note_key=false בכל חמש
-- השורות — היעדר מפתח ולא null — בעוד במסד יושבים 52, 59, null, 500 ו-57 תווים.
--
-- למה זה חשוב: זהו בדיוק ההפרש בין נתון ששמור לבין נתון שניתן לשאול עליו.
-- מנהל שפותח פנייה שנדחתה רואה את הרצף המלא — מי הכריע, מה הוכרע ומתי — ולא
-- רואה את המשפט שהמכריע טרח להקליד. עד שקורא כלשהו יחזיר את השדה, 0090 היא
-- כתיבה לתוך בור: הנימוק נאסף, נשמר, ואינו משמש איש.
--
-- מה נבנה כאן: מפתח אחד בשורת status_history של bkalot_clone_admin_case.
-- אין נגיעה בסכמה, אין עמודה חדשה, אין אילוץ חדש; bkalot_clone_admin_cases
-- (0089), bkalot_clone_admin_document, bkalot_clone_set_status (0090),
-- bkalot_clone_render, supabase/functions ו-apps/37 לא נגעו. אין פריסת edge
-- ואין פריסת פורטל — התשובה תכלול את השדה ואיש עדיין לא יצייר אותו.
--
-- ארבע הכרעות:
--
-- (1) note ולא reason ולא decision_note — אותו שם בדיוק שבעמודה. 0090 הכרעה (3)
--     בחרה בו על העמודה, ושם שונה בקורא היה מחייב כל קורא עתידי לתרגם בין שני
--     שמות לאותו נתון. כלל 0078: אותו נתון אינו זכאי לשני ניסוחים.
--     ⚠️ ובמכוון, שני מפתחות בשם note באותה תשובה: case.note הוא מה שהאזרח כתב
--     בטופס, ו-status_history[].note הוא מה שהמכריע כתב על המעבר. הם באמת אותו
--     סוג דבר — טקסט חופשי שאדם הקליד — ומופרדים בשני מקומות שונים במבנה ולא
--     בשני שמות; מי שקורא שורת יומן שואל על המעבר, ומי שקורא את הפנייה שואל על
--     הפנייה. שניהם נמדדים ב-probe זה לצד זה כדי שההפרש יהיה מדוד ולא מוצהר.
--
-- (2) המפתח קיים תמיד, גם כשהערך null. jsonb_build_object אינו מדלג על null,
--     ולכן שורה בלי נימוק תחזיר note: null ולא תשמיט את המפתח — וזו כל ההבחנה:
--     «המכריע לא נימק» ו«השרת אינו יודע לומר» נראים זהים בקריאה רגילה והם שני
--     דברים הפוכים. הראשון הוא עובדה על המעבר, השני הוא גרסת שרת ישנה. הלקוח
--     יבחין ביניהם ב-hasOwnProperty ולא בבדיקת ערך, כמו הכרעת ה-stale של
--     8a577bc ושל 74dbf7d, וה-probe כאן מודד בדיוק כך.
--
-- (3) אין limit ואין חיתוך ואין «…». התקרה נאכפת בכתיבה (0090 הכרעה 5, 500
--     תווים, note_too_long) ולא בקריאה. קורא שחותך היה מסתיר בשקט את סופו של
--     נימוק ארוך — כלומר בדיוק את מה שנכתב בזהירות ובאריכות — ומנהל שקורא
--     נימוק קטוע אינו יודע שהוא קטוע. 500 יוצאים 500; מי שרוצה לקצר, יקצר
--     בתצוגה ויאמר זאת.
--
-- (4) ה-LEFT JOIN על admin_users נשאר כפי שהוא ולא הופך ל-INNER, ובחומרה
--     הגדולה מכולן עכשיו. 0087 הכרעה (2) השאירה את admin_id בלי FK כדי
--     שהראיה תשרוד את מחיקת החשבון, ו-0089 הכרעה (4) מדדה זאת על המונים.
--     כאן זה נמדד על הנימוק עצמו: חשבון שדחה פנייה ואז נמחק — INNER היה מוחק
--     מההיסטוריה את הדחייה **ואת הסיבה לה** מפני שעובד התפטר, והאזרח היה נשאר
--     עם פנייה שנדחתה ובלי מי שיאמר למה. נמדד ולא הונח: שורה עם admin_id=92,
--     admin_name ריק, והנימוק במקומו.
--
-- מה לא נבנה כאן, במפורש: אין backfill ולא יהיה — שורות יומן מלפני 0090 נושאות
-- note null לנצח, וזו עובדה ולא פער. אין חובת נימוק על rejected. אין עריכה ואין
-- מחיקה (היומן insert-only, 0087). אין חיפוש בטקסט הנימוקים ואין סינון «יש
-- נימוק / אין». bkalot_clone_admin_cases אינה יודעת על השדה ולא תדע: שורת רשימה
-- אינה מקום לטקסט חופשי של 500 תווים, ומי שרוצה את הסיבה פותח את הפנייה.
-- ו-apps/37-bkalot-clone/admin.html אינו מצייר אותו ואין בו תיבה להקליד אותו —
-- שתי הלבנים הבאות.

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
           -- ⚠️ הכרעה (1) של 0091: זהו הנימוק של האזרח, מה שהוא כתב בטופס.
           -- הנימוק של המכריע יושב על שורת היומן שלמטה ונושא את אותו שם בדיוק,
           -- ובמכוון — שני כותבים, שני מקומות, אותו סוג דבר.
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
    -- ⚠️ ה-LEFT (הכרעה (4) של 0091) הוא מה שמשאיר את הנימוק במקומו כשהחשבון
    -- שכתב אותו נמחק: INNER היה מוחק מההיסטוריה את הדחייה ואת הסיבה לה מפני
    -- שעובד התפטר.
    'status_history', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id',          h.id,
                 'from_status', h.from_status,
                 'to_status',   h.to_status,
                 'admin_id',    h.admin_id,
                 'admin_name',  hau.full_name,
                 -- הכרעות (2) ו-(3) של 0091: המפתח קיים תמיד — jsonb_build_object
                 -- אינו מדלג על null — ולכן «המכריע לא נימק» (note: null) נבדל
                 -- מ«השרת אינו יודע לומר» (המפתח חסר, שרת מלפני 0091). והערך
                 -- שלם: אין כאן left() ואין '…' — התקרה נאכפת בכתיבה (0090).
                 'note',        h.note,
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

-- ההרשאות אינן ניתנות מחדש: create or replace שומר את ה-ACL הקיים
-- (anon=false, authenticated=false, service_role=true). ניתוח מחדש כאן היה
-- פותח את הפונקציה לתפקידים שמעולם לא הורשו לה.
