-- PENDING heartbeat row — written 2026-08-17 because the Supabase MCP was not
-- connected this session (no route to core.secrets / SUPABASE_ACCESS_TOKEN).
-- Insert this BEFORE inferring what is already done from later heartbeat rows —
-- `at` below is the commit time, not the time this row is actually inserted.
insert into core.run_progress (phase, task, status, note, at)
values (
  'lighthouse-sweep-0817',
  'kesef-lh-0817',
  'done',
  'System 34 (kesef): first-ever Lighthouse measurement — perf 97, a11y 100, bp 77, seo 100 vs https://more30.com/kesef. Above the 90 threshold on performance and accessibility; no code fix needed. SYSTEMS_STATUS.md row updated. Commit c681761 (fix/nadlan-a11y). Continues the 17/08 sweep after 02/04/06/10/12/14/15/16/17/18/22/26/28.',
  '2026-08-17T13:36:48.262Z'
);
