-- PENDING — insert this BEFORE inferring what's already done from the latest
-- core.run_progress row. Written late from a file because the Supabase MCP
-- was not connected this session (checked via ToolSearch, no supabase tools
-- surfaced). `at` below is NOT the actual run time — it is inserted whenever
-- a future session with MCP access picks up the pending-heartbeat queue.
-- Run all pending _heartbeat-pending.sql files in git log commit order.

insert into core.run_progress (phase, task, status, note, at)
values (
  'nadlan-a11y-branch',
  '15-egod-lighthouse-a11y',
  'done',
  'Lighthouse never run before for egod(15): perf 43, a11y 96, bp 77, seo 100. ' ||
  'lh-detail.mjs on color-contrast found 3 failing nodes: (1) BenefitsSection.tsx ' ||
  'h2 span.text-secondary, gold hsl(42 50% 54%) on light bg gave 2.27:1 (needs 3:1, ' ||
  'large bold text) - fixed by pointing just that span at the already-defined ' ||
  '--gold-dark token (hsl(42 55% 42%), 3.30:1 computed), not the shared --secondary ' ||
  'token (that token backs bg-secondary buttons elsewhere; first attempt darkened ' ||
  '--secondary globally and it fixed the heading but broke a different button''s ' ||
  'navy-on-gold contrast to 3.8:1 - reverted, used the scoped token instead). ' ||
  '(2) BenefitsSection.tsx p.text-muted-foreground, hsl(224 20% 50%) gave 4.29:1 ' ||
  '(needs 4.5:1) - --muted-foreground darkened to 47% lightness (4.77:1 computed, ' ||
  'text-only token, not used as a background anywhere in this app, so no ripple). ' ||
  '(3) body > a.more30-credit at 4.37:1 is the shared auth-button.js footer link used ' ||
  'across 24 systems - left open, out of scope for a single-system step, needs its ' ||
  'own verified change since it ships to every mounted app at once. ' ||
  'vite build -> robocopy to _deploy/egod-more30/egod (byte-identical verified) -> ' ||
  'vercel deploy --prod (dpl_6ks5rPKvnndVbXqfM9E1cKoVLWLA, READY). Verified live with ' ||
  'cache-buster: new bundle served, lh-detail.mjs re-run against production shows ' ||
  'only the shared-file issue remaining. Full re-measurement: a11y stayed 96 (the ' ||
  'still-open shared-file issue keeps the category below 100), perf 43->53 (noise, ' ||
  'not attributable to this change - font/JS payload unchanged). Performance (53, ' ||
  'well below 90) and best-practices (77) not investigated here - matches the ' ||
  'already-documented NetFree/third-party-cookies pattern from 32/10/06/04/02/12/14, ' ||
  'flagged for a dedicated pass rather than assumed. Evidence: ' ||
  'QA/platform/egod-lh-0817/_lighthouse.json (before), ' ||
  'QA/platform/egod-lh-a11yfix-0817/_lighthouse.json (after).',
  now()
);
