-- Supabase MCP was not connected this session (checked via ToolSearch). Apply when a session with the MCP runs.
insert into core.run_progress (phase, task, status, note)
values (
  'qa-lighthouse-sweep',
  'me-lh-0817',
  'done',
  'Lighthouse on https://more30.com/me (route key "me", the last unmeasured entry in ROUTES - auth-gated, measured unauthenticated as that is what production actually serves): perf 98, a11y 100, best-practices 77, seo 63. Accessibility already full - no failedAudits, no code change. SEO 63 explained by is-crawlable (intentional noindex on account-flow pages, same as /login and /subscribe). Best-practices 77 matches the documented NetFree card-injection.js pattern seen across dozens of routes. All entries in the ROUTES list (scripts/qa/lighthouse-run.mjs) have now been measured at least once. Evidence: QA/platform/me-lh-0817/_lighthouse.json.'
);
