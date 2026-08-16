-- 0096 — שכפול בקלות שכבה 3
-- רשימת העבודה אינה מוצאת פנייה לפי הנימוק שנכתב בה.
--
-- מאיפה הקו: נרשם ולא נלקח, וחזר מילה במילה בשש לבנים רצופות (heartbeats
-- 645–650), ברשימת «מה שלא נבנה»: «אין חיפוש בטקסט הנימוקים». נתיב הנימוק
-- עצמו נסגר מקצה לקצה — היומן (0090), מסך הפנייה (0091), חובת נימוק על דחייה
-- (0095) והפריסה (2840dd7) — ולכן הטקסט הזה קיים בייצור, נכתב בפועל, ואין דרך
-- למצוא אותו. זה הקו הפתוח שכבר נצבר עליו הכי הרבה.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. שתי פניות נקלטו דרך
-- public.bkalot_clone_intake, ומיד אחריהן שתי הכרעות עם נימוק ב-set_status
-- (מנהל 4):
--   #367 (contact 374) — «אברהם ישראלי», 0501230011 — rejected, log 79,
--        נימוק: «המסמכים שצורפו שייכים לשנת המס הקודמת»
--   #368 (contact 375) — «מרים כהן»,      0502230022 — closed,   log 80,
--        נימוק: «הטופס נשלח בדואר רשום על ידי הפונה»
-- ואז נקראה bkalot_clone_admin_cases:
--
--   'המס הקודמת'  → total 0   ⇐ הכשל
--   'בדואר רשום'  → total 0   ⇐ הכשל
--   'שצורפו'      → total 0   ⇐ הכשל
--   'כהן'         → total 1, ids [368]  (בקרה — שם)
--   '0501230011'  → total 1, ids [367]  (בקרה — טלפון)
--   '367'         → total 1, ids [367]  (בקרה — מספר פנייה)
--   'אסמכתא'      → total 0             (בקרה — טקסט ב-cases.note)
--   '%'           → total 0             (בקרה — 0094)
--   'zzzz'        → total 0             (בקרה)
--
-- למה זה חשוב ולא ליטוש: הנימוק הוא הטקסט היחיד במערכת שנכתב בידי מנהל ולא
-- בידי הפונה, והוא נכתב בדיוק כדי להיקרא שוב — «למה נדחתה הפנייה הזו». 0095
-- הפכה אותו לחובה על דחייה, כלומר מעכשיו יש מאגר של סירובים מנומקים שגדל בכל
-- הכרעה. מנהל ששואל «אילו פניות נדחו בגלל שנת מס» — שאלה שהיא בדיוק הסיבה
-- שהשדה נכתב — חייב לפתוח פנייה־פנייה, ולכן בפועל אף אחד לא ישאל. חמור מזה:
-- אזרח שחוזר וטוען שנדחה בטעות, ואף אחד לא זוכר את מספר הפנייה שלו — הנימוק
-- הוא הראיה שיש, והיא בלתי־ניתנת־לאיתור.
--
-- מה נבנה: ענף רביעי בתנאי החיפוש — קיום שורת יומן שהנימוק שלה מכיל את המונח.
-- שבע הכרעות:
--
-- (1) ב-q הקיים ולא בפרמטר חדש. תיבת חיפוש אחת, ציפייה אחת: מי שמקליד מילה
--     מבקש למצוא את הפנייה שהמילה הזו נמצאת בה, ואינו אמור לדעת מראש באיזה
--     שדה היא יושבת. פרמטר שני היה מחייב את המקליד לבחור נכון לפני שהוא יודע.
--
-- (2) case_status_log.note בלבד, ולא cases.note. שני אלה אינם אותו דבר: השני
--     הוא טקסט שהפונה כתב בטופס, והראשון הוא מה שהמנהל הכריע. הקו שנרשם שש
--     פעמים הוא «טקסט הנימוקים» — מה ש-0090 בנתה — וזה מה שנלקח. הרחבה אל
--     cases.note היא לבנה משלה, ולכן 'אסמכתא' נמדד 0 גם אחרי, וזה נאמר
--     ולא נבלע.
--
-- (3) exists ולא join. לפנייה יכולות להיות כמה שורות יומן, ו-join היה מכפיל
--     אותה בכל שורה שמתאימה — ה-count היה סופר אותה פעמיים וה-jsonb_agg היה
--     מחזיר אותה פעמיים באותו עמוד. exists עונה כן/לא פעם אחת.
--
-- (4) v_q_like ו-escape '\', בדיוק כמו שלוש ההשוואות של 0094 ובאותה מילה.
--     ענף חדש שהיה מקבל את v_q הגולמי היה מחזיר את הכשל של 0094 מהדלת האחורית:
--     '%' היה חוזר להיות תו הצבה — הפעם על טקסט שכתב מנהל.
--
-- (5) בשתי השאילתות — ה-count וה-rows — באותה מילה בדיוק. הכרעה (6) של 0093
--     והכרעה (3) של 0094, מאותו נימוק: סינון שנכנס לצד אחד בלבד נותן total
--     שאומר «נמצאו שתיים» מעל עמוד שמראה אחת.
--
-- (6) שדה חדש בשורה — matched_in_note: אמת כשהשורה נמצאה בזכות הנימוק ולא
--     בזכות שום שדה נראה. זו אותה הכרעה של q_phone ב-0093: שורה שנמצאה ואין
--     בה ולו תו אחד ממה שהוקלד נראית כמו תקלה בחיפוש, והרשימה אינה אמורה
--     לאלץ את הקורא לנחש. המסך עדיין אינו מצייר אותו — זו הלבנה הבאה.
--
-- (7) matched_in_note נגזר ואינו נקרא שוב מהיומן: שורה שנמצאה כשיש מונח חיפוש
--     ולא התאימה לאף שדה נראה — התאימה בהכרח לנימוק, כי זה הענף היחיד שנשאר.
--     coalesce(..., false) ולא בלעדיו: איש קשר בלי שם מחזיר null מה-ilike,
--     ו-not null היה הופך «נמצאה בזכות הנימוק» ל-null במקום לאמת.
--
-- מה נמדד אחרי, על אותן שתי הפניות בדיוק ובאותן תשע השאילתות:
--
--   'המס הקודמת'  → total 1, ids [367], matched_in_note true   ⇐ נסגר
--   'בדואר רשום'  → total 1, ids [368], matched_in_note true   ⇐ נסגר
--   'שצורפו'      → total 1, ids [367], matched_in_note true   ⇐ נסגר
--   'כהן'         → total 1, ids [368], matched_in_note false  (בקרה — שם)
--   '0501230011'  → total 1, ids [367], matched_in_note false  (בקרה — טלפון)
--   '367'         → total 1, ids [367], matched_in_note false  (בקרה — מספר)
--   'אסמכתא'      → total 0             (בקרה — הכרעה (2), נאמר ולא נבלע)
--   '%'           → total 0             (בקרה — 0094 לא נפרץ מהדלת האחורית)
--   'zzzz'        → total 0             (בקרה)
--
-- הכרעה (3) אינה נבדקת באף אחת מהתשע — לכל אחת מהשתיים שורת יומן אחת בלבד —
-- ולכן נמדדה בנפרד: הכרעה שנייה על #367 דרך bkalot_clone_admin_set_status
-- (rejected → closed, log 81) שהנימוק שלה מכיל אף הוא «המס הקודמת». שתי שורות
-- יומן תואמות, ואותה שאילתה החזירה total 1 ושורה אחת בעמוד — join היה מחזיר
-- 2 ואת הפנייה פעמיים.
--
-- מה שלא נמדד: coalesce של הכרעה (7) על איש קשר בלי שם — לא נבנתה כזו פנייה,
-- והענף נשען על קריאה בלבד.
--
-- מצב טסט נמדד ולא הוצהר: documents 0, outbound_queue נשאר 8, אפס sent_at,
-- delivery_log נשאר 3, אפס פניות ב-sent. התגלגל אחורה בפקודות נפרדות לפי
-- טבלה — case_status_log, ואז cases, ואז contacts. אחרי: cases 0,
-- case_status_log 0, case_rights 0, documents 0, admin_users 1,
-- admin_sessions 5, templates 2, contacts 4, outbound_queue 8,
-- delivery_log 3, rights_catalog 888 — בסיס בדיוק.
--
-- מה לא נבנה כאן: אין אינדקס ואין חיפוש טקסט מלא — ילד ילד ilike על טבלה שיש
-- בה 0 שורות בסיס; אין הדגשה של המילה שנמצאה בתוך הנימוק; אין חיפוש בשמות
-- המכריעים; אין עריכה ואין מחיקה ביומן. אין נגיעה בעמודות, באילוצים
-- וב-backfill — הענף יושב בקורא בלבד.

CREATE OR REPLACE FUNCTION public.bkalot_clone_admin_cases(p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_limit    int  := 50;
  v_offset   int  := 0;
  v_status   text;
  v_kind     text;
  v_q        text;
  -- 0094: מונח החיפוש אחרי הימלטות, לשלוש השוואות ה-ilike בלבד. ראה (1)–(6).
  -- 0096 הכרעה (4): ומעכשיו גם לענף הנימוק, באותה מילה בדיוק.
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
  -- 0096 הכרעה (5): וכך גם ענף הנימוק.
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
          or (v_phone_q is not null and ct.phone like '%' || v_phone_q || '%')
          -- 0096 הכרעות (2), (3) ו-(4): הנימוק שהמנהל כתב ביומן. exists ולא
          -- join — לפנייה יש כמה שורות יומן, ו-join היה סופר אותה פעם לכל אחת.
          or exists (select 1
                       from bkalot_clone.case_status_log h2
                      where h2.case_id = c.id
                        and h2.note ilike '%' || v_q_like || '%' escape '\'));

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
               'status_deciders_count', hl.deciders,
               -- 0096 הכרעות (6) ו-(7): השורה נמצאה בזכות הנימוק ולא בזכות שום
               -- שדה שהקורא רואה. נגזר ואינו נקרא שוב מהיומן — שורה שהגיעה לכאן
               -- כשיש מונח חיפוש ולא התאימה לאף שדה נראה התאימה בהכרח לנימוק,
               -- כי זה הענף היחיד שנשאר. coalesce ולא בלעדיו: ilike על שם ריק
               -- מחזיר null, ו-not null היה מחזיר null במקום אמת.
               'matched_in_note',
                 (v_q is not null
                  and not coalesce(
                        c.id::text = v_q
                        or ct.full_name ilike '%' || v_q_like || '%' escape '\'
                        or ct.phone     ilike '%' || v_q_like || '%' escape '\'
                        or ct.email     ilike '%' || v_q_like || '%' escape '\'
                        or (v_phone_q is not null
                            and ct.phone like '%' || v_phone_q || '%'),
                        false))) as j
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
              or (v_phone_q is not null and ct.phone like '%' || v_phone_q || '%')
              -- 0096 הכרעה (5): אותו ענף בדיוק כמו בשאילתת ה-count, מילה במילה.
              or exists (select 1
                           from bkalot_clone.case_status_log h2
                          where h2.case_id = c.id
                            and h2.note ilike '%' || v_q_like || '%' escape '\'))
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
