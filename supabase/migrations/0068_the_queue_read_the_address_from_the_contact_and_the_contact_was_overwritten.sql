-- 0068 — #235: כתובת הנמען וההסכמה שייכות לפנייה, לא לאיש הקשר
--
-- מה היה (נמדד ב-QA/bkalot-clone/queue-http-0814): bkalot_clone_intake מאתר
-- איש קשר קיים לפי (app_key, phone) בלבד, ובעדכון עושה
--   email   = coalesce(excluded.email, contacts.email)   -- המייל נדרס
--   consent = contacts.consent or excluded.consent       -- ההסכמה דביקה-אמת
-- כלומר: שתי פניות מאותו טלפון עם שני מיילים נותנות איש קשר אחד, והמייל של
-- הפנייה השנייה דורס את הראשונה. bkalot_clone_queue (0067) קרא את
-- v_contact.email בזמן ההכנסה לתור — ולכן מסמך שהופק לפנייה א' נכנס לתור עם
-- הכתובת שפנייה ב' כתבה מאוחר יותר. אותו דבר ל-consent: פנייה חדשה עם
-- consent=false על טלפון קיים אינה מבטלת את ההסכמה, והשומר לא נדרך כלל.
--
-- ההכרעה: כתובת היעד וההסכמה הן נתון של הפנייה — מה שהאדם כתב וסימן באותה
-- הגשה — ונשמרות עליה ברגע הקליטה. התור קורא את הצילום הזה ולא את איש הקשר.
-- איש הקשר נשאר מפתח זהות (טלפון) ואינו מקור לכתובת.
--
-- הסכמה נבדקת פעמיים ולא פעם אחת: גם על הפנייה (הסכים בהגשה הזו) וגם על איש
-- הקשר (לא סומן מאז כמי שאין לפנות אליו). היום השני לעולם אינו false כשהראשון
-- true, כי ה-upsert הוא OR — אבל זה בדיוק מה שהופך «בטל הסכמה» עתידי לנתיב
-- שיש לו משמעות, במקום דגל שאיש אינו קורא.
--
-- אין בצעד הזה שינוי בערוץ, במצב הטסט או ברשימת יעדי הבדיקה. mode='test'
-- נשאר קשיח, max_attempts=0 נשאר, ואין ולו נתיב יוצא אחד.

-- ── 1. הצילום על הפנייה ────────────────────────────────────────────────────
alter table bkalot_clone.cases
  add column if not exists to_email text,
  add column if not exists consent  boolean not null default false;

comment on column bkalot_clone.cases.to_email is
  'כתובת היעד כפי שנמסרה בפנייה הזו. מקור האמת לשליחה — לא contacts.email, שנדרס לפי טלפון (#235).';
comment on column bkalot_clone.cases.consent is
  'ההסכמה כפי שסומנה בפנייה הזו. contacts.consent הוא דגל השתקה ברמת האדם, ושניהם נדרשים (#235).';

-- הצילום לפניות שנקלטו לפני המיגרציה, מתוך הגוף הגולמי ששמור עליהן.
-- כל פנייה שאין ב-raw שלה מייל תישאר to_email=null ותיחסם ב-no_address —
-- וזה הנכון: אין לנו את הכתובת שנמסרה, ואיש הקשר אינו תחליף לה.
update bkalot_clone.cases c
   set to_email = lower(nullif(btrim(c.raw->>'email'), '')),
       consent  = ((c.raw->>'consent') is not null
                   and lower(c.raw->>'consent') in ('true','t','1','yes'))
 where c.to_email is null;

-- ── 2. הקליטה כותבת את הצילום ──────────────────────────────────────────────
create or replace function public.bkalot_clone_intake(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
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

  if v_kind = 'treatment' then
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

  -- איש הקשר נשאר מפתח זהות לפי טלפון, וההתנהגות שלו לא משתנה כאן: המייל
  -- מתעדכן וההסכמה מצטברת ב-OR. מה שהשתנה הוא שאיש אינו קורא ממנו את הכתובת.
  insert into bkalot_auto.contacts (app_key, full_name, email, phone, consent, source)
  values ('bkalot-clone', v_name, v_email, v_phone, v_consent, v_source)
  on conflict (app_key, phone) do update
    set full_name = coalesce(excluded.full_name, contacts.full_name),
        email     = coalesce(excluded.email,     contacts.email),
        consent   = contacts.consent or excluded.consent
  returning id into v_contact;

  -- הצילום: הכתובת וההסכמה של ההגשה הזו, כפי שנמסרו בה (#235).
  insert into bkalot_clone.cases
    (app_key, contact_id, kind, topic_no, situation, source, status, note, raw,
     to_email, consent)
  values
    ('bkalot-clone', v_contact, v_kind, v_topic, v_situation, v_source, 'new', v_note, p,
     v_email, v_consent)
  returning id into v_case;

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
    'queued',         false);
end;
$function$;

-- ── 3. התור קורא את הצילום ─────────────────────────────────────────────────
create or replace function public.bkalot_clone_queue(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_raw           text;
  v_doc_id        bigint;
  v_doc           bkalot_clone.documents%rowtype;
  v_case          bkalot_clone.cases%rowtype;
  v_contact       bkalot_auto.contacts%rowtype;
  v_channel       text;
  v_to            text;
  v_contact_email text;
  v_body          text;
  v_bytes         integer;
  v_allowed       boolean;
  v_status        text;
  v_detail        text;
  v_queue_id      bigint;
  v_existing      jsonb;
begin
  -- ── הקלט: אותה בדיקה בדיוק כמו 0064 ─────────────────────────────────────
  v_raw := nullif(btrim(coalesce(p->>'document_id', p->>'id', '')), '');
  if v_raw is null or v_raw !~ '^[0-9]+$' then
    return jsonb_build_object('ok', false, 'error', 'document_id_required');
  end if;
  -- ספרות בלבד עדיין יכולות לחרוג מ-bigint (0064 הכרעה 3).
  if length(v_raw) > 18 then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_raw);
  end if;
  v_doc_id := v_raw::bigint;

  select * into v_doc from bkalot_clone.documents d where d.id = v_doc_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'document_not_found', 'id', v_doc_id);
  end if;

  -- ── כבר בתור: מחזירים את הקיימת, לא יוצרים שנייה (0067 הכרעה 6) ─────────
  if v_doc.queue_id is not null then
    select jsonb_build_object(
             'ok',            true,
             'already_queued', true,
             'queue_id',      q.id,
             'status',        q.status,
             'blocked',       (q.status = 'blocked'),
             'mode',          q.mode,
             'to_address',    q.to_address,
             'subject',       q.subject,
             'content_bytes', q.content_bytes,
             'message',       'המסמך כבר בתור. לא נוצרה שורה שנייה.')
      into v_existing
      from bkalot_auto.outbound_queue q
     where q.id = v_doc.queue_id;
    -- FK הוא ON DELETE SET NULL, ולכן queue_id שאין לו שורה אינו אמור לקרות;
    -- אם קרה — אומרים אותו ולא מתקנים בשקט.
    if v_existing is null then
      return jsonb_build_object('ok', false, 'error', 'queue_row_missing',
                                'queue_id', v_doc.queue_id, 'document_id', v_doc_id);
    end if;
    return v_existing;
  end if;

  -- ── הערוץ נגזר מסוג המסמך ──────────────────────────────────────────────
  -- pdf/audio קיימים ב-documents_kind_known ואין להם עדיין ערוץ בשכפול.
  if v_doc.kind <> 'email' then
    return jsonb_build_object('ok', false, 'error', 'channel_unsupported',
                              'document_kind', v_doc.kind);
  end if;
  v_channel := 'email';

  v_body := coalesce(nullif(btrim(coalesce(v_doc.body_html, '')), ''),
                     nullif(btrim(coalesce(v_doc.body_text, '')), ''));
  if v_body is null then
    return jsonb_build_object('ok', false, 'error', 'document_empty',
                              'document_id', v_doc_id);
  end if;
  -- הגוף שנכנס לתור הוא הגוף שהופק, כמות שהוא (0067 הכרעה 5).
  v_body  := coalesce(v_doc.body_html, v_doc.body_text);
  v_bytes := octet_length(v_body);

  select * into v_case from bkalot_clone.cases c where c.id = v_doc.case_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'case_not_found',
                              'case_id', v_doc.case_id);
  end if;
  if v_case.contact_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_contact', 'case_id', v_case.id);
  end if;

  -- איש הקשר עדיין נדרש: outbound_queue.contact_id הוא FK, והשולח יצטרך את
  -- הזהות. הוא אינו מקור לכתובת (#235).
  select * into v_contact from bkalot_auto.contacts ct where ct.id = v_case.contact_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_contact', 'case_id', v_case.id);
  end if;
  v_contact_email := nullif(btrim(coalesce(v_contact.email, '')), '');

  -- ── שומר 1א: ההסכמה של הפנייה הזו ───────────────────────────────────────
  if not v_case.consent then
    return jsonb_build_object('ok', false, 'error', 'no_consent',
                              'consent_source', 'case',
                              'case_id', v_case.id,
                              'message', 'הפונה לא סימן הסכמה בפנייה הזו. לא נכנס לתור.');
  end if;

  -- ── שומר 1ב: השתקה ברמת האדם ────────────────────────────────────────────
  if not v_contact.consent then
    return jsonb_build_object('ok', false, 'error', 'no_consent',
                              'consent_source', 'contact',
                              'case_id', v_case.id,
                              'message', 'איש הקשר מסומן כמי שאין לפנות אליו. לא נכנס לתור.');
  end if;

  -- ── שומר 2: כתובת — של הפנייה, לא של איש הקשר ──────────────────────────
  v_to := nullif(btrim(coalesce(v_case.to_email, '')), '');
  if v_to is null then
    return jsonb_build_object('ok', false, 'error', 'no_address',
                              'channel', v_channel,
                              'case_id', v_case.id,
                              'message', 'לא נמסרה כתובת בפנייה הזו. אין לאן לשלוח.');
  end if;

  -- ── שומר 3: רשימת יעדי הבדיקה, בנוסח של המקור ───────────────────────────
  select exists (
    select 1 from bkalot_auto.test_targets tt
     where tt.value = v_to and tt.kind = 'email'
  ) into v_allowed;

  if v_allowed then
    v_status := 'queued';
    v_detail := null;
  else
    v_status := 'blocked';
    v_detail := 'היעד אינו ברשימת יעדי הבדיקה. לא יישלח.';
  end if;

  insert into bkalot_auto.outbound_queue
    (app_key, contact_id, topic_id, channel, to_address, subject, body,
     mode, status, status_detail, max_attempts, content_bytes)
  values
    ('bkalot-clone', v_contact.id, null, v_channel, v_to,
     v_doc.title, v_body,
     'test', v_status, v_detail,
     -- max_attempts=0: אין ניסיון אוטומטי מותר. זה מה שמוציא את השורה
     -- מהסריקה של מנוע המקור בלי לגעת בו (0067 הכרעה 2).
     0, v_bytes)
  returning id into v_queue_id;

  update bkalot_clone.documents
     set queue_id = v_queue_id
   where id = v_doc_id;

  return jsonb_build_object(
    'ok',            true,
    'already_queued', false,
    'queue_id',      v_queue_id,
    'document_id',   v_doc_id,
    'case_id',       v_case.id,
    'status',        v_status,
    'blocked',       (v_status = 'blocked'),
    'mode',          'test',
    'channel',       v_channel,
    'to_address',    v_to,
    -- מאיפה נלקחה הכתובת, והאם איש הקשר נושא כתובת אחרת. השדה השני הוא
    -- העדות ש-#235 קיים בפועל ולא רק בתיאוריה — הוא true בדיוק כשפנייה
    -- מאוחרת יותר דרסה את המייל של איש הקשר.
    'address_source', 'case',
    'contact_email_differs', (v_contact_email is distinct from v_to),
    'subject',       v_doc.title,
    'content_bytes', v_bytes,
    'message', case when v_status = 'blocked'
                    then 'נרשם בתור כ-blocked: היעד אינו יעד בדיקה מאושר. לא יישלח.'
                    else 'נכנס לתור במצב בדיקה. אין שולח — לא נשלח דבר.' end);
end;
$function$;

-- ── 4. הרשאות נכתבות שוב במפורש ────────────────────────────────────────────
-- create or replace אינו מאפס אותן, אבל פונקציה ב-public מקבלת EXECUTE ל-PUBLIC
-- כברירת מחדל, ומפתח ה-anon גלוי בקוד המקור של הטופס הציבורי מאז #223.
revoke all on function public.bkalot_clone_queue(jsonb) from public, anon, authenticated;
grant execute on function public.bkalot_clone_queue(jsonb) to service_role;

revoke all on function public.bkalot_clone_intake(jsonb) from public;
grant execute on function public.bkalot_clone_intake(jsonb) to service_role;
