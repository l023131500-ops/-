-- Supabase MCP was not connected this session (17/08/2026, night). Insert this row
-- BEFORE inferring what is already done from core.run_progress -- the last real
-- row in the table understates work that already happened. `at` below is NOT the
-- run time; this was written from a file in a later session once the MCP is back.
-- Run all queued *_heartbeat-pending.sql files in git-log commit order (oldest first).
insert into core.run_progress (phase, task, status, note, at)
values (
  'perf-sweep-round2',
  '06-kupot-holim-briut-fontfix',
  'done',
  'briut (06, /briut): render-blocking Google Fonts link (Heebo + Frank Ruhl Libre) replaced with loadCSS preload+swap pattern (static site, no build step). Applied to both apps/06-kupot-holim/site/index.html and _deploy/briut-more30/briut/index.html (verified identical after edit). perf 84/93/91/87 (noisy baseline) -> 89, render-blocking-insight no longer in failedAudits. a11y 97/bp 77/seo 100 unchanged. Deployed dpl_BfqtJtZv6hVNLA3YZk2a4EVDCiiD, verified live with cache-buster. Evidence: QA/platform/briut-lh-0817, QA/platform/briut-lh-fontfix-0817. Next in round-2 perf sweep: bkalot.',
  now()
);
