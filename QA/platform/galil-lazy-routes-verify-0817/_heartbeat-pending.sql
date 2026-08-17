-- PENDING — insert this BEFORE inferring latest state from core.run_progress.
-- Written late from a file because the Supabase MCP was not connected this
-- session; `at` below is NOT the actual run time (commit ba36ea0 was 17/08).
insert into core.run_progress (phase, task, status, note)
values (
  'platform',
  'galil-lazy-routes-verify-0817',
  'done',
  'apps/24-galilee-connect-hub/src/App.tsx: completed+verified route-level code splitting (lazy()+Suspense) that was left uncommitted from a prior session (QA/platform/galil-perf-trace-0817 measured perf 43 / TBT 1260ms on the single 981KB bundle). Verified locally: vite build succeeds with per-page chunks; vite preview + Playwright on /, /synagogues, /kashrut all 0 console errors. Committed+pushed as ba36ea0 on fix/nadlan-a11y. Not yet deployed to production — a Lighthouse re-check on more30.com/galil after the next deploy will confirm the perf gain. Heartbeat written pending: Supabase MCP was not connected this session.'
);
