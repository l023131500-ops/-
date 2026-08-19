-- §3 מבקש לכל מערכת בלוח הניהול: "סטטוס (חיה/שבורה/מוסתרת), קישור, Lighthouse".
-- הסטטוס והקישור נמצאים ב-core.projects, ו-Lighthouse לא נמצא בשום מקום במסד:
-- אין טבלה, אין עמודה, ו-more30_admin_systems_report אינו מחזיר ציון אחד.
-- המדידות עצמן קיימות ואמיתיות — scripts/qa/lh-batch.mjs הריץ אותן מול הייצור
-- וכתב דוחות מלאים ל-QA/shots/lh-*.json — אבל הן חיות כקבצים על מחשב אחד,
-- ולכן הלוח לא יכול היה להציג אותן גם אילו רצה.
--
-- המיגרציה הזאת נותנת להן מקום, מכניסה את שמונה המדידות שקיימות, ומחזירה אותן
-- בדוח — **עם זמן המדידה ועם דגל התיישנות**. זה לא קישוט: כל שמונה המדידות בנות
-- 76–102 שעות, ומאז נפרסו שינויים (בין השאר תיקון ה-CLS של torah). ציון בלי
-- הזמן שבו נמדד היה מוצג כמצב הנוכחי והיה שקר; ציון עם הזמן הוא ראיה.
--
-- מערכת בלי מדידה מקבלת null ולא ערך ממוצע/משוער — "לא זמין" ולא נתון מומצא.

create table if not exists core.lighthouse_runs (
  id              bigint generated always as identity primary key,
  app_key         text        not null,
  route           text        not null,
  url             text        not null,
  perf            int,
  a11y            int,
  best_practices  int,
  seo             int,
  fcp_ms          numeric,
  lcp_ms          numeric,
  tbt_ms          numeric,
  cls             numeric,
  measured_at     timestamptz not null,
  lh_version      text,
  source          text,
  imported_at     timestamptz not null default now(),
  -- אותה כתובת שנמדדה באותו רגע אינה שתי מדידות. ריצה חוזרת של הייבוא על אותם
  -- קבצים לא תכפיל שורות, וריצה חדשה של lh-batch כן תיכנס כמדידה נוספת.
  unique (app_key, route, measured_at)
);

comment on table core.lighthouse_runs is
  'מדידות Lighthouse מול הייצור. שורה = ריצה אחת בזמן אחד. הלוח מציג את האחרונה לכל מערכת יחד עם measured_at, ולכן חייבים לשמור היסטוריה ולא ערך יחיד מתעדכן.';

alter table core.lighthouse_runs enable row level security;
-- אין policy: הקריאה עוברת דרך more30_admin_systems_report, שהיא SECURITY DEFINER
-- ומגודרת לסופר-אדמין. אין דרך לקרוא את הטבלה ישירות מהדפדפן.

insert into core.lighthouse_runs
  (app_key, route, url, perf, a11y, best_practices, seo, fcp_ms, lcp_ms, tbt_ms, cls, measured_at, lh_version, source)
values
  ('chatzor',  '/chatzor',  'https://more30.com/chatzor/',   49, 100, 77, 100, 3561,     4744.433, 1221.5,   0,     '2026-08-03T23:12:52.190Z', '13.4.1', 'QA/shots/lh-chatzor.json'),
  ('egod',     '/egod',     'https://more30.com/egod',       55,  96, 77, 100, 2848.24,  6209.787,  644,     0.022, '2026-08-03T23:12:10.470Z', '13.4.1', 'QA/shots/lh-egod.json'),
  ('kupot',    '/kupot',    'https://more30.com/kupot#/',    72, 100, 77, 100, 2706.862, 2876.53,   745,     0.021, '2026-08-03T23:14:16.805Z', '13.4.1', 'QA/shots/lh-kupot.json'),
  ('mechiron', '/mechiron', 'https://more30.com/mechiron#/', 67,  96, 77, 100, 4330.026, 4480.026,  287,     0.003, '2026-08-03T23:13:51.741Z', '13.4.1', 'QA/shots/lh-mechiron.json'),
  ('nadlan',   '/nadlan',   'https://more30.com/nadlan',     79, 100, 77, 100, 2533.324, 3001.58,   445.004, 0.008, '2026-08-03T11:55:41.122Z', '13.4.1', 'QA/shots/lh-nadlan.json'),
  ('tivuch',   '/tivuch',   'https://more30.com/tivuch',     98, 100, 77, 100,  812.476,  840.976,    4.5,   0.005, '2026-08-02T21:26:46.528Z', '13.4.1', 'QA/shots/lh-tivuch.json'),
  ('torah',    '/torah',    'https://more30.com/torah',      82, 100, 77, 100, 1763.867, 3422.005,  350,     0.001, '2026-08-03T23:11:41.879Z', '13.4.1', 'QA/shots/lh-torah.json'),
  ('zchuyot',  '/zchuyot',  'https://more30.com/zchuyot',    48, 100, 77, 100, 3160.194, 6251.388,  977.798, 0,     '2026-08-03T23:13:22.352Z', '13.4.1', 'QA/shots/lh-zchuyot.json')
on conflict (app_key, route, measured_at) do nothing;

-- הדוח: אותה פונקציה בדיוק, עם שדה lighthouse אחד נוסף לכל מערכת.
create or replace function public.more30_admin_systems_report()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $function$
declare
  hub constant text := 'uhnrgujbdxhhmoxcjria';
  -- מעבר לזה מדידה כבר אינה מתארת את מה שמוגש עכשיו: קצב הפריסות כאן הוא
  -- עשרות ליום, ושתי המדידות הכי טריות בנות שלושה ימים.
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
        'users_counted',  count(*) filter (where p.supabase_project = hub),
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
