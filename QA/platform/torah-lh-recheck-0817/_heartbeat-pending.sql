-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 50fba4a — "אנטי-דריפט: SYSTEMS_STATUS.md — 01 torah
-- 'Lighthouse 74 (07/08)' ו-'LCP 5.3s/TBT 510ms, גדול ארכיטקטוני' היו מיושנים"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'torah-lh-recheck-0817',
  'done',
  'SYSTEMS_STATUS.md: 01 torah Lighthouse claim (74, 07/08) and "LCP 5.3s/TBT 510ms, large architectural" were stale. Reran scripts/qa/lighthouse-run.mjs against https://more30.com/torah: performance 74->88, LCP 5.3s->2.4s, TBT 510ms->280ms, a11y 100, SEO 100, BP 77 (same two NetFree-injected audits as tivuch, not a code bug). Performance 88 is still under the DESIGN_STANDARD threshold of 90, so not marked fully closed - only corrected the numbers and downgraded the "large architectural" label. No code change, no deploy - measurement only. Evidence: QA/platform/torah-lh-recheck-0817/_lighthouse.json.'
);
