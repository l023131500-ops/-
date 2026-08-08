-- 0048 — ההרשמה שהתחילה בעמוד המסלולים לא נרשמה לאף מערכת
--
-- §1 דורש שמי שנרשם ייכנס **לתוך המוצר** כלקוח מלא. הדבר שהופך "נרשמתי"
-- ל"אני משתמש של המערכת הזו" הוא שורה אחת ב-core.app_memberships, ומי שכותב
-- אותה הוא public.more30_join_app — ש-portal/public/auth/callback.html קורא
-- לו מיד אחרי כל כניסה, בכל אחת מהזרימות (Google, הרשמה מיידית, סיסמה).
--
-- הקלט שהוא מקבל אינו מפתח מערכת אלא **הכתובת שממנה המשתמש הגיע**:
--
--     const app = returnTo() || document.referrer || 'more30';
--     await sb.rpc('more30_join_app', { p_app: app });
--
-- כלומר '/bkalot', או 'https://more30.com/nadlan/', או '/subscribe?app=torah'.
-- core.app_key_normalize היא זו שמתרגמת. כשהיא מחזירה null, more30_join_app
-- מחזיר {ok:false, reason:'unknown_app'} **ואינו כותב שורה כלל** — ו-
-- callback.html בולע את זה בכוונה ("חברות היא רישום, לא תנאי כניסה"). המשתמש
-- ממשיך פנימה, ואף אחד לא רואה שהחברות נשמטה.
--
-- מה שנמדד היום על המסד החי, על הכתובות שהפורטל באמת מגיש
-- (portal/vercel.dist.json + portal/public/):
--
--   /                        → more30    ✓
--   /login  /me  /admin      → more30    ✓
--   /auth/callback           → more30    ✓
--   /bkalot  /nadlan/        → המערכת    ✓
--   /subscribe                        → **null**
--   /subscribe?app=torah&plan=basic   → **null**
--   /showcase                         → **null**
--   /system.html                      → **null**
--   /system.html?app=nadlan           → **null**
--   /me.html  /login.html  /admin-systems.html  → **null**
--
-- שתי סיבות נפרדות, ושתיהן מתוקנות כאן:
--
-- 1. **רשימת דפי הפלטפורמה חלקית.** היא נכתבה ב-0015 עם חמישה שמות
--    ('more30','login','me','admin','auth','nihul') ולא גדלה מאז, בעוד
--    /subscribe, /showcase ו-system.html נוספו אחריה. ובנוסף, המסנן
--    '[^A-Za-z0-9_-]' מוחק את הנקודה במקום לחתוך בה: '/system.html' הפך
--    ל-'systemhtml', שם שאינו יכול להתאים לכלום.
--
-- 2. **מזהה המערכת נזרק לפני שנקרא.** 'regexp_replace(v, ''[?#].*$'', '''')'
--    מוחק את ה-query — ובדיוק שם יושב 'app=torah'. זה נעשה חשוב **עכשיו**:
--    הסבב הקודם (f04e71d) הוסיף ל-19 כרטיסי דף הבית קישור "מסלולים ומחירים"
--    אל '/system.html?app=<שם>', ולכן זו כתובת שלקוח פוגש בדרך הראשית. מי
--    שיקליק אותה מכרטיס נדל"ן ואז ייכנס — לא ייחשב משתמש של נדל"ן.
--
-- מה המיגרציה משנה, ומה במפורש לא:
--
--   • '?app=' נקרא לפני שה-query נמחק, ורק אם הוא מצביע על מערכת רשומה.
--     '?app=bogus' ממשיך ליפול לנתיב, כמו קודם.
--   • סיומת קובץ נחתכת ('/system.html' → 'system'), ולא נמחקת התו-תו.
--   • **חיפוש המרשם קודם לרשימת דפי הפלטפורמה**, ולא אחריה. כך שם של דף
--     פורטל לעולם לא יכול להאפיל על path אמיתי. נמדד על 38 השורות:
--     אפס התנגשויות היום — הסדר הזה הוא מה שמשאיר את זה נכון גם מחר.
--   • הרשימה נגזרת מהמסלולים שהפורטל מגיש בפועל, כולל תבנית 'admin-%'
--     שמכסה את תשעת המסכים הסטטיים בלי לפרט אותם.
--   • כתובת שאינה מערכת ואינה דף פורטל ממשיכה להחזיר null. זה השער שמונע
--     כתיבת חברות לאתר זר, והוא לא נגע.
--
-- אין כאן פריסה: הפונקציה חיה במסד, ו-callback.html שכבר בייצור קורא לה.
-- אימות: node scripts/qa/join-app-from-portal-pages.mjs
--
-- core.issues #121.

-- ── עזר: אותה שאילתה שנשאלה עד היום פעמיים בגוף הפונקציה ──────────────────
-- קיימת כדי ש-'?app=' והנתיב ישאלו את המרשם **באותו** אופן בדיוק. שתי עותקות
-- של חמש שורות היו נפרדות בתיקון הראשון.
create or replace function core.app_key_lookup(p_token text)
returns text
language sql
stable
as $$
  select coalesce(
    (select p.path from core.projects p where p.path = p_token limit 1),
    (select coalesce(p.path, p.slug) from core.projects p where p.slug = p_token limit 1)
  );
$$;

comment on function core.app_key_lookup(text) is
  'מזהה נקי → path של מערכת רשומה, או null. אינו מכיר נתיבים, query או דפי פורטל.';

create or replace function core.app_key_normalize(p_raw text)
returns text
language plpgsql
stable
as $$
declare
  v     text;
  v_app text;
  v_key text;
begin
  v := btrim(coalesce(p_raw, ''));
  v := regexp_replace(v, '^[a-z]+://[^/]+', '', 'i');   -- הורדת פרוטוקול ודומיין

  -- ‏'?app=' נקרא כאן, לפני שה-query נמחק. זו הכתובת שכרטיס בדף הבית מוביל
  -- אליה ('/system.html?app=nadlan'), ובעמוד כזה שם המערכת יושב **רק** שם.
  -- ‏'[?&]app=' דורש את המפריד, ולכן 'myapp=' ו-'app_id=' אינם נתפסים.
  v_app := substring(v from '[?&]app=([^&#]*)');
  if v_app is not null then
    v_app := lower(regexp_replace(v_app, '[^A-Za-z0-9_-]', '', 'g'));
    if v_app <> '' then
      v_key := core.app_key_lookup(v_app);
      if v_key is not null then return v_key; end if;
      if v_app = 'more30' then return 'more30'; end if;
    end if;
  end if;

  v := regexp_replace(v, '[?#].*$', '');                -- הורדת query/hash
  v := trim(both '/' from v);
  v := split_part(v, '/', 1);                           -- המקטע הראשון בלבד
  v := regexp_replace(v, '\.[A-Za-z0-9]+$', '');        -- '/system.html' → 'system'
  v := lower(regexp_replace(v, '[^A-Za-z0-9_-]', '', 'g'));

  if v = '' then return 'more30'; end if;               -- דף הבית

  -- המרשם קודם. דף פורטל לעולם אינו מאפיל על path אמיתי.
  v_key := core.app_key_lookup(v);
  if v_key is not null then return v_key; end if;

  -- הדפים המשותפים של הפלטפורמה אינם אתר בפני עצמו — הם שייכים לפורטל (33).
  -- הרשימה היא המסלולים ש-portal/vercel.dist.json מגיש מ-portal/public/,
  -- בשתי הצורות שבהן אפשר לפגוש אותם (המסלול הנקי ושם הקובץ).
  -- 'more30' עצמו ברשימה כי זה המפתח שהפונקציה מחזירה: ערך שיוצא ממנה חייב
  -- לשרוד מעבר נוסף דרכה, אחרת קורא שמעביר הלאה מפתח מוכר מקבל "לא מוכר".
  if v in ('more30','login','me','admin','auth','nihul',
           'subscribe','showcase','system','robots','sitemap')
     or v like 'admin-%'                                -- תשעת מסכי הלוח הסטטיים
  then
    return 'more30';
  end if;

  return null;   -- לא מוכר; הקורא מחליט מה לעשות עם זה
end;
$$;

comment on function core.app_key_normalize(text) is
  'כתובת שהמשתמש עמד בה → מפתח מערכת. קורא ?app= לפני שהוא זורק את ה-query, '
  'חותך סיומת קובץ, ומחזיר more30 לדפי הפורטל עצמו. null = לא מוכר.';
