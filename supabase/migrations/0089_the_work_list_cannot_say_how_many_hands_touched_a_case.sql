-- 0089 — שכפול בקלות שכבה 3
-- רשימת העבודה אינה יודעת לומר כמה ידיים עברו על הפנייה.
--
-- מי כתב את הקו הזה: c3b7c45 (heartbeat 627), בסופה, מילה במילה: «רשימת העבודה
-- (bkalot_clone_admin_cases) אינה יודעת על היומן, ולכן מנהל שסורק את הרשימה בלי
-- לפתוח פנייה אינו רואה כמה ידיים עברו עליה». לפניו כתבו אותו 8a577bc בסופה
-- ו-86cf183 בסופה, באותן מילים ובאותו מקום. כאן נלקח bkalot_clone_admin_cases
-- ורק היא — אותו פיצול בדיוק שבו 0085 לקחה את מסך הפנייה ו-0086 את הרשימה.
--
-- מה היה: 0087 בנתה את bkalot_clone.case_status_log ונתנה ל-set_status לכתוב
-- אליו שורה בכל מעבר, 0088 החזירה את הרצף במסך הפנייה, 8a577bc ציירה אותו
-- ו-c3b7c45 פרסה. ארבע לבנים, ובכל זאת: המסך שבו מנהל מתחיל את היום — רשימת
-- העבודה — שותק. c.decided_by ו-c.decided_at שכבר בשורה אומרים מי הכריע אחרון
-- ומתי, ולא כמה הכרעות היו לפניו; פנייה שעברה בין שלושה אנשים ופנייה שאדם אחד
-- נגע בה פעם אחת נראות בשורה זהות לחלוטין. כדי לדעת מה ההפרש נדרש היום לפתוח כל
-- פנייה בנפרד, וזה בדיוק ההבדל בין רשימה שאפשר לסרוק לרשימה שאפשר רק לספור.
--
-- מה נבנה כאן: שני שדות בכל שורת פנייה — status_changes_count ו-
-- status_deciders_count — מתוך היומן של אותה פנייה. אין שינוי סכמה, אין כתיבה,
-- אין נגיעה ב-set_status, ב-render, ב-admin_case, ב-admin_document, ב-edge ולא
-- ב-apps/37. תוספת קריאה בלבד.
--
-- חמש הכרעות:
--
-- (1) שני השמות נושאים את התחילית status_, ולא deciders_count ו-changes_count
--     סתם. בשורה כבר יושבים decided_by, decided_at ו-decided_by_name — ההכרעה
--     האחרונה — ו-deciders_count לצדם היה נקרא כמונה שלהם. התחילית קושרת את שני
--     המספרים ליומן שממנו הם באים, ואומרת על מה הם מדברים: status ורק הוא. זו
--     הכרעה (1) של 0088 מילה במילה — ל-kind, ל-topic_no ול-situation אין
--     היסטוריה, ושם רחב היה מבטיח אותה.
--
-- (2) LEFT JOIN LATERAL אחד, ולא שתי תת-שאילתות סקלריות. שתיים — אחת לספירת
--     המעברים ואחת לספירת המכריעים — היו שתי קריאות של אותו יומן, וזו בדיוק
--     התקלה שהכרעה (3) של 0086 נבנתה כדי למנוע: תנאי שישתנה באחת ולא בשנייה היה
--     נותן «שלושה מעברים, ידיים אפס» בלי שגיאה ובלי שדה שנראה שגוי. קריאה אחת
--     פירושה ששני המספרים מדברים על אותה קבוצת שורות מעצם הבנייה.
--
-- (3) status_deciders_count הוא count(distinct h.admin_id), כלומר אינו סופר
--     מעבר שנכתב בלי זהות. זו ההכרעה שקנתה מדידה: מעבר כזה נספר ב-
--     status_changes_count ולא ב-status_deciders_count, ולכן «1 מעבר, 0 ידיים»
--     הוא מצב מדיד ומוצהר ולא סתירה. שתי שורות בלי זהות אינן ניתנות להבחנה זו
--     מזו — לספור אותן כיד אחת או כשתיים היה המצאה בשני הכיוונים, ואפס הוא
--     התשובה הכנה; status_changes_count שלצדו הוא שמפריד בין «איש לא נגע» לבין
--     «מישהו נגע ואיננו יודעים מי», בדיוק כפי ש-documents_count מפריד בין שני
--     ה-null של 0086 (הכרעה 4 שלה).
--
-- (4) אין כאן LEFT JOIN על admin_users ואין שם. המספר אינו פותר זהות לשם, ולכן
--     הוא שורד את מחיקת החשבון: הכרעה (2) של 0087 השאירה את admin_id בלי FK
--     דווקא כדי שהראיה תישאר במקומה, ו-3 שהופך ל-2 מפני שעובד התפטר היה מוחק
--     הכרעה מההיסטוריה בקריאה. נמדד ולא הונח. מי שרוצה שמות פותח את הפנייה
--     ומקבל את status_history של 0088 — הרשימה אומרת כמה, והמסך אומר מי.
--
-- (5) אין status_last_change_at ואין status_first_change_at, ואינם צריכים
--     להיות: הכרעה (6) של 0087 היא ש-at של השורה האחרונה ביומן שווה בדיוק
--     ל-cases.decided_at — אותו v_now — ו-decided_at כבר יושב בשורה מיום שנבנתה.
--     שדה נגזר הוא שם חדש למה שכבר ביד הלקוח, וזו הכרעה (4) של 0086 בלי סטייה.
--     כמו כן לא נוסף מפתח קלט: אין סינון «מה שעבר יותר מיד אחת», אין מיון לפי
--     מספר מעברים, ואין שינוי ב-status/kind/q/decided/sort. שאילתת ה-count זהה
--     בייט-בייט, השערים זהים, סדר הרשימה זהה — הפעימה ניתנת לביטול בלי לגעת בדבר.
--
-- נמדד ולא הונח: האילוץ case_status_log_is_a_change אוסר שורה שבה המקור והיעד
-- זהים (0087 הכרעה 5), ולכן לחיצה חוזרת על אותו סטטוס מחזירה changed=false
-- ואינה כותבת דבר. status_changes_count סופר מעברים ולא לחיצות, וזה נמדד בפנייה
-- שנלחצה פעמיים ומחזירה 1. case_status_log_case_at_idx על (case_id, at, id) הוא
-- האינדקס שה-lateral קורא דרכו.
--
-- ההרשאות אינן ניתנות מחדש בכוונה: create or replace שומר ACL, והפונקציה היא
-- SECURITY DEFINER — grant execute ל-anon כאן היה חושף את כל פניות האנשים
-- האמיתיים לכל מחזיק מפתח anon. הבסיס שנמדד לפני: anon=false,
-- authenticated=false, service_role=true. bkalot_clone.case_status_log עצמה
-- נותנת ל-postgres בלבד ו-RLS מופעל עליה עם אפס policies (0087 הכרעה 7), ולכן
-- הדרך היחידה לקרוא אותה עוברת בפונקציות האלה.
--
-- 🚫 מצב טסט: פונקציית קריאה בלבד — אין בה UPDATE, אין INSERT, אין נגיעה
--    ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה, ולא יוצאת ממנה ולו
--    הודעה אחת.
--
-- 🔒 מוגן: 08, 09, bkalut-app, bkalot-admin, zr_*, NEDARIM3873 וסכמות
--    csj/csj_src/igud לא נגעו ואינן מוזכרות כאן.

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

  -- ראה הכרעה (5): שאילתת ה-count לא נגעה, כפי שלא נגעה ב-0086. «כמה ידיים» אינו
  -- סינון — הוא מתווסף לשורה שכבר נמנתה, ואינו רשאי לשנות את הקבוצה הנמנית ולו
  -- בשורה אחת.
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
              or ct.email     ilike '%' || v_q || '%')
       order by case when v_sort = 'decided_at' then c.decided_at
                     else c.created_at end desc nulls last,
                c.id desc
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

-- מה שאין כאן ואינו נשכח, ומוצהר כדי שלא ייקרא כהשלמה: אין מי שמציג את שני
-- המונים — apps/37-bkalot-clone/admin.html מצייר את שורת הרשימה בלי «מעברים»;
-- זו הלבנה הבאה (UI), ואחריה פריסת פורטל, אותו פיצול כמו 0086 → 4b7293d →
-- 839386a. אין סינון ואין מיון לפי מספר מעברים (הכרעה 5). אין שמות ברשימה
-- (הכרעה 4) — מי שרוצה אותם פותח את הפנייה. אין status_last_change_at (הכרעה 5).
-- אין backfill ולא יהיה: לפנייה שהוכרעה לפני שהיומן קם המונה יחזיר 0, וזה נכון —
-- אין ליומן שלה שורות, ומספר שהיה נוצר ממנה היה טוען מעברים שאיש לא מדד.
