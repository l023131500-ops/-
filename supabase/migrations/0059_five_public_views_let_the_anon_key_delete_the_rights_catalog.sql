-- 0059 — חמישה views ב-public נתנו למפתח ה-anon למחוק את מאגר הזכויות
--
-- מה נמדד (13/08, לפני השינוי): מפתח ה-anon של הפלטפורמה — זה שמופיע גלוי
-- בקוד המקור של כל עמוד פורטל — החזיק INSERT/UPDATE/DELETE/TRUNCATE על חמישה
-- views ב-public, וכל החמישה auto-updatable:
--
--   public.rights_catalog        -> rights.catalog        (888 נושאים)
--   public.rights_public         -> rights.reference      (67 מתוך 104, status=verified)
--   public.rights_situation_map  -> rights.situation_map  (24 מצבי חיים)
--   public.rights_meta_public    -> rights.meta           (12)
--   public.more30_automations    -> core.automations      (3)
--
-- זו אינה תיאוריה. שתי מדידות:
--   (1) DELETE /rest/v1/rights_catalog?code=eq.<לא קיים> עם מפתח anon החזיר
--       204 ולא 401/403 — כלומר ההרשאה לא נשללה, פשוט לא היו שורות תואמות.
--   (2) set local role anon; insert into public.rights_situation_map ... החזיר
--       row_count=1. הבדיקה בוטלה בכוונה ב-raise exception ולכן לא נשארה שורה
--       (נמדד אחרי: 24/888 כמו לפני), אבל השורה נכתבה בפועל.
--
-- למה RLS לא הגן: view אינו נושא RLS משל עצמו, והוא רץ בהרשאות בעליו (postgres,
-- שהוא גם הבעלים של הטבלאות שמתחת ולכן עוקף את ה-RLS שלהן). כלומר ה-RLS שדולק
-- על rights.* אינו רלוונטי לנתיב הזה כלל — ההרשאה על ה-view היא הדבר היחיד
-- שעומד בדרך.
--
-- מאיפה ההרשאה הגיעה, ולמה זה יקרה שוב: לא ממיגרציה כאן. 0002 העניק SELECT
-- בלבד (שורה 101). המקור הוא ברירת המחדל של Supabase על סכמת public —
-- pg_default_acl מחזיק arwdDxtm ל-anon ול-authenticated על כל טבלה חדשה,
-- ו-view נספר כטבלה לעניין הזה. כלומר **כל view עתידי ב-public ייוולד פתוח
-- לכתיבה**, ולטבלה רגילה זה בלתי-מזיק כי RLS חוסם — ל-view זה חור.
-- זה בדיוק הליקוי שנמצא ונסגר ב-0057 על bkalot_clone.rights_catalog; שם הוא
-- נתפס על view אחד בסכמה חדשה, כאן הוא על נתוני האמת החיים של הפלטפורמה.
--
-- מה לא נעשה כאן ובכוונה: לא נגענו ב-alter default privileges. שינוי גורף שם
-- משפיע גם על טבלאות עתידיות שנשענות על RLS כשכבת ההגנה שלהן, וזה שינוי רחב
-- שדורש סקירה נפרדת — לא תופעת לוואי של תיקון אבטחה. נרשם כפריט המשך.
--
-- למה לא security_invoker=on במקום revoke: ל-anon אין SELECT על rights.catalog
-- עצמה (role_table_grants מחזיר אפס שורות על rights.*), ולכן invoker היה מחזיר
-- permission denied לכל קורא — ההקשחה ה"נכונה" לכאורה הייתה שוברת את הקריאה
-- הציבורית של מערכת 10. אותה מסקנה בדיוק נרשמה ב-0057.
--
-- 🚫 אין נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud. אין DDL על הטבלאות שמתחת ואין שינוי נתונים — הרשאות בלבד.
--    SELECT נשמר במלואו: כל קורא ציבורי ממשיך לקרוא בדיוק כמו קודם.
--
-- הורצה בפועל 14/08 (עד אז הקובץ היה כתוב ולא-מורץ, וההרשאה נשארה פתוחה).
-- אחרי ההרצה, מדוד מול ה-REST החי עם מפתח ה-anon:
--   DELETE /rest/v1/rights_catalog?code=eq.<לא קיים>  ->  401  (לפני: 204)
--   DELETE/POST על שאר ה-views                        ->  401 42501 permission denied for view
--   GET על כל החמישה                                  ->  200, והספירות ללא שינוי (888/24/67/12/3)
-- ראיות: QA/platform/anon-write-on-public-views-0813/_results.json

revoke insert, update, delete, truncate, references, trigger
  on public.rights_catalog,
     public.rights_public,
     public.rights_situation_map,
     public.rights_meta_public,
     public.more30_automations
  from anon, authenticated;

-- SELECT מפורש ולא מונח: ה-revoke לעיל אינו נוגע בו, אבל הכתיבה כאן היא
-- ההצהרה שזו הרשאה מכוונת ולא שריד של ברירת מחדל.
grant select
  on public.rights_catalog,
     public.rights_public,
     public.rights_situation_map,
     public.rights_meta_public,
     public.more30_automations
  to anon, authenticated;

comment on view public.rights_catalog is
  'קריאה חיה מ-rights.catalog (888). SELECT בלבד ל-anon/authenticated — ראה 0059: view auto-updatable אינו נושא RLS.';
comment on view public.rights_situation_map is
  'קריאה חיה מ-rights.situation_map (24 מצבי חיים). SELECT בלבד ל-anon/authenticated — ראה 0059.';
comment on view public.rights_public is
  'rights.reference במצב verified. SELECT בלבד ל-anon/authenticated — ראה 0059.';
comment on view public.rights_meta_public is
  'rights.meta. SELECT בלבד ל-anon/authenticated — ראה 0059.';
comment on view public.more30_automations is
  'core.automations לקריאה. SELECT בלבד ל-anon/authenticated — ראה 0059 (0002 הקצה SELECT בלבד מלכתחילה).';
