-- 0075 — שכפול בקלות שכבה 3
-- המסך מציג «מסמך #72» ואינו יכול לומר איזה מכתב יושב בו.
--
-- מה היה: 0074 הוסיפה ל-bkalot_clone.documents שלוש עמודות — template_key,
-- template_fallback, updated_at — ו-bkalot_clone_render כותב אותן בשני ענפי
-- ה-upsert. שתי פונקציות הניהול מונות את עמודות המסמך אחת-אחת ב-jsonb_build_object,
-- ולכן עמודה חדשה אינה מופיעה בתשובה מאליה. התוצאה: הנתון קיים במסד ואינו קיים
-- בשום מסך. המנהל רואה מזהה מסמך וחותמת יצירה, וקורא מהם שני דברים שאינם נכונים —
-- שהמכתב הוא זה שברירת המחדל הייתה מפיקה, ושהוא נכתב בזמן שכתוב שם.
--
-- מה נבנה כאן: bkalot_clone_admin_case (בלוק documents) ו-bkalot_clone_admin_document
-- מחזירות את שלוש העמודות, ולצידן שני שדות נגזרים — template_name_he ו-overwritten.
-- אין שינוי סכמה, אין שינוי כתיבה, ואין נגיעה ב-render.
--
-- הכרעות:
-- (1) template_name_he ב-LEFT JOIN על bkalot_clone.templates, ו-null כששורת התבנית
--     אינה קיימת. 0074 הכריעה ש-template_key הוא text ואינו FK — כלומר מפתח שאין לו
--     שורה הוא מצב חוקי וצפוי, לא שחיתות נתונים. הצגת המפתח הטכני לבדו הייתה מחייבת
--     את הלקוח למפות אותו מרשימת templates שחוזרת באותה תשובה, ומיפוי כזה בלקוח נכשל
--     בשקט בדיוק במקרה שבגללו נכתבה הכרעה (1) של 0074: תבנית שנמחקה. השם מגיע מהשרת,
--     ו-null אומר «המפתח הזה כבר אינו מצביע על שורה» — עובדה, ולא היעדר תצוגה.
-- (2) template_fallback חוזר כפי שהוא, כולל null. coalesce(...,false) היה כותב על כל
--     מסמך שקדם ל-0074 «הופק מתבנית אמיתית», בדיוק הקביעה חסרת-המקור שהכרעה (5) של
--     0074 סירבה לכתוב למסד — ואין שום היגיון בכך שהמסד יאמר «לא ידוע» וה-RPC יהפוך
--     את זה לקביעה בדרך החוצה.
-- (3) overwritten נגזר בשרת ולא בלקוח: (updated_at is distinct from created_at), ו-null
--     כש-updated_at הוא null. זו השוואת timestamptz, ולא השוואת שתי מחרוזות שהלקוח
--     מקבל אחרי סריאליזציה — השאלה «האם המסמך הזה נדרס אחרי שנוצר» היא בדיוק השאלה
--     שהמנהל שואל, והיא אינה צריכה להיות חישוב שכל מסך שקורא ל-RPC ממציא מחדש.
-- (4) גם bkalot_clone_admin_document ולא רק admin_case: זו הפונקציה שמחזירה את גוף
--     המכתב עצמו, כלומר המסך היחיד שבו המנהל קורא את מה שייצא. אותו פגם בדיוק, ולתקן
--     אחת מהן היה משאיר את הנתון נגיש ברשימה וחסר במסמך עצמו.
-- (5) אין שינוי במיון, בסינון, בשמות שדות קיימים או בכל שדה אחר בתשובה — התוספת בלבד,
--     כדי שהפעימה תהיה ניתנת לביטול בלי לגעת בשום דבר שהמסך כבר קורא.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, ושתי הפונקציות
-- הן SECURITY DEFINER — grant execute ל-anon כאן היה חושף כל פנייה וכל גוף מכתב
-- לכל מחזיק מפתח anon. הבסיס: anon=false, authenticated=false, service_role=true.

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
           'created_at',   d.created_at,
           'updated_at',   d.updated_at,
           'overwritten',  case when d.updated_at is null then null
                                else (d.updated_at is distinct from d.created_at) end)
    into v_out
    from bkalot_clone.documents d
    left join bkalot_auto.outbound_queue q on q.id = d.queue_id
    left join bkalot_clone.templates t on t.key = d.template_key
   where d.id = v_id;

  if v_out is null then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_id);
  end if;

  return jsonb_build_object('ok', true, 'document', v_out);
end;
$function$;
