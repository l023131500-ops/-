-- 0063 — bkalot_clone שכבה 3, לבנה 1: הפקת המסמך (core.issues #231)
--
-- מה היה: 0057 יצר את bkalot_clone.documents, ומאז שלוש שכבות נבנו סביבה —
-- קליטה (0058), קריאה (0060), כניסה לניהול (0061/0062) — ואין ולו נתיב אחד
-- שכותב לתוכה שורה. מסך הניהול מציג «מסמכים (0)» על כל פנייה, ו-0 הוא נכון:
-- אין רנדרר. זו הלבנה הראשונה של שכבה 3, והיא הפקה בלבד — אין בה שליחה.
--
-- מה נבנה כאן: bkalot_clone.templates (התבנית כנתון) + public.bkalot_clone_render(jsonb)
-- שמרנדרת פנייה אחת לשורה ב-documents. אין נגיעה ב-bkalot_auto.outbound_queue
-- ואין נגיעה ב-delivery_log — queue_id נשאר null בכוונה, וזה מה שהופך את הצעד
-- הזה לבטוח: אי אפשר לשלוח ממנו כלום גם אם יקראו לו אלף פעמים.
--
-- ההכרעות נגזרות מ-BKALOT_METHOD.md §3 ולא מהעדפה:
--
-- (1) התבנית היא נתון במסד ולא קוד (§3: automation_configs.configJson מחזיק
--     {subject, body, channels}). לכן templates היא טבלה, והעברית של המסמך יושבת
--     בשורות שלה — לא בגוף הפונקציה. זה גם מה שיאפשר לניהול לערוך נוסח בלי
--     מיגרציה. הפונקציה עצמה נטולת עברית פרט לנוסח הנפילה, שהוא חריג מכוון.
--
-- (2) מציין-מקום שאינו מוכר מוחלף במחרוזת ריקה ואינו נשאר גלוי ללקוח
--     (§3: renderInquiryReply, שורות 99-117). מה שהוסר מדווח חזרה ב-
--     placeholders_unresolved[] במקום להיבלע — במקור זה נבלע, וכאן זה נראה,
--     אחרת תבנית עם שגיאת כתיב תשלח נוסח קטוע ואיש לא ידע.
--
-- (3) נוסח נפילה קיים (§3: FALLBACK_TEMPLATE) — שורת תבנית חסרה או מנוטרלת אינה
--     מפילה את ההפקה ואינה מייצרת מסמך ריק. אבל רק כשהמפתח נגזר מברירת המחדל;
--     מפתח שנמסר במפורש ואינו קיים מחזיר template_unknown, כי שם זו שגיאת קורא
--     ולא תקלת נתונים, ונוסח נפילה שקט היה מסתיר אותה.
--
-- שלוש הכרעות שאינן מהמקור אלא מהמדידה כאן:
--
-- (4) הגוף נבנה פעמיים — טקסט ו-HTML — ובגרסת ה-HTML כל ערך שמגיע מהפונה עובר
--     escape. שם מלא הוא קלט חופשי של אדם זר; בלי זה, «<img onerror>» שנשמר
--     ב-contacts.full_name היה יושב בתוך body_html שאיש יקרא אחר כך במסך ניהול.
--     רשימת הזכויות היא היחידה שנכנסת כ-markup, והיא נבנית כאן ולא מגיעה מבחוץ.
--
-- (5) case_rights.chosen הוא בחירת הזכויות בפנייה (BKALOT_METHOD §8). לכן: אם
--     מישהו בחר — המסמך מכיל את הנבחרות בלבד; לא בחר איש — המסמך מכיל את כל
--     הרשימה המדורגת. מה שנעשה בפועל חוזר ב-rights_source, כדי שמסמך עם 5
--     זכויות לא ייקרא כתקלה כשהוא בדיוק מה שהמנהל ביקש.
--
-- (6) מסמך אחד לכל (פנייה, סוג): unique + upsert. רינדור חוזר מעדכן במקום לצבור,
--     כי «המסמך של הפנייה» הוא מצב ולא יומן — היומן הוא delivery_log של שכבת
--     השליחה, ועוד לא נבנה. documents=0 היום, ולכן האינדקס אינו יכול להיכשל.
--
-- מה שנרשם במפורש ולא נבלע: {{situation}} זמין כמציין-מקום אבל אינו מופיע באף
-- תבנית מהוזרעות כאן — rights.situation_map מחזיקה מפתח אנגלי (disability) ואין
-- לו שם עברי במסד; התוויות יושבות במילון הלקוח מאז #223. תבנית שתדפיס אותו
-- תדפיס «disability» בתוך פסקה בעברית. ראה #232.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות csj/csj_src/igud.
--    מצב טסט: אין כאן שום מסלול יוצא — לא מייל, לא webhook ולא תור.

-- ── escape ל-HTML ────────────────────────────────────────────────────────────
-- ב-bkalot_clone ולא ב-public: היא כלי פנימי ואין סיבה שתופיע ל-PostgREST.
create or replace function bkalot_clone.html_escape(s text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(coalesce(s, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

-- ── התבנית כנתון ─────────────────────────────────────────────────────────────
create table if not exists bkalot_clone.templates (
  id         bigserial primary key,
  key        text not null unique,
  name_he    text not null,
  subject    text not null,
  body_text  text not null,
  body_html  text not null,
  channels   text[] not null default array['email'],
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table bkalot_clone.templates is
  'התבנית היא נתון ולא קוד (BKALOT_METHOD §3). מציין-מקום: {{fullName}} {{phone}} '
  '{{email}} {{caseId}} {{topicNo}} {{situation}} {{note}} {{createdAt}} '
  '{{rightsCount}} {{rightsList}} {{siteUrl}}. מציין שאינו מוכר מוחלף בריק.';

alter table bkalot_clone.templates enable row level security;
revoke all on table bkalot_clone.templates from public, anon, authenticated, service_role;

-- ── שתי התבניות הראשונות ─────────────────────────────────────────────────────
-- הזרעה ולא דריסה: נוסח שנערך מהניהול לא יימחק ע"י הרצה חוזרת של המיגרציה.
insert into bkalot_clone.templates (key, name_he, subject, body_text, body_html)
values
  ('general_inquiry_reply',
   'מענה לפנייה כללית',
   'בקלות — קיבלנו את פנייתך (פנייה {{caseId}})',
   E'שלום {{fullName}},\n\n'
   || E'קיבלנו את פנייתך. מספר הפנייה שלך הוא {{caseId}}, והיא נקלטה בתאריך {{createdAt}}.\n'
   || E'נחזור אליך לטלפון {{phone}}.\n\n'
   || E'{{note}}\n\n'
   || E'בברכה,\nצוות בקלות\n{{siteUrl}}',
   E'<div dir="rtl" lang="he" style="font-family:system-ui,Arial,sans-serif;line-height:1.7">\n'
   || E'<p>שלום {{fullName}},</p>\n'
   || '<p>קיבלנו את פנייתך. מספר הפנייה שלך הוא <strong>{{caseId}}</strong>, '
   || E'והיא נקלטה בתאריך {{createdAt}}.<br>נחזור אליך לטלפון {{phone}}.</p>\n'
   || E'<p>{{note}}</p>\n'
   || E'<p>בברכה,<br>צוות בקלות<br><a href="{{siteUrl}}">{{siteUrl}}</a></p>\n</div>'),

  ('rights_treatment_reply',
   'מענה לפניית טיפול — רשימת הזכויות',
   'בקלות — {{rightsCount}} זכויות שאותרו עבורך (פנייה {{caseId}})',
   E'שלום {{fullName}},\n\n'
   || 'בדקנו את הפנייה שלך (מספר {{caseId}}, מתאריך {{createdAt}}) ואיתרנו '
   || E'{{rightsCount}} זכויות שכדאי לבדוק:\n\n'
   || E'{{rightsList}}\n\n'
   || E'{{note}}\n\n'
   || 'הרשימה היא נקודת פתיחה ולא הכרעה — לכל זכות יש תנאי זכאות משלה, ואנחנו כאן '
   || E'כדי לעבור איתך עליהם.\n\n'
   || E'בברכה,\nצוות בקלות\n{{siteUrl}}',
   E'<div dir="rtl" lang="he" style="font-family:system-ui,Arial,sans-serif;line-height:1.7">\n'
   || E'<p>שלום {{fullName}},</p>\n'
   || '<p>בדקנו את הפנייה שלך (מספר <strong>{{caseId}}</strong>, מתאריך {{createdAt}}) '
   || E'ואיתרנו {{rightsCount}} זכויות שכדאי לבדוק:</p>\n'
   || E'{{rightsList}}\n'
   || E'<p>{{note}}</p>\n'
   || '<p>הרשימה היא נקודת פתיחה ולא הכרעה — לכל זכות יש תנאי זכאות משלה, '
   || E'ואנחנו כאן כדי לעבור איתך עליהם.</p>\n'
   || E'<p>בברכה,<br>צוות בקלות<br><a href="{{siteUrl}}">{{siteUrl}}</a></p>\n</div>')
on conflict (key) do nothing;

-- ── מסמך אחד לכל (פנייה, סוג) ────────────────────────────────────────────────
create unique index if not exists documents_case_kind_uniq
  on bkalot_clone.documents (case_id, kind);

-- ── הרנדרר ───────────────────────────────────────────────────────────────────
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
    'situation',   coalesce(v_situation, ''),
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

  for v_k, v_v in select e.key, e.value from jsonb_each_text(v_vars_text) e loop
    v_subject := replace(v_subject, '{{' || v_k || '}}', v_v);
    v_text    := replace(v_text,    '{{' || v_k || '}}', v_v);
  end loop;

  for v_k, v_v in select e.key, e.value from jsonb_each_text(v_vars_html) e loop
    v_html := replace(v_html, '{{' || v_k || '}}', v_v);
  end loop;

  -- מה שנשאר הוא מציין שאין לו ערך: מדווח, ואז מוסר.
  select coalesce(array_agg(distinct m.m[1]), '{}')
    into v_unresolved
    from unnest(array[v_subject, v_text, v_html]) as s(t)
    cross join lateral regexp_matches(s.t, '\{\{([A-Za-z0-9_]+)\}\}', 'g') as m(m);

  v_subject := regexp_replace(v_subject, '\{\{[A-Za-z0-9_]+\}\}', '', 'g');
  v_text    := regexp_replace(v_text,    '\{\{[A-Za-z0-9_]+\}\}', '', 'g');
  v_html    := regexp_replace(v_html,    '\{\{[A-Za-z0-9_]+\}\}', '', 'g');

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
    'text_chars',              length(v_text),
    'html_chars',              length(v_html),
    'placeholders_unresolved', to_jsonb(v_unresolved),
    -- מצב טסט: ההפקה נעצרת כאן. queue_id נשאר null ו-outbound_queue לא נגעה.
    'queued',                  false);
end;
$fn$;

comment on function public.bkalot_clone_render(jsonb) is
  'שכבה 3 לבנה 1: מרנדרת פנייה אחת למסמך ב-bkalot_clone.documents. התבנית מהמסד, '
  'מציין לא-מוכר מוסר ומדווח, HTML עובר escape. אינה שולחת דבר. service_role בלבד.';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- אותה מלכודת שנמדדה ב-0058/0060/0061: פונקציית SECURITY DEFINER חדשה ב-public
-- מקבלת EXECUTE ל-PUBLIC כברירת מחדל, ומפתח ה-anon יושב גלוי בקוד הטופס הציבורי.
revoke all on function public.bkalot_clone_render(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_render(jsonb) to service_role;
revoke all on function bkalot_clone.html_escape(text) from public, anon, authenticated;
