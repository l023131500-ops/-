-- 0083 — שורת המסמך אינה אומרת מי הפיק אותה
-- (§5ב)
--
-- מה היה, ומי כתב את הקו הזה: 0076 סגרה את «מי הכריע» על cases, וכל פעימה מאז
-- (0077, 0078, 0079, 0080, 0081, 0082 וכל פעימות המסך שביניהן) חזרה בסעיף
-- «פתוח» שלה על אותו משפט מילה במילה: «מי הפיק» על documents אינו נכתב לשום
-- מקום. כאן נבנה המקום שאליו הוא נכתב.
--
-- למה זו תקלת מוצר ולא הערה על סכמה: מסמך הוא הדבר היחיד בשכפול שנועד לצאת
-- החוצה אל אדם אמיתי. bkalot_clone_queue לוקחת את הגוף כמות שהוא (0067 הכרעה 5)
-- ומכניסה אותו לתור, ומרגע שיהיה שולח — מה שכתוב בשורה הוא מה שייקרא. היום
-- שורת documents אומרת מתי הופקה (created_at, updated_at), באיזו תבנית
-- (template_key, 0074) ואם נפלה לנוסח הנפילה — ולא אומרת מי לחץ «הפק». מנהל
-- שני שקורא מסמך שנוסחו שגוי אינו יכול לדעת מי הפיק אותו, וגם לא מי הפיק מחדש
-- על גביו: on conflict do update דורס את הגוף הקודם, כלומר אפילו העדות
-- העקיפה — שני מסמכים — אינה קיימת. במערכת שיש בה יותר ממשתמש ניהול אחד זו
-- אותה הכחשה שאי אפשר להפריך שנסגרה על cases ב-0076, על השורה שדווקא היא
-- יוצאת החוצה.
--
-- מה נבנה כאן: עמודה אחת על documents, ו-bkalot_clone_render כותבת אותה.
-- מיגרציה בלבד — apps/37 לא נגעה, bkalot-clone-admin נשארת v7,
-- supabase/functions לא נגעה ואין פריסת פורטל. העברת הזהות מהשער אל render
-- (v8), החזרתה בקריאת המסמך והצגתה במסך הן הלבנים הבאות — אותו פיצול בדיוק
-- כמו 0076 → v7 → 0077.
--
-- שש הכרעות:
--
-- (1) הזהות אינה נוסעת בתוך p. render מקבלת ארגומנט שני, p_admin_id, ולא מפתח
--     admin_id בתוך ה-jsonb — וזו ההכרעה שקונה את כל השאר, וזו הכרעה (1) של
--     0076 מילה במילה. נתיב /render ב-bkalot-clone-admin מעביר את גוף הבקשה
--     כפי שהוא ובכוונה בלי סינון מפתחות ומוסיף לו site_url בלבד (כך נכתב שם).
--     מפתח admin_id בתוך p היה מגיע מהדפדפן, כלומר כל מחזיק טוקן היה חותם
--     מסמך בשם מנהל אחר — ורישום זהות שניתן לזיוף גרוע מהיעדר רישום, כי הוא
--     נראה בדיוק כמו האמת. ארגומנט שני אינו נגיש מהגוף: ה-edge בונה את
--     אובייקט הארגומנטים בעצמו.
--
-- (2) עמודה אחת ולא שתיים, בשונה מ-0076. שם נדרש decided_at כי «האם הייתה
--     הכרעת אדם» היה מצב שלישי שאיש לא ידע לומר — הטריגר מזיז את updated_at
--     בעצמו. כאן אין מצב שלישי: שורת documents קיימת אך ורק מפני ש-render
--     יצרה אותה, ו-render היא הכותבת היחידה של updated_at (bkalot_clone_queue
--     נוגעת בשורה — queue_id — ואינה נוגעת ב-updated_at; נמדד בקוד שלה ולא
--     הונח). כלומר «מתי הופק» כבר כתוב, ועמודת produced_at הייתה עותק שני של
--     updated_at שיסתעף ממנו בשקט ביום שבו כותב נוסף ייגע בשורה.
--
-- (3) המסמך נכתב גם כשהזהות אינה ידועה, ולא נמנע. produced_by נשאר null,
--     ו«הופק ואיננו יודעים מי» הוא נתון אמיתי — זהו בדיוק מצב הייצור היום:
--     bkalot-clone-admin v7 קוראת ל-render עם ארגומנט אחד, ולכן כל לחיצה על
--     «הפק» כותבת null. הכרעה (3) של 0076, ואותו טעם: להמתין עם הכתיבה עד
--     v8 היה מוחק גם את מה שכן ידוע.
--
-- (4) produced_by הוא bigint ואינו מפתח זר ל-admin_users — הכרעה (4) של 0076
--     ו-(1) של 0074 מאותו טעם: זהו רישום של הפקה שהייתה ולא מצביע חי.
--     ON DELETE SET NULL היה מוחק את שם המפיק מכל מסמך שהפיק ברגע שהחשבון שלו
--     נסגר, ו-RESTRICT היה הופך סגירת חשבון לבלתי אפשרית. השם ייפתר ב-LEFT
--     JOIN בצד הקריאה ויוחזר null כששורת המנהל אינה קיימת.
--
-- (5) הפקה חוזרת דורסת את produced_by בערך שהתקבל, כולל null, ואינה משמרת את
--     הקודם. on conflict do update דורס את הגוף — title, body_html, body_text,
--     template_key ו-updated_at — ולכן «מי הפיק» חייב לתאר את מי שהפיק את הגוף
--     שיושב בשורה עכשיו. coalesce על הערך הקודם היה מייחס למנהל הראשון גוף
--     שמנהל שני כתב, וזה שקר שאי אפשר להבחין בו. זהו ההפך מהכרעה (5) של 0076
--     ובמתכוון: שם קריאה חוזרת עם אותו ערך אינה אירוע כלל ואינה כותבת דבר,
--     כאן כל הפקה כותבת גוף חדש ולכן היא תמיד אירוע.
--
-- (6) אין כאן טבלת יומן ולא היסטוריה. העמודה אומרת את ההפקה האחרונה בלבד,
--     והפקה קודמת נדרסת — הכרעה (6) של 0076. הקו הזה נשאר פתוח ומוצהר: «מי
--     הפיק קודם» אינו נשמר.
--
-- ⚠️ ה-DROP: הוספת ארגומנט שני יוצרת חתימה חדשה, ו-create or replace היה משאיר
--    את bkalot_clone_render(jsonb) הישנה לצד החדשה — שתי פונקציות באותו שם,
--    וקריאה עם ארגומנט אחד הופכת ל-function is not unique. כלומר נתיב /render
--    החי, שקורא היום עם ארגומנט אחד בדיוק, היה נשבר בלי ששום דבר כאן ידווח
--    שגיאה. לכן drop ואז create. וההשלכה השנייה של ה-drop: drop מוחק את ה-ACL.
--    create or replace שומר הרשאות ו-drop+create אינו — פונקציה חדשה ב-public
--    מקבלת EXECUTE ל-PUBLIC כברירת מחדל, ובלי ה-revoke שלמטה היה כאן רגע שבו
--    כל מחזיק מפתח anon יכול להפיק מסמך על כל פנייה במערכת ולקרוא את גופו
--    בתשובה — כלומר לשאוב שם, טלפון ומייל של פונים אמיתיים.
--
-- 🚫 מצב טסט: הפונקציה נוגעת ב-bkalot_clone.documents ותו לא, וממשיכה להחזיר
--    queued=false ו-queue_id null. אין כאן נגיעה ב-outbound_queue,
--    ב-delivery_log ולא בשום ערוץ שליחה, ואין בה net.http, אין pg_net ואין ולו
--    קריאה יוצאת אחת.
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud.

alter table bkalot_clone.documents
  add column if not exists produced_by bigint;

-- אין מילוי לאחור, ולא משום ששכחנו: documents ריקה היום (נמדד: 0 שורות), ואין
-- ולו שורה אחת שאפשר למלא ממנה. גם לו הייתה — אין במסד שום נתון שאומר מי לחץ
-- «הפק», ומילוי מהמנהל היחיד שקיים היה ממציא ייחוס.

comment on column bkalot_clone.documents.produced_by is
  'מזהה משתמש הניהול שהפיק את הגוף שיושב בשורה עכשיו. null = ההפקה נעשתה בלי שהשער העביר זהות (מצב bkalot-clone-admin v7). נדרס בכל הפקה חוזרת, כמו הגוף עצמו. אינו FK: רישום ולא מצביע (0083 הכרעות 4, 5).';

-- ── render כותבת את העמודה ────────────────────────────────────────────────────
-- ראה ⚠️ למעלה: drop ואז create, ולא create or replace.
drop function if exists public.bkalot_clone_render(jsonb);

create function public.bkalot_clone_render(p jsonb, p_admin_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_case_raw   text := nullif(btrim(p->>'case_id'), '');
  v_case       bigint;
  v_key_given  text := nullif(btrim(p->>'template_key'), '');
  v_key        text;
  v_site       text := coalesce(nullif(btrim(p->>'site_url'), ''), 'https://more30.com/bkalot-studio');
  v_kind       text;
  v_topic      integer;
  v_situation  text;
  v_sit_label  text;
  v_note       text;
  v_created    timestamptz;
  v_name       text;
  v_phone      text;
  v_email      text;
  v_subject    text;
  v_text       text;
  v_html       text;
  v_enabled    boolean;
  v_fallback   boolean := false;
  v_chosen     integer := 0;
  v_count      integer := 0;
  v_src        text;
  v_list_text  text := '';
  v_list_html  text := '';
  v_vars_text  jsonb;
  v_vars_html  jsonb;
  v_k          text;
  v_v          text;
  v_open       text;
  v_close      text;
  v_unresolved text[];
  v_doc        bigint;
begin
  if v_case_raw is null or v_case_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
  end if;
  v_case := v_case_raw::bigint;

  -- LEFT JOIN ולא JOIN: cases_contact_id_fkey הוא ON DELETE SET NULL, ופנייה
  -- מיותמת חייבת עדיין להיות ניתנת להפקה — אחרת היא נעלמת בשקט (#223).
  select c.kind, c.topic_no, c.situation, c.note, c.created_at,
         ct.full_name, ct.phone, ct.email
    into v_kind, v_topic, v_situation, v_note, v_created, v_name, v_phone, v_email
    from bkalot_clone.cases c
    left join bkalot_auto.contacts ct on ct.id = c.contact_id
   where c.id = v_case;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', v_case);
  end if;

  -- השם העברי של המצב (0065/#232). מצב שאין לו שם נופל למפתח ולא נעלם: מסמך
  -- שחסרה בו מילה גרוע ממסמך שיש בו מילה אנגלית, ושניהם נראים בתשובה.
  if v_situation is not null then
    select nullif(btrim(sm.name_he), '')
      into v_sit_label
      from rights.situation_map sm
     where sm.situation = v_situation;
  end if;
  v_sit_label := coalesce(v_sit_label, v_situation, '');

  -- הזכויות: הנבחרות אם מישהו בחר, אחרת כל הרשימה המדורגת.
  select count(*) filter (where r.chosen), count(*)
    into v_chosen, v_count
    from bkalot_clone.case_rights r
   where r.case_id = v_case;

  if v_chosen > 0 then
    v_src := 'chosen';
    v_count := v_chosen;
  else
    v_src := 'all';
  end if;

  select coalesce(string_agg(format('%s. %s (%s)', x.n, x.nm, x.code), E'\n' order by x.n), ''),
         case when count(*) = 0 then ''
              else '<ul>' || string_agg('<li>' || bkalot_clone.html_escape(x.nm) ||
                                        ' <span dir="ltr">(' || bkalot_clone.html_escape(x.code) || ')</span></li>',
                                        '' order by x.n) || '</ul>' end
    into v_list_text, v_list_html
    from (select row_number() over (order by r.rank nulls last, r.right_code) as n,
                 r.right_code as code,
                 coalesce(cat.name, r.right_code) as nm
            from bkalot_clone.case_rights r
            left join rights.catalog cat on cat.code = r.right_code
           where r.case_id = v_case
             and (v_src = 'all' or r.chosen)) x;

  -- ברירת המחדל של המפתח נגזרת מסוג הפנייה, כי הסוג הוא שקובע מה יש בכלל לומר.
  v_key := coalesce(v_key_given,
                    case when v_kind = 'treatment' then 'rights_treatment_reply'
                         else 'general_inquiry_reply' end);

  select t.subject, t.body_text, t.body_html, t.enabled
    into v_subject, v_text, v_html, v_enabled
    from bkalot_clone.templates t
   where t.key = v_key;

  if not found then
    if v_key_given is not null then
      -- מפתח שנמסר במפורש ואינו קיים הוא שגיאת קורא, ונוסח נפילה היה מסתיר אותה.
      return jsonb_build_object(
        'ok', false, 'error', 'template_unknown', 'template_key', v_key,
        'allowed', (select coalesce(jsonb_agg(t.key order by t.key), '[]'::jsonb)
                      from bkalot_clone.templates t));
    end if;
    v_fallback := true;
  elsif not v_enabled then
    if v_key_given is not null then
      return jsonb_build_object('ok', false, 'error', 'template_disabled', 'template_key', v_key);
    end if;
    v_fallback := true;
  end if;

  -- נוסח הנפילה: המקום היחיד בפונקציה שיש בו עברית, ובכוונה — שורת תבנית חסרה
  -- או מנוטרלת לא תייצר מסמך ריק (BKALOT_METHOD §3).
  if v_fallback then
    v_subject := 'בקלות — קיבלנו את פנייתך (פנייה {{caseId}})';
    v_text    := E'שלום {{fullName}},\n\nקיבלנו את פנייתך (מספר {{caseId}}). נחזור אליך לטלפון {{phone}}.\n\nבברכה,\nצוות בקלות';
    v_html    := '<div dir="rtl" lang="he"><p>שלום {{fullName}},</p><p>קיבלנו את פנייתך (מספר {{caseId}}). נחזור אליך לטלפון {{phone}}.</p><p>בברכה,<br>צוות בקלות</p></div>';
  end if;

  v_vars_text := jsonb_build_object(
    'fullName',    coalesce(v_name, ''),
    'phone',       coalesce(v_phone, ''),
    'email',       coalesce(v_email, ''),
    'caseId',      v_case::text,
    'topicNo',     coalesce(v_topic::text, ''),
    'situation',   v_sit_label,
    'note',        coalesce(v_note, ''),
    'createdAt',   to_char(v_created at time zone 'Asia/Jerusalem', 'DD/MM/YYYY'),
    'rightsCount', v_count::text,
    'rightsList',  v_list_text,
    'siteUrl',     v_site);

  -- אותם מפתחות, ערכים מוגני-HTML. rightsList הוא היחיד שנכנס כ-markup, והוא
  -- נבנה כאן משמות שכבר עברו escape ואינו מגיע מהפונה.
  v_vars_html := (select jsonb_object_agg(e.key,
                           case when e.key = 'rightsList' then v_list_html
                                else bkalot_clone.html_escape(e.value) end)
                    from jsonb_each_text(v_vars_text) e);

  -- ── מקטע מותנה: {{#key}}…{{/key}} (0066) ────────────────────────────────────
  -- לפני החלפת המציינים ולא אחריה: כך אין רגע שבו טקסט של הפונה יושב בגוף
  -- וסימני מקטע עדיין נפתרים. שמות המפתחות באים מ-v_vars_text שנבנה כאן,
  -- ולכן אינם יכולים להזריק רגקס. הבדיקה על הערך הטקסטואלי — escape של ריק
  -- הוא ריק, ולכן אותה הכרעה תופסת גם ל-HTML.
  for v_k, v_v in select e.key, e.value from jsonb_each_text(v_vars_text) e loop
    v_open  := '\{\{#' || v_k || '\}\}';
    v_close := '\{\{/' || v_k || '\}\}';
    if length(btrim(v_v)) > 0 then
      v_subject := regexp_replace(v_subject, v_open || '(.*?)' || v_close, '\1', 'g');
      v_text    := regexp_replace(v_text,    v_open || '(.*?)' || v_close, '\1', 'g');
      v_html    := regexp_replace(v_html,    v_open || '(.*?)' || v_close, '\1', 'g');
    else
      v_subject := regexp_replace(v_subject, v_open || '.*?' || v_close, '', 'g');
      v_text    := regexp_replace(v_text,    v_open || '.*?' || v_close, '', 'g');
      v_html    := regexp_replace(v_html,    v_open || '.*?' || v_close, '', 'g');
    end if;
  end loop;

  for v_k, v_v in select e.key, e.value from jsonb_each_text(v_vars_text) e loop
    v_subject := replace(v_subject, '{{' || v_k || '}}', v_v);
    v_text    := replace(v_text,    '{{' || v_k || '}}', v_v);
  end loop;

  for v_k, v_v in select e.key, e.value from jsonb_each_text(v_vars_html) e loop
    v_html := replace(v_html, '{{' || v_k || '}}', v_v);
  end loop;

  -- מה שנשאר הוא מציין שאין לו ערך, או סימן מקטע שאין לו זוג: מדווח, ואז מוסר.
  select coalesce(array_agg(distinct m.m[1]), '{}')
    into v_unresolved
    from unnest(array[v_subject, v_text, v_html]) as s(t)
    cross join lateral regexp_matches(s.t, '\{\{([#/]?[A-Za-z0-9_]+)\}\}', 'g') as m(m);

  v_subject := regexp_replace(v_subject, '\{\{[#/]?[A-Za-z0-9_]+\}\}', '', 'g');
  v_text    := regexp_replace(v_text,    '\{\{[#/]?[A-Za-z0-9_]+\}\}', '', 'g');
  v_html    := regexp_replace(v_html,    '\{\{[#/]?[A-Za-z0-9_]+\}\}', '', 'g');

  -- מציין ריק (הערה שאין) משאיר שורות ריקות; שלוש ומעלה מתקפלות לשתיים.
  v_text := btrim(regexp_replace(v_text, E'\n{3,}', E'\n\n', 'g'));

  if length(btrim(coalesce(v_subject, ''))) = 0 or length(coalesce(v_text, '')) = 0 then
    return jsonb_build_object('ok', false, 'error', 'render_empty', 'template_key', v_key);
  end if;

  -- 0074: שלושת השדות בשני הענפים (הכרעה 4). v_key הוא מה שנפתר בפועל, ו-
  -- v_fallback אומר אם הגוף בא ממנו או מנוסח הנפילה שכאן (הכרעה 2).
  -- 0083: produced_by נכתב כפי שהתקבל, כולל null, ונדרס בהפקה חוזרת יחד עם
  -- הגוף — ראה הכרעות (3) ו-(5). coalesce עם הערך הקודם היה מייחס למנהל
  -- הראשון גוף שמנהל שני כתב.
  insert into bkalot_clone.documents (case_id, kind, title, body_html, body_text,
                                      template_key, template_fallback, produced_by, updated_at)
  values (v_case, 'email', v_subject, v_html, v_text,
          v_key, v_fallback, p_admin_id, now())
  on conflict (case_id, kind) do update
    set title             = excluded.title,
        body_html         = excluded.body_html,
        body_text         = excluded.body_text,
        template_key      = excluded.template_key,
        template_fallback = excluded.template_fallback,
        produced_by       = excluded.produced_by,
        updated_at        = now()
  returning id into v_doc;

  return jsonb_build_object(
    'ok',                      true,
    'document_id',             v_doc,
    'case_id',                 v_case,
    'template_key',            v_key,
    'fallback',                v_fallback,
    'subject',                 v_subject,
    'rights_count',            v_count,
    'rights_source',           v_src,
    -- מה שהודפס בפועל במקום {{situation}}. שווה למפתח = אין שם עברי במסד.
    'situation_label',         v_sit_label,
    'text_chars',              length(v_text),
    'html_chars',              length(v_html),
    -- מי נכתב לשורה זה עתה. null אומר «הופק ואיננו יודעים מי» ואינו הושמט,
    -- כדי שהקורא יראה את ההבדל בין «לא הועברה זהות» לבין «השדה אינו קיים».
    'produced_by',             p_admin_id,
    'placeholders_unresolved', to_jsonb(v_unresolved),
    -- מצב טסט: ההפקה נעצרת כאן. queue_id נשאר null ו-outbound_queue לא נגעה.
    'queued',                  false);
end;
$fn$;

comment on function public.bkalot_clone_render(jsonb, bigint) is
  'שכבה 3 של שכפול בקלות: הפקת מסמך מייל לפנייה — תבנית, מציינים, מקטעים מותנים ורשימת זכויות. '
  'מצב טסט: כותבת ל-documents בלבד ומחזירה queued=false. אין בה בדיקת זהות — service_role בלבד, '
  'השער יושב ב-bkalot-clone-admin. p_admin_id הוא ארגומנט שני ולא מפתח ב-p, כדי שגוף הבקשה '
  'מהדפדפן לא יוכל למלא אותו (0063, 0074, 0083).';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- ראה ⚠️ למעלה: ה-DROP מחק את ה-ACL, ולכן ה-revoke הזה אינו טקס אלא הדבר היחיד
-- שמונע מכל מחזיק מפתח anon להפיק מסמך על כל פנייה במערכת ולקרוא בתשובה את שם
-- הפונה, הטלפון והמייל שלו.
revoke all on function public.bkalot_clone_render(jsonb, bigint) from public, anon, authenticated;
grant execute on function public.bkalot_clone_render(jsonb, bigint) to service_role;
