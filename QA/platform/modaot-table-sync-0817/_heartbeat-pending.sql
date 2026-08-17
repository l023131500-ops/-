-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here. Joins the existing queue (see QA/*/*-0817/
-- _heartbeat-pending.sql for the full list) — run all pending files in
-- git-log commit order, not folder-name order. Delete each file once its
-- row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift sweep — SYSTEMS_STATUS.md "## הטבלה" summary table: 03 מודעות note synced to already-closed status',
$$modaot-table-sync-0817 — commit 2abfa77 (04:50, 17/08) already re-measured
/modaot (scripts/qa/platform-audit.mjs, desktop+mobile+dark) and found
smallTargets: [] in all three states, then closed the claim in the
"מה נשאר לתקן" table (line ~3684: "נבדק מחדש 17/08 — אינו פער פעיל") — but
never touched the separate "## הטבלה" summary table a few hundred lines
above it, which still carried the stale note "3 יעדי מגע < 24px" verbatim.
Same drift pattern already fixed today for 27 מחירון and 36 tivuch (two
copies of one claim in the same file, one updated and one left stale).

No new measurement taken — the evidence already exists at
QA/platform/touch-target-recheck-0817/_results.json (smallTargets: [] in
all three states, interactiveCount: 8). Updated the note column on the 03
row of the "## הטבלה" table to match the already-closed status. No app
code changed, no deploy performed — documentation-accuracy fix only.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס שורות
נכתבו בפועל בריצה הזו — אין גישת DB בכלל.$$,
'done',
$$commit on fix/nadlan-a11y, pushed. Docs-only change, real data (cited
against QA/platform/touch-target-recheck-0817/_results.json, already
committed in 2abfa77). No protected system touched. Joins the
pending-heartbeat queue; run in commit order with the others.$$
);
