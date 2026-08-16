-- heartbeat עשירי שלא נכתב, מאותה סיבה של התשעה שלפניו: ה-MCP של Supabase אינו
-- מחובר לסשן הזה (חיפוש כלים החזיר אפס התאמות), ו-core.run_progress אינה נגישה
-- מכאן בשום מסלול אחר.
--
-- סדר ההרצה — עשרה קבצים, לפי סדר הקומיטים:
--    1. QA/bkalot-clone/case-hit-row-deploy-0817/_heartbeat-pending.sql
--    2. QA/platform/allowlist-recheck-0817/_heartbeat-pending.sql
--    3. QA/bkalot-clone/which-field-0817/_heartbeat-pending.sql
--    4. QA/bkalot-clone/which-field-deploy-0817/_heartbeat-pending.sql
--    5. QA/bkalot-clone/invalid-visible-0817/_heartbeat-pending.sql
--    6. QA/bkalot-clone/invalid-visible-deploy-0817/_heartbeat-pending.sql
--    7. QA/bkalot-clone/stale-mark-0817/_heartbeat-pending.sql
--    8. QA/bkalot-clone/stale-mark-deploy-0817/_heartbeat-pending.sql
--    9. QA/platform/design-standard-merge-0817/_heartbeat-pending.sql
--   10. הקובץ הזה
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את התיקון כמוקדם
--    לבעיה שיצרה את הצורך בו. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'תחזוקה — מיזוג מסמכי תכנון שהצטברו בעץ העבודה',
$$commit f1a5689 (הקודם) בדק את RUN_INSTRUCTIONS.md, more30-priority.md,
NADLAN_SPEC_V2.md, QA/kupot ו-apps/_archive/lux-manage/leads-api ומצא שהם
לא-מחויבים ולא אומתו, והשאיר אותם לעץ העבודה. בסבב הזה קראתי את שלושת
הראשונים במלואם: כולם מסמכי תכנון/הנחיה טהורים (RUN_INSTRUCTIONS.md — הבהרת
חריג הקריאה ל-08/09; more30-priority.md — תוספות §0.2/§0.3/§1א-1ג/§1בב(+)(++)
וכלל אנטי-דריפט שכבר צוטטו/יושמו בקומיטים קודמים; NADLAN_SPEC_V2.md — §12
ספק עתידי לתכנון/בנייה באזור נכס, פרימיום/VIP, טרם מומש). אין בהם קוד, סכימה
או פריסה, ולכן אין מה לצלם כדי לאמת — מוזגו כפי שהם.

לא נכללו (עדיין דורשים אימות חי): QA/kupot/_flow.json + 3 תמונות (אורך
הפירוט ירד 2307→350 בשלוש שורות זהות — צריך לבדוק מול קופ"ח מאוחדת לפני
שמניחים רגרסיה אמיתית ולא שינוי בסקריפט הבדיקה עצמו), ו-
apps/_archive/lux-manage/supabase/functions/leads-api/index.ts (שכפור
סגנוני בלבד בתיקיית _archive, לא פעיל).

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.$$,
'done',
$$commit e46d543 על fix/nadlan-a11y, pushed. מיזג שלושה מסמכי תכנון
לא-מחויבים (RUN_INSTRUCTIONS.md, more30-priority.md, NADLAN_SPEC_V2.md).
אין שינוי קוד/מיגרציה/פריסה — תיקון מסמכים בלבד. QA/kupot ו-lux-manage
נשארים בעץ העבודה לסבב הבא, דורשים אימות חי לפני קומיט. ⚠️ עשירי בתור —
להריץ אחרי תשעת הקבצים שלפניו, בסדר הקומיטים.$$
);
