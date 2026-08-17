-- Supabase MCP was not connected this session (checked via ToolSearch). Apply when a session with the MCP runs.
insert into core.run_progress (phase, task, status, note)
values (
  'qa-lighthouse-sweep',
  'login-lh-0817',
  'done',
  'Lighthouse on https://more30.com/login (route key "login", missing from the 0817 sweep, next after home per home-lh-0817 note): perf 85, a11y 100, best-practices 77, seo 63. SEO failure is intentional, not a bug: the page carries <meta name="robots" content="noindex"> by design (account page, documented in robots.txt) so it never indexes but Google can still crawl it to drop already-indexed URLs. No code change. CLS 0.272 and performance sub-metrics not yet investigated (same "not investigated" status as every other route in this sweep). me/subscribe still unmeasured for this date. Evidence: QA/platform/login-lh-0817/_lighthouse.json.'
);
