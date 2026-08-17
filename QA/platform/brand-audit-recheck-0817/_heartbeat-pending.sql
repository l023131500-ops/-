-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches). Joins the existing queue (see
-- QA/*/*-0817/_heartbeat-pending.sql for the full list) — run all pending
-- files in git-log commit order, not folder-name order. Delete each file
-- once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift',
'§7 brand audit — full recheck of all 26 mounts',
'done',
$$brand-audit-recheck-0817 — the last recorded run of scripts/qa/brand-audit.mjs
(§7 branding: no "מור מערכות תוכנה" anywhere, every mount carries the
"פותח ע״י עולם הסטארטאפים" footer credit) was 06/08, after which kesef+tivuch
were fixed and deployed. 11 days and several deploys passed with no full
re-run against production. Ran the same script unchanged twice today (04:42
and again just before writing this up): all 26 mounts (admin, bkalot, briut,
chatzor, chizukim, crm, egod, galil, gannenet, gesher, imud, kesef, kiosk,
kupot, mechiron, modaot, mthbram, nadlan, orech, smachot, smel, studio,
tamlul, tivuch, torah, zchuyot) show old brand (html): no, old (rendered):
false, credit: true. 0 offenders, 0 missing credits, exit code 0 both times.
No code change, no deploy — measurement only, confirms §7 still holds and
refreshes the last-verified date. Evidence:
QA/platform/brand-audit-recheck-0817/raw-output.txt.$$
);
