-- 0058 — bkalot_clone שכבה 1: נתיב הכתיבה של הפנייה (core.issues #222)
--
-- מה היה: 0057 יצר cases/case_rights/documents, ועליהן RLS דלוק ואפס policies,
-- וההרשאות ל-service_role בלבד (anon/authenticated מחזירים אפס שורות ב-
-- role_table_grants). כלומר טבלאות קיימות שאין להן ולו נתיב כתיבה אחד: PostgREST
-- אנונימי חסום בכוונה, והסכמה bkalot_clone אינה חשופה ל-PostgREST כלל.
--
-- מה נבנה כאן: public.bkalot_clone_intake(jsonb) — פונקציה אחת שהיא כל הקליטה.
-- היא ב-public ולא ב-bkalot_clone כי רק public/graphql_public חשופות ל-PostgREST,
-- ולכן זו הצורה היחידה שאפשר לקרוא לה מ-edge function בלי חיבור DB ישיר.
-- SECURITY DEFINER + search_path ריק, וכל שם מלא — היא עוקפת RLS בכוונה, והיא
-- הדבר היחיד שעושה זאת.
--
-- שלוש הכרעות שנגזרות מ-BKALOT_METHOD.md ולא מהעדפה:
--
-- (1) מפתח הזהות הוא הטלפון ולא המייל (§8: clients.phone unique במקור).
--     bkalot_auto.contacts כבר מחזיקה unique(app_key, phone), ולכן ה-upsert כאן
--     נופל עליה. בחירת מייל כמפתח הייתה מייצרת כפילויות שהמקור אינו מייצר.
--
-- (2) סוג הבקשה אינו תווית אלא מכווץ את הטופס עצמו (§8, service-form.tsx:278-283):
--     רק treatment פותח קליטה מלאה. info/reminder הם פרטי קשר בלבד — ולכן שדה
--     שנשלח אליהם ואינו שייך להם אינו נכתב לעמודה, ומדווח חזרה ב-dropped[]
--     במקום להיבלע בשקט. ה-payload המלא נשמר ב-cases.raw בכל מקרה.
--
-- (3) חיבור הזכויות נעשה מ-rights.situation_map חי (§8: הקטלוג נקרא ולא מועתק),
--     בסדר main → more → health, ורק קוד שקיים בפועל ב-rights.catalog נכתב.
--     קוד שאינו קיים חוזר ב-rights_unknown[] — הקטלוג מיובא מחדש כמכלול, ומיפוי
--     שהתיישן צריך להיראות, לא להיזרק.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות csj/csj_src/igud.
--    rights.* ו-bkalot_auto.contacts נקראות/נכתבות דרך הפונקציה בלבד; אין DDL עליהן.
--    מצב טסט: הפונקציה אינה נוגעת ב-outbound_queue ואינה שולחת דבר.

-- ── הסוג עולה מ-raw לעמודה ───────────────────────────────────────────────────
-- 0057 לא הכיר אותו כי הוא נגזר מקריאת 09 שנעשתה אחריו (#221). בלעדיו אי אפשר
-- לשאול "כמה פניות treatment נקלטו" בלי לפרק jsonb בכל שאילתה.
alter table bkalot_clone.cases
  add column if not exists kind text not null default 'info';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'bkalot_clone.cases'::regclass
                    and conname  = 'cases_kind_known') then
    alter table bkalot_clone.cases
      add constraint cases_kind_known check (kind in ('info','reminder','treatment'));
  end if;
end $$;

comment on column bkalot_clone.cases.kind is
  'info | reminder | treatment. אינו תווית: רק treatment פותח קליטה מלאה (BKALOT_METHOD §8).';

-- ── נתיב הכתיבה היחיד ────────────────────────────────────────────────────────
create or replace function public.bkalot_clone_intake(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_kind      text := lower(nullif(btrim(p->>'kind'), ''));
  v_name      text := nullif(btrim(p->>'full_name'), '');
  v_phone     text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g');
  v_email     text := lower(nullif(btrim(p->>'email'), ''));
  v_source    text := coalesce(nullif(btrim(p->>'source'), ''), 'form');
  v_situation text := nullif(btrim(p->>'situation'), '');
  v_topic_raw text := nullif(btrim(p->>'topic_no'), '');
  v_topic     integer;
  v_note      text := nullif(btrim(p->>'note'), '');
  v_consent   boolean := (p->>'consent') is not null and lower(p->>'consent') in ('true','t','1','yes');
  v_contact   bigint;
  v_case      bigint;
  v_codes     text[];
  v_linked    integer := 0;
  v_unknown   text[] := '{}';
  v_dropped   text[] := '{}';
begin
  -- הסוג ראשון: הוא שקובע מה מותר לשלוח בכלל.
  if v_kind is null or v_kind not in ('info','reminder','treatment') then
    return jsonb_build_object('ok', false, 'error', 'kind_invalid',
                              'allowed', jsonb_build_array('info','reminder','treatment'));
  end if;

  if v_source not in ('form','yemot','nedarim','ai','admin') then
    return jsonb_build_object('ok', false, 'error', 'source_invalid',
                              'allowed', jsonb_build_array('form','yemot','nedarim','ai','admin'));
  end if;

  if v_name is null then
    return jsonb_build_object('ok', false, 'error', 'full_name_required');
  end if;

  -- טלפון ישראלי מנורמל. 972/00972 מתקפלים לצורה המקומית לפני הבדיקה, אחרת אותו
  -- אדם שכתב +972-50 היה נקלט כאיש שני.
  if left(v_phone, 5) = '00972' then
    v_phone := '0' || substr(v_phone, 6);
  elsif left(v_phone, 3) = '972' then
    v_phone := '0' || substr(v_phone, 4);
  end if;
  if v_phone !~ '^0[0-9]{8,9}$' then
    return jsonb_build_object('ok', false, 'error', 'phone_invalid',
                              'detail', 'הטלפון הוא מפתח הזהות של הפונה — נדרש מספר ישראלי תקין');
  end if;

  if v_email is not null and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email_invalid');
  end if;

  -- כאן מתחיל הכיווץ לפי הסוג.
  if v_kind = 'treatment' then
    -- טיפול בלי מייל אין לאן למסור אליו מסמך; המקור פותח כאן את שדות הקשר הרחבים.
    if v_email is null then
      return jsonb_build_object('ok', false, 'error', 'email_required_for_treatment');
    end if;
    if v_situation is null then
      return jsonb_build_object('ok', false, 'error', 'situation_required_for_treatment');
    end if;
    if not exists (select 1 from rights.situation_map m where m.situation = v_situation) then
      return jsonb_build_object(
        'ok', false, 'error', 'situation_unknown',
        'allowed', (select jsonb_agg(m.situation order by m.situation) from rights.situation_map m));
    end if;
    if v_topic_raw is not null then
      if v_topic_raw ~ '^[0-9]+$' then
        v_topic := v_topic_raw::integer;
      else
        v_dropped := v_dropped || 'topic_no'::text;
      end if;
    end if;
  else
    -- info/reminder: פרטי קשר בלבד. מה שנשלח מעבר לזה מדווח ואינו נכתב לעמודה.
    if v_situation is not null then
      v_dropped := v_dropped || 'situation'::text;
      v_situation := null;
    end if;
    if v_topic_raw is not null then
      v_dropped := v_dropped || 'topic_no'::text;
    end if;
    if p ? 'documents' then
      v_dropped := v_dropped || 'documents'::text;
    end if;
  end if;

  -- זהות הפונה: upsert על (app_key, phone). שדה קיים אינו נמחק ע"י שליחה חסרה,
  -- והסכמה נשמרת דולקת אם ניתנה פעם אחת.
  insert into bkalot_auto.contacts (app_key, full_name, email, phone, consent, source)
  values ('bkalot-clone', v_name, v_email, v_phone, v_consent, v_source)
  on conflict (app_key, phone) do update
    set full_name = coalesce(excluded.full_name, contacts.full_name),
        email     = coalesce(excluded.email,     contacts.email),
        consent   = contacts.consent or excluded.consent
  returning id into v_contact;

  insert into bkalot_clone.cases (app_key, contact_id, kind, topic_no, situation, source, status, note, raw)
  values ('bkalot-clone', v_contact, v_kind, v_topic, v_situation, v_source, 'new', v_note, p)
  returning id into v_case;

  -- הזכויות נגזרות מהמצב, חי מ-rights.situation_map. main לפני more לפני health,
  -- והסדר בתוך כל קבוצה נשמר — זהו דירוג, לא קבוצה.
  if v_situation is not null then
    select array_agg(t.code order by g.grp, t.ord)
      into v_codes
      from rights.situation_map m
      cross join lateral jsonb_each(m.codes) as e(k, arr)
      cross join lateral (select case e.k when 'main' then 1 when 'more' then 2 else 3 end) as g(grp)
      cross join lateral jsonb_array_elements_text(e.arr) with ordinality as t(code, ord)
     where m.situation = v_situation
       and jsonb_typeof(e.arr) = 'array';

    if v_codes is not null then
      insert into bkalot_clone.case_rights (case_id, right_code, rank, chosen)
      select v_case, x.code, x.ord::integer, false
        from unnest(v_codes) with ordinality as x(code, ord)
       where exists (select 1 from rights.catalog c where c.code = x.code)
      on conflict (case_id, right_code) do nothing;
      get diagnostics v_linked = row_count;

      select coalesce(array_agg(distinct x.code), '{}')
        into v_unknown
        from unnest(v_codes) as x(code)
       where not exists (select 1 from rights.catalog c where c.code = x.code);
    end if;
  end if;

  return jsonb_build_object(
    'ok',             true,
    'case_id',        v_case,
    'contact_id',     v_contact,
    'kind',           v_kind,
    'phone',          v_phone,
    'situation',      v_situation,
    'rights_linked',  v_linked,
    'rights_unknown', to_jsonb(v_unknown),
    'dropped',        to_jsonb(v_dropped),
    -- מצב טסט: הקליטה נעצרת כאן. שכבה 3 (bkalot_auto.outbound_queue) אינה נגעת.
    'queued',         false);
end;
$fn$;

comment on function public.bkalot_clone_intake(jsonb) is
  'שכבה 1 של שכפול בקלות: קליטת פנייה אחת. מפתח זהות = טלפון; הסוג מכווץ את הטופס; '
  'הזכויות נקראות חי מ-rights.situation_map. אינה שולחת דבר (מצב טסט). service_role בלבד.';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- פונקציה חדשה מקבלת EXECUTE ל-PUBLIC כברירת מחדל בפוסטגרס, וזו פונקציית
-- SECURITY DEFINER שעוקפת RLS ויושבת ב-public — כלומר בלי ה-revoke הזה כל מחזיק
-- מפתח anon היה יכול לכתוב לסכמה שכל 0057 סגר בפניו.
revoke all on function public.bkalot_clone_intake(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_intake(jsonb) to service_role;
