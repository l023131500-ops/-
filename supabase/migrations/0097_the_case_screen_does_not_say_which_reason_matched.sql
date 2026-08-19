-- 0097 — שכפול בקלות שכבה 3
-- מסך הפנייה אינו אומר איזה נימוק התאים.
--
-- מי כתב את הקו הזה: 4da7665 בסופה (heartbeat 653), מילה במילה: «הלבנה הבאה:
-- אין סימן מקביל במסך הפנייה — מנהל שפותח את #371 מהרשימה שבה כתוב «נמצאה לפי
-- הנימוק» מגיע למסך שאינו אומר איזה נימוק התאים, ורצף ההכרעות יכול להחזיק יותר
-- משורה אחת». נלקח ורק הוא. נתיב «למה השורה הזו נמצאה» ברשימה נסגר מקצה לקצה
-- — המסד (0096), המסך (e73fc63) והפריסה (4da7665) — ולכן הקו הפתוח היחיד שנשאר
-- עליו הוא הצד השני של אותה לחיצה: מה קורה אחרי שפותחים את השורה.
--
-- מה היה, נמדד ולא הונח לפני המיגרציה. פנייה אחת ולא שתיים, מפני שהמדידה כאן
-- היא בתוך הפנייה ולא בין פניות. #373 (contact 380) — «אברהם ישראלי»,
-- 0501230011 — נקלטה דרך public.bkalot_clone_intake (kind=info, queued=false),
-- ומיד אחריה שלוש הכרעות ב-bkalot_clone_admin_set_status (מנהל 4), שלוש שורות
-- יומן ושלושה נימוקים שונים:
--   log 86  new → in_progress  «הפונה ביקש לצרף מסמכים נוספים בשבוע הבא»
--   log 87  in_progress → rejected  «המסמכים שצורפו שייכים לשנת המס הקודמת»
--   log 88  rejected → closed  «הטופס נשלח בדואר רשום על ידי הפונה»
--
-- ואז נקראו שתי הפונקציות זו אחר זו, כפי שמנהל קורא אותן — הרשימה ואז הפנייה:
--   bkalot_clone_admin_cases({q:'המס הקודמת'})
--       → total 1, ids [373], matched_in_note true   ⇐ הרשימה יודעת
--   bkalot_clone_admin_case(373)
--       → status_history: 3 שורות (86, 87, 88), ובאף אחת מהן אין מפתח
--         note_matched כלל                            ⇐ הכשל
--
-- כלומר: הרשימה אומרת למנהל «הפנייה הזו נמצאה בזכות נימוק», הוא לוחץ עליה כדי
-- לקרוא אותו — וזה בדיוק מה שהסימן מבקש ממנו לעשות, מילה במילה: «פתחו את
-- הפנייה כדי לקרוא אותו» — ומקבל שלושה נימוקים בלי לדעת באיזה מהם מדובר. עם
-- שורה אחת ההבדל אינו נראה; זו בדיוק הסיבה שהמדידה כאן בנתה שלוש.
--
-- למה זה חשוב ולא ליטוש: 0096 והלבנים שאחריה קנו למנהל את היכולת לשאול «אילו
-- פניות נדחו בגלל שנת מס» ולקבל תשובה. מה שהן לא קנו הוא את השלב שאחריו. פנייה
-- שהתגלגלה בין מכריעים מחזיקה רצף הכרעות, ו-0095 דואגת שכל דחייה תוסיף לו עוד
-- אחת — כלומר ככל שהמערכת עובדת נכון, כך הרצף ארוך יותר, וכך קשה יותר למצוא בו
-- את השורה שבגללה הפנייה בכלל עלתה ברשימה. הסימן ברשימה מפנה את הקורא פנימה,
-- והמסד שולח אותו לחפש בעיניים.
--
-- מה נבנה: פרמטר שני עם ברירת מחדל, ושדה אחד על כל שורת יומן. שבע הכרעות:
--
-- (1) אותו q של הרשימה עובר פנימה, ולא תיבת חיפוש שנייה במסך הפנייה. הקורא כאן
--     אינו מחפש — הוא כבר חיפש, וזו אותה שאלה בדיוק שהמשיכה מהשורה. תיבה שנייה
--     הייתה מבקשת ממנו להקליד שוב את מה שהוא כבר הקליד, ותשובה שאינה תלויה במה
--     שהוקלד היא תשובה לשאלה אחרת.
--
-- (2) על שורת היומן ולא על הפנייה. 0096 עונה על הפנייה — exists, כן/לא — וזה
--     בדיוק מה שהרשימה צריכה. כאן השאלה הפוכה: הפנייה כבר ידועה, ומה שאינו ידוע
--     הוא איזו משורותיה. דגל שני ברמת הפנייה היה חוזר על מה שכבר נאמר בשורה
--     שממנה הגיעו.
--
-- (3) v_q_like ו-escape '\', מילה במילה כמו 0094 וכמו הענף של 0096. פרמטר חדש
--     שהיה מקבל את הטקסט הגולמי היה מחזיר את הכשל של 0094 מהדלת האחורית: '%'
--     היה מסמן את כל שורות היומן כמותאמות, כלומר הופך את הסימן לרעש בדיוק
--     במקום שבו הוא אמור להצביע.
--
-- (4) המפתח קיים תמיד ואינו מושמט — jsonb_build_object אינו מדלג על ערכים —
--     ולכן «לא התאימה» (false) נבדל מ«שרת מלפני 0097» (המפתח חסר). זו הכרעה (2)
--     ו-(3) של 0091 באותו מקום בדיוק, ומאותו טעם: מסך שאינו יכול לדעת אינו
--     אמור לצייר «לא».
--
-- (5) coalesce(..., false) ולא בלעדיו — שורת יומן בלי נימוק (מעבר שהמכריע לא
--     נימק, וזה מותר בכל מעבר שאינו rejected) מחזירה null מה-ilike, ובלי
--     coalesce «לא התאימה» היה חוזר null ונקרא כמו «איני יודע». זו בדיוק תקלת
--     הכרעה (7) של 0096, כאן על השדה השני שנשען עליה.
--
-- (6) בלי מונח חיפוש — הקריאה הרגילה, שהיא רוב הקריאות — כל השורות מקבלות
--     false והמסך שותק. אותו כלל של 0096: הסימן מסביר למה השורה נמצאה, ומי
--     שפתח פנייה בלי לחפש לא שאל את השאלה הזו.
--
-- (7) drop ואז create, ולא create or replace ולא עומס (overload). זו ההכרעה
--     היחידה כאן שאינה על התוכן, והיא נאמרת במפורש מפני שהיא זו שיכולה להפיל
--     את המסך: PostgREST בוחר פונקציה לפי שמות הארגומנטים, ושתי חתימות
--     — (bigint) ו-(bigint, text) — היו שתיהן מתאימות ל-{p_id} ומחזירות
--     «Could not choose the best candidate function», כלומר כל מסך פנייה נכבה.
--     ומכיוון שיש ברירת מחדל, השער הפרוס (v8) ממשיך לקרוא {p_id} בלבד בלי שינוי
--     ומקבל בדיוק את מה שקיבל קודם — כלומר המיגרציה הזו נפרסת לבדה.
--     ⚠️ drop מוחק גם את ה-ACL, שאותו create or replace היה שומר (כפי שנאמר
--     ב-0092), ולכן ההרשאות ניתנות כאן מחדש במפורש. הבסיס שנמדד לפני:
--     anon ו-authenticated אינם ברשימה כלל, service_role=X. בלי השתיים למטה
--     הפונקציה הייתה חוזרת לברירת המחדל שבה PUBLIC יכול להריץ אותה — כלומר
--     מפתח anon היה קורא כל פנייה, על שם הפונה, הטלפון והמייל שבתוכה.
--
-- מה נמדד אחרי, על אותה פנייה ואותן שלוש שורות בדיוק:
--   admin_case(373, 'המס הקודמת') → 86 false, 87 true, 88 false   ⇐ נסגר
--   admin_case(373, 'בדואר רשום') → 86 false, 87 false, 88 true   (הפרדה)
--   admin_case(373, 'מסמכים')     → 86 true,  87 true,  88 false  (שתיים)
--   admin_case(373)               → 86 false, 87 false, 88 false  (בקרה)
--   admin_case(373, '')           → 86 false, 87 false, 88 false  (בקרה)
--   admin_case(373, '%')          → 86 false, 87 false, 88 false  (בקרה — 0094)
--   admin_case(373, 'zzzz')       → 86 false, 87 false, 88 false  (בקרה)
-- ובכולן המפתח note_matched קיים בשלוש השורות, ו-status_history נשאר 3 שורות
-- באותו סדר — כלומר השדה מתאר ואינו מסנן.
--
-- ⚠️ הכרעה (7) נמדדה מהשער הפרוס עצמו מעל HTTP ולא בקריאת SQL, מפני שהיא הטענה
-- היחידה כאן שיכולה להכבות כל מסך פנייה בייצור: postgres בוחר פונקציה בכללים
-- שאינם כללי הבחירה של PostgREST לפי שמות ארגומנטים. התחברות אמיתית ל-v8 ואז
-- POST /bkalot-clone-admin/case עם {id:373} החזירה 200, ok=true, ארבע שורות,
-- ו-note_matched קיים בכל אחת מהן. השער לא נשבר.
--
-- ⚠️ ובאותה מדידה התברר גם מה שעוד חסר, והוא נאמר ולא נבלע: אותה קריאה עם
-- q='המס הקודמת' בגוף החזירה false בכל ארבע השורות. זו אינה תקלה במיגרציה —
-- v8 קורא rpc("bkalot_clone_admin_case", {p_id: id}) ותו לא, כלומר המונח אינו
-- מגיע אל המסד כלל. מכאן שהלבנה הבאה אינה המסך לבדו אלא השער ואז המסך: בלי
-- שהשער יעביר q, שדה חדש בכל השורות יישאר false לנצח ומי שיקרא אותו בייצור
-- יסיק שהמסד אינו יודע לסמן.
--
-- מה שלא נבנה ונאמר במפורש: השער אינו מעביר q (נמדד למעלה); אין ספירה ברמת
-- הפנייה («1 מתוך 3») — המסך יכול לגזור אותה מהשורות; אין הדגשת המילה בתוך
-- הנימוק; אין חיפוש ב-cases.note (הכרעה (2) של 0096 עומדת במקומה); אין סימון
-- מקביל על שמות המכריעים; ואין שינוי בקוד המסך —
-- apps/37-bkalot-clone/admin.html אינה נגעה, ולכן מנהל בייצור עדיין רואה את
-- הרצף בלי סימן. השער הוא הלבנה הבאה, אחריו המסך, ואחריו הפריסה.
--
-- 🚫 מצב טסט: המיגרציה נוגעת בפונקציית קריאה אחת ותו לא. אין בה כתיבה, אין
--    עמודה חדשה, אין backfill, אין נגיעה ב-outbound_queue, ב-delivery_log ולא
--    בשום ערוץ שליחה, ולא יוצאת ממנה ולו הודעה אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

-- הכרעה (7): החתימה הישנה יורדת לפני שהחדשה עולה.
drop function if exists public.bkalot_clone_admin_case(bigint);

create function public.bkalot_clone_admin_case(p_id bigint, p_q text default null)
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
  v_q_like text;
begin
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
  end if;

  v_q := nullif(btrim(coalesce(p_q, '')), '');
  if v_q is not null then
    v_q_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
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
                 'note_matched',
                     coalesce(v_q_like is not null
                              and h.note ilike '%' || v_q_like || '%' escape '\',
                              false),
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

-- הכרעה (7), ⚠️: drop מחק את ה-ACL, ושתי השורות האלה משחזרות אותו בדיוק כפי
-- שנמדד לפני — anon ו-authenticated בחוץ, service_role בפנים.
--
-- ⚠️⚠️ anon ו-authenticated נאמרים כאן בשמם, ולא נסגרים ב-«from public» בלבד.
-- זה לא ניסוח — זה נמדד: הגרסה הראשונה של השורה הזו אמרה from public בלבד,
-- והפונקציה קמה עם proacl שכולל anon=X ו-authenticated=X. הסיבה היא
-- alter default privileges של הפרויקט, שנותן execute על כל פונקציה חדשה
-- בסכמת public לשלושת התפקידים — כלומר אלה מענקים מפורשים על השם, ו-revoke
-- from public אינו נוגע בהם כלל (הוא מסיר את ההרשאה של PUBLIC ותו לא).
-- המשמעות בפועל: לרגע היה מפתח anon יכול לקרוא כל פנייה — שם הפונה, הטלפון
-- והמייל שבתוכה — דרך PostgREST, ופונקציה שהיא security definer עוקפת גם RLS.
-- זה תוקן מיד ונמדד: has_function_privilege('anon', …, 'execute') = false,
-- ל-authenticated false, ל-service_role true, ו-proacl חזר להיות
-- {postgres=X/postgres,service_role=X/postgres} — מילה במילה כפי שנמדד לפני.
-- מי שמעתיק את התבנית הזו למיגרציה הבאה: drop של פונקציה בסכמת public אינו
-- שקול ל-create or replace, גם אחרי revoke from public.
revoke all on function public.bkalot_clone_admin_case(bigint, text)
  from anon, authenticated, public;
grant execute on function public.bkalot_clone_admin_case(bigint, text) to service_role;

comment on function public.bkalot_clone_admin_case(bigint, text) is
  'פנייה אחת לקריאה. p_q הוא מונח החיפוש שממנו הגיעו מהרשימה, והוא מסמן ב-status_history איזו שורת יומן נשאה אותו (0097). בלי p_q כל השורות false והמסך שותק.';
