-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/​*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): מדידת source_invalid בייצור',
$$source-invalid-live-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

אחרי סגירת kind_invalid/topic_no_invalid/situation_unknown, נבדקה הבדיקה
האחרונה שנשארה פתוחה מאותה סריקת 0058 שורה-שורה: source_invalid (שורות 84-87)
מעולם לא נמדדה מול הפונקציה הפרוסה בייצור.

בקשת POST ישירה אל bkalot-clone-intake (PowerShell), source="not_a_real_source_xyz":
HTTP 200, error=source_invalid, allowed=5 ערכים (form, yemot, nedarim, ai, admin) —
זהים מילה-במילה לרשימה ב-0058 שורה 84. הענף חסום מבנית מהטופס הגלוי: הלקוח
שולח תמיד source: "form" קבוע (index.html:541), אין שדה או בחירה שמאפשרים
ערך אחר — בדיוק כמו kind_invalid.

ל-source_invalid אין ערך ב-CODE_FIELD בכוונה, כפי שהערת הלקוח עצמה כבר אומרת
(index.html:340-341: kind_invalid ו-source_invalid אינם שם — אין להם שדה
מוקלד). MESSAGES.source_invalid כבר קיים ונכון בלקוח — לא נדרש שינוי קוד,
רק מדידה.

נקרא במפורש ב-0058: הבדיקה חוזרת לפני ה-insert לטבלאות contacts/cases —
הבקשה לא כתבה שורה.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט,
אפס שורות, אפס הודעות יוצאות.

זה סוגר את כל ארבעת הבדיקות ב-0058 שנסרקו שורה-שורה (kind_invalid,
source_invalid, situation_unknown, topic_no_invalid) — כולן נמדדו כעת מול
הייצור, וכולן HTTP 200 עם קוד שגיאה מובנה תואם ללקוח. אין פער פתוח נוסף
מאותה סריקה.

ראיות: QA/bkalot-clone/source-invalid-live-0817/probe-live.txt.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — סגירת הפער האחרון מסריקת
0058: source_invalid נמדד לראשונה מול הייצור, HTTP 200/source_invalid,
allowed תואם מילה-במילה ל-0058 שורה 84. אין שינוי קוד. מצטרף לתור
ה-heartbeat הממתין ל-MCP; הרץ לפי סדר הקומיטים, לא לפי שם התיקייה.$$
);
