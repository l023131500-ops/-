-- 0094 — שכפול בקלות שכבה 3
-- תו שהוקלד בתיבת החיפוש הוא תו הצבה ולא תו.
--
-- מאיפה הקו: נרשם ולא נלקח ב-0093 (heartbeat 640), וחזר מילה במילה ב-02fc51c
-- (641) וב-2346adb (642): «v_q נכנס ל-ilike בלי escape, ולכן % ו-_ במונח החיפוש
-- הם תווי הצבה ולא תווים». נתיב הטלפון נסגר שם מקצה לקצה, ולכן זה הקו הפתוח
-- היחיד שנשאר על הקורא.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. שתי פניות נקלטו דרך הכתובת החיה של
-- bkalot-clone-intake מעל HTTP עם מפתח anon, בדיוק כמו מהטופס:
--   #274 (contact 281) — «ישראל כהן»,  0501110001, axb@example.co.il
--   #275 (contact 282) — «ישראלה לוי», 0502220002, a_b@example.co.il
-- שתיהן queued=false. מיד אחריהן נקראה bkalot_clone_admin_cases:
--
--   'a_b@example.co.il'  → total 2, ids [274,275]  ⇐ הדוא״ל המדויק של אדם אחד
--   '%'                  → total 2, ids [274,275]  ⇐ תו אחד מחזיר את הכל
--   'ישרא_'              → total 2, ids [274,275]
--   'ישראל%כהן'          → total 1, ids [274]
--   'ישראל'              → total 2   (בקרה — שני השמות מתחילים כך)
--   '0501110001'         → total 1   (בקרה)
--   '050-111-0001'       → total 1, q_phone '0501110001'  (בקרה — 0093)
--   'axb@example.co.il'  → total 1   (בקרה)
--   '274'                → total 1   (בקרה — מספר פנייה)
--   'zzzz'               → total 0   (בקרה)
--
-- למה זה חשוב ולא ליטוש: השורה הראשונה היא הכשל, ולא השנייה. מנהל שמקליד את
-- הדוא״ל המדויק של הפונה שמולו — 'a_b@example.co.il', מחרוזת שהמערכת עצמה
-- קיבלה ושמרה — מקבל שתי פניות של שני אזרחים שונים. הפנייה של #274 שייכת לאדם
-- אחר עם דוא״ל אחר (axb@), והיא יושבת ברשימה כאילו נמצאה בחיפוש זהות מדויק.
-- מי שמסתכל אינו יכול לדעת שהשורה השנייה אינה שלו: הרשימה אינה אומרת לפי מה
-- נמצאה כל שורה. משם הדרך קצרה — פרטים של אזרח אחד נקראים בהקשר של אחר, או
-- שההכרעה נלחצת על הפנייה הלא נכונה.
-- ו-'%' הוא אותו כשל בקצה השני: תו יחיד שמחזיר את כל הפניות שיש להן איש קשר,
-- ונראה כמו תוצאת חיפוש ולא כמו רשימה מלאה.
--
-- מה נבנה: הימלטות של מונח החיפוש לפני ההשוואה — v_q_like — ו-escape מפורש על
-- שלוש ההשוואות. שבע הכרעות:
--
-- (1) הימלטות בקורא ועל המונח, ולא נגיעה בעמודות. הערך השמור הוא נתון, ומה
--     ששבור אינו מה שנשמר אלא שמה שהוקלד נקרא כתחביר. אין כאן עמודה, אין
--     אינדקס, אין אילוץ ואין backfill.
--
-- (2) הסדר: קודם הלוכסן ההפוך ואחר כך % ו-_. הפוך — ה-\ שהוספנו לפני % היה
--     מוכפל בתורו והמונח היה נשבר בדיוק על התו שבאנו לתקן.
--
-- (3) על שלוש ההשוואות יחד (full_name, phone, email) ובאותה מילה בדיוק, ובשתי
--     השאילתות — ה-count וה-rows. אותה הכרעה (6) של 0093: תיקון צד אחד נותן
--     total שאומר «נמצאו שתיים» מעל עמוד שמראה אחת.
--
-- (4) לא על c.id::text = v_q — זו השוואת שוויון ולא תבנית, ואין בה תווי הצבה
--     כלל. המונח נכנס לשם כפי שהוקלד, כמו קודם.
--
-- (5) לא על ענף v_phone_q של 0093 — הוא ספרות בלבד מהבנייה (regexp_replace
--     מוריד כל מה שאינו 0-9), ולכן % ו-_ אינם יכולים להגיע לשם. הימלטות שם
--     הייתה קוד שאינו יכול לרוץ.
--     ⚠️ נמדד ולא הונח: '050_110001' מחזיר 0 אחרי המיגרציה. הקו התחתון אכן
--     יורד בנרמול והמונח נקרא כטלפון שהוקלד עם מפריד — q_phone='050110001',
--     כלומר ענף 0093 רץ — אבל '050110001' אינו תת-מחרוזת של '0501110001'
--     השמור, ולכן גם הוא אינו מתאים. לפני המיגרציה השורה נמצאה דרך ה-ilike
--     הלא-ממולט בלבד.
--     ⚠️ הניסוח הראשון של ההערה הזו אמר ש-#274 ימשיך להימצא דרך הטלפון. הוא
--     נכתב לפני המדידה והתברר כשגוי, ותוקן כאן: הענף רץ ואינו מתאים.
--
-- (6) escape '\' מפורש ולא הסתמכות על ברירת המחדל. ברירת המחדל של LIKE היא
--     אמנם לוכסן הפוך, אבל משמעות המונח אינה אמורה להיות תלויה בהגדרת סשן.
--
-- (7) אין מפתח חדש בתשובה. ב-0093 היה מה לומר למסך — לפי איזה מספר חופש
--     בפועל — וכאן אין: המונח פשוט מתחיל להיות מה שהוא. מסך שלא השתנה מציג
--     תוצאה נכונה.
--
-- מוגן: אין נגיעה ב-08/09, ב-bkalut-app/bkalot-admin/zr_*/NEDARIM3873, ולא
-- בסכמות csj/csj_src/igud. bkalot_clone_intake, _admin_case, _admin_set_status,
-- _admin_document, _render, _queue, _dispatch לא נגעו; apps/37 לא נגעה;
-- bkalot-clone-admin נשארת v8 ו-bkalot-clone-intake v1.

create or replace function public.bkalot_clone_admin_cases(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limit    int  := 50;
  v_offset   int  := 0;
  v_status   text;
  v_kind     text;
  v_q        text;
  -- 0094: מונח החיפוש אחרי הימלטות, לשלוש השוואות ה-ilike בלבד. ראה (1)–(6).
  v_q_like   text;
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

  -- 0094 — הכרעות (1) ו-(2): הלוכסן ההפוך ראשון, ואחריו שני תווי ההצבה. מכאן
  -- ואילך המונח שנשלח אל ilike מתאר את עצמו ותו לא.
  if v_q is not null then
    v_q_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  end if;

  -- 0093 — הכרעה (2): אותן שלוש שורות של bkalot_clone_intake, מילה במילה.
  -- הכותב מנרמל בכתיבה; כאן אותו כלל בדיוק נשאל בקריאה.
  -- 0094 הכרעה (5): הנרמול רץ על v_q ולא על v_q_like — הוא מוריד כל תו שאינו
  -- ספרה, ולכן הלוכסנים שהוספנו היו יורדים בו ממילא; קריאה מהמקור היא הבהירה.
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
  -- 0094 הכרעה (3): ומאותו נימוק בדיוק, ההימלטות נכנסת לשתיהן באותה מילה.
  select count(*) into v_total
    from bkalot_clone.cases c
    left join bkalot_auto.contacts ct on ct.id = c.contact_id
   where (v_status is null or c.status = v_status)
     and (v_kind   is null or c.kind   = v_kind)
     and (v_decided is null
          or (v_decided = 'no'  and c.decided_at is null)
          or (v_decided = 'yes' and c.decided_at is not null))
     and (v_q is null
          -- 0094 הכרעה (4): שוויון ולא תבנית — המונח כפי שהוקלד.
          or c.id::text = v_q
          or ct.full_name ilike '%' || v_q_like || '%' escape '\'
          or ct.phone     ilike '%' || v_q_like || '%' escape '\'
          or ct.email     ilike '%' || v_q_like || '%' escape '\'
          -- 0094 הכרעה (5): ספרות בלבד מהבנייה, ולכן בלי הימלטות.
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
              -- 0094 הכרעה (4): שוויון ולא תבנית — המונח כפי שהוקלד.
              or c.id::text = v_q
              or ct.full_name ilike '%' || v_q_like || '%' escape '\'
              or ct.phone     ilike '%' || v_q_like || '%' escape '\'
              or ct.email     ilike '%' || v_q_like || '%' escape '\'
              -- 0094 הכרעה (5): ספרות בלבד מהבנייה, ולכן בלי הימלטות.
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
    -- 0094 הכרעה (7): אין כאן מפתח חדש — המונח פשוט מתחיל להיות מה שהוא.
    'q_phone', v_phone_q,
    'cases',   v_rows);
end;
$function$;
