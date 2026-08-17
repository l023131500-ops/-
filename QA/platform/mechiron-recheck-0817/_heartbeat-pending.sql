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
'anti-drift sweep — SYSTEMS_STATUS.md "מה נשאר לתקן": 27 מחירון "צ''אטבוט 404" נבדק מחדש (רישום)',
$$mechiron-recheck-0817 — אין שינוי קוד. הטבלה קבעה
/mechiron/api/public/chatbot/config -> 404, "לא תיקנתי, דורש אימות מקור
הנתונים". git log על _deploy/mechiron-more30/api/index.ts מראה שהמסלול
כבר נוסף ונפרס ב-8a8d8db (03/08) — handler ל-public/chatbot/config שקורא
automation_configs.key='public_chatbot' דרך אותו לקוח anon שמסלול
ה-settings כבר משתמש בו. NEEDS_USER.md:1686 כבר תיעד את זה פעם אחת
("404 של הצ'אטבוט -> 0"), הטבלה כאן פשוט לא עודכנה. נבדק מול הייצור עם
cache-buster: GET .../chatbot/config -> 200,
{"enabled":false,"intro":"...","contact":{...}}. enabled:false הוא הערך
התקין המתועד בקוד (אין שורת automation_configs קריאה) — לא תקלה. עודכן
SYSTEMS_STATUS.md: רשומה חדשה בראש הקובץ + קו חוצה על שורת הטבלה של 27
מחירון. זה הפער השביעי מסוג הזה שנמצא מיושן ב-17/08.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס
שורות נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/mechiron-recheck-0817/probe-live.txt.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-measured a
stale "27 mechiron — chatbot config 404, not fixed" claim in
SYSTEMS_STATUS.md's remaining-work table against current production.
git log showed the route was already ported to the serverless deploy copy
and committed 2026-08-03 (8a8d8db); a live cache-busted GET returned 200
with enabled:false, the documented honest-default behavior when the
automation_configs row is absent/unreadable. No code change;
SYSTEMS_STATUS.md corrected (new dated entry + struck-through table cell).
Joins the pending-heartbeat queue; run in commit order.$$
);
