-- 0074 — שורת המסמך אינה אומרת איזה מכתב יושב בתוכה
-- (§5ב)
--
-- מה היה: bkalot_clone.documents נושאת title/body_html/body_text ו-created_at,
-- ואינה נושאת ולו שדה אחד שאומר מאיזו תבנית הגוף הזה הופק. עד fb607a0 זו
-- הייתה הערה על סכמה — היה מכתב אחד לכל סוג פנייה, ו-render גזר אותו מ-kind,
-- כך שהמפתח היה תמיד ניתן לשחזור מהפנייה עצמה. מרגע שלבורר במסך הניהול יש
-- שלוש אפשרויות, זה כבר אינו נכון: אותה פנייה יכולה להפיק שני מכתבים שונים,
-- ה-upsert על (case_id, kind) דורס, ואיש אינו יודע מה יושב שם. נמדד ולא הונח
-- בפעימות 978ab68 ו-fb607a0: מסמך #68 ואחריו מסמך #70 החזיקו כל אחד את שני
-- הנוסחים בזה אחר זה, אותו מזהה, בלי שנשאר סימן לאיזה מהם.
--
-- הסימפטום אינו שגיאה. המסך מציג «מסמך #70» ולידו created_at, והמנהל קורא
-- ממנו שני דברים ששניהם אינם נכונים: שהמכתב הוא זה שברירת המחדל הייתה מפיקה,
-- ושהוא נכתב בזמן שכתוב שם. הראשון כי אין מה לקרוא חוץ מ-kind, והשני כי
-- created_at של upsert הוא של ההפקה הראשונה לנצח.
--
-- מה נבנה כאן: שלוש עמודות על documents, ו-render כותב אותן. מיגרציה בלבד —
-- apps/37 לא נגעה, bkalot-clone-admin נשארת v6, supabase/functions לא נגעה
-- ואין פריסת פורטל. החזרת השדות ב-bkalot_clone_admin_case והצגתם במסך הן
-- הלבנה הבאה, אותו פיצול כמו 0073 → 978ab68.
--
-- חמש הכרעות:
--
-- (1) template_key הוא text ואינו מפתח זר ל-templates. שורת מסמך היא רישום של
--     מה שהופק ואינה מצביע חי: הפקת נפילה מתרחשת דווקא כששורת התבנית חסרה או
--     מנוטרלת, ו-FK היה הופך בדיוק את המקרה הזה לבלתי-ניתן-לכתיבה; ומחיקת
--     תבנית בעתיד הייתה משכתבת את מה שכתוב היום על מסמכים שכבר יצאו.
--
-- (2) template_fallback לצד המפתח, וזו ההכרעה שקונה את (1). כשה-fallback של
--     render יורה, הגוף אינו בא משום שורה — הוא הנוסח הקבוע שבתוך הפונקציה.
--     שמירת המפתח לבדו הייתה רושמת על המסמך תבנית שהוא לא הופק ממנה: שקר
--     שצורתו בדיוק כצורת האמת, ולכן אינו ניתן לגילוי בקריאה. render כבר
--     מחזיר את fallback בתשובה מאז 0063 ואיש לא שמר אותו.
--
-- (3) updated_at, כי created_at של upsert אינו זז לעולם. זו אותה תקלה בפנים
--     אחרות: הפקה חוזרת מחליפה גוף ומשאירה חותמת של גוף אחר. הכתיבה כאן היא
--     בכל הפקה ולא רק כשהגוף השתנה — בניגוד ל-changed=false של 0072, שם
--     הכותב הוא הכרעת אדם שאולי לא התרחשה; כאן render תמיד כותב גוף, והשאלה
--     «מתי נכתב מה שיושב כאן» תמיד יש לה תשובה חדשה.
--
-- (4) שלוש העמודות נכתבות בשני ענפי ה-upsert. ענף ה-INSERT בלבד היה משאיר
--     בדיוק את המקרה שבגללו נכתבה המיגרציה — ההפקה השנייה, זו שדורסת — בלי
--     עדכון, כלומר מסמך שגופו מתבנית אחת ושדותיו מתבנית אחרת.
--
-- (5) העמודות nullable ואין ל-template_fallback ברירת מחדל false. השורות
--     שקדמו למיגרציה (אפס היום, נמדד) הופקו בלי שאיש רשם מהיכן, ו-false היה
--     טוען עליהן «הופקה מתבנית אמיתית» — קביעה שאין לה מקור. null כאן אומר
--     «הופק לפני 0074, לא ידוע», וזו האמת. updated_at לבדו ממולא לאחור מ-
--     created_at, כי זו לא השערה: שורה שלא נדרסה מעולם אכן נכתבה אז.
--
-- מצב טסט: אין כאן net.http, אין pg_net ואין ולו קריאה יוצאת אחת. render
-- מפיק לתוך documents ותו לא — outbound_queue ו-delivery_log לא נגעות.
--
-- אינו נוגע במערכת החיה: אין נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/
-- NEDARIM3873 ולא בסכמות csj/csj_src/igud.

alter table bkalot_clone.documents
  add column if not exists template_key      text,
  add column if not exists template_fallback boolean,
  add column if not exists updated_at        timestamptz;

-- מילוי לאחור (הכרעה 5): רק updated_at, ורק היכן שאין. אפס שורות היום.
update bkalot_clone.documents
   set updated_at = created_at
 where updated_at is null;

alter table bkalot_clone.documents
  alter column updated_at set default now();

comment on column bkalot_clone.documents.template_key is
  'המפתח שממנו הופק הגוף שיושב בשורה כרגע. null = הופק לפני 0074. אינו FK: רישום ולא מצביע (0074 הכרעה 1).';
comment on column bkalot_clone.documents.template_fallback is
  'true = שורת התבנית הייתה חסרה או מנוטרלת והגוף הוא נוסח הנפילה שבתוך render, ולא התבנית שב-template_key. null = הופק לפני 0074 (0074 הכרעה 2).';
comment on column bkalot_clone.documents.updated_at is
  'מתי נכתב הגוף שיושב בשורה כרגע. created_at אינו זז ב-upsert על (case_id, kind) (0074 הכרעה 3).';

-- ── render כותב את השלושה ─────────────────────────────────────────────────────
-- זהה ל-0073 מלבד ה-INSERT ... ON CONFLICT בסוף.

create or replace function public.bkalot_clone_render(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
  insert into bkalot_clone.documents (case_id, kind, title, body_html, body_text,
                                      template_key, template_fallback, updated_at)
  values (v_case, 'email', v_subject, v_html, v_text,
          v_key, v_fallback, now())
  on conflict (case_id, kind) do update
    set title             = excluded.title,
        body_html         = excluded.body_html,
        body_text         = excluded.body_text,
        template_key      = excluded.template_key,
        template_fallback = excluded.template_fallback,
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
    'placeholders_unresolved', to_jsonb(v_unresolved),
    -- מצב טסט: ההפקה נעצרת כאן. queue_id נשאר null ו-outbound_queue לא נגעה.
    'queued',                  false);
end;
$function$;

comment on function public.bkalot_clone_render(jsonb) is
  'הפקת מכתב לפנייה אחת אל bkalot_clone.documents, ורישום מאיזו תבנית הגוף הופק, אם היא זו שהופיעה בו, ומתי נכתב (0074). מצב טסט: אינו מכניס לתור ואינו שולח דבר.';
