-- Supabase MCP was not connected this session (17/08/2026, night). Insert this row
-- BEFORE inferring what is already done from core.run_progress -- the last real
-- row in the table understates work that already happened. `at` below is NOT the
-- run time; this was written from a file in a later session once the MCP is back.
-- Run all queued *_heartbeat-pending.sql files in git-log commit order (oldest first).
insert into core.run_progress (phase, task, status, note, at)
values (
  'perf-sweep-round2',
  '04-imud-torani-fontfix',
  'done',
  'imud (04, /imud): render-blocking Google Fonts link (11 families) replaced with loadCSS preload+swap pattern (no next/font available, Vite+Express app). perf 53->60, a11y 100, bp 77 unchanged, seo 100->91 (unexplained, likely measurement noise, not investigated). Deployed dpl_8PJ63Z2Th9YYEtQE4VFVRGC47ck1, verified live with cache-buster. Evidence: QA/platform/imud-lh-0817, QA/platform/imud-lh-fontfix-0817. Next in round-2 perf sweep: briut.',
  now()
);
