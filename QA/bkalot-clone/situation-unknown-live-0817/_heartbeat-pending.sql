-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/​*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): מדידת situation_unknown בייצור',
$$situation-unknown-live-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

אחרי סגירת הפער topic_no_invalid (f2bc4e6), נקראו שאר ענפי האימות ב-0058
שורה-שורה מול MESSAGES/CODE_FIELD בלקוח. situation_unknown (0058 שורות
118-121) מעולם לא נמדד מול הפונקציה הפרוסה בייצור.

בקשת POST ישירה אל bkalot-clone-intake (PowerShell, עוקפת את ה-<select> של
הטופס), kind=treatment, situation="not_a_real_situation_xyz": HTTP 200,
error=situation_unknown, allowed=24 ערכים. אותם 24 ערכים בדיוק מופיעים
ב-<select id="situation"> של הלקוח (index.html:252-277) — זו הסיבה שהענף
אינו נגיש מהטופס הגלוי, בדיוק כמו topic_no_invalid לפני שכך.

בשונה מ-topic_no_invalid: MESSAGES.situation_unknown ו-CODE_FIELD.situation_unknown
כבר קיימים בלקוח ונכונים — לא נדרש שינוי קוד, רק מדידה שסוגרת את הפער.

נקרא במפורש ב-0058: הבדיקה חוזרת לפני ה-insert לטבלאות contacts/cases —
הבקשה לא כתבה שורה.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט,
אפס שורות, אפס הודעות יוצאות.

ראיות: QA/bkalot-clone/situation-unknown-live-0817/probe-live.txt.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — סגירת פער נוסף מאותה
משפחה כמו topic_no_invalid: situation_unknown נמדד לראשונה מול הייצור,
HTTP 200/situation_unknown, allowed תואם מילה-במילה לרשימת ה-<select>
בלקוח. אין שינוי קוד — MESSAGES/CODE_FIELD כבר נכונים. מצטרף לתור
ה-heartbeat הממתין ל-MCP; הרץ לפי סדר הקומיטים, לא לפי שם התיקייה.$$
);
