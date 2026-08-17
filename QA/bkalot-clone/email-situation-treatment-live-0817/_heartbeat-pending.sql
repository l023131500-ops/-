-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה. זהו האחרון בתור נכון
-- לקומיט הזה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): email_invalid + email/situation_required_for_treatment נמדדו בייצור',
$$email-situation-treatment-live-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

רשומת ה-0058-scan מ-17/08 (kind_invalid/source_invalid/situation_unknown/topic_no_invalid)
הצהירה "אין פער פתוח נוסף" — הצהרה שהייתה נכונה רק לארבעת הענפים שנקראה
עליהם, לא לכל הענפים בפונקציה. phone_invalid/full_name_required נמדדו
בנפרד (stale-mark/which-field). שלושה ענפים נשארו בלי מדידה חיה:
email_invalid (0058:105-106), email_required_for_treatment (0058:112-113),
situation_required_for_treatment (0058:115-116).

שלוש בקשות POST ישירות אל bkalot-clone-intake (PowerShell, עוקף preflight +
type="email"/required בטופס): (A) kind=info, email="not-an-email" →
email_invalid; (B) kind=treatment, בלי שדה email כלל → email_required_for_treatment
(מאשר בייצור שבדיקת email_invalid רק יורה כש-v_email אינו null); (C) kind=treatment,
email תקין, בלי situation → situation_required_for_treatment. שלושתן HTTP 200
עם קוד שגיאה מובנה תואם מילה-במילה ל-MESSAGES/CODE_FIELD בלקוח.

נקרא במפורש: כל שלושת התנאים ב-0058 חוזרים לפני ה-insert ל-bkalot_auto.contacts
(שורה 146) ול-bkalot_clone.cases (שורה 154) — אפס שורות נכתבו.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט,
אפס שורות, אפס הודעות יוצאות.

ראיות: QA/bkalot-clone/email-situation-treatment-live-0817/probe-live.txt.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — סוגר את שלושת הענפים
היחידים מ-0058 שנשארו בלי מדידה חיה אחרי סריקת 17/08 (שהצהירה "אין פער" מוקדם
מדי). שלוש בקשות ישירות, שלושתן HTTP 200 עם קוד תואם ללקוח, אפס כתיבה למסד.
מצטרף לתור ה-heartbeat הממתין ל-MCP; הרץ לפי סדר הקומיטים, לא לפי שם התיקייה.$$
);
