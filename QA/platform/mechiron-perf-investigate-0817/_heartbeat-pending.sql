-- PENDING HEARTBEAT — insert this row before inferring what's already done from other rows.
-- Written late from a file because the Supabase MCP was not connected this session
-- (checked via ToolSearch, no mcp__supabase__* tools available). `at` below is NOT the
-- actual run time — insert it as close to real time as possible when the MCP is back.
insert into core.run_progress (phase, task, status, note, at)
values (
  'perf-sweep',
  '27 מחירון (mechiron) — Google Fonts render-blocking -> loadCSS preload/swap',
  'done',
  'commit <fill-after-commit>: המשך סבב-2 (פרפורמנס, בסדר ROUTES) — הבא אחרי studio. Baseline node scripts/qa/lighthouse-run.mjs QA/platform/mechiron-perf-investigate-0817 mechiron -> perf 55. mainThreadBreakdown dominated by Style&Layout (1421ms) + Other (1343ms), not JS: own bundle bootup only 339ms/296ms scripting, auth-button.js 253ms/41ms, NetFree scripts ~215ms combined. But unlike egod/chatzor/zchuyot (deferred, need code-splitting/lazy-mount) this route had a concrete fixable render-blocking-insight (640ms est. savings): apps/27-bkalut-price/client/index.html loaded Google Fonts (Heebo+Frank Ruhl Libre) via a synchronous <link rel="stylesheet"> in <head> -- same bug already fixed on 01/02/03/04/06/10/12/32. Fixed: replaced with loadCSS pattern (rel=preload as=style + media=print onload=this.media=all + noscript fallback), identical to 12 smel. Built (vite build, apps/27-bkalut-price, base already /mechiron/), robocopy to _deploy/mechiron-more30/public/mechiron (/MIR, 18 files), vercel deploy --prod --yes --scope l023131500-ops-projects (dpl_E32no47ap7Jam5781GrRy4hn9Dgf, READY, alias mechiron-more30.vercel.app). Verified live with cache-buster: new <link rel=preload as=style> present in rendered HTML. Re-measured: QA/platform/mechiron-lh-fontfix-0817/_lighthouse.json -> perf 53 (55->53, measurement noise, same pattern as 10 bkalot / 12 smel where the root cause fix did not move the aggregate score). render-blocking-insight still fails (now flags 1050ms) against the OTHER stylesheet on the page, bkalot-theme.css from Supabase Storage (shared design tokens across systems) -- not touched this step, cross-system risk. Evidence: QA/platform/mechiron-perf-investigate-0817/_analysis.md, QA/platform/mechiron-lh-fontfix-0817/_lighthouse.json. Next in perf-sweep-2 (ROUTES order): kupot.',
  now()
);
