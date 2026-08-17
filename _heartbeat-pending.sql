-- heartbeat queued because the Supabase MCP is not connected to this session.
-- Run in git-commit order. Commit: cb8f14e "06 בריאות: פקד מצב-כהה ידני נוסף ופרוס וחי (POLISH_BACKLOG, 4/5)"
insert into core.run_progress (phase, task, status, note) values (
  'polish',
  '06 בריאות — פקד מצב-כהה ידני',
  'done',
  'נוסף #themeToggle ל-.main-nav (apps/06-kupot-holim/site), localStorage["briut-theme"] לפני prefers-color-scheme. אומת מקומית תחת /briut/ ובייצור (Playwright): קליק->dark rgb(14,21,25), רענון שומר בלי הבזק, קליק נוסף->בהיר. נפרס vercel deploy --prod מ-_deploy/briut-more30 (dpl_9kmftqAHANeWjCcoJwuuYSN4uYuM), אומת חי ב-https://more30.com/briut/?cachebust=0817briut. ראיות: QA/platform/theme-toggle-briut-0817/. POLISH_BACKLOG.md 4/5 (35 קיוסק נשאר).'
);

-- Commit: <this step> "32 נדל"ן: אנטי-דריפט — חפיפת כפתור הכניסה על 'מקורות ותמחור' נבדקה מחדש, אינה פעילה"
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '32 נדל"ן — recheck חפיפת כפתור כניסה',
  'done',
  'הרשומה הישנה בטבלת "חפיפת כפתור הכניסה" ב-SYSTEMS_STATUS.md סימנה /nadlan "מקורות ותמחור" כ-⏳ ממתין לפריסה. node scripts/qa/authbutton-overlap.mjs nadlan מול הייצור החזיר 0 חפיפות בכל חמשת הרוחבים (390/834/1100/1280/1440) — clear @ 390,834,1100,1280,1440. אין שינוי קוד, אין פריסה — מדידה בלבד, פער ישן תשיעי שאינו פעיל. ראיות: QA/platform/nadlan-authbutton-recheck-0817/_results.txt.'
);

-- Commit: <this step> "32 נדל"ן: אנטי-דריפט — מצב כהה 'נבנה, ממתין לפריסה' נבדק מחדש, כבר פרוס וחי"
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '32 נדל"ן — recheck מצב כהה',
  'done',
  'טבלת "מצב כהה" ב-SYSTEMS_STATUS.md סימנה 32 nadlan כ-⏳ נבנה, ממתין לפריסה, בסתירה לשורת הסיכום מתחתיה "מצב כהה — 13/13. הושלם.". node scripts/qa/dark-probe.mjs QA/platform/nadlan-a11y-recheck-0817 /nadlan מול הייצור: 3 חוקי .dark פעילים, רקע rgb(246,248,252) -> rgb(12,18,32), CHANGED. ניגודיות אחרי ההיפוך rgb(221,227,238) על rgb(12,18,32) — AA תקין. אין שינוי קוד, אין פריסה — מדידה בלבד, ותוקנה שורת הטבלה שסתרה את סיכום 13/13. ראיות: QA/platform/nadlan-a11y-recheck-0817/_dark-probe.json.'
);
