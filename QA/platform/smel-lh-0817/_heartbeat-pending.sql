-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '12-smel-lighthouse-a11y',
  'done',
  'Lighthouse never run before for smel(12): perf 73, a11y 92, bp 77, seo 100. ' ||
  'Two real a11y defects found via lh-detail.mjs per audit: (1) color-contrast - ' ||
  '.gold-text at hsl(43 62% 45%) gave 2.78:1 on the light background, darkened to ' ||
  '32% lightness (5.06:1 computed). (2) link-name - the header "premium" Link wrapped ' ||
  'a Button with hidden sm:inline-flex, but wouter renders its own <a> around the ' ||
  'child, so on mobile viewport the <a> itself stayed visible/focusable with no ' ||
  'accessible name. Moved hidden sm:inline-flex from the Button to the Link. ' ||
  'Rebuilt (vite), synced into _deploy/smel-more30/smel, deployed ' ||
  '(dpl_F2oruq6kdtoxTBNMAoRZ8q3KZqQE, READY). Verified live with cache-buster: new ' ||
  'bundle served, lh-detail.mjs re-run against production shows both audits at ' ||
  'score 1. Full re-measurement: accessibility 92->100, performance 73->80. ' ||
  'Performance (80, below 90 threshold) and best-practices (77) left open - matches ' ||
  'the already-documented NetFree/third-party-cookies pattern from 32/10/06/04/02, ' ||
  'not new work. Evidence: QA/platform/smel-lh-0817/_lighthouse.json, README.md. ' ||
  'Commit ae496f8.',
  now()
);
