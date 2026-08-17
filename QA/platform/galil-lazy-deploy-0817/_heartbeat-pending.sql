-- Supabase MCP was not connected this session. Run once MCP is available.
insert into core.run_progress (phase, task, status, note)
values (
  'galil-connect',
  'galil-lazy-deploy-0817',
  'done',
  '24 galil: code-split build from ba36ea0 (App.tsx lazy()+Suspense per route) deployed to production via vercel deploy --prod from _deploy/galil-more30 (deployment dpl_2o3vdw1hT7vohXivkZSeaCav5xjM). Verified live with cache-buster: more30.com/galil/ serves index-BzyDhrTf.js (801KB, down from 981KB single bundle) and a separate route chunk KashrutPage-CDPfIuur.js (5997B), both 200 from more30.com/galil/assets/. Lighthouse re-measure against prod is the next step, not done this round.'
);
