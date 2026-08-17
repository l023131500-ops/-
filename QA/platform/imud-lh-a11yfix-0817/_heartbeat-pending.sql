-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '04-imud-lighthouse-a11y-fix',
  'done',
  'Lighthouse never run before for imud(04): perf 64, a11y 90, bp 77, seo 100. ' ||
  'Fixed 3 real (non-environmental) a11y defects in apps/04-imud-torani/client/src/pages/Home.tsx: ' ||
  'heading-order (h1->h3 skipped h2 on Steps cards), landmark-one-main (no <main>), ' ||
  'button-name (icon-only delete button had no aria-label). Re-measured after deploy: a11y 90->100. ' ||
  'Deployed vercel prod imud-more30 dpl_21mvKutWjXykY5AZ2NQqYpN1qLdi READY. ' ||
  'Perf unchanged (62-64, below 90 threshold) — left open for next round, same NetFree ' ||
  'network-dependency pattern already confirmed for 32-nadlan and 02-tamlul, not investigated here. ' ||
  'Evidence: QA/platform/imud-lh-0817/_lighthouse.json (before), ' ||
  'QA/platform/imud-lh-a11yfix-0817/_lighthouse.json (after). Commit 30a3554.',
  now()
);
