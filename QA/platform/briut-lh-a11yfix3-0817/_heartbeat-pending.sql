-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '06-briut-lighthouse-a11y-fix',
  'done',
  'Lighthouse never run before for briut(06): perf 84, a11y 91, bp 77, seo 100. ' ||
  'Fixed 2 real (non-environmental) a11y defects in apps/06-kupot-holim/site: ' ||
  'label-content-name-mismatch (close buttons aria-label="סגור" missing visible "x" glyph, ' ||
  'brand link and profile-card aria-label not matching visible text - fixed per WCAG 2.5.3) ' ||
  'and aria-required-children (category filter chips missing role=tab/aria-selected structure). ' ||
  'Re-measured 3x after deploy: a11y 91->97, stable. color-contrast remains open, specific ' ||
  'element not identified this round. Deployed from _deploy/briut-more30, verified byte-for-byte ' ||
  'identical to repo copy. NOTE: the code+deploy+measurement work was done in a prior session ' ||
  'that crashed before git commit - this session only committed the already-live, already-' ||
  'verified change (commit 54fec78), no new code was written. ' ||
  'Evidence: QA/platform/briut-lh-0817/_lighthouse.json (before), ' ||
  'QA/platform/briut-lh-a11yfix-0817, -a11yfix2-0817, -a11yfix3-0817 (after, 3 repeat measurements). ' ||
  'Commit 54fec78.',
  now()
);
