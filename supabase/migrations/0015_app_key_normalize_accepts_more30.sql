-- 0015 — core.app_key_normalize לא הכירה את המפתח שהיא עצמה מחזירה.
--
-- הפורטל (33) נרשם ב-core.app_memberships תחת המפתח 'more30', אבל אין
-- ל-core.projects שורה עם path='more30' — ולכן שתי השאילתות בסוף הפונקציה
-- החזירו NULL על הקלט 'more30'. more30_join_app ענה על זה
-- {"ok":false,"reason":"unknown_app"} ב-HTTP 200, ולא נכתבה שורת חברות.
--
-- מי נפגע בפועל: portal/public/auth/callback.html קורא
--   more30_join_app(returnTo() || document.referrer || 'more30')
-- והליטרל האחרון הוא בדיוק הערך שנכשל. הוא נדלק כששני הראשונים ריקים —
-- כלומר בכניסת Google שמתחילה ב-/login בלי `from`, כי הפניית 302 מהספק אינה
-- מוסרת referrer. זהו מסלול הכניסה החינמי של §8ב, והנכנסים בו לא נרשמו
-- כלקוחות של הפלטפורמה. הקריאה עטופה ב-try/catch שמתעלם מהתשובה, ולכן
-- הכישלון לא הופיע בשום מקום.
--
-- נמדד מול הפרודקשן עם חשבון בדיקה אמיתי (scripts/qa/join-app-key.mjs):
-- 10 מתוך 11 הצורות שהקוראים החיים באמת מעבירים נרשמו, והאחת שנכשלה היא זו.
--
-- התיקון: 'more30' מצטרף לרשימת הדפים המשותפים שממופים לפורטל. זה נכון לכל
-- קורא ולא רק לזה — ערך שיוצא מהפונקציה חייב לשרוד מעבר נוסף דרכה.
-- אין כאן שינוי התנהגות קיים: 'more30' החזיר NULL קודם, ו-29 מתוך 29
-- הנתיבים ב-core.projects ממשיכים להתנרמל לעצמם.

create or replace function core.app_key_normalize(p_raw text)
 returns text
 language plpgsql
 stable security definer
 set search_path to 'core', 'public'
as $function$
declare
  v text;
  v_key text;
begin
  v := btrim(coalesce(p_raw, ''));
  v := regexp_replace(v, '^[a-z]+://[^/]+', '', 'i');   -- הורדת פרוטוקול ודומיין
  v := regexp_replace(v, '[?#].*$', '');                -- הורדת query/hash
  v := trim(both '/' from v);
  v := split_part(v, '/', 1);                           -- המקטע הראשון בלבד
  v := lower(regexp_replace(v, '[^A-Za-z0-9_-]', '', 'g'));

  -- הדפים המשותפים של הפלטפורמה אינם אתר בפני עצמו — הם שייכים לפורטל (33).
  -- 'more30' עצמו ברשימה כי זה המפתח שהפונקציה מחזירה: ערך שיוצא ממנה חייב
  -- לשרוד מעבר נוסף דרכה, אחרת קורא שמעביר הלאה מפתח מוכר מקבל "לא מוכר".
  if v = '' or v in ('more30','login','me','admin','auth','nihul') then
    return 'more30';
  end if;

  select p.path into v_key from core.projects p where p.path = v limit 1;
  if v_key is not null then return v_key; end if;

  select coalesce(p.path, p.slug) into v_key from core.projects p where p.slug = v limit 1;
  return v_key;   -- null = לא מוכר; הקורא מחליט מה לעשות עם זה
end;
$function$;
