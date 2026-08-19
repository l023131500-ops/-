-- 0041 — לוח המשתמשים קרא שם ומסלול משתי עמודות שההרשמה אינה כותבת אליהן.
--
-- מיגרציה 0031 מצאה שהמסלול ב-/me ובתפריט החשבון נקרא מ-
-- public.more30_profiles.plan, עמודה ששום הרשמה אינה כותבת אליה, והעבירה את
-- שני הקוראים האלה — more30_profile_get ו-more30_join_app — אל
-- core.subscriptions, המקום שאליו more30_subscribe באמת כותב. הקורא השלישי
-- של אותה טבלה, more30_admin_users(), נשאר מאחור. הוא זה שמצייר את מסך
-- "משתמשי הפלטפורמה" ב-/admin (admin/src/App.tsx:811-818), כלומר בדיוק
-- המסך שממנו §3 מבקש לראות מי הלקוחות.
--
-- ── נמדד על ההאב, 07/08/2026, 91 שורות ב-auth.users
--
--   plan     — distinct(plan) = 1. כל 91 השורות מחזירות 'free'.
--              20 משתמשים מחזיקים שורה ב-core.subscriptions שאינה מבוטלת,
--              ו-11 מהם מסלול more30/premium. הבאדג' בשורה 817 נבדק מול
--              plan === "premium" ולכן לא הודלק מעולם.
--
--   full_name — 37 מ-91 חוזרות null, והמסך מצייר להן "— ללא שם מלא".
--              14 מהן נושאות שם מלא אמיתי ב-raw_user_meta_data, שאותו
--              טופס ההרשמה של §8ב שלח ב-signUp. 11 מהן חשבונות אמיתיים.
--              כל 37 הן provider='email': /auth/callback הוא הכותב היחיד
--              ל-more30_profiles, ומי שלא עבר בו אינו קיים שם.
--
--   phone    — אינו מוחזר כלל. §8ב אוסף טלפון ומאמת אותו (9-15 ספרות),
--              ו-11 משתמשים מחזיקים אחד — בפרופיל או במטא-דאטה.
--
-- ── מה שלא נעשה כאן, בכוונה
-- `plan` נשאר 'free' לכל 91 גם אחרי התיקון, וזו התשובה הנכונה: כל 89 שורות
-- המנוי הן status='requested', ו-core.billing_settings.mode='off'. בקשה
-- רשומה אינה תשלום, ובאדג' "פרימיום" עליה היה הופך את המסך לשקר מסוג אחר.
-- ההפרש הוא מהיכן התשובה מגיעה: מהיום היא נגזרת מ-core.subscriptions, ולכן
-- ביום שבו שורה תעבור ל-'active' הלוח יעקוב בלי שינוי קוד. הבקשות עצמן לא
-- נבלעות — הן חוזרות ב-plan_requested/plan_status, שדות נפרדים.
--
-- profile_plan נשאר בתשובה מאותה סיבה שהוא נשאר ב-0031: כדי שהמעבר יהיה מדיד
-- ולא הצהרה.
--
-- תוסף בלבד. אף שם שדה קיים לא שונה ולא הוסר, ולכן ה-SPA שבייצור — שהפריסה
-- שלו חסומה על מכסת Vercel (core.issues #83) — קורא את אותם שדות וממשיך
-- לעבוד. תיקון השם נכנס לייצור מיד עם המיגרציה הזאת ובלי פריסה.
--
-- אף שורה לא נמחקה ולא שונתה: זו פונקציית קריאה בלבד.

create or replace function public.more30_admin_users()
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
    select jsonb_agg(to_jsonb(x) order by x.is_test, x.created_at desc)
    from (
      select u.id as user_id, u.email,
             -- הפרופיל קודם — שם שהמשתמש הקליד ב-/auth/callback גובר על מה
             -- שנשלח פעם אחת בהרשמה. אחריו המטא-דאטה: full_name הוא מה
             -- שטופס §8ב שולח, ו-name הוא מה ש-Google מוסר.
             coalesce(
               nullif(btrim(pr.full_name), ''),
               nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
               nullif(btrim(u.raw_user_meta_data->>'name'), '')
             ) as full_name,
             -- מאיפה השם הגיע. בלי זה "יש שם" ו"יש פרופיל" נראים אותו דבר,
             -- והם לא: 37 מהמשתמשים אינם מחזיקים שורת פרופיל כלל.
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
             -- המסלול שבתוקף: רק מנוי פעיל הוא מסלול. בקשה רשומה אינה
             -- תשלום, ו-core.billing_settings.mode עדיין 'off'.
             case when sub.status = 'active' then sub.plan_code else 'free' end as plan,
             -- הבקשה עצמה, לצד המסלול ולא בתוכו.
             sub.plan_code as plan_requested,
             sub.status    as plan_status,
             -- העמודה הישנה, כדי שהמעבר יהיה מדיד. אינה מקור אמת.
             pr.plan as profile_plan,
             pr.user_id is not null as has_profile,
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
      -- אין אילוץ ייחודיות על (user_id, app_key), ולכן הבחירה מפורשת ולא
      -- "השורה הראשונה שתחזור": מנוי פעיל גובר על בקשה, ואחר כך המאוחרת.
      left join lateral (
        select s.plan_code, s.status
        from core.subscriptions s
        where s.user_id = u.id
          and s.app_key = 'more30'
          and s.status <> 'cancelled'
        order by (s.status = 'active') desc, s.requested_at desc nulls last, s.id desc
        limit 1
      ) sub on true
    ) x
  ), '[]'::jsonb);
end;
$function$;
