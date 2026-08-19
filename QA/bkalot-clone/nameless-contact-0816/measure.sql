-- המדידות בדיוק כפי שרצו, בסדר שבו רצו. נשמרות כדי שהטענה תהיה ניתנת להרצה
-- מחדש ולא רק לקריאה.
--
-- הפיגום (#377 / contact 384) נזרע ב-seed.mjs דרך נתיב הציבור מעל HTTP.

-- 1. המעבר שכותב את הנימוק. ⚠️ ב-SQL ולא מהמסך: המדידה היא של פונקציית המסד.
select public.bkalot_clone_admin_set_status(
  jsonb_build_object('case_id', 377, 'status', 'rejected',
                     'note', 'המסמכים שצורפו שייכים לשנת המס הקודמת'), 4) as r;

-- 2. חמש השאילתות — רצות פעם לפני מחיקת איש הקשר ופעם אחריה, בלי שינוי.
with q(label, term) as (values
  ('1-note','המס הקודמת'),('2-name','אברהם'),('3-phone','0501230011'),
  ('4-case_id','377'),('5-miss','zzzz'))
select q.label, q.term, r->'total' as total,
       (select jsonb_agg(x->'id') from jsonb_array_elements(r->'cases') x) as ids,
       (select jsonb_agg(x->'matched_in_note') from jsonb_array_elements(r->'cases') x) as matched_in_note,
       (select jsonb_agg(jsonb_typeof(x->'matched_in_note')) from jsonb_array_elements(r->'cases') x) as typeof,
       (select jsonb_agg(x->'contact') from jsonb_array_elements(r->'cases') x) as contact
  from q, lateral (select public.bkalot_clone_admin_cases(jsonb_build_object('q', q.term)) as r) c
 order by 1;

-- 3. מה שהופך את הענף מקריאה למדידה: איש הקשר נמחק, וה-FK
--    (ON DELETE SET NULL) משאיר את הפנייה חיה בלי זהות.
delete from bkalot_auto.contacts where id = 384;
select id, contact_id, status, decided_by from bkalot_clone.cases where id = 377;

-- 4. הנגד־עובדה. אותה שורה בדיוק, פעם בלי ה-coalesce ופעם איתו — ובקרה על
--    מונח שכן מתאים לשדה נראה, כדי ש-null לא ייקרא כתכונה של צורת הביטוי.
select
  (c.id::text = 'המס הקודמת'
   or ct.full_name ilike '%המס הקודמת%' escape '\'
   or ct.phone     ilike '%המס הקודמת%' escape '\'
   or ct.email     ilike '%המס הקודמת%' escape '\') as visible_chain,
  (not (c.id::text = 'המס הקודמת'
        or ct.full_name ilike '%המס הקודמת%' escape '\'
        or ct.phone     ilike '%המס הקודמת%' escape '\'
        or ct.email     ilike '%המס הקודמת%' escape '\')) as without_coalesce,
  (not coalesce(c.id::text = 'המס הקודמת'
        or ct.full_name ilike '%המס הקודמת%' escape '\'
        or ct.phone     ilike '%המס הקודמת%' escape '\'
        or ct.email     ilike '%המס הקודמת%' escape '\', false)) as with_coalesce,
  (not (c.id::text = '377'
        or ct.full_name ilike '%377%' escape '\'
        or ct.phone     ilike '%377%' escape '\'
        or ct.email     ilike '%377%' escape '\')) as without_coalesce_on_id_term
from bkalot_clone.cases c
left join bkalot_auto.contacts ct on ct.id = c.contact_id
where c.id = 377;

-- 5. ואותה שורה במסך הפנייה — 0097 על אותו מצב בדיוק.
select r->'ok' as ok,
       (r->'case')->'contact' as contact,
       (select jsonb_agg(jsonb_build_object('id',x->'id','note_matched',x->'note_matched',
                                            'typeof',jsonb_typeof(x->'note_matched')))
          from jsonb_array_elements(r->'status_history') x) as history
from (select public.bkalot_clone_admin_case(377,'המס הקודמת') as r) t;

-- 6. גלגול אחורה — פקודות נפרדות לפי טבלה (cte-delete-sees-prestatement-snapshot).
--    איש הקשר 384 כבר נמחק בשלב 3, כחלק מהמדידה עצמה.
delete from bkalot_clone.case_status_log where case_id = 377;
delete from bkalot_clone.case_rights      where case_id = 377;
delete from bkalot_clone.cases            where id = 377;
