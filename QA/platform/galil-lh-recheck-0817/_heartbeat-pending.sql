-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: (this step) — "24 גליל קונקט: Lighthouse נמדד מחדש אחרי
-- code splitting (36→40) — שיפור חלקי, לא נחקר לעומק"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'galil-lh-recheck-0817',
  'done',
  'Re-ran scripts/qa/lighthouse-run.mjs against https://more30.com/galil after the
route-level code splitting deployed in b83e599 (index.js 981KB->801KB +
KashrutPage-CDPfIuur.js split out). Performance moved 36->40, still well below
the 90 threshold - a partial improvement, not a fix. Accessibility 100, SEO 100
unaffected. New leading audits in this run: mainthread-work-breakdown 10.9s,
LCP 9.0s, server-response-time 760ms, unused-javascript ~142KiB. Not
investigated further in this step - measurement only, per commit b83e599''s
own note ("Lighthouse מחדש = הצעד הבא"). No further code change, no deploy.
Evidence: QA/platform/galil-lh-recheck-0817/_lighthouse.json.'
);
