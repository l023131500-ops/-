-- 0025 — the super-admin board printed "ניהול המערכת הזאת ←" on every card, and
--        all thirty of them pointed at /admin/issues
--
-- §3 asks the board at more30.com/admin/systems for a "נהל מערכת זו" link per
-- system. The link exists on the card and reads exactly that — but its href is
-- the platform-wide bug list, identical on all thirty cards. It is not the
-- system's admin, and it does not differ by system, so the one control §3 asked
-- for was the one thing the board could not do.
--
-- 0022 and 0023 measured core.projects.admin_url against production until the
-- register knew where each entry is, and 0024 taught more30_system_page — the
-- customer-facing screen — to hand it out. more30_admin_systems_report is the
-- other reader of that column and it never selected it, which is why the card
-- fell back to a generic link.
--
-- The gate is the same one 0024 defined, deliberately repeated rather than
-- relaxed for an admin audience:
--
--   admin_url   only when admin_auth is 'own' or 'hub' AND the value is a
--               followable address. kupot records
--               '/api/switch-leads (כותרת x-admin-token)' with admin_auth='token'
--               — an API endpoint plus the header it wants, not a screen.
--               Rendering it would give a super-admin a 404 and call it an entry.
--   admin_auth  passed through so the card can say whose sign-in it is: 'own' is
--               the system's own gate, 'hub' is the platform super-admin.
--
-- Measured on the register at the time of writing, over the thirty rows this
-- report returns: 12 carry a followable entry, 1 is recorded but withheld by the
-- gate above (kupot), and 17 have no admin screen at all — which is core.issues
-- #86 and stays visible as absence. A card with no entry must say so; inventing
-- a link for it is what this migration is fixing.
--
-- Read-only change: the function is STABLE, two keys are added to a payload that
-- is already super-admin-gated, and no billing or sending state is touched.
-- Nothing here concerns 08, 09, bkalut-app, bkalot-admin, zr_* or NEDARIM3873.

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
      'not_in_hub', 'מערכת שמאגר המשתמשים שלה בפרויקט אחר אינה נספרת, ומסומנת users_counted=false.',
      'admin_url', 'כתובת מסך הניהול של המערכת עצמה, מ-core.projects.admin_url, ורק כשהיא כתובת שאפשר ללחוץ עליה ו-admin_auth הוא own או hub. מערכת בלי מסך ניהול מקבלת null ולא קישור חלופי — היעדר מסך ניהול הוא ממצא (core.issues #86) ולא פרט להסתיר.'
    ),
    'totals', (
      select jsonb_build_object(
        'systems',        count(*),
        'live',           count(*) filter (where coalesce(p.live,false)),
        'in_showcase',    count(*) filter (where coalesce(p.show_in_showcase,false)),
        'users_counted',  count(*) filter (where p.supabase_project = hub),
        'with_admin_url', count(*) filter (where p.admin_auth in ('own','hub')
                                             and p.admin_url ~ '^(/|https?://)\S*$')
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
