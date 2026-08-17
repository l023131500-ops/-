-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '10-bkalot-lighthouse-meta-description',
  'done',
  'Lighthouse never run before for bkalot(10): perf 82, a11y 100, bp 77, seo 91. ' ||
  'Unlike 02/04/06 accessibility was already full (100) - no a11y defect to fix. ' ||
  'The one real gap in failedAudits was meta-description (score 0, missing tag). ' ||
  'Added a descriptive <meta name="description"> in apps/10-bkalot-rights/index.html ' ||
  'after <title>. Deployed from _deploy/bkalot-more30, byte-verified identical to repo ' ||
  'copy before deploy (dpl_FtnA4fmg9yFn76Mc1frPd5aopoSt, READY). Verified live with a ' ||
  'cache-buster (more30.com/bkalot?cachebust=0817c): tag present in served HTML. ' ||
  'Perf 82 and best-practices 77 not investigated - matches the already-documented ' ||
  'NetFree/third-party-cookies pattern from 32-nadlan/02-tamlul/04-imud/06-briut, not new work. ' ||
  'Evidence: QA/platform/bkalot-lh-0817/_lighthouse.json, README.md. Commit dbb7a57.',
  now()
);
