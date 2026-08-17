-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/​*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): מדידת kind_invalid בייצור',
$$kind-invalid-live-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

אחרי סגירת topic_no_invalid ו-situation_unknown, נבדקה הבדיקה הראשונה ב-0058:
kind_invalid (שורות 79-82) מעולם לא נמדדה מול הפונקציה הפרוסה בייצור.

בקשת POST ישירה אל bkalot-clone-intake (PowerShell, עוקפת את קבוצת ה-radio
של הטופס), kind="not_a_real_kind_xyz": HTTP 200, error=kind_invalid,
allowed=3 ערכים (info, reminder, treatment) — זהים מילה-במילה לשלוש
האפשרויות ב-radiogroup בלקוח (index.html:154,158,162). הענף חסום מבנית
מהטופס הגלוי: אין רביעית אפשרות ואין קלט חופשי, וכבר מתועד ככזה בהערת
הלקוח עצמה (index.html:340-341).

ל-kind_invalid אין ערך ב-CODE_FIELD בכוונה (אינו שדה מוקלד). MESSAGES.kind_invalid
כבר קיים ונכון בלקוח — לא נדרש שינוי קוד, רק מדידה שסוגרת את הפער.

נקרא במפורש ב-0058: זו הבדיקה הראשונה בפונקציה, חוזרת לפני כל בדיקה אחרת
ולפני ה-insert לטבלאות contacts/cases — הבקשה לא כתבה שורה.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט,
אפס שורות, אפס הודעות יוצאות.

עדיין פתוח מאותה סריקה: source_invalid (0058 שורות 84-87) — לצעד הבא.

ראיות: QA/bkalot-clone/kind-invalid-live-0817/probe-live.txt.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — סגירת פער נוסף מאותה
משפחה כמו topic_no_invalid/situation_unknown: kind_invalid נמדד לראשונה מול
הייצור, HTTP 200/kind_invalid, allowed תואם מילה-במילה לשלוש אפשרויות
ה-radio בלקוח. אין שינוי קוד. מצטרף לתור ה-heartbeat הממתין ל-MCP; הרץ לפי
סדר הקומיטים, לא לפי שם התיקייה.$$
);
