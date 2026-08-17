-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '17-chizukim-perf-investigate',
  'done',
  'Round-2 perf investigation for chizukim(17), next after chatzor/egod in ROUTES ' ||
  'order. Font loadCSS fix already present (no new work). render-blocking-insight ' ||
  'traced to the app''s own built CSS bundle (index-CGr9WgHf.css), same category as ' ||
  'bkalot-theme.css/smachot/egod - left synchronous by existing FOUC-avoidance ' ||
  'decision, not touched. No single dominant script in bootupTime (unlike egod) so ' ||
  'no code-splitting case either. Noisy 55-78 score matches documented NetFree/' ||
  'measurement-noise pattern from 32/10/06/04/02/12/14/15. No code/deploy change this ' ||
  'step - investigation/documentation only. Evidence: ' ||
  'QA/platform/chizukim-perf-investigate-0817/_lighthouse.json, _analysis.md.',
  now()
);
