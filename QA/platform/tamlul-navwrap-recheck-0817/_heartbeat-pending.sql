-- heartbeat queued because the Supabase MCP is not connected to this session.
-- Run in git-commit order (after the existing queued files in the repo).
insert into core.run_progress (phase, task, status, note) values (
  'anti-drift',
  '02 תמלול — חפיפת כפתור כניסה נפערה מחדש ותוקנה',
  'done',
  'אנטי-דריפט על שתי השורות הפתוחות היחידות בטבלת חפיפת כפתור הכניסה (tamlul, chizukim-app). chizukim-app: clear בכל 5 הרוחבים, אין שינוי קוד, שורה מיושנת. tamlul: overlap חדש ב-390px (button "החלף מצב כהה/בהיר" 31x18) — נגרם מהוספת ThemeToggle היום (POLISH_BACKLOG) שהעמיסה את סרגל הניווט מעבר למה שנכנס ב-272px של תיבת התוכן אחרי שמירת --more30-auth-inset (98px, נמדד תקין). לא כשל של .more30-auth-clear עצמו. תוקן: flex-wrap על שורת הניווט (apps/02-igud-transcribe/components/SiteHeader.tsx) — ב-390px גולש לשורה שנייה מתחת לכדור. אומת מקומית (next start, בסיס /tamlul) לפני פריסה: 390px נכנס לשורה שנייה 0 חפיפות; 834-1440px שורה יחידה ללא שינוי. נפרס vercel deploy --prod מ-apps/02-igud-transcribe (tamlul-more30, dpl_9vvZDdvybJNVoG5jcFxDfuWyEEqA), אומת חי: clear @ 390,834,1100,1280,1440. ראיות: QA/platform/tamlul-navwrap-recheck-0817/.'
);
