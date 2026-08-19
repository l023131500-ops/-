-- 0045 — לוח הלידים הציג 13 פניות בשבוע האחרון, ו-11 מהן נכתבו על ידי מבחנים.
--
-- 0044 סגרה את /admin/activity והשאירה שתי פונקציות פתוחות במפורש:
-- more30_admin_snapshot ו-more30_admin_leads. זו השנייה.
--
-- ‏more30_admin_snapshot נבדקה ואינה שייכת לכאן: היא מאגדת
-- ‏project_overview · tasks · tokens · bugs, ואין בה ולו מספר אחד שסופר בני אדם.
-- אין לה מה לדעת על חשבונות בדיקה. נשארת פונקציה אחת אמיתית — הלידים.
--
-- ── נמדד על core.lead_feed, 07/08/2026:
--
--    כרטיס במסך            מה שהוצג    אמת    מה שנספר בטעות
--    ───────────────────   ─────────   ────   ────────────────
--    פניות בסך הכול            75        64    11 שורות מבחן
--    ‏7 ימים אחרונים           13         2    11
--    ‏30 יום אחרונים           37        26    11
--    מערכות עם פניות            8         7    1  (bkalot)
--    הפנייה האחרונה        04/08     02/08    בדיקה, לא לקוח
--
--    הכרטיס "‏7 ימים אחרונים" הוא הממצא. הוא המספר שאדם מסתכל עליו כדי
--    לדעת אם יש בכלל ביקוש השבוע. שתי פניות היו. אחת עשרה מהשלוש-עשרה
--    נכתבו בריצות בדיקה של 02/08 ו-04/08.
--
--    ושתי שורות בטבלת הכיסוי:
--
--      מערכת            פניות      מה יש שם באמת
--      ──────────       ─────────  ───────────────────────────────────
--      36 tivuch         8 → 1     שבע העתקות של "ישראל ישראלי ·
--                                  buyer@example.com · 050-1234567",
--                                  שנכתבו בתוך 30 דקות ב-02/08
--      10 bkalot         4 → 0     שתיים qa.bkalot@more30.com, אחת
--                                  qa-probe-not-approved@example.com,
--                                  ואחת ששמה "נמען אמיתי לכאורה"
--                                  ‏(real.person@example.com) — fixture
--                                  שנבנה כדי להיראות אמיתי
--
--    ‏bkalot מסומנת היום "מחובר · יש פניות" בירוק, ואין לה אף פנייה.
--    ‏tivuch מדורגת רביעית מבין המערכות, ויש לה אחת.
--
-- למה לא הרחבתי את core.is_test_account: חמש פונקציות לוח נשענות עליה
-- ‏(systems_report, admin_users, admin_customers, app_users, admin_activity),
-- והיא מדברת על חשבון התחברות — שורה ב-auth.users. ליד אינו חשבון; הוא
-- שורה בטבלת פניות של מערכת, ואף אחד לא נרשם כדי לייצר אותו. לכן
-- ‏core.is_test_lead היא פונקציה נפרדת שמכילה את הראשונה ומוסיפה לה כלל
-- אחד: כתובת שהדומיין שלה שמור ב-RFC 2606 (example.com/.net/.org) או
-- ‏.test/.invalid/localhost אינה יכולה לקבל דואר, ולכן אינה אדם שאפשר
-- לחזור אליו. זו עובדה על הכתובת, לא ניחוש על הכוונה.
--
-- מה הכלל הזה לא יודע, ונאמר במפורש גם במסך: ל-39 מתוך 75 הפניות אין
-- כתובת מייל כלל (egod, zchuyot ו-igud.service_submissions אינן אוספות
-- אחת). הן נספרות כפניות אמיתיות, כי אין ראיה לכאן או לכאן, ולא נכון
-- להוריד פנייה מהספירה בגלל שדה חסר.
--
-- אף שורה לא נמחקת ואף פנייה לא נעלמת מהרשימה: שורת מבחן מסומנת
-- ‏is_test ומופיעה במקומה הכרונולוגי, עם מסנן שמאפשר להסתיר אותה. הן
-- ההוכחה שהאוטומציה של §1 רצה, ומחיקתן הייתה מוחקת את הראיה.

create or replace function core.is_test_lead(p_email text)
returns boolean
language sql
immutable
as $function$
  -- כתובת ריקה אינה ראיה לכלום — ליד בלי מייל נשאר ליד.
  select coalesce(
    core.is_test_account(p_email)
    or lower(p_email) like '%@example.com'
    or lower(p_email) like '%@example.net'
    or lower(p_email) like '%@example.org'
    or lower(p_email) like '%.test'
    or lower(p_email) like '%.invalid'
    or lower(p_email) like '%@localhost',
  false);
$function$;

comment on function core.is_test_lead(text) is
  'ליד שנכתב על ידי מבחן: חשבון qa.*@more30.com, או דומיין ששמור ב-RFC 2606 '
  'ואינו יכול לקבל דואר. מייל ריק מחזיר false — אין ראיה, ולכן זה ליד.';

create or replace function public.more30_admin_leads(p_limit integer default 300)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'core'
as $function$
declare
  result jsonb;
  lim int := least(greatest(coalesce(p_limit, 300), 1), 2000);
begin
  if not (public.more30_is_super_admin() or public.more30_is_admin()) then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'test_leads_means',
      'פניית בדיקה נכתבה על ידי מבחן, לא על ידי אדם: כתובת qa.*@more30.com ' ||
      'או דומיין ששמור ב-RFC 2606 (example.com ודומיו) ואינו יכול לקבל דואר. ' ||
      'היא נספרת בנפרד ואינה נכללת באף מספר שמתאר ביקוש, בדיוק כמו ' ||
      'ב-/admin/systems ו-/admin/activity. עד 0045 היא נספרה בתוכם, ו-13 ' ||
      'הפניות של השבוע האחרון היו 2 אנשים ו-11 שורות מבחן. פנייה בלי כתובת ' ||
      'מייל נספרת כאמיתית — אין ראיה לכאן או לכאן, ולא נכון להוריד אותה ' ||
      'מהספירה בגלל שדה שהמערכת שלה לא אוספת.',
    'totals', (
      select jsonb_build_object(
        'leads',          count(*) filter (where not core.is_test_lead(email)),
        'test_leads',     count(*) filter (where core.is_test_lead(email)),
        'without_email',  count(*) filter (where email is null or btrim(email) = ''),
        'sources',            (select count(*) from core.lead_sources),
        'sources_with_leads', count(distinct src) filter (where not core.is_test_lead(email)),
        'systems_with_leads', count(distinct coalesce(system_number, system_name))
                                filter (where not core.is_test_lead(email)),
        'systems_public', (
          select count(*) from core.projects p
           where p.public_visible is true and p.live is true and p.path is not null
        ),
        'systems_connected', (
          select count(*) from core.projects p
           where p.public_visible is true and p.live is true and p.path is not null
             and exists (select 1 from core.lead_sources s where s.system_path = p.path)
        ),
        'systems_unconnected', (
          select count(*) from core.projects p
           where p.public_visible is true and p.live is true and p.path is not null
             and not exists (select 1 from core.lead_sources s where s.system_path = p.path)
        ),
        'last_7_days',       count(*) filter (where created_at > now() - interval '7 days'
                                                and not core.is_test_lead(email)),
        'test_last_7_days',  count(*) filter (where created_at > now() - interval '7 days'
                                                and core.is_test_lead(email)),
        'last_30_days',      count(*) filter (where created_at > now() - interval '30 days'
                                                and not core.is_test_lead(email)),
        'test_last_30_days', count(*) filter (where created_at > now() - interval '30 days'
                                                and core.is_test_lead(email)),
        -- "הפנייה האחרונה" נשאלת כדי לדעת מתי אדם פנה בפעם האחרונה.
        'newest_at',      max(created_at) filter (where not core.is_test_lead(email)),
        'test_newest_at', max(created_at) filter (where core.is_test_lead(email))
      ) from core.lead_feed
    ),
    'coverage', coalesce((
      select jsonb_agg(jsonb_build_object(
               'number',      p.number,
               'path',        p.path,
               'name',        coalesce(p.name_he, p.name, p.path),
               'sources',     src.n,
               'leads',       fd.n,
               'test_leads',  fd.t,
               'last_at',     fd.last_at,
               'state',       case
                                when src.n = 0            then 'unconnected'
                                when fd.n = 0 and fd.t > 0 then 'test_only'
                                when fd.n = 0             then 'connected_empty'
                                else 'has_leads'
                              end
             ) order by (case
                           when src.n = 0             then 0
                           when fd.n = 0 and fd.t > 0 then 1
                           when fd.n = 0              then 2
                           else 3
                         end),
                      fd.n desc, p.path)
        from core.projects p
        cross join lateral (
          select count(*)::int as n from core.lead_sources s where s.system_path = p.path
        ) src
        cross join lateral (
          select count(*) filter (where not core.is_test_lead(f.email))::int as n,
                 count(*) filter (where core.is_test_lead(f.email))::int     as t,
                 max(f.created_at) filter (where not core.is_test_lead(f.email)) as last_at
            from core.lead_feed f where f.system_path = p.path
        ) fd
       where p.public_visible is true and p.live is true and p.path is not null
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
               'src', s.src,
               'system_number', s.system_number,
               'system_name', s.system_name,
               'system_path', s.system_path,
               'count', coalesce(c.n, 0),
               'test_count', coalesce(c.t, 0),
               'last_at', c.last_at
             ) order by coalesce(c.n, 0) desc, coalesce(c.t, 0) desc, s.src)
      from core.lead_sources s
      left join (
        select src,
               count(*) filter (where not core.is_test_lead(email)) as n,
               count(*) filter (where core.is_test_lead(email))     as t,
               max(created_at) filter (where not core.is_test_lead(email)) as last_at
          from core.lead_feed group by src
      ) c on c.src = s.src
    ), '[]'::jsonb),
    -- הרשימה עצמה נשארת שלמה. שורת מבחן מסומנת ולא נמחקת.
    'leads', coalesce((
      select jsonb_agg(jsonb_build_object(
        'src', src, 'system_number', system_number, 'system_name', system_name,
        'system_path', system_path, 'kind', kind, 'full_name', full_name,
        'phone', phone, 'email', email, 'subject', subject, 'status', status,
        'created_at', created_at, 'is_test', core.is_test_lead(email)
      ) order by created_at desc nulls last)
      from (select * from core.lead_feed order by created_at desc nulls last limit lim) t
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;
