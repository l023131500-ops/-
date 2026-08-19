-- 0030 — שורת המספרים של /admin/systems ספרה מערכות וקראה להן משתמשים.
--
-- ‏§3 מבקש מלוח ניהול-העל לראות לכל מערכת גם "הכנסות/מנויים/כניסות". בשורת
-- ה-KPI שבראש הדוח יש אריח שכתוב עליו **"מאגר המשתמשים בהאב"**
-- ‏(portal/public/admin-systems.html:249), והמספר שמעליו נלקח מ-totals.users_counted.
--
-- ‏totals.users_counted מעולם לא היה מספר משתמשים. מ-0014 ועד 0028 הוא נכתב כך:
--
--     'users_counted', count(*) filter (where p.supabase_project = hub)
--
-- כלומר **כמה מערכות** מאגר המשתמשים שלהן יושב בפרויקט הראשי. השם הזה נכון
-- בדיוק במקום השני שבו הוא מופיע — systems[].users_counted הוא בוליאני לכל
-- מערכת, "האם המשתמשים שלה נספרים כאן", ושם הכרטיס קורא אותו נכון. באגרגט הוא
-- קיבל אותו שם ומשמעות אחרת, והמסך קרא את הכוונה ולא את הנתון.
--
-- ההפרש נמדד ולא שוער, 07/08/2026:
--   האריח מציג      7   — מספר המערכות שמאגרן בהאב, מתוך 30
--   auth.users      84  — 20 חשבונות אמיתיים ו-64 חשבונות בדיקה (qa.*@more30.com)
--   מתוך ה-20        8  — מחזיקים לפחות שיוך אחד ב-core.app_memberships
--
-- שלושה מספרים שונים, ואף אחד מהם אינו 7. אריח שכותרתו "מאגר המשתמשים" ומציג
-- את מספר המערכות אינו עיגול או קירוב — הוא נתון אחר לגמרי, וזו הפרה של כלל
-- הברזל הראשון. במיוחד כאן: זה המספר שממנו מסתכלים על גודל בסיס הלקוחות.
--
-- מה שמשתנה ב-totals:
--   · users_counted → **systems_users_counted**. אותו חישוב, שם שאומר מה הוא סופר.
--     המפתח הישן מוסר; קוראיו הם admin-systems.html וסקריפטי ה-QA בלבד, וכולם
--     מתעדכנים באותו קומיט. להשאיר את שניהם היה משמר את השם שגרם לטעות.
--   · hub_users — חשבונות אמיתיים ב-auth.users. זהו "מאגר המשתמשים בהאב".
--   · hub_users_test — חשבונות הבדיקה, בנפרד ולא בתוכו. הם 64 מתוך 84, ולבלוע
--     אותם פנימה היה מנפח את המאגר פי ארבעה. הכרטיס כבר מפריד אותם לכל מערכת;
--     שורת הסיכום עשתה זאת רק עכשיו.
--   · hub_users_with_membership — כמה מהאמיתיים באמת נכנסו לתוך מערכת. "20 נרשמו"
--     ו-"8 משתמשים במשהו" הן שתי עובדות, וההפרש ביניהן הוא בדיוק מה ש-§1 מודד.
--
-- ‏systems[].users_counted הבוליאני לכל מערכת אינו נוגע — הוא היה נכון מלכתחילה.
-- אין שינוי בהרשאות ובשורות. שדות קריאה בלבד.

create or replace function public.more30_admin_systems_report()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'core', 'auth'
as $function$
declare
  hub constant text := 'uhnrgujbdxhhmoxcjria';
  stale_after constant interval := interval '48 hours';
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'notes', jsonb_build_object(
      'users', 'נספר מ-core.app_memberships. פעיל = פתח מערכת כשהוא מחובר.',
      'test_accounts', 'חשבונות בדיקה (qa.*@more30.com) נספרים בנפרד ואינם נכללים במספר הלקוחות. הם נוצרים על ידי מבחני הרגרסיה של §1 ואינם לקוחות.',
      'hub_users', 'totals.hub_users הוא מספר החשבונות האמיתיים ב-auth.users של הפרויקט הראשי — מאגר המשתמשים עצמו. hub_users_test נספר לצידו ולא בתוכו, ו-hub_users_with_membership אומר כמה מהאמיתיים מחזיקים לפחות שיוך אחד למערכת. totals.systems_users_counted הוא מספר אחר לגמרי — כמה מערכות מאגרן יושב כאן — והוא נקרא עד 0030 users_counted, שם שנקרא כמספר משתמשים ואינו כזה.',
      'revenue', 'הכנסה משוערת = מנויים פעילים × מחיר המסלול. אין סליקה מחוברת, ולכן זו תחזית ולא גבייה.',
      'pricing', 'המחיר המוצג הוא נקודת הכניסה שהלקוח מקבל בפועל — המסלול הזול ביותר שגובים מבין המסלולים הגלויים. מערכת בלי מסלולים משלה נופלת למסלולי הפלטפורמה, בדיוק כמו בעמוד המערכת שלה, והשדה plans_from אומר מאיזו. מסלול הבדיקה של 1 ₪ ושורות ה-0 ₪ של סליקה וחד-פעמי אינם מוצעים לאיש והועברו ל-pricing_internal.',
      'not_in_hub', 'מערכת שמאגר המשתמשים שלה בפרויקט אחר אינה נספרת, ומסומנת users_counted=false.',
      'admin_url', 'כתובת מסך הניהול של המערכת עצמה, מ-core.projects.admin_url, ורק כשהיא כתובת שאפשר ללחוץ עליה ו-admin_auth הוא own או hub. מערכת בלי מסך ניהול מקבלת null ולא קישור חלופי — היעדר מסך ניהול הוא ממצא (core.issues #86) ולא פרט להסתיר.',
      'lighthouse', 'המדידה האחרונה מול הייצור לכל מערכת, מ-core.lighthouse_runs, תמיד עם measured_at ועם age_hours. stale=true אומר שהמדידה בת יותר מ-48 שעות ולכן אינה מתארת בהכרח את מה שמוגש עכשיו — להציג אותה כמצב נוכחי יהיה טעות. מערכת שלא נמדדה מקבלת null, ולא ציון משוער.'
    ),
    'totals', (
      select jsonb_build_object(
        'systems',        count(*),
        'live',           count(*) filter (where coalesce(p.live,false)),
        'in_showcase',    count(*) filter (where coalesce(p.show_in_showcase,false)),
        -- כמה **מערכות** מאגרן בהאב. עד 0030 המפתח נקרא users_counted, והמסך
        -- הציג אותו תחת הכותרת "מאגר המשתמשים בהאב".
        'systems_users_counted', count(*) filter (where p.supabase_project = hub),
        -- ומאגר המשתמשים עצמו, שלושה מספרים נפרדים שאיש לא ערבב בהם עד היום.
        'hub_users',      (select count(*) from auth.users u
                            where not core.is_test_account(u.email)),
        'hub_users_test', (select count(*) from auth.users u
                            where core.is_test_account(u.email)),
        'hub_users_with_membership', (
                           select count(distinct m.user_id)
                             from core.app_memberships m
                             join auth.users u on u.id = m.user_id
                            where not core.is_test_account(u.email)),
        'with_admin_url', count(*) filter (where p.admin_auth in ('own','hub')
                                             and p.admin_url ~ '^(/|https?://)\S*$'),
        'with_lighthouse', count(*) filter (where exists (
                             select 1 from core.lighthouse_runs l where l.app_key = p.path)),
        'lighthouse_fresh', count(*) filter (where exists (
                             select 1 from core.lighthouse_runs l
                              where l.app_key = p.path and l.measured_at >= now() - stale_after))
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

          case when p.admin_auth in ('own','hub')
                and p.admin_url ~ '^(/|https?://)\S*$'
               then p.admin_url end             as admin_url,
          case when p.admin_auth in ('own','hub')
                and p.admin_url ~ '^(/|https?://)\S*$'
               then p.admin_auth end            as admin_auth,

          (select jsonb_build_object(
             'perf', l.perf, 'a11y', l.a11y,
             'best_practices', l.best_practices, 'seo', l.seo,
             'fcp_ms', l.fcp_ms, 'lcp_ms', l.lcp_ms,
             'tbt_ms', l.tbt_ms, 'cls', l.cls,
             'url', l.url,
             'measured_at', l.measured_at,
             'age_hours', round(extract(epoch from (now() - l.measured_at)) / 3600.0, 1),
             'stale', l.measured_at < now() - stale_after,
             'lh_version', l.lh_version)
           from core.lighthouse_runs l
           where l.app_key = p.path
           order by l.measured_at desc
           limit 1)                             as lighthouse,

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
