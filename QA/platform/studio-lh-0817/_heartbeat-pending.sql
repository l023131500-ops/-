-- PENDING heartbeat row — insert this BEFORE inferring what's already done from
-- core.run_progress. Written from a file because the Supabase MCP was not
-- connected this session (no mcp__supabase__* tool available, confirmed via
-- ToolSearch). `at` below is NOT the actual run time — it is a placeholder;
-- use now() at insert time or leave default.
insert into core.run_progress (phase, task, status, note)
values (
  'sweep-17/08',
  'studio-lh-0817',
  'done',
  '26 סטודיו מודעות: Lighthouse נמדד לראשונה (perf 65, a11y כבר 100, SEO 100, BP 77). נגישות כבר מלאה - אין ליקוי לתקן. פרפורמנס מתחת לסף 90 תואם דפוס NetFree/third-party-cookies שכבר מתועד. commit 94edb75. heartbeat written late from file - MCP was down this session.'
);
