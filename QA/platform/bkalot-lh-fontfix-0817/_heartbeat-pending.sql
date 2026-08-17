-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '10-bkalot-perf-fontfix',
  'done',
  'Round-2 perf pass, next after 06-briut in ROUTES order. apps/10-bkalot-rights/index.html ' ||
  'had the same synchronous Google Fonts <link> render-blocking pattern already fixed in ' ||
  '01/02/03/04/06/32 (flagged in bkalot-lh-0817, dbb7a57, est savings 1210ms). Applied the same ' ||
  'loadCSS preload/media=print/onload/noscript pattern to apps/10-bkalot-rights/index.html and ' ||
  '_deploy/bkalot-more30/bkalot/index.html (byte-verified identical after edit). Deployed ' ||
  '(dpl_HEiYsuhoK6GLeigmURmQFUf8ff6w, READY). Verified live with cache-buster ' ||
  '(more30.com/bkalot/?cachebust=0817bkalotfont): loadCSS markers present in served HTML. ' ||
  'Measured after: perf 82->69 (regressed despite the fix matching a proven pattern). ' ||
  'render-blocking-insight improved (1210ms->330ms est savings, a second stylesheet - Supabase-hosted ' ||
  'design tokens - is still synchronous and untouched). FCP/LCP/SI all improved (3.1s->2.7s / ' ||
  '3.1s->2.9s / 7.2s->4.2s) but mainthread-work-breakdown worsened (5.9s->7.6s) and TBT (770ms) ' ||
  'newly failed. Matches the already-documented measurement-noise pattern from 06-briut ' ||
  '("84-93 noisy") and 32-nadlan (mainthread-work-breakdown is network/NetFree-dependent) - not ' ||
  'investigated as a real regression this round. Evidence: QA/platform/bkalot-lh-0817/_lighthouse.json ' ||
  '(before, perf 82), QA/platform/bkalot-lh-fontfix-0817/_lighthouse.json (after, perf 69), README.md.',
  now()
);
