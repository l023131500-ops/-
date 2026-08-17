-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '14-smachot-lighthouse-first-measure',
  'done',
  'Lighthouse never run before for smachot(14): perf 76, a11y 100, bp 77, seo 100. ' ||
  'Like 10-bkalot, accessibility was already full (100) - no a11y defect to fix, no code ' ||
  'change, no deploy this round - measurement only. Perf 76 and best-practices 77 not ' ||
  'investigated - matches the already-documented NetFree/third-party-cookies pattern from ' ||
  '32-nadlan/02-tamlul/04-imud/06-briut/10-bkalot (netfree.link/card/card-injection.js ' ||
  'present in bootupTime trace). Evidence: QA/platform/smachot-lh-0817/_lighthouse.json.',
  now()
);
