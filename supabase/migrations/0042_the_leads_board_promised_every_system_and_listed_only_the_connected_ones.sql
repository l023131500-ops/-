-- §2 — "גישה כללית ללידים של כל המערכות במקום אחד".
--
-- more30_admin_leads() בונה את מסך /admin/leads משתי טבלאות בלבד:
-- core.lead_sources (מה רשום) ו-core.lead_feed (מה נאסף). מערכת שאין לה שורה
-- ב-lead_sources פשוט אינה קיימת בפלט — לא כאפס, לא כאזהרה, כלל לא.
--
-- נמדד על ההאב, 19 מערכות ציבוריות חיות (public_visible + live):
--
--   6  מחוברות ויש להן פניות     — 73 מתוך 75 שורות ה-feed
--   2  מחוברות ואפס פניות        — chatzor, kupot
--  11  ללא שום מקור רשום         — briut, chizukim, galil, imud, kesef,
--                                   kiosk, modaot, orech, smel, studio, tamlul
--
-- ה-11 האלה הן הבעיה. הכותרת במסך אומרת "כל פנייה שהתקבלה בכל אחת מהמערכות",
-- והאריח סופר "מערכות עם פניות: 6" בלי מכנה. שש מתוך שש נראה שלם; שש מתוך
-- תשע-עשרה הוא מה שנמדד. מי שמסתכל על הלוח ורואה ש-briut אינה ברשימה מסיק
-- שלא היו לה פניות — בעוד התשובה הנכונה היא שאיש לא חיבר אליה צינור, ולכן
-- אין לנו מושג. "אין פניות" ו"לא מחובר" הם שתי תשובות שונות לגמרי, ורק
-- אחת מהן דורשת עבודה.
--
-- התיקון הוא הצהרתי בלבד: הפונקציה ממשיכה לקרוא בדיוק את אותן שתי טבלאות,
-- ולא ממציאה ולא משנה אף פנייה. מה שנוסף הוא בלוק coverage שמונה את כל 19
-- המערכות הציבוריות ומסמן לכל אחת את מצבה, ושלושה מונים בסיכום. אין שדה
-- קיים ששונה או הוסר, ולכן ה-HTML שבייצור — שהפריסה שלו חסומה על מכסת
-- Vercel, core.issues #83 — ממשיך לעבוד בדיוק כמו קודם.
--
-- נגזר מנתוני אמת: coverage לא נשמר בשום מקום ולא נכתב ביד, אלא נגזר בכל
-- קריאה מ-core.projects מול core.lead_sources. מערכת שתחובר מחר תעבור
-- ל-connected בלי שינוי קוד.

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
    'totals', (
      select jsonb_build_object(
        'leads', count(*),
        'sources', (select count(*) from core.lead_sources),
        'sources_with_leads', count(distinct src),
        'systems_with_leads', count(distinct coalesce(system_number, system_name)),
        -- המכנה שהיה חסר: כמה מערכות ציבוריות חיות יש בכלל, וכמה מהן
        -- מחוברות. שלושתם נספרים על core.projects ולא על ה-feed, אחרת
        -- מערכת בלי צינור לעולם לא הייתה נספרת.
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
        'last_7_days',  count(*) filter (where created_at > now() - interval '7 days'),
        'last_30_days', count(*) filter (where created_at > now() - interval '30 days'),
        'newest_at', max(created_at)
      ) from core.lead_feed
    ),
    -- שורה לכל מערכת ציבורית חיה, כולל אלה שאין להן צינור. state מבחין בין
    -- שלוש התשובות שהמסך עד היום מיזג לשתיים.
    'coverage', coalesce((
      select jsonb_agg(jsonb_build_object(
               'number',      p.number,
               'path',        p.path,
               'name',        coalesce(p.name_he, p.name, p.path),
               'sources',     src.n,
               'leads',       fd.n,
               'last_at',     fd.last_at,
               'state',       case
                                when src.n = 0 then 'unconnected'
                                when fd.n = 0  then 'connected_empty'
                                else 'has_leads'
                              end
             ) order by (case when src.n = 0 then 0 when fd.n = 0 then 1 else 2 end),
                      fd.n desc, p.path)
        from core.projects p
        cross join lateral (
          select count(*)::int as n from core.lead_sources s where s.system_path = p.path
        ) src
        cross join lateral (
          select count(*)::int as n, max(created_at) as last_at
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
$function$;
