-- PENDING HEARTBEAT — insert this BEFORE inferring what's already done from
-- core.run_progress. The Supabase MCP was not connected in this session
-- (only playwright was), so this row could not be written live. `at` below
-- is NOT the run time — it is written late, from this file, whenever the
-- next session with MCP access picks it up. Insert in git-commit order
-- alongside any other _heartbeat-pending.sql files still queued.

insert into core.run_progress (phase, task, status, note, at)
values (
  'security',
  'csjekrvukbdznetsrodj recordings anon-write hole — NEEDS_USER §2 recheck',
  'done',
  'Re-measured the anon-key DELETE grant on public.recordings (csjekrvukbdznetsrodj, 06/12/17) live with a zero-row-match filter: still open, GET count unchanged at exactly 1138 (matches 02/08, 03/08, 12/08). But corrected a stale premise in NEEDS_USER.md #2: it said the fix cannot be applied here because csjekrvu is "a different Supabase account" the PAT cannot see. That was already contradicted by evidence recorded the same day (12/08) elsewhere in the same file — SUPABASE_ACCESS_TOKEN was used via the Management API against this exact project ref to flip mailer_autoconfirm and deploy geo.ts, both confirmed working. The PAT does reach csjekrvukbdznetsrodj (see memory supabase-pat-covers-ten-projects, 16/08). The real, narrower blocker is that reading the PAT out of core.secrets itself needs the Supabase MCP connection, which this session does not have. Updated NEEDS_USER.md with the correction and an exact next step: once MCP is connected, POST db/apps/17-chizukim-transcribe/0001_close_public_write_on_recordings.sql step 1 to /v1/projects/csjekrvukbdznetsrodj/database/query, then re-run this DELETE probe (expect 401/403 instead of 204). No code change, no deploy, no protected system touched, no real row created/deleted. Evidence: QA/platform/csjekrvu-rls-recheck-0817/. Heartbeat written late as this pending file because the Supabase MCP was not connected this session.',
  now()
);
