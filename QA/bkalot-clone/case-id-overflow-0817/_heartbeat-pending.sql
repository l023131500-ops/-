-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/​*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות: מדידת שער החריגה המספרית של /case בייצור',
$$case-id-overflow-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

המשך לסריקת 0814 שמדדה את שער החריגה המספרית (id בן 25 ספרות) על ארבעת
הנתיבים document/queue/dispatch/set-status — שם השער ברמת המסד (::bigint
cast) מחזיר *_not_found. case שונה בכוונה: bkalot_clone_admin_case מקבל
p_id bigint ישירות (לא p jsonb), כך ש-cast שגוי שם היה חוזר כ-400 גולמי
מ-PostgREST — בלתי ניתן להבחנה מנפילת שער אחרי שהרשת כותבת מחדש סטטוסים
ל-400. הערת הקוד (bkalot-clone-admin/index.ts:403-405) אומרת שהבדיקה נעשית
לכן בפונקציית הקצה עצמה, לפני קריאת ה-RPC — זה מעולם לא נמדד מול הייצור עם
id שחורג בפועל (admin-http-0813 בדק רק ריק/"abc"/99999).

כניסה עם l023131500@gmail.com + STD_ADMIN_PASSWORD (ROUTES: login), ואז POST
ל-/case עם id בן 25 ספרות: HTTP 200, {"ok":false,"error":"case_id_required"} —
בדיוק כפי שהערת הקוד טוענת, וקוד שונה מ-case_not_found שחוזר על id:99999
הבקר. אין שינוי קוד, אין מיגרציה, אין פריסה.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט,
אפס שורות, אפס הודעות יוצאות, הסשן נסגר (logout) בסוף הבדיקה.

זה סוגר את הנתיב האחד עם id מספרי שסריקת 0814 לא כיסתה — כל חמשת נתיבי ה-id
של bkalot-clone-admin נמדדו כעת מול חריגה מספרית.

ראיות: QA/bkalot-clone/case-id-overflow-0817/probe-live.txt.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב — שער החריגה המספרית של /case נמדד
לראשונה מול הייצור: HTTP 200/case_id_required, שונה מ-case_not_found. אין
שינוי קוד. מצטרף לתור ה-heartbeat הממתין ל-MCP; הרץ לפי סדר הקומיטים, לא
לפי שם התיקייה.$$
);
