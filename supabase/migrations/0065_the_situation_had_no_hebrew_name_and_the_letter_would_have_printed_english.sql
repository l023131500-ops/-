-- 0065 — bkalot_clone שכבה 3: ל-situation אין שם עברי במסד (core.issues #232)
--
-- מה היה: rights.situation_map מחזיקה שתי עמודות בלבד (situation, codes) והמפתח
-- אנגלי. 0063 הגדיר {{situation}} כמציין-מקום זמין, ובמפורש לא השתמש בו באף
-- תבנית מוזרעת (שורות 46-49 שם) — כי מסמך עברי שנשלח לאדם היה מכיל את המילה
-- «disability» באמצע פסקה. התוויות העבריות של 24 המצבים יושבות במילון הלקוח
-- מאז #223, כלומר במקום שהמסמך אינו יכול לקרוא ממנו.
--
-- ההכרעה ש-#232 השאיר פתוחה, ומה שהכריע אותה: עמודה ב-rights.situation_map
-- (מקור אחד לשם — גם למסך וגם למסמך) מול מילון שני בצד השרת. הכרטיס כתב
-- «הראשון עדיף ואינו חינם — rights.* נקראת ע"י מערכת 10 החיה». המחיר נמדד ולא
-- הונח: public.rights_situation_map מוגדרת כ-SELECT situation, codes — רשימת
-- עמודות מפורשת ולא *, ולכן הוספת עמודה אינה משנה את צורת ה-view שמערכת 10
-- קוראת דרכו. זה מה שהפך את «אינו חינם» לחינם כאן.
--
-- העמודה נשארת nullable ובכוונה: not null היה מפיל כל insert עתידי ל-situation_map
-- שאינו יודע עליה, וזו טבלה של מערכת חיה. הרנדרר נופל למפתח כשאין שם — כלומר
-- מצב חדש שיתווסף יחזור להדפיס אנגלית, וזה נראה בתשובה (situation_label) ולא
-- נבלע בשקט.
--
-- מקור התוויות, ולא ניסוח חדש: apps/10-bkalot-rights/data.json → meta.situations
-- (25 מפתחות), מול מילון הלקוח של השכפול (24). נמדדו זה מול זה: 22 זהים תו-בתו,
-- שניים נבדלים בתו אחד — property_owner ו-idf_disabled, גרשיים כפולים ASCII (")
-- במערכת 10 מול גרשיים עבריים (״) בשכפול. נבחר נוסח השכפול, כי הוא מה שהאדם
-- רואה היום במסך והמסמך צריך להסכים איתו, וכי מסמך עברי שנשלח החוצה אינו המקום
-- לסימן פיסוק ASCII. health_check מופיע במילון של 10 ואינו שורה ב-situation_map
-- (מצב בריאותי הוא קטגוריה ולא מצב), ולכן אין לו מה להיכתב כאן.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות csj/csj_src/igud.
--    מצב טסט: אין כאן שום מסלול יוצא — לא מייל, לא webhook ולא תור. queue_id נשאר null.

-- ── השם העברי, ליד המפתח ─────────────────────────────────────────────────────
alter table rights.situation_map add column if not exists name_he text;

comment on column rights.situation_map.name_he is
  'השם העברי של המצב כפי שהמשתמש רואה אותו (מקור: apps/10-bkalot-rights/data.json '
  '→ meta.situations). nullable בכוונה: מצב בלי שם יודפס כמפתח ולא יפיל כתיבה. #232';

update rights.situation_map m
   set name_he = v.name_he
  from (values
    ('young_single',        'צעיר/רווק עצמאי'),
    ('student',             'סטודנט/ית'),
    ('engaged',             'מאורסים / לפני חתונה'),
    ('married_no_kids',     'זוג נשוי ללא ילדים'),
    ('family_1_3',          'משפחה עם 1–3 ילדים'),
    ('family_4plus',        'משפחה ברוכת ילדים (4+)'),
    ('family_grown_kids',   'משפחה עם ילדים בוגרים'),
    ('single_parent',       'הורה יחיד / חד-הורי'),
    ('pre_retirement',      'לקראת פרישה'),
    ('seniors',             'גיל הזהב / פנסיונרים'),
    ('unemployed',          'מובטל / מחפש עבודה'),
    ('low_income',          'הכנסה נמוכה / קושי כלכלי'),
    ('self_employed',       'עצמאי / בעל עסק'),
    ('property_owner',      'בעל דירה / משקיע נדל״ן'),
    ('new_immigrant',       'עולה חדש / תושב חוזר ותיק'),
    ('reserves',            'לוחם/ת מילואים'),
    ('idf_disabled',        'נכה צה״ל / נפגע פעולות איבה'),
    ('disability',          'נכות כללית / מוגבלות'),
    ('special_needs_child', 'הורה לילד עם צרכים מיוחדים'),
    ('widow_survivor',      'אלמן/ה / משפחה שכולה / שאירים'),
    ('holocaust_survivor',  'ניצול/ת שואה'),
    ('work_injury',         'נפגע/ת עבודה / תאונת עבודה'),
    ('released_prisoner',   'אסיר משוחרר / שיקום'),
    ('conflict_zone',       'תושב עוטף עזה / קו עימות')
  ) as v(situation, name_he)
 where m.situation = v.situation
   and m.name_he is distinct from v.name_he;

-- ── הרנדרר קורא את השם ולא את המפתח ──────────────────────────────────────────
-- זהה ל-0063 פרט לשלושה מקומות: v_sit_label, הערך של 'situation' במפת המציינים,
-- ו-situation_label בתשובה. שאר הגוף לא נגע.
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
  'מציין לא-מוכר מוסר ומדווח, HTML עובר escape, {{situation}} מודפס בעברית (0065). '
  'אינה שולחת דבר. service_role בלבד.';

-- ההרשאות נקבעו ב-0063 ו-create or replace אינו מאפס אותן; נכתבות שוב במפורש
-- כדי שהמיגרציה תהיה נכונה גם אם תרוץ על מסד שבו 0063 לא רץ.
revoke all on function public.bkalot_clone_render(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_render(jsonb) to service_role;
