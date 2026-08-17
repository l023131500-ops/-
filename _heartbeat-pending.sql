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

-- Commit: <this step> "04 עימוד · 27 מחירון: אנטי-דריפט — מצב כהה 'נבנה, ממתין לפריסה' נבדק מחדש, כבר פרוס וחי"
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '04 עימוד · 27 מחירון — recheck מצב כהה',
  'done',
  'אותה שורת טבלה בעייתית כמו 32 נדל"ן, שני תאים נוספים: 04 imud · 27 mechiron סומנו ⏳ נבנה, ממתין לפריסה, בסתירה לסיכום "13/13. הושלם.". node scripts/qa/dark-probe.mjs QA/platform/imud-mechiron-a11y-recheck-0817 /imud /mechiron מול הייצור: imud 3 חוקי .dark, rgb(250,248,245) -> rgb(27,22,19) CHANGED; mechiron 12 חוקי .dark, rgb(248,246,242) -> rgb(18,25,28) CHANGED — אותם צבעים בדיוק שכבר תועדו בטבלה. ניגודיות אחרי ההיפוך: imud rgb(241,237,228) על rgb(27,22,19), mechiron rgb(240,236,230) על rgb(18,25,28) — שתיהן AA תקין. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות: QA/platform/imud-mechiron-a11y-recheck-0817/_dark-probe.json.'
);

-- Commit: <this step> "15 עגוד · 24 גליל: אנטי-דריפט — מצב כהה 'נבנה, ממתין לפריסה' נבדק מחדש, כבר פרוס וחי"
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '15 עגוד · 24 גליל — recheck מצב כהה',
  'done',
  'אותה שורת טבלה בעייתית כמו 04/27 ו-32: 15 egod · 24 galil סומנו ⏳ נבנה, ממתין לפריסה, בסתירה לסיכום "13/13. הושלם.". node scripts/qa/dark-probe.mjs QA/platform/egod-galil-a11y-recheck-0817 /egod /galil מול הייצור: egod 2 חוקי .dark, rgb(245,246,250) -> rgb(15,21,36) CHANGED; galil 2 חוקי .dark, רקע-גרדיאנט rgb(245,247,249)... -> rgb(14,24,32)... CHANGED (via gradient). ניגודיות אחרי ההיפוך: egod rgb(235,237,244) על rgb(15,21,36), galil rgb(236,240,244) על rgb(14,24,32) — שתיהן AA תקין. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות: QA/platform/egod-galil-a11y-recheck-0817/_dark-probe.json.'
);

-- Commit: <this step> "30 CRM · 31 גשר: אנטי-דריפט — מצב כהה 'ממתין לפריסה' נבדק מחדש, כבר פרוס וחי"
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '30 CRM · 31 גשר — recheck מצב כהה',
  'done',
  'אותה שורת טבלה בעייתית כמו 04/27, 15/24 ו-32: 30 crm · 31 gesher סומנו ⏳ ממתין לפריסה, בסתירה לסיכום "13/13. הושלם.". node scripts/qa/dark-probe.mjs QA/platform/crm-gesher-a11y-recheck-0817 /crm /gesher מול הייצור: crm 1 חוק .dark (--background:#050f14 / --foreground:#f1f6f6), lab(98.9,-1.6,-0.7) -> lab(3.7,-2.1,-4.0) CHANGED; gesher 1 חוק .dark (--background:#0b121a / --foreground:#f0f2f4), lab(98.1,-0.3,-0.7) -> lab(5.2,-1.2,-6.2) CHANGED. שני הזוגות כמעט שחור-על-כמעט-לבן — AA תקין בבירור. אין שינוי קוד, אין פריסה — מדידה בלבד, ותוקנה שורת הטבלה שסתרה את סיכום 13/13. ראיות: QA/platform/crm-gesher-a11y-recheck-0817/_dark-probe.json.'
);
