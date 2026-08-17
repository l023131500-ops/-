-- heartbeat queued because the Supabase MCP is not connected to this session.
-- Run in git-commit order. Commit: cb8f14e "06 בריאות: פקד מצב-כהה ידני נוסף ופרוס וחי (POLISH_BACKLOG, 4/5)"
insert into core.run_progress (phase, task, status, note) values (
  'polish',
  '06 בריאות — פקד מצב-כהה ידני',
  'done',
  'נוסף #themeToggle ל-.main-nav (apps/06-kupot-holim/site), localStorage["briut-theme"] לפני prefers-color-scheme. אומת מקומית תחת /briut/ ובייצור (Playwright): קליק->dark rgb(14,21,25), רענון שומר בלי הבזק, קליק נוסף->בהיר. נפרס vercel deploy --prod מ-_deploy/briut-more30 (dpl_9kmftqAHANeWjCcoJwuuYSN4uYuM), אומת חי ב-https://more30.com/briut/?cachebust=0817briut. ראיות: QA/platform/theme-toggle-briut-0817/. POLISH_BACKLOG.md 4/5 (35 קיוסק נשאר).'
);
