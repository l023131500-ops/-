-- 0051 — הכותרת ספרה תשעים מנויים, ותשעה-עשר הכרטיסים שמתחתיה ספרו שבעים ותשעה
--
-- ‏§3 מבקש מלוח ניהול-העל להראות הכנסות · מנויים · כניסות לכל מערכת. הנתון
-- מגיע כולו מ-more30_admin_systems_report(), והפונקציה בונה את שתי הרמות שלה
-- משני מקורות שונים:
--
--   • totals — נספר על core.subscriptions ועל core.app_memberships **ישירות**,
--     בלי לעבור דרך core.projects.
--   • systems — נבנה מ-‏core.projects, ‏‎where p.path is not null‎, ולכל שורה
--     נספרות המנויים לפי ‎sub.app_key = p.path‎.
--
-- ── מה נמדד ─────────────────────────────────────────────────────────────────
--
-- נמדד 09/08 על המסד החי. ‎app_key = 'more30'‎ קיים בשלוש טבלאות — core.plans,
-- core.app_memberships ו-core.subscriptions — ואין ולו שורה אחת ב-core.projects
-- שה-path שלה הוא 'more30'. מספר 33 (more30-spec-loop) הוא האתר עצמו ו-path שלו
-- null, ולכן התנאי ‎p.path is not null‎ מוציא אותו מן ה-‎systems‎ ממילא.
--
-- התוצאה, במספרים של היום:
--
--   • ‎totals.subs_test = 90‎, וסכום ‎subscriptions.test‎ על 19 הכרטיסים = ‎79‎.
--     אחת-עשרה שורות המנוי של ‎more30/premium‎ מופיעות בכותרת ובאף כרטיס.
--   • שבע שורות חברות על 'more30' (שש אמיתיות ואחת בדיקה) — אותו דבר.
--   • ‎mrr_estimate_ils‎ בכותרת סוכם גם הוא על כל המנויים; היום הוא 0 בשני
--     הצדדים משום שאין ולו מנוי אמיתי אחד במסד, ולכן הפער הזה **עוד** אינו
--     נראה בכסף. הוא ייראה ברגע שמישהו יירשם.
--
-- ‏more30/premium אינו מסלול שולי: ‎§8א‎ קורא לו "פרימיום כללי — כל המערכות
-- הציבוריות" ב-10 ₪, והוא כבר מחזיק את מספר הבקשות הגדול ביותר מכל app_key
-- במסד (11, מול 10 ל-torah). זה המסלול שהפלטפורמה מוכרת בעצמה, ואין בלוח
-- שורה אחת שמראה כמה נרשמו אליו.
--
-- ── מה שאינו הבאג ───────────────────────────────────────────────────────────
--
-- ה-lateral ‎pf‎ כבר יודע על 'more30': מערכת בלי מסלולים משלה נופלת למסלולי
-- הפלטפורמה, וזה מוצג נכון עם ‎plans_from‎. כלומר **המחיר** של הפלטפורמה מגיע
-- לכרטיסים. מה שאינו מגיע לשום מקום הוא הצד השני — מי נרשם, וכמה.
--
-- ── מה משתנה כאן ────────────────────────────────────────────────────────────
--
-- לא נוגעים ב-core.projects. שורה עם ‎path='more30'‎ הייתה נכנסת גם לדף הבית,
-- גם לניתוב וגם למניין המערכות — שלושה מקומות שאיש לא ביקש לשנות, ובכולם
-- הפלטפורמה אינה מערכת. במקום זה נוסף ל-report מפתח **‎platform‎** נפרד, לצד
-- ‎systems‎ ולא בתוכו, שנושא את מה שנשמט: חברות, מנויים לפי מסלול, הכנסה
-- משוערת ומסלולים. הכותרת נשארת כפי שהיא — היא מעולם לא הייתה שגויה; מה
-- שהיה חסר הוא המקום שבו ההפרש יושב.
--
-- ‎notes.platform‎ אומר את זה במפורש, כדי שמי שקורא את הלוח יראה למה הכותרת
-- גדולה מסכום הכרטיסים ולא ינחש.
--
-- שאר הפונקציה מועתקת מ-0046 מילה במילה.

create or replace function public.more30_admin_systems_report()
returns jsonb
language plpgsql
stable
security definer
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
      'lighthouse', 'המדידה האחרונה מול הייצור לכל מערכת, מ-core.lighthouse_runs, תמיד עם measured_at ועם age_hours. stale=true אומר שהמדידה בת יותר מ-48 שעות ולכן אינה מתארת בהכרח את מה שמוגש עכשיו — להציג אותה כמצב נוכחי יהיה טעות. מערכת שלא נמדדה מקבלת null, ולא ציון משוער.'
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
                              where l.app_key = p.path and l.measured_at >= now() - stale_after))
      ) from core.projects p
      where coalesce(p.to_delete,false)=false and p.path is not null
    ),

    -- ‏חדש ב-0051. אותם חישובים בדיוק של כרטיס מערכת, על app_key='more30'.
    -- ‏אין כאן number, live_url, tagline, lighthouse או admin_url — לפלטפורמה
    -- ‏אין מהם אף אחד, ולהמציא להם ערך היה הופך אותה למערכת עשרים.
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
