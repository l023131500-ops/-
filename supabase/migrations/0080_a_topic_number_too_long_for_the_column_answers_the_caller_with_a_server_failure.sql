-- 0080 — שכפול בקלות שכבה 1
-- מספר נושא ארוך מכפי שהעמודה מחזיקה עונה לקורא בתקלת שרת.
--
-- מי כתב את הקו הזה: 41ccad1 (0079), בשורה האחרונה שלה, מילה במילה:
-- «'^[0-9]+$' מקבל מחרוזת ארוכה מכפי שנכנסת ל-integer ('9' כפול 12), ואז
-- ה-cast זורק 22003 שאיש אינו תופס — הקורא מקבל rpc_failed 502 ולא שגיאת
-- שדה. זה קו נפרד, ולא נגעתי בו כאן». כאן נלקח הקו הזה, ורק הוא.
--
-- מה נמדד עכשיו ולא הוסק. POST אל /functions/v1/bkalot-clone-intake עם מפתח
-- anon (PowerShell, לא דפדפן), kind=treatment, situation=young_single,
-- topic_no="999999999999":
--
--   HTTP 502
--   {"ok":false,"error":"rpc_failed","status":400,
--    "detail":"{\"code\":\"22003\",\"details\":null,\"hint\":null,
--               \"message\":\"value \\\"999999999999\\\" is out of range for type integer\"}"}
--
-- שתי תקלות בתשובה אחת, ושתיהן נסגרות כאן:
--
-- (1) הקורא מקבל 502 — «השרת נפל» — על שדה שהוא מסר בעצמו וטעה בו. 0079
--     קבעה ש-topic_no בטיפול מלא הוא שדה שנשאל, נמסר, ולכן ערך שגוי בו פוסל
--     את הפנייה עם topic_no_invalid. "שבע" נופל תחת הכלל הזה; "999999999999"
--     בדיוק כמוהו — הוא אינו מספר נושא שהעמודה יכולה להחזיק — אבל הוא בורח
--     דרך הרגקס ומגיע ל-cast, ושם זו כבר חריגה שאיש אינו תופס.
--
-- (2) הודעת השגיאה הפנימית של PostgREST — קוד SQLSTATE ונוסח באנגלית של
--     המנוע — יוצאת כפי שהיא לקורא ציבורי. הפונקציה כאן היא שיוצרת אותה,
--     ולכן היא גם המקום היחיד שיכול למנוע אותה: משעה שהערך נפסל לפני ה-cast,
--     אין חריגה, ואין מה שיודלף.
--
-- מה שאין כאן: הגבול נבדק מול מה שהעמודה מחזיקה בפועל —
-- bkalot_clone.cases.topic_no היא integer, נמדד ולא הונח — ולא מול גבול
-- מוצרי שהומצא כאן. אילו הייתי בוחר מספר "סביר" (999? 99999?) הייתי פוסל
-- מספרי נושא חוקיים לגמרי שאיש לא ביקש לפסול. הגבול הוא גבול הטיפוס.
--
-- ארבע הכרעות:
--
-- (1) אותו קוד שגיאה, topic_no_invalid, ולא קוד חדש. לקורא זו אותה טעות
--     בדיוק — מספר נושא שאינו מספר נושא תקין — וההבחנה בין "אינו ספרות"
--     ל"ספרות רבות מדי" היא פרט מימוש של טיפוס העמודה. קוד נוסף היה מחייב
--     את כל מי שקורא לנתיב הזה להכיר שניים במקום אחד. ה-detail העברי הוא
--     שמסביר מה בדיוק נפל, וזו בדיוק חלוקת העבודה של #223 סעיף 3.
--
-- (2) בדיקה מפורשת לפני ה-cast, ולא exception handler סביבו. handler היה
--     תופס גם 22003 שמקורו במקום אחר בפונקציה ומדביק לו את התווית
--     topic_no_invalid — כלומר הופך שגיאה לא קשורה לשקר על השדה הזה. הבדיקה
--     המפורשת פוסלת את מה שהיא באמת יודעת עליו.
--
-- (3) ההשוואה נעשית ב-numeric ולא ב-bigint. bigint פותר את '9' כפול 12 ונופל
--     בעצמו על '9' כפול 20 — אותה תקלה בדיוק, רק רחוקה יותר. numeric אינו
--     חסום ברוחב, ולכן הבדיקה נכונה לכל מחרוזת ספרות שהרגקס מקבל. גודל הקלט
--     חסום ממילא ב-body_too_large ב-edge function.
--
-- (4) הרגקס '^[0-9]+$' לא זז, וגם btrim לא. אלה בדיוק הבדיקות שהחסימה
--     המוקדמת במסך מריצה מילה במילה (4746bf3), ו-0079 הכרעה (2) קבעה ששתיהן
--     חייבות להסכים. התוספת כאן היא כלל *נוסף* שהמסך אינו מכיר, ולכן היא
--     חד-כיוונית לכיוון הבטוח: המסך שולח ערך שהשרת פוסל — הקורא מקבל שגיאת
--     שדה מפורשת — ולא ההפך.
--
-- מה שנשאר פתוח ואינו נשכח: MESSAGES ב-apps/37-bkalot-clone עדיין אינו מכיר
-- topic_no_invalid, ולכן דפדפן שישלח "999999999999" (החסימה המוקדמת מעבירה
-- אותו — הרגקס שלה מקבל) יראה מעכשיו «קוד: topic_no_invalid» במקום 502 אטום.
-- שתיהן הודעות שאינן ראויות; זו קו פתוח נפרד מאז 0079, והוא צעד במסך ולא כאן.

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
    -- 0079: כאן השדה נשאל ונמסר, ולכן ערך שגוי בו פוסל את הפנייה ואינו נושר
    -- ממנה בשקט. הבדיקה זהה מילה במילה לזו שהייתה כאן ולחסימה המוקדמת שבמסך.
    if v_topic_raw is not null then
      if v_topic_raw ~ '^[0-9]+$' then
        -- 0080: הרגקס מאשר גם מחרוזת ספרות ארוכה מכפי ש-integer מחזיק, וה-cast
        -- שמתחתיה זרק 22003 שאיש לא תפס — 502 לקורא, ועוד עם נוסח המנוע בתוכו.
        -- הגבול הוא גבול העמודה (bkalot_clone.cases.topic_no היא integer),
        -- וההשוואה ב-numeric כדי שלא תיפול בעצמה על מחרוזת ארוכה עוד יותר.
        if v_topic_raw::numeric > 2147483647 then
          return jsonb_build_object('ok', false, 'error', 'topic_no_invalid',
                                    'detail', 'מספר הנושא גדול מכל מספר נושא שקיים במערכת');
        end if;
        v_topic := v_topic_raw::integer;
      else
        return jsonb_build_object('ok', false, 'error', 'topic_no_invalid',
                                  'detail', 'מספר הנושא הוא מספר שלם — הפנייה מנותבת לפיו');
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
