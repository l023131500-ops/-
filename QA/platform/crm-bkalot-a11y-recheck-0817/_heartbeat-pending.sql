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
  '10 bkalot · 30 crm — last two a11y table rows recheck',
  'done',
  'SYSTEMS_STATUS.md a11y table rows "10 bkalot | comparison <select> with no label | fixed" and "30 crm | forgot-password link 75x16 | fixed" (both already marked fixed-in-code, never rechecked against production) verified with node scripts/qa/platform-audit.mjs against /bkalot and /crm in desktop/mobile/dark. bkalot: unnamedControls:[] and smallTargets:[] in all three modes. crm: /crm resolves directly to the login screen itself (title "login to the system | zchuyot pro"), smallTargets:[] in all three modes. No code change, no deploy — measurement only, table rows corrected with strikethrough. Evidence: QA/platform/crm-bkalot-a11y-recheck-0817/_results.json. Written from a _heartbeat-pending.sql file because the Supabase MCP was not connected this session; `at` is not the true run time.',
  now()
);
