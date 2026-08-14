-- 0081 — שכפול בקלות שכבה 3
-- רשימת העבודה אינה יודעת להראות רק את מה שאיש עוד לא הכריע.
--
-- מי כתב את הקו הזה: 0078 עצמה, בהכרעה (5) ובסעיף «מה שאין כאן ואינו נשכח»,
-- מילה במילה: «אין סינון «לא הוכרעה» ואין מיון לפי decided_at». heartbeat 602
-- חזר עליו בסוף שרשרת «שינוי סטטוס» כקו שממשיך. כאן נלקחת מחצית הלבנה הזו —
-- הסינון ורק הוא. המיון לפי decided_at אינו נלקח כאן ומוצהר למטה: הוא מחליף את
-- סדר ברירת המחדל של המסך שממנו מתחילים, וזו הכרעת מוצר נפרדת ולא תוספת.
--
-- מה היה: 0076 בנתה את decided_at, 0077 החזירה אותו בפנייה הבודדת, 0078 החזירה
-- אותו בכל שורה ברשימה ו-1abad72 מצייר אותו. כלומר הנתון קיים, מדויק, ומצויר על
-- המסך — ואי אפשר לבקש לפיו. מנהל שרוצה לדעת במה לטפל קורא שורה-שורה ומחפש
-- בעיניים אילו שורות אין בהן «הוכרעה»; ברשימה מדפדפת זה אומר שהוא עובר על
-- עמודים שלמים כדי למצוא את מה שהמסך כבר יודע.
--
-- למה decided_at ולא decided_by, וזו ההכרעה שקובעת מה השאילתה בכלל אומרת:
-- ההערה על העמודה, שנמדדה על הסכמה החיה ולא הונחה, אומרת ש-decided_at null
-- פירושו «לא הייתה הכרעת אדם — כולל פנייה שהטריגר documents_advance_case קידם
-- ל-in_progress», בעוד ש-decided_by null הוא גם «אדם הכריע ואין לנו את זהותו»
-- (0076 הכרעה 3). «לא הוכרעה» הוא בדיוק הראשון. סינון על decided_by היה מחזיר
-- לרשימת «לא נלקחו» גם פניות שאדם כן לקח דרך שער שלא העביר זהות — כלומר שולח
-- שני אנשים לאותה פנייה, בדיוק הנזק ש-0078 נכתבה כדי למנוע.
--
-- מה נבנה כאן: מפתח קלט אחד, decided, בשני ערכים — 'no' (לא הוכרעה) ו-'yes'
-- (הוכרעה). היעדרו הוא ההתנהגות של היום בדיוק. אין שינוי סכמה, אין כתיבה, אין
-- נגיעה ב-set_status, ב-admin_case, ב-edge או ב-apps/37. תוספת קריאה בלבד.
--
-- ארבע הכרעות:
--
-- (1) התנאי נוסף לשתי השאילתות — count(*) ותת-שאילתת השורות — ובאותו נוסח
--     מילה במילה. זה ההפך מהכרעה (3) של 0078: שם ה-JOIN נוסף לאחת בלבד מפני
--     שהקבוצה הנמנית חייבת הייתה להישאר זהה, וכאן הקבוצה עצמה היא מה שהשתנה.
--     סינון בשורות בלבד היה מחזיר total גדול מהמוצג, והמסך היה מציע «הבא»
--     לעמוד שאין בו דבר; סינון ב-count בלבד היה עושה את ההפך. שתי השאילתות
--     אינן חולקות קוד, ולכן זו הכרעה ולא שכפול.
--
-- (2) ערך שאינו 'yes'/'no' מוחזר כשגיאה מפורשת, decided_unknown עם allowed,
--     ולא נבלע כ-null. זה בדיוק מה ש-status_unknown ו-kind_unknown עושים שתי
--     שורות מעל, ומי שישלח boolean אמיתי יקבל 'true' מ->> ויפול כאן במפורש
--     במקום לקבל בשקט את כל הרשימה — כלומר תשובה שנראית נכונה ואינה מסוננת.
--     nullif(...,'') לפניו: שדה בחירה ריק במסך הוא «בלי סינון» ולא ערך פסול.
--
-- (3) 'yes'/'no' ולא true/false ולא 'undecided'. שלושת הסינונים במסך הזה הם
--     select עם ערך ריק לברירת מחדל ומחרוזת לכל שאר האפשרויות; מפתח שמתנהג
--     אחרת משני שכניו הוא בדיוק הפער שאין לו סימפטום. השם decided ולא
--     undecided כדי ששני הכיוונים יישאלו מאותו מפתח — «מי הכריע» הוא שאלת
--     ביקורת אמיתית ולא הופכי מלאכותי.
--
-- (4) חתימת הפונקציה נשמרת על DEFAULT '{}'::jsonb — הכרעה (6) של 0078. הנתיב
--     החי קורא לרשימה גם בלי גוף, ו-create or replace שכותב את הפרמטר בלי
--     ברירת המחדל מפיל כל קריאה כזו על «function does not exist».
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
  v_decided  text;
  v_total    bigint;
  v_rows     jsonb;
  c_statuses text[] := array['new','in_progress','sent','closed','rejected'];
  c_kinds    text[] := array['info','reminder','treatment'];
  c_decided  text[] := array['yes','no'];
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

  v_status  := nullif(p->>'status', '');
  v_kind    := nullif(p->>'kind', '');
  v_q       := nullif(btrim(coalesce(p->>'q', '')), '');
  -- ראה הכרעות (2) ו-(3): ריק = בלי סינון, וכל ערך אחר נופל במפורש למטה.
  v_decided := nullif(p->>'decided', '');

  if v_status is not null and not (v_status = any(c_statuses)) then
    return jsonb_build_object('ok', false, 'error', 'status_unknown',
                              'allowed', to_jsonb(c_statuses));
  end if;
  if v_kind is not null and not (v_kind = any(c_kinds)) then
    return jsonb_build_object('ok', false, 'error', 'kind_unknown',
                              'allowed', to_jsonb(c_kinds));
  end if;
  if v_decided is not null and not (v_decided = any(c_decided)) then
    return jsonb_build_object('ok', false, 'error', 'decided_unknown',
                              'allowed', to_jsonb(c_decided));
  end if;

  -- ראה הכרעה (1): התנאי על decided_at נוסף כאן ובתת-השאילתה באותו נוסח בדיוק.
  -- הקבוצה שנמנית היא הקבוצה שמוצגת, אחרת הדפדוף מציע עמוד שאין בו דבר.
  select count(*) into v_total
    from bkalot_clone.cases c
    left join bkalot_auto.contacts ct on ct.id = c.contact_id
   where (v_status is null or c.status = v_status)
     and (v_kind   is null or c.kind   = v_kind)
     and (v_decided is null
          or (v_decided = 'no'  and c.decided_at is null)
          or (v_decided = 'yes' and c.decided_at is not null))
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
               -- ראה הכרעות (1), (2) ו-(4) של 0078: אותם שלושה שמות כמו ב-0077,
               -- כדי ששורה ברשימה ומסך הפנייה יאמרו את אותה עובדה מאותם שדות.
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
         and (v_decided is null
              or (v_decided = 'no'  and c.decided_at is null)
              or (v_decided = 'yes' and c.decided_at is not null))
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

-- מה שאין כאן ואינו נשכח, ומוצהר כדי שלא ייקרא כהשלמה: אין מי ששולח את המפתח —
-- apps/37-bkalot-clone/admin.html מרכיב את גוף הבקשה משלושה שדות בלבד (status,
-- kind, q); זו הלבנה הבאה (UI), ואחריה פריסת פורטל, אותו פיצול כמו
-- 0078 → 1abad72 → f2001e0. אין מיון לפי decided_at (מחצית הלבנה שלא נלקחה
-- כאן). אין היסטוריה: הכרעה קודמת נדרסת, וגם הסינון יראה רק את האחרונה.
-- «מי הפיק» על documents אינו נכתב לשום מקום.
