-- PENDING HEARTBEAT — Supabase MCP was not connected in this session (17/08/2026).
-- Insert this BEFORE inferring what is already done from core.run_progress —
-- otherwise the last row still in the table (mthbram, id 686 or later) reads as the
-- latest state and this step reads as not-yet-started. `at` below is NOT the run time,
-- it is a placeholder — this was written from a file, not live.
-- Find the full queue with: git ls-files -- "*_heartbeat-pending.sql"
-- Run order = git log --oneline --reverse -- "*_heartbeat-pending.sql" (oldest commit first).

insert into core.run_progress (phase, task, status, note, at)
values (
  'anti-drift-sweep',
  '24 galil · 21 mthbram — mobile menu button accessible-name recheck',
  'done',
  'SYSTEMS_STATUS.md a11y table row "24 galil · 21 mthbram | mobile menu button no accessible name | pending deploy (+aria-expanded)" rechecked against production with Playwright. Both apps: button has aria-label ("open menu"/"close menu" in Hebrew) and aria-expanded that flips false->true on a real click, nav becomes visible. Live JS bundles contain the aria-expanded string too. No code change, no deploy — table row was stale, corrected. Evidence: QA/platform/galil-mthbram-menu-a11y-recheck-0817/_results.json. Written from a _heartbeat-pending.sql file because the Supabase MCP was not connected this session; `at` is not the true run time.',
  now()
);
