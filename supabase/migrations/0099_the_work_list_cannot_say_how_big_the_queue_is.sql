-- 0099 — שכפול בקלות שכבה 3
-- רשימת העבודה אומרת כמה פניות עונות על הסינון ואינה יודעת כמה יש בסך הכול.
--
-- מי כתב את הקו הזה: 6849803 בסופה (heartbeat 671), מילה במילה: «הלבנה הבאה היא
-- UI ולא פריסה», ובראש רשימת «מה שלא נבנה» שאחריה: «אין «מתוך N בסך הכול»».
-- נלקח הראשון שברשימה.
--
-- ⚠️ והוא נלקח כמיגרציה ולא כמסך, בניגוד למה שהקו אמר — בדיוק כפי ש-0098 נלקחה,
-- ומאותו טעם. הפעם הסיבה אינה צריכה להימדד מחדש: היא כתובה במסך עצמו, בהכרעה
-- (2) של המונה (admin.html:744–746), מילה במילה: «השרת מחזיר total אחד — של
-- הסינון — ואין למסך מאין לדעת כמה פניות יש בסך הכול. «מתוך N» כאן היה מספר
-- מומצא». כלומר המסך לא שכח לצייר את המספר; הוא סירב לצייר אותו מפני שאין לו
-- אותו, ורשם את הסירוב. הלבנה הזו נותנת לו אותו, והיא היחידה שיכולה.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. ארבע פניות נקלטו דרך
-- public.bkalot_clone_intake (source=form, queued=false), שתיים info ושתיים
-- reminder, כדי שסינון יצמצם באמת ולא בתיאוריה:
--   392  info      אברהם ישראלי  0501230021
--   393  reminder  שרה כהן       0501230022
--   394  info      יוסף לוי      0501230023
--   395  reminder  רבקה מזרחי    0501230024
-- ואז נקראה הרשימה ארבע פעמים, כפי שמנהל קורא אותה, מול תור שיש בו 4:
--   admin_cases({})                → total 4
--   admin_cases({kind:'info'})     → total 2
--   admin_cases({q:'אברהם'})       → total 1
--   admin_cases({status:'sent'})   → total 0
-- ובכל אחת מארבע התשובות אותם שישה מפתחות בדיוק — ok, cases, limit, total,
-- offset, q_phone — ואף לא אחד מהם אומר 4.
--
-- הכשל: המספר היחיד שהמסך מקבל הוא של הסינון, והמסך מצייר אותו כמשפט על התור.
-- «2 פניות תואמות את הסינון» נכון, וחסר בו בדיוק הדבר שבגללו קוראים אותו —
-- 2 מתוך 4 או 2 מתוך 900 הם שתי הודעות שונות לגמרי, והשורה נראית אותו הדבר
-- בשתיהן. ⚠️ והקצה החמור הוא אפס: status='sent' מחזיר total 0 על תור שיש בו
-- ארבע פניות, והמסך אומר «אין פניות שתואמות את הסינון» — משפט שנכון על הסינון
-- ואינו מבחין בין «יש תור ואף פנייה בו אינה נשלחה» ל«התור ריק». זו בדיוק הבקרה
-- ש-a795108 מדדה ורשמה כמצב תקין, ו-68785e9 שיפרה את הניסוח שלה ולא את הידיעה
-- שמאחוריו: המונה למד לומר «תואמות את הסינון», והוא עדיין אינו יודע מתוך מה.
--
-- מה נבנה: queue_total אחד על התשובה — לא על השורה. שבע הכרעות:
--
-- (1) התור הוא הטבלה במלואה, בלי ולו תנאי אחד. לא «בלי הסטטוס אבל עם הסוג»
--     ולא «בלי מונח החיפוש» — מספר שהיה משמיט חלק מהסינון ומשאיר את השאר הוא
--     משמעות שלישית על אותו מסך, ואיש לא היה יכול לומר מאיזו קבוצה הוא. נמדד
--     ולא הונח שיש כאן טבלה שלמה לספור: ל-cases אין עמודת מחיקה רכה ואין
--     ארכיון — 16 עמודות, ואף אחת מהן אינה deleted/archived.
--
-- (2) ⚠️ ואותו היקף בדיוק כמו total, ולא היקף «נכון יותר». שאילתת ה-count
--     הקיימת אינה מסננת לפי app_key, ולכן גם הספירה הזו אינה מסננת לפיו —
--     שני מספרים על אותה שורת מסך חייבים לתאר את אותה קבוצה, ומספר שהיה
--     «מדויק יותר» היה הופך את «2 מתוך 4» לשבר בין שתי הגדרות. נמדד ולא הונח:
--     היום יש ערך אחד בלבד, bkalot-clone, ולכן ההכרעה הזו אינה נראית עדיין —
--     היא נכתבת בשביל היום שבו יהיה שני. וגם ה-left join ל-contacts אינו כאן:
--     הוא אינו מסנן ולו שורה אחת, ופנייה בלי איש קשר היא פנייה בתור.
--
-- (3) null כשאין ולו סינון אחד. אז total הוא כבר מניין התור, ו«4 מתוך 4» הוא
--     אותו מספר פעמיים — רעש שמפסיקים לראות, וזו הכרעה (4) של 0098 באותה מילה.
--     ⚠️ והמפתח קיים תמיד, גם כשהוא null: «שרת מלפני 0099» (מפתח חסר), «לא
--     סוננה הרשימה» (null) ו«התור מונה N» (מספר) הם שלושה מצבים ושלושה ערכים.
--
-- (4) ⚠️ המיון אינו סינון ואינו מדליק אותו. זו הכרעה (1) של המונה במסך
--     (admin.html:739–742), מילה במילה — המיון «אינו מוציא ולו שורה אחת
--     מהרשימה» — ולכן שינוי מיון בלבד אינו רשאי להצמיח «מתוך N» שלא היה שם
--     רגע קודם. ארבעת הדגלים הם status, kind, decided ו-q, ו-sort אינו בהם.
--
-- (5) העימוד אינו סינון ואינו מדליק אותו. limit ו-offset חותכים עמוד מתוך
--     הקבוצה ואינם משנים אותה, ו«מוצגות N» של המסך כבר מתאר את החיתוך הזה
--     (הכרעה (4) של המונה). בעמוד השני של רשימה בלי סינון queue_total נשאר
--     null, ונכון שיישאר.
--
-- (6) הספירה רצה רק כשיש סינון. count(*) שני על כל קריאת רשימה, בשביל מספר
--     שהמסך לא יצייר, הוא מחיר בלי קורא.
--
-- (7) ⚠️ שאילתת ה-count ושאילתת השורות לא נגעו — אף לא בתו אחד. queue_total
--     הוא מפתח נוסף על התשובה ואינו מפתח על השורה: הוא אומר דבר על הקבוצה
--     ולא על פנייה, ומקומו לצד total ולא לצד note_match_count. total אינו זז,
--     והשורות שחוזרות הן אותן שורות בדיוק — הכרעה (6) של 0098 ו-(5) של 0089.
--
-- ⚠️ מה שלא נבנה כאן ונאמר ולא נבלע: אין ולו תו אחד שמשתנה במסך. המונה עדיין
-- אינו מצייר «מתוך N», וה-title שלו (admin.html:762) עדיין אומר «כמה פניות יש
-- בסך הכול אינו ידוע למסך» — משפט שמרגע שהמיגרציה הזו רצה כבר אינו נכון,
-- והוא נשאר שם עד הלבנה הבאה. המסך הוא הלבנה הבאה, ואחריה הפריסה.
-- ואין כאן פירוק של המספר: «כמה נשארו מחוץ לסינון» ו«איזה מהסננים צמצם»
-- אינם נענים ממספר אחד, ולא נבנו.
--
-- ⚠️ create or replace ולא drop+create: החתימה (p jsonb) אינה משתנה, ולכן
-- ה-ACL אינו נמחק ואינו נבנה מחדש — תקלת drop-function-regrants-anon-execute.
-- נמדד לפני: proacl = {postgres=X/postgres,service_role=X/postgres}, anon
-- false, authenticated false, service_role true; ונמדד שוב אחרי.

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
  -- 0094: מונח החיפוש אחרי הימלטות, לשלוש השוואות ה-ilike בלבד. ראה (1)–(6).
  -- 0096 הכרעה (4): ומעכשיו גם לענף הנימוק, באותה מילה בדיוק.
  -- 0098 הכרעה (2): ובאותה מילה בדיוק גם לספירה שלו.
  v_q_like   text;
  -- 0093: מונח החיפוש אחרי נרמול, לצורך ההשוואה לטלפון בלבד. ראה הכרעות (1)–(5).
  v_digits   text;
  v_phone_q  text;
  v_decided  text;
  v_sort     text;
  v_total    bigint;
  -- 0099: מניין התור כולו, או null כשלא סוננה הרשימה. ראה הכרעות (1)–(7).
  v_queue    bigint;
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
  -- 0098 הכרעה (6): ושתי הספירות שנוספו שם אינן נוגעות בשאילתה הזו כלל.
  -- 0099 הכרעה (7): וגם הספירה שנוספה כאן אינה נוגעת בה — היא שאילתה נפרדת
  -- שאין בה ולו תנאי אחד, ולא שינוי של זו.
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

  -- 0099 — הכרעות (1)–(6): מניין התור כולו, בלי ולו תנאי אחד. הטבלה לבדה ובלי
  -- ה-left join ל-contacts — הוא אינו מסנן, ופנייה בלי איש קשר היא פנייה בתור
  -- (הכרעה (2)). ארבעת אלה הם הסננים, ו-v_sort אינו בהם (הכרעה (4)); limit
  -- ו-offset אינם בהם (הכרעה (5)); ובלי אף אחד מהם נשאר null, כי אז v_total
  -- הוא כבר המספר הזה עצמו (הכרעה (3)).
  if v_status is not null or v_kind is not null
     or v_decided is not null or v_q is not null then
    select count(*) into v_queue from bkalot_clone.cases;
  end if;

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
               -- ⚠️ 0098 הכרעה (1): השדה הזה נגזר, ולכן הוא עיוור לשורה שנמצאה
               -- גם לפי שדה נראה וגם לפי נימוק — שם הוא false ושני המונים
               -- שמתחתיו אומרים את מה שהוא אינו יכול לומר. הוא נשאר כפי שהוא:
               -- הוא עונה «למה השורה הזו נמצאה», והם עונים «כמה».
               'matched_in_note',
                 (v_q is not null
                  and not coalesce(
                        c.id::text = v_q
                        or ct.full_name ilike '%' || v_q_like || '%' escape '\'
                        or ct.phone     ilike '%' || v_q_like || '%' escape '\'
                        or ct.email     ilike '%' || v_q_like || '%' escape '\'
                        or (v_phone_q is not null
                            and ct.phone like '%' || v_phone_q || '%'),
                        false)),
               -- 0098 הכרעות (1)–(5): המונה והמכנה של «כמה מהנימוקים התאימו»,
               -- שניהם נספרים מהיומן עצמו ב-lateral אחד עם changes ו-deciders.
               -- null כשאין מונח — «לא נשאלה שאלה» אינו «אף נימוק לא ענה»;
               -- המפתחות עצמם קיימים תמיד, ולכן «שרת מלפני 0098» נבדל משניהם.
               'notes_count',
                 case when v_q is null then null else hl.notes end,
               'note_match_count',
                 case when v_q is null then null else hl.note_hits end) as j
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
        -- 0098 הכרעה (5): ומאותו טעם בדיוק, שני המספרים החדשים נספרים כאן ולא
        -- בתת-שאילתה חדשה — «5 מעברים» ו«4 נימוקים» חייבים לתאר את אותה קבוצת
        -- שורות. הכרעה (3): המכנה הוא הנימוקים שנכתבו ולא המעברים.
        -- הכרעה (2): הביטוי הוא מילה במילה זה של ענף ה-exists שלמעלה.
        left join lateral (
          select count(*)::bigint                                as changes,
                 count(distinct h.admin_id)::bigint              as deciders,
                 count(*) filter (where h.note is not null)::bigint as notes,
                 count(*) filter (
                   where v_q_like is not null
                     and h.note ilike '%' || v_q_like || '%' escape '\')::bigint
                                                                 as note_hits
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
    -- 0099 הכרעות (1)–(7): כמה פניות יש בתור כולו, לצד כמה מהן עונות על הסינון.
    -- null כשלא סוננה הרשימה, והמפתח קיים תמיד — שלושה מצבים ושלושה ערכים.
    -- מקומו כאן ולא על השורה: הוא אומר דבר על הקבוצה ולא על פנייה.
    'queue_total', v_queue,
    'limit',   v_limit,
    'offset',  v_offset,
    -- 0093: המספר שלפיו חופש בפועל, או null כשהמונח לא נורמל. המסך אינו נדרש
    -- לנחש למה נמצאה שורה שאינה נראית כמו מה שהוקלד.
    -- 0094 הכרעה (7): אין כאן מפתח חדש — המונח פשוט מתחיל להיות מה שהוא.
    'q_phone', v_phone_q,
    'cases',   v_rows);
end;
$function$;

comment on function public.bkalot_clone_admin_cases(jsonb) is
  'רשימת העבודה. queue_total הוא «כמה פניות יש בתור כולו» — הטבלה במלואה בלי ולו תנאי אחד, באותו היקף שבו נספר total, כדי ש«N מתוך M» יתאר קבוצה אחת (0099). null כשלא סוננה הרשימה, כי אז total הוא כבר המספר הזה; מיון ועימוד אינם מדליקים אותו. note_match_count ו-notes_count הם «כמה מהנימוקים שנכתבו על הפנייה נושאים את מונח החיפוש» — נספרים מהיומן עצמו ולא נגזרים, ולכן הם מדברים גם על שורה שנמצאה גם לפי שדה נראה (0098). בלי מונח חיפוש שניהם null ולא 0.';
