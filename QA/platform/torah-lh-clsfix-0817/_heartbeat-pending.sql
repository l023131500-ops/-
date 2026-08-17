-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: (this step) — "01 torah: CLS regression fixed - prerender
-- re-baked with the tenant seed (0.578 -> 0.001)"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'torah-lh-clsfix-0817',
  'done',
  'First Lighthouse run of torah (01) under the 0817 sweep (scripts/qa/lighthouse-run.mjs
torah) found the exact regression scripts/prerender-all.mjs already documents by name:
window.__TENANT__ missing from the live https://more30.com/torah HTML, CLS 0.578
(bar is 0.1). Verified directly: fetched production with a cache-buster, __TENANT__
absent. Ran `node scripts/prerender-all.mjs torah` to re-bake _deploy/torah-more30/torah/index.html
with the seeded tenant row (script fetches it from Supabase at build time via
apps/01-torah-platform/.env.local). Deployed `vercel deploy --prod --yes` from
_deploy/torah-more30 (own linked Vercel project, prj_0JWao5UJpiQD80dX7jkypgKaA8Et),
READY. Verified live with cache-buster: __TENANT__ now present in served HTML.
Re-measured Lighthouse: CLS 0.578 -> 0.001. Accessibility 100/SEO 100 unaffected;
performance 37->42 (still well below 90, not investigated further this step -
mainthread-work-breakdown/FCP/LCP dominate, same NetFree-adjacent pattern
documented on other routes). Evidence: QA/platform/torah-lh-0817/_lighthouse.json
(before, CLS 0.578) and QA/platform/torah-lh-clsfix-0817/_lighthouse.json (after,
CLS 0.001).'
);
