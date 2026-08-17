-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: b800d85 — "03 מודעות איגוד (modaot): Lighthouse נמדד לראשונה
-- — אין ליקוי לתקן"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'modaot-lh-0817',
  'done',
  'Ran scripts/qa/lighthouse-run.mjs against the live https://more30.com/modaot (03 modaot igud) - first-ever full Lighthouse score for this system: performance 86, accessibility 100 (already), best-practices 77, seo 100. No real accessibility defect to fix (a11y already full). Performance/best-practices gaps (server-response-time 810ms, third-party-cookies/inspector-issues, mainthread-work-breakdown) match the NetFree local-measurement-distortion pattern already closed as non-code-fixable for 01/18/32/36 (netfree.link/card-injection.js present in bootup-time). Not re-investigated this step - passed this round without a fix. Updated SYSTEMS_STATUS.md. Evidence: QA/platform/modaot-lh-0817/_lighthouse.json.'
);
