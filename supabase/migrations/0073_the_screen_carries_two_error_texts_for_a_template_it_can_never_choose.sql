-- 0073 — למסך הניהול יש שני נוסחי שגיאה על תבנית שהוא לעולם אינו יכול לבחור
-- (§5ב, core.issues #237)
--
-- מה היה: bkalot_clone_render מקבל template_key מאז 0063, ומחזיר עליו שני
-- פסקי דין שונים במכוון — template_unknown (מפתח שאינו במסד) ו-
-- template_disabled (מפתח קיים ש-enabled=false). apps/37-bkalot-clone/admin.html
-- כבר נושא את שני הנוסחים בעברית (ERRORS: «התבנית שהתבקשה אינה קיימת במסד»,
-- «התבנית שהתבקשה מנוטרלת ואינה מפיקה»), ואינו שולח template_key לעולם —
-- כלומר שני מסלולי שגיאה שנבנו, תורגמו ונשמרו, ואין ולו לחיצה אחת בכל המוצר
-- שיכולה להגיע אליהם. המנהל אינו יכול לבחור מכתב, ואינו יכול לדעת שיש יותר
-- מאחד: bkalot_clone.templates מחזיקה היום שתי שורות, ואף אחת מהן אינה מגיעה
-- לדפדפן בשום נתיב.
--
-- מה נבנה כאן: bkalot_clone_admin_case מחזירה גם templates. מיגרציה בלבד —
-- אין נתיב HTTP חדש (הנתיב /case קיים ומעביר את גוף התשובה כפי שהוא), אין
-- שינוי בקוד הלקוח ואין פריסת פורטל. בחירת התבנית במסך היא הלבנה הבאה.
--
-- חמש הכרעות:
--
-- (1) גם השורות המנוטרלות חוזרות, עם enabled לצידן. זו ההכרעה שקובעת אם שני
--     נוסחי השגיאה של render נשארים שני נוסחים או מתמזגים לאחד: «אין מכתב
--     כזה» ו«המכתב הזה מכובה» הן שתי תשובות שונות למנהל ששואל למה לא יצא
--     מסמך. סינון ב-`where t.enabled` כאן היה הופך תבנית מכובה לתבנית שאינה
--     קיימת, בדיוק ההבחנה ש-0063 טרחה לבנות.
--
-- (2) אין כאן ולו העתק אחד של כלל ברירת המחדל. render גוזר את המפתח מ-kind
--     (`treatment` → rights_treatment_reply, אחרת general_inquiry_reply) והוא
--     הבעלים היחיד של הכלל. חישוב is_default כאן היה מקום שני שבו מוכרעת
--     זהות המכתב, ושני מקומות כאלה מסתעפים בשקט — הסתעפות שהסימפטום שלה הוא
--     מסמך נכון שנשלח לאדם הלא נכון. המסך יציע «ברירת מחדל לפי סוג הפנייה»
--     כערך ריק, כלומר לא ישלח template_key כלל, וזו התנהגות היום בדיוק.
--
-- (3) channels חוזר. render/queue דוחים pdf ו-audio ב-channel_unsupported,
--     ותבנית שאינה email אינה ניתנת להפקה במסלול הקיים — מסך שיציע אותה
--     יבטיח הבטחה שאיש אינו עומד מאחוריה, אותה עמדה שממנה נכתב (2) של #234.
--
-- (4) על הפנייה ולא בנתיב נפרד. המסך כבר קורא ל-/case לפני שיש בו כפתור
--     «הפק מסמך» בכלל, ונתיב שני לטבלה בת שתי שורות הוא בקשה נוספת שיכולה
--     להיכשל בפני עצמה — ואז המסך פתוח בלי רשימת תבניות ועם כפתור פעיל.
--
-- (5) המיון הוא enabled desc, name_he ולא id. סדר היצירה אינו אומר דבר למי
--     שקורא את הרשימה, ומכתב מכובה אינו צריך לשבת ראשון רק משום שנוצר קודם.
--
-- אינו נוגע במערכת החיה: אין כאן bkalot_auto מלבד ה-LEFT JOIN לאנשי הקשר
-- שהיה כאן קודם, אין outbound_queue ואין delivery_log. אין נגיעה ב-
-- 08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ולא בסכמות csj/csj_src/igud.

create or replace function public.bkalot_clone_admin_case(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
                 'created_at',    d.created_at)
               order by d.created_at, d.id)
          from bkalot_clone.documents d
          left join bkalot_auto.outbound_queue q on q.id = d.queue_id
         where d.case_id = p_id), '[]'::jsonb),
    -- 0073: מנוטרלות כלולות (הכרעה 1). אין כאן is_default (הכרעה 2) — כלל
    -- ברירת המחדל יושב ב-bkalot_clone_render בלבד.
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

comment on function public.bkalot_clone_admin_case(bigint) is
  'פנייה אחת למסך הניהול: הפנייה, איש הקשר, הזכויות, המסמכים ושורות התור שלהם, ורשימת התבניות — כולל מנוטרלות, ובלי כלל ברירת המחדל שהוא של bkalot_clone_render בלבד (0073).';
