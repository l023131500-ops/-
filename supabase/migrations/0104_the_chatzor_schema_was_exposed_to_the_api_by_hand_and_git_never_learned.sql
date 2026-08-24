-- 0104 — 16-chatzor-connect: חשיפת schema chatzor ל-PostgREST הוגדרה ביד, ולא ב-git

-- core.projects (מערכת 16) מסמנת פער מדויק: "חשיפת schema chatzor הוגדרה
-- ב-SQL (alter role authenticator) — כדאי לשקף אותה". נמדד חי על
-- uhnrgujbdxhhmoxcjria לפני כתיבת השורה הזאת:
--
--   select rolconfig from pg_roles where rolname='authenticator';
--   -- pgrst.db_schemas=public, graphql_public, nadlan, chatzor
--
-- ההגדרה כבר בתוקף בפרודקשן — 16-chatzor-connect ו-32-nadlan-berega תלויות
-- בה כדי לדבר עם ה-API ישירות על schema משלהן. אבל אף migration בתיקייה
-- הזאת לא כותבת אותה: list_migrations מראה ששתי הפעולות שהביאו אותה לעולם
-- (‏nadlan_expose_schema ב-15/07, chatzor_grants_and_expose_schema ב-29/07)
-- רצו ישירות מול הפרויקט ומעולם לא נשמרו לקובץ בריפו הזה. המשמעות בפועל:
-- אם הפרויקט אי-פעם ישוחזר מ-migrations בלבד (backup חדש, פרויקט branch,
-- disaster recovery), authenticator יחזור לברירת המחדל של Supabase
-- (‏public, graphql_public בלבד) ושתי המערכות ה-live יפסיקו לענות ב-API
-- בלי ששום שינוי קוד קרה — ואין קובץ אחד להריץ כדי להבין למה.
--
-- הפעולה כאן היא idempotent ואינה משנה התנהגות חיה: אותו ערך בדיוק שכבר
-- רץ, נכתב עכשיו גם כ-migration, כדי ש-git יהיה מקור-אמת שני ולא רק המסד.

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, nadlan, chatzor';
