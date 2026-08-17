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
'anti-drift sweep — SYSTEMS_STATUS.md accessibility table: 24 galil footer touch targets recheck (registration)',
$$galil-footer-recheck-0817 — no code change. The accessibility findings
table said "24 galil | phone+email in footer: 79x14 and 157x18 - below 24px |
fixed, pending deployment". Re-ran node scripts/qa/platform-audit.mjs against
/galil only (desktop 1440px + mobile 390x844 + dark), the same tool that
measured the original gap. Live result: smallTargets: [] in all three passes,
0 console errors. The fix that was recorded as "written, waiting for deploy"
is already live in production. Updated SYSTEMS_STATUS.md: new dated entry at
top + struck-through row in the accessibility findings table. This is the
eighth stale gap of this kind found on 17/08.

Protected: did not touch 08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.
Zero rows actually written this run — no DB access at all.

Evidence: QA/platform/galil-footer-recheck-0817/_results.json.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-measured a
stale "24 galil - footer phone/email below 24px touch target, fixed but
pending deployment" claim in SYSTEMS_STATUS.md's accessibility findings table
against current production. A live platform-audit.mjs run against /galil
(desktop/mobile/dark) returned smallTargets: [] in all three passes - the fix
was already deployed. No code change; SYSTEMS_STATUS.md corrected (new dated
entry + struck-through table row). Joins the pending-heartbeat queue; run in
commit order.$$
);
