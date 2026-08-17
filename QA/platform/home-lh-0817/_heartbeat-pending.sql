-- Supabase MCP was not connected this session (checked via ToolSearch). Apply when a session with the MCP runs.
insert into core.run_progress (phase, task, status, note)
values (
  'qa-lighthouse-sweep',
  'home-lh-0817',
  'done',
  'Lighthouse on https://more30.com/ (route key "home", missing from the 0817 sweep): perf 86, a11y 100, best-practices 77, seo 100. Accessibility already full - no failedAudits, no code change. NetFree card-injection.js present in bootupTime, same documented pattern as 32/02/04/06/10/14/28/31/16. login/me/subscribe still unmeasured for this date. Evidence: QA/platform/home-lh-0817/_lighthouse.json.'
);
