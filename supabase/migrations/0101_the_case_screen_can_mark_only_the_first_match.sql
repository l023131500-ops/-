-- 0101 — שכפול בקלות שכבה 3
-- מסך הפנייה יכול לסמן את ההתאמה הראשונה בלבד.
--
-- מי כתב את הקו הזה: 0100 הכרעה (4), מילה במילה: «⚠️ ההתאמה הראשונה בלבד, ונאמר
-- ולא נבלע. ב-129 המונח יושב פעמיים והתשובה היא 1; ההתאמה השנייה אינה מוחזרת
-- ואינה נספרת. המסך שייבנה על השדה הזה רשאי להדגיש אחת ואינו רשאי לומר
-- «היחידה»». והמסך אכן נבנה (c1598aa) ואכן אינו אומר «היחידה» — ה-title שלו
-- אומר «ההתאמה הראשונה». ושלוש פעמים נמדד בייצור שהמונח השני אינו מסומן:
-- c1598aa «וב-133 «EMAIL» השני (מיקום 26) אינו מסומן», ו-6412e7f «וב-136
-- «EMAIL» השני (מיקום 26) אינו מסומן בייצור». סימן שנמדד פעמיים כחסר הוא
-- הלבנה הבאה, לא הערה.
--
-- ⚠️ ונלקח כמיגרציה ולא כמסך, בדיוק כפי ש-0100 נלקחה: מה שחוסם את המסך אינו
-- במסך. admin.html מקבל מספר אחד ואינו יכול לגזור ממנו את השני — וחיפוש שני
-- בלקוח הוא בדיוק מה ש-0097 הכרעה (3) ו-0100 הכרעה (3) סירבו לו, ומאותה סיבה:
-- כלל התאמה שני שיכול לחלוק על escape/btrim/ilike של המסד ולסמן במקום אחר.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. פנייה אחת ושלוש שורות יומן, ובמכוון עם
-- שלושה מספרי התאמה שונים — אחת, שתיים ושלוש — כדי ש«השנייה ואילך» ייבדק ולא
-- ייטען. #408 (contact 415) — «אברהם ישראלי», 0501230081 — נקלטה דרך
-- public.bkalot_clone_intake (kind=info, source=form, consent=true), ומיד
-- אחריה שלוש הכרעות ב-bkalot_clone_admin_set_status (מנהל 4):
--   log 138  new → in_progress  «Email נשלח לפונה, ואחריו EMAIL נוסף בטעות» (41 תווים)
--   log 139  in_progress → rejected  «טופס, טופס ועוד טופס נשלחו בטעות»     (32)
--   log 140  rejected → closed  «המסמכים שצורפו שייכים לשנת המס הקודמת»     (37)
--
-- ⚠️ 139 היא החדשה כאן, ונבנתה כך בכוונה: המונח «טופס» יושב בה שלוש פעמים
-- (1, 7, 17) — כלומר «יש שנייה» ו«יש שלישית» אינם אותה שאלה, ומערך שמחזיר את
-- הראשונה והאחרונה בלבד היה נראה נכון על 138 ונופל על 139. 138 נשמרה מ-0100
-- כפי שהיא (המונח פעמיים, 1 ו-26, ובשתי צורות אותיות), ו-140 היא הבקרה: התאמה
-- אחת בלבד (28), כדי שהשדה החדש יימדד גם היכן שאין לו מה להוסיף.
--
-- האמת נמדדה מהמסד ולא מהפונקציה שנכתבת כאן — generate_series על כל מיקום בטקסט
-- עם substr/lower, כלל התאמה נפרד לגמרי מזה של הפונקציה:
--   138 'email'      → [1, 26]
--   139 'טופס'       → [1, 7, 17]
--   140 'המס הקודמת' → [28]
-- זו הרשימה שהפונקציה נמדדת מולה, ולא ההפך.
--
-- הכשל, נמדד ולא צוטט. שלוש קריאות ל-bkalot_clone_admin_case(408, q) החזירו
-- בכל תשע השורות אותן עשר מפתחות בדיוק: admin_id, admin_name, at, from_status,
-- id, note, note_matched, note_match_len, note_match_pos, to_status. ואף לא אחד
-- מהם אומר «יש עוד». admin_case(408,'email') → 138 true/1/5, וזהו: 26 אינו
-- בתשובה. מנהל שהגיע לכאן בזכות מילה שיושבת בשורה שלוש פעמים רואה סימן אחד
-- ומניח שזה כל מה שיש.
--
-- מה נבנה: פונקציה אחת חדשה ומפתח אחד חדש. שמונה הכרעות:
--
-- (1) מערך, ולא מספר שני. «כמה» ו«היכן» אינם שתי שאלות כאן — רשימת המיקומים
--     עונה על שתיהן, ומספר-שני היה נופל על 139 שבה יש שלוש. המפתח קיים תמיד,
--     0100 הכרעה (6) באותו מקום ובאותו טעם: שרת מלפני 0101 (המפתח חסר) נבדל
--     מ«אין היכן לסמן» (null).
--
-- (2) ⚠️ ההתאמה הראשונה של המערך היא אותה התאמה בדיוק, ובבנייה ולא בהבטחה:
--     האיטרציה הראשונה בלולאה היא position(lower(v_q) in lower(note)) — אותו
--     ביטוי מילה במילה שמחשב את note_match_pos. אין כאן כלל התאמה שני, ולכן
--     אין מה שיחלוק. זו התשובה להכרעה (3) של 0097 ולהכרעה (3) של 0100: מה
--     שנוסף הוא המשך של אותה סריקה, לא סריקה מקבילה.
--
-- (3) ⚠️ בלי חפיפה, משמאל לימין — נמדד ולא הונח. «אא» בתוך «אאאא» מחזיר [1,3]
--     ולא [1,2,3], ובתוך «אאא» מחזיר [1] ולא [1,2]. הסיבה אינה נוחות: מסך
--     שמדגיש שתי התאמות חופפות מצייר את אותו תו פעמיים, ואדם שסופר סימנים היה
--     קורא «שתיים» על מילה אחת. הסריקה מתקדמת באורך המונח אחרי כל פגיעה — כפי
--     שקורא אנושי סופר.
--
-- (4) ⚠️ שמירה על הגבולות של lower, ולא אמונה בה. position פועל על המחרוזת
--     שהומרה לאותיות קטנות, והמסך חותך את המחרוזת המקורית — ולכן אם ההמרה מזיזה
--     ולו אינדקס אחד, כל מיקום שיוחזר מצביע על תו אחר. נמדד: char_length('İ')
--     הוא 1 ו-char_length(lower('İ')) הוא 2. במקרה כזה התשובה היא null — «איני
--     יודע היכן» — ולא מספר. ⚠️ ונאמר ולא נבלע: זו החמרה מעבר ל-0100. באותו
--     קלט note_match_pos עדיין יחזיר מספר ו-note_match_pos_all יחזיר null; 0100
--     אינה נגעת כאן, ואי-ההסכמה נרשמת ואינה מוסתרת. אין תו כזה בשום נימוק
--     שנמדד — הכתיבה כאן היא עברית ואנגלית — ולכן זו שמירה ולא תיקון.
--
-- (5) ⚠️ [] אינו מגיע ללקוח. הפונקציה מחזירה מערך ריק כאשר לא נמצאה ולו התאמה
--     אחת, ו-nullif הופך אותו ל-null — כלומר הענף שבו ilike אמר true ו-position
--     לא מצא דבר (0100 הכרעה (2), שתי מדידות שחולקות) מקבל כאן את אותה תשובה
--     בדיוק שהוא מקבל שם: null. שתי תשובות שונות על אותו מצב היו מזמינות מסך
--     שמסמן לפי אחת ומודיע לפי השנייה.
--
-- (6) בלי תקרה מומצאת. הלולאה מתקדמת לפחות באורך המונח (≥1) בכל סיבוב, והטקסט
--     חסום — 0090 אוכפת 500 תווים בכתיבה — ולכן היא נעצרת מעצמה. נמדד על
--     המקרה הקיצוני: מונח בן שני תווים על טקסט בן 500 מחזיר 250 מיקומים ונעצר.
--     מספר שרירותי שהיה נכתב כאן היה חותך תשובה אמיתית בשקט.
--
-- (7) ⚠️ פונקציה נפרדת, ו-revoke מפורש עליה. פונקציה חדשה ב-public מקבלת
--     execute ל-anon ול-authenticated מברירת המחדל של הפרויקט — נמדד ולא הונח,
--     בפונקציית בדיקה שנוצרה ונמחקה: ה-ACL שלה יצא
--     {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,
--     service_role=X/postgres}. זה בדיוק מה ש-drop-function-regrants-anon-execute
--     מזהיר עליו, וה-revoke כאן הוא מה שמשאיר את הפונקציה החדשה עם אותו ACL
--     בדיוק של 13 האחרות. ⚠️ והיא אינה security definer ואינה צריכה להיות: היא
--     אינה נוגעת בטבלה, ובתוך admin_case (שהיא definer) בדיקת ההרשאה נעשית מול
--     הבעלים.
--
-- (8) create or replace ולא drop+create על admin_case — אותה חתימה (bigint,
--     text) בדיוק, ורק הגוף גדל. 0100 הכרעה (7) באותו מקום ומאותה סיבה: drop
--     מוחק את ה-ACL ו-alter default privileges היה מחזיר execute ל-anon.
--     הבסיס שנמדד לפני: proacl {postgres=X/postgres,service_role=X/postgres},
--     anon false, authenticated false, service_role true.
--
-- מה נמדד אחרי, על אותה פנייה ואותן שלוש שורות בדיוק:
--   admin_case(408,'email')      → 138 true/1/5/[1,26], 139+140 false/null/null/null
--   admin_case(408,'טופס')       → 139 true/1/4/[1,7,17], 138+140 false/null/null/null
--   admin_case(408,'המס הקודמת') → 140 true/28/10/[28]
--   admin_case(408)              → שלוש שורות false/null/null/null   (בקרה — אין מונח)
--   admin_case(408,'  טופס  ')   → 139 true/1/4/[1,7,17]             (בקרה — btrim)
--   admin_case(408,'%')          → שלוש שורות false/null/null/null   (בקרה — 0094)
--   admin_case(408,'zzzz')       → שלוש שורות false/null/null/null   (בקרה)
-- ובכולן note_matched, note_match_pos ו-note_match_len לא זזו ולו בשורה אחת
-- מהערך שהחזירו לפני המיגרציה, ו-status_history נשאר שלוש שורות באותו סדר —
-- כלומר השדה מתאר ואינו מסנן.
--
-- מה שלא נבנה ונאמר במפורש: אין הדגשה של השנייה ואילך במסך —
-- apps/37-bkalot-clone/admin.html אינה נגעה, fillNoteText עדיין קוראת
-- note_match_pos ו-note_match_len בלבד ומציירת mark אחד, וה-title שלה עדיין
-- אומר «ההתאמה הראשונה»; המסך הוא הלבנה הבאה ואחריו הפריסה. אין ציטוט חתום של
-- הקטע; אין ספירת ההתאמות ברשימת העבודה (0098 סופרת נימוקים, לא התאמות בתוכם);
-- אין סימון מקביל על note של הפנייה עצמה (0096 הכרעה (2) עומדת במקומה); אין
-- חיפוש ב-cases.note; ואין סימון על שמות המכריעים.
-- ⚠️ והשער אינו נוגע: v9 קורא את הפונקציה ומחזיר את גופה כפי שהוא, ולכן המפתח
-- החדש עובר בלי פריסת edge function — כפי שנמדד ב-0099 עם queue_total וב-0100
-- עם שני המפתחות האלה.
--
-- 🚫 מצב טסט: המיגרציה נוגעת בפונקציות קריאה בלבד. אין בה כתיבה, אין עמודה
--    חדשה, אין backfill, אין נגיעה ב-outbound_queue, ב-delivery_log ולא בשום
--    ערוץ שליחה, ולא יוצאת ממנה ולו הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

-- הכרעה (7): פונקציה נפרדת, immutable, ובלי security definer — היא אינה נוגעת
-- בטבלה. הכרעות (2)(3)(4)(5)(6) יושבות כולן בגוף הזה.
create or replace function public.bkalot_clone_note_match_positions(p_note text, p_q text)
returns jsonb
language plpgsql
immutable
set search_path to ''
as $fn$
declare
  v_note_l text;
  v_q_l    text;
  v_len    int;
  v_from   int := 1;
  v_hit    int;
  v_out    jsonb := '[]'::jsonb;
begin
  -- אין טקסט או אין מונח — אין שאלה. null ולא [], כי «לא נשאלתי» אינו «חיפשתי
  -- ולא מצאתי».
  if p_note is null or p_q is null then
    return null;
  end if;

  -- ⚠️ המונח מגיע אחרי btrim (0097 הכרעה (1)), ולכן מחרוזת ריקה כאן פירושה
  -- «רווחים בלבד». position היה מחזיר עליה 1 בכל טקסט — כלומר מסמן תו שאיש לא
  -- חיפש. הקורא ב-admin_case כבר חסם את זה ב-nullif, וזו שכבה שנייה.
  v_len := char_length(p_q);
  if v_len = 0 then
    return null;
  end if;

  v_note_l := lower(p_note);
  v_q_l    := lower(p_q);

  -- הכרעה (4): שמירה על הגבולות של lower. אם ההמרה הזיזה ולו אינדקס אחד, כל
  -- מיקום שיוחזר מצביע על תו אחר במחרוזת שהמסך חותך. אז null, לא מספר.
  if char_length(v_note_l) <> char_length(p_note) or char_length(v_q_l) <> v_len then
    return null;
  end if;

  -- הכרעות (2)(3)(6): אותו position בדיוק של note_match_pos בסיבוב הראשון,
  -- ואז קדימה באורך המונח — בלי חפיפה, ובלי תקרה, כי v_from עולה ב-v_len ≥ 1
  -- בכל סיבוב והטקסט חסום.
  loop
    exit when v_from > char_length(v_note_l);
    v_hit := position(v_q_l in substr(v_note_l, v_from));
    exit when v_hit = 0;
    v_out  := v_out || to_jsonb(v_from + v_hit - 1);
    v_from := v_from + v_hit - 1 + v_len;
  end loop;

  return v_out;
end;
$fn$;

-- הכרעה (7): בלי זה ה-anon מקבל execute מברירת המחדל של הפרויקט. נמדד, לא הונח.
revoke all on function public.bkalot_clone_note_match_positions(text, text)
  from public, anon, authenticated;

comment on function public.bkalot_clone_note_match_positions(text, text) is
  'כל מיקומי המונח בתוך הטקסט, 1-מבוסס, בלי חפיפה, משמאל לימין. null כשאין טקסט/מונח או כש-lower מזיז אינדקסים. 0101.';

-- הכרעה (8): אותה חתימה, ולכן replace ולא drop — וה-ACL אינו נוגע.
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
                 -- ושלושת השדות שאחריה מתארים את מה שהיא כבר קבעה.
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
                 -- ⚠️ 0101 אינה נוגעת בשורה הזו: היא נשארת ההתאמה הראשונה בלבד,
                 -- והמפתח החדש שלמטה הוא תוספת ולא החלפה.
                 'note_match_pos',
                     case when v_q is not null and h.note is not null
                           and h.note ilike '%' || v_q_like || '%' escape '\'
                          then nullif(position(lower(v_q) in lower(h.note)), 0)
                     end,
                 -- 0100 הכרעה (5): אורך המונח בתווים, מהשרת ואחרי ה-btrim.
                 -- מוחזר רק עם מיקום — אורך בלי «מהיכן» אינו קטע ואינו ניתן
                 -- להדגשה, ושני מספרים שאחד מהם null היו מזמינים חשבון בלקוח.
                 -- ⚠️ והוא אחד לכל המיקומים שבמערך שלמטה: המונח אחד, ואורכו אחד.
                 'note_match_len',
                     case when v_q is not null and h.note is not null
                           and h.note ilike '%' || v_q_like || '%' escape '\'
                           and position(lower(v_q) in lower(h.note)) > 0
                          then v_q_len
                     end,
                 -- 0101 — הכרעות (1)(2)(3)(5): כל המיקומים, ולא רק הראשון.
                 -- אותו תנאי בדיוק של note_match_pos — מחושב רק היכן ש-ilike כבר
                 -- אמר true, ועל v_q הגולמי — ולכן שני השדות נדלקים ונכבים יחד.
                 -- ⚠️ nullif(...,'[]') הוא הכרעה (5): מערך ריק אינו מגיע ללקוח,
                 -- והענף שבו ilike אמר true ו-position לא מצא דבר מקבל כאן את
                 -- אותה תשובה בדיוק שהוא מקבל למעלה — null.
                 'note_match_pos_all',
                     case when v_q is not null and h.note is not null
                           and h.note ilike '%' || v_q_like || '%' escape '\'
                          then nullif(public.bkalot_clone_note_match_positions(h.note, v_q),
                                      '[]'::jsonb)
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
