-- heartbeat queued because the Supabase MCP is not connected to this session.
-- Run in git-commit order (append after the existing queue).
insert into core.run_progress (phase, task, status, note) values (
  'polish',
  '35 קיוסק — פקד מצב-כהה ידני (POLISH_BACKLOG, 5/5, סוגר)',
  'done',
  'POLISH_BACKLOG.md "מצב כהה — פקד ידני חסר" עמד על 4/5 (02/03/06/10 הושלמו 17/08, 35 קיוסק נשאר). קיוסק שונה מהארבע האחרות: הקונסולה אינה נבנית מהמונורפו הזה — Railway kioskfleet בונה מ-l023131500-ops/zol, ענף claude/what-do-you-see-gxo5tc, kiosk/server (זיכרון kiosk-deploys-from-a-different-repo). תוקן דרך GitHub Contents API ישירות מול zol: קובץ יחיד console.html (לא js/app.js או css/style.css, לצמצום סיכון) — commit 3633728 על zol. תסריט boot ב-<head> עודכן לקרוא localStorage["kiosk-theme"] לפני נפילה ל-prefers-color-scheme (אותה תבנית כמו 02/03/06/10). כפתור #themeToggle נוסף מחוץ ל-#login-view/#app-view (גלוי בשניהם), פינה ימנית-עליונה — הצד הנגדי לכדור הכניסה המשותף. אומת חי ב-Playwright מול more30.com/kiosk/console: קליק->dark rgb(11,18,32), רענון שומר בלי הבזק, קליק נוסף->בהיר rgb(245,247,251). ראיות: QA/platform/theme-toggle-kiosk-0817/. POLISH_BACKLOG "מצב כהה — פקד ידני חסר" סגור 5/5. מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873, ולא ב-js/app.js או css/style.css של הקיוסק.'
);
