-- pending heartbeat row for core.run_progress — Supabase MCP not connected this session
-- run once MCP is available:
insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift-sweep',
  'chatzor-status-sync-0817',
  'done',
  'SYSTEMS_STATUS.md row 16 (chatzor) synced to Lighthouse results already measured 02/08 in QA/chatzor.md: perf 87/57, a11y 100/100, 34->0 small targets, 11->0 contrast failures. Docs-only, no code/deploy change.'
);
