-- 0069 — מסך הפנייה הראה את המייל של איש הקשר ולא את הכתובת שהמכתב ילך אליה,
--        ולא ידע אילו מסמכים כבר נמצאים בתור.
--
-- שני חוסרים באותה פונקציה אחת, ושניהם אותו דבר: bkalot_clone_admin_case היא
-- הקריאה היחידה שמסך הפנייה עושה בטעינה, והיא מחזירה פחות ממה שמסלול הכתיבה
-- כבר מכריע.
--
-- (1) הכתובת. 0068 הכריעה שכתובת היעד וההסכמה הן נתון של הפנייה — cases.to_email
--     ו-cases.consent, צילום של מה שנמסר בהגשה — ושהתור קורא את הצילום. איש
--     הקשר נשאר מפתח זהות לפי טלפון בלבד, והמייל שלו נדרס בכל פנייה חדשה מאותו
--     טלפון. מסך הפנייה מציג עד היום את contact.email בלבד, כלומר את הכתובת
--     שנדרסה אחרונה — ולא את זו שהמכתב של הפנייה הזו ילך אליה. מנהל שמסתכל
--     במסך וקורא כתובת אחת, בזמן שהתור ישלח לכתובת אחרת, אינו רואה שום סימן
--     לכך. contact_email_differs נמדד ב-0068 ולא הוצג בשום מקום — כאן הוא
--     מוחזר לקורא, ולצידו to_email ו-consent של הפנייה עצמה.
--
-- (2) מצב התור. 0067 הוסיפה queue_status ו-queue_mode ל-admin_document בדיוק
--     מפני ש-queue_id non-null של שורה חסומה נקרא כמו «נשלח». אותה מלכודת
--     בדיוק נשארה פתוחה ב-admin_case: היא מחזירה queue_id ותו לא, ולכן מסך
--     הפנייה בטעינה אינו יודע אילו מסמכים כבר בתור, ובוודאי לא אילו מהם נחסמו.
--     היום הדרך היחידה לגלות היא ללחוץ «הצג» מסמך-מסמך.
--
-- הכרעות:
-- • קריאה בלבד. אין כאן שינוי סכמה, אין נתיב כתיבה חדש ואין נגיעה בהכרעות של
--   0068 — הכתובת עדיין נגזרת במסד בזמן ההכנסה לתור, ולא כאן.
-- • queue_missing מוחזר במפורש ולא נגזר בצד הלקוח מ-queue_status שהוא null:
--   ה-FK הוא ON DELETE SET NULL ולכן queue_id בלי שורה אינו אמור לקרות, אבל
--   0067 כבר בנתה לו קוד שגיאה משלה (queue_row_missing) במקום להניח. «בתור #14
--   · null» הוא בדיוק סוג השורה שנקראת כמו תקלה של המסך ולא כמו נתון חסר.
-- • contact_email_differs הוא null כשאין איש קשר או כשאין to_email — «אין נתון»
--   ולא false. false פירושו «נמדד והן זהות», וזה לא מה שקורה כשאין מה להשוות.
-- • ההשוואה היא is distinct from על הערכים כפי שהם, בלי lower() ובלי btrim():
--   נורמליזציה כאן הייתה מסתירה הבדל שהתור עצמו רואה. אם יימצא הבדל שהוא רק
--   רישיות — הוא יופיע, וזו החלטה לשכבת הקליטה ולא לשכבת הקריאה.
--
-- מוגן: אין נגיעה ב-08/09, ב-bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ולא
-- בסכמות csj/csj_src/igud. bkalot_auto נקראת בלבד (LEFT JOIN), ואף פונקציה
-- שלה לא שונתה.

create or replace function public.bkalot_clone_admin_case(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
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
           -- הכתובת וההסכמה של הפנייה עצמה (0068) — זה מה שהתור קורא
           'to_email',   c.to_email,
           'consent',    c.consent,
           -- null = אין מה להשוות; false = נמדד והן זהות
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
    -- מטא-דאטה בלבד: גוף המסמך אינו נשלח ברשימה (הוא נקרא ב-admin_document,
    -- 0064). מה שכן נשלח מרגע 0069 הוא מצב שורת התור, כי queue_id לבדו נקרא
    -- כמו «נשלח» גם כששורת התור חסומה.
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
         where d.case_id = p_id), '[]'::jsonb));
end;
$fn$;

comment on function public.bkalot_clone_admin_case(bigint) is
  'שכבה 2 של שכפול בקלות: פנייה בודדת + זכויות (LEFT JOIN לקטלוג החי) + מטא-דאטה '
  'של מסמכים כולל מצב שורת התור (0069), וכתובת היעד וההסכמה של הפנייה עצמה (0068). '
  'קריאה בלבד, אין בה בדיקת זהות — service_role בלבד.';

-- הרשאות נכתבות שוב במפורש: create or replace אינו מאפס אותן, אבל מפתח ה-anon
-- יושב גלוי בקוד המקור של הטופס הציבורי מאז #223, והפונקציה הזו מחזירה טלפון
-- ומייל של כל מי שהשאיר פרטים.
revoke all on function public.bkalot_clone_admin_case(bigint) from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_case(bigint) to service_role;
