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
'anti-drift sweep — SYSTEMS_STATUS.md summary table row for 27 מחירון synced to today''s recheck',
$$status-table-sync-0817 — אין שינוי קוד, אין מדידה חדשה. commit ec6a51c
(הריצה הקודמת) תיקן את הממצא על 27 מחירון ברשומה חדשה בראש
SYSTEMS_STATUS.md, אבל טבלת הסיכום "## הטבלה" בהמשך אותו קובץ החזיקה
עותק שני, נפרד, של אותה טענה מיושנת: שורה 27 עדיין ⚠️ חלקית / ❌ 1 נכס /
"הצ'אטבוט לא נטען". שני המקומות לא סונכרנו כשהרשומה הראשונה נכתבה. עודכנה
שורת 27 ל-✅ עובדת עם הפניה לרשומה שמעל, ושורת הסיכום "25 עובדות במלואן
· 1 חלקית · 0 שבורות" ל-"26 · 0 חלקית · 0 שבורות". הראיה היא אותה ראיה
שכבר תועדה ב-QA/platform/mechiron-recheck-0817/probe-live.txt — לא נדרשה
בדיקה חדשה מול הייצור.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס
שורות נכתבו בפועל בריצה הזו — אין גישת DB בכלל.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Small doc-sync fix: today's earlier
recheck (ec6a51c chain) corrected the dated entry at the top of
SYSTEMS_STATUS.md for system 27 (mechiron chatbot config: 404 claim was
stale, live is 200) but left a second, separate summary table further
down the same file still showing the old ⚠️ partial / 1 broken-asset
status. Synced the table row and the file's aggregate count line to
match the already-verified finding. No new measurement, no code change,
no deploy. Joins the pending-heartbeat queue; run in commit order.$$
);
