# POLISH_BACKLOG.md — ליטוש נדחה (לא פונקציונלי, לא שובר)

> נוצר 17/08/2026. מקום ריכוז לניסוח/קופי/נגישות/ניגודיות/מצב-כהה/מיקרו-UX
> שנדחו מ"פונקציה עכשיו" (`more30-priority.md`, כלל-העל א). אחרי סבב מלא על כל
> המערכות — עברו על הרשימה הזאת והשלימו.

## מצב כהה — פקד ידני חסר (5 מערכות, 4 הושלמו 17/08)

**מה חסר.** ל-02 (תמלול), ~~03 (מודעות)~~, ~~06 (בריאות)~~, ~~10
(בקלות-תצוגה)~~, 35 (קיוסק) אין פקד גלוי בעמוד שמאפשר למי שה-OS שלו **בהיר**
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
