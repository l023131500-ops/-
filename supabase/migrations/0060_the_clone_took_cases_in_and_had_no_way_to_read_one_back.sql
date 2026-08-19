-- 0060 — bkalot_clone שכבה 2, הלבנה הראשונה: נתיב הקריאה (core.issues #224)
--
-- מה היה: שכבה 1 שלמה — טופס → edge function → public.bkalot_clone_intake →
-- cases/case_rights/contacts, והכתובת more30.com/bkalot-studio חיה (#223).
-- מה שאין הוא הצד השני: פנייה נכנסת למסד ואין ולו שאילתה אחת שאפשר לקרוא אותה
-- בחזרה דרכה. bkalot_clone אינה חשופה ל-PostgREST כלל (נמדד ב-0058), ולכן
-- "רשימת פניות" אינה שאלה של הרשאות אלא של פונקציה ב-public — בדיוק כמו הקליטה.
--
-- מה נבנה כאן — שתי פונקציות קריאה, מראה של נתיב הכתיבה:
--   public.bkalot_clone_admin_cases(jsonb)  — רשימה מסוננת ומדופדפת + total
--   public.bkalot_clone_admin_case(bigint)  — פנייה בודדת עם הזכויות והמסמכים
-- SECURITY DEFINER, search_path ריק, כל שם מלא, EXECUTE ל-service_role בלבד.
--
-- ארבע הכרעות שנגזרות ממדידה ולא מהעדפה:
--
-- (1) LEFT JOIN אל bkalot_auto.contacts ולא JOIN. cases_contact_id_fkey הוא
--     ON DELETE SET NULL (נמדד ב-#223), ולכן מחיקת איש קשר מייתמת פניות בשקט.
--     JOIN רגיל היה משמיט אותן מהרשימה — פנייה שקיימת ואינה מוצגת היא בדיוק
--     סוג הכשל שנראה כמו רשימה תקינה. כאן contact הוא null מפורש.
--
-- (2) אין ולו מילה בעברית בפלט. כל הניסוח (kind/status/situation) יושב במילון
--     של הלקוח מאז #223, וקוד שאין לו תרגום מוצג עם הקוד עצמו. שרת שהיה מחזיר
--     תווית היה מייצר מקור ניסוח שני שמסתעף מהראשון.
--
-- (3) הזכויות מצטרפות ל-bkalot_clone.rights_catalog ב-LEFT JOIN מאותה סיבה:
--     הקטלוג מיובא מחדש כמכלול (0057), ולכן קוד שהתיישן חייב להופיע עם
--     in_catalog=false ולא להיעלם מהפנייה שכבר חוברה אליו.
--
-- (4) קלט לא-תקין חוזר כ-JSON ולא כחריגה, כמו ב-0058: limit/offset שאינם ספרות
--     נופלים לברירת מחדל במקום 22P02, ו-status/kind לא מוכר מחזיר allowed[].
--     הרשת הזו כותבת מחדש סטטוסי שגיאה ל-400 (זיכרון תפעולי), ולכן 500 מקריסת
--     cast לא היה ניתן להבחנה מנפילת שער.
--
-- ⚠️ מה שהפונקציות האלה אינן עושות, ונרשם כדי שלא ייבלע: אין בהן שום בדיקת
--    זהות. הן מחזירות כל פנייה למי שמחזיק service_role. הכניסה לניהול (#224
--    סעיף 2) חייבת לנחות לפני שיש להן כתובת HTTP — edge function שיקרא להן בלי
--    שער היה חושף את כל הפניות למי שמחזיק את מפתח ה-anon.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות csj/csj_src/igud.
--    אין DDL על טבלה קיימת כלל — שתי פונקציות קריאה בלבד, בלי INSERT/UPDATE/DELETE.
--    מצב טסט: אין נגיעה ב-bkalot_auto.outbound_queue ואין שליחה.

-- ── רשימת הפניות ─────────────────────────────────────────────────────────────
create or replace function public.bkalot_clone_admin_cases(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_limit    int  := 50;
  v_offset   int  := 0;
  v_status   text;
  v_kind     text;
  v_q        text;
  v_total    bigint;
  v_rows     jsonb;
  c_statuses text[] := array['new','in_progress','sent','closed','rejected'];
  c_kinds    text[] := array['info','reminder','treatment'];
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    p := '{}'::jsonb;
  end if;

  -- ספרות בלבד; כל דבר אחר נופל לברירת מחדל ולא מקריס cast
  if (p->>'limit') ~ '^[0-9]+$' then
    v_limit := least(greatest((p->>'limit')::int, 1), 200);
  end if;
  if (p->>'offset') ~ '^[0-9]+$' then
    v_offset := (p->>'offset')::int;
  end if;

  v_status := nullif(p->>'status', '');
  v_kind   := nullif(p->>'kind', '');
  v_q      := nullif(btrim(coalesce(p->>'q', '')), '');

  if v_status is not null and not (v_status = any(c_statuses)) then
    return jsonb_build_object('ok', false, 'error', 'status_unknown',
                              'allowed', to_jsonb(c_statuses));
  end if;
  if v_kind is not null and not (v_kind = any(c_kinds)) then
    return jsonb_build_object('ok', false, 'error', 'kind_unknown',
                              'allowed', to_jsonb(c_kinds));
  end if;

  select count(*) into v_total
    from bkalot_clone.cases c
    left join bkalot_auto.contacts ct on ct.id = c.contact_id
   where (v_status is null or c.status = v_status)
     and (v_kind   is null or c.kind   = v_kind)
     and (v_q is null
          or c.id::text = v_q
          or ct.full_name ilike '%' || v_q || '%'
          or ct.phone     ilike '%' || v_q || '%'
          or ct.email     ilike '%' || v_q || '%');

  select coalesce(jsonb_agg(s.j order by s.ord_at desc, s.ord_id desc), '[]'::jsonb)
    into v_rows
    from (
      select c.created_at as ord_at,
             c.id         as ord_id,
             jsonb_build_object(
               'id',         c.id,
               'created_at', c.created_at,
               'kind',       c.kind,
               'status',     c.status,
               'source',     c.source,
               'situation',  c.situation,
               'topic_no',   c.topic_no,
               'note',       c.note,
               -- null מפורש ולא היעלמות: ראה הכרעה (1)
               'contact',    case when ct.id is null then null
                                  else jsonb_build_object(
                                         'id',        ct.id,
                                         'full_name', ct.full_name,
                                         'phone',     ct.phone,
                                         'email',     ct.email,
                                         'consent',   ct.consent) end,
               'rights_count',    (select count(*) from bkalot_clone.case_rights r
                                    where r.case_id = c.id),
               'chosen_count',    (select count(*) from bkalot_clone.case_rights r
                                    where r.case_id = c.id and r.chosen),
               'documents_count', (select count(*) from bkalot_clone.documents d
                                    where d.case_id = c.id)) as j
        from bkalot_clone.cases c
        left join bkalot_auto.contacts ct on ct.id = c.contact_id
       where (v_status is null or c.status = v_status)
         and (v_kind   is null or c.kind   = v_kind)
         and (v_q is null
              or c.id::text = v_q
              or ct.full_name ilike '%' || v_q || '%'
              or ct.phone     ilike '%' || v_q || '%'
              or ct.email     ilike '%' || v_q || '%')
       order by c.created_at desc, c.id desc
       limit v_limit offset v_offset
    ) s;

  return jsonb_build_object(
    'ok',     true,
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset,
    'cases',  v_rows);
end;
$fn$;

comment on function public.bkalot_clone_admin_cases(jsonb) is
  'שכבה 2 של שכפול בקלות: רשימת פניות מסוננת ומדופדפת. LEFT JOIN אל contacts כי '
  'ה-FK הוא ON DELETE SET NULL. אין בה בדיקת זהות — service_role בלבד.';

-- ── פנייה בודדת ──────────────────────────────────────────────────────────────
create or replace function public.bkalot_clone_admin_case(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_case jsonb;
begin
  if p_id is null then
    return jsonb_build_object('ok', false, 'error', 'case_id_required');
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
           'note',       c.note,
           'raw',        c.raw,
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
   where c.id = p_id;

  if v_case is null then
    return jsonb_build_object('ok', false, 'error', 'case_not_found', 'case_id', p_id);
  end if;

  return jsonb_build_object(
    'ok',   true,
    'case', v_case,
    -- LEFT JOIN אל הקטלוג: קוד שהתיישן מוצג עם in_catalog=false ואינו נעלם
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
    -- מטא-דאטה בלבד: גוף המסמך אינו נשלח ברשימה (שכבה 3 טרם קיימת)
    'documents', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id',           d.id,
                 'kind',         d.kind,
                 'title',        d.title,
                 'storage_path', d.storage_path,
                 'queue_id',     d.queue_id,
                 'has_body',     (d.body_html is not null or d.body_text is not null),
                 'created_at',   d.created_at)
               order by d.created_at, d.id)
          from bkalot_clone.documents d
         where d.case_id = p_id), '[]'::jsonb));
end;
$fn$;

comment on function public.bkalot_clone_admin_case(bigint) is
  'שכבה 2 של שכפול בקלות: פנייה בודדת + זכויות (LEFT JOIN לקטלוג החי) + מטא-דאטה '
  'של מסמכים. אין בה בדיקת זהות — service_role בלבד.';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- פונקציה חדשה מקבלת EXECUTE ל-PUBLIC כברירת מחדל בפוסטגרס. בלי ה-revoke הזה,
-- שתי פונקציות SECURITY DEFINER שיושבות ב-public היו פותחות לכל מחזיק מפתח anon
-- קריאה של כל פנייה שנקלטה — כולל טלפון ומייל של מי שהשאיר פרטים.
revoke all on function public.bkalot_clone_admin_cases(jsonb) from public, anon, authenticated;
revoke all on function public.bkalot_clone_admin_case(bigint) from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_cases(jsonb) to service_role;
grant execute on function public.bkalot_clone_admin_case(bigint)  to service_role;
