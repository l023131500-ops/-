-- 0098 — שכפול בקלות שכבה 3
-- רשימת העבודה אינה אומרת כמה נימוקים התאימו, ועל חלק מהשורות אינה אומרת דבר.
--
-- מי כתב את הקו הזה: e58ed10 בסופה (heartbeat 666), מילה במילה: «הלבנה הבאה
-- היא UI ולא פריסה — רשימת «מה שלא נבנה» של 68785e9 לא זזה, ובראשה «אין ספירה
-- ברמת השורה ברשימה» ו«אין הדגשת המילה בתוך הנימוק»». נלקח הראשון שבשניים.
--
-- ⚠️ והוא נלקח כמיגרציה ולא כמסך, בניגוד למה שהקו אמר. הסיבה נמדדה ולא הונחה:
-- bkalot_clone_admin_cases אינה מחזירה ולו מספר אחד על הנימוקים — לא מונה ולא
-- מכנה — ולכן «ספירה ברמת השורה» אינה יכולה להיבנות במסך בלי שהמסך יספור בעצמו.
-- ספירה בלקוח פירושה כלל התאמה שני שיכול לחלוק על escape/btrim/ilike של המסד,
-- וזו בדיוק הכרעה (1) של noteMatchTally והכרעה (3) של fillHistoryNoteCell,
-- שתיהן במקומן. השני שבשניים — הדגשת המילה בתוך הנימוק — נשקל ולא נלקח מאותו
-- טעם עצמו: הוא אינו חוסר אלא הכרעה כתובה.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. #388 (contact 395) — «אברהם ישראלי»,
-- 0501230011, test@more30.com — נקלטה דרך public.bkalot_clone_intake
-- (source=form, kind=info, queued=false), ואחריה חמישה מעברים ב-
-- bkalot_clone_admin_set_status (מנהל 4), ארבעה מהם עם נימוק ואחד בלי:
--   log 113  new → in_progress    «הפונה ביקש לצרף מסמכים נוספים בשבוע הבא»
--   log 114  in_progress → closed «המסמכים שצורפו שייכים לשנת המס הקודמת»
--   log 115  closed → in_progress «הטופס נשלח בדואר רשום על ידי הפונה»
--   log 116  in_progress → closed «אברהם ביקש לעדכן את מספר הטלפון»
--   log 117  closed → in_progress  (בלי נימוק כלל)
-- כלומר חמישה מעברים וארבעה נימוקים — ⚠️ בכוונה שני מספרים שונים, כדי ששורה
-- שתספור מעברים במקום נימוקים תיפול כאן ולא בייצור.
-- והאמת שבמסד, ישירות מהיומן: ilike '%מסמכים%' → 2, ilike '%אברהם%' → 1.
--
-- ואז נקראה הרשימה שלוש פעמים, כפי שמנהל קורא אותה:
--   admin_cases({q:'מסמכים'}) → total 1, id 388, matched_in_note true,
--       status_changes_count 5, ואין מפתח note_match_count ואין notes_count
--   admin_cases({q:'אברהם'})  → total 1, id 388, matched_in_note **false**
--   admin_cases({})           → total 1, id 388, matched_in_note false
--
-- שני כשלים ולא אחד, והשני חמור מהראשון:
--
-- (א) «נמצאה לפי הנימוק» עונה כן/לא ואינו עונה כמה. השורה שולחת את הקורא
--     פנימה — «פתחו את הפנייה כדי לקרוא אותו», מילה במילה — ואינה אומרת לתוך
--     מה הוא נכנס: נימוק אחד או ארבעה. 0239692 בנתה בדיוק את המשפט הזה במסך
--     הפנייה («2 מתוך 3»), ולכן הקורא רואה את המספר רק אחרי שהחליט להיכנס —
--     כלומר בדיוק אחרי הרגע שבו הוא היה שימושי. השורה מונה מסמכים, זכויות,
--     מעברים ומכריעים, ועל הדבר שבגללו היא בכלל ברשימה היא שותקת.
--
-- (ב) ⚠️ ועל שורה שנמצאה גם לפי שדה נראה וגם לפי נימוק, היא אינה אומרת דבר.
--     matched_in_note של 0096 אינו נמדד מהיומן אלא **נגזר**: «יש מונח ואף שדה
--     נראה לא התאים». זה נכון כשאלה שנשאלה שם («למה השורה הזו נמצאה»), ועיוור
--     לחלוטין לשאלה שנשאלת כאן («כמה מהנימוקים מדברים על מה שחיפשתי»). q=
--     'אברהם' מדגים את זה במדויק: השם התאים, ולכן הגזירה מחזירה false — ובאותה
--     פנייה יש נימוק שכתוב בו «אברהם», והרשימה אינה מסמנת אותו כלל. ככל שהמונח
--     כללי יותר — שם פרטי, מילה נפוצה — כך גדל הסיכוי ששני הענפים נדלקים יחד
--     וכך גדל בדיוק המספר שנבלע.
--
-- מה נבנה: שני שדות על כל שורת רשימה, שניהם נספרים מהיומן עצמו. שש הכרעות:
--
-- (1) נספר ואינו נגזר. note_match_count קורא את case_status_log ומונה, ולכן
--     הוא אינו יורש את העיוורון של (ב). matched_in_note נשאר כפי שהוא ואינו
--     נוגע — הוא עונה על שאלה אחרת ונכונה, והחלפתו הייתה שוברת את מה שהמסך
--     כבר מצייר. שני השדות יכולים לומר false ו-1 על אותה שורה, וזה אינו
--     סתירה אלא בדיוק ההפרש שבגללו נוסף השני.
--
-- (2) אותו ביטוי בדיוק של ענף ה-exists שלמעלה, מילה במילה: v_q_like ו-
--     escape '\'. הספירה חייבת להסכים עם הסינון שהעלה את השורה, אחרת הרשימה
--     מחזירה פנייה ואומרת עליה «0 נימוקים התאימו» — כלומר סותרת את עצמה על
--     אותו מסך. זו אותה הכרעה (5) של 0096 ו-(3) של 0094, במקום שלישי.
--
-- (3) שני מספרים ולא אחד. המכנה הוא הנימוקים שנכתבו ולא המעברים — מעבר בלי
--     נימוק אינו יכול להתאים, ו«2 מתוך 5» כאן היה מונה גם את log 117 שלא
--     נשאל דבר. זו הכרעה (2) של noteMatchTally, ועכשיו היא נמדדת במסד במקום
--     להיגזר במסך מרשימת שורות שהמסך ממילא אינו מחזיק ברשימה.
--
-- (4) null ולא 0 כשאין מונח חיפוש. «לא נשאלה שאלה» ו«נשאלה ואף נימוק לא ענה»
--     הם שני דברים, ושורה שאומרת «0 מתוך 4» על פתיחה רגילה של הרשימה היא רעש
--     שמפסיקים לראות. זו הכרעה (3) של noteMatchTally, באותה מילה. ⚠️ המפתח
--     עצמו קיים תמיד — jsonb_build_object אינו מדלג על null — ולכן «שרת מלפני
--     0098» (המפתח חסר) נבדל מ«אין מונח» (null) ומ«אין התאמה» (0). שלושה מצבים
--     ושלושה ערכים, וזו הכרעה (4) של 0097 ו-(0) של noteMatchBit.
--
-- (5) בתוך ה-lateral הקיים של 0089 ולא בתת-שאילתה חדשה. hl כבר קורא את
--     case_status_log של אותה פנייה בשביל changes ו-deciders; קריאה שנייה
--     הייתה רשאית להיפרד ממנה, ואז «5 מעברים» ו«4 נימוקים» היו יכולים לתאר
--     שתי קבוצות שורות שונות. אגרגט בלי group by מחזיר תמיד שורה אחת, ולכן
--     0 לפנייה בלי יומן מגיע מהספירה עצמה ולא מ-coalesce — כמו שם.
--
-- (6) ⚠️ שאילתת ה-count לא נגעה, ולא במקרה. שני המספרים מתווספים לשורה שכבר
--     נמנתה ואינם רשאים לשנות את הקבוצה הנמנית ולו בשורה אחת — הכרעה (5) של
--     0089 ו-(6) של 0093. ספירה אינה סינון: אין כאן «הצג רק פניות עם שני
--     נימוקים ומעלה», ומי שירצה זאת יוסיף פרמטר ולא ישנה את המשמעות של total.
--
-- ⚠️ מה שלא נבנה כאן ונאמר ולא נבלע: המסד עדיין אינו מחזיר את טקסט הנימוק
-- בשורת הרשימה, ולכן אין ציטוט ואין הדגשה — 0096 הכרעה (3) של noteMatchBit
-- עומדת במקומה. אין אינדקס על case_status_log(note) ואין חיפוש טקסט מלא;
-- הספירה רצה על אותן שורות שה-exists ממילא סורק. אין סינון ואין מיון לפי
-- מספר הנימוקים שהתאימו. ואין ולו תו אחד שמשתנה במסך — המסך הוא הלבנה הבאה.
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
  -- 0098 הכרעה (6): ושתי הספירות שנוספו כאן אינן נוגעות בשאילתה הזו כלל.
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
  'רשימת העבודה. note_match_count ו-notes_count הם «כמה מהנימוקים שנכתבו על הפנייה נושאים את מונח החיפוש» — נספרים מהיומן עצמו ולא נגזרים, ולכן הם מדברים גם על שורה שנמצאה גם לפי שדה נראה (0098). בלי מונח חיפוש שניהם null ולא 0.';
