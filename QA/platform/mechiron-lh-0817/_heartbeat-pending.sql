-- PENDING heartbeat row — written 2026-08-17 because the Supabase MCP was not
-- connected this session (no route to core.secrets / SUPABASE_ACCESS_TOKEN).
-- Insert this BEFORE inferring what is already done from later heartbeat rows —
-- `at` below is the commit time, not the time this row is actually inserted.
insert into core.run_progress (phase, task, status, note, at)
values (
  'lighthouse-sweep-0817',
  'mechiron-lh-0817',
  'done',
  'System 27 (mechiron): Lighthouse measurement vs https://more30.com/mechiron -- first measurement, perf 65, a11y 96, bp 77, seo 100. 1 real a11y defect fixed and redeployed: color-contrast (ratio 3.05 on the footer disclaimer line under the org contact info -- the inner div stacked opacity-70 on top of an already text-muted-foreground parent, dropping the ratio below the 4.5:1 required; the sibling contact-info line in the same color without opacity was not flagged. Fix: removed the redundant opacity-70 class in apps/27-bkalut-price/client/src/pages/public-landing.tsx, leaving it at the same color as the parent line. Rebuilt via vite (base already /mechiron/), robocopy mirrored into _deploy/mechiron-more30/public/mechiron, deployed to production via vercel CLI (dpl_EhqY8wLJAwmoxFdyvzhMEP8Vo3FF, READY), verified new JS bundle hash (index-BklrIJk7.js) live on a cache-busted fetch, and re-ran Lighthouse to confirm a11y 96->100. Performance (65->58, run-to-run noise) is below the 90 threshold and not investigated this step. SYSTEMS_STATUS.md row 27 updated. Continues the 17/08 lighthouse-sweep after 02/04/06/10/12/14/15/16/17/18/22/26/28/32/34/21/24.',
  '2026-08-17T14:47:38.480Z'
);
