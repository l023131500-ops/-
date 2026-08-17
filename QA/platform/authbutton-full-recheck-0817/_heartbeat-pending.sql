-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches). Joins the existing queue (see
-- QA/*/*-0817/_heartbeat-pending.sql for the full list) — run all pending
-- files in git-log commit order, not folder-name order. Delete each file
-- once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift',
'auth-button overlap — recheck all 26 routes',
'done',
$$authbutton-full-recheck-0817 — the "auth-button overlap" table in
SYSTEMS_STATUS.md only carries rows for routes that were ever found
blocked or checked individually (torah, imud, smel, egod, chatzor, galil,
tamlul, chizukim, nadlan, portal home, smachot). The other 16 routes
(home, kesef, kiosk, modaot, briut, bkalot, chatzor-app, chizukim-app,
orech, mthbram, zchuyot, studio, mechiron, kupot, crm, gesher) never had
a row because no finding was ever recorded for them — "not measured"
read as "fine" by omission. Ran node scripts/qa/authbutton-overlap.mjs
with no arguments (all 26 routes in ROUTES) against production at all
five widths (390/834/1100/1280/1440): 26/26 routes clear at every width.
No code change, no deploy — measurement only, turns an assumption into a
measured fact. Evidence: QA/platform/authbutton-full-recheck-0817/_results.txt.$$
);
