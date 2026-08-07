-- 0020 — הקורא החמישי של core.plans, וזה שמדווח מחירים למי שמחליט עליהם.
--
-- 0016/0017/0018/0019 לימדו את more30_checkout, more30_subscribe,
-- more30_system_page ו-more30_plans ששלושה מסלולים בכל מערכת קיימים לנו ולא
-- ללקוח: 'pro' (1 ₪, מסלול הבדיקה המתומחר), 'charge' ו-'one_time' — כולם
-- customer_visible=false. more30_admin_systems_report היא הקוראת החמישית,
-- והיא לא רק שלא כיבדה את הסימון — היא קראה **את שלושת המוסתרים בלבד**:
--
--     where pl.app_key = p.path and pl.code in ('charge','one_time','pro')
--
-- מה שנמדד לפני השינוי, על אותה שאילתה בדיוק שהפונקציה מריצה: 28 מתוך 30
-- השורות החזירו את אותו שלישייה מילה במילה — subscription=pro 1 ₪,
-- charge 0 ₪, one_time 0 ₪. כלומר /admin/systems, המסך שבו נקבעים המחירים,
-- הציג לכל מערכת "מנוי 1 ₪ · סליקה ללא חיוב · חד-פעמי ללא חיוב", בזמן
-- שהלקוח בפועל מקבל 2 ₪ ו-5 ₪ ב-16 מערכות, 10 ₪ ב-more30, ו-12/15 ₪
-- בנדל"ן. אף אחד מהמספרים האלה לא הופיע בדוח. שתי השורות הנותרות
-- (bkalot-studio, events) החזירו null — אין להן שורות בטבלה כלל.
--
-- זה לא באג של דליפה כמו #78: המסך חסום מאחורי more30_is_super_admin, ואף
-- לקוח לא ראה אותו. זה באג של **החלטה**: §3 מבקש לוח שממנו מנהלים את
-- ההכנסות, והלוח דיווח את מספר הבדיקה הפנימי כאילו הוא המחיר.
--
-- התיקון: הדוח קורא עכשיו את אותם מסלולים שהלקוח מקבל, כולל אותה נפילה
-- אחורה למסלולי הפלטפורמה שכבר קיימת ב-more30_system_page וב-more30_plans
-- (11 המערכות בלי מסלולים משלהן — crm · financial · gesher · igud · kiosk ·
-- mthbram · shiurim · smachot · studio · tivuch · zol — מקבלות את 10 ₪ של
-- more30, וזה בדיוק מה שהמבקר שלהן רואה בפועל).
--
-- מבנה ה-JSON נשמר בדיוק: pricing עדיין ממופתח לפי billing_kind ונושא
-- code/price_ils/chargeable, ולכן admin-systems.html הפרוס מציג את המספר
-- החדש **בלי פריסה מחדש** — מה שחשוב במיוחד כרגע, כשמכסת הפריסות של Vercel
-- מוצתה (core.issues #83).
--
-- שלוש הכרעות בתוך התיקון, כדי שלא ייקראו כשרירותיות:
--  · price_ils = המחיר הנמוך ביותר שגובים באותו סוג חיוב — נקודת הכניסה.
--    from_price=true אומר שיש מדרגה יקרה יותר מעליה (2 ₪ מתוך 2/5;
--    12 ₪ מתוך 12/15). tiers נושא את כולן, כדי שהמסך יוכל להציג טווח
--    בלי מיגרציה נוספת.
--  · סוג חיוב שכל מסלוליו הגלויים חינמיים מקבל 0 ומוצג "ללא חיוב" —
--    ולא null, כי "חינם" היא החלטה ו"טרם נקבע" היא היעדר החלטה.
--  · charge ו-one_time אין להם ולו שורה גלויה אחת בשום מערכת, ולכן הם
--    נעדרים מהמפתח והמסך יאמר "טרם נקבע". זה הנכון: לא נקבע מחיר סליקה
--    ללקוח. שורות ה-0 ₪ המוסתרות לא נעלמו — הן עברו ל-pricing_internal,
--    שם הן מסומנות במפורש כפנימיות.

create or replace function public.more30_admin_systems_report()
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public', 'core', 'auth'
as $function$
declare
  hub constant text := 'uhnrgujbdxhhmoxcjria';
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'notes', jsonb_build_object(
      'users', 'נספר מ-core.app_memberships. פעיל = פתח מערכת כשהוא מחובר.',
      'test_accounts', 'חשבונות בדיקה (qa.*@more30.com) נספרים בנפרד ואינם נכללים במספר הלקוחות. הם נוצרים על ידי מבחני הרגרסיה של §1 ואינם לקוחות.',
      'revenue', 'הכנסה משוערת = מנויים פעילים × מחיר המסלול. אין סליקה מחוברת, ולכן זו תחזית ולא גבייה.',
      'pricing', 'המחיר המוצג הוא נקודת הכניסה שהלקוח מקבל בפועל — המסלול הזול ביותר שגובים מבין המסלולים הגלויים. מערכת בלי מסלולים משלה נופלת למסלולי הפלטפורמה, בדיוק כמו בעמוד המערכת שלה, והשדה plans_from אומר מאיזו. מסלול הבדיקה של 1 ₪ ושורות ה-0 ₪ של סליקה וחד-פעמי אינם מוצעים לאיש והועברו ל-pricing_internal.',
      'not_in_hub', 'מערכת שמאגר המשתמשים שלה בפרויקט אחר אינה נספרת, ומסומנת users_counted=false.'
    ),
    'totals', (
      select jsonb_build_object(
        'systems',        count(*),
        'live',           count(*) filter (where coalesce(p.live,false)),
        'in_showcase',    count(*) filter (where coalesce(p.show_in_showcase,false)),
        'users_counted',  count(*) filter (where p.supabase_project = hub)
      ) from core.projects p
      where coalesce(p.to_delete,false)=false and p.path is not null
    ),
    'systems', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.number)
      from (
        select
          p.number,
          p.path                                as app_key,
          p.path                                as path,
          p.name_he                             as name,
          p.tagline,
          coalesce(p.live,false)                as live,
          p.live_url,
          p.stage::text                         as stage,
          coalesce(p.show_in_showcase,false)    as show_in_showcase,
          p.supabase_project,
          (p.supabase_project = hub)            as users_counted,

          case when p.supabase_project = hub then (
            select jsonb_build_object(
              'members',       count(*) filter (where not core.is_test_account(u.email)),
              'test_accounts', count(*) filter (where core.is_test_account(u.email)),
              'active_24h',    count(*) filter (where not core.is_test_account(u.email)
                                                  and m.last_seen_at >= now() - interval '24 hours'),
              'active_7d',     count(*) filter (where not core.is_test_account(u.email)
                                                  and m.last_seen_at >= now() - interval '7 days'),
              'active_30d',    count(*) filter (where not core.is_test_account(u.email)
                                                  and m.last_seen_at >= now() - interval '30 days'),
              'last_activity', max(m.last_seen_at) filter (where not core.is_test_account(u.email))
            )
            from core.app_memberships m
            join auth.users u on u.id = m.user_id
            where m.app_key = p.path
          ) else null end                       as users,

          (select jsonb_build_object(
             'active', count(*) filter (where s.status <> 'cancelled'),
             'by_plan', coalesce(jsonb_object_agg(s.plan_code, s.n)
                        filter (where s.plan_code is not null), '{}'::jsonb)
           )
           from (
             select plan_code, status, count(*) as n
             from core.subscriptions where app_key = p.path
             group by plan_code, status
           ) s
          )                                     as subscriptions,

          -- מאיזו מערכת מגיעים המסלולים שהלקוח רואה. זהה לנפילה אחורה
          -- שב-more30_system_page, ולכן הדוח והעמוד לא יכולים לסתור.
          pf.key                                as plans_from,

          (select jsonb_object_agg(k.billing_kind, k.j)
             from (
               select
                 pl.billing_kind,
                 jsonb_build_object(
                   'code', (array_agg(pl.code order by (coalesce(pl.price_ils,0) > 0) desc,
                                                       pl.price_ils asc nulls last,
                                                       pl.sort asc nulls last))[1],
                   'price_ils', coalesce(min(pl.price_ils) filter (where coalesce(pl.price_ils,0) > 0), 0),
                   'chargeable', bool_or(coalesce(pl.price_ils,0) > 0),
                   'from_price', count(*) filter (where coalesce(pl.price_ils,0) > 0) > 1,
                   'tiers', jsonb_agg(jsonb_build_object(
                              'code', pl.code, 'name_he', pl.name_he,
                              'price_ils', pl.price_ils, 'period', pl.period)
                            order by pl.sort asc nulls last)
                 ) as j
               from core.plans pl
               where pl.app_key = pf.key and pl.active and pl.customer_visible
               group by pl.billing_kind
             ) k
          )                                     as pricing,

          -- לא נמחק, רק הופרד: אלה המסלולים שקיימים לנו ולא ללקוח.
          (select jsonb_object_agg(pl.code, jsonb_build_object(
                    'price_ils', pl.price_ils, 'billing_kind', pl.billing_kind,
                    'customer_visible', false))
             from core.plans pl
            where pl.app_key = p.path and pl.active and not pl.customer_visible
          )                                     as pricing_internal,

          coalesce((
            select sum(coalesce(pl.price_ils,0))
            from core.subscriptions s2
            join core.plans pl on pl.app_key = s2.app_key and pl.code = s2.plan_code
            where s2.app_key = p.path and s2.status <> 'cancelled'
              and pl.billing_kind = 'subscription'
          ), 0)                                 as mrr_estimate_ils

        from core.projects p
        cross join lateral (
          select case
                   when exists (select 1 from core.plans pl
                                 where pl.app_key = p.path and pl.active and pl.customer_visible)
                   then p.path else 'more30'
                 end as key
        ) pf
        where coalesce(p.to_delete,false)=false and p.path is not null
      ) x
    ), '[]'::jsonb)
  );
end;
$function$;
