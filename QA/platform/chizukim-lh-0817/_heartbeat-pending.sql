-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '17-chizukim-lighthouse',
  'done',
  'Lighthouse never run before for chizukim(17): /chizukim perf 67, a11y 100, bp 77, ' ||
  'seo 100; /chizukim/ perf 78, a11y 100, bp 77, seo 100. Accessibility already at 100 ' ||
  'on both routes - no failedAudits entries touched accessibility, so no code fix was ' ||
  'needed this round. Performance (67/78, below 90 threshold) and best-practices (77) ' ||
  'left open - matches the already-documented NetFree/third-party-cookies pattern from ' ||
  '32/10/06/04/02/12/14/15, not new work. Evidence: ' ||
  'QA/platform/chizukim-lh-0817/_lighthouse.json, README.md. Commit 764b509.',
  now()
);
