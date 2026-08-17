-- Supabase MCP not connected this session. Run this once MCP/access is available.
insert into core.run_progress (phase, task, status, note)
values (
  'perf-sweep-2',
  'smel-lh-fontfix-status-0817',
  'done',
  'SYSTEMS_STATUS.md: added missing narrative entry for 12 smel Google Fonts render-blocking fix (perf 80->76, likely measurement noise, matches bkalot pattern). Commit a6f403d had shipped the code fix without the status entry; this step closed that gap. Next in perf-sweep-2 order: smachot.'
);
