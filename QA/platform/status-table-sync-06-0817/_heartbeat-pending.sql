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
'anti-drift sweep — SYSTEMS_STATUS.md summary table row for 06 בריאות (קופות חולים) synced to already-recorded Lighthouse/a11y results',
$$status-table-sync-06-0817 — אין שינוי קוד, אין מדידה חדשה. הרשומה המלאה
בראש SYSTEMS_STATUS.md (17/08, לילה, י) כבר תיעדה עבור 06: Lighthouse
perf 84, a11y 91→97, ושני תיקוני נגישות אמיתיים (label-content-name-mismatch
בכפתורי סגירה/קישורי כרטיס → aria-label תואם, aria-required-children
בצ'יפים → role="tab"+aria-selected). אבל שורת הטבלה המסכמת "## הטבלה"
בהמשך אותו קובץ החזיקה עדיין את ההערה הישנה "108 קישורים" בלבד, בלי
אף רמז לעבודה שכבר בוצעה ונפרסה — אותו דפוס דריפט בדיוק שתוקן בקומיט
הקודם (1f0fd05) עבור שורת 12. עודכנה שורת 06 להוסיף את תוצאות
ה-Lighthouse והתיקונים, תוך שמירת ההערה הקיימת "108 קישורים".

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס
שורות נכתבו בפועל בריצה הזו — אין גישת DB בכלל.$$,
'done',
$$commit 605a3ad on fix/nadlan-a11y, pushed. Small doc-sync fix: system 06's
top-of-file entry from an earlier session already recorded Lighthouse
perf 84 / a11y 91→97 and 2 real a11y fixes, but the separate summary
table row further down SYSTEMS_STATUS.md was never updated to match —
still showed only "108 קישורים" with no trace of the completed work.
Same drift pattern the previous commit (1f0fd05) fixed for row 12.
Synced row 06 to reference the recorded results, keeping the existing
link-count note. No new measurement, no code change, no deploy.
Joins the pending-heartbeat queue; run in commit order.$$
);
