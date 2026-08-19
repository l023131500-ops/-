-- 0078 — שכפול בקלות שכבה 3
-- רשימת העבודה אינה מבחינה בין פנייה שאדם סגר לפנייה שהטריגר קידם.
--
-- מי כתב את הקו הזה: 0077 עצמה, בסעיף «מה שאין כאן ואינו נשכח», מילה במילה:
-- «bkalot_clone_admin_cases — רשימת העבודה — לא נגעה. שורה ברשימה אומרת status
-- ואינה אומרת מי הכריע». f2001e0 חזר עליו בסוף שרשרת הפריסה ואמר עליו «זה הקו
-- הבא». כאן נלקחת הלבנה הזו, ורק היא.
--
-- מה היה: 0076 בנתה על bkalot_clone.cases את decided_by ואת decided_at, v7 של
-- bkalot-clone-admin מעבירה את הזהות מהשער אל p_admin_id, 0077 החזירה את
-- שלושת השדות בפנייה הבודדת ו-1abad72 מצייר אותם במסך. כלומר מאז f2001e0 כל
-- לחיצת «נסגרה»/«נדחתה»/«בטיפול» בייצור נרשמת במלואה — ורשימת העבודה, המסך
-- שממנו מתחילים, אינה יודעת עליה דבר: bkalot_clone_admin_cases מונה את עמודות
-- הפנייה אחת-אחת ב-jsonb_build_object, ולכן עמודה חדשה אינה מופיעה בתשובה
-- מאליה. אותו מנגנון בדיוק שבגללו נכתבו 0075 ו-0077.
--
-- למה זו תקלת מוצר ולא הערה על שדה חסר: הרשימה היא המקום שבו מנהל בוחר במה
-- לטפל. פנייה מגיעה ל-in_progress בשתי דרכים שונות לחלוטין — אדם לחץ «בטיפול»,
-- או שהטריגר documents_advance_case קידם אותה מפני שהופק מסמך. ברשימה שתיהן
-- נראות אות באות אותו הדבר. המנהל אינו יכול לדעת מי כבר לקח את הפנייה, ולכן
-- שני אנשים יכולים לעבוד על אותה פנייה בלי ששום דבר יאמר להם — או שפנייה שאיש
-- לא נגע בה תיראה מטופלת. הנתון שעונה על זה קיים במסד ומדויק מאז 0076, והמסך
-- שבו הוא נחוץ הוא היחיד שאינו יכול לבקש אותו.
--
-- מה נבנה כאן: כל שורה ברשימה מחזירה decided_by, decided_at ו-decided_by_name.
-- אין שינוי סכמה, אין שינוי כתיבה, אין נגיעה ב-set_status, ב-admin_case,
-- ב-edge או ב-apps/37. תוספת קריאה בלבד.
--
-- שש הכרעות:
--
-- (1) שלושת השמות זהים מילה במילה לאלה של 0077 ולא נוסח כאן שם חדש
--     («closed_by», «decider»). 1abad72 בנה את fillDecidedLine שקורא בדיוק את
--     השלושה, ומסך הרשימה ומסך הפנייה אמורים לומר את אותה עובדה; שם שונה כאן
--     היה מפצל את שני המסכים על נתון אחד ומחייב שתי פונקציות עזר שיתפצלו בשקט
--     זו מזו. אותו שיקול בדיוק שהוביל ב-e9e949c לשתי פונקציות עזר משותפות.
--
-- (2) LEFT JOIN ולא INNER, וכאן זה חמור יותר מאשר ב-0077: decided_by אינו FK
--     (הכרעה (4) של 0076), ולכן מנהל שחשבונו נסגר הוא מצב חוקי. ב-0077 INNER
--     JOIN היה מרוקן מסך של פנייה אחת; כאן הוא היה מעלים את הפנייה מרשימת
--     העבודה כולה — כלומר פנייה פתוחה של אדם אמיתי הייתה נעלמת מהמסך שדרכו
--     מוצאים אותה, בלי ששום דבר ידווח שגיאה.
--
-- (3) ה-JOIN נוסף לתת-השאילתה של השורות בלבד ולא לשאילתת count(*). v_total
--     חייב למנות בדיוק את אותה קבוצה כמו קודם, ושתי השאילתות אינן חולקות
--     קוד — הוספה לאחת בלבד היא הכרעה ולא שכחה. הבטיחות נמדדה ולא הונחה: על
--     bkalot_clone.admin_users(id) יש אינדקס ייחודי חד-עמודתי, ולכן ה-JOIN
--     אינו יכול לכפול שורה. לולא כך, הרשימה הייתה מחזירה יותר שורות מ-total
--     והדפדוף היה נשבר בשקט.
--
-- (4) ה-null של decided_by_name אומר כאן דבר אחד בדיוק: full_name הוא NOT NULL
--     ב-admin_users (נמדד על הסכמה החיה, לא הונח), ולכן זהות מלאה עם שם ריק
--     פירושה «החשבון שהכריע אינו קיים עוד». זו אותה הכרעה (2) של 0077, ונשמרת
--     כאן כדי ששני המסכים יוכלו לומר את אותו משפט.
--
-- (5) לא נוסף סינון decided ולא מיון לפיו, אף שזו הבקשה הטבעית הבאה מרשימת
--     עבודה («הראה לי מה שאיש לא לקח»). סינון חדש הוא שדה קלט חדש שצריך אימות
--     מול c_statuses/c_kinds, ושינוי בקבוצה ש-count(*) מונה — כלומר פעימה
--     שאינה ניתנת לביטול בלי לגעת בדפדוף. הקו מוצהר למטה ואינו נבלע.
--
-- (6) חתימת הפונקציה נשמרת על DEFAULT '{}'::jsonb. create or replace שכותב
--     את הפרמטר בלי ברירת המחדל מסיר אותה, וכל קריאה בלי ארגומנט נופלת על
--     «function does not exist» — הנתיב החי קורא לרשימה גם בלי גוף.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, והפונקציה היא
-- SECURITY DEFINER — grant execute ל-anon כאן היה חושף את כל פניות האנשים
-- האמיתיים לכל מחזיק מפתח anon. הבסיס שנמדד לפני: anon=false,
-- authenticated=false, service_role=true.
--
-- 🚫 מצב טסט: פונקציית קריאה בלבד — אין בה UPDATE, אין INSERT, אין נגיעה
--    ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה, ולא יוצאת ממנה ולו
--    הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

create or replace function public.bkalot_clone_admin_cases(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit    int  := 50;
  v_offset   int  := 0;
  v_status   text;
  v_kind     text;
  v_q        text;
  v_total    bigint;
  v_rows     jsonb;
  c_statuses text[] := array['new','in_progress','sent','closed','rejected'];
  c_kinds    text[] := array['info','reminder','treatment'];
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    p := '{}'::jsonb;
  end if;

  if (p->>'limit') ~ '^[0-9]+$' then
    v_limit := least(greatest((p->>'limit')::int, 1), 200);
  end if;
  if (p->>'offset') ~ '^[0-9]+$' then
    v_offset := (p->>'offset')::int;
  end if;

  v_status := nullif(p->>'status', '');
  v_kind   := nullif(p->>'kind', '');
  v_q      := nullif(btrim(coalesce(p->>'q', '')), '');

  if v_status is not null and not (v_status = any(c_statuses)) then
    return jsonb_build_object('ok', false, 'error', 'status_unknown',
                              'allowed', to_jsonb(c_statuses));
  end if;
  if v_kind is not null and not (v_kind = any(c_kinds)) then
    return jsonb_build_object('ok', false, 'error', 'kind_unknown',
                              'allowed', to_jsonb(c_kinds));
  end if;

  -- ראה הכרעה (3): אין כאן JOIN על admin_users. הקבוצה שנמנית חייבת להישאר
  -- זהה בדיוק לזו שנמנתה לפני הפעימה.
  select count(*) into v_total
    from bkalot_clone.cases c
    left join bkalot_auto.contacts ct on ct.id = c.contact_id
   where (v_status is null or c.status = v_status)
     and (v_kind   is null or c.kind   = v_kind)
     and (v_q is null
          or c.id::text = v_q
          or ct.full_name ilike '%' || v_q || '%'
          or ct.phone     ilike '%' || v_q || '%'
          or ct.email     ilike '%' || v_q || '%');

  select coalesce(jsonb_agg(s.j order by s.ord_at desc, s.ord_id desc), '[]'::jsonb)
    into v_rows
    from (
      select c.created_at as ord_at,
             c.id         as ord_id,
             jsonb_build_object(
               'id',         c.id,
               'created_at', c.created_at,
               'kind',       c.kind,
               'status',     c.status,
               'source',     c.source,
               'situation',  c.situation,
               'topic_no',   c.topic_no,
               'note',       c.note,
               -- ראה הכרעות (1), (2) ו-(4): אותם שלושה שמות כמו ב-0077, כדי
               -- ששורה ברשימה ומסך הפנייה יאמרו את אותה עובדה מאותם שדות.
               -- שם ריק כשהזהות מלאה פירושו שהחשבון שהכריע אינו קיים עוד.
               'decided_by',      c.decided_by,
               'decided_at',      c.decided_at,
               'decided_by_name', au.full_name,
               'contact',    case when ct.id is null then null
                                  else jsonb_build_object(
                                         'id',        ct.id,
                                         'full_name', ct.full_name,
                                         'phone',     ct.phone,
                                         'email',     ct.email,
                                         'consent',   ct.consent) end,
               'rights_count',    (select count(*) from bkalot_clone.case_rights r
                                    where r.case_id = c.id),
               'chosen_count',    (select count(*) from bkalot_clone.case_rights r
                                    where r.case_id = c.id and r.chosen),
               'documents_count', (select count(*) from bkalot_clone.documents d
                                    where d.case_id = c.id)) as j
        from bkalot_clone.cases c
        left join bkalot_auto.contacts ct on ct.id = c.contact_id
        left join bkalot_clone.admin_users au on au.id = c.decided_by
       where (v_status is null or c.status = v_status)
         and (v_kind   is null or c.kind   = v_kind)
         and (v_q is null
              or c.id::text = v_q
              or ct.full_name ilike '%' || v_q || '%'
              or ct.phone     ilike '%' || v_q || '%'
              or ct.email     ilike '%' || v_q || '%')
       order by c.created_at desc, c.id desc
       limit v_limit offset v_offset
    ) s;

  return jsonb_build_object(
    'ok',     true,
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset,
    'cases',  v_rows);
end;
$function$;

-- מה שאין כאן ואינו נשכח, ומוצהר כדי שלא ייקרא כהשלמה: אין מי שמציג את
-- השלושה — apps/37-bkalot-clone/admin.html מצייר ברשימה סטטוס בלבד; זו הלבנה
-- הבאה (UI), ואחריה פריסת פורטל, אותו פיצול כמו 0077 → 1abad72 → f2001e0.
-- אין סינון «לא הוכרעה» ואין מיון לפי decided_at (הכרעה (5)). אין היסטוריה:
-- הכרעה קודמת נדרסת, וגם הרשימה תראה רק את האחרונה. «מי הפיק» על documents
-- אינו נכתב לשום מקום.
