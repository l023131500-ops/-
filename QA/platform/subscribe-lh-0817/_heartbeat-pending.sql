-- Supabase MCP was not connected this session (checked via ToolSearch). Apply when a session with the MCP runs.
insert into core.run_progress (phase, task, status, note)
values (
  'qa-lighthouse-sweep',
  'subscribe-lh-0817',
  'done',
  'Lighthouse on https://more30.com/subscribe (route key "subscribe", third of the three routes left unmeasured after "home"): perf 88, a11y 100, best-practices 77, seo 63. Accessibility already full - no failedAudits, no code change. SEO 63 explained by is-crawlable (intentional noindex on account-flow pages, same as /login). Best-practices 77 matches the documented NetFree card-injection.js pattern seen across dozens of routes. Only "me" remains unmeasured from ROUTES (auth-gated, next). Evidence: QA/platform/subscribe-lh-0817/_lighthouse.json.'
);
