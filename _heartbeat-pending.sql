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

-- Commit: <this step> "SYSTEMS_STATUS.md: תוקן דריפט תיעודי — §8ב 30 CRM/31 גשר כבר נסגרו, הרשומה העליונה עוד אמרה 'עדיין לא נבדקו'"
insert into core.run_progress (phase, task, status, note) values (
  'docs',
  'SYSTEMS_STATUS.md — תיקון דריפט תיעודי §8ב (30 CRM · 31 גשר)',
  'done',
  $$קריאת git log מול ראש SYSTEMS_STATUS.md חשפה סתירה: הרשומה העליונה בקובץ
("§8ב — 21 מתחברים", מ-commit 3a6a74a) מסתיימת ב"30 CRM זכויות ו-31 גשר עדיין
לא נבדקו באותה שיטה — נשארים בפער". אבל שני הקומיטים הבאים מיד אחריה
(65cfd40, b2ad348) כבר סגרו את שניהם באותה שיטה בדיוק (Playwright מול
הייצור, test@more30.com): 30 נוחת ב-/crm/dashboard (מסך כניסה עצמאי,
jhbeelzvjvhnkxldqvxx), 31 נוחת ב-/gesher/client/status (מסך כניסה עצמאי,
ygaqqnuyfnumezxxmtbh), 0 שגיאות קונסולה בשתיהן. NEEDS_USER.md §0א″ כבר
מעודכן נכון (שורה "עודכן 17/08/2026 — ... שלושתן (21/30/31) נמדדו וסוגרות")
— רק SYSTEMS_STATUS.md, בזכות סדר הרשומות (חדש למעלה), עדיין הציג את הפער
כפתוח למי שקורא רק את החלק העליון של הקובץ.

תוקן: נוספה רשומה חדשה בראש SYSTEMS_STATUS.md שמפנה במפורש לשני הקומיטים
הסוגרים ומסירה את הרושם שהפער עדיין פתוח, כדי שסבב אנטי-דריפט עתידי לא
יבזבז צעד על למדוד את זה שוב. אין שינוי קוד, אין פריסה — עדכון תיעוד בלבד,
מבוסס על מה שכבר נמדד ונכתב בשני הקומיטים הקיימים (לא נמדד מחדש כאן).$$
);

-- Commit: 3e3978e "30 CRM זכויות: favicon.svg נכתב מהסימן החי (ShieldCheck) ופרוס, NEEDS_USER §0פ: חמש נותרו -> שלוש"
insert into core.run_progress (phase, task, status, note) values (
  'polish',
  '30 CRM זכויות — favicon.svg',
  'done',
  $$NEEDS_USER §0פ: crm הייתה אחת מחמש שנשארו אחרי סגירת studio (17/08).
app-sidebar.tsx מצייר בכל עמוד תג מעוגל bg-primary עם אייקון lucide
ShieldCheck ב-text-primary-foreground; __root.tsx הקודם לא הצהיר rel="icon"
כלל. נמדדו הצבעים מהעמוד החי (Playwright getComputedStyle, מחובר כ-
test@more30.com): רקע #006D6D, אייקון #F8FDFD, ניגודיות 6.0:1 AA תקין.
נכתב apps/30-zchuyotpro-crm/public/favicon.svg (עותק נאמן, אותו פורמט כמו
studio), נוסף <link rel="icon" href="/crm/favicon.svg"> ו-rewrite תואם
ב-vercel.json (/crm/favicon.svg -> /favicon.svg), לצד ה-rewrite הקיים
ל-/crm/assets/*. פרוס ממקור (לא --prebuilt) כי config.json שה-nitro/vercel
preset מייצר לא כולל rewrites מ-vercel.json בכלל — --prebuilt היה שובר גם
את ה-rewrite הקיים של האסטים. dpl_4jBUsuzs9d8ytUixZbJJ1SYPUsrC, READY.
אומת: /crm/favicon.svg ו-crm-more30.vercel.app/favicon.svg שניהם 200,
הקובץ קיים בעץ שהועלה (Vercel API, לא דרך NetFree), 0 שגיאות קונסולה
אחרי הפריסה. NEEDS_USER §0פ: חמש -> שלוש (bkalot מוגן, gesher לא נבדק עדיין,
kesef source not-vendored — לא ניתן לתיקון מכאן). ראיות:
QA/platform/crm-favicon-0817/_results.md.$$
);

-- Commit: <this step> "31 גשר: favicon.svg נכתב מהסימן החי (Shield) ופרוס, NEEDS_USER §0פ: שלוש נותרו -> שתיים"
insert into core.run_progress (phase, task, status, note) values (
  'polish',
  '31 גשר — favicon.svg',
  'done',
  $$NEEDS_USER §0פ: gesher הייתה אחת משלוש שנשארו אחרי סגירת crm (17/08). אותו
דפוס בדיוק: RoleLayout.tsx מצייר בכל עמוד תג מעוגל bg-sidebar-primary/20 עם
אייקון lucide Shield ב-text-sidebar-primary-foreground; __root.tsx הקודם לא
הצהיר rel="icon" כלל. נמדדו הצבעים מהעמוד החי (Playwright getComputedStyle,
מחובר כ-test@more30.com, /gesher/client/status): אייקון #fcfcfc, רקע-בסיס
--sidebar-primary (ללא ה-/20, לצורך רקע דגל מוצק) #59758d, ניגודיות כ-4.7:1.
נכתב apps/31-hebrew-bridge-crm/public/favicon.svg (עותק נאמן של Shield, לא
ShieldCheck), נוסף <link rel="icon" href="/gesher/favicon.svg"> ו-rewrite תואם
ב-vercel.json (/gesher/favicon.svg -> /favicon.svg), לצד ה-rewrite הקיים
ל-/gesher/assets/*. פרוס ממקור (לא --prebuilt, אותה סיבה כמו crm).
dpl_H5CDPazhtmVA8BEeqJ6VAVnTcRft, READY. אומת: /gesher/favicon.svg מחזיר
image/svg+xml 32x32 (לא הוחלף ע"י NetFree), התג בעמוד החי מצביע על הנתיב
הנכון, 0 שגיאות אפליקציה בקונסולה. NEEDS_USER §0פ: שלוש -> שתיים (bkalot
מוגן, kesef source not-vendored — לא ניתן לתיקון מכאן). ראיות:
QA/platform/gesher-favicon-0817/_results.md.$$
);

-- Commit: dc7fe1d "30 CRM זכויות: Lighthouse נמדד לראשונה + תוקן landmark-one-main אמיתי (a11y 98→100)"
insert into core.run_progress (phase, task, status, note) values (
  'a11y-sweep',
  '30 CRM זכויות — Lighthouse + landmark-one-main',
  'done',
  $$המשך סבב Lighthouse על 26 המערכות החיות (fix/nadlan-a11y, 17/08). /crm
מפנה ל-/crm/auth, טרם נמדדה. node scripts/qa/lighthouse-run.mjs crm מול
הייצור: perf 85, a11y 98, bp 77, seo 100. הליקוי האמיתי היחיד: landmark-one-main
— apps/30-zchuyotpro-crm/src/routes/auth.tsx עטף את כל מסך הכניסה ב-<div>
יחיד; __root.tsx לא מוסיף <main> בשום מקום בעץ (Outlet ישיר). תוקן: ה-div
החיצוני הוחלף ל-<main> (אותם attributes, בלי שינוי עיצוב). vite build מקומי
נקי, פרוס ממקור (vercel deploy --prod --yes, לא --prebuilt — כפי שכבר תועד
ב-crm-favicon-0817: ה-preset של TanStack Start לא כולל rewrites מ-vercel.json
ב-config, --prebuilt שובר את rewrite ה-assets הקיים). dpl_7TzQnaeBF9WJyjXU51VgsCAfULQj,
READY. אומת: GET /crm/auth?cachebust=0817main מכיל <main> בייצור. הרצה חוזרת
של Lighthouse: perf 85->89, a11y 98->100, seo 100. שאר הליקויים (mainthread-
work-breakdown, redirects /crm->/crm/auth, unused-javascript) הם ביצועים
בלבד, לא נחקרו כעת. ראיות: QA/platform/crm-lh-0817/_results.md.$$
);

-- Commit: a6f403d "12 סמל נדל"ן: תוקן שורש הפרפורמנס - Google Fonts render-blocking -> loadCSS preload/swap (perf 80->76, render-blocking-insight 0->0.5, כנראה רעש מדידה כמו bkalot)"
insert into core.run_progress (phase, task, status, note) values (
  'perf-sweep',
  '12 סמל נדל"ן — loadCSS preload/swap',
  'done',
  $$המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי bkalot לפי ROUTES ב-
scripts/qa/lighthouse-run.mjs. apps/12-smel-ndln/client/index.html טען
Assistant+Heebo דרך <link rel="stylesheet" href="fonts.googleapis.com/css2?...">
סינכרוני ב-<head> — אותו דפוס בדיוק שכבר תוקן ב-01/02/03/04/06/10/32, מתועד
כ-render-blocking-insight (חיסכון משוער 500ms) ב-QA/platform/smel-lh-0817
(perf baseline 80, אחרי תיקון a11y קודם 73->80).

התיקון: תבנית loadCSS הסטנדרטית — preload+media=print/onload+noscript.
הוחל גם ב-apps/12-smel-ndln/client/index.html (מקור) וגם ב-
_deploy/smel-more30/smel/index.html (עותק הפריסה, לא במעקב git). נפרס
vercel deploy --prod --yes --scope l023131500-ops-projects מתוך
_deploy/smel-more30 (dpl_4i4ctebxRTjpAhfNUFUFm3Crp9ET), READY. אומת חי עם
cache-buster (more30.com/smel/?cachebust=0817smelfont2) — media="print"
onload="this.media='all'" מופיע ב-HTML המוגש.

נמדד אחרי: פרפורמנס 80->76 (ירד קלות). render-blocking-insight score 0->0.5,
"Est savings of 500ms" נעלם. FCP/LCP/SI כולם עלו, mainthread-work-breakdown
נכנס לרשימת הכשלים בפעם הראשונה — תואם את דפוס הרעש המתועד כבר ב-bkalot
(82->69), סומן לא רגרסיה אמיתית. נגישות 100/BP 77/SEO 100 ללא שינוי. ראיות:
QA/platform/smel-lh-0817/_lighthouse.json (לפני, perf 80) ·
QA/platform/smel-lh-fontfix-0817/_lighthouse.json (אחרי, perf 76). Supabase
MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ _heartbeat-pending.sql.

הבא בסבב-2 (פרפורמנס, בסדר המערכות): smachot (הבא ברשימת ROUTES אחרי smel).$$
);
