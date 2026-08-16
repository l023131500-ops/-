-- heartbeat אחד-עשר שלא נכתב, מאותה סיבה של העשרה שלפניו: ה-MCP של Supabase
-- אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס התאמות), ו-core.run_progress
-- אינה נגישה מכאן בשום מסלול אחר.
--
-- סדר ההרצה — אחד-עשר קבצים, לפי סדר הקומיטים:
--    1. QA/bkalot-clone/case-hit-row-deploy-0817/_heartbeat-pending.sql
--    2. QA/platform/allowlist-recheck-0817/_heartbeat-pending.sql
--    3. QA/bkalot-clone/which-field-0817/_heartbeat-pending.sql
--    4. QA/bkalot-clone/which-field-deploy-0817/_heartbeat-pending.sql
--    5. QA/bkalot-clone/invalid-visible-0817/_heartbeat-pending.sql
--    6. QA/bkalot-clone/invalid-visible-deploy-0817/_heartbeat-pending.sql
--    7. QA/bkalot-clone/stale-mark-0817/_heartbeat-pending.sql
--    8. QA/bkalot-clone/stale-mark-deploy-0817/_heartbeat-pending.sql
--    9. QA/platform/design-standard-merge-0817/_heartbeat-pending.sql
--   10. QA/platform/commit-msg-0817-docs/_heartbeat-pending.sql
--   11. הקובץ הזה
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את התיקון כמוקדם
--    לבעיה שיצרה את הצורך בו. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'תחזוקה — ניקוי עץ העבודה: שינוי סגנוני ב-lux-manage leads-api',
$$commit 97d51de (הקודם) מיזג שלושה מסמכי תכנון והשאיר בעץ העבודה שני קבצים
שדרשו אימות: QA/kupot (תמונות/flow) ו-apps/_archive/lux-manage leads-api.
בסבב הזה קראתי את השני במלואו, לפני ואחרי: readerGate() הוחלף בשם
checkReaderAuth(), עיצוב Response פוצל לשורות, הערת בלוק הוחלפה בהערה קצרה,
וסדר הכותרות ב-corsHeaders זז. שום תנאי לוגי לא השתנה — provided !== expected
שקול ל-presented !== expected (expected כבר אומת שאינו ריק קודם). התיקייה
apps/_archive/lux-manage אינה פרויקט פרוס (אין build/dev-server/URL חי),
ולכן אין צילום מסך לצרף — קריאת ההבדל היא כל האימות האפשרי כאן.

QA/kupot (3 תמונות + _flow.json) עדיין לא נכלל: דורש בדיקה חיה מול קופת חולים
מאוחדת לפני שמניחים רגרסיה אמיתית ולא שינוי בסקריפט הבדיקה עצמו — נשאר
בעץ העבודה לסבב הבא.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.$$,
'done',
$$commit ffd6e69 על fix/nadlan-a11y, pushed. קומיט קובץ סגנוני יחיד
(apps/_archive/lux-manage leads-api), ללא שינוי לוגי, בתיקיית ארכיון לא-
פעילה. QA/kupot נשאר בעץ העבודה, דורש אימות חי לפני קומיט. ⚠️ אחד-עשר
בתור — להריץ אחרי עשרת הקבצים שלפניו, בסדר הקומיטים.$$
);
