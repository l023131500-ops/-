-- heartbeat תשיעי שלא נכתב, מאותה סיבה של השמונה שלפניו: ה-MCP של Supabase אינו
-- מחובר לסשן הזה (חיפוש כלים החזיר אפס התאמות), ו-core.run_progress אינה נגישה
-- מכאן בשום מסלול אחר.
--
-- סדר ההרצה — תשעה קבצים, לפי סדר הקומיטים:
--    1. QA/bkalot-clone/case-hit-row-deploy-0817/_heartbeat-pending.sql
--    2. QA/platform/allowlist-recheck-0817/_heartbeat-pending.sql
--    3. QA/bkalot-clone/which-field-0817/_heartbeat-pending.sql
--    4. QA/bkalot-clone/which-field-deploy-0817/_heartbeat-pending.sql
--    5. QA/bkalot-clone/invalid-visible-0817/_heartbeat-pending.sql
--    6. QA/bkalot-clone/invalid-visible-deploy-0817/_heartbeat-pending.sql
--    7. QA/bkalot-clone/stale-mark-0817/_heartbeat-pending.sql
--    8. QA/bkalot-clone/stale-mark-deploy-0817/_heartbeat-pending.sql
--    9. הקובץ הזה
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את התיקון כמוקדם
--    לבעיה שיצרה את הצורך בו. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'תחזוקה — DESIGN_STANDARD.md: תיקון מיזוג שהיה מוחק את הבסיס הנמדד',
$$נמצא בתחילת הסבב: DESIGN_STANDARD.md בעץ העבודה (לא-מחויב) היה גרסה שונה
לגמרי מ-HEAD — לא תוספת אלא החלפה מלאה במדריך גנרי בלי מספור §, בלי טבלת
הצבעים של הפלטפורמה, ובלי §3 (מצב כהה) שאליו scripts/qa/platform-audit.mjs
מפנה במפורש בהערת קוד. היה גם DESIGN_STANDARD_ADDENDUM.md לא-במעקב, שכותרתו
אומרת "להוסיף ל-DESIGN_STANDARD.md. הבסיס הקיים מצוין" — כלומר הכוונה
המקורית הייתה מיזוג, לא החלפה, וההחלפה שעל הדיסק הייתה שגויה.

תיקון: git checkout -- DESIGN_STANDARD.md (שחזור ל-HEAD, §0–§11 ללא שינוי)
+ הוספת §12–§16 עם התוכן החדש והלא-כפול מהתוספת (טיפוגרפיה עברית מעודנת,
CRO, DNA משפחתי, מדידת אירועי המרה, microcopy לטפסים). דילגתי על ביצועים/
SEO/נגישות-חוק — כבר מכוסים ונמדדים ב-§6–§8. הקובץ הישן נמחק אחרי המיזוג.

לא נגעתי בשאר הקבצים המלוכלכים שהיו בעץ העבודה (RUN_INSTRUCTIONS.md,
more30-priority.md, NADLAN_SPEC_V2.md, QA/kupot, apps/_archive/lux-manage
leads-api) — נראים כעבודה נפרדת ולגיטימית אך לא אומתו (בדיקה+צילום) בסבב
הזה, ולכן לא נכללו בקומיט. נשארים בעץ העבודה לסבב הבא.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.$$,
'done',
$$commit f1a5689 על fix/nadlan-a11y, pushed. תוקן ניסיון-מיזוג שגוי של
DESIGN_STANDARD_ADDENDUM.md שהיה מוחק את הבסיס הנמדד של DESIGN_STANDARD.md
(כולל §3 שסקריפט platform-audit.mjs מפנה אליו ישירות). המסמך המקורי §0–§11
שוחזר במלואו; §12–§16 נוספו עם התוכן הלא-כפול מהתוספת. קובץ התוספת נמחק.
אין שינוי קוד/מיגרציה/פריסה — תיקון מסמך בלבד. ⚠️ תשיעי בתור — להריץ אחרי
שמונת הקבצים שלפניו, בסדר הקומיטים.$$
);
