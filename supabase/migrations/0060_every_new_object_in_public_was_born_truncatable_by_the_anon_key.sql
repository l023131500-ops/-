-- 0060 — כל אובייקט חדש ב-public נולד עם TRUNCATE ל-anon, ו-RLS אינו בודק TRUNCATE
--
-- זהו הפריט הפתוח ש-0059 השאיר במפורש (שורות 33–35): «לא נגענו ב-alter default
-- privileges ... נרשם כפריט המשך». 0059 סגר חמישה views קיימים. המקור שיצר
-- אותם — pg_default_acl של סכמת public — נשאר כפי שהיה, ולכן כל טבלה ו-view
-- שייווצרו מחר נולדים באותה פתיחות בדיוק.
--
-- מה נמדד (14/08, לפני השינוי), על טבלת בדיקה שנוצרה בדיוק כמו כל טבלה חדשה
-- (create table public._priv_probe_0060 ... ), עם RLS דלוק ואפס policies —
-- כלומר מצב ההגנה המקסימלי שטבלה יכולה להיות בו:
--
--   anon DELETE   -> עבר בלי שגיאה, rows_deleted=0   (RLS חסם — ההגנה עבדה)
--   anon TRUNCATE -> SUCCEEDED, rows_left=0          (RLS לא נבדק כלל)
--
-- זו הנקודה: ב-Postgres, RLS חל על SELECT/INSERT/UPDATE/DELETE ואינו חל על
-- TRUNCATE. לכן הטענה «ב-public זה בלתי-מזיק כי RLS חוסם» — שנרשמה ב-0059
-- שורה 29 — נכונה ל-DELETE ולא נכונה ל-TRUNCATE. מפתח ה-anon, שגלוי בקוד המקור
-- של כל עמוד פורטל, החזיק את היכולת לרוקן כל טבלה עתידית ב-public ללא תלות
-- בשום policy.
--
-- ומדידה שנייה, על view: create view public._priv_probe_0060_v נולד עם
-- DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE ל-anon — בדיוק
-- ההרשאות שחמשת ה-views של 0059 החזיקו. כלומר 0059 היה תיקון של תוצאה.
--
-- מה משתנה כאן, ומה בכוונה לא:
--   anon:          נשללים DELETE, TRUNCATE, REFERENCES, TRIGGER.
--                  נשמרים SELECT, INSERT, UPDATE — הם ה-RLS-gated האמיתיים,
--                  ושלילתם הייתה שוברת כל טבלה עתידית שנשענת על policy.
--   authenticated: נשלל TRUNCATE בלבד, מאותו נימוק — RLS אינו בודק אותו.
--                  DELETE נשאר: «משתמש מוחק שורה של עצמו» הוא דפוס לגיטימי
--                  ש-policy חוסמת כראוי.
--   service_role:  ללא שינוי.
--
-- ההשפעה היא על אובייקטים עתידיים בלבד. pg_default_acl אינו נוגע בשום טבלה או
-- view קיימים, ולכן שום מערכת חיה אינה משנה התנהגות בעקבות המיגרציה הזו.
--
-- 🚫 אין נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות
--    csj/csj_src/igud — אלה גם אינם ב-public. אין DDL ואין שינוי נתונים.
--
-- הורצה בפועל 14/08 (apply_migration). אחרי ההרצה, אותה בדיקה בדיוק:
--   anon DELETE   -> 42501 permission denied   (לפני: עבר, 0 שורות)
--   anon TRUNCATE -> 42501 permission denied   (לפני: SUCCEEDED)
--   rows_left=3                                (לפני: 0)
--   טבלה חדשה ו-view חדש ב-public: anon = INSERT,SELECT,UPDATE בלבד
-- ראיות: QA/platform/public-default-privileges-0814/_results.json

alter default privileges in schema public
  revoke delete, truncate, references, trigger on tables from anon;

alter default privileges in schema public
  revoke truncate on tables from authenticated;

-- ה-pg_default_acl של public מוחזק בשני grantor-ים: postgres (שתי השורות לעיל)
-- ו-supabase_admin. הרצת ה-alter עבור השני דורשת חברות בתפקיד, ו-postgres כאן
-- אינו superuser. מנוסה בתוך בלוק כדי שהתוצאה תירשם ולא תפיל את המיגרציה.
-- נמדד בפועל: 42501 permission denied to change default privileges — כלומר
-- אובייקטים שנוצרים ב-public על-ידי supabase_admin (בעיקר תוצרי extensions)
-- עדיין נולדים arwdDxtm ל-anon. נרשם כפריט פתוח; אינו ניתן לסגירה מכאן.
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public
             revoke delete, truncate, references, trigger on tables from anon';
  execute 'alter default privileges for role supabase_admin in schema public
             revoke truncate on tables from authenticated';
  raise notice '0060: supabase_admin default privileges tightened too';
exception when others then
  raise notice '0060: supabase_admin default privileges NOT changed (%): %', sqlstate, sqlerrm;
end $$;
