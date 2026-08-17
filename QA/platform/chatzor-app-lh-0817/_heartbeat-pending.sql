-- Supabase MCP not connected this session (2026-08-17). Insert when available.
insert into core.run_progress (phase, task, status, note)
values (
  'qa-sweep',
  'chatzor-app-lh-0817',
  'done',
  '16 חצור קונקט (/chatzor/, אפליקציה): Lighthouse נמדד לראשונה - perf 49, a11y כבר 100, bp 77, seo 100. אין ליקוי נגישות לתקן. פרפורמנס/BP תואמים דפוס NetFree כבר מתועד (card-injection.js, go-payment.js בטרייס). אין שינוי קוד. ראיות: QA/platform/chatzor-app-lh-0817/_lighthouse.json'
);
