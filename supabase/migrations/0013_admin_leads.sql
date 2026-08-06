-- 0013_admin_leads.sql — גישה כללית ללידים של כל המערכות במקום אחד (more30-priority §2)
--
-- §2 דורש שהסופר-אדמין יראה את הלידים של **כל** המערכות במקום אחד. עד היום
-- לא היה מסך כזה: הלידים יושבים ב-28 טבלאות שונות ב-13 סכימות, כל אחת עם
-- שמות עמודות משלה (name / full_name / contact_full_name / requester_name),
-- וחלקן במראות הקרות של הפרויקטים שלפני האיחוד (igud = bieebmnm,
-- csj / csj_kupot / csj_nadlan = csjekrvu).
--
-- שלושה דברים שנקבעו כאן במכוון:
--
-- 1. **גם המקורות הריקים מוצגים.** מקור עם 0 שורות ומקור שהמסך לא יודע עליו
--    נראים אותו דבר למי שמסתכל. לכן `sources` מחזיר את כל 28 המקורות עם
--    הספירה האמיתית שלהם, כולל האפסים — "אין לידים" הוא נתון, "לא הסתכלנו"
--    הוא לא. נמדד על המאגר החי: 8 מקורות מתוך 28 מחזיקים 75 פניות, ו-20
--    ריקים. בלי המרשם המפורש 20 מהם היו נעלמים מהמסך בשקט.
-- 2. **created_at הוא text בשש טבלאות** מהמראות הקרות (העתקה בלי המרת טיפוס).
--    המרה ישירה ב-cast הפילה את השאילתה, ולכן `core.ts_or_null` בולעת ערך
--    לא-תקין ומחזירה null במקום להפיל את כל המסך בגלל שורה אחת פגומה.
--    מאותה סיבה **כל** עמודה ב-union מקבלת cast מפורש ל-text ול-timestamptz:
--    ‏28 הטבלאות מגיעות מסכימות שנבנו בנפרד וטיפוסי העמודות אינם זהים ביניהן
--    (varchar מול text, timestamp מול timestamptz). בלי ה-cast ה-union נסמך
--    על ההסתעפות הראשונה בלבד ונשבר על הטבלה הראשונה שחורגת ממנה.
-- 3. **אין כאן שכתוב של הרשאות.** הפונקציה SECURITY DEFINER ומגודרת
--    לסופר-אדמין בלבד — אותו שער בדיוק שמגן על /admin/issues. anon מקבל
--    42501, ומשתמש מחובר שאינו סופר-אדמין מקבל את אותה שגיאה.
--    (`more30_is_admin()` אינו הרחבה: הוא עצמו `select more30_is_super_admin()`.)

create schema if not exists core;

-- ── עזר: המרת text ל-timestamptz בלי להפיל את השאילתה ────────────────────
create or replace function core.ts_or_null(p text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return nullif(btrim(coalesce(p, '')), '')::timestamptz;
exception when others then
  return null;
end;
$$;

comment on function core.ts_or_null(text) is
  'המרת מחרוזת לזמן שלא מפילה שאילתה על ערך פגום. נדרש כי created_at הוא text בשש טבלאות מהמראות הקרות של bieebmnm/csjekrvu.';

-- ── התצוגה המאוחדת ────────────────────────────────────────────────────────
-- הנרמול: כל מקור מתורגם לאותן שמונה עמודות. שדה שאינו קיים במקור נשאר
-- null ומוצג במסך כ"לא זמין" — לא ממציאים ערך כדי למלא עמודה.
create or replace view core.lead_feed as
  -- 32 · נדל"ן ברגע
  select 'nadlan.report_requests'::text as src, '32'::text as system_number,
         'נדל"ן ברגע'::text as system_name, 'nadlan'::text as system_path,
         'בקשת דוח'::text as kind, full_name::text, phone::text, email::text,
         query::text as subject, status::text as status, created_at::timestamptz
    from nadlan.report_requests
  union all
  select 'nadlan.document_requests', '32', 'נדל"ן ברגע', 'nadlan',
         'בקשת מסמך', full_name::text, phone::text, email::text, doc_type::text,
         status::text, created_at::timestamptz
    from nadlan.document_requests
  union all
  select 'csj_nadlan.research_leads', '32', 'נדל"ן ברגע (מראת csjekrvu)', 'nadlan',
         'בקשת מחקר', full_name::text, phone::text, email::text, query_address::text,
         status::text, created_at::timestamptz
    from csj_nadlan.research_leads
  -- 36 · נדל״ן פרו
  union all
  select 'nadlan_pro.contacts', '36', 'נדל״ן פרו — ניהול למתווכים', 'tivuch',
         coalesce(kind::text, 'איש קשר'), full_name::text, phone::text, email::text,
         coalesce(want_city, city)::text,
         case when is_archived then 'archived' else 'active' end, created_at::timestamptz
    from nadlan_pro.contacts
  -- 15 · איגוד
  union all
  select 'egod.leads', '15', 'איגוד (egod)', 'egod',
         coalesce(kind::text, 'ליד'), full_name::text, phone::text, null,
         coalesce(preferred_subject, area)::text, status::text, created_at::timestamptz
    from egod.leads
  -- 22 · מימוש זכויות
  union all
  select 'getrights.leads', '22', 'מימוש זכויות', 'zchuyot',
         coalesce(service_type, 'ליד')::text, name::text, phone::text, null,
         coalesce(selected_right, category)::text, status::text, created_at::timestamptz
    from getrights.leads
  -- 31 · גשר עברית
  union all
  select 'hebcrm.leads', '31', 'גשר עברית CRM', 'gesher',
         coalesce(source, 'ליד')::text, name::text, phone::text, email::text,
         message::text, status::text, created_at::timestamptz
    from hebcrm.leads
  -- 16 · חצור קונקט
  union all
  select 'chatzor.inquiries', '16', 'חצור קונקט', 'chatzor',
         'פנייה', name::text, phone::text, email::text, subject::text,
         case when is_read then 'read' else 'new' end, created_at::timestamptz
    from chatzor.inquiries
  union all
  select 'chatzor.azkarot_requests', '16', 'חצור קונקט', 'chatzor',
         'בקשת אזכרה', requester_name::text, contact::text, null, deceased_name::text,
         case when is_read then 'read' else 'new' end, created_at::timestamptz
    from chatzor.azkarot_requests
  -- 28 · השוואת קופות חולים
  union all
  select 'public.hf_switch_leads', '28', 'השוואת קופות חולים', 'kupot',
         'מעבר קופה', full_name::text, phone::text, email::text, topic::text,
         status::text, created_at::timestamptz
    from public.hf_switch_leads
  union all
  select 'csj_kupot.hf_switch_leads', '28', 'השוואת קופות חולים (מראת csjekrvu)', 'kupot',
         'מעבר קופה', full_name::text, phone::text, email::text, topic::text,
         status::text, created_at::timestamptz
    from csj_kupot.hf_switch_leads
  -- 10 · אוטומציית בקלות
  union all
  select 'bkalot_auto.contacts', '10', 'מימוש זכויות בקלות', 'bkalot',
         coalesce(source, 'איש קשר')::text, full_name::text, phone::text, email::text,
         app_key::text, null, created_at::timestamptz
    from bkalot_auto.contacts
  -- 01/10 · מראת bieebmnm
  union all
  select 'igud.leads', '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah',
         coalesce(kind::text, 'ליד'), full_name::text, phone::text, email::text,
         coalesce(preferred_subject, message)::text, status::text, created_at::timestamptz
    from igud.leads
  union all
  select 'igud.service_submissions', '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah',
         coalesce(request_type, 'בקשת שירות')::text, null, null, null,
         coalesce(topic, category)::text, status::text, core.ts_or_null(created_at)
    from igud.service_submissions
  union all
  select 'igud.inbound_leads', '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah',
         coalesce(lead_kind, 'ליד נכנס')::text, contact_full_name::text,
         contact_phone::text, contact_email::text,
         coalesce(topic, category)::text, status::text, core.ts_or_null(created_at)
    from igud.inbound_leads
  union all
  select 'igud.fin_leads', '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah',
         coalesce(mode, 'ליד פיננסי')::text, full_name::text, phone::text, email::text,
         message::text, status::text, core.ts_or_null(created_at)
    from igud.fin_leads
  union all
  select 'igud.potential_submissions', '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah',
         'בדיקת פוטנציאל', contact_full_name::text, contact_phone::text,
         contact_email::text, slug::text, null, core.ts_or_null(created_at)
    from igud.potential_submissions
  union all
  select 'igud.hf_requests', '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah',
         coalesce(request_type, 'בקשה')::text, full_name::text, phone::text, email::text,
         topic::text, null, core.ts_or_null(created_at)
    from igud.hf_requests
  -- מראת csjekrvu
  union all
  select 'csj.kupot_leads', '28', 'השוואת קופות חולים (מראת csjekrvu)', 'kupot',
         coalesce(req_type, 'ליד')::text, full_name::text, phone::text, email::text,
         topic::text, status::text, created_at::timestamptz
    from csj.kupot_leads
  union all
  select 'csj.fin_leads', null, 'מראת csjekrvu', null,
         coalesce(mode, 'ליד פיננסי')::text, full_name::text, phone::text, email::text,
         message::text, status::text, core.ts_or_null(created_at)
    from csj.fin_leads
  union all
  select 'csj.inbound_leads', null, 'מראת csjekrvu', null,
         coalesce(lead_kind, 'ליד נכנס')::text, contact_full_name::text,
         contact_phone::text, contact_email::text,
         coalesce(topic, category)::text, status::text, core.ts_or_null(created_at)
    from csj.inbound_leads
  union all
  select 'csj.potential_submissions', null, 'מראת csjekrvu', null,
         'בדיקת פוטנציאל', contact_full_name::text, contact_phone::text,
         contact_email::text, slug::text, null, core.ts_or_null(created_at)
    from csj.potential_submissions
  union all
  select 'csj.service_submissions', null, 'מראת csjekrvu', null,
         coalesce(request_type, 'בקשת שירות')::text, null, null, null,
         coalesce(topic, category)::text, null, core.ts_or_null(created_at)
    from csj.service_submissions
  union all
  select 'csj.hf_requests', null, 'מראת csjekrvu', null,
         coalesce(request_type, 'בקשה')::text, full_name::text, phone::text, email::text,
         topic::text, null, core.ts_or_null(created_at)
    from csj.hf_requests
  -- הפלטפורמה עצמה
  union all
  select 'core.spec_submissions', null, 'more30 — אפיון מערכת', null,
         coalesce(track, 'אפיון')::text, full_name::text, phone::text, email::text,
         project_name::text, status::text, created_at::timestamptz
    from core.spec_submissions
  union all
  select 'public.startup_intake_submissions', null, 'more30 — עולם הסטארטאפים', 'showcase',
         coalesce(stage, 'הרשמה')::text, full_name::text, phone::text, email::text,
         project_name::text, status::text, created_at::timestamptz
    from public.startup_intake_submissions
  union all
  select 'public.more30_upgrade_requests', null, 'more30 — בקשת שדרוג', 'me',
         'בקשת שדרוג', full_name::text, null, email::text, from_path::text,
         status::text, created_at::timestamptz
    from public.more30_upgrade_requests
  union all
  select 'public.national_requests', null, 'פניות ארציות (לא משויך למערכת)', null,
         coalesce(request_type, 'פנייה')::text, full_name::text, phone::text, email::text,
         topic::text, status::text, created_at::timestamptz
    from public.national_requests;

comment on view core.lead_feed is
  'כל טבלאות הלידים של הפלטפורמה מנורמלות לשמונה עמודות. לא חשופה ל-PostgREST (סכימת core) — נקראת רק דרך public.more30_admin_leads.';

-- ── מרשם המקורות ─────────────────────────────────────────────────────────
-- טבלה ריקה אינה מייצרת שורות ב-lead_feed, ולכן ספירה שנגזרת מה-feed בלבד
-- הייתה מעלימה בדיוק את המקורות שאין בהם לידים — ומי שמסתכל לא היה יכול
-- להבדיל בין "אין פניות" לבין "המסך לא מכיר את הטבלה". המרשם מונה את כל
-- המקורות במפורש, והספירה מצטרפת אליו ב-left join.
create or replace view core.lead_sources as
  select * from (values
    ('nadlan.report_requests',           '32',    'נדל"ן ברגע',                            'nadlan'),
    ('nadlan.document_requests',         '32',    'נדל"ן ברגע',                            'nadlan'),
    ('csj_nadlan.research_leads',        '32',    'נדל"ן ברגע (מראת csjekrvu)',            'nadlan'),
    ('nadlan_pro.contacts',              '36',    'נדל״ן פרו — ניהול למתווכים',            'tivuch'),
    ('egod.leads',                       '15',    'איגוד (egod)',                          'egod'),
    ('getrights.leads',                  '22',    'מימוש זכויות',                          'zchuyot'),
    ('hebcrm.leads',                     '31',    'גשר עברית CRM',                         'gesher'),
    ('chatzor.inquiries',                '16',    'חצור קונקט',                            'chatzor'),
    ('chatzor.azkarot_requests',         '16',    'חצור קונקט',                            'chatzor'),
    ('public.hf_switch_leads',           '28',    'השוואת קופות חולים',                    'kupot'),
    ('csj_kupot.hf_switch_leads',        '28',    'השוואת קופות חולים (מראת csjekrvu)',    'kupot'),
    ('csj.kupot_leads',                  '28',    'השוואת קופות חולים (מראת csjekrvu)',    'kupot'),
    ('bkalot_auto.contacts',             '10',    'מימוש זכויות בקלות',                    'bkalot'),
    ('igud.leads',                       '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah'),
    ('igud.service_submissions',         '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah'),
    ('igud.inbound_leads',               '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah'),
    ('igud.fin_leads',                   '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah'),
    ('igud.potential_submissions',       '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah'),
    ('igud.hf_requests',                 '01/10', 'איגוד השיעורים / בקלות (מראת bieebmnm)', 'torah'),
    ('csj.fin_leads',                    null,    'מראת csjekrvu',                         null),
    ('csj.inbound_leads',                null,    'מראת csjekrvu',                         null),
    ('csj.potential_submissions',        null,    'מראת csjekrvu',                         null),
    ('csj.service_submissions',          null,    'מראת csjekrvu',                         null),
    ('csj.hf_requests',                  null,    'מראת csjekrvu',                         null),
    ('core.spec_submissions',            null,    'more30 — אפיון מערכת',                  null),
    ('public.startup_intake_submissions', null,   'more30 — עולם הסטארטאפים',              'showcase'),
    ('public.more30_upgrade_requests',   null,    'more30 — בקשת שדרוג',                   'me'),
    ('public.national_requests',         null,    'פניות ארציות (לא משויך למערכת)',        null)
  ) as t(src, system_number, system_name, system_path);

comment on view core.lead_sources is
  'מרשם מפורש של כל טבלאות הלידים, כדי שמקור עם 0 שורות יופיע במסך עם אפס ולא ייעלם ממנו.';

-- ── ה-RPC שהמסך קורא ─────────────────────────────────────────────────────
create or replace function public.more30_admin_leads(p_limit int default 300)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'core'
as $$
declare
  result jsonb;
  lim int := least(greatest(coalesce(p_limit, 300), 1), 2000);
begin
  -- אותו שער כמו /admin/issues. הלידים מכילים שם, טלפון ומייל של אנשים
  -- אמיתיים, ולכן הבדיקה נעשית בשרת ולא נגזרת מקיום סשן.
  if not (public.more30_is_super_admin() or public.more30_is_admin()) then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'totals', (
      select jsonb_build_object(
        'leads', count(*),
        'sources', (select count(*) from core.lead_sources),
        'sources_with_leads', count(distinct src),
        'systems_with_leads', count(distinct coalesce(system_number, system_name)),
        'last_7_days',  count(*) filter (where created_at > now() - interval '7 days'),
        'last_30_days', count(*) filter (where created_at > now() - interval '30 days'),
        'newest_at', max(created_at)
      ) from core.lead_feed
    ),
    -- כל המקורות, כולל אלה שבהם 0 לידים: מקור ריק ומקור שלא נבדק נראים
    -- אותו דבר במסך, ולכן האפסים מוצגים במפורש.
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
               'src', s.src,
               'system_number', s.system_number,
               'system_name', s.system_name,
               'system_path', s.system_path,
               'count', coalesce(c.n, 0),
               'last_at', c.last_at
             ) order by coalesce(c.n, 0) desc, s.src)
      from core.lead_sources s
      left join (
        select src, count(*) as n, max(created_at) as last_at
          from core.lead_feed group by src
      ) c on c.src = s.src
    ), '[]'::jsonb),
    'leads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'src', src, 'system_number', system_number, 'system_name', system_name,
        'system_path', system_path, 'kind', kind, 'full_name', full_name,
        'phone', phone, 'email', email, 'subject', subject, 'status', status,
        'created_at', created_at
      ) order by created_at desc nulls last)
      from (select * from core.lead_feed order by created_at desc nulls last limit lim) t
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

comment on function public.more30_admin_leads(int) is
  'more30-priority §2 — כל הלידים של כל המערכות במקום אחד, לסופר-אדמין בלבד.';

revoke all on function public.more30_admin_leads(int) from public, anon;
grant execute on function public.more30_admin_leads(int) to authenticated, service_role;
