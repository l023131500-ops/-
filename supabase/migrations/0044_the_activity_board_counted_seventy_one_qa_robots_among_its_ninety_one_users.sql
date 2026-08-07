-- 0044 — מסך "משתמשים פעילים" ספר 91 משתמשים רשומים, ו-71 מהם רובוטים.
--
-- ל-§3 יש שלושה מספרים ללוח: הכנסות · מנויים · כניסות. שני הראשונים יושבים
-- ב-more30_admin_systems_report, והשלישי — /admin/activity — יושב לבדו
-- ב-more30_admin_activity(). ארבע פונקציות לוח יודעות ש-core.is_test_account
-- קיים ומפרידות את חשבונות ה-qa מהלקוחות: more30_admin_systems_report,
-- more30_admin_users, more30_admin_customers, more30_app_users. הפונקציה
-- שמצוירת תחת הכותרת "כניסות" אינה אחת מהן.
--
-- ── נמדד על ההאב, 07/08/2026 (auth.users = 91, core.app_memberships = 110):
--
--    כרטיס במסך          מה שהוצג    אמת (לקוחות)   מה שנספר בטעות
--    ─────────────────   ─────────   ────────────   ───────────────
--    משתמשים רשומים          91            20         71 חשבונות qa
--    נכנסו ב-24 שעות         62             2         60 כניסות של מבחן
--    נכנסו ב-7 ימים          79             8         71
--    נכנסו ב-30 יום          79             8         71
--    מעולם לא נכנסו           9             9          0
--
--    הכרטיס השני הוא הממצא החמור: "62 נכנסו ב-24 שעות" הוא המספר שאדם
--    מסתכל עליו כדי לדעת אם המוצר חי. שני אנשים נכנסו. שאר ה-60 הם
--    מבחני הרגרסיה של §1, שנכנסים בכל ריצה.
--
--    ובטבלה "לפי מערכת" — שבע שורות, כי רק לשבע מערכות
--    ‏core.projects.supabase_project הוא ההאב; השאר יושבות ב-not_counted —
--    כל שבע מנופחות, ואף אחת לא במעט:
--
--      מערכת            משתמשים        24 שעות
--      ──────────       ───────────    ───────────
--      34 kesef          7 → 3          3 → 0
--      28 kupot          5 → 1          3 → 0
--      36 tivuch         5 → 1          3 → 0
--      32 nadlan         4 → 1          4 → 1
--      16 chatzor        4 → 1          3 → 0
--      04 imud           3 → 0          3 → 0
--      26 studio         3 → 0          3 → 0
--      —  הפורטל         7 → 6          —
--
--    ‏imud ו-studio מוצגות עם שלושה משתמשים כל אחת, ואין להן אף לקוח אחד.
--    ובעמודת "24 שעות" חמש מהשבע יורדות לאפס: כל תנועה שהמסך הראה שם
--    באותו יום הייתה מבחן.
--
-- שני מסכים באותו לוח אמרו שני דברים על אותו יום: /admin/systems מדווח
-- totals.hub_users = 20, ו-/admin/activity מדווח 91. אחד מהם שגוי, ולא
-- העמוד שמפריד.
--
-- והמסך הצהיר את זה במפורש: השורה מתחת לכותרת אומרת "נספר מההאב בלבד —
-- auth.users ו-core.app_memberships. אין כאן הערכות." ההצהרה נכונה במקורות
-- ושגויה במסקנה: לא הערכה — ספירה מדויקת של הקהל הלא נכון.
--
-- התיקון: אותה הפרדה בדיוק שיש ל-more30_admin_systems_report. המספרים
-- הקיימים מתארים לקוחות, וחשבונות הבדיקה נספרים לצידם ולא בתוכם —
-- test_accounts ברמת הפלטפורמה ובכל שורת מערכת, כדי שהם יישארו נראים.
-- הם אינם רעש: הם ההוכחה ש-§1 רץ.
--
-- ‏not_counted אינו נוגע לזה — הוא מדבר על מערכות שמאגרן בפרויקט אחר.
--
-- מה לא נכלל בצעד הזה, בכוונה: more30_admin_snapshot ו-more30_admin_leads
-- גם הן אינן יודעות על חשבונות בדיקה. הן מסכים אחרים, ונמדדות בצעד משלהן.

create or replace function public.more30_admin_activity()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $function$
declare
  hub constant text := 'uhnrgujbdxhhmoxcjria';
  result jsonb;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'hub_project', hub,
    'active_means',
      'נפתחה מערכת על ידי משתמש מחובר (core.app_memberships.last_seen_at). ' ||
      'מבקר אנונימי אינו נספר.',
    'test_accounts_means',
      'חשבונות בדיקה (qa.*@more30.com) נוצרים על ידי מבחני הרגרסיה של §1 ' ||
      'ונכנסים בכל ריצה. הם נספרים בעמודה נפרדת ואינם נכללים באף אחד ' ||
      'מהמספרים שמתארים לקוחות — בדיוק כמו ב-/admin/systems. עד 0044 הם ' ||
      'נספרו בתוכם, ו-91 "משתמשים רשומים" היו 20 אנשים ו-71 רובוטים.',

    -- רמת הפלטפורמה: מי בכלל נכנס, לפי auth.users
    'platform', (
      select jsonb_build_object(
        'users_total',  count(*) filter (where not core.is_test_account(u.email)),
        'confirmed',    count(*) filter (where not core.is_test_account(u.email)
                                           and u.email_confirmed_at is not null),
        'active_24h',   count(*) filter (where not core.is_test_account(u.email)
                                           and u.last_sign_in_at >= now() - interval '24 hours'),
        'active_7d',    count(*) filter (where not core.is_test_account(u.email)
                                           and u.last_sign_in_at >= now() - interval '7 days'),
        'active_30d',   count(*) filter (where not core.is_test_account(u.email)
                                           and u.last_sign_in_at >= now() - interval '30 days'),
        'never_signed_in', count(*) filter (where not core.is_test_account(u.email)
                                              and u.last_sign_in_at is null),
        -- לצידם ולא בתוכם.
        'test_accounts', count(*) filter (where core.is_test_account(u.email)),
        'test_active_24h', count(*) filter (where core.is_test_account(u.email)
                                              and u.last_sign_in_at >= now() - interval '24 hours')
      )
      from auth.users u
    ),

    -- לכל מערכת שהמשתמשים שלה בהאב
    'systems', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.members desc, s.number)
      from (
        select
          p.number,
          p.path            as app_key,
          p.name_he         as name,
          p.live,
          p.live_url,
          count(m.user_id) filter (where not core.is_test_account(u.email))          as members,
          count(m.user_id) filter (where core.is_test_account(u.email))              as test_accounts,
          count(m.user_id) filter (where not core.is_test_account(u.email)
                                     and m.last_seen_at >= now() - interval '24 hours') as active_24h,
          count(m.user_id) filter (where not core.is_test_account(u.email)
                                     and m.last_seen_at >= now() - interval '7 days')   as active_7d,
          count(m.user_id) filter (where not core.is_test_account(u.email)
                                     and m.last_seen_at >= now() - interval '30 days')  as active_30d,
          max(m.last_seen_at) filter (where not core.is_test_account(u.email))       as last_activity
        from core.projects p
        left join core.app_memberships m on m.app_key = p.path
        left join auth.users u on u.id = m.user_id
        where coalesce(p.to_delete, false) = false
          and p.path is not null
          and p.supabase_project = hub
        group by p.number, p.path, p.name_he, p.live, p.live_url
      ) s
    ), '[]'::jsonb),

    -- הפורטל עצמו אינו רשומה ב-core.projects
    'portal', (
      select jsonb_build_object(
        'app_key', 'more30',
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
      left join auth.users u on u.id = m.user_id
      where m.app_key = 'more30'
    ),

    -- מה שלא נספר, ולמה. זה חלק מהתשובה ולא הערת שוליים.
    'not_counted', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.number)
      from (
        select p.number, p.path as app_key, p.name_he as name, p.live,
               p.supabase_project as users_live_in,
               case
                 when p.supabase_project is null then 'אין לה מסד משתמשים משלה'
                 else 'מאגר המשתמשים שלה בפרויקט Supabase אחר'
               end as reason
        from core.projects p
        where coalesce(p.to_delete, false) = false
          and p.path is not null
          and (p.supabase_project is distinct from hub)
      ) n
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;
