-- 0043 — שתי רשימות הלקוחות הפר-מערכתיות נשארו על העמודות ש-0031 ו-0041 עזבו.
--
-- 0031 העבירה את more30_profile_get ו-more30_join_app מ-
-- public.more30_profiles.plan אל core.subscriptions. 0041 העבירה אחריהן את
-- more30_admin_users() — מסך "משתמשי הפלטפורמה" — והוסיפה לו שם מהמטא-דאטה
-- וטלפון. שתי הפונקציות שנשארו הן בדיוק אלה ש-§2 מבקש ("ניהול מלא של כל
-- מערכת — לקוחות"): more30_app_users(p_app), שמצייר את רשימת המשתמשים בתוך
-- קונסולת הניהול של כל מערכת, ו-more30_admin_customers(p_app), שמצייר את
-- "רשומים במערכת" ב-/admin/customers.
--
-- ── נמדד על ההאב, 07/08/2026: 110 שורות ב-core.app_memberships,
--    52 משתמשים, 22 מערכות
--
--   full_name  — more30_app_users קורא אותו מ-more30_profiles בלבד.
--                48 מ-110 השורות חוזרות בלי שם. אחת מהן נושאת שם אמיתי
--                ב-raw_user_meta_data, ששלח טופס ההרשמה של §8ב.
--                more30_admin_customers אינו מחזיר שם כלל — הטבלה
--                ב-/admin/customers מזהה לקוח באימייל בלבד (שורה 153),
--                בזמן ש-§8ב גובה שם בהרשמה ומאמת אותו.
--
--   phone      — אף אחת מהשתיים אינה מחזירה אותו. 7 מ-110 השורות מחזיקות
--                טלפון — בפרופיל או במטא-דאטה.
--
--   plan       — more30_app_users מחזיר coalesce(pr.plan,'free').
--                distinct(pr.plan) על 110 השורות = 1, והערך הוא 'free':
--                העמודה קבועה, כי שום הרשמה אינה כותבת אליה. זה אותו ממצא
--                שבגללו 0031 עזבה אותה.
--                more30_admin_customers לוקח plan_code מכל שורת מנוי שאינה
--                מבוטלת. כל 89 שורות המנוי הן status='requested' ואף אחת
--                אינה 'active', ו-core.billing_settings.mode='off'. כלומר
--                העמודה "מסלול" במסך מציגה בקשה כאילו היא מסלול בתוקף —
--                בדיוק הטעות ש-0041 סירבה לעשות. שורה אחת מוצגת כך היום,
--                והיא חשבון qa על torah עם basic ב-status='requested'.
--                109 השורות האחרות מקבלות null ומצוירות "—", כלומר "לא
--                ידוע", בזמן שהתשובה הידועה היא 'free'.
--
--   ordering   — אותה תת-שאילתה רצה `limit 1` בלי `order by`. אין אילוץ
--                ייחודיות על (user_id, app_key) ב-core.subscriptions, ולכן
--                השורה שנבחרת היא מה שהמתכנן החזיר ראשון. היום אין אף זוג
--                עם יותר משורה אחת, ולכן זה עוד לא נצפה — אבל התשובה אינה
--                מוגדרת, וזה תיקון של הכלל ולא של המספר.
--
--   is_test    — more30_admin_customers מסמן חשבונות בדיקה,
--                more30_app_users לא. אדמין מערכת רואה את חשבונות ה-qa
--                של מבחני §1 בתוך רשימת הלקוחות שלו בלי שום סימן.
--
-- ── מה שלא נעשה כאן, בכוונה
-- `plan` יחזור 'free' לכל 110 השורות גם אחרי התיקון, כי אין אף מנוי פעיל.
-- ההפרש הוא מהיכן התשובה מגיעה: מהיום היא נגזרת מ-core.subscriptions, ולכן
-- ביום שבו שורה תעבור ל-'active' שתי הרשימות יעקבו בלי שינוי קוד. הבקשה
-- עצמה אינה נבלעת — היא חוזרת ב-plan_requested/plan_status, שדות נפרדים.
--
-- מנוי more30/premium (§8א: 10 ₪ = כל המערכות הציבוריות) אינו מקופל לתוך
-- ה-plan הפר-מערכתי. אין אף שורה כזאת ב-'active', ולכן קיפול כזה היה הנחה
-- ולא מדידה. כשתהיה שורה פעילות ראשונה — זה הצעד הבא, על נתון אמיתי.
--
-- הטבלה ב-/admin/customers עדיין לא מציירת עמודת שם וטלפון: זה קובץ סטטי
-- בפורטל, והפריסה חסומה על מכסת Vercel (core.issues #83). השדות מחכים שם.
--
-- ── נמדד אחרי ההחלה, על אותן 110 שורות
--   שורות בלי שם: 48 → 47. אחת התאוששה מ-raw_user_meta_data.
--   שורות עם טלפון: 0 → 7.
--   plan ב-more30_app_users: 110 שורות 'free' לפני ואחרי — אותו ערך,
--     ממקור אחר. אף שורה לא זזה, וזו התשובה הנכונה כל עוד אין מנוי פעיל.
--   plan ב-more30_admin_customers: 109 שורות null → 'free', ושורה אחת
--     'basic' → 'free' עם plan_requested='basic', plan_status='requested'.
--   שורות עם plan שאינו 'free' אחרי התיקון: 0, כמו מספר המנויים הפעילים.
--
-- תוסף בלבד. אף שם שדה קיים לא שונה ולא הוסר, ולכן כל קורא קיים ממשיך
-- לעבוד. שתי הפונקציות הן קריאה בלבד — אף שורה לא נמחקה ולא שונתה.

create or replace function public.more30_app_users(p_app text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'core', 'auth'
as $function$
declare
  v_key text;
  v_access jsonb;
begin
  v_key := core.app_key_normalize(p_app);
  if v_key is null then
    raise exception 'unknown app: %', p_app using errcode = '22023';
  end if;

  v_access := public.more30_app_access(v_key);
  if not (v_access->>'is_admin')::boolean then
    raise exception 'admin only' using errcode = '42501',
      hint = 'רשימת המשתמשים פתוחה למנהל המערכת או לסופר-אדמין.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.is_test, x.created_at desc)
    from (
      select m.user_id, u.email,
             -- הפרופיל קודם — שם שהמשתמש הקליד ב-/auth/callback גובר על מה
             -- שנשלח פעם אחת בהרשמה. אחריו המטא-דאטה: full_name הוא מה
             -- שטופס §8ב שולח, ו-name הוא מה ש-Google מוסר.
             coalesce(
               nullif(btrim(pr.full_name), ''),
               nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
               nullif(btrim(u.raw_user_meta_data->>'name'), '')
             ) as full_name,
             case
               when nullif(btrim(pr.full_name), '') is not null then 'profile'
               when coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                             nullif(btrim(u.raw_user_meta_data->>'name'), '')) is not null then 'signup'
               else null
             end as name_source,
             coalesce(
               nullif(btrim(pr.phone), ''),
               nullif(btrim(u.raw_user_meta_data->>'phone'), ''),
               nullif(btrim(u.phone), '')
             ) as phone,
             -- המסלול שבתוקף: רק מנוי פעיל הוא מסלול. בקשה רשומה אינה תשלום,
             -- ו-core.billing_settings.mode עדיין 'off'.
             case when sub.status = 'active' then sub.plan_code else 'free' end as plan,
             sub.plan_code as plan_requested,
             sub.status    as plan_status,
             -- העמודה הישנה, כדי שהמעבר יהיה מדיד. אינה מקור אמת.
             pr.plan as profile_plan,
             pr.user_id is not null as has_profile,
             m.role, m.created_at, m.last_seen_at, u.last_sign_in_at,
             (u.raw_app_meta_data->>'provider') as provider,
             core.is_test_account(u.email) as is_test,
             public.more30_is_super_admin(m.user_id) as is_super_admin
      from core.app_memberships m
      join auth.users u on u.id = m.user_id
      left join public.more30_profiles pr on pr.user_id = m.user_id
      -- אין אילוץ ייחודיות על (user_id, app_key), ולכן הבחירה מפורשת ולא
      -- "השורה הראשונה שתחזור": מנוי פעיל גובר על בקשה, ואחר כך המאוחרת.
      left join lateral (
        select s.plan_code, s.status
        from core.subscriptions s
        where s.user_id = m.user_id
          and s.app_key = v_key
          and s.status <> 'cancelled'
        order by (s.status = 'active') desc, s.requested_at desc nulls last, s.id desc
        limit 1
      ) sub on true
      where m.app_key = v_key
    ) x
  ), '[]'::jsonb);
end;
$function$;

create or replace function public.more30_admin_customers(p_app text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'core', 'auth'
as $function$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.is_test, c.last_seen_at desc nulls last)
    from (
      select u.email,
             coalesce(
               nullif(btrim(pr.full_name), ''),
               nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
               nullif(btrim(u.raw_user_meta_data->>'name'), '')
             ) as full_name,
             case
               when nullif(btrim(pr.full_name), '') is not null then 'profile'
               when coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
                             nullif(btrim(u.raw_user_meta_data->>'name'), '')) is not null then 'signup'
               else null
             end as name_source,
             coalesce(
               nullif(btrim(pr.phone), ''),
               nullif(btrim(u.raw_user_meta_data->>'phone'), ''),
               nullif(btrim(u.phone), '')
             ) as phone,
             m.role, m.created_at as joined_at, m.last_seen_at,
             u.last_sign_in_at,
             u.email_confirmed_at is not null as confirmed,
             core.is_test_account(u.email) as is_test,
             -- אותו כלל כמו ב-0041 וכמו ב-more30_app_users שלמעלה.
             case when sub.status = 'active' then sub.plan_code else 'free' end as plan,
             sub.plan_code as plan_requested,
             sub.status    as plan_status
      from core.app_memberships m
      join auth.users u on u.id = m.user_id
      left join public.more30_profiles pr on pr.user_id = m.user_id
      left join lateral (
        select s.plan_code, s.status
        from core.subscriptions s
        where s.user_id = u.id
          and s.app_key = m.app_key
          and s.status <> 'cancelled'
        order by (s.status = 'active') desc, s.requested_at desc nulls last, s.id desc
        limit 1
      ) sub on true
      where m.app_key = p_app
    ) c
  ), '[]'::jsonb);
end;
$function$;
