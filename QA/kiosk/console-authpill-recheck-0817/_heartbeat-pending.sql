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
'anti-drift sweep — SYSTEMS_STATUS.md: 35 kioskfleet console, issue #216 (auth pill covers enroll button) recheck',
$$console-authpill-recheck-0817 — no code change. SYSTEMS_STATUS.md (line
~1615, dated 13/08) recorded #216 as open: the shared <more30-auth> login pill
allegedly covering the "add device" button on /kiosk/console, the only action
on that screen. Logged in as admin against production and measured with
elementFromPoint at the button's leading edge and centre, at 390x844 and
1440x900. Result: no overlap at either width (390: pill bottom=44, button
top=71, 27px clear; 1440: pill right=92, button left=104, 12px clear).
elementFromPoint hits the button itself, not MORE30-AUTH, at both widths. The
13/08 fix (a page-local padding-inline-end rule reading --more30-auth-inset)
is live in production. Updated SYSTEMS_STATUS.md: struck the #216 "open" note
and added a dated recheck entry above it.

Protected: did not touch 08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.
Zero rows actually written this run — no DB access at all.

Evidence: QA/kiosk/console-authpill-recheck-0817/results.json,
console-390-clear.png, console-1440-clear.png.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-measured a
stale "#216 open — shared auth pill covers /kiosk/console's enroll button"
claim in SYSTEMS_STATUS.md against current production, logged in as admin. No
overlap at 390px or 1440px in either elementFromPoint or bounding-box terms.
No code change; SYSTEMS_STATUS.md corrected (new dated entry + struck-through
#216 note). Joins the pending-heartbeat queue; run in commit order.$$
);
