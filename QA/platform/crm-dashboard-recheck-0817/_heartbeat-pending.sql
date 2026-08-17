-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), and no SUPABASE_ACCESS_TOKEN/SB_PAT
-- is set in process, user or machine scope, so the Management API bootstrap
-- is out too (heartbeat-needs-mcp-anon-key-cannot). core.run_progress is not
-- reachable from here by any route.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift sweep — SYSTEMS_STATUS.md "30 CRM זכויות: dashboard אחרי כניסה לא נבדק" — נבדק עכשיו',
$$crm-dashboard-recheck-0817 — אין שינוי קוד. הרשומה מ-17/08 (index-route
recheck) בדקה רק /crm ו-/crm/auth והשאירה במפורש "dashboard אחרי כניסה לא
נבדק" — הפער המקורי טען React #418 (hydration mismatch) ספציפית על
הדשבורד. נבדק עכשיו עם Playwright, 1280x900, נגד הייצור: התחברות עם משתמש
הבדיקה (test@more30.com / More30Test2026, מפרויקט jhbeelzvjvhnkxldqvxx לפי
LOGINS.md) -> ניתוב אמיתי ל-/crm/dashboard, כותרת "לוח בקרה | זכויות פרו",
ניווט צד עם 10 מסלולים אמיתיים, כרטיסי סטטיסטיקה עם נתוני אמת (לקוחות
חדשים החודש: 1, משורת QA קודמת מ-12.8.2026), לוח קנבן הפניות עם 5 עמודות
אמיתיות (נשלח/ממתין/בטיפול/הושלם/נדחה), ו-0 שגיאות/אזהרות קונסולה מתחילת
הניווט (הודעה יחידה: טוסט "התחברת בהצלחה" של האפליקציה עצמה). אין
hydration mismatch, אין מסך שבור מאחורי 200. עודכן SYSTEMS_STATUS.md: רשומה
מתוארכת חדשה בראש הקובץ + שורת הטבלה "מה נשאר לתקן" תוקנה.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס
שורות נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/crm-dashboard-recheck-0817/README.md +
crm-dashboard-recheck-0817.png.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: closed the one
explicitly-unverified clause left in today's CRM/gesher index-route
recheck — the dashboard screen after a real login, which the original open
item (React #418 hydration mismatch) was actually about, not the
index/auth route already cleared. Logged in as the standard test customer
against production https://more30.com/crm/auth, landed on
/crm/dashboard with real data (client counts, referrals kanban, recent
activity) and zero console errors/warnings. No code change; SYSTEMS_STATUS.md
corrected (new dated entry + the CRM row in "מה נשאר לתקן" updated). Joins
the pending-heartbeat queue; run in commit order.$$
);
