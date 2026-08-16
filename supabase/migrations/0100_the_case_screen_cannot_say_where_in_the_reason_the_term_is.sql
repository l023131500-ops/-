-- 0100 — שכפול בקלות שכבה 3
-- מסך הפנייה אומר איזה נימוק התאים ואינו אומר היכן.
--
-- מי כתב את הקו הזה: שתי הכרעות שנכתבו במפורש כסירוב, ולא רשימת משאלות. 0097
-- הכרעה (3), מילה במילה: «אין הדגשה של המילה בתוך הנימוק ואין ציטוט של הקטע
-- שהתאים. 0097 מחזירה boolean ולא מיקום, וסימון תו בתוך הטקסט כאן היה חיפוש שני
-- בלקוח — כלומר כלל התאמה שני, שיכול לחלוק על זה של המסד (escape, btrim, ilike)
-- ולסמן במקום אחר או בכלל לא». ו-admin.html הכרעה (1) של noteMatchTally חוזרת
-- על אותו סירוב באותה מילה: «הכרעה (3) של fillHistoryNoteCell עומדת במקומה: אין
-- הדגשה של המילה ואין ציטוט». כלומר המסך לא שכח להדגיש — הוא סירב, מפני שאין לו
-- את המיקום, ורשם את הסירוב פעמיים. הלבנה הזו נותנת לו אותו, והיא היחידה שיכולה.
-- זו אותה תבנית בדיוק שבה נלקחה 0099: מה שחוסם את המסך אינו במסך.
--
-- ⚠️ ונלקח כמיגרציה ולא כמסך, בניגוד למה שהקו של 674 אמר («הלבנה הבאה היא UI
-- ולא פריסה») — כפי ש-0098 ו-0099 נלקחו ומאותו טעם, ומאותו טעם בדיוק גם נאמר.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. פנייה אחת ושלוש שורות יומן — הרצף הוא
-- הנושא ולכן הוא נבנה, כפי שנבנה ב-0097. #404 (contact 411) — «אברהם ישראלי»,
-- 0501230051 — נקלטה דרך public.bkalot_clone_intake (kind=info, queued=false),
-- ומיד אחריה שלוש הכרעות ב-bkalot_clone_admin_set_status (מנהל 4):
--   log 128  new → in_progress  «המסמכים שצורפו שייכים לשנת המס הקודמת»   (37 תווים)
--   log 129  in_progress → rejected  «Email נשלח לפונה, ואחריו EMAIL נוסף בטעות»  (41)
--   log 130  rejected → closed  «הטופס נשלח בדואר רשום על ידי הפונה»       (34)
--
-- ⚠️ 129 נבנתה כך בכוונה, ולא כטקסט מזדמן: המונח יושב בה פעמיים ובשתי צורות
-- אותיות שונות, והראשונה שבהן פותחת את השורה. שתי אלה הן בדיוק מה שהכרעה (3) של
-- 0097 חששה ממנו — חיפוש שני שאינו מסכים עם ilike על אותיות גדולות, ומספר יחיד
-- שנאמר על טקסט שיש בו יותר מהתאמה אחת.
--
-- הכשל, נמדד ולא צוטט. שלוש קריאות ל-bkalot_clone_admin_case(404, q) החזירו
-- note_matched נכון בכל תשע השורות — 'המס הקודמת' → 128, 'email' → 129,
-- 'בדואר רשום' → 130 — ובכל תשע השורות אותם שמונה מפתחות בדיוק: admin_id,
-- admin_name, at, from_status, id, note, note_matched, to_status. ואף לא אחד
-- מהם אומר היכן. הסימן «זה הנימוק שהתאים» מצביע על תא, והתא הוא 37 תווים; על
-- 500 תווים — התקרה ש-0090 אוכפת — הוא מצביע על פסקה. מנהל שהגיע לכאן בזכות
-- מילה עדיין קורא בעיניים כדי למצוא אותה, וזה בדיוק מה שהסימן בא לחסוך.
--
-- ⚠️ המדידה שבלעדיה אין למיגרציה הזו זכות קיום, ונעשתה לפניה ולא אחריה: האם
-- position(lower(q) in lower(note)) מסכים עם ה-ilike של 0097. שישה מונחים על
-- שלוש השורות, 18 צירופים, 18 הסכמות — ובהם השניים שיכלו להיכשל: 'email'
-- (מוקלד קטן) על שורה שפותחת ב-«Email» החזיר ilike true ומיקום 1, ו-'%' החזיר
-- false בשניהם. זו אינה הוכחה שהשניים שווים בכל קלט, ולכן הכרעה (2) למטה אינה
-- נשענת עליה אלא שומרת מפניה.
--
-- מה נבנה: שני שדות על כל שורת יומן, ואף לא תו אחד בכלל ההתאמה עצמו. שבע הכרעות:
--
-- (1) על שורת היומן וליד note_matched, אותו מקום ואותו היקף. השאלה כאן היא
--     ההמשך הישיר של השאלה ההיא — «זו היא» ואז «היכן בה» — ושדה ברמת הפנייה היה
--     עונה על השאלה השלישית שאיש לא שאל.
--
-- (2) ⚠️ ההכרעה שכל השאר תלוי בה: note_matched נשאר ה-ilike, אות באות, ואינו
--     נגזר מהמיקום. המיקום הוא תיאור של התאמה שכבר נקבעה ואינו קובע אותה, ולכן
--     הוא מחושב רק היכן ש-ilike כבר אמר true. וכשהשניים חולקים — כלומר ilike
--     אמר true ו-position החזיר 0 — התשובה היא null ולא מספר: מסך שאינו מדגיש
--     הוא מסך שקורא כמו קודם, ומסך שמדגיש במקום הלא נכון אומר שקר על טקסט
--     שאדם הקליד. nullif(..., 0) הוא בדיוק השורה הזו.
--
-- (3) ⚠️ המונח הגולמי (v_q) ל-position, ולא v_q_like — ההפך הגמור מהכרעה (3) של
--     0097, ובמכוון. v_q_like הוא תחביר של תבנית: '%' שבו הוא '\%', ושני תווים
--     שמשמעותם «אחוז אחד» ב-ilike הם שני תווים ממש ב-position. חיפוש המחרוזת
--     '\%' בתוך נימוק היה מחזיר 0 על נימוק שיש בו אחוז — כלומר בדיוק המקרה
--     שבגללו ההימלטות קיימת היה מייצר את המחלוקת של הכרעה (2).
--
-- (4) ⚠️ ההתאמה הראשונה בלבד, ונאמר ולא נבלע. ב-129 המונח יושב פעמיים והתשובה
--     היא 1; ההתאמה השנייה אינה מוחזרת ואינה נספרת. המסך שייבנה על השדה הזה
--     רשאי להדגיש אחת ואינו רשאי לומר «היחידה».
--
-- (5) note_match_len מוחזר ואינו נגזר בלקוח. ה-btrim נעשה כאן (הכרעה (1) של
--     0097), ולקוח שהיה מודד את אורך מה שהוקלד בתיבה היה מדגיש רצף שכולל את
--     הרווחים שהשרת הוריד — כלומר גולש מעבר למה שהתאים. ⚠️ char_length ולא
--     octet_length: אות עברית היא שני בייטים ב-UTF-8, ומיקום בבייטים היה נוחת
--     בתוך אות ולא לפניה.
--
-- (6) null ולא 0 כשאין התאמה. 0 אינו מיקום בשום מערכת קואורדינטות, ו-«לא זו
--     השורה» כבר נאמר ב-note_matched. ⚠️ ושני המפתחות קיימים תמיד —
--     jsonb_build_object אינו מדלג על null — ולכן «שרת מלפני 0100» (המפתח חסר)
--     נבדל מ«לא התאימה» (null). זו הכרעה (4) של 0097 באותו מקום ומאותו טעם.
--
-- (7) ⚠️ create or replace ולא drop+create. החתימה אינה משתנה — אותם
--     (bigint, text) בדיוק — ורק האובייקט שנבנה בפנים גדל, ולכן אין כאן את
--     הסיבה שכפתה drop ב-0097 (עומס חתימות ו-PostgREST). ו-drop כאן היה עולה
--     במחיר: הוא מוחק את ה-ACL, ו-alter default privileges של הפרויקט היה מחזיר
--     execute ל-anon ול-authenticated על פונקציית קריאת פניות — כפי שנמדד ונרשם
--     בסוף 0097. הבסיס שנמדד לפני:
--     proacl {postgres=X/postgres,service_role=X/postgres}, anon false,
--     authenticated false, service_role true.
--
-- מה נמדד אחרי, על אותה פנייה ואותן שלוש שורות בדיוק:
--   admin_case(404,'המס הקודמת') → 128 true/28/10, 129 false/null/null, 130 false/null/null
--   admin_case(404,'email')      → 129 true/1/5 — ההתאמה הראשונה, והשנייה אינה נאמרת (הכרעה (4))
--   admin_case(404,'בדואר רשום') → 130 true/12/10
--   admin_case(404)              → שלוש שורות false/null/null            (בקרה — אין מונח)
--   admin_case(404,'  המס הקודמת  ') → 128 true/28/10                    (בקרה — btrim, הכרעה (5))
--   admin_case(404,'%')          → שלוש שורות false/null/null            (בקרה — 0094)
--   admin_case(404,'zzzz')       → שלוש שורות false/null/null            (בקרה)
-- ובכולן note_matched לא זז ולו בשורה אחת מהערך שהחזיר לפני המיגרציה,
-- ו-status_history נשאר שלוש שורות באותו סדר — כלומר השדות מתארים ואינם מסננים.
--
-- מה שלא נבנה ונאמר במפורש: אין הדגשה במסך —
-- apps/37-bkalot-clone/admin.html אינה נגעה, ולכן מנהל בייצור עדיין קורא את
-- הנימוק בלי סימן על המילה, והמסך הוא הלבנה הבאה ואחריו הפריסה; אין ההתאמה
-- השנייה ואילך (הכרעה (4)); אין ציטוט חתוך של הקטע — השדות מאפשרים למסך לבנות
-- אותו והמסד אינו חותך טקסט (הכרעה (3) של fillHistoryNoteCell עומדת במקומה);
-- אין סימן מקביל על note של הפנייה עצמה (הכרעה (2) של 0096 עומדת במקומה, והשדה
-- אינו נבדק מול המונח כלל); אין חיפוש ב-cases.note; ואין סימון על שמות המכריעים.
-- ⚠️ והשער אינו נוגע: v9 קורא את הפונקציה ומחזיר את גופה כפי שהוא, ולכן שני
-- המפתחות עוברים בלי פריסת edge function — כפי שנמדד ב-0099 על queue_total.
--
-- 🚫 מצב טסט: המיגרציה נוגעת בפונקציית קריאה אחת ותו לא. אין בה כתיבה, אין
--    עמודה חדשה, אין backfill, אין נגיעה ב-outbound_queue, ב-delivery_log ולא
--    בשום ערוץ שליחה, ולא יוצאת ממנה ולו הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

-- הכרעה (7): אותה חתימה, ולכן replace ולא drop — וה-ACL אינו נוגע.
create or replace function public.bkalot_clone_admin_case(p_id bigint, p_q text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_case jsonb;
  -- 0097 הכרעה (1): אותו מונח של הרשימה, ואותו טיפול בו — מפתח חסר, מחרוזת
  -- ריקה ורווחים בלבד הם null אחד, כמו ב-bkalot_clone_admin_cases.
  v_q      text;
  -- 0097 הכרעה (3): המונח אחרי הימלטות, לענף ה-ilike בלבד. אותן שלוש החלפות של
  -- 0094 ובאותה מילה.
  -- ⚠️ 0100 הכרעה (3): לענף ה-ilike *בלבד*. המיקום נמדד על v_q הגולמי.
  v_q_like text;
  -- 0100 הכרעה (5): נמדד פעם אחת על המונח שאחרי ה-btrim, ולא בלקוח.
  v_q_len  int;
begin
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
  end if;

  v_q := nullif(btrim(coalesce(p_q, '')), '');
  if v_q is not null then
    v_q_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
    v_q_len  := char_length(v_q);
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
           -- ⚠️ הכרעה (1) של 0091: זהו הנימוק של האזרח, מה שהוא כתב בטופס.
           -- הנימוק של המכריע יושב על שורת היומן שלמטה ונושא את אותו שם בדיוק,
           -- ובמכוון — שני כותבים, שני מקומות, אותו סוג דבר.
           -- ⚠️ 0097 הכרעה (2) של 0096 עומדת גם כאן: השדה הזה אינו נבדק מול
           -- מונח החיפוש, מפני שהרשימה לא מצאה לפיו — היא מחפשת ביומן בלבד.
           -- סימון שלו היה אומר «כאן התאים» על טקסט שאיש לא חיפש בו.
           'note',       c.note,
           'raw',        c.raw,
           'to_email',   c.to_email,
           'consent',    c.consent,
           -- ראה הכרעות (1)–(3): הזהות, החותמת, והשם שנפתר בשרת. שם ריק כשהזהות
           -- מלאה פירושו שהחשבון שהכריע אינו קיים עוד — ולא שאין לו שם.
           -- שלושת אלה הם ההכרעה האחרונה בלבד; הרצף כולו יושב ב-status_history
           -- שלמטה, והכרעה (1) של 0088 היא ששני אלה לא יתערבבו.
           'decided_by',      c.decided_by,
           'decided_at',      c.decided_at,
           'decided_by_name', au.full_name,
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
    left join bkalot_clone.admin_users au on au.id = c.decided_by
   where c.id = p_id;

  if v_case is null then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', p_id);
  end if;

  return jsonb_build_object(
    'ok',   true,
    'case', v_case,
    -- ראה הכרעות (1)–(6) של 0088. הרצף עולה ונקרא כמשפט אחד: to_status של כל
    -- שורה שווה ל-from_status של הבאה. hau ולא au ולא pau — au הוא מי שהכריע
    -- אחרון על הפנייה, pau (במסמכים שלמטה) הוא מי שהפיק מסמך, וכאן נשאל מי
    -- הכריע במעבר הזה; שימוש חוזר היה מדביק אדם אחד לכל שורות ההיסטוריה.
    -- ⚠️ ה-LEFT (הכרעה (4) של 0091) הוא מה שמשאיר את הנימוק במקומו כשהחשבון
    -- שכתב אותו נמחק: INNER היה מוחק מההיסטוריה את הדחייה ואת הסיבה לה מפני
    -- שעובד התפטר.
    'status_history', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id',          h.id,
                 'from_status', h.from_status,
                 'to_status',   h.to_status,
                 'admin_id',    h.admin_id,
                 'admin_name',  hau.full_name,
                 -- הכרעות (2) ו-(3) של 0091: המפתח קיים תמיד — jsonb_build_object
                 -- אינו מדלג על null — ולכן «המכריע לא נימק» (note: null) נבדל
                 -- מ«השרת אינו יודע לומר» (המפתח חסר, שרת מלפני 0091). והערך
                 -- שלם: אין כאן left() ואין '…' — התקרה נאכפת בכתיבה (0090).
                 'note',        h.note,
                 -- 0097 — הכרעות (2)(4)(5)(6): השורה הזו היא זו שבגללה הפנייה
                 -- עלתה ברשימה. המפתח קיים תמיד גם כשאין מונח חיפוש (הכרעה (4)),
                 -- והערך false ולא null גם כשאין נימוק כלל (הכרעה (5)) — כלומר
                 -- «לא היא» ו«איני יודע» אינם מתערבבים, ומסך ישן מלפני 0097
                 -- מבחין בין השניים לפי היעדר המפתח ולא לפי ערכו.
                 -- הסינון אינו נוגע ברצף: כל השורות חוזרות, בכל מקרה, באותו סדר.
                 -- ⚠️ 0100 הכרעה (2): השורה הזו לא נגעה ולו בתו אחד. היא הקובעת,
                 -- ושני השדות שאחריה מתארים את מה שהיא כבר קבעה.
                 'note_matched',
                     coalesce(v_q_like is not null
                              and h.note ilike '%' || v_q_like || '%' escape '\',
                              false),
                 -- 0100 — הכרעות (2)(3)(4)(6): היכן בתוך הנימוק. מחושב רק היכן
                 -- ש-ilike כבר אמר true, על v_q הגולמי ולא על v_q_like (הכרעה
                 -- (3)), וההתאמה הראשונה בלבד (הכרעה (4)).
                 -- ⚠️ nullif(...,0) הוא הכרעה (2) עצמה: הוא נדלק בדיוק כאשר
                 -- ilike אמר true ו-position לא מצא דבר — שתי מדידות שחולקות —
                 -- ואז נאמר «איני יודע היכן» ולא מספר מומצא. אין כאן ענף שני
                 -- לכתוב; המסך אינו מדגיש כשהערך null, כמו כשאין התאמה כלל.
                 'note_match_pos',
                     case when v_q is not null and h.note is not null
                           and h.note ilike '%' || v_q_like || '%' escape '\'
                          then nullif(position(lower(v_q) in lower(h.note)), 0)
                     end,
                 -- 0100 הכרעה (5): אורך המונח בתווים, מהשרת ואחרי ה-btrim.
                 -- מוחזר רק עם מיקום — אורך בלי «מהיכן» אינו קטע ואינו ניתן
                 -- להדגשה, ושני מספרים שאחד מהם null היו מזמינים חשבון בלקוח.
                 'note_match_len',
                     case when v_q is not null and h.note is not null
                           and h.note ilike '%' || v_q_like || '%' escape '\'
                           and position(lower(v_q) in lower(h.note)) > 0
                          then v_q_len
                     end,
                 'at',          h.at)
               order by h.at, h.id)
          from bkalot_clone.case_status_log h
          left join bkalot_clone.admin_users hau on hau.id = h.admin_id
         where h.case_id = p_id), '[]'::jsonb),
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
                 'template_key',      d.template_key,
                 'template_name_he',  t.name_he,
                 'template_fallback', d.template_fallback,
                 -- ראה הכרעות (1)–(3): pau ולא au — au למעלה הוא מי שהכריע על
                 -- הפנייה, וכאן נשאל מי הפיק את המסמך הזה. שם ריק כשהזהות מלאה
                 -- פירושו שהחשבון שהפיק אינו קיים עוד; שניהם null פירושו הפקה
                 -- בלי שהשער העביר זהות (מצב v7), כלשון הערת העמודה של 0083.
                 'produced_by',      d.produced_by,
                 'produced_by_name', pau.full_name,
                 'created_at',    d.created_at,
                 'updated_at',    d.updated_at,
                 'overwritten',   case when d.updated_at is null then null
                                       else (d.updated_at is distinct from d.created_at) end)
               order by d.created_at, d.id)
          from bkalot_clone.documents d
          left join bkalot_auto.outbound_queue q on q.id = d.queue_id
          left join bkalot_clone.templates t on t.key = d.template_key
          left join bkalot_clone.admin_users pau on pau.id = d.produced_by
         where d.case_id = p_id), '[]'::jsonb),
    'templates', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'key',      t.key,
                 'name_he',  t.name_he,
                 'subject',  t.subject,
                 'channels', to_jsonb(t.channels),
                 'enabled',  t.enabled)
               order by t.enabled desc, t.name_he)
          from bkalot_clone.templates t), '[]'::jsonb));
end;
$function$;

-- הכרעה (7): create or replace אינו נוגע ב-ACL, ולכן אין כאן revoke/grant —
-- ⚠️ ובמכוון, ולא מהשמטה: השתיים שב-0097 היו שם מפני ש-drop מחק את ההרשאות
-- ו-alter default privileges של הפרויקט היה מחזיר execute ל-anon. שורות
-- שמשחזרות ACL שלא נגעו בו היו אומרות שהיה כאן סיכון שלא היה. נמדד לפני ואחרי:
-- proacl {postgres=X/postgres,service_role=X/postgres} בשתי המדידות.

comment on function public.bkalot_clone_admin_case(bigint, text) is
  'פנייה אחת לקריאה. p_q הוא מונח החיפוש שממנו הגיעו מהרשימה, והוא מסמן ב-status_history איזו שורת יומן נשאה אותו (0097) והיכן בתוכה — note_match_pos בתווים מ-1 ו-note_match_len (0100). המיקום מתאר ואינו קובע: note_matched נשאר ה-ilike, והמיקום null כשהשניים חולקים. ההתאמה הראשונה בלבד. בלי p_q כל השורות false והמסך שותק.';
