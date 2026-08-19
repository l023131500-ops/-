-- 0066 — bkalot_clone שכבה 3: המסמך לא אמר על מה הוא, והערה שאין השאירה פסקה ריקה
--
-- הקו שהפעימה הקודמת (0065 / #232) הותירה נוסח בה עצמה: «אף תבנית מוזרעת עדיין
-- אינה מדפיסה את המצב», ולצידו המדידה שהסבירה למה — פנייה 25 (kind=info, בלי
-- situation) הוציאה נושא «בקלות — פנייה 25 ()», סוגריים ריקים. כלומר המציין בטוח
-- להדפסה מרגע 0065, אבל תבנית שעוטפת אותו בטקסט זקוקה למשהו שיודע להשמיט את
-- העטיפה כשאין ערך. בלי זה יש רק שתי אפשרויות גרועות: להדפיס «לפי המצב שסימנת: .»
-- או לא להדפיס את המצב בכלל — וזו בדיוק הסיבה ש-0063 ו-0065 לא נגעו בתבניות.
--
-- אותה חוסר-יכולת כבר הייתה בייצור ולא נרשמה: {{note}} מופיע בשתי התבניות
-- המוזרעות, ופנייה בלי הערה מוציאה <p></p> — פסקה ריקה בגוף ה-HTML של מכתב
-- שנשלח לאדם. בגוף הטקסט זה נבלע (קיפול \n{3,} → \n\n של 0063), ב-HTML לא.
-- שתי התופעות הן אותו חסר אחד, ולכן הן צעד אחד.
--
-- מה נבנה: מקטע מותנה {{#key}}…{{/key}} — הערך קיים ואינו רווח בלבד → התוכן
-- נשאר והסימנים מוסרים; ריק → כל המקטע מוסר.
--
-- שלוש הכרעות שנגזרות מהמדידה ולא מהעתקה:
--
-- (1) המקטעים נפתרים לפני החלפת המציינים, ולא אחריה. הסדר הזה הוא מה שמונע
--     מהערה של אדם זר להכיל «{{/note}}» ולקצוץ את המכתב מאמצעו — בשלב שבו
--     הטקסט של הפונה נכנס, כבר אין בגוף אף סימן מקטע שיגיב אליו. אותו שיקול
--     בדיוק שהוליד את ה-escape של 0063, בשכבה אחרת.
--
-- (2) הבדיקה היא length(btrim(value)) > 0 ולא value is not null: {{note}} תמיד
--     מגיע כמחרוזת (coalesce ב-0063), ומצב שאין לו שם מגיע כ-'' מ-0065. הערה
--     שהיא רווח בודד היא «אין הערה» לכל דבר, ופסקה שמכילה רווח אינה שונה
--     מפסקה ריקה בעיני מי שקורא את המכתב.
--
-- (3) סימן מקטע שאין לו זוג — {{#typo}} או {{/typo}} — מדווח ב-
--     placeholders_unresolved ואז מוסר, כמו כל מציין לא-מוכר. הרגקס של 0063
--     תפס [A-Za-z0-9_] בלבד, ולכן סימן מקטע שגוי היה נשאר בגוף המסמך גלוי
--     לעין הקורא ובלי שאיש ידווח עליו. זה מה שהופך «התבנית ניתנת לעריכה
--     מהניהול» לבטוח: טעות כתיב בתבנית נראית במדידה ולא במכתב.
--
-- התבניות: הזכות נכתבת עם המצב, וההערה נעטפת. השמירה על נוסח שנערך מהניהול
-- נעשית בתנאי updated_at = created_at — היום אין ולו נתיב כתיבה אחד ל-templates
-- (role_table_grants מחזיר את postgres בלבד), ולכן הוא נכון בוודאות עכשיו,
-- ומרגע שיהיה מסך עריכה הוא ימשיך להיות נכון.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות csj/csj_src/igud.
--    מצב טסט: אין כאן שום מסלול יוצא — לא מייל, לא webhook ולא תור. queue_id נשאר null.

-- ── הרנדרר יודע מקטע מותנה ─────────────────────────────────────────────────────
-- זהה ל-0065 פרט לשלושה מקומות: לולאת המקטעים (חדשה), ושני הרגקסים של
-- placeholders_unresolved וההסרה, שנפתחו ל-[#/]. שאר הגוף לא נגע.
create or replace function public.bkalot_clone_render(p jsonb)
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

  insert into bkalot_clone.documents (case_id, kind, title, body_html, body_text)
  values (v_case, 'email', v_subject, v_html, v_text)
  on conflict (case_id, kind) do update
    set title = excluded.title, body_html = excluded.body_html, body_text = excluded.body_text
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
$fn$;

comment on function public.bkalot_clone_render(jsonb) is
  'שכבה 3 לבנה 1: מרנדרת פנייה אחת למסמך ב-bkalot_clone.documents. התבנית מהמסד, '
  'מקטע מותנה {{#key}}…{{/key}} (0066), מציין או סימן מקטע לא-מוכר מוסר ומדווח, '
  'HTML עובר escape, {{situation}} מודפס בעברית (0065). אינה שולחת דבר. service_role בלבד.';

-- ההרשאות נקבעו ב-0063 ו-create or replace אינו מאפס אותן; נכתבות שוב במפורש
-- כדי שהמיגרציה תהיה נכונה גם אם תרוץ על מסד שבו 0063 לא רץ.
revoke all on function public.bkalot_clone_render(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_render(jsonb) to service_role;

-- ── התבניות: המסמך אומר על מה הוא, וההערה שאין אינה משאירה פסקה ─────────────
-- עדכון אחד ולא שניים, כי התנאי updated_at = created_at נשרף אחרי הראשון.
-- ה-replace של {{rightsList}} הוא no-op ב-general_inquiry_reply (אין בה רשימה),
-- ולכן אותה שורה מטפלת בשתי התבניות בלי להתפצל.
update bkalot_clone.templates t
   set body_text = replace(
         replace(t.body_text,
                 E'{{note}}\n\n',
                 E'{{#note}}מה שכתבת לנו: {{note}}\n\n{{/note}}'),
         '{{rightsList}}',
         E'{{#situation}}הרשימה נבנתה לפי המצב שסימנת: {{situation}}.\n\n{{/situation}}{{rightsList}}'),
       body_html = replace(
         replace(t.body_html,
                 E'<p>{{note}}</p>\n',
                 E'{{#note}}<p>מה שכתבת לנו: {{note}}</p>\n{{/note}}'),
         E'{{rightsList}}\n',
         E'{{#situation}}<p>הרשימה נבנתה לפי המצב שסימנת: {{situation}}.</p>\n{{/situation}}{{rightsList}}\n'),
       updated_at = now()
 where t.updated_at = t.created_at
   and t.body_text not like '%{{#%';

comment on table bkalot_clone.templates is
  'התבנית היא נתון ולא קוד (BKALOT_METHOD §3). מציין-מקום: {{fullName}} {{phone}} '
  '{{email}} {{caseId}} {{topicNo}} {{situation}} {{note}} {{createdAt}} '
  '{{rightsCount}} {{rightsList}} {{siteUrl}}. מציין שאינו מוכר מוחלף בריק. '
  'מקטע מותנה: {{#key}}…{{/key}} — נשאר כשלמפתח יש ערך שאינו רווח, ומוסר כשאין (0066).';
