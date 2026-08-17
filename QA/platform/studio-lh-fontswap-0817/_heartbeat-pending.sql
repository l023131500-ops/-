-- PENDING HEARTBEAT — insert this row before inferring what's already done from other rows.
-- Written late from a file because the Supabase MCP was not connected this session
-- (checked via ToolSearch, no mcp__supabase__* tools available). `at` below is NOT the
-- actual run time — insert it as close to real time as possible when the MCP is back.
insert into core.run_progress (phase, task, status, note, at)
values (
  'perf-sweep',
  '26 סטודיו מודעות — font-display block->swap',
  'done',
  'commit 20f9bd2: המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי zchuyot לפי ROUTES ב-scripts/qa/lighthouse-run.mjs. Baseline node scripts/qa/lighthouse-run.mjs QA/platform/studio-perf-0817b studio -> perf 53, dominant failing audit font-display-insight (score 0, ~1.1s est. savings), Heebo.ttf alone wastedMs 740 — not the Google Fonts links (already display=swap+loadCSS preload), but six self-hosted @font-face rules in apps/26-modaot-studio/client/src/index.css set to font-display: block. Verified safety before touching: this CSS also serves the ad editor Konva canvas, but CanvasStage.tsx and lib/autofit.ts already await document.fonts.ready / fonts.load() before drawing, independent of the CSS property, so swap only affects DOM first-paint, not canvas export fidelity. Fixed all six (Heebo/Assistant/Rubik/Frank Ruhl Libre/David Libre/Amatic SC) block->swap. Built with the required base override (node node_modules\vite\bin\vite.js build --base=/studio/ — vite.config default /modaot/ 404s every asset under /studio/), staged into _deploy/studio-more30/public/studio (assets/ replaced, fonts/ preserved), deployed vercel deploy --prod --yes --scope l023131500-ops-projects (dpl_9F1fogpz6hN6EikkhiKdvaGoVckd, READY). Verified live: GET /studio/assets/index-Cc6JehBS.css contains font-display:swap, zero font-display:block. Re-measured: perf 53->78, a11y/seo/bp unchanged (100/100/77), FCP 3.5s->3.2s, LCP 4.6s->3.7s, TBT 610ms->80ms, CLS 0.079->0.003, SI 7.2s->5.9s, font-display-insight gone from failedAudits entirely. Evidence: QA/platform/studio-perf-0817b/_lighthouse.json (before), QA/platform/studio-lh-fontswap-0817/_lighthouse.json (after). Next in perf-sweep-2 (ROUTES order): mechiron.',
  now()
);
