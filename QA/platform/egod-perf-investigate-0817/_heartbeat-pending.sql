-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: (this commit) — "15 איגוד (egod): חקירת פרפורמנס 53 - bundle עצמי
-- הוא הגורם, לא רעש רשת/פונטים - נרשם לסבב הבא, לא תוקן כאן"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'egod-perf-investigate-0817',
  'done',
  'Continued round-2 perf sweep (ROUTES order in scripts/qa/lighthouse-run.mjs) after smachot(14): egod(15), performance 53. Reused already-captured QA/platform/egod-lh-a11yfix-0817/_lighthouse.json (measured earlier today after the a11y fix, no re-run needed) instead of the Google-Fonts-render-blocking pattern fixed on 01/02/03/04/06/10/12/14 - egod/index.html has no fonts.googleapis.com link at all. The one render-blocking resource is Vite own bundled app CSS (index-Crke-OnG.css) - same category as bkalot-theme.css and smachot base.css/style.css, both left synchronous in prior sessions to avoid FOUC risk on critical layout CSS; left untouched here for the same reason. The real finding: unlike the nadlan investigation (22776f5) where NetFree proxy noise dominated and first-party JS was negligible, here bootupTime shows egods own bundle (index-DtGWwuYa.js) at 1786ms total/724ms scripting, ~13x auth-button.js and ~19x the netfree injection script - a genuine first-party cost, backed by unused-javascript (179 KiB estimated savings), unminified-javascript, and unused-css-rules failing audits. This needs real code-splitting/tree-shaking work on apps/15-egod (Vite+React, recharts present in node_modules), which is a separate, larger task than a one-file loadCSS swap - not attempted in this step. No code or deploy change this step, analysis only. Documented in QA/platform/egod-perf-investigate-0817/_analysis.md and SYSTEMS_STATUS.md. Next in round-2 ROUTES order: chatzor.'
);
