-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה. זהו האחרון בתור נכון
-- לקומיט הזה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות: אימות סגירה של שכבה 1 (מקור מוגן לא נגע, 888 נמדד קודם)',
$$source-untouched-verify-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

סריקת ה-0058 (kind_invalid/source_invalid/situation_unknown/topic_no_invalid) + הפעימה
הקודמת (email_invalid/email_required_for_treatment/situation_required_for_treatment)
סגרו את כל ענפי הוולידציה של bkalot_clone_intake. הצעד הזה סוגר את שני סעיפי
האימות הנותרים מ-BKALOT_CLONE_BUILD.md שלא היה להם עד כה ראיה עצמאית משלהם
(רק אישורים משורשרים בתוך פעימות אחרות):

1. git diff -- apps/08-bkalut-app apps/09-bkalot-admin -> ריק (0 שורות). git log -1
   על אותם נתיבים -> d2ed6ce7 מ-17/07/2026, לפני תחילת עבודת השכפול (13/08) — אף
   קומיט בחלון 13/08-17/08 לא נגע במקור המוגן. 2 קבצים בלבד עוקבים שם
   (app.json, app.json) — רישום core.projects, לא קוד המקור החי.
2. מאגר הזכויות (888 נושאים) כבר נמדד עצמאית ב-13/08:
   QA/platform/anon-write-on-public-views-0813/_results.json — public.rights_catalog
   888/888 לפני ואחרי תיקון ההרשאה (0059). לא נמדד מחדש כאן, רק מצוין כסגור.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט, אפס
שורות נכתבו.

ראיות: QA/bkalot-clone/source-untouched-verify-0817/probe.txt.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב — אימות עצמאי, מחוץ לתור, של שני סעיפי
הקבלה מ-BKALOT_CLONE_BUILD.md שלא היו להם ראיה משלהם: מקור מוגן לא נגע (git diff
ריק, אין קומיט בחלון העבודה) ו-888 הנושאים כבר נמדדו קודם. סוגר את סבב האימות
של שכבה 1 (טופס הפנייה) ב-BKALOT_CLONE_BUILD.md. מצטרף לתור ה-heartbeat הממתין
ל-MCP; הרץ לפי סדר הקומיטים, לא לפי שם התיקייה.$$
);
