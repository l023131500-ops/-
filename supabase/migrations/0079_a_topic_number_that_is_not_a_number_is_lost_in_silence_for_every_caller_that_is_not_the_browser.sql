-- 0079 — שכפול בקלות שכבה 1
-- מספר נושא שאינו מספר נעלם בשקט לכל קורא שאינו הדפדפן.
--
-- מי כתב את הקו הזה: 4746bf3, בסוף שרשרת ההגנה של הטופס, מילה במילה:
-- «bkalot-clone-intake v1 עדיין מקבלת topic_no לא-מספרי מכל קורא שאינו הדפדפן
-- ומשמיטה בשקט ל-dropped[]; הרשת קיימת רק במסך». כאן נלקחת הלבנה הזו, ורק היא.
--
-- מה היה: 0058 מפילה בטיפול מלא topic_no שאינו '^[0-9]+$' אל dropped[] ומחזירה
-- ok:true. a6eb793..4746bf3 בנו את הרשת בצד הלקוח — תווית עברית לשדה שנפל,
-- הסיבה שלו, המיקוד שחוזר אליו, ולבסוף חסימה מוקדמת שאינה שולחת בכלל. כל
-- ארבעתן נמדדו בדפדפן חי ופרוסות. אבל הן קוד במסך: apps/37-bkalot-clone.
-- הנתיב עצמו — POST אל /functions/v1/bkalot-clone-intake עם מפתח anon, שהוא
-- ציבורי מעצם הגדרתו — פתוח לכל קורא, ומי שאינו טוען את המסך הזה אינו נושא
-- אף אחת מארבע השכבות. נמדד עכשיו ולא הוסק: POST ישיר עם
-- topic_no="שבע" ו-situation=young_single החזיר 200 ok:true, case_id 154,
-- dropped ["topic_no"], rights_linked 36 — והשורה במסד יצאה topic_no = null
-- כשהערך שנמסר יושב רק ב-raw.
--
-- למה זו תקלת מוצר ולא הערה על שדה: בטיפול מלא מספר הנושא הוא השדה שהפנייה
-- מנותבת לפיו. ok:true אומר לקורא שהפנייה נקלטה כפי שנשלחה, ואין בו דבר
-- שיעצור אותו — dropped[] הוא מפתח באנגלית בתוך תשובה מוצלחת, ומי שקורא רק
-- ok אינו רואה אותו כלל. התוצאה היא פנייה חיה במצב new, 36 זכויות מחוברות
-- אליה, ומספר הנושא שלה אבוד. מי ששלח אותה משוכנע שהוא נשלח.
--
-- מה נבנה כאן: בטיפול מלא, topic_no שאינו מספר שלם נפסל — ok:false,
-- error topic_no_invalid — ואין פנייה. אין שינוי סכמה, אין נגיעה בטבלאות,
-- ואין נגיעה ב-edge function: היא דקה בכוונה (#223) והכלל היחיד יושב כאן.
--
-- ארבע הכרעות:
--
-- (1) דחייה ולא השלמה בשקט. ל-0058 יש שתי דרכים לטפל בשדה בעייתי, והיא
--     משתמשת בשתיהן: phone_invalid/email_invalid/situation_unknown פוסלים את
--     הפנייה כולה, ו-dropped[] משמיט שדה וממשיך. ההבחנה ביניהן אינה חומרת
--     השדה אלא מי טעה: dropped[] נועד לשדה שהסוג אינו שואל כלל — מי ששלח
--     situation ב-info לא טעה בערך, הוא שלח שדה שאינו שייך, וההשמטה היא
--     הכיווץ לפי הסוג. topic_no בטיפול מלא הוא ההפך הגמור: השדה נשאל, נמסר,
--     והערך שגוי. זו בדיוק המשפחה של phone_invalid.
--
-- (2) הבדיקה נשארת '^[0-9]+$' מילה במילה, ולא הורחבה תוך כדי לרווחים פנימיים
--     או לסימן מינוס. הרחבה כאן הייתה משנה שני דברים בבת אחת ומפרידה את השרת
--     מהחסימה המוקדמת של 4746bf3, שהיא אותה בדיקה בדיוק — ושתיהן חייבות
--     להסכים, אחרת המסך חוסם ערך שהשרת מקבל או להפך.
--
-- (3) הענף של info/reminder לא נגעתי בו: שם topic_no ממשיך ליפול אל dropped[]
--     בדיוק כפי שהיה. שם הסוג אינו שואל את השדה, ולפי הכרעה (1) זו ההשמטה
--     הנכונה. הטופס אף אינו מציג את השדה בסוגים האלה, ופסילה שם הייתה עוצרת
--     פנייה תקינה על שדה שלא נשאל.
--
-- (4) detail בעברית, כמו ב-phone_invalid ובניגוד לשאר הקודים. MESSAGES
--     ב-apps/37 עדיין אינו מכיר topic_no_invalid, ולכן עד שיכיר את הקוד fail()
--     תדפיס «קוד: topic_no_invalid» — היא אינה בולעת קוד לא מוכר. במסך זה
--     נתיב שאי אפשר להגיע אליו (החסימה המוקדמת עוצרת לפני השליחה), אבל
--     ה-detail הופך גם את הנתיב הזה לקריא, ואת התשובה לקורא שאינו דפדפן —
--     שהוא כל עניינה של המיגרציה הזו — למובנת בלי לקרוא קוד.
--
-- מה שאין כאן ואינו נשכח: '^[0-9]+$' מקבל מחרוזת ארוכה משיכולה להיכנס
-- ל-integer ('9' כפול 12), ואז ה-cast זורק 22003 שאיש אינו תופס — הקורא מקבל
-- rpc_failed 502 ולא שגיאת שדה. זה קו נפרד, ולא נגעתי בו כאן.

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
