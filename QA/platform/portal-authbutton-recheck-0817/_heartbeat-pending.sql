-- PENDING HEARTBEAT — Supabase MCP was not connected in this session (17/08/2026).
-- Insert this BEFORE inferring what is already done from core.run_progress —
-- otherwise the last row still in the table reads as the latest state and this
-- step reads as not-yet-started. `at` below is NOT the run time, it is a
-- placeholder — this was written from a file, not live.
-- Find the full queue with: git ls-files -- "*_heartbeat-pending.sql"
-- Run order = git log --oneline --reverse -- "*_heartbeat-pending.sql" (oldest commit first).

insert into core.run_progress (phase, task, status, note, at)
values (
  'anti-drift-sweep',
  'portal (33) — auth-button overlap on "tell us an idea", recheck',
  'done',
  'SYSTEMS_STATUS.md "authbutton-overlap" table row "/ (33) | tell-us-an-idea link | fixed twice, see below" claimed both fixes were "fixed and awaiting deployment". Verified against production: https://more30.com/assets/index-B35ByRD-.css (pulled 17/08) is byte-identical to portal/src/styles.css for both rules (.nav-in padding-inline-end formula, and the 720px media query that no longer clobbers it). Then ran node scripts/qa/authbutton-overlap.mjs home (the same Playwright + elementFromPoint geometric tool that found the original gap) against https://more30.com/ at all five measured widths (390/834/1100/1280/1440): 0 overlaps at every width. Same stale-marker pattern as every other row rechecked today. No code change, no deploy — measurement only; table row and narrative paragraph corrected with strikethrough/checkmark. Evidence: QA/platform/portal-authbutton-recheck-0817/probe-live.txt. Written from a _heartbeat-pending.sql file because the Supabase MCP was not connected this session; `at` is not the true run time.',
  now()
);
