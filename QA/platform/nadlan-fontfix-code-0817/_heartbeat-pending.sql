-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 418e168 — "32 נדל"ן ברגע: commit קוד ה-fontfix שנפרס בפועל
-- (היה תיעוד בלבד ב-1e14599)"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'nadlan-fontfix-code-0817',
  'done',
  'Repo hygiene, not new functional work. Discovered commit 1e14599 (nadlan-fontfix-0817) had documented and shipped the next/font/google fix (already deployed to production, dpl_GVKytw1SwRXDz5ZzfTwu7TQ3AZzQ, READY, Lighthouse perf 60->72) but the commit itself only contained NEEDS_USER.md/SYSTEMS_STATUS.md/QA evidence - the three actual code files (apps/32-nadlan-berega/app/globals.css, app/layout.tsx, tailwind.config.ts) were left uncommitted in the working tree. Committed and pushed them in 418e168 so the git history matches what is actually running in production. No new code change; diff was identical to what was already deployed.'
);
