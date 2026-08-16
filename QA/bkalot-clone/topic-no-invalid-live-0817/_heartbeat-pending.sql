-- heartbeat תשיעי שלא נכתב, מאותה סיבה של השמונה שלפניו: ה-MCP של Supabase
-- אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס התאמות), ו-core.run_progress
-- אינה נגישה מכאן בשום מסלול אחר.
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
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את המדידה כמוקדמת
--    לתיקון שהיא בודקת. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): מדידת topic_no_invalid בייצור',
$$topic-no-invalid-live-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

הפעימה הקודמת (8e8bce4) השאירה פתוח: ענף topic_no_invalid מהשרת עדיין לא נמדד
בייצור, כי ה-preflight בטופס חוסם כל ערך שהשרת היה פוסל לפני שהוא נשלח.

שתי בקשות POST ישירות אל bkalot-clone-intake (PowerShell, עוקף preflight),
kind=treatment, situation=young_single: topic_no="9999999999" (גדול מגבול
integer) ו-topic_no="12ab" (אינו ספרות). שתיהן HTTP 200, error=topic_no_invalid,
detail זהה מילה במילה לשתי הודעות whyTopicNoInvalid בלקוח. לא 502 עם SQLSTATE
מודלף — זו הייתה ההתנהגות לפני 0080. MESSAGES.topic_no_invalid כבר קיים בלקוח.

נקרא במפורש ב-0080: שני התנאים חוזרים לפני ה-insert לטבלאות contacts/cases —
אף בקשה לא כתבה שורה.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט,
אפס שורות, אפס הודעות יוצאות.

ראיות: QA/bkalot-clone/topic-no-invalid-live-0817/probe-live.txt.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — סגירת הפער "topic_no_invalid
לא נמדד בייצור" שנפתח ב-8e8bce4 ובהערת הזנב של 0080 עצמה. שתי בקשות ישירות
לעקוף preflight, שתיהן HTTP 200/topic_no_invalid עם detail תואם ללקוח, אפס
כתיבה למסד. ⚠️ תשיעי בתור — להריץ אחרי שמונת הקבצים שלפניו, בסדר הקומיטים.$$
);
