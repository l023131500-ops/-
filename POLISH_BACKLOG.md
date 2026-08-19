# POLISH_BACKLOG.md — ליטוש נדחה (לא פונקציונלי, לא שובר)

> נוצר 17/08/2026. מקום ריכוז לניסוח/קופי/נגישות/ניגודיות/מצב-כהה/מיקרו-UX
> שנדחו מ"פונקציה עכשיו" (`more30-priority.md`, כלל-העל א). אחרי סבב מלא על כל
> המערכות — עברו על הרשימה הזאת והשלימו.

## מצב כהה — פקד ידני חסר (5 מערכות, 5/5 הושלמו 17/08) ✅

**מה חסר היה.** ל-02 (תמלול), ~~03 (מודעות)~~, ~~06 (בריאות)~~, ~~10
(בקלות-תצוגה)~~, ~~35 (קיוסק)~~ לא היה פקד גלוי בעמוד שמאפשר למי שה-OS שלו **בהיר**
לבחור כהה בכל זאת (ל-smel, chatzor, galil יש כזה פקד). **זו לא הייתה
פונקציונליות חסרה** — כל חמש עוקבות אחרי `prefers-color-scheme: dark`
בפועל, כלומר מי שה-OS שלו כהה מקבל עמוד כהה בלי שום פעולה. נמדד ונאושר מחדש
17/08:

✅ **06 בריאות — הושלם 17/08.** נוסף כפתור `#themeToggle` (🌙/☀️) ל-`.main-nav`
ב-`apps/06-kupot-holim/site/index.html` (אתר סטטי, כמו 10 — בלי שלב build).
ה-`THEME_BOOT` שכבר היה ב-`<head>` עודכן לקרוא `localStorage["briut-theme"]`
לפני נפילה ל-`prefers-color-scheme`, אותה תבנית בדיוק כמו 02/03/10. מקש
הקליק נוסף ב-`app.js` (`themeToggle.onclick`), עיצוב הכפתור ב-`styles.css`.
אומת מקומית (שרת סטטי מקומי תחת נתיב `/briut/` כדי ש-`<base href="/briut/">`
ייפתר נכון) ואז ב-Playwright מול הייצור: קליק→`classList.contains('dark')`
+ רקע `rgb(14,21,25)`; רענון (`?cachebust`) שומר בלי הבזק; קליק נוסף חוזר
לבהיר. נפרס `vercel deploy --prod` מתוך `_deploy/briut-more30`
(`briut-more30`, `dpl_9kmftqAHANeWjCcoJwuuYSN4uYuM`) ואומת חי ב-
`https://more30.com/briut/?cachebust=0817briut`. ראיות:
`QA/platform/theme-toggle-briut-0817/`. 35 (קיוסק, Vite) נשאר ברשימה.

✅ **10 בקלות-תצוגה — הושלם 17/08.** נוסף כפתור `#themeToggle` (🌙/☀️) בניווט,
עם שמירה ל-`localStorage`. זו הייתה היחידה מבין החמש שהיא אתר סטטי (בלי
build), ולכן הראשונה שנסגרה. נפרס ואומת בייצור. ראה
`QA/platform/theme-toggle-bkalot-0817/`.

✅ **02 תמלול — הושלם 17/08.** נוסף רכיב לקוח `ThemeToggle.tsx` (כפתור
🌙/☀️ ב-`SiteHeader.tsx`), ו-`THEME_BOOT` ב-`app/layout.tsx` עודכן לקרוא
`localStorage["tamlul-theme"]` לפני נפילה ל-`prefers-color-scheme` — אותה
תבנית בדיוק שכבר חיה ב-`/bkalot`. נבנה (`next build`), נבדק מקומית
(Playwright: קליק→כהה, רענון שומר, קליק נוסף→בהיר), נפרס
(`tamlul-more30`, `dpl_yWB9XZBxQn5JKW8kyWWTZEg4fboE`) ואומת חי מול
`https://more30.com/tamlul/?cachebust=0817tamlul`. ראיות:
`QA/platform/theme-toggle-tamlul-0817/`. 03/06 (Next.js) ו-35 (Vite,
kioskfleet) דורשים אותו טיפול ונשארים ברשימה.

✅ **03 מודעות — הושלם 17/08.** נוסף `ThemeToggle.tsx` (כפתור 🌙/☀️, מקבל
`className` כדי להתאים לכל אחד מהשניים שצריכים אותו) — הודבק גם ב-
`SiteHeader.tsx` (משמש רק ב-`/transcribe/upload` וב-`/transcribe/success`)
וגם ישירות ב-`app/(public)/page.tsx`, כי דף הבית של המערכת הזו בנוי עם
כותרת inline משלו ולא דרך `SiteHeader`. `THEME_BOOT` ב-`app/layout.tsx`
עודכן לקרוא `localStorage["modaot-theme"]` לפני נפילה ל-
`prefers-color-scheme`, אותה תבנית כמו 02/10. `next build` עבר, Playwright
מקומי (`next start`, basePath `/modaot`) אימת בדף הבית ובעמוד ההעלאה: קליק→
`classList.contains('dark')` + רקע `rgb(15,18,24)`, רענון שומר בלי הבזק,
קליק נוסף חוזר לבהיר. נפרס `vercel deploy --prod` מתוך `apps/03-igud-ads`
(`modaot-more30`, `dpl_7kpTybzinumhjbwUeGDaErsk2D5f`) ואומת חי ב-
`https://more30.com/modaot/?cachebust=0817modaot` (אותה בדיקה, אותה
תוצאה). ראיות: `QA/platform/theme-toggle-modaot-0817/`. 06 (Next.js) ו-35
(Vite) נשארים ברשימה.

✅ **35 קיוסק — הושלם 17/08, החמישית והאחרונה.** בניגוד לארבע הקודמות, המערכת
הזו אינה נבנית מהמונורפו הזה — שירות Railway `kioskfleet` בונה מ-`l023131500-ops/zol`,
ענף `claude/what-do-you-see-gxo5tc`, `kiosk/server` (ראה זיכרון
`kiosk-deploys-from-a-different-repo`), ולכן קומיט כאן לא היה משנה כלום.
תוקן דרך GitHub Contents API ישירות על אותו ריפו/ענף: קובץ יחיד,
`kiosk/server/public/console.html` — לא נגעתי ב-`js/app.js` (32KB) או
ב-`css/style.css` כדי לצמצם סיכון. תסריט ה-boot ב-`<head>` (שכבר החיל
`.dark` לפי `prefers-color-scheme`) עודכן לקרוא קודם `localStorage["kiosk-theme"]`,
אותה תבנית בדיוק כמו 02/03/06/10. נוסף כפתור `#themeToggle` (🌙/☀️) **מחוץ**
ל-`#login-view`/`#app-view` (כך שגלוי בשני המסכים כאחד), במיקום קבוע פינה
ימנית-עליונה — הצד הפיזי הנגדי לכדור הכניסה המשותף (שיושב בפינה השמאלית-עליונה
גם ב-RTL, ראה `auth-button-overlaps-navs`), כדי שלא יתנגשו. אומת חי מול
`https://more30.com/kiosk/console` (Playwright): קליק→`classList.contains('dark')`
+ רקע `rgb(11,18,32)`; רענון (`?cachebust`) שומר בלי הבזק, אייקון נכון (☀️);
קליק נוסף חוזר לבהיר `rgb(245,247,251)`. ראיות: `QA/platform/theme-toggle-kiosk-0817/`.
**המשימה "מצב כהה — פקד ידני חסר" סגורה, 5/5.**

```
/tamlul      os-dark:follows  toggle:none    => reachable
/modaot      os-dark:follows  toggle:none    => reachable
/briut       os-dark:follows  toggle:none    => reachable
/bkalot      os-dark:follows  toggle:none    => reachable
/kiosk       os-dark:follows  toggle:none    => reachable
```

ראיות: `QA/platform/dark-toggle-recheck-0817/`, סקריפט חוזר-הרצה:
`scripts/qa/dark-toggle-probe.mjs`.

**מה נדרש כשמגיעים לזה:** פקד toggle (button/switch) שכותב `data-theme`/מחלקת
`dark` על ה-root ושומר העדפה (localStorage), בכל אחת מהחמש. לכל מערכת ×1 שינוי
קטן. עדיפות נמוכה — המצב הכהה כן מגיע לגולש שמבקש אותו דרך ה-OS.

## Tailwind — קבוצת צבע שלמה שלא נפלטת, ומחלקה שנפלטת ומפסידה בקסקייד (17 חיזוקים, 18/08)

**עדיפות נמוכה — לא שובר כלום היום.** התגיות ב-`/chizukim` צבועות ועובדות
(תוקן ונפרס 18/08, ראה `core.run_progress` id 957). מה שנשאר פתוח זה
ההסבר, ושתי מלכודות שיחזרו במערכת הבאה שמוסיפים בה צבע.

**1. הצבעים לא נפלטו בכלל.** ב-`apps/17-chizukim-transcribe/tailwind.config.ts`,
`theme.extend.colors.status` מוגדר תקין — ו-Tailwind 3.4.19 לא מייצר ממנו שום
utility. `text-status-progress`, `bg-status-progress/20`, `text-status-edit`,
`text-status-ready` פשוט אינם ב-CSS הבנוי. נמדד מול ה-CLI עם הקלאסים בקובץ
תוכן מפורש: `text-chart-4` ו-`text-sidebar-ring` — שכניהם הישירים באותו
אובייקט — קיבלו כלל, שלושת ה-`status-*` קיבלו אפס. נשלל במדידה: אין safelist,
אין `textColor`/`backgroundColor` דורס, שני plugins בלבד, הקובץ UTF-8 נקי ואין
תווי bidi סביב `status: {`. **הסיבה עדיין לא ידועה.** כל קבוצת צבע חדשה
שתתווסף לקונפיג הזה עלולה להיעלם באותה שקט.

**2. ואז המחלקה שכן נפלטה הפסידה בקסקייד.** התיקון הראשון כתב את שלוש
המחלקות תחת `@layer components`. רכיב ה-Badge מוסיף לתגית גם את מחלקות
הווריאנט שלו, כך שהיא נושאת `bg-primary text-primary-foreground` **ו**-
`status-chip-ready` יחד — אותה ספציפיות בדיוק, ולכן מכריע מי אחרון בקובץ.
`components` נפלט לפני `utilities`, אז ה-navy ניצח: בפרודקשן נמדד
`.status-chip-ready` בהיסט 5,539 מול `.bg-primary` ב-19,650, ו-
`getComputedStyle` על 25 התגיות החיות החזיר `rgb(46,70,127)`. הפתרון: לכתוב
את הכללים בלי `@layer`, אחרי `@tailwind utilities`.

**הלקח השיטתי, והוא החשוב מהשניים:** "הכלל נמצא ב-CSS הבנוי" ו"הכלל צובע את
האלמנט" הן שתי מדידות שונות, ורק השנייה היא הטענה. הבדיקה הראשונה עברה על כל
סעיף בזמן שהתגיות היו עדיין כחולות. תמיד לאמת ב-`getComputedStyle` על
האלמנט האמיתי בעמוד החי, לא על נוכחות מחרוזת בקובץ.
