-- heartbeat שנים-עשר שלא נכתב, מאותה סיבה של האחד-עשר שלפניו: ה-MCP של
-- Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס התאמות), ו-
-- core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- סדר ההרצה — שנים-עשר קבצים, לפי סדר הקומיטים:
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
--   11. QA/platform/leads-api-cleanup-0817/_heartbeat-pending.sql
--   12. הקובץ הזה
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את התיקון כמוקדם
--    לבעיה שיצרה את הצורך בו. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'28 קופות — פירוט השוואת הכיסוי בין הקופות היה ריק בייצור לכל נושא',
$$QA/kupot/_flow.json (מבוסס kupot-flow.mjs, נכתב 02/08) עמד בעץ העבודה עם
detail.len שירד מ-2,307 ל-350 תווים, אותו sample בהתחלה. הרצה חוזרת מול
הייצור שיחזרה 350 (לא רעש חד-פעמי), ו-GET more30.com/kupot/api/hf/topics/501
(ועוד שניים) אימת fundDetails:null בכל נושא — הכרטיס הפתוח הציג רק את הנפילה
הקצרה במקום טבלת ההשוואה, על 435 נושאי שב"ן.

שורש: server/fund-details.ts קורא hf_fund_details.json (1MB) מ-process.cwd()
בזמן ריצה; vercel.json (מקור ב-apps/28-kupot-health-funds וגם עותק הפריסה
_deploy/kupot-more30) הצר את functions.api/index.js.includeFiles ל-
"hf_data_export.json" בלבד — כנראה בסבב הפריסה של 10/08. שכבת עבודה ישנה
(_deploy/kupot2, לא נמחקה) עדיין החזיקה את התבנית התקינה
{hf_data_export.json,hf_fund_details.json} — משם אושר מה השתנה.

תוקן: includeFiles הוחזר לזוג הקבצים בשני ה-vercel.json,
hf_fund_details.json הועתק לתוך _deploy/kupot-more30, ונפרס
vercel deploy --prod (kupot-more30, dpl_8Z2gyuNQtVnA73uyPbGnd3FEFDyx).

אומת אחרי הפריסה: GET .../api/hf/topics/501 מחזיר fundDetails עם ארבע
הקופות; kupot-flow.mjs מחזיר detail.len 2307 בשלושת המצבים (light/dark/
mobile) — תואם בדיוק את הבסיס מ-02/08, 0 diff מול QA/kupot/_flow.json
שכבר בקומיט. עודכן SYSTEMS_STATUS.md.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.$$,
'done',
$$נפרס ואומת חי ב-17/08/2026. Commit ל-fix/nadlan-a11y, pushed. שנים-עשר
בתור — להריץ אחרי אחד-עשר הקבצים שלפניו, בסדר הקומיטים.$$
);
