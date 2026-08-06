-- 0014 — לוח ניהול-על: להפריד חשבונות בדיקה מלקוחות אמיתיים
--
-- ‏§3 מבקש מהלוח "הכנסות/מנויים/כניסות" לכל מערכת, והכלל הראשון בהנחיה הוא
-- **נתוני אמת בלבד**. שני הדברים האלה סותרים זה את זה כרגע.
--
-- ‏more30_admin_systems_report סופר `core.app_memberships` כמו שהיא ומציג את
-- התוצאה תחת "משתמשים". אבל מבחני הרגרסיה של §1 (scripts/qa/customer-journey.mjs)
-- יוצרים לקוח אמיתי לכל מערכת בכל ריצה — הם חייבים, זה מה שהופך אותם למבחן
-- ולא לבדיקת קוד. התוצאה נמדדה היום ולא הונחה:
--
--   ‏42 מתוך 60 החשבונות במאגר הם חשבונות בדיקה שלי.
--   ‏32 מתוך 46 החברויות הן חשבונות בדיקה.
--   ‏13 מתוך 21 המערכות הציגו מספר משתמשים שכולו, 100%, חשבונות בדיקה
--      (‏torah 3/3, bkalot 5/5, zchuyot 2/2, mechiron 2/2, ועוד תשע עם 1/1).
--
-- כלומר הלוח שנועד לומר "כמה לקוחות יש למערכת הזו" ענה על שאלה אחרת לגמרי,
-- והתשובה הייתה נראית לגיטימית לחלוטין — מספר קטן וסביר. זה בדיוק הסוג של
-- נתון מומצא שההנחיה אוסרת, והוא היה גדל בכל ריצת בדיקה.
--
-- ── מה **לא** נעשה כאן, בכוונה
-- לא נמחקו חשבונות ולא הוסתרו שורות. מחיקה הייתה הופכת את מבחני הרגרסיה
-- לחד-פעמיים, והסתרה שקטה הייתה מחליפה מספר לא נכון אחד באחר. במקום זה
-- הלוח **מדווח את שניהם בנפרד**: כמה לקוחות אמיתיים, וכמה חשבונות בדיקה.
-- אפשר לראות את שניהם, ואי אפשר לטעות ביניהם.

-- ── מהו "חשבון בדיקה" — הגדרה אחת, במקום אחד ─────────────────────────────
-- המוסכמה שכל סקריפטי ה-QA כבר משתמשים בה: qa.customer+…, qa.np.agent,
-- qa.np.outsider, qa.kesef.test — כולם `qa.` בתחילת החלק המקומי ועל הדומיין
-- הפנימי של הפלטפורמה.
--
-- החד-משמעות של הדפוס נמדדה על המאגר החי לפני שנכתב כאן: 42 חשבונות תואמים
-- `qa.%@more30.com`, **אפס** חשבונות מתחילים ב-`qa` בלי לתאום את הדפוס, ואפס
-- חשבונות מכילים `qa` במקום אחר בכתובת. כלומר אין לקוח אמיתי שנתפס בטעות.
--
-- הדומיין הפנימי הוא חלק מהתנאי ולא קישוט: `@more30.com` הוא המיפוי של
-- "שם משתמש פנימי" ‏(ראה INTERNAL_DOMAIN ב-portal/public/login.html), ולכן
-- לקוח אמיתי בשם qa.something בדומיין שלו לא ייספר כבדיקה.
create or replace function core.is_test_account(p_email text)
returns boolean
language sql
immutable
as $$
  select coalesce(lower(p_email) like 'qa.%@more30.com', false);
$$;

comment on function core.is_test_account(text) is
  'חשבון שנוצר על ידי סקריפט QA. מוסכמה: qa.<משהו>@more30.com. משמש להפרדת מספרי לקוחות אמיתיים בלוח הניהול-על.';


-- ── דוח המערכות ──────────────────────────────────────────────────────────
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
          -- ‏`path` חוזר במפורש נוסף על `app_key`. הכרטיס ב-/admin/systems
          -- קורא `x.path` כדי לשלוף את ספירת הבאגים של המערכת מ-by_app, והשדה
          -- הזה מעולם לא הוחזר — ולכן שורת הבאגים בכל 21 הכרטיסים אמרה
          -- "לא נרשמו" גם כשיש לאותה מערכת רשומות ב-core.issues. שני השמות
          -- מוחזרים כדי שגם הקוראים הקיימים וגם החדשים יקבלו ערך.
          p.path                                as path,
          p.name_he                             as name,
          p.tagline,
          coalesce(p.live,false)                as live,
          p.live_url,
          p.stage::text                         as stage,
          coalesce(p.show_in_showcase,false)    as show_in_showcase,
          p.supabase_project,
          (p.supabase_project = hub)            as users_counted,

          -- משתמשים (רק אם המאגר בהאב). חשבונות בדיקה יוצאים מכל מדד של
          -- לקוחות — כולל הפעילות, אחרת "פעילים 7 ימים" היה מודד את מתי
          -- הרצתי את המבחן האחרון.
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

          -- מנויים והכנסה משוערת
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

          -- המחירים כפי שנקבעו, לפי סוג תשלום
          (select jsonb_object_agg(pl.billing_kind,
                    jsonb_build_object('code', pl.code, 'price_ils', pl.price_ils,
                                       'chargeable', coalesce(pl.price_ils,0) > 0))
             from core.plans pl
            where pl.app_key = p.path and pl.code in ('charge','one_time','pro')
          )                                     as pricing,

          -- הכנסה חודשית משוערת: מנויים פעילים × מחיר המסלול שלהם
          coalesce((
            select sum(coalesce(pl.price_ils,0))
            from core.subscriptions s2
            join core.plans pl on pl.app_key = s2.app_key and pl.code = s2.plan_code
            where s2.app_key = p.path and s2.status <> 'cancelled'
              and pl.billing_kind = 'subscription'
          ), 0)                                 as mrr_estimate_ils

        from core.projects p
        where coalesce(p.to_delete,false)=false and p.path is not null
      ) x
    ), '[]'::jsonb)
  );
end;
$function$;


-- ── רשימת הלקוחות של מערכת ───────────────────────────────────────────────
-- הרשימה נשארת מלאה: חשבון בדיקה מסומן ולא נמחק מהתצוגה. מי שפותח את המסך
-- כדי לבדוק אם צירוף לקוח עבד צריך לראות את השורה שהוא בדיוק יצר.
create or replace function public.more30_admin_customers(p_app text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $function$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.is_test, c.last_seen_at desc nulls last)
    from (
      select u.email, m.role, m.created_at as joined_at, m.last_seen_at,
             u.last_sign_in_at,
             u.email_confirmed_at is not null as confirmed,
             core.is_test_account(u.email) as is_test,
             (select s.plan_code from core.subscriptions s
               where s.user_id = u.id and s.app_key = m.app_key
                 and s.status <> 'cancelled' limit 1) as plan
      from core.app_memberships m
      join auth.users u on u.id = m.user_id
      where m.app_key = p_app
    ) c
  ), '[]'::jsonb);
end;
$function$;


-- ── רשימת כל המשתמשים ────────────────────────────────────────────────────
create or replace function public.more30_admin_users()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'auth'
as $function$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.is_test, x.created_at desc)
    from (
      select u.id as user_id, u.email, pr.full_name, coalesce(pr.plan,'free') as plan,
             u.created_at, u.last_sign_in_at,
             (u.raw_app_meta_data->>'provider') as provider,
             u.email_confirmed_at is not null as confirmed,
             core.is_test_account(u.email) as is_test,
             public.more30_is_super_admin(u.id) as is_super_admin,
             coalesce((
               select jsonb_agg(jsonb_build_object('app_key', m.app_key, 'role', m.role)
                                order by m.created_at)
               from core.app_memberships m where m.user_id = u.id
             ), '[]'::jsonb) as apps
      from auth.users u
      left join public.more30_profiles pr on pr.user_id = u.id
    ) x
  ), '[]'::jsonb);
end;
$function$;
