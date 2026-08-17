-- PENDING heartbeat row — insert this BEFORE inferring what's already done from
-- core.run_progress. Written from a file because the Supabase MCP was not
-- connected this session (no mcp__supabase__* tool available, confirmed via
-- ToolSearch). `at` below is NOT the actual run time — it is a placeholder;
-- use now() at insert time or leave default.
insert into core.run_progress (phase, task, status, note)
values (
  'sweep-17/08',
  'gesher-lh-0817',
  'done',
  '31 גשר עברית CRM: Lighthouse נמדד לראשונה (perf 80, a11y 98->100, BP 77, SEO 100) + תוקן ליקוי נגישות אמיתי landmark-one-main במסך הכניסה (apps/31-hebrew-bridge-crm/src/routes/auth.tsx, ה-div העוטף הפך ל-main). נפרס ל-gesher-more30 (dpl_5NP2JDLSw3zxUN7WNLLqJbiW2pop, READY) ואומת חי עם cache-buster + מדידה חוזרת (a11y 100). פרפורמנס תואם דפוס NetFree/third-party-cookies שכבר מתועד, לא נחקר. heartbeat written from file - MCP was down this session.'
);
