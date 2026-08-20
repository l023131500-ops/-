-- 0127 — system-entry analytics (more30-priority §33 audit_gaps #2)
--
-- core.projects#33's own gap list said it plainly: "אין מעקב אנליטיקס על מי
-- נכנס לאיזו מערכת" (no analytics on who enters which system). It is real —
-- portal/src/App.tsx's SystemCard renders a plain <a href> for "כניסה
-- למערכת" with zero instrumentation, so the platform has never once recorded
-- which of the 20+ live systems visitors actually walk into from the home
-- page. Every other cross-system board here (leads, users, subscriptions,
-- Lighthouse) already has a place to read from; entries had none.
--
-- Minimal, real-data-only design: one append-only event per click
-- (app_key + optional user_id when signed in + timestamp). No page views, no
-- session fingerprinting, no IP — this answers "which systems get entered,
-- how often" without inventing a bigger tracking surface than what was asked
-- for. RLS enabled with zero policies, same defense-in-depth convention as
-- every other core.* table (the schema is not exposed to PostgREST to begin
-- with; writes/reads go through public.* SECURITY DEFINER RPCs only, exactly
-- like core.spec_submissions / core.lead_feed).

create table if not exists core.system_entry_events (
  id      bigint generated always as identity primary key,
  app_key text not null,
  user_id uuid,
  at      timestamptz not null default now()
);

create index if not exists system_entry_events_app_key_at_idx
  on core.system_entry_events (app_key, at desc);

alter table core.system_entry_events enable row level security;

comment on table core.system_entry_events is
  'כניסה אחת = לחיצה אמיתית על "כניסה למערכת" בדף הבית. נכתבת רק דרך public.more30_log_system_entry ונקראת רק דרך public.more30_admin_systems_report / more30_admin_entries. לא נחשפת ל-PostgREST (סכימת core).';

-- ── כתיבה: כל מבקר, מחובר או לא ─────────────────────────────────────────
create or replace function public.more30_log_system_entry(p_app_key text)
returns void
language plpgsql
security definer
set search_path to 'public', 'core'
as $$
begin
  -- מערכת לא-קיימת (או שנמחקה) לא מייצרת שורה — בלי לזרוק שגיאה למבקר, כי
  -- זו קריאת "ירייה ושכח" בצד הלקוח שלא אמורה להפריע לניווט בשום מקרה.
  if p_app_key is null or not exists (
    select 1 from core.projects
     where path = p_app_key and coalesce(to_delete, false) = false
  ) then
    return;
  end if;

  insert into core.system_entry_events (app_key, user_id)
  values (p_app_key, auth.uid());
end;
$$;

comment on function public.more30_log_system_entry(text) is
  'more30-priority §33 audit_gaps #2 — נרשם בלחיצה על "כניסה למערכת" בדף הבית. אינו PII: app_key + user_id אופציונלי (רק כשהמבקר מחובר) + זמן.';

revoke all on function public.more30_log_system_entry(text) from public;
grant execute on function public.more30_log_system_entry(text) to anon, authenticated;

-- ── קריאה: אותו שער כמו more30_admin_leads / more30_admin_systems_report ──
create or replace function public.more30_admin_entries(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core'
as $$
declare
  window_days int := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'window_days', window_days,
    'total', (
      select count(*) from core.system_entry_events
       where at >= now() - make_interval(days => window_days)
    ),
    'by_system', coalesce((
      select jsonb_agg(jsonb_build_object(
               'app_key', app_key,
               'entries', n,
               'signed_in_entries', n_signed_in,
               'last_at', last_at
             ) order by n desc, app_key)
        from (
          select app_key,
                 count(*) as n,
                 count(*) filter (where user_id is not null) as n_signed_in,
                 max(at) as last_at
            from core.system_entry_events
           where at >= now() - make_interval(days => window_days)
           group by app_key
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.more30_admin_entries(int) is
  'more30-priority §33 audit_gaps #2 — כניסות בפועל למערכות, לחלון ימים נתון, לסופר-אדמין בלבד.';

revoke all on function public.more30_admin_entries(int) from public, anon;
grant execute on function public.more30_admin_entries(int) to authenticated, service_role;

-- ── more30_admin_systems_report מקבל שורת "כניסות (30 יום)" לכל כרטיס ────
-- CREATE OR REPLACE על אותה פונקציה שכבר קיימת (0014..0053) — הגוף המלא
-- מועתק כדי לשמור על כל השדות הקיימים ולהוסיף רק entries_30d/entries_7d.
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
      'test_accounts', 'חשבונות בדיקה (qa.*@more30.com) נספרים בנפרד ואינם נכללים במספר הלקוחות, במספר המנויים ובהכנסה. הם נוצרים על ידי מבחני הרגרסיה של §1 ואינם לקוחות.',
      'hub_users', 'totals.hub_users הוא מספר החשבונות האמיתיים ב-auth.users של הפרויקט הראשי — מאגר המשתמשים עצמו. hub_users_test נספר לצידו ולא בתוכו, ו-hub_users_with_membership אומר כמה מהאמיתיים מחזיקים לפחות שיוך אחד למערכת. totals.systems_users_counted הוא מספר אחר לגמרי — כמה מערכות מאגרן יושב כאן — והוא נקרא עד 0030 users_counted, שם שנקרא כמספר משתמשים ואינו כזה.',
      'subscriptions', 'subscriptions.active הוא מספר שורות המנוי הפעילות של חשבונות אמיתיים, ו-subscriptions.test של חשבונות הבדיקה, לצידו ולא בתוכו. עד 0038 המספר הזה נספר על התת-שאילתה המקובצת ולכן החזיר את מספר המסלולים ולא את מספר הנרשמים — torah הציג 1 במקום 10.',
      'platform', 'המסלולים של הפלטפורמה עצמה (app_key=more30, ובהם פרימיום 10 ₪ של §8א) יושבים במפתח platform ולא ב-systems, משום שאין ב-core.projects שורה שה-path שלה more30 — הפלטפורמה אינה מערכת, לא בדף הבית ולא בניתוב. totals נספר ישירות על הטבלאות ולכן כן כולל אותם: זו הסיבה שהכותרת גדולה מסכום הכרטיסים, וההפרש הוא בדיוק platform.',
      'revenue', 'הכנסה משוערת = מנויים פעילים של חשבונות אמיתיים × מחיר המסלול. חשבונות בדיקה אינם נספרים בה. אין סליקה מחוברת, ולכן גם המספר הזה הוא תחזית ולא גבייה.',
      'pricing', 'המחיר המוצג הוא נקודת הכניסה שהלקוח מקבל בפועל — המסלול הזול ביותר שגובים מבין המסלולים הגלויים. מערכת בלי מסלולים משלה נופלת למסלולי הפלטפורמה, בדיוק כמו בעמוד המערכת שלה, והשדה plans_from אומר מאיזו. מסלול הבדיקה של 1 ₪ ושורות ה-0 ₪ של סליקה וחד-פעמי אינם מוצעים לאיש והועברו ל-pricing_internal.',
      'not_in_hub', 'מערכת שמאגר המשתמשים שלה בפרויקט אחר אינה נספרת, ומסומנת users_counted=false.',
      'admin_url', 'כתובת מסך הניהול של המערכת עצמה, מ-core.projects.admin_url, ורק כשהיא כתובת שאפשר ללחוץ עליה ו-admin_auth הוא own או hub. מערכת בלי מסך ניהול מקבלת null ולא קישור חלופי — היעדר מסך ניהול הוא ממצא (core.issues #86) ולא פרט להסתיר.',
      'lighthouse', 'המדידה האחרונה מול הייצור לכל מערכת, מ-core.lighthouse_runs, תמיד עם measured_at ועם age_hours. stale=true אומר שהמדידה בת יותר מ-48 שעות ולכן אינה מתארת בהכרח את מה שמוגש עכשיו — להציג אותה כמצב נוכחי יהיה טעות. מערכת שלא נמדדה מקבלת null, ולא ציון משוער.',
      'entries', 'entries_30d/entries_7d (core.system_entry_events) הן כניסות אמיתיות בפועל דרך כפתור "כניסה למערכת" בדף הבית — לא כל ביקור במערכת, רק מי שהגיע דרך הכרטיס. מערכת בלי אף כניסה נספרת מקבלת 0 ולא null, כי הטבלה קיימת מרגע המיגרציה הזו ו-0 הוא נתון אמיתי.'
    ),
    'totals', (
      select jsonb_build_object(
        'systems',        count(*),
        'live',           count(*) filter (where coalesce(p.live,false)),
        'in_showcase',    count(*) filter (where coalesce(p.show_in_showcase,false)),
        'systems_users_counted', count(*) filter (where p.supabase_project = hub),
        'hub_users',      (select count(*) from auth.users u
                            where not core.is_test_account(u.email)),
        'hub_users_test', (select count(*) from auth.users u
                            where core.is_test_account(u.email)),
        'hub_users_with_membership', (
                           select count(distinct m.user_id)
                             from core.app_memberships m
                             join auth.users u on u.id = m.user_id
                            where not core.is_test_account(u.email)),
        'subs_active',    (select count(*) from core.subscriptions s
                             left join auth.users u on u.id = s.user_id
                            where s.status <> 'cancelled'
                              and not core.is_test_account(u.email)),
        'subs_test',      (select count(*) from core.subscriptions s
                             left join auth.users u on u.id = s.user_id
                            where s.status <> 'cancelled'
                              and core.is_test_account(u.email)),
        'mrr_estimate_ils', (
                           select coalesce(sum(coalesce(pl.price_ils,0)), 0)
                             from core.subscriptions s
                             left join auth.users u on u.id = s.user_id
                             join core.plans pl on pl.app_key = s.app_key
                                               and pl.code = s.plan_code
                            where s.status <> 'cancelled'
                              and not core.is_test_account(u.email)
                              and pl.billing_kind = 'subscription'),
        'with_admin_url', count(*) filter (where p.admin_auth in ('own','hub')
                                             and p.admin_url ~ '^(/|https?://)\S*$'),
        'with_lighthouse', count(*) filter (where exists (
                             select 1 from core.lighthouse_runs l where l.app_key = p.path)),
        'lighthouse_fresh', count(*) filter (where exists (
                             select 1 from core.lighthouse_runs l
                              where l.app_key = p.path and l.measured_at >= now() - stale_after)),
        'entries_30d', (select count(*) from core.system_entry_events
                          where at >= now() - interval '30 days')
      ) from core.projects p
      where coalesce(p.to_delete,false)=false and p.path is not null
    ),

    'platform', jsonb_build_object(
      'app_key', 'more30',
      'name', 'more30 — הפלטפורמה עצמה',
      'users', (
        select jsonb_build_object(
          'members',       count(*) filter (where not core.is_test_account(u.email)),
          'test_accounts', count(*) filter (where core.is_test_account(u.email)),
          'active_7d',     count(*) filter (where not core.is_test_account(u.email)
                                              and m.last_seen_at >= now() - interval '7 days'),
          'last_activity', max(m.last_seen_at) filter (where not core.is_test_account(u.email))
        )
        from core.app_memberships m
        join auth.users u on u.id = m.user_id
        where m.app_key = 'more30'
      ),
      'subscriptions', (
        select jsonb_build_object(
          'active',  coalesce(sum(s.n) filter (where not s.is_test), 0),
          'test',    coalesce(sum(s.n) filter (where s.is_test), 0),
          'by_plan', coalesce(jsonb_object_agg(s.plan_code, s.n)
                     filter (where s.plan_code is not null and not s.is_test),
                     '{}'::jsonb)
        )
        from (
          select sub.plan_code,
                 core.is_test_account(u.email) as is_test,
                 count(*) as n
          from core.subscriptions sub
          left join auth.users u on u.id = sub.user_id
          where sub.app_key = 'more30' and sub.status <> 'cancelled'
          group by sub.plan_code, core.is_test_account(u.email)
        ) s
      ),
      'mrr_estimate_ils', coalesce((
        select sum(coalesce(pl.price_ils,0))
        from core.subscriptions s2
        left join auth.users u2 on u2.id = s2.user_id
        join core.plans pl on pl.app_key = s2.app_key and pl.code = s2.plan_code
        where s2.app_key = 'more30' and s2.status <> 'cancelled'
          and not core.is_test_account(u2.email)
          and pl.billing_kind = 'subscription'
      ), 0),
      'tiers', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'code', pl.code, 'name_he', pl.name_he,
                 'price_ils', pl.price_ils, 'period', pl.period,
                 'billing_kind', pl.billing_kind)
               order by pl.sort asc nulls last)
        from core.plans pl
        where pl.app_key = 'more30' and pl.active and pl.customer_visible
      ), '[]'::jsonb)
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
             'active',  coalesce(sum(s.n) filter (where not s.is_test), 0),
             'test',    coalesce(sum(s.n) filter (where s.is_test), 0),
             'by_plan', coalesce(jsonb_object_agg(s.plan_code, s.n)
                        filter (where s.plan_code is not null and not s.is_test),
                        '{}'::jsonb)
           )
           from (
             select sub.plan_code,
                    core.is_test_account(u.email) as is_test,
                    count(*) as n
             from core.subscriptions sub
             left join auth.users u on u.id = sub.user_id
             where sub.app_key = p.path and sub.status <> 'cancelled'
             group by sub.plan_code, core.is_test_account(u.email)
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
            left join auth.users u2 on u2.id = s2.user_id
            join core.plans pl on pl.app_key = s2.app_key and pl.code = s2.plan_code
            where s2.app_key = p.path and s2.status <> 'cancelled'
              and not core.is_test_account(u2.email)
              and pl.billing_kind = 'subscription'
          ), 0)                                 as mrr_estimate_ils,

          -- 0127 — כניסות אמיתיות דרך כפתור "כניסה למערכת" בדף הבית.
          (select jsonb_build_object(
             'entries_30d', count(*) filter (where e.at >= now() - interval '30 days'),
             'entries_7d',  count(*) filter (where e.at >= now() - interval '7 days'),
             'last_at',     max(e.at)
           )
           from core.system_entry_events e
           where e.app_key = p.path
          )                                     as entries

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
