-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 7a11799 — "02 תמלול איגוד: נמדד Lighthouse לראשונה (perf 64,
-- a11y 98) + תוקן heading-order"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'tamlul-lh-0817',
  'done',
  'Ran scripts/qa/lighthouse-run.mjs against the live https://more30.com/tamlul (02 igud-transcribe) - first-ever Lighthouse score for this system: performance 64, accessibility 98, best-practices 77, seo 100. failedAudits surfaced a real (non-environmental) accessibility gap: heading-order scored 0 - apps/02-igud-transcribe/app/page.tsx line 34 had <h3>מה תקבל בסוף?</h3> immediately after the pages only <h1>, skipping h2. Fixed to <h2> (matches the sibling section headings "איך זה עובד"/"שלושה מסלולי סגנון", which are already h2). next build passed locally, deployed vercel deploy --prod (tamlul-more30, dpl_7Kp7kpUsc2Y4tKg4ep9WcUYUCq5c), verified live with a cache-buster: heading order is now h1->h2->h2->h3x3->h2->h2 (sequential, no skipped levels). Performance gaps (FCP/LCP 4.0s, server-response-time 930ms, mainthread-work-breakdown 3.7s) remain open for a future round - not yet checked whether they share the NetFree network-injection cause found on 32-nadlan. Updated SYSTEMS_STATUS.md. Evidence: QA/platform/tamlul-lh-0817/_lighthouse.json.'
);
