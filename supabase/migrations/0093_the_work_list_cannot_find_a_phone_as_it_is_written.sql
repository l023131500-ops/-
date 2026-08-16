-- 0093 — שכפול בקלות שכבה 3
-- רשימת העבודה אינה מוצאת טלפון כפי שהוא כתוב.
--
-- מאיפה הקו: נתיב הנימוק וההכרעה נסגר מקצה לקצה ב-c806151, ובסופו לא נשאר קו
-- פתוח משלו. הקו הזה נמצא במדידה ולא ברשימה: השדה q של
-- bkalot_clone_admin_cases משווה את מה שהוקלד אל ct.phone ב-ilike ישיר, בעוד
-- bkalot_clone_intake שומרת את הטלפון אחרי נרמול. הכותב מנרמל, הקורא לא —
-- ולכן אותה מחרוזת בדיוק שהמערכת קיבלה מהאזרח אינה מוצאת אותו אצל המנהל.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. שתי פניות נקלטו דרך הכתובת החיה של
-- bkalot-clone-intake מעל HTTP עם מפתח anon, בדיוק כמו מהטופס: #270 עם
-- phone='054-812-3491' ו-#271 עם phone='+972 52 771 4408'. הקליטה קיבלה את
-- שתיהן, נרמלה, והחזירה phone='0548123491' ו-phone='0527714408'. מיד אחריהן
-- נקראה bkalot_clone_admin_cases על תשעה מונחי חיפוש:
--
--   '0548123491'        → total 1  (הצורה השמורה)
--   '054-812-3491'      → total 0  ⇐ אותה מחרוזת בדיוק שהקליטה קיבלה
--   '054 812 3491'      → total 0
--   '0527714408'        → total 1  (הצורה השמורה)
--   '+972 52 771 4408'  → total 0  ⇐ אותה מחרוזת בדיוק שהקליטה קיבלה
--   '972527714408'      → total 0
--   '00972527714408'    → total 0
--   '270'               → total 1  (מספר פנייה — לא נגעה)
--
-- ארבע מהצורות שהקליטה מקבלת ומנרמלת מחזירות אפס בקורא, והפנייה יושבת שם.
--
-- למה זה חשוב ולא ליטוש: הטלפון הוא מפתח הזהות של הפונה — כך כתוב בקליטה עצמה
-- ובנוסח השגיאה שלה — והוא הדבר היחיד שהמנהל מחזיק ביד כשאזרח מתקשר. התווית
-- במסך (apps/37-bkalot-clone/admin.html) מבטיחה במפורש «חיפוש — שם, טלפון,
-- דוא״ל או מספר פנייה». חיפוש שמחזיר אפס אינו נראה כמו תקלה אלא כמו תשובה:
-- «אין פנייה כזו». המנהל אינו יודע שהוא הקליד נכון, והפנייה קיימת — ולכן
-- ייפתח לאותו אדם רישום כפול, או שייאמר לו שלא פנה מעולם.
--
-- מה נבנה כאן: פונקציה אחת, bkalot_clone_admin_cases, ובתוכה נרמול של מונח
-- החיפוש לצורך ההשוואה לטלפון בלבד. אין עמודה חדשה, אין אינדקס, אין backfill,
-- אין טבלה ואין אילוץ; אין נגיעה ב-intake, ב-admin_case, ב-set_status,
-- ב-admin_document, ב-render, ב-queue, ב-dispatch, ב-edge (נשארת v8) ולא
-- ב-apps/37.
--
-- שבע הכרעות:
--
-- (1) הנרמול בקורא ולא עמודה שנייה מנורמלת בטבלה. הטלפון כבר שמור מנורמל —
--     הקליטה עושה זאת בכתיבה מאז שנבנתה. מה שחסר אינו צורה שנייה של התשובה
--     אלא שהשאלה תישאל באותה צורה שבה נשמרה התשובה. עמודה שנייה הייתה מחייבת
--     backfill ומחייבת כל כותב עתידי לזכור לתחזק אותה, בשביל נתון שכבר קיים.
--
-- (2) אותן שלוש שורות של הקליטה, מילה במילה: הסרת כל מה שאינו ספרה, ואז
--     00972 → 0 ואז 972 → 0. לא כלל רחב יותר ולא «חיפוש חכם». קורא שמנרמל
--     אחרת מהכותב מוצא שורות שהכותב לא התכוון להן, ואז שני הצדדים חולקים על
--     מהו אותו טלפון.
--
-- (3) הנרמול חל על ההשוואה לטלפון בלבד. שם, דוא״ל ומספר פנייה ממשיכים
--     להשוות את המונח כפי שהוקלד — '054-812' אינו אמור להתחיל להתאים לשם.
--
-- (4) הענף החדש נכנס רק כשהנרמול באמת שינה את המונח (v_digits <> v_q). מונח
--     שהוא כבר ספרות בלבד עובר בדיוק בנתיב שהיה לו קודם, ולכן אין ולו חיפוש
--     קיים אחד שתוצאתו יכולה להשתנות בגלל המיגרציה הזו. זו אי-נסיגה מהבנייה
--     ולא מהמדידה.
--
-- (5) לפחות ארבע ספרות. הקטע הקצר ביותר שמנהל מחפש לפיו הוא ארבע הספרות
--     האחרונות של הטלפון. מתחת לזה ספרה בודדת שנקלעה לתוך חיפוש שם — «דירה 3»
--     — הייתה מציפה את הרשימה בכל פנייה שיש בטלפון שלה 3.
--
-- (6) אותו תנאי בדיוק בשתי השאילתות. ה-where של ה-count וה-where של השורות
--     הם שני עותקים של כלל אחד; תיקון אחד מהם נותן total שאינו מסכים עם העמוד
--     שמתחתיו — מספר שאומר «נמצאה פנייה» מעל רשימה ריקה, או להפך.
--
-- (7) like ולא ilike בענף החדש: מה שמושווה שם הוא ספרות, ואין להן אותיות
--     גדולות וקטנות. ilike שם היה מבטיח בדיקה שאינה נעשית.
--
-- מה שהתשובה אומרת מעכשיו: מפתח q_phone — המספר שלפיו חופש בפועל, או null.
-- זה מה שמאפשר למסך (לבנה נפרדת) לומר «חיפשנו לפי 0548123491» במקום להשאיר
-- את המנהל לנחש למה נמצאה שורה שאינה נראית כמו מה שהקליד.
--
-- 🚫 מצב טסט: הפונקציה הזו היא קריאה בלבד — אין בה INSERT, אין UPDATE ואין
--    DELETE, אין נגיעה ב-outbound_queue וב-delivery_log ואין ולו קריאה יוצאת
--    אחת. create or replace שומר את ה-ACL הקיים ואינו נותן הרשאה מחדש.

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
  -- 0093: מונח החיפוש אחרי נרמול, לצורך ההשוואה לטלפון בלבד. ראה הכרעות (1)–(5).
  v_digits   text;
  v_phone_q  text;
  v_decided  text;
  v_sort     text;
  v_total    bigint;
  v_rows     jsonb;
  c_statuses text[] := array['new','in_progress','sent','closed','rejected'];
  c_kinds    text[] := array['info','reminder','treatment'];
  c_decided  text[] := array['yes','no'];
  c_sorts    text[] := array['created_at','decided_at'];
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
  -- ראה הכרעות (2) ו-(3) של 0081: ריק = בלי סינון, וכל ערך אחר נופל במפורש למטה.
  v_decided := nullif(p->>'decided', '');
  -- ראה הכרעה (4) של 0082: ריק = סדר ברירת המחדל, וכל ערך שאינו מוכר נופל במפורש.
  v_sort    := nullif(p->>'sort', '');

  -- 0093 — הכרעה (2): אותן שלוש שורות של bkalot_clone_intake, מילה במילה.
  -- הכותב מנרמל בכתיבה; כאן אותו כלל בדיוק נשאל בקריאה.
  if v_q is not null then
    v_digits := regexp_replace(v_q, '[^0-9]', '', 'g');
    if left(v_digits, 5) = '00972' then
      v_digits := '0' || substr(v_digits, 6);
    elsif left(v_digits, 3) = '972' then
      v_digits := '0' || substr(v_digits, 4);
    end if;
    -- הכרעה (4): רק כשהנרמול באמת שינה משהו — מונח שהוא כבר ספרות בלבד עובר
    -- בנתיב שהיה לו קודם ותוצאתו אינה יכולה להשתנות.
    -- הכרעה (5): לפחות ארבע ספרות, כדי שספרה בתוך חיפוש שם לא תציף את הרשימה.
    if v_digits <> '' and v_digits <> v_q and length(v_digits) >= 4 then
      v_phone_q := v_digits;
    end if;
  end if;

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
  if v_sort is not null and not (v_sort = any(c_sorts)) then
    return jsonb_build_object('ok', false, 'error', 'sort_unknown',
                              'allowed', to_jsonb(c_sorts));
  end if;

  -- ראה הכרעה (5) של 0089: שאילתת ה-count לא נגעה, כפי שלא נגעה ב-0086. «כמה
  -- ידיים» אינו סינון — הוא מתווסף לשורה שכבר נמנתה, ואינו רשאי לשנות את
  -- הקבוצה הנמנית ולו בשורה אחת.
  -- 0093 הכרעה (6): הענף החדש הוא כן סינון, ולכן הוא נכנס לשתי השאילתות
  -- באותה מילה בדיוק — אחרת total אומר דבר אחד והעמוד שמתחתיו דבר אחר.
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
          or ct.email     ilike '%' || v_q || '%'
          or (v_phone_q is not null and ct.phone like '%' || v_phone_q || '%'));

  -- ראה הכרעות (1), (2) ו-(3) של 0082: ord_at הוא מפתח המיון עצמו, ולכן חיתוך
  -- העמוד (ה-order by הפנימי) ומסירתו (ה-order by שבתוך jsonb_agg) קוראים מאותו
  -- ביטוי אחד ואינם יכולים להיפרד.
  select coalesce(jsonb_agg(s.j order by s.ord_at desc nulls last, s.ord_id desc),
                  '[]'::jsonb)
    into v_rows
    from (
      select case when v_sort = 'decided_at' then c.decided_at
                  else c.created_at end as ord_at,
             c.id                       as ord_id,
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
               -- שלושת אלה הם ההכרעה האחרונה בלבד — כמה היו לפניה יושב בשני
               -- המונים שלמטה, והכרעה (1) של 0089 היא ששני אלה לא יתערבבו.
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
                                    where d.case_id = c.id),
               -- ראה הכרעות (1)–(4): last_ ולא produced_by סתם — השורה היא פנייה
               -- ולא מסמך, ושני השדות מדברים על המסמך האחרון שלה. pau ולא au:
               -- au הוא מי שהכריע על הפנייה, וזה אדם אחר. שם ריק כשהזהות מלאה
               -- פירושו שהחשבון שהפיק אינו קיים עוד; שניהם null פירושו או שאין
               -- מסמך כלל או הפקה בלי זהות בשער (מצב v7), ו-documents_count
               -- שלמעלה מפריד בין השניים.
               'last_produced_by',      ld.produced_by,
               'last_produced_by_name', pau.full_name,
               -- ראה הכרעות (1)–(5) של 0089: כמה מעברים היו על הפנייה וכמה אנשים
               -- שונים עשו אותם. מעברים ולא לחיצות (האילוץ
               -- case_status_log_is_a_change), ובלי שם ובלי צירוף ל-admin_users —
               -- המספר שורד את מחיקת החשבון. 1 ו-0 יחד פירושו מעבר שנכתב בלי
               -- זהות; 0 ו-0 פירושו שאיש לא הכריע מהמסך, ושני אלה אינם אותו דבר.
               'status_changes_count',  hl.changes,
               'status_deciders_count', hl.deciders) as j
        from bkalot_clone.cases c
        left join bkalot_auto.contacts ct on ct.id = c.contact_id
        left join bkalot_clone.admin_users au on au.id = c.decided_by
        -- ראה הכרעות (2) ו-(3): שורה אחת בסדר מלא, ומשם שני השדות — ולא שתי
        -- תת-שאילתות שהיו רשאיות להצביע על שני מסמכים שונים.
        left join lateral (
          select d.produced_by
            from bkalot_clone.documents d
           where d.case_id = c.id
           order by d.created_at desc, d.id desc
           limit 1
        ) ld on true
        left join bkalot_clone.admin_users pau on pau.id = ld.produced_by
        -- ראה הכרעה (2) של 0089: קריאה אחת של היומן ושני מספרים ממנה, ולא שתי
        -- תת-שאילתות שהיו רשאיות להיפרד. אגרגט בלי group by מחזיר תמיד שורה אחת,
        -- ולכן 0/0 לפנייה בלי יומן מגיע מהספירה עצמה ולא מ-coalesce.
        left join lateral (
          select count(*)::bigint                as changes,
                 count(distinct h.admin_id)::bigint as deciders
            from bkalot_clone.case_status_log h
           where h.case_id = c.id
        ) hl on true
       where (v_status is null or c.status = v_status)
         and (v_kind   is null or c.kind   = v_kind)
         and (v_decided is null
              or (v_decided = 'no'  and c.decided_at is null)
              or (v_decided = 'yes' and c.decided_at is not null))
         and (v_q is null
              or c.id::text = v_q
              or ct.full_name ilike '%' || v_q || '%'
              or ct.phone     ilike '%' || v_q || '%'
              or ct.email     ilike '%' || v_q || '%'
              or (v_phone_q is not null and ct.phone like '%' || v_phone_q || '%'))
       order by case when v_sort = 'decided_at' then c.decided_at
                     else c.created_at end desc nulls last,
                c.id desc
       limit v_limit offset v_offset
    ) s;

  return jsonb_build_object(
    'ok',      true,
    'total',   v_total,
    'limit',   v_limit,
    'offset',  v_offset,
    -- 0093: המספר שלפיו חופש בפועל, או null כשהמונח לא נורמל. המסך אינו נדרש
    -- לנחש למה נמצאה שורה שאינה נראית כמו מה שהוקלד.
    'q_phone', v_phone_q,
    'cases',   v_rows);
end;
$function$;
