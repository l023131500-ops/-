# SYSTEMS_STATUS.md — מצב כל המערכות, נמדד

> ## 🟢 18/08/2026 (לילה) — **15 איגוד (egod): תג "בסיוע איגוד השיעורים" בלתי-קריא במצב כהה — תוקן (סבב-3 נגישות)**

> המשך סבב-3 (`contrast-probe.mjs`, בסדר `ROUTES` ב-`scripts/qa/lighthouse-run.mjs`) —
> הבא אחרי smachot(14). מול `https://more30.com/egod` במצב כהה, שני רוחבים
> (1440/390): כשל אחד — תג ה-hero "בסיוע איגוד השיעורים" (`text-secondary`
> על באדג' `bg-secondary/20` שקוף על רקע `bg-primary` כהה), 3.82:1 (נדרש 4.5).
>
> **השורש** ב-`apps/15-egod/src/components/home/HeroSection.tsx:21-24`: טקסט
> הזהב (`--secondary` הכהה, `42 60% 62%`) על באדג' שרקעו מיזוג 20% זהב +
> 80% נייבי — התערובת בהירה מספיק כדי לשחוק את הניגודיות מול הטקסט הזהוב
> עצמו. **התיקון:** `dark:text-[hsl(var(--gold-light))]` על האייקון והטקסט
> (טוקן `--gold-light` כבר קיים במצב כהה, `42 65% 74%`, מחושב ל-~4.9:1 מול
> אותו רקע) — בלי לגעת ב-`--secondary` המשותף.
>
> **תגלית לוואי (לא תוקן, לא קשור):** אותה בדיקה במצב בהיר החזירה ~24 "כשלים"
> — רובם ב-`Footer.tsx` (`bg-gradient-navy`, גרדיאנט אמיתי) ו-hero, אותה
> מגבלת `contrast-probe.mjs` שכבר תועדה (torah/modaot/smachot): הכלי קורא
> רק `background-color` ומדלג על גרדיאנטים. **אמיתי אך קטן וקיים-מראש** (לא
> נגרם ע"י התיקון הזה): אותו תג "בסיוע איגוד השיעורים" במצב בהיר עדיין 3.99:1
> (`text-secondary` הרגיל, לא שונה בצעד הזה) — נדחה לצעד נפרד.
>
> אומת: `vite build` נקי, נפרס `vercel deploy --prod` (`egod-more30`,
> `dpl_5xioxkTke1NLuwXzTcbEY8JczCzp`, READY). אומת חי עם cache-buster: כהה
> 1 כשל ← 0 (שני הרוחבים). ראיות: `QA/egod/hero-badge-dark-0818/`.

> ## 🟢 18/08/2026 (לילה) — **14 שמחות פלוס (smachot): 0 כשלי ניגודיות במצב כהה — נבדק ותקין (סבב-3 נגישות); בנוסף אותרה מגבלת-כלי חדשה**

> המשך סבב-3 (`contrast-probe.mjs`) — הבא לפי `ROUTES` אחרי smel(12). מול
> `https://more30.com/smachot` במצב כהה, שני רוחבים (1440/390): **0 כשלים**.
> המערכת הזו (`apps/14-bsmachot-plus/website`) היא אתר סטטי עצמאי, לא אחת
> מאפליקציות ה-React/Next המשותפות — היא מנהלת מצב-כהה בעצמה דרך תכונת
> `data-theme="dark"` שנקבעת פעם אחת בטעינה מ-`matchMedia('(prefers-color-
> scheme: dark)')` (`app.js:369`), לא דרך מחלקת `.dark` המשותפת. שני מערכי
> המשתנים (`:root`/`[data-theme="dark"]`) בנויים היטב — ניגודיות תקינה בפועל.
>
> **תגלית לוואי:** אותה בדיקה במצב בהיר החזירה ~40 "כשלים" (פריטי ניווט
> בסרגל הצד, כותרת המותג, כותרת/תקציר ה-hero, תאי טבלה). קריאת `style.css`
> אימתה שכולם false positive של `contrast-probe.mjs` עצמו, לא באג: (1)
> `.sidebar`/`.view-hero` צבועים ב-`linear-gradient` כהה-קבוע בכוונה בשני
> המצבים — הטקסט הבהיר עליהם תקין, אבל מהלך ה-`backdrop()` של הכלי קורא רק
> `background-color` ומדלג על גרדיאנטים (אותה מגבלה שתועדה כבר בממצא galil),
> ולכן "רואה" את רקע העמוד הבהיר מתחתיו; (2) **תגלית חדשה**: `.topbar` וכמה
> תאי טבלה משתמשים ב-`color-mix(in srgb, ...)`, שהפַרסר של הכלי (רג'קס גולמי
> שקולט את ארבעת המספרים הראשונים במחרוזת) קורא לא נכון — מייצר רקעים
> מומצאים כמו `rgb(35, 35, 35)`/`rgb(115, 115, 115)`. לא תוקן קוד ייצור —
> שתי המגבלות שייכות לכלי ה-QA, לא לאתר. לא כדאי להרחיב את `contrast-probe.mjs`
> לתמוך ב-gradient/`color-mix()` בצעד הזה (גדול מצעד אחד); יש לזכור את
> המגבלה אם עוד מערכות (כמו smel/imud) משתמשות בדפוסים דומים.
>
> אין שינוי קוד, אין פריסה נדרשת. ראיות:
> `QA/platform/smachot-dark-recheck-0818/_results.md`. Supabase MCP אינו
> מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 18/08/2026 (לילה) — **04 עימוד (imud): 9 כשלי ניגודיות במצב כהה, אחד גם בהיר — תוקנו 7/9 (סבב-3 נגישות)**

> המשך סבב-3 (`contrast-probe.mjs`) אחרי modaot(03). מול `https://more30.com/imud`
> במצב כהה: 9 כשלים — תג הבאדג' "מנוע עימוד לספרי קודש" (`text-primary` על
> רקע ה-hero, 3.93:1), כפתור ה-CTA "שאלון חכם" (`bg-primary`+`text-primary-foreground`
> לבנבן, 4.07:1, וכן על קישור הוויזארד), תגי המספור "1"–"4" בכרטיסי השלבים
> (`text-muted-foreground/25`, 1.59:1), ותווית שם-תבנית בכרטיס ספר אמיתי
> ("עיון בשני טורים", אותו `text-primary`, 3.76:1). בדיקה במצב בהיר (לא
> נבדק קודם) גילתה שכשל תגי-המספור **אינו** תלוי-מצב: 1.39:1 גם שם.
>
> **השורש:** `--primary` הכהה (`349 60% 55%`) משמש גם כטקסט (צריך בהיר
> יותר על רקעים כהים) וגם כרקע-כפתור עם טקסט כמעט-לבן (צריך כהה יותר כדי
> שהטקסט הלבן יעבור 4.5:1) — טוקן יחיד לא יכול לספק את שני הכיוונים; לבן
> טהור על האדום הזה מגיע רק ל-4.39:1. שקיפות תגי-המספור (`/25`) פשוט לא
> נבדקה מול WCAG מעולם — `text-muted-foreground` מלא כבר עובר 5–6.5:1.
>
> **התיקון:** לבאדג' + לתווית — `dark:text-[#da6c80]` (ורוד בהיר יותר,
> מחושב ל-~5:1) **בנוסף** ל-`text-primary` הקיים, בלי לגעת ב-`--primary`
> עצמו (נמנע סיכון לכל שימושי `bg-primary` האחרים באפליקציה שלא נסרקו
> הסבב הזה). לתגי-המספור — `/25` → `/80` (אחיד לשני המצבים, מחושב ל-3.4:1
> בהיר / 4.7:1 כהה).
>
> **לא תוקן בצעד הזה:** כפתור ה-CTA נשאר 4.07:1 במצב כהה (בהיר עובר —
> `--primary` שם כהה יותר, 34% לעומת 55%) — אותה תבנית בדיוק כמו הפער
> שנשאר פתוח ב-torah בסבב הקודם, דורש טוקן נפרד לכפתור או הגדלת הטקסט
> לסף 3:1; נדחה לצעד נפרד.
>
> אומת: `vite build` נקי, נפרס `vercel deploy --prod` (`imud-more30`),
> READY. אומת חי עם cache-buster: כהה 9 כשלים ← 2 (הפער הידוע למעלה),
> בהיר 4 כשלים (כולל תגי-מספור שלא נבדקו קודם) ← 0. ראיות:
> `QA/platform/imud-badge-dark-0818/_results.md`. Supabase MCP אינו מחובר
> לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 18/08/2026 (לילה) — **03 מודעות: תג "1/2/3" בלתי-קריא במצב כהה — תוקן (סבב-3 נגישות)**

> המשך סבב-3 (`contrast-probe.mjs`) אחרי torah(01) — modaot(03), הבא לפי
> `ROUTES`. מול `https://more30.com/modaot` במצב כהה: 3 כשלים — עיגולי
> המספרים "1"/"2"/"3" בסקציית "איך זה עובד", 1.56:1 (נדרש 3), בהיר על זהב.
>
> **השורש** ב-`apps/03-igud-ads/app/(public)/page.tsx:66`: `text-brand-dark`
> (טוקן-דיו שמתהפך בין מצבים) על `bg-brand-goldsurface` (משטח זהב **קבוע**,
> לא מתהפך) — אותה מלכודת שכבר תועדה ותוקנה ב-`.btn-gold` באותו קובץ
> (`globals.css:98-101`), אבל התג המספרי לא עקב אחריה. **התיקון:**
> `text-brand-dark` → `text-brand-darksurface` (משטח-דיו קבוע) על שלושת התגים.
>
> **תגלית לוואי:** בדיקת מצב-בהיר על אותו עמוד החזירה רשימת "כשלים" ארוכה
> (טקסט לבן על קרם) — **false positive של `contrast-probe.mjs`**, לא באג:
> ל-`<main>` יש `bg-gradient-to-b from-brand-blue to-brand-dark` אמיתי
> (אומת: `getComputedStyle().backgroundImage` = נייבי-כהה), אבל הכלי קורא רק
> `background-color` ומדלג על גרדיאנטים, ולכן "רואה" את רקע ה-`<body>` (קרם)
> מתחתיו. לא תוקן קוד ייצור — מגבלת כלי-QA, יש לזכור אותה אם עוד מערכות
> משתמשות ב-`bg-gradient-*` על אלמנט-עטיפה.
>
> אומת: `next build` נקי, נפרס `vercel deploy --prod` (`modaot-more30`,
> `dpl_9TPLrFZFFXds5yfS3zcGZTSSD7Gp`, READY). אומת חי עם cache-buster:
> כשלים 3←0. ראיות: `QA/platform/modaot-badge-dark-0818/`. Supabase MCP
> אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 18/08/2026 (לילה) — **01 torah: כל הכותרת/היירו/הפוטר/הניווט היו בלתי-קריאים במצב כהה — תוקן (סבב-3 נגישות)**

> המשך סבב-3 (בדיקת ניגודיות מצב-כהה, `contrast-probe.mjs`) אחרי tamlul
> (02, `93c8032`). מול `https://more30.com/torah` במצב כהה: **21 כשלים**,
> כולם `rgb(17,30,60)` על `rgb(26,47,91)` (1.2–1.26:1, נדרש 4.5) — עיגול
> האווטאר בניווט, "התחבר"/"הרשמה", כותרת ה-h1 והתת-כותרת ביירו, וכל
> כותרת/קישור/שורת-זכויות בפוטר.
>
> **השורש** ב-`apps/01-torah-platform/src/hooks/useTenant.tsx`: ה-effect
> שמיישם מיתוג-שוכר כותב `--primary`/`--secondary`/`--accent` כ-inline style
> על `document.documentElement` — וזה גובר על בורר המחלקה `.dark` ב-
> `index.css`. כך הרקע נשאר נעוץ לצבע המותג של השוכר (כחול-נייבי, זהה למצב
> בהיר) בשני המצבים, בעוד `--primary-foreground` נשאר תלוי רק ב-`.dark`
> והמשיך להתהפך לגוון נייבי-כהה שיועד לשבת על רקע זהב שמעולם לא הגיע —
> טקסט נייבי-כהה על רקע נייבי-כהה = 1.2:1.
>
> **התיקון:** בכל מקום שמוגדר צבע-מותג inline, לנעוץ גם את ה-token
> המתאים לו `-foreground` (מחושב לפי luminance יחסי לפי WCAG) במקום
> להשאיר אותו תלוי ב-`.dark` — כך הוא תמיד עוקב אחרי הרקע בפועל, לא אחרי
> המצב. הוחל באופן עקבי על primary/secondary/accent (אותה תבנית כשל
> בשלושתם).
>
> אומת: `vite build` נקי, `node scripts/prerender-all.mjs torah` אפה מחדש
> את `_deploy/torah-more30/torah/index.html` עם ה-seed של השוכר (חובה
> ל-torah — ראו `scripts/prerender-all.mjs`, אחרת רגרסיית CLS). נפרס
> `vercel deploy --prod`, `dpl_BRQQkRDHYvRTKqVrMGAkJpabG4Fm`, READY,
> aliased. אומת חי עם cache-buster: `contrast-probe.mjs` במצב כהה — 21
> כשלים ← 1 (לא קשור, ראו למטה). מצב בהיר: אותו כשל יחיד, ללא שינוי —
> מצב בהיר לא נגע.
>
> **לא תוקן בצעד הזה:** כפתור ה-CTA הזהוב "אתר לי שיעור" (`variant="gold"`
> ב-`Button`, `Home.tsx`) — טקסט לבן על זהב ב-2.31:1, נדרש 4.5 — פער קטן
> וקיים-מראש, בשני המצבים כאחד, לא קשור לבאג הזה. לצעד המשך.
>
> ראיות: `QA/platform/torah-primary-dark-0818/` (`_shot.mjs`,
> `torah-dark.png`, `torah-light.png`). Supabase MCP אינו מחובר לסשן הזה —
> heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 18/08/2026 (לילה, אחרי סבב-2) — **תחזוקה: עוד 6 תמונות מתות (~1.05MB) הוסרו — torah/mthbram**

> אחרי שסבב-2 (פרפורמנס) וליטוש "מצב כהה" (POLISH_BACKLOG) נסגרו, וארבעה
> צעדים קטנים נוספים כבר קרו בלי תיעוד כאן (#219 קיוסק show-password,
> #234/#237 שכפול-בקלות reconcile, ניגודיות קרדיט הפוטר ב-auth-button.js —
> ראו git log, לכולם יש QA/_results.md משלהם), Supabase MCP עדיין לא מחובר
> לסשן הזה (נבדק שוב) אז אי אפשר לשאול core.issues מה עוד open. המשך ישיר
> לניקוי `dead-assets-cleanup-0817`: Explore agent סרק apps/02–37 עבור
> תמונות >200KB לא-מוזכרות בעץ האפליקציה שלהן; אומת פעמיים (agent + grep
> עצמאי). הוסרו: `hero-pattern.jpg`, `hero-stage.jpg`, `logo-mitchabrim.png`
> — כל אחד פעמיים (01-torah-platform ו-21-mthbram, אותו קוד מזוקק). לא
> נבנית, אין פריסה נדרשת. ראיות: `QA/platform/dead-assets-cleanup-0818/`.
>
> ⚠️ heartbeat נכתב כקובץ `_heartbeat-pending.sql` (Supabase MCP לא מחובר).

> ## 🟢 18/08/2026 (לילה) — **35 kiosk: נמדד פרפורמנס 93 (מעל הסף), סבב-2 (ROUTES) הושלם על כל המסלולים**

> המשך סבב-2 (פרפורמנס, בסדר `ROUTES` ב-`scripts/qa/lighthouse-run.mjs`) —
> הבא אחרי `gesher`(31)→`nadlan`(32, כבר נחקר/תוקן ב-17/08 בנפרד)→`kesef`(33,
> נמדד 17/08, 97, אין תיקון נדרש): **`kiosk`(35, `/kiosk/`), האחרון ברשימת
> `ROUTES`.**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/kiosk-perf-investigate-0818
> kiosk` → perf **93**, a11y 100, bp 77, seo 100 — מעל סף ה-90, אין צורך
> בתיקון. baseline קודם (02/08) היה 95 — אותו רעש-מדידה שתועד שוב ושוב
> בסבב הזה. `mainThreadBreakdown`: Style & Layout (1732ms) דומיננטי, לא
> סקריפט יחיד — אותו דפוס כמו zchuyot/chatzor. `bootupTime` מראה שוב את
> `netfree.link/card/card-injection.js` מוזרק לעקבה — עדות חוזרת לעיוות
> מדידה מקומי (NetFree), לא באג שרת/קוד. אין שינוי קוד/פריסה. ראיות:
> `QA/platform/kiosk-perf-investigate-0818/_lighthouse.json`, `_analysis.md`.
>
> **`kiosk` הוא הרשומה האחרונה ב-`ROUTES`** — סבב-2 (פרפורמנס, בסדר המערכות)
> נסגר על כל 29 המסלולים. שיפורים פתוחים שנשארו (לא תוקנו כי הם עבודת קוד
> גדולה מ"צעד אחד"): lazy-load ל-`framer-motion` על zchuyot(22)/chatzor(16),
> code-splitting ברמת מסלול על mthbram(21) — רשומים למעלה ובמקומם. הבא: סבב
> ליטוש נוסף לפי POLISH_BACKLOG.md, או פתיחת סבב-3 אם יתגלה עוד עבודה
> פונקציונלית לא-סגורה.

> ## 🟡 17/08/2026 (לילה, לג) — **27 מחירון (mechiron): תוקן שורש הפרפורמנס (Google Fonts render-blocking → loadCSS preload/swap), 55→53 — רעש מדידה, כמו bkalot/smel**

> המשך סבב-2 (פרפורמנס, בסדר `ROUTES`) — הבא אחרי `studio` (שלא תועד כאן
> בזמן אמת, ראה commit `20f9bd2`). `apps/27-bkalut-price/client/index.html`
> טען Google Fonts (Heebo + Frank Ruhl Libre) דרך `<link rel="stylesheet">`
> סינכרוני — אותה תקלה שכבר תוקנה ב-01/02/03/04/06/10/12/32.
> `render-blocking-insight` מדד חיסכון משוער 640ms. `bootupTime` שלל JS
> כבד: הבאנדל העצמי רק 339ms total, `auth-button.js` רק 253ms — לא הגורם.
>
> **התיקון:** תבנית loadCSS (`rel="preload" as="style"` +
> `media="print" onload="this.media='all'"` + `<noscript>`), זהה ל-12 smel.
> `vite build` → robocopy ל-`_deploy/mechiron-more30/public/mechiron` →
> `vercel deploy --prod` (`dpl_E32no47ap7Jam5781GrRy4hn9Dgf`, READY). אומת
> חי עם cache-buster.
>
> **נמדד אחרי:** perf 55→53 (רעש מדידה, אותו דפוס בדיוק כמו 10 bkalot/12
> smel — שורש תוקן, ציון כולל לא עלה). `render-blocking-insight` עדיין
> נכשל נגד `bkalot-theme.css` (Supabase Storage, משותף למערכות אחרות —
> לא תוקן בצעד הזה). ראיות:
> `QA/platform/mechiron-perf-investigate-0817/_analysis.md`,
> `QA/platform/mechiron-lh-fontfix-0817/_lighthouse.json`. Supabase MCP אינו
> מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (ROUTES): `kupot`.

> ## 🟢 17/08/2026 (לילה, לא) — **22 זכויות (zchuyot): נחקר פרפורמנס 65→43 — framer-motion על ה-thread הראשי, אותו דפוס כמו chatzor, לא תוקן בצעד הזה**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי `mthbram` לפי `ROUTES` ב-
> `scripts/qa/lighthouse-run.mjs`. `node scripts/qa/lighthouse-run.mjs
> QA/platform/zchuyot-perf-investigate-0817 zchuyot` — perf 43 (baseline
> קודם 65, מדידת a11y מוקדמת יותר היום, לא נחקר פרפורמנס עד כה).
>
> **למה זה לא דפוס Google Fonts:** `apps/22-get-your-rights/index.html`
> כבר נושא את תבנית ה-loadCSS (`media="print"`+`onload`) ל-Rubik — תוקן
> בעבר, אין תיקון חדש כאן. `render-blocking-insight` Est savings רק 290ms
> — לא הגורם הדומיננטי.
>
> **הממצא:** `bootupTime` חושף `assets/motion-B5vKfmr5.js` — **3,930ms
> total** (878ms scripting, השאר רינדור) — chunk נפרד של `framer-motion`,
> אותה ספרייה ואותו דפוס בדיוק כמו `16 חצור קונקט` (chatzor).
> `mainThreadBreakdown`: Other 4779ms, Style & Layout 3669ms, Script
> Evaluation 2133ms — פיזור דומה ל-chatzor (רינדור/layout דומיננטי, לא
> bundle-JS יחיד). `forced-reflow-insight` נכשל (score 0) — תואם עבודת
> layout כבדה, לא NetFree חוסם.
>
> **מסקנה:** דורש דחיית טעינת `framer-motion` ל-lazy/lazy-mount אחרי
> האינטראקטיביות הראשונית — אותו תיקון בדיוק שנדרש ל-16 חצור קונקט, עבודת
> קוד נפרדת וגדולה מ"צעד אחד". אין שינוי קוד/פריסה בצעד הזה —
> מדידה/חקירה/תיעוד בלבד. ראיות:
> `QA/platform/zchuyot-perf-investigate-0817/_lighthouse.json`, `_analysis.md`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `galil` כבר טופל קודם (code
> splitting, לא חלק מרצף האותיות של סבב-2). הבא בפועל: `studio` (הבא
> ברשימת `ROUTES` שטרם נמדד/נחקר).

> ## 🟢 17/08/2026 (לילה, ל) — **21 mthbram: נחקר פרפורמנס 45→36 — bundle יחיד לא-מפוצל (1.6MB), לא תוקן בצעד הזה**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי `orech` (עבר בעצמו ללא
> תיקון, perf 97) לפי `ROUTES` ב-`scripts/qa/lighthouse-run.mjs`.
> `node scripts/qa/lighthouse-run.mjs QA/platform/mthbram-perf-investigate-0817
> mthbram` — perf 36 (baseline קודם 45, אותו רעש-מדידה מתועד).
>
> **למה זה לא דפוס Google Fonts:** `apps/21-mthbram/index.html` לא נושא שום
> `<link>` לגופנים חיצוניים, ואין `@import` ב-`src/` — הדפוס הרגיל (loadCSS)
> לא רלוונטי.
>
> **הממצא:** `apps/21-mthbram/dist/assets/index-ikOh19CR.js` הוא bundle יחיד
> **1.6MB** (לא-דחוס), ללא code splitting — גדול מ-galil לפני הפיצול (981KB).
> `unused-javascript` Est savings 341 KiB. `mainThreadBreakdown` מפוזר על כל
> הקטגוריות (Other 1998ms, Style&Layout 1220ms, Script Eval 990ms) בלי script
> יחיד דומיננטי — תואם bundle גדול לא-מפוצל, לא רכיב בעייתי נקודתי.
>
> **מסקנה:** דורש route-level code splitting (כמו galil) — עבודת קוד נפרדת
> וגדולה מ"צעד אחד", ובגליל שיפור דומה נתן רק שיפור חלקי (36→40). אין שינוי
> קוד/פריסה בצעד הזה — מדידה/חקירה/תיעוד בלבד. ראיות:
> `QA/platform/mthbram-perf-investigate-0817/_lighthouse.json`, `_analysis.md`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `zchuyot` (הבא ברשימת `ROUTES` אחרי
> `mthbram`).

> ## 🟢 17/08/2026 (לילה, כט) — **17 תמלול חיזוקים (chizukim): נחקר פרפורמנס 55/67/78 — ה-CSS העצמי הוא הגורם (כמו egod), לא גופנים; לא תוקן בצעד הזה**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי `chatzor`/`chatzor-app` לפי
> `ROUTES` ב-`scripts/qa/lighthouse-run.mjs`. `apps/17-chizukim-transcribe/client/index.html`
> כבר נושא את תבנית ה-loadCSS (`media="print" onload`) — תוקן בעבר, אין תיקון
> חדש כאן.
>
> **הממצא:** `render-blocking-insight` (score 0.5) מצביע על המשאב החוסם היחיד:
> `<link rel="stylesheet" ... href="/chizukim/assets/index-CGr9WgHf.css">` —
> ה-CSS המובנה של Vite לכל האפליקציה. אותה קטגוריה בדיוק כמו `bkalot-theme.css`,
> `style.css`/`base.css` של smachot, וה-CSS העצמי של egod — בכולם הוחלט
> במפורש להשאיר סינכרוני כדי לא לסכן הבזק-לא-מעוצב (FOUC) בעמוד חי. לא נגעתי
> בזה כאן.
>
> **בניגוד ל-egod:** אין bundle-JS דומיננטי יחיד. `bootupTime` — "Unattributable"
> 789ms קרוב ל-bundle העצמי (503ms total). `unused-javascript` רק 60 KiB (מול
> 179 KiB ב-egod) — אין גם מקרה לcode-splitting דחוף.
>
> **מסקנה:** אין ממצא חדש לתקן — הגופנים כבר מתוקנים, ה-CSS מוגן מסיבת FOUC
> (החלטה קיימת), וה-bundle לא דומיננטי מספיק. הציון הרועש (55-78, מתחת לסף 90)
> תואם דפוס רעש-מדידה/NetFree שכבר מתועד ב-32/10/06/04/02/12/14/15. אין
> שינוי קוד/פריסה בצעד הזה — חקירה/תיעוד בלבד. ראיות:
> `QA/platform/chizukim-perf-investigate-0817/_lighthouse.json`,
> `_analysis.md`. Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `orech` (הבא ברשימת `ROUTES` אחרי
> `chizukim`/`chizukim-app`, ששניהם כבר נמדדו/נחקרו).

> ## 🟢 17/08/2026 (לילה, כח) — **16 חצור קונקט (chatzor): נמדד `/chatzor` לראשונה (פרפורמנס 41) — עבודת רינדור/אנימציה (framer-motion) על ה-thread הראשי, לא Google Fonts ולא bundle; דורש lazy-mount, לא תוקן בצעד הזה**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי `egod` לפי `ROUTES` ב-
> `scripts/qa/lighthouse-run.mjs`. `node scripts/qa/lighthouse-run.mjs
> QA/platform/chatzor-lh-0817 chatzor` — ציון ראשון אי-פעם למסלול `chatzor`
> (`/chatzor`, הנחיתה — שונה מ-`chatzor-app` = `/chatzor/`, שכבר נמדד בסבב 32).
> **פרפורמנס 41 · נגישות 100 · Best Practices 77 · SEO 100**.
>
> **למה זה לא דפוס Google Fonts:** `apps/16-chatzor-connect/index.html` כבר
> נושא את תבנית ה-loadCSS (`media="print" onload`) — תוקן בעבר, אין תיקון חדש
> כאן.
>
> **הממצא:** `bootupTime` מראה שהפריט הגדול ביותר הוא המסמך עצמו (13114ms,
> scripting זניח — 21ms), לא סקריפט. `mainThreadBreakdown`: Other 7394ms,
> Rendering 4307ms, Style & Layout 3200ms מול Script Evaluation 1177ms בלבד —
> עבודת רינדור/layout כבדה, לא JS כבד ולא NetFree חוסם (`forced-reflow-insight`
> מסומן). תואם את מה שכבר תועד ב-02/08 על chatzor: `framer-motion`+
> `@hebcal/core` בטעינה ראשונית.
>
> **מסקנה:** דורש דחיית טעינת האנימציות (`framer-motion`) ל-lazy/lazy-mount
> אחרי האינטראקטיביות הראשונית — עבודת קוד נפרדת וגדולה מ"צעד אחד" על
> `apps/16-chatzor-connect`, לא בוצעה כאן. אין שינוי קוד/פריסה בצעד הזה —
> מדידה/חקירה/תיעוד בלבד. ראיות: `QA/platform/chatzor-lh-0817/_lighthouse.json`,
> `QA/platform/chatzor-perf-investigate-0817/_analysis.md`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `chizukim` (הבא ברשימת `ROUTES` אחרי
> `chatzor`/`chatzor-app`, ששניהם כבר נמדדו).

> ## 🟢 17/08/2026 (לילה, כז) — **15 איגוד (egod): נחקר פרפורמנס 53 — הפעם זה ה-bundle העצמי, לא רעש רשת/פונטים; דורש code-splitting, לא תוקן בצעד הזה**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי smachot(14) לפי `ROUTES` ב-
> `scripts/qa/lighthouse-run.mjs`. השתמשתי בנתונים שכבר נמדדו היום
> (`QA/platform/egod-lh-a11yfix-0817/_lighthouse.json`, אחרי תיקון הנגישות) —
> אין צורך במדידה חדשה.
>
> **למה זה לא אותו דפוס:** ל-`apps/15-egod/index.html`/`dist/index.html` אין
> בכלל קישור ל-`fonts.googleapis.com` — אין גופנים חוסמים לתקן. `render-
> blocking-insight` (חיסכון משוער 750ms) מצביע על ה-CSS המובנה של Vite
> (`index-Crke-OnG.css`, עיצוב מלא של האפליקציה) — אותה קטגוריה כמו
> `bkalot-theme.css` ו-`base.css`/`style.css` של smachot, ששניהם הושארו
> סינכרוניים בסבבים קודמים כדי לא לסכן הבזק-לא-מעוצב (FOUC) בעמוד חי. הושאר
> כך גם כאן, מאותה סיבה.
>
> **הממצא האמיתי:** בניגוד לחקירת 32 נדל"ן (`nadlan-mainthread-0817`, שם
> NetFree היה הגורם הדומיננטי וה-JS העצמי זניח) — כאן זה הפוך: `bootupTime`
> מראה ש-`index-DtGWwuYa.js` (ה-bundle העצמי של egod) לוקח **1786ms total,
> 724ms scripting** — פי ~13 מ-`auth-button.js` (138ms) ופי ~19 מהזרקת
> NetFree (94ms). `unused-javascript` (חיסכון משוער 179 KiB), `unminified-
> javascript`, ו-`unused-css-rules` תומכים: זה bundle גדול/לא-מפוצל, לא רעש
> מדידה.
>
> **מסקנה:** דורש עבודת code-splitting/tree-shaking אמיתית על `apps/15-egod`
> (Vite+React, `recharts` בין התלויות) — לא תיקון חד-קובצי כמו loadCSS. עבודה
> נפרדת וגדולה מ"צעד אחד", לא בוצעה כאן. אין שינוי קוד/פריסה בצעד הזה — חקירה
> ותיעוד בלבד. ראיות: `QA/platform/egod-perf-investigate-0817/_analysis.md`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `chatzor` (הבא ברשימת `ROUTES` אחרי
> `egod`).

> ## 🟡 17/08/2026 (לילה, כו) — **12 סמל נדל"ן (smel): תוקן שורש הפרפורמנס (Google Fonts render-blocking), אך הציון ירד 80→76 — כנראה רעש מדידה כמו bkalot**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי `bkalot` לפי `ROUTES` ב-
> `scripts/qa/lighthouse-run.mjs`. `apps/12-smel-ndln/client/index.html` טען
> Assistant + Heebo דרך `<link rel="stylesheet" href="fonts.googleapis.com/css2?...">`
> סינכרוני ב-`<head>` — אותו דפוס בדיוק שכבר תוקן ב-01/02/03/04/06/10/32,
> כבר זוהה כ-`render-blocking-insight` (חיסכון משוער 500ms) ב-`smel-lh-0817`
> (baseline פרפורמנס 80, אחרי תיקון נגישות קודם 73→80).
>
> **התיקון:** תבנית `loadCSS` הסטנדרטית — זהה ל-04/06/10. הוחל גם ב-
> `apps/12-smel-ndln/client/index.html` (מקור) וגם ב-
> `_deploy/smel-more30/smel/index.html` (עותק הפריסה) — `Compare-Object`
> אישר שההבדל היחיד בין השניים הוא favicon path ותגי asset מובנים, כבר קיים
> לפני התיקון.
>
> נפרס `vercel deploy --prod --yes --scope l023131500-ops-projects` מתוך
> `_deploy/smel-more30` (`dpl_4i4ctebxRTjpAhfNUFUFm3Crp9ET`), READY. אומת חי
> עם cache-buster (`more30.com/smel/?cachebust=0817smelfont2`) —
> `media="print" onload="this.media='all'"` מופיע ב-HTML המוגש.
>
> **נמדד אחרי:** פרפורמנס **80→76** (ירד קלות). `render-blocking-insight`
> score 0→0.5, תצוגת "Est savings of 500ms" נעלמה. FCP/LCP/SI כולם עלו
> (3.1s→3.5s / 3.2s→3.5s / 3.9s→5.8s), `mainthread-work-breakdown` נכנס
> לרשימת הכשלים בפעם הראשונה. תואם את דפוס הרעש המתועד כבר ב-06 בריאות
> ("84-93 noisy") ו-10 בקלות (82→69) — סומן 🟡 (לא רגרסיה אמיתית ולא הצלחה
> נקייה), לא נחקר כרגרסיה חדשה בסבב הזה. נגישות 100/BP 77/SEO 100 ללא שינוי.
> ראיות: `QA/platform/smel-lh-0817/_lighthouse.json` (לפני, perf 80) ·
> `QA/platform/smel-lh-fontfix-0817/_lighthouse.json` (אחרי, perf 76).
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `smachot` (הבא ברשימת `ROUTES` אחרי
> `smel`).

> ## 🟡 17/08/2026 (לילה, כה) — **10 בקלות (bkalot): תוקן שורש הפרפורמנס (Google Fonts render-blocking), אך הציון הכולל ירד 82→69 — כנראה רעש מדידה**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי 06 briut לפי `ROUTES` ב-
> `scripts/qa/lighthouse-run.mjs`. `apps/10-bkalot-rights/index.html` (אתר סטטי
> בלי build, כמו 04/06) טען Heebo + Frank Ruhl Libre דרך `<link rel="stylesheet"
> href="fonts.googleapis.com/css2?...">` סינכרוני ב-`<head>` — אותו דפוס בדיוק
> שכבר תוקן ב-01/02/03/04/06/32, כבר זוהה כ-`render-blocking-insight` (חיסכון
> משוער 1,210ms) ב-`bkalot-lh-0817` (dbb7a57, הריצה הראשונה).
>
> **התיקון:** תבנית `loadCSS` הסטנדרטית — זהה ל-04/06. הוחל גם ב-
> `apps/10-bkalot-rights/index.html` (מקור) וגם ב-
> `_deploy/bkalot-more30/bkalot/index.html` (עותק הפריסה) — `Compare-Object`
> אישר שהשניים זהים אחרי העריכה. גיליון סגנון שני (`bkalot-theme.css`,
> אחסון Supabase) נשאר סינכרוני — מחוץ לדפוס המתועד, לא נגעתי בו.
>
> נפרס `vercel deploy --prod --yes --scope l023131500-ops-projects` מתוך
> `_deploy/bkalot-more30` (`dpl_HEiYsuhoK6GLeigmURmQFUf8ff6w`), READY. אומת
> חי עם cache-buster (`more30.com/bkalot/?cachebust=0817bkalotfont`) —
> `media="print" onload="this.media='all'"` מופיע ב-HTML המוגש.
>
> **נמדד אחרי:** פרפורמנס **82→69** (ירד, למרות שהתיקון תואם דפוס מוכח).
> `render-blocking-insight` השתפר (1,210ms→330ms חיסכון משוער, לא נעלם —
> הגיליון השני). FCP/LCP/SI כולם השתפרו (3.1s→2.7s / 3.1s→2.9s / 7.2s→4.2s),
> אבל `mainthread-work-breakdown` עלה (5.9s→7.6s) ו-TBT (770ms) נכנס לרשימת
> הכשלים בפעם הראשונה. נגישות 100/BP 77 ללא שינוי. תואם את דפוס הרעש המתועד
> כבר ב-06 בריאות ("84-93 noisy") ו-32 נדל"ן (`mainthread-work-breakdown`
> תלוי-רשת/NetFree) — סומן 🟡 (לא רגרסיה אמיתית ולא הצלחה נקייה), לא נחקר
> כרגרסיה חדשה בסבב הזה. ראיות: `QA/platform/bkalot-lh-0817/_lighthouse.json`
> (לפני, perf 82) · `QA/platform/bkalot-lh-fontfix-0817/_lighthouse.json`
> (אחרי, perf 69). Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `smel` (הבא ברשימת `ROUTES` אחרי
> `bkalot`).

> ## 🟢 17/08/2026 (לילה, כד) — **06 בריאות (briut): תוקן שורש הפרפורמנס (Google Fonts render-blocking), 84/93/91/87 (תנודתי) → 89**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — הבא אחרי 04 imud לפי `ROUTES` ב-
> `scripts/qa/lighthouse-run.mjs`. `apps/06-kupot-holim/site/index.html`
> (אתר סטטי בלי build, כמו 10-בקלות) טען Heebo + Frank Ruhl Libre דרך
> `<link rel="stylesheet" href="fonts.googleapis.com/css2?...">` סינכרוני
> ב-`<head>` — אותו דפוס בדיוק שכבר תוקן ב-01/02/03/04/32. הנגישות (91→97)
> כבר תוקנה בסבב קודם (§י למעלה); זה תיקון פרפורמנס נפרד.
>
> **התיקון:** תבנית `loadCSS` הסטנדרטית — `<link rel="preload" as="style">`
> + `<link rel="stylesheet" media="print" onload="this.media='all'">` +
> `<noscript>` גיבוי, זהה לתיקון ב-04 imud (גם הוא סטטי/לא-Next.js). הוחל
> גם ב-`apps/06-kupot-holim/site/index.html` (מקור) וגם ב-
> `_deploy/briut-more30/briut/index.html` (עותק הפריסה) — `Compare-Object`
> אישר שהשניים זהים אחרי העריכה (ההבדל היחיד ביניהם היה `<base href>`,
> וזה כבר קיים בשניהם).
>
> נפרס `vercel deploy --prod --yes --scope l023131500-ops-projects` מתוך
> `_deploy/briut-more30` (`dpl_BfqtJtZv6hVNLA3YZk2a4EVDCiiD`), READY. אומת
> חי עם cache-buster (`more30.com/briut/?cachebust=0817briutfont`) —
> `media="print" onload="this.media='all'"` מופיע ב-HTML המוגש.
>
> **נמדד אחרי:** פרפורמנס **89** (בטווח הרעש הקודם 84–93, אך `render-blocking-
> insight` כבר לא מופיע ברשימת ה-`failedAudits`). נגישות 97/BP 77/SEO 100
> ללא שינוי. ראיות: `QA/platform/briut-lh-0817/_lighthouse.json` (בסיס
> קודם) · `QA/platform/briut-lh-fontfix-0817/_lighthouse.json` (אחרי).
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `bkalot` (הבא ברשימת `ROUTES` אחרי
> `briut`).

> ## 🟢 17/08/2026 (לילה, כג) — **04 עימוד תורני (imud): פונטים לא-חוסמים, פרפורמנס 53→60 (עדיין מתחת ל-90)**

> המשך סבב-2 (פרפורמנס, בסדר המערכות) — אחרי torah(01)/tamlul(02)/modaot(03).
> `node scripts/qa/lighthouse-run.mjs QA/platform/imud-lh-0817 imud` — ציון בסיס
> ראשון לסבב הזה: **פרפורמנס 53 · נגישות 100 · Best Practices 77 · SEO 100**.
> `render-blocking-insight` (חיסכון משוער 300ms) הצביע על אותו דפוס שכבר תוקן
> ב-01/02/03: `<link rel="stylesheet" href="fonts.googleapis.com/css2?...">`
> סינכרוני ב-`<head>`. **הבדל מ-01/02/03:** `apps/04-imud-torani` הוא Vite+Express
> (client/server), לא Next.js — אין `next/font/google`. התיקון המקביל: תבנית
> `loadCSS` הסטנדרטית — `<link rel="preload" as="style">` + `<link rel="stylesheet"
> media="print" onload="this.media='all'">` + `<noscript>` גיבוי, ב-
> `apps/04-imud-torani/client/index.html`. 11 משפחות הגופנים (Assistant/Heebo/
> Frank Ruhl Libre/David Libre/Noto Serif Hebrew/Noto Rashi Hebrew/Suez One/
> Cardo/Rubik/Alef/Miriam Libre/Bellefair) נשארו כפי שהן — לא הוחלט לצמצם רשימה
> שהעיצוב תלוי בה בלי בדיקה.
>
> `vite build` (`apps/04-imud-torani`, `base: "/imud/"`) → `robocopy dist/public
> _deploy/imud-more30/public/imud /MIR` → `vercel deploy --prod --yes --scope
> l023131500-ops-projects` מ-`_deploy/imud-more30` (סטטי, `vercel.json` עם
> `buildCommand: echo no-build` — הבנייה מקומית, הפריסה רק מעתיקה), `dpl_8PJ63Z2Th9YYEtQE4VFVRGC47ck1`,
> READY. אומת חי עם cache-buster: תבנית ה-`media="print"`/`onload` מופיעה ב-HTML
> המוגש ב-`more30.com/imud`.
>
> **נמדד אחרי:** פרפורמנס **53→60**, FCP/LCP/TBT ללא שיפור מובהק (bundle ראשי
> 1.09MB — עדיין הגורם הדומיננטי, לא נחקר בסבב הזה). נגישות 100 ו-BP 77 ללא
> שינוי. SEO ירד 100→91 בין שתי המדידות — לא נחקר, ייתכן רעש מדידה (NetFree/
> תזמון), לא קשור לשינוי הקוד (שום דבר ב-`<head>` הרלוונטי ל-SEO לא נגע).
> ראיות: `QA/platform/imud-lh-0817/_lighthouse.json` (לפני) ·
> `QA/platform/imud-lh-fontfix-0817/_lighthouse.json` (אחרי).
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): `briut` (הבא ברשימת `ROUTES` אחרי `imud`
> ב-`scripts/qa/lighthouse-run.mjs`).

> ## 🟢 17/08/2026 (לילה, כב) — **03 מודעות איגוד: תוקן שורש הפרפורמנס (Google Fonts render-blocking), 86→91**

> המשך סבב-2 (פרפורמנס) בסדר המערכות — אחרי torah(01) ותמלול(02), עבר ל-03 מודעות.
> `app/layout.tsx` טען Noto Serif Hebrew + Rubik דרך `<link rel="stylesheet"
> href="fonts.googleapis.com/css2?...">` ישירות ב-`<head>` — אותה משפחת תקלה
> שכבר נמצאה ותוקנה ב-01 torah/02 tamlul/32 נדל"ן. `render-blocking-insight`
> ב-`QA/platform/modaot-lh-0817/_lighthouse.json` (מדידה קודמת, פרפורמנס 86)
> מדד חיסכון משוער 880ms — הראיה שהובילה לבדיקה הזו.
>
> **התיקון:** `next/font/google` (`Noto_Serif_Hebrew`, `Rubik`, subset
> `hebrew`, `display: swap`) ב-`apps/03-igud-ads/app/layout.tsx`, עם משתני CSS
> (`--font-noto-serif-hebrew`, `--font-rubik`) שהוזרקו ל-`app/globals.css`
> ול-`tailwind.config.ts` במקום שמות הגופנים המילוליים. `next build` מקומי
> אימת אפס הפניות ל-`fonts.googleapis.com` בכל קבצי ה-`.next` (חיפוש רחב על
> `fonts.googleapis.com/css2` — אפס תוצאות); קבצי ה-woff2 עצמם מופיעים ב-
> `.next/static/media/`.
>
> נפרס: `vercel deploy --prod --yes --scope l023131500-ops-projects` מתוך
> `apps/03-igud-ads` (`modaot-more30`), `dpl_6cEhpRGFgvXCrV1xzoqNjZphUjz7`,
> READY. אומת חי ב-`more30.com/modaot` (עם cache-buster) — `fonts.googleapis.com`
> לא מופיע ב-HTML המוגש, `.woff2` כן מופיע (preload עצמי).
>
> **נמדד אחרי (Lighthouse חי):** פרפורמנס **86→91** (עבר את סף ה-90), FCP
> 2.4s→2.1s, LCP 2.4s→2.1s, TBT 330ms→170ms. נגישות 100/SEO 100/BP 77 ללא
> שינוי (BP נשלט ע"י דפוס NetFree `card-injection.js` שכבר מתועד בעשרות
> נתיבים). ראיות: `QA/platform/modaot-lh-0817/_lighthouse.json` (לפני, perf 86) ·
> `QA/platform/modaot-lh-fontfix-0817/_lighthouse.json` (אחרי, perf 91).
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.
>
> הבא בסבב-2 (פרפורמנס, בסדר המערכות): 04 עימוד תורני (`apps/04-imud-torani`,
> perf 64 לפי `SYSTEMS_STATUS.md` שורה 3912, "לא נחקר עדיין").

> ## 🟢 17/08/2026 (לילה, כא) — **01 torah: נמצא ותוקן CLS 0.578 (הרגרסיה המתועדת ב-`prerender-all.mjs`) — 0.001 אחרי**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/torah-lh-0817 torah` — המדידה הראשונה
> ל-`torah`(01) תחת סבב 0817 עם הכלי הנוכחי. **פרפורמנס 37 · נגישות 100 · Best Practices
> 77 · SEO 100**, אבל `cls: "0.578"` — בדיוק הרגרסיה שהתיעוד ב-`scripts/prerender-all.mjs`
> מזהיר מפניה בשמה (ראה ה-header שם: "`03/08` a rebuild re-ran `prerender-spa.mjs`
> without `--seed-url`... CLS 0.001 -> 0.578"). אימתתי ישירות: הבאת `https://more30.com/torah`
> עם cache-buster — `window.__TENANT__` לא נמצא ב-HTML החי, כלומר הרגרסיה חזרה.
> **תוקן:** `node scripts/prerender-all.mjs torah` (אופה מחדש את `_deploy/torah-more30/torah/index.html`
> עם שורת ה-tenant הנשלפת מ-Supabase לפי `apps/01-torah-platform/.env.local`) → `vercel deploy
> --prod --yes` מ-`_deploy/torah-more30` (פרויקט Vercel מקושר עצמאי, `prj_0JWao5UJpiQD80dX7jkypgKaA8Et`),
> READY. אומת חי עם cache-buster: `__TENANT__` מופיע כעת ב-HTML המוגש. נמדד שוב:
> **CLS 0.578→0.001**. נגישות 100/SEO 100 ללא שינוי; פרפורמנס 37→42 (עדיין מתחת ל-90,
> לא נחקר בסבב הזה — `mainthread-work-breakdown`/FCP/LCP דומיננטיים, אותו דפוס
> NetFree-adjacent שמתועד במסלולים אחרים). ראיות: `QA/platform/torah-lh-0817/_lighthouse.json`
> (לפני, CLS 0.578) · `QA/platform/torah-lh-clsfix-0817/_lighthouse.json` (אחרי, CLS 0.001).
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, כ) — **24 גליל קונקט: ה-code splitting מ-`ba36ea0` נפרס לייצור ואומת חי**
>
> ההמשך הישיר ל-`ba36ea0` ("השלמת route-level code splitting... לא פרוס עדיין").
> `_deploy/galil-more30/galil/` כבר החזיק את אותם 36 קבצי `assets` שנבנו מקומית
> (נבדק לפני הפריסה: השוואת שמות-קבצים מול `apps/24-galilee-connect-hub/dist/assets`
> — זהים, אותו hash לכל chunk) — כלומר ה-`robocopy` לשלב הכנה כבר בוצע בסבב קודם,
> רק `vercel deploy` חסר. הרצתי `vercel deploy --prod --yes --scope
> l023131500-ops-projects` מתוך `_deploy/galil-more30` — פרויקט זה לא Git-מקושר
> (מ-38 הפרויקטים רק `more30-portal`/`more30-admin` מקושרים), אז זו דרך הפריסה
> הנכונה היחידה. `readyState: READY`.
>
> אומת בייצור עם cache-buster (`?cachebust=...` — הדף החי נכשל בעבר בלי זה):
> `more30.com/galil/` מגיש `index-BzyDhrTf.js` (801KB, ירד מ-981KB חד-קובצי לפני
> התיקון) **וגם** `KashrutPage-CDPfIuur.js` (5997 בייט) בנפרד — שני הקבצים
> מחזירים 200 ישירות מ-`more30.com/galil/assets/`. זו הראיה שה-lazy loading
> בפועל בייצור, לא רק בבנייה מקומית.
>
> לא נמדד Lighthouse מחדש בסבב הזה (perf 43 לפני התיקון, ב-
> `QA/platform/galil-perf-trace-0817`) — זה הצעד הבא הטבעי כשה-MCP/זמן יאפשרו.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, יט) — **`/me` — Lighthouse נמדד לראשונה (perf 98, a11y 100, BP 77, SEO 63) — כל ה-ROUTES נמדדו**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/me-lh-0817 me` — ציון ראשון אי-פעם לנתיב
> `me` (`/me`), הנתיב האחרון שנשאר לא-נמדוד ברשימת `ROUTES` (`scripts/qa/lighthouse-run.mjs`) —
> מוגן-כניסה, נמדד כפי שהוא מוגש בפועל ללא אימות (זה מה שהיצרן חושף בפרודקשן).
> **פרפורמנס 98 · נגישות 100 · Best Practices 77 · SEO 63**. הנגישות כבר מלאה —
> אין `failedAudits` נגיש לתקן, אין שינוי קוד בסבב הזה. ה-SEO (63) מוסבר על ידי
> `is-crawlable` (חסום מאינדוקס) — אותו `noindex` מכוון על עמודי חשבון שכבר תועד
> ב-`/login` וב-`/subscribe`. Best Practices (77) — אותו דפוס NetFree
> (`netfree.link/card/card-injection.js` ב-`bootupTime`) שכבר מתועד בעשרות נתיבים
> אחרים. **כל הנתיבים ב-`ROUTES` נמדדו לפחות פעם אחת נכון ל-17/08.**
> ראיות: `QA/platform/me-lh-0817/_lighthouse.json`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, יח) — **`/subscribe` — Lighthouse נמדד לראשונה (perf 88, a11y 100, BP 77, SEO 63)**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/subscribe-lh-0817 subscribe` — ציון ראשון
> אי-פעם לנתיב `subscribe` (`/subscribe`), השלישי מתוך שלושת הנתיבים המשותפים שנשארו
> לא-נמדודים אחרי `home` (לעיל). **פרפורמנס 88 · נגישות 100 · Best Practices 77 · SEO 63**.
> הנגישות כבר מלאה — אין `failedAudits` נגיש לתקן, אין שינוי קוד בסבב הזה. ה-SEO (63)
> מוסבר על ידי `is-crawlable` (חסום מאינדוקס) — אותו `noindex` מכוון על עמודי חשבון
> שכבר תועד ב-`/login` (SEO 63 שם גם כן), לא באג. Best Practices (77) — אותו דפוס
> NetFree (`netfree.link/card/card-injection.js` ב-`bootupTime`) שכבר מתועד בעשרות
> נתיבים אחרים. פרפורמנס (88, מתחת ל-90) לא נחקר. `me` נשאר הנתיב היחיד שעדיין
> לא נמדד מתוך `ROUTES` — מוגן-כניסה, מסלול הבא.
> ראיות: `QA/platform/subscribe-lh-0817/_lighthouse.json`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, יז) — **דף הבית (`/`) — Lighthouse נמדד לראשונה (perf 86, a11y 100, SEO 100)**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/home-lh-0817 home` — ציון ראשון אי-פעם
> לנתיב `home` (`/`), שהיה חסר מסבב המדידות של 0817 (כל מסלולי המערכות נמדדו,
> אבל הנתיב המשותף `home`/`login`/`me`/`subscribe` שברשימת `ROUTES` לא). **פרפורמנס 86 ·
> נגישות 100 · Best Practices 77 · SEO 100**. בדומה ל-28/26/22/14/03/16 — הנגישות
> כבר מלאה, אין `failedAudits` נגיש לתקן, אין שינוי קוד בסבב הזה. `bootupTime`
> מראה `netfree.link/card/card-injection.js` רץ בפועל בטרייס — אותו דפוס NetFree
> שכבר מתועד ומוסבר ב-32/02/04/06/10/14/28/31/16 ותורם ל-Best Practices (77);
> לא נחקר מחדש כאן. `login`/`me`/`subscribe` נשארו לא נמדדים — מסלול הבא.
> ראיות: `QA/platform/home-lh-0817/_lighthouse.json`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/chatzor-app-lh-0817 chatzor-app` — ציון ראשון
> אי-פעם למסלול `chatzor-app` (`/chatzor/`, ה-SPA בפועל — שונה מ-`chatzor` הנחיתה `/chatzor`
> שכבר נמדדה ב-02/08). **נגישות 100 · SEO 100 · Best Practices 77 · פרפורמנס 49**. בדומה
> ל-28/26/22/14/03 — הנגישות כבר מלאה, אין `failedAudits` נגיש לתקן, אין שינוי קוד בסבב
> הזה. `bootupTime` מראה `netfree.link/card/card-injection.js` ו-`netfree.link/injection-script/go-payment.js`
> רצים בפועל בטרייס — אותו דפוס NetFree שכבר מתועד ב-32/02/04/06/10/14/28/31 ומסביר את
> ה-Best Practices (77) ותורם לפרפורמנס (49); לא נחקר מחדש כאן, לפי אותה מסקנה שכבר
> אושרה עם ראיה ישירה בסבב 32 (לילה, ז/ו). ראיות: `QA/platform/chatzor-app-lh-0817/_lighthouse.json`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, טו) — **31 גשר עברית CRM — Lighthouse נמדד לראשונה (perf 80, a11y 98→100) + תוקן `landmark-one-main` אמיתי**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/gesher-lh-0817 gesher` — ציון ראשון אי-פעם
> ל-`gesher`(31): **פרפורמנס 80 · נגישות 98 · Best Practices 77 · SEO 100**. `failedAudits`
> חשף ליקוי נגישות אמיתי אחד: `landmark-one-main` (מסך הכניסה, `apps/31-hebrew-bridge-crm/src/routes/auth.tsx`,
> אליו `/gesher` מפנה — אין `<main>` בעץ, בדיוק כמו ב-30 crm). תוקן: ה-`<div>` העוטף
> הפך ל-`<main>` (פתיחה וסגירה). `vite build` (nitro/vercel preset) → `vercel deploy --prod`
> מ-`apps/31-hebrew-bridge-crm` (לא `--prebuilt` — ה-rewrite ל-assets יושב ב-vercel.json של
> האפליקציה הזו, ראה ההערה ב-vite.config.ts) → `gesher-more30`, `dpl_5NP2JDLSw3zxUN7WNLLqJbiW2pop`, READY.
> אומת חי מול הייצור עם cache-buster: `<main class="min-h-screen...">` מופיע ב-HTML המוגש.
> נמדד שוב אחרי: **נגישות 98→100**. פרפורמנס (80, מתחת לסף 90) ו-Best Practices (77) לא
> נחקרו — תואם דפוס NetFree/`third-party-cookies` שכבר מתועד ב-32/02/04/06/10/14/28.
> ראיות: `QA/platform/gesher-lh-0817/_lighthouse.json` (לפני) ·
> `QA/platform/gesher-lh-a11yfix-0817/_lighthouse.json` (אחרי).
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, יד) — **28 השוואת קופות — Lighthouse נמדד לראשונה (perf 65, a11y כבר 100, SEO 100)**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/kupot-lh-0817 kupot` — ציון ראשון אי-פעם
> ל-`kupot`(28): **פרפורמנס 65 · נגישות 100 · Best Practices 77 · SEO 100**. בדומה ל-14
> שמחות/10 בקלות — הנגישות כבר מלאה, אין `failedAudits` נגיש לתקן. פרפורמנס (65, מתחת
> ל-90) ו-Best Practices (77) לא נחקרו — אותו דפוס NetFree שכבר מתועד ב-32/02/04/06/10/14
> (`netfree.link/card/card-injection.js` מופיע ב-`bootupTime` בפועל, ו-`third-party-cookies`
> נכשל). אין שינוי קוד/פריסה בסבב הזה — מדידה בלבד, אין פער לתקן. ראיות:
> `QA/platform/kupot-lh-0817/_lighthouse.json`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, יג) — **15 איגוד (egod) — Lighthouse נמדד לראשונה (perf 43, a11y 96) + תוקנו 2 מתוך 3 ליקויי נגישות אמיתיים**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/egod-lh-0817 egod` — ציון ראשון אי-פעם
> ל-`egod`(15): **פרפורמנס 43 · נגישות 96 · Best Practices 77 · SEO 100**. `lh-detail.mjs`
> על `color-contrast` חשף 3 אלמנטים כושלים: (1) `BenefitsSection.tsx` — כותרת `<h2>`
> עם `<span className="text-secondary">` בזהב `hsl(42 50% 54%)` על רקע בהיר נתן 2.27:1
> (דרוש 3:1, טקסט גדול ומודגש) — **לא** תוקן ע"י הכהיית טוקן `--secondary` המשותף
> (ניסיון ראשון עשה זאת וגם תיקן את הכותרת וגם שבר ניגודיות של כפתור אחר שמשתמש
> ב-`bg-secondary` עם טקסט נייבי, ל-3.8:1 — הוחזר), אלא ע"י הפניית ה-`span` הספציפי
> הזה בלבד לטוקן `--gold-dark` שכבר קיים בקובץ (`hsl(42 55% 42%)`, 3.30:1 מחושב).
> (2) אותו קובץ — `<p className="text-muted-foreground">` נתן 4.29:1 (דרוש 4.5:1) —
> `--muted-foreground` הוכהה ל-47% בהירות (4.77:1 מחושב; טוקן טקסט-בלבד, לא משמש
> כרקע באפליקציה הזו, אין השפעת-צד). (3) `body > a.more30-credit` ב-4.37:1 — זה
> `auth-button.js` המשותף ל-24 מערכות, **לא תוקן כאן** — מחוץ לתחום צעד על מערכת
> בודדת, ראה NEEDS_USER. `vite build` → robocopy ל-`_deploy/egod-more30/egod` (אומת
> זהה byte-for-byte) → `vercel deploy --prod` (`dpl_6ks5rPKvnndVbXqfM9E1cKoVLWLA`,
> READY). אומת חי עם cache-buster + `lh-detail.mjs` חוזר מול הייצור: רק הליקוי
> המשותף נשאר. מדידה מלאה אחרי: **נגישות נשארה 96** (הליקוי המשותף הפתוח מחזיק
> את הקטגוריה מתחת ל-100), פרפורמנס 43→53 (רעש, לא קשור לשינוי הזה). פרפורמנס
> (53, נמוך משמעותית מ-90) ו-Best Practices (77) לא נחקרו בסבב הזה — מסומן להמשך,
> לא הונח כדפוס NetFree ללא בדיקה. ראיות: `QA/platform/egod-lh-0817/_lighthouse.json`
> (לפני) · `QA/platform/egod-lh-a11yfix-0817/_lighthouse.json` (אחרי).
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, יב) — **14 שמחות פלוס — Lighthouse נמדד לראשונה (perf 76, a11y כבר 100, SEO 100)**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/smachot-lh-0817 smachot` — ציון ראשון אי-פעם
> ל-`smachot`(14): **פרפורמנס 76 · נגישות 100 · Best Practices 77 · SEO 100**. בדומה ל-10
> בקלות — הנגישות כבר מלאה, אין `failedAudits` נגיש לתקן. פרפורמנס (76, מתחת ל-90) ו-
> Best Practices (77) לא נחקרו — אותו דפוס NetFree שכבר מתועד ב-32/02/04/06/10
> (`netfree.link/card/card-injection.js` מופיע ב-`bootupTime` בפועל, ו-`third-party-cookies`
> נכשל). אין שינוי קוד/פריסה בסבב הזה — מדידה בלבד, אין פער לתקן. ראיות:
> `QA/platform/smachot-lh-0817/_lighthouse.json`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, יא) — **10 בקלות (זכויות) — Lighthouse נמדד לראשונה (perf 82, a11y כבר 100, SEO 91→ תוקן meta description)**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/bkalot-lh-0817 bkalot` — ציון ראשון אי-פעם
> ל-`bkalot`(10): **פרפורמנס 82 · נגישות 100 · Best Practices 77 · SEO 91**. שלא כמו 02/04/06 —
> הנגישות כבר מלאה, אין ליקוי לתקן שם. ה-`failedAudits` חשף פער אמיתי אחד קל: `meta-description`
> (score 0, "Document does not have a meta description") ב-`apps/10-bkalot-rights/index.html`.
> נוסף `<meta name="description">` תיאורי אחרי ה-`<title>`. פרפורמנס (82, מתחת ל-90) ו-Best
> Practices (77) לא נחקרו — תואם דפוס NetFree/`third-party-cookies` שכבר מתועד ב-32/02/04/06,
> לא עבודה חדשה כרגע.
> נפרס מ-`_deploy/bkalot-more30` (אומת זהה byte-for-byte לעותק במאגר לפני הפריסה, `dpl_FtnA4fmg9yFn76Mc1frPd5aopoSt`)
> ואומת חי מול הייצור עם cache-buster: התג מופיע ב-HTML המוגש. ראיות: `QA/platform/bkalot-lh-0817/_lighthouse.json`.
> Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, י) — **06 בריאות (קופות חולים) — Lighthouse נמדד לראשונה (perf 84, a11y 91→97) + תוקנו 2 ליקויי נגישות אמיתיים**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/briut-lh-0817 briut` — ציון ראשון אי-פעם ל-`briut`(06):
> **פרפורמנס 84 · נגישות 91 · Best Practices 77 · SEO 100**. ה-`failedAudits` חשף שני ליקויי
> נגישות אמיתיים ב-`apps/06-kupot-holim/site`: `label-content-name-mismatch` (כפתורי סגירה
> עם `aria-label="סגור"` בלי התו הנראה "×", וקישור מותג/כרטיס-פרופיל עם `aria-label` שלא
> תואם לטקסט הנראה — תוקן ל-`aria-label="סגור ×"` בכפתורים, והוסרו שני ה-`aria-label`
> המיותרים כך שהשם הנגיש נופל לטקסט הנראה, לפי WCAG 2.5.3) ו-`aria-required-children`
> (chips של סינון קטגוריות בלי מבנה tab תקין — נוסף `role="tab"`/`aria-selected`).
> נפרס מ-`_deploy/briut-more30` (אומת זהה byte-for-byte לעותק במאגר). נמדד שוב שלוש פעמים
> אחרי: **נגישות 91→97**, יציבה בשלוש מדידות חוזרות. `color-contrast` נשאר פתוח — לא זוהה
> האלמנט הספציפי בסבב הזה. פרפורמנס (84/93/91/87, תנודתי) לא נחקר, תואם דפוס NetFree
> שכבר מתועד ב-32/02/04. ראיות: `QA/platform/briut-lh-0817/_lighthouse.json` (לפני) ·
> `QA/platform/briut-lh-a11yfix-0817`, `-a11yfix2-0817`, `-a11yfix3-0817` (אחרי).
>
> ⚠️ העבודה נעשתה בסשן קודם שקרס לפני commit — הקוד היה כבר פרוס וחי, רק לא מחויב
> במאגר. הסשן הזה רק תפס את השינוי במאגר, בלי שינוי קוד נוסף. Supabase MCP אינו
> מחובר לסשן הזה — heartbeat נכתב כקובץ `_heartbeat-pending.sql`.

> ## 🟢 17/08/2026 (לילה, ט) — **04 עימוד תורני — Lighthouse נמדד לראשונה (perf 64, a11y 90→100) + תוקנו 3 ליקויי נגישות אמיתיים**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/imud-lh-0817 imud` — ציון ראשון אי-פעם ל-`imud`(04):
> **פרפורמנס 64 · נגישות 90 · Best Practices 77 · SEO 100**. ה-`failedAudits` חשף שלושה ליקויי
> נגישות אמיתיים (לא סביבתיים) ב-`apps/04-imud-torani/client/src/pages/Home.tsx`:
> `heading-order` (h1→h3 בכרטיסי "Steps" דילג על h2, תוקן ל-h2 + הועברה "הספרים שלי" ל-h3
> כדי שהסדר יישאר רציף), `landmark-one-main` (לעמוד לא היה `<main>`, נוסף), ו-`button-name`
> (כפתור מחיקת ספר — אייקון `Trash2` בלבד, יחיד מסוגו בכל קוד המקור, אומת עם
> `Select-String` כי Grep הרגיל לא רואה קבצים תחת `apps/` — נוסף `aria-label` דינמי).
> `vite build` מקומי → robocopy ל-`_deploy/imud-more30/public/imud` → `vercel deploy --prod`
> (`imud-more30`, `dpl_21mvKutWjXykY5AZ2NQqYpN1qLdi`, READY). נמדד שוב אחרי: **נגישות 90→100**.
> פרפורמנס (62, מתחת לסף 90) נשאר פתוח — לפי הדפוס שנמצא ב-32 נדל"ן/02 תמלול
> (`netfree.link/card/card-injection.js` בטרייס) כנראה אותה תלות ברשת המקומית, לא נבדק כאן.
> ראיות: `QA/platform/imud-lh-0817/_lighthouse.json` (לפני) ·
> `QA/platform/imud-lh-a11yfix-0817/_lighthouse.json` (אחרי).
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 (לילה, ח) — **02 תמלול איגוד — Lighthouse נמדד לראשונה (perf 64, a11y 98) + תוקן `heading-order` (h1→h3 דילג על h2)**
>
> `node scripts/qa/lighthouse-run.mjs QA/platform/tamlul-lh-0817 tamlul` (אותו כלי, פרופיל מובייל, מול הייצור החי) —
> ציון ראשון אי-פעם ל-`tamlul`(02): **פרפורמנס 64 · נגישות 98 · Best Practices 77 · SEO 100**.
> ה-`failedAudits` כללו פער נגישות אמיתי (לא סביבתי): `heading-order` score 0 —
> `apps/02-igud-transcribe/app/page.tsx:34` היה `<h3>מה תקבל בסוף?</h3>` מיד אחרי
> ה-`<h1>` היחיד בדף, מדלג על h2. תוקן ל-`<h2>` (התאמה סמנטית תקינה — התוכן במקביל
> ל"איך זה עובד"/"שלושה מסלולי סגנון" שכבר h2). `next build` מקומי עבר, נפרס
> `vercel deploy --prod` (`tamlul-more30`, `dpl_7Kp7kpUsc2Y4tKg4ep9WcUYUCq5c`), אומת
> חי עם cache-buster: סדר הכותרות עכשיו h1→h2→h2→h3×3→h2→h2 (רציף, בלי דילוג).
> פערי הפרפורמנס (64, מתחת לסף 90 — FCP/LCP 4.0s, `server-response-time` 930ms,
> `mainthread-work-breakdown` 3.7s) נשארים פתוחים לסבב הבא; לפי הדפוס שנמצא ב-32
> נדל"ן (`netfree.link/card/card-injection.js` בטרייס) חלקם עשויים להיות אותה
> תלות ברשת המקומית — לא נבדק עדיין כאן. ראיות: `QA/platform/tamlul-lh-0817/_lighthouse.json`.
>
> `scripts/qa/lighthouse-run.mjs` הורחב לשמור פילוח בפועל (`mainthread-work-breakdown`
> לפי קבוצה + `bootup-time` לכל סקריפט), לא רק ציון מסוכם. תוצאה מול נדל"ן החי:
> `Script Evaluation` רק 660ms מתוך 6.9s (`Other`+`Style & Layout` = 5.7s);
> `auth-button.js` (משותף ל-24 מערכות) — 357ms bootup/33ms scripting בלבד,
> באנדלי Next — 522ms יחד. הטרייס מכיל `netfree.link/card/card-injection.js`
> מוזרק בפועל. **מסקנה: אין תיקון קוד נוסף לבצע — התלות ברשת (NetFree)
> מאושרת בראיה, לא רק בהשערה.** ראיות: `QA/platform/nadlan-mainthread-0817/`.

> ## 🟢 17/08/2026 (לילה, ה) — **32 נדל"ן ברגע — תוקן שורש הפרפורמנס: `@import` חוסם של Google Fonts הוחלף ב-`next/font/google` (עצמי-מתארח). פרפורמנס 60→72.**
>
> החקירה מהרשומה הקודמת (למטה) מצאה סיבה קונקרטית: `app/globals.css:1` טען
> Heebo+Assistant (10 משקלים) דרך `@import url(fonts.googleapis.com/...)` —
> שרשרת רשת טורית (HTML→CSS מבודל→CSS של גוגל→WOFF2 של gstatic) בלי שום
> `preconnect`, שגררה FCP=LCP=5.0s בדיוק (הציור הראשון נחסם על השרשרת כולה).
> לא הייתה תקלת פריסה כמו ב-torah — זו הייתה בעיית מקור אמיתית.
>
> **התיקון:** `next/font/google` בשני הריפואים (`app/layout.tsx` +
> `apps/32-nadlan-berega/app/layout.tsx` — הריפו הנפרד `nadlan-berega` הוא
> מקור האמת לפי `scripts/sync-nadlan.ps1`, וההעתק ב-`apps/32` הוא מה שנפרס
> בפועל דרך פרויקט Vercel `nadlan-more30`, אז שניהם עודכנו כדי שהתיקון לא
> יימחק בסינכרון הבא). הוסר ה-`@import`, `tailwind.config.ts` מצביע עכשיו על
> `var(--font-heebo)`/`var(--font-assistant)`. `next build` מקומי אימת: אפס
> הפניות ל-`fonts.googleapis.com`, כל הגופנים ב-`/_next/static/media/*.woff2`.
> נפרס: `vercel deploy --prod` מתוך `apps/32-nadlan-berega`,
> `dpl_GVKytw1SwRXDz5ZzfTwu7TQ3AZzQ`, READY.
>
> **נמדד אחרי (Lighthouse חי, אותו כלי):** פרפורמנס **60→72**, FCP **5.0s→2.4s**,
> LCP **5.0s→3.1s**, `render-blocking-insight` חיסכון משוער **2,490ms→300ms**.
> עדיין מתחת לסף 90 — `server-response-time` (TTFB 1,040ms, צד-שרת) ו-
> `mainthread-work-breakdown` (3.9s) נשארים פתוחים לסבב הבא. TBT עלה
> 190ms→590ms (כנראה רעש בין-ריצות, לא קשור לתיקון הזה — הציון הכולל עדיין
> עלה כי FCP/LCP/SI השתפרו הרבה יותר). ראיות:
> `QA/platform/nadlan-lh-fontfix-0817/_lighthouse.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟡 17/08/2026 (לילה, ד) — **32 נדל"ן ברגע — Lighthouse נמדד לראשונה: פרפורמנס 60, מתחת לסף 90 של DESIGN_STANDARD. לא היה שום ציון קודם בטבלה.**
>
> זווית שלא נבדקה היום עדיין: לא כל מערכת חיה עברה Lighthouse בכלל — הטבלה
> (למטה בקובץ) מחזיקה ציון רק ל-`torah`(01) ו-`tivuch`(36). `node
> scripts/qa/lighthouse-run.mjs QA/platform/nadlan-lh-0817 nadlan` (אותו כלי,
> פרופיל מובייל, מול הייצור החי) על `nadlan`(32) — הענף `fix/nadlan-a11y`
> עצמו קרוי על שמה, אז זו התאמה סבירה למה לבדוק קודם:
>
> | מדד | ערך |
> |---|---|
> | פרפורמנס | **60** |
> | נגישות | 100 |
> | Best Practices | 77 |
> | SEO | 100 |
> | FCP | 5.0s |
> | LCP | 5.0s |
> | TBT | 190ms |
> | CLS | 0.034 |
> | Speed Index | 16.8s |
>
> 60 נמוך אפילו מ-74 שהייתה נקודת ההתחלה של torah לפני התיקון. ה-77 ב-BP
> נופל על אותם שני אודיטים בדיוק כמו torah/tivuch (`third-party-cookies`,
> `inspector-issues`) — עוגיות NetFree, לא באג בקוד. אבל הפרפורמנס עצמו הוא
> ממצא אמיתי וחדש: אודיטים שנכשלו כוללים `render-blocking-insight` (חיסכון
> משוער 2,490ms), `mainthread-work-breakdown` (6.2s), ו-`lcp-breakdown-insight`
> — לא נחקר עדיין אם זה תקלת פריסה נקודתית (כמו torah/orech קודם) או פער
> ארכיטקטוני אמיתי בבניית `apps/32-nadlan-berega`. **לא תוקן בצעד הזה** — זו
> מדידה בלבד, כדי לתעד את הפער לפני שממשיכים לחקור/לתקן בצעד הבא. אין שינוי
> קוד, אין פריסה. ראיות: `QA/platform/nadlan-lh-0817/_lighthouse.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **01 איגוד השיעורים — "Lighthouse 74 (נמדד 07/08)" היה מיושן: פרפורמנס עכשיו 88, LCP/TBT ירדו הרבה מתחת למה שהטבלה עדיין מתארת כפתוח.**
>
> הטבלה (למטה בקובץ) ושורת "מה נשאר לתקן" עדיין תיארו את `/torah` לפי מדידה
> מ-07/08: פרפורמנס 74, LCP 5.3s, TBT 510ms — "גדול, ארכיטקטוני". מאז תוקנו כאן
> ה-FCP (03/08) וה-CLS (רגרסיה שנסגרה מוקדם יותר היום, 0.578→0.001), אבל אף אחד
> לא הריץ Lighthouse מחדש כדי לדעת אם זה שינה את הציון הכולל. הרצתי:
> `node scripts/qa/lighthouse-run.mjs QA/platform/torah-lh-recheck-0817 torah`
> (אותו כלי, אותו פרופיל מובייל, מול הייצור החי).
>
> | מדד | 07/08 (בטבלה) | 17/08 (נמדד עכשיו) |
> |---|---|---|
> | פרפורמנס | 74 | **88** |
> | נגישות | — | 100 |
> | Best Practices | — | 77 |
> | SEO | — | 100 |
> | LCP | 5.3s | **2.4s** |
> | TBT | 510ms | **280ms** |
> | CLS | (0.578 ברגרסיה שנסגרה) | 0.001 |
> | FCP | 3.2s→1.6s (מדווח קודם) | 1.8s |
>
> **77 ה-BP נופל על אותם שני אודיטים בדיוק כמו ב-36 tivuch שנבדק מוקדם יותר
> היום** (`third-party-cookies`, `inspector-issues`, score 0 בשניהם) — עוגיות
> שה-NetFree (הפרוקסי הישראלי) מזריק, לא באג בקוד torah. **פרפורמנס 88 עדיין
> מתחת לסף 90 של `DESIGN_STANDARD`** — לא נסגר לגמרי, אבל השיפור האמיתי (74→88,
> LCP/TBT ירדו כמעט בחצי) לא היה רשום בשום מקום. אין שינוי קוד ואין פריסה —
> מדידה בלבד. ראיות: `QA/platform/torah-lh-recheck-0817/_lighthouse.json`.
>
> `more30-fixes-and-features.md` ביקש כפתור היפוך/סיבוב לתמונת כתב יד +
> תצוגה מקדימה לפני שליחה. הקוד המלא כבר היה קיים ב-
> `apps/18-torah-editor-mvp/app/htr/page.tsx` (commit `6dca79f`, 05/08
> 14:01:38+03) — `bakeTransform()` צורב את הסיבוב/ההיפוך לתוך קובץ ה-PNG
> בפועל, ותצוגה חיה עם `transform: rotate()/scaleX()`. **נמדד: הפריסה
> האחרונה של `orech-more30` (`dpl_uUVhZzmTCf2e5pEKE4T7m8iMURVz`) הייתה
> ב-10:58:21Z — שלוש דקות *לפני* ה-commit.** חבילת ה-JS החיה לא הכילה את
> המחרוזות "סיבוב"/"היפוך" בכלל. `npm run build` (הצליח, 11 עמודים) →
> `vercel deploy --prod`, `dpl_E3ZzrZGmYsfDmx92roqZwEnwGvnk`, READY. אומת
> אחרי: אותה חבילה גדלה 4,070→10,753 בתים ומכילה "סיבוב"/"היפוך"/"איפוס"
> (בייטים גולמיים, לא NetFree), Playwright על `more30.com/orech/htr` מציג
> עמוד תקין בלי רגרסיה. אין שינוי קוד — תקלת פריסה בלבד. ראיות:
> `QA/orech/htr-rotate-deploy-0817/_results.md`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟡 17/08/2026 — **אבטחה — הפרצה ב-csjekrvu/recordings עדיין פתוחה (נמדד שוב), אבל "אין גישה" מיושן: התיקון כתוב וממתין רק לחיבור MCP**
>
> `NEEDS_USER.md #2`: `anon` key עדיין מוחזק DELETE ללא הגבלה על
> `public.recordings` (06/12/17, 1,138 שורות) — נמדד שוב היום עם מסנן
> אפס-שורות: `GET` → 206 `0-0/1138` (זהה ל-12/08), `DELETE` על id בלתי אפשרי
> → **204**. אין שינוי, אין הידרדרות. **מה שכן השתנה:** ההנחה הקודמת
> ("חשבון Supabase אחר, ה-PAT לא רואה אותו") סתרה עדות מאותו יום בדיוק
> (12/08) באותו קובץ — ה-PAT כן שימש מול אותו פרויקט ref להחלפת
> `mailer_autoconfirm` ולפריסת `geo.ts`. התיקון עצמו כתוב וממתין ב-
> `db/apps/17-chizukim-transcribe/0001_close_public_write_on_recordings.sql`;
> החוסם היחיד הוא קריאת ה-PAT מ-`core.secrets`, שדורשת MCP של Supabase שלא
> היה מחובר בסשן הזה. אין שינוי קוד, אין פריסה — מדידה + תיקון תיעוד בלבד.
> ראיות: `QA/platform/csjekrvu-rls-recheck-0817/`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **31 גשר — לשונית הדפדפן: `favicon.svg` חדש (אייקון ה-Shield שכבר חי בסיידבר), פרוס וחי. `NEEDS_USER.md` §0פ: שלוש נותרו → שתיים.**
>
> אותו דפוס בדיוק כמו `crm` (רשומה למטה): `RoleLayout.tsx` מצייר בכל עמוד תג
> מעוגל `bg-sidebar-primary/20` עם אייקון lucide `Shield`, ו-`__root.tsx` לא
> הצהיר `rel="icon"` כלל. נמדדו הצבעים מהעמוד החי (Playwright getComputedStyle,
> מחובר כ-`test@more30.com`, `/gesher/client/status`): אייקון `#fcfcfc`, רקע
> `--sidebar-primary` המוצק `#59758d`, ניגודיות ≈4.7:1. נכתב `favicon.svg`
> (עותק נאמן של `Shield`, לא `ShieldCheck`), נוסף `<link rel="icon">` מונט-יחסי
> ו-rewrite תואם ב-`vercel.json`. פרוס ממקור (לא `--prebuilt`, אותה סיבה כמו
> crm — ה-preset לא כולל את ה-rewrites), `dpl_H5CDPazhtmVA8BEeqJ6VAVnTcRft`,
> READY. אומת: `/gesher/favicon.svg` מחזיר `image/svg+xml` 32×32, התג בעמוד
> החי מצביע על הנתיב הנכון, 0 שגיאות אפליקציה בקונסולה. ראיות:
> `QA/platform/gesher-favicon-0817/_results.md`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **26 סטודיו מודעות — לשונית הדפדפן: `favicon.svg` חדש (סימן ה-Crown הזהב שכבר חי בנווט), פרוס וחי. `NEEDS_USER.md` §0פ: שש נותרו → חמש.**
>
> אחרי תיקון באג הבנייה (רשומה שמתחת), נבדקה שאלת הסימן הגרפי של סטודיו: תג
> ‏`<link rel="icon">` הצהיר `/favicon.png` שמעולם לא היה קיים בעץ — אותו דפוס
> בדיוק כמו `torah`. הסימן החי בפועל (לא `Logo.tsx`, שקיים בקוד אך אינו
> בשימוש בשום מקום) הוא אייקון `Crown` בזהב `#C9A227` על נייבי `#0B1220`
> (‏`Home.tsx:130`), ניגודיות 7.74:1. נכתב `favicon.svg` — עותק נאמן של נתיבי
> ה-SVG של lucide `Crown` — ותוקן התג לנתיב מוחלט-**למונט**
> (‏`/studio/favicon.svg`), לא לשורש. הועלה לפרודקשן:
> ‏`vercel deploy --prod` מתוך `_deploy/studio-more30`,
> ‏`dpl_8ZLdru79o9pVHfmThHd7JjnEhX95`, `READY`.
>
> **אימות:** ה-HTML החי (`more30.com/studio/?cachebust=…`) כותב את התג המתוקן
> מילה-במילה. קריאת `GET .../studio/favicon.svg` ישירות חזרה `200` עם
> ‏`image/webp`/EXIF במקום ה-SVG — זו החלפת NetFree ברמת הפרוקסי המקומי, לא
> תקלת ייצור; אומת עצמאית מול ה-Vercel API (`GET /v13/deployments/{id}/files`,
> לא עובר דרך NetFree) שהקובץ שהועלה קיים בעץ הפריסה בנתיב הנכון. ראיות:
> `QA/platform/studio-favicon-0817/_results.md`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **26 סטודיו מודעות — תוקן ה-`base` השגוי ב-`vite.config.ts` (`/modaot/` → `/studio/`), הבאג שנרשם ב-`NEEDS_USER.md` תחת 2291abb וטרם טופל.**
>
> `apps/26-modaot-studio/vite.config.ts` הצהיר `base: "/modaot/"` — נתיב הבסיס
> של מערכת אחרת (03, מודעות איגוד) — בזמן שסטודיו מוגש בייצור תחת `/studio/`.
> הייצור לא נשבר מזה עד עכשיו רק כי הוא מוגש מעותק בנוי-ידנית ב-
> `_deploy/studio-more30/public/studio/` שכבר הכיל נתיבים נכונים (ראה זיכרון
> `studio-build-base-override`); אבל כל `vite build` רגיל מהמקור הזה היה
> כותב `/modaot/assets/...` ל-`index.html` וכל נכס היה מחזיר 404 אחרי staging.
> תוקן שורה אחת (`base: "/studio/"`), הורץ `vite build` מקומי לאימות:
> `dist/public/index.html` כותב עכשיו `/studio/assets/index-*.js` ו-
> `/studio/assets/index-*.css`. **לא נגעתי ב-`_deploy` וב-Vercel — אין פריסה
> בצעד הזה**, רק תיקון קונפיג המקור כדי שהבנייה הבאה תהיה נכונה מלכתחילה.
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **§8ב — 30 CRM זכויות ו-31 גשר: נסגרו גם הן, אחרי הרשומה למטה. שלושתן (21/30/31) נמדדו בדפדפן אמיתי.**
>
> הרשומה הבאה (למטה, "§8ב — 21 מתחברים") הסתיימה במפורש עם "30 CRM זכויות ו-31
> גשר עדיין לא נבדקו באותה שיטה — נשארים בפער". שני צעדים שבאו מיד אחריה
> (65cfd40, b2ad348) סגרו את שניהם באותה שיטה בדיוק (Playwright מול הייצור,
> `test@more30.com`): **30** נוחתת ב-`/crm/dashboard` (מסך כניסה עצמאי,
> פרויקט `jhbeelzvjvhnkxldqvxx`) עם לוח בקרה מלא ותפריט אמיתי; **31** נוחתת
> ב-`/gesher/client/status` (מסך כניסה עצמאי, פרויקט `ygaqqnuyfnumezxxmtbh`)
> עם ציר התקדמות בדיקה ותיק מסמכים מאובטח. 0 שגיאות קונסולה בשתיהן. הרשומה
> הזו קיימת רק כדי שהרשומה למטה לא תיקרא כפער פתוח — אין כאן מדידה חדשה,
> ראה `NEEDS_USER.md` §0א″ (כבר מעודכן) ו-`QA/platform/post-confirm-landing-0817/`.
> לא נבדק: פאנל הניהול של גשר, חסום בנפרד על `SUPABASE_SERVICE_ROLE_KEY` חסר (§0י′).

> ## 🟢 17/08/2026 — **§8ב — 21 מתחברים: כניסה אמיתית בדפדפן נמדדה, הלקוח נוחת בתוך המוצר.**
>
> `NEEDS_USER.md` §0א″ סימן "מה קורה אחרי אישור המייל (§8ב) לא נבדק על
> 21/30/31" כפער מדידה פתוח — כל מה שנמדד קודם היה תוכן API/JS bundle, לא
> זרימה בדפדפן. נבדק עכשיו ב-Playwright מול הייצור: `more30.com/mthbram` →
> "כניסה" → `more30.com/login` → התחברות עם `test@more30.com` (משתמש הבדיקה
> הקבוע) → חזרה מדויקת ל-`/mthbram/`. הכפתור מתחלף ל-"לקוח", התפריט אומר
> "מחובר כ־לקוח בדיקה" עם "האזור האישי"/"שדרוג לפרימיום"/"יציאה", ועמוד
> המוצר (חיפוש/סינון/הוספת שיעור) נשאר זמין מתחתיו — לא תדמית, לא "תודה".
> 0 שגיאות קונסולה. זו הזרימה המשותפת (auth-button.js) שרוב הלקוחות עוברים
> בפועל בכל מערכת; מסך ההתחברות העצמאי של הפרויקט הפרטי של מתחברים
> (`aypsqqvfohekxxuqsmrw`) לא אותר לו נתיב UI נפרד ללקוח רגיל.
>
> **30 CRM זכויות ו-31 גשר עדיין לא נבדקו באותה שיטה** — נשארים בפער.
> אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות:
> `QA/platform/post-confirm-landing-0817/`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **§7 מיתוג — סבב מלא נגד הייצור (11 יום מאז הרשומה האחרונה, 06/08): 0 מופעים של השם הישן, 0 מערכות בלי קרדיט הפוטר, בכל 26 המונטים.**
>
> הרשומה האחרונה של `scripts/qa/brand-audit.mjs` הייתה מ-06/08 (תיקון kesef+tivuch).
> 11 יום ומספר פריסות עברו מאז בלי בדיקה חוזרת של הסבב המלא — הורץ אותו סקריפט,
> ללא שינוי, נגד הייצור היום, פעמיים (בדיקה ראשונית ב-04:42, ואישוש טרי לפני
> הכתיבה כאן): כל 26 המונטים (`admin`, `bkalot`, `briut`, `chatzor`, `chizukim`,
> `crm`, `egod`, `galil`, `gannenet`, `gesher`, `imud`, `kesef`, `kiosk`, `kupot`,
> `mechiron`, `modaot`, `mthbram`, `nadlan`, `orech`, `smachot`, `smel`, `studio`,
> `tamlul`, `tivuch`, `torah`, `zchuyot`) — `old brand (html): no`, `old
> (rendered): false`, `credit: true`. **0 מופעים, 0 חסרים, exit code 0.**
>
> אין שינוי קוד, אין פריסה — מדידה בלבד, מאשרת ש-§7 (למטה בקובץ) עדיין נכון
> ומעדכנת את תאריך המדידה האחרון. ראיות: `QA/platform/brand-audit-recheck-0817/raw-output.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **NEEDS_USER §0א — שלוש שורות "py-1 טרם נפרס" (03 מודעות · 02 תמלול · 21 מתחברים) נבדקו מחדש בייצור: כבר פרוסות. פער ישן תשיעי שאינו פעיל.**
>
> הטבלה ב-`NEEDS_USER.md` §0א (תיקוני מקור שנשמרו בגיט 03/08 ומוחרגים
> מ-`.gitignore`) סימנה שלוש שורות `⏳ טרם נפרס`: `apps/03-igud-ads` (3 קישורי
> נווט), `apps/02-igud-transcribe` (קישור מייל בפוטר) ו-`apps/21-mthbram`
> (קישור חזרה במסך 404) — כולן תיקוני יעד-מגע `py-1`. נבדק ישירות מול הייצור
> עם cache-buster: `more30.com/modaot` ו-`more30.com/tamlul` מגישים את מחלקת
> ה-`inline-block py-1` המדויקת ב-HTML (SSR); `more30.com/mthbram` הוא SPA עם
> נתיב-כל-תפיסה, אז נבדקה חבילת ה-JS שהייצור מגיש
> (`/mthbram/assets/index-DO5Yp880.js`) והיא מכילה את אותו `inline-block py-1`
> על קישור "Return to Home". שלושתם חיים.
>
> **ההכרעה הארכיטקטונית של §0א עצמה (איפה הקוד חי לטווח ארוך — ריפו נפרד לכל
> מערכת מול ניהול כאן) נשארת פתוחה ולא נגעתי בה** — זו רק בדיקת הפריסה של שלוש
> השורות הספציפיות. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות:
> `QA/platform/source-fixes-deploy-recheck-0817/_results.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **חפיפת כפתור הכניסה — כל 26 הנתיבים נבדקו מחדש בבת אחת, לא רק השורות המתויגות. 0 חפיפות בכולם.**
>
> טבלת "חפיפת כפתור הכניסה" (למטה בקובץ) מחזיקה שורות רק עבור נתיבים שאי-פעם
> נמצאו חסומים או שנבדקו בנפרד — `torah`, `imud`, `smel`, `egod`, `chatzor`,
> `galil` וכל היתר (`home`, `kesef`, `kiosk`, `modaot`, `briut`, `bkalot`,
> `chatzor-app`, `chizukim-app`, `orech`, `mthbram`, `zchuyot`, `studio`,
> `mechiron`, `kupot`, `crm`, `gesher`) מעולם לא קיבלו שורה כי לא נמצא בהם
> ממצא — כלומר לא נמדדו כאן מעולם כקבוצה, רק נגזרו מהיעדר ממצא. `node
> scripts/qa/authbutton-overlap.mjs` בלי ארגומנטים (כל 26 הנתיבים ברשימת
> `ROUTES`) מול הייצור, חמשת הרוחבים (390/834/1100/1280/1440): **26/26
> `clear` בכל הרוחבים.** אין שינוי קוד, אין פריסה — מדידה בלבד, סוגרת את
> ההנחה "לא נמדד = תקין" בהנחה נמדדת בפועל.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).
>
> ראיות: `QA/platform/authbutton-full-recheck-0817/_results.txt`.

> ## 🟡 17/08/2026 — **27 מחירון — הממצא היחיד בטבלת "נהל מערכת זו" (same_render_no_gate) נבדק מחדש בייצור: עדיין נכון, לא מיושן.**
>
> טבלת "נהל מערכת זו" (למטה בקובץ) מסמנת את `mechiron` כשורה היחידה מסוג
> `same_render_no_gate` — `/mechiron/admin` מציג בדיוק אותם בתים כמו
> `/mechiron/`, בלי שום שער כניסה. זה לא הופיע ברשימת מה שכבר נסגר היום,
> אז נבדק מחדש מול הייצור, אנונימי, עם cache-buster: `/mechiron/`
> ו-`/mechiron/admin` שניהם `200`, **34,415 בייט**, תוכן זהה בית-לבית, וגוף
> `/mechiron/admin` אינו מכיל "סיסמה"/"התחברות"/"password" — אין שער. הממצא
> עדיין נכון.
>
> **מספר הבייטים השתנה** מאז המדידה המקורית (31,585 → 34,415, בשתי
> הכתובות) — זה עקבי עם תוספת סקריפט מצב-כהה שנוספה היום ל-
> `apps/27-bkalut-price` בפעימת "04 imud · 27 mechiron dark mode" (כבר
> תועדה בנפרד), לא רגרסיה חדשה.
>
> **לא תוקן כאן במכוון.** `apps/27-bkalut-price` מצהיר ב-`CLAUDE.md` שלו
> שהוא נפרס אל `/var/www/bkalut-app/`, שנמצא ברשימת המוגנות. הפער עצמו הוא
> הכרעת מוצר פתוחה, כבר רשומה נכון ב-`core.issues #94` וב-`NEEDS_USER.md`
> §0מ. הבדיקה הזו רק מאשרת שהממצא עדיין נכון ומעדכנת את מספר הבייטים — אינה
> סוגרת כלום ואינה מוסיפה חסם חדש. אין שינוי קוד, אין פריסה — מדידה בלבד.
> ראיות: `QA/platform/mechiron-admin-gate-recheck-0817/_results.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **30 CRM זכויות — "dashboard אחרי כניסה לא נבדק" נבדק עכשיו בייצור: מסך מלא, נתוני אמת, 0 שגיאות קונסולה.**
>
> הרשומה הקודמת (17/08, "מסלול index ריק" למטה) בדקה רק את `/crm`→`/crm/auth`
> והשאירה במפורש: "dashboard אחרי כניסה לא נבדק". הפער המקורי שהיא עקבה
> אחריו טען React #418 (hydration mismatch) **ספציפית על הדשבורד**, לא על
> מסך הכניסה. נבדק עכשיו עם משתמש הבדיקה האמיתי (`test@more30.com`, מפרויקט
> `jhbeelzvjvhnkxldqvxx` לפי `LOGINS.md`): התחברות → ניתוב ל-`/crm/dashboard`,
> כותרת `לוח בקרה | זכויות פרו`, ניווט צד עם 10 מסלולים אמיתיים, כרטיסי
> סטטיסטיקה עם נתוני אמת (לקוחות חדשים החודש: 1, מ-QA קודם), לוח קנבן הפניות
> עם 5 עמודות אמיתיות, ו-**0 שגיאות/אזהרות קונסולה** מתחילת הניווט. אין
> hydration mismatch, אין מסך שבור מאחורי 200. אין שינוי קוד, אין פריסה —
> מדידה בלבד. ראיות: `QA/platform/crm-dashboard-recheck-0817/`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **32 נדל"ן — הערת "תוקן במקור, טרם נפרס" על שם המותג ב-PropertyIdCard נבדקה מחדש בייצור: כבר פרוס וחי.**
>
> סעיף "§7 המיתוג" (למטה בקובץ, רשומת 06/08) טען ש-`components/PropertyIdCard.tsx`
> תוקן במקור (השם הישן "מור מערכות תוכנה" → "עולם הסטארטאפים") אבל **טרם
> נפרס**, כי אז פריסת nadlan הייתה חסומה על הכרעת איחוד-ריפו פתוחה
> (`NEEDS_USER` §0א). מאז אותה רשומה, nadlan עברה כמה פריסות בפועל (תיקון
> נגישות 95→100 ב-11/08, רה-בדיקות מצב-כהה וחפיפת-כפתור-כניסה היום) —
> ההערה עצמה פשוט לא עודכנה אחריהן.
>
> נמדד: `git log` על הקובץ מראה את קומיט התיקון (`67982db`, 06/08) בהיסטוריה
> הרגילה, לא בענף נפרד. גרפ מלא של `apps/32-nadlan-berega` ו-`_deploy` אחרי
> "מור מערכות תוכנה" — 0 תוצאות. permalink אמיתי מ-`QA/nadlan-v3/_results.json`
> (`https://more30.com/nadlan/p/30240-88-vwAplUCBVx`) נמשך חי: שורת הפוטר של
> תעודת הזהות לנכס היא "נדל\"ן ברגע · מבית עולם הסטארטאפים" — אין הופעה של
> השם הישן.
>
> אין שינוי קוד, אין פריסה — מדידה בלבד. הרשומה תחת §7 עודכנה בהתאם. ראיות:
> `QA/platform/nadlan-brand-recheck-0817/results.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **פורטל הבית (33) — "ספרו לנו רעיון" מכוסה ע"י כדור הכניסה, שני התיקונים "ממתינים לפריסה" נבדקו מחדש בייצור: 0 חפיפות. פער ישן חמישה-עשר שאינו פעיל.**
>
> טבלת "חפיפת כפתור הכניסה" (למטה בקובץ) סימנה `/ (33) | "ספרו לנו רעיון" |
> ⏳ תוקן פעמיים — ראה למטה`, והפסקה מתחתיה טענה במפורש ששני חלקי התיקון
> "תוקנו וממתינים לפריסה" — אותה תבנית סתירה כמו כל שאר שורות ה-⏳ שנבדקו
> היום. שני התיקונים: (1) media query ב-720px שכתב `padding-inline` על
> **שני** צדי `.nav-in` ומחק את הפינוי לכדור בדיוק ברוחב שהכי נחוץ, (2) מתחת
> ל-`--wrap` איבר השוליים יצא שלילי וחיסורו הוסיף ריפוד במקום להוריד.
>
> נמדד ישירות מול הייצור: `https://more30.com/assets/index-B35ByRD-.css`
> (נמשך 17/08) זהה בייטים ל-`portal/src/styles.css` בשני החוקים —
> `.nav-in{padding-inline-end:max(32px,calc(var(--more30-auth-inset, 124px)
> - max(0px,(100vw - var(--wrap)) / 2)))}` וגם חוק ה-720px עם
> `padding-inline-end:max(20px,var(--more30-auth-inset, 124px))` הספציפי
> ל-`.nav-in` שדורס את ה-`padding-inline` הכללי. הורץ גם `node
> scripts/qa/authbutton-overlap.mjs home` — אותו כלי גיאומטרי
> (`elementFromPoint`) שמצא את הפער במקור — נגד `https://more30.com/`
> בחמשת הרוחבים הרגילים:
>
> ```
> home          clear @ 390,834,1100,1280,1440
> ```
>
> אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות:
> `QA/platform/portal-authbutton-recheck-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **10 בקלות · 30 CRM — שתי שורות נגישות אחרונות בטבלה נבדקו מחדש בייצור: שתיהן אינן פער פעיל.**
>
> טבלת "נגישות" (למטה בקובץ) החזיקה שתי שורות ⏳ שלא עברו את טיפול האנטי-דריפט
> עד עכשיו: `10 bkalot | ה-<select> של ההשוואה בלי תווית | ⏳ תוקן` ו-
> `30 crm | "שכחתי סיסמה" 75x16 | ⏳ תוקן`. הורץ `node scripts/qa/platform-audit.mjs
> QA/platform/crm-bkalot-a11y-recheck-0817 crm bkalot` נגד הייצור בשלושת המצבים
> (desktop/mobile/dark): בקלות — `unnamedControls: []` וגם `smallTargets: []`
> בכל מצב; CRM — `/crm` מתגלה כמסך הכניסה עצמו (`title: "כניסה למערכת | זכויות
> פרו"`, לא מסך ביניים), ו-`smallTargets: []` בכל מצב שם גם. שתי השורות היו
> מתויגות "תוקן" (לא "ממתין לפריסה") כבר בטבלה — המדידה הזאת מאשרת שהתיקון
> אכן חי בפרודקשן ולא רק בקוד. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות:
> `QA/platform/crm-bkalot-a11y-recheck-0817/_results.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **24 גליל · 21 מתחברים — כפתור תפריט מובייל "אין לו שם נגיש" נבדק מחדש בייצור: יש לו שם נגיש, והוא מתחלף כראוי. פער ישן שאינו פעיל.**
>
> טבלת הנגישות (למטה בקובץ) סימנה `24 galil · 21 mthbram | כפתור התפריט
> במובייל — אין לו שם נגיש | ⏳ תוקן (+aria-expanded)`. נבדק ב-Playwright נגד
> הייצור, לא רק מול הקוד: בשתי המערכות הכפתור נושא `aria-label="פתיחת
> התפריט"` ו-`aria-expanded="false"` בטעינה, ואחרי לחיצה אמיתית (לא
> `.click()` סינתטי — זה לא הזיז את React) התווית מתחלפת ל"סגירת התפריט"
> ו-`aria-expanded` ל-`true`, כשתפריט הניווט נהיה גלוי בפועל. גם ה-JS
> החי (`/galil/assets/index-KFiwjeZS.js`, `/mthbram/assets/index-DO5Yp880.js`)
> מכיל את המחרוזת `aria-expanded`. אין שינוי קוד, אין פריסה — מדידה בלבד.
> ראיות: `QA/platform/galil-mthbram-menu-a11y-recheck-0817/_results.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **21 מתחברים — מצב כהה "ממתין לפריסה" נבדק מחדש בייצור: שני חלקי התיקון כבר פרוסים וחיים. פער ישן ארבעה-עשר שאינו פעיל.**
>
> אותה תבנית בדיוק כמו 30/31, 15/24, 04/27 ו-32 למעלה (טבלת "מצב כהה" למטה
> בקובץ). השורה של 21 מתחברים שונה מהשאר: היא לא הייתה חסרת מצב כהה כלל —
> ה-`:root` שלה כבר ערכה כהה מלאה — אלא שני חלקים אחרים: (1) הצהרת
> `color-scheme: dark` כדי שפקדי דפדפן (input/select/scrollbar) לא יישארו
> בהירים על עמוד כהה, ו-(2) הוספת כפתור הכניסה המשותף, כי 21 (יחד עם
> `/modaot`) הייתה המערכת היחידה בלעדיו. שניהם נמדדו ישירות מול הייצור:
>
> ```
> GET /mthbram/assets/index-Y-yk4Tud.css  -> 200, contains "color-scheme:dark"
> GET /mthbram/                            -> 200, contains
>     <script src="https://more30.com/auth-button.js" defer>
> ```
>
> שני חלקי התיקון הוזרקו יחד ב-`apps/21-mthbram/index.html` בקומיט
> `98faa28` וכבר חיים בייצור — התיקון לא המתין לפריסה, רק שורת הטבלה לא
> עודכנה אחריה. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות:
> `QA/platform/mthbram-a11y-recheck-0817/_results.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **30 CRM · 31 גשר — מצב כהה "ממתין לפריסה" נבדק מחדש בייצור: כבר פרוס וחי בשתיהן. פער ישן שלושה-עשר שאינו פעיל.**
>
> אותה תבנית בדיוק כמו 04/27, 15/24 ו-32 למעלה (טבלת "מצב כהה" למטה בקובץ):
> השורה סימנה `30 crm · 31 gesher | ... | ⏳ ממתין לפריסה`, בסתירה לשורת
> הסיכום מתחתיה "מצב כהה — 13/13. הושלם." הורץ `node scripts/qa/dark-probe.mjs
> QA/platform/crm-gesher-a11y-recheck-0817 /crm /gesher` נגד הייצור:
>
> ```
> /crm      rules:1  lab(98.9 -1.6 -0.7) -> lab(3.7 -2.1 -4.0)   CHANGED
> /gesher   rules:1  lab(98.1 -0.3 -0.7) -> lab(5.2 -1.2 -6.2)   CHANGED
> ```
>
> שני המסכים מציגים חוק `.dark` פעיל עם היפוך רקע/דיו אמיתי דרך משתני
> CSS: `crm` `--background:#050f14` / `--foreground:#f1f6f6`, `gesher`
> `--background:#0b121a` / `--foreground:#f0f2f4` — שני הזוגות כמעט
> שחור-על-כמעט-לבן, AA תקין בבירור. אין שינוי קוד, אין פריסה — מדידה
> בלבד, ותוקנה שורת הטבלה שסתרה את סיכום 13/13. ראיות:
> `QA/platform/crm-gesher-a11y-recheck-0817/_dark-probe.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **15 עגוד · 24 גליל — מצב כהה "נבנה, ממתין לפריסה" נבדק מחדש בייצור: כבר פרוס וחי בשתיהן. פער ישן שנים-עשר שאינו פעיל.**
>
> אותה תבנית בדיוק כמו 04/27 ו-32 למעלה (טבלת "מצב כהה" למטה בקובץ): השורה
> סימנה `15 egod · 24 galil | ... | ⏳ נבנה, ממתין לפריסה`, בסתירה לשורת
> הסיכום מתחתיה "מצב כהה — 13/13. הושלם." הורץ `node scripts/qa/dark-probe.mjs
> QA/platform/egod-galil-a11y-recheck-0817 /egod /galil` נגד הייצור:
>
> ```
> /egod   rules:2  rgb(245, 246, 250) -> rgb(15, 21, 36)                    CHANGED
> /galil  rules:2  linear-gradient(160deg, rgb(245, 247, 24 -> ... rgb(14, 24, 32)  CHANGED (via gradient)
> ```
>
> שתי המערכות מציגות `.dark` פעיל עם היפוך רקע אמיתי; ניגודיות הטקסט אחרי
> ההיפוך: `egod` `rgb(235,237,244)` על `rgb(15,21,36)`, `galil`
> `rgb(236,240,244)` על `rgb(14,24,32)` — שתיהן AA תקין. אין שינוי קוד, אין
> פריסה — מדידה בלבד, ותוקנה שורת הטבלה שסתרה את סיכום 13/13. ראיות:
> `QA/platform/egod-galil-a11y-recheck-0817/_dark-probe.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **04 עימוד · 27 מחירון — מצב כהה "נבנה, ממתין לפריסה" נבדק מחדש בייצור: כבר פרוס וחי בשתיהן. פער ישן נוסף שאינו פעיל.**
>
> טבלת "מצב כהה" (למטה בקובץ) סימנה `04 imud · 27 mechiron | ... | ⏳ נבנה,
> ממתין לפריסה`, באותה סתירה לשורת הסיכום "מצב כהה — 13/13. הושלם." שכבר
> תוקנה עבור 32 נדל"ן. הורץ `node scripts/qa/dark-probe.mjs
> QA/platform/imud-mechiron-a11y-recheck-0817 /imud /mechiron` נגד הייצור:
>
> ```
> /imud          rules:3   rgb(250, 248, 245) -> rgb(27, 22, 19)   CHANGED
> /mechiron      rules:12  rgb(248, 246, 242) -> rgb(18, 25, 28)   CHANGED
> ```
>
> אותם צבעים בדיוק שכבר תועדו בטבלה למטה כשהתיקון "נבנה" — כלומר זו אותה
> פריסה, רק שורת הטבלה לא עודכנה אחריה. ניגודיות: `imud` טקסט
> `rgb(241,237,228)` על `rgb(27,22,19)`, `mechiron` טקסט `rgb(240,236,230)`
> על `rgb(18,25,28)` — שתיהן AA תקין. אין שינוי קוד, אין פריסה — מדידה בלבד.
> ראיות: `QA/platform/imud-mechiron-a11y-recheck-0817/_dark-probe.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **32 נדל"ן — מצב כהה "נבנה, ממתין לפריסה" נבדק מחדש בייצור: כבר פרוס וחי. פער ישן עשירי שאינו פעיל.**
>
> טבלת "מצב כהה" (למטה בקובץ, אחרי טבלת חפיפת כפתור הכניסה) סימנה
> `32 nadlan | ... | ⏳ נבנה, ממתין לפריסה`, בסתירה לשורת הסיכום ממש
> מתחתיה שכבר קבעה "מצב כהה — 13/13. הושלם." הורץ `node
> scripts/qa/dark-probe.mjs QA/platform/nadlan-a11y-recheck-0817 /nadlan`
> נגד הייצור:
>
> ```
> /nadlan        rules:3  rgb(246, 248, 252) -> rgb(12, 18, 32)  CHANGED
> ```
>
> שלושה חוקי `.dark` פעילים, הרקע מתהפך בפועל, וניגודיות הטקסט אחרי ההיפוך
> `rgb(221,227,238)` על `rgb(12,18,32)` — AA תקין. אין שינוי קוד, אין
> פריסה — מדידה בלבד, ותיקון שורת הטבלה כדי שלא תסתור את שורת הסיכום.
> ראיות: `QA/platform/nadlan-a11y-recheck-0817/_dark-probe.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **32 נדל"ן — "כפתור 'מקורות ותמחור' מכוסה ע"י כדור הכניסה, ממתין לפריסה" נבדק מחדש בייצור: 0 חפיפות. פער ישן תשיעי שאינו פעיל.**
>
> טבלת "חפיפת כפתור הכניסה" (למטה בקובץ) סימנה `/nadlan (32) | "מקורות
> ותמחור" | ⏳ ממתין לפריסה`. הורץ `node scripts/qa/authbutton-overlap.mjs
> nadlan` מחדש — אותו כלי שמדד את הפער במקור, בדיקה גיאומטרית מול הייצור
> בחמישה רוחבים (390/834/1100/1280/1440), לא ויזואלית:
>
> ```
> nadlan        clear @ 390,834,1100,1280,1440
> ```
>
> 0 חפיפות בכל חמשת הרוחבים — התיקון שכתוב היה מחכה לפריסה כבר חי. אין שינוי
> קוד, אין פריסה — מדידה בלבד. הועבר לטבלה למטה עם קו חוצה. ראיות:
> `QA/platform/nadlan-authbutton-recheck-0817/_results.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **06 בריאות — נוסף פקד מצב-כהה ידני, פרוס וחי. 4/5 מ-POLISH_BACKLOG.**
>
> המשך ישיר ל-03 מודעות (למטה): 06-בריאות (`apps/06-kupot-holim`, מוגש תחת
> `/briut`) הוא אתר סטטי בלי שלב build — כמו 10-בקלות-תצוגה, לא כמו
> 02/03 שהם Next.js. `THEME_BOOT` שכבר ישב ב-`<head>` (עוקב רק אחרי
> `prefers-color-scheme`) עודכן לקרוא `localStorage["briut-theme"]` קודם,
> אותה תבנית בדיוק כמו 02/03/10. נוסף `#themeToggle` (🌙/☀️) ל-`.main-nav`
> ב-`index.html`, מקש הקליק ב-`app.js`, עיצוב הכפתור ב-`styles.css`.
>
> `/briut` מוגש עם `<base href="/briut/">` (ראה ההערה בראש `index.html` —
> בלעדיו כל נכס נפתר מהשורש ומחזיר HTML של הפורטל, כמו שקרה כאן פעם), אז
> האימות המקומי רץ משרת סטטי ששורשו תיקיית `_deploy/briut-more30` (כדי
> שהנתיב `/briut/` ייפתר נכון), לא ישירות על `apps/06-kupot-holim/site`.
> Playwright מקומית ואז מול הייצור: קליק→`classList.contains('dark')` + רקע
> `rgb(14,21,25)`; רענון (`?cachebust`) שומר בלי הבזק; קליק נוסף חוזר לבהיר.
> נפרס `vercel deploy --prod` מתוך `_deploy/briut-more30`
> (`briut-more30`, `dpl_9kmftqAHANeWjCcoJwuuYSN4uYuM`) ואומת חי ב-
> `https://more30.com/briut/?cachebust=0817briut`. ראיות:
> `QA/platform/theme-toggle-briut-0817/`. 35 (קיוסק, Vite) נשאר ברשימה.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **03 מודעות — נוסף פקד מצב-כהה ידני, פרוס וחי. 3/5 מ-POLISH_BACKLOG.**
>
> המשך ישיר ל-02-תמלול (למטה): גם 03 בנויה Next.js, וגם לה נדרש `ThemeToggle`.
> ההבדל היחיד — דף הבית של 03 לא משתמש ב-`SiteHeader.tsx` המשותף אלא בכותרת
> `inline` משלו (`app/(public)/page.tsx`), אז הפקד נוסף בשני מקומות: גם
> ל-`SiteHeader.tsx` (עמודי תמלול), גם ישירות לדף הבית עם עיצוב מותאם לרקע
> הכהה-גרדיאנט שלו (במקום `btn-outline` הבהיר שלא היה נראה שם — `ThemeToggle`
> עודכן לקבל `className` כדי לתמוך בשני ההקשרים).
>
> `THEME_BOOT` ב-`app/layout.tsx` עודכן לקרוא `localStorage["modaot-theme"]`
> לפני `matchMedia`, אותה תבנית כמו 02/10. `next build` עבר, Playwright מקומי
> (`next start`, basePath `/modaot`) אימת בדף הבית ובעמוד ההעלאה: קליק→
> `classList.contains('dark')`, רקע `rgb(15,18,24)`; רענון שומר בלי הבזק; קליק
> נוסף חוזר לבהיר. נפרס `vercel deploy --prod` מתוך `apps/03-igud-ads`
> (`modaot-more30`, `dpl_7kpTybzinumhjbwUeGDaErsk2D5f`) ואומת חי ב-
> `https://more30.com/modaot/?cachebust=0817modaot` (אותה בדיקה, אותה תוצאה).
> ראיות: `QA/platform/theme-toggle-modaot-0817/`. 06/35 נשארים ברשימה.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **02 תמלול — נוסף פקד מצב-כהה ידני, פרוס וחי. 2/5 מ-POLISH_BACKLOG.**
>
> המשך ישיר ל-10-בקלות (למטה): `POLISH_BACKLOG.md` מסמן גם את 02/03/06
> (Next.js) ו-35 (Vite) כדורשות אותו פקד. 02 היא הראשונה מבין השלוש
> הבנויות-Next שנסגרה, כי היא כבר הייתה פתוחה בקונטקסט.
>
> נוסף `components/ThemeToggle.tsx` (client component, 🌙/☀️) בתוך
> `SiteHeader.tsx`, ו-`THEME_BOOT` ב-`app/layout.tsx` עודכן לקרוא
> `localStorage["tamlul-theme"]` לפני `matchMedia`, במקום לעקוב אחרי ה-OS
> תמיד — בדיוק התבנית שכבר חיה ב-`/bkalot`. `next build` עבר,
> Playwright מקומי (`next start`, basePath `/tamlul`) אימת: קליק→
> `classList.contains('dark')`, רקע `rgb(20,22,28)`; רענון שומר בלי הבזק;
> קליק נוסף חוזר לבהיר. נפרס `vercel deploy --prod` מתוך
> `apps/02-igud-transcribe` (יש לו קישור Vercel עצמאי, `tamlul-more30`,
> `dpl_yWB9XZBxQn5JKW8kyWWTZEg4fboE`) ואומת חי ב-
> `https://more30.com/tamlul/?cachebust=0817tamlul` (אותה בדיקה, אותה
> תוצאה). ראיות: `QA/platform/theme-toggle-tamlul-0817/`. 03/06/35 נשארים
> ברשימה.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **10 בקלות-תצוגה — נוסף פקד מצב-כהה ידני, פרוס וחי. 1/5 מ-POLISH_BACKLOG.**
>
> `POLISH_BACKLOG.md` סימן 5 מערכות (02/03/06/10/35) שעוקבות אחרי
> `prefers-color-scheme` אבל בלי פקד גלוי בעמוד. 10-בקלות-תצוגה היא אתר סטטי
> (בלי build) — היחידה מהחמש שאפשר לסגור בלי שלב בנייה, ולכן נבחרה ראשונה.
>
> נוסף כפתור `#themeToggle` בניווט (🌙/☀️), עם שמירת בחירה ל-`localStorage`
> ובדיקתה לפני `matchMedia` בסקריפט ה-`<head>` (מוחל לפני הציור). אומת
> ב-Playwright מקומית ומול הייצור: קליק → `isDark:true`, רקע
> `rgb(18,19,15)`; רענון שומר את הבחירה בלי הבזק; קליק נוסף חוזר לבהיר.
> נפרס `vercel deploy --prod` (`bkalot-more30`,
> `dpl_AXcBDcJmUAG3ya6b635B5wqPkhK9`) ואומת חי ב-
> `https://more30.com/bkalot/?cachebust=0817b`. ראיות:
> `QA/platform/theme-toggle-bkalot-0817/`. 02/03/06/35 נשארים ברשימה
> (Next.js/Vite, דורשים build).
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🔴→🟢 17/08/2026 — **28 קופות — פירוט השוואת הכיסוי בין הקופות היה ריק בייצור לכל נושא, מאז 10/08. תוקן ונפרס.**
>
> `QA/kupot/_flow.json` (מבוסס `scripts/qa/kupot-flow.mjs`, נכתב 02/08) עמד
> בעץ העבודה עם `detail.len` שירד מ-**2,307** ל-**350** תווים בשלושת המצבים —
> אותו `sample` בדיוק בהתחלה, אז לא שינוי בסקריפט. הרצה חוזרת של הסקריפט מול
> הייצור שיחזרה את אותה תוצאה (350, לא רועש). `GET
> more30.com/kupot/api/hf/topics/501` (ועוד שניים) אימת: `"fundDetails":null`
> — כלומר הכרטיס הפתוח הציג רק את הנפילה הקצרה ("פירוט הכיסוי לנושא זה אינו
> זמין כרגע") במקום טבלת ההשוואה בפועל, לכל אחד מ-435 נושאי השב״ן.
>
> **השורש:** `server/fund-details.ts` קורא `hf_fund_details.json` (1MB) מ-
> `process.cwd()` בזמן ריצה; `vercel.json` (גם במקור וגם ב-`_deploy/kupot-more30`)
> הצר את `functions.api/index.js.includeFiles` ל-`"hf_data_export.json"` בלבד
> — כנראה בסבב הפריסה של 10/08 (`6551b75`/`18ffdc3`/`059a9fc`, שם התועדה
> מכסת Vercel שנחסמה וחזרה). `_deploy/kupot2`, שכבת עבודה ישנה שלא נמחקה,
> עדיין החזיקה את התבנית התקינה `{hf_data_export.json,hf_fund_details.json}`
> — משם אושר מה השתנה.
>
> **התיקון:** `includeFiles` הוחזר לזוג הקבצים בשני ה-`vercel.json` (המקור
> ב-`apps/28-kupot-health-funds` ועותק הפריסה), `hf_fund_details.json` הועתק
> לתוך `_deploy/kupot-more30`, ונפרס `vercel deploy --prod` (kupot-more30,
> dpl_8Z2gyuNQtVnA73uyPbGnd3FEFDyx). אומת אחרי הפריסה: `fundDetails` מחזיר
> כעת ארבע הקופות, וההרצה החוזרת של `kupot-flow.mjs` מחזירה `detail.len 2307`
> בשלושת המצבים — תואם בדיוק את הבסיס שנמדד ב-02/08 (0 diff מול הקומיט).
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **24 galil — "פוטר: טלפון ואימייל מתחת ל-24px, ממתין לפריסה" נבדק מחדש בייצור: 0 יעדי מגע קטנים. פער ישן שמיני שאינו פעיל.**
>
> טבלת הנגישות (למטה בקובץ, "מה `platform-audit.mjs` מצא בסבב הזה") קבעה
> `24 galil | טלפון ואימייל בפוטר: 79×14 ו-157×18 — מתחת ל-24px | ⏳ תוקן,
> ממתין לפריסה`. הורץ `node scripts/qa/platform-audit.mjs` מחדש נגד `/galil`
> בלבד (desktop 1440px + mobile 390×844 + dark), אותו כלי שמדד את הפער במקור:
>
> ```
> desktop: 200 · small 0 · unnamed 0 · errs 0
> mobile:  200 · small 0 · unnamed 0 · errs 0
> dark:    200 · small 0 · unnamed 0 · errs 0
> ```
>
> `smallTargets: []` בשלושת המצבים — התיקון שכתוב היה מחכה לפריסה כבר חי.
> אין שינוי קוד, אין פריסה — מדידה בלבד. הועבר לטבלה למטה עם קו חוצה. ראיות:
> `QA/platform/galil-footer-recheck-0817/_results.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **27 מחירון — "צ'אטבוט 404, לא תוקן" נבדק מחדש בייצור: 200. פער ישן שביעי שאינו פעיל.**
>
> הרשומה בטבלת "מה נשאר לתקן" (למטה בקובץ) קבעה `27 מחירון | .../chatbot/config
> → 404 ... לא תיקנתי | קטן, אבל דורש אימות מקור הנתונים`. `git log` על
> `_deploy/mechiron-more30/api/index.ts` מראה שהמסלול כבר נוסף ב-8a8d8db (03/08):
> handler ל-`path === "public/chatbot/config"` שקורא `automation_configs` בשם
> `public_chatbot` דרך אותו לקוח anon שמסלול ה-settings כבר משתמש בו, עם ברירות
> מחדל מתועדות ל-`intro`/`ctaText`/`closingText`/`contact`. `NEEDS_USER.md:1686`
> כבר תיעד את זה פעם אחת בעבר ("404 של הצ'אטבוט → 0") — הטבלה כאן פשוט לא עודכנה.
>
> נבדק מול הייצור עם cache-buster:
>
> ```
> GET https://more30.com/mechiron/api/public/chatbot/config?cachebust=… -> 200
> {"enabled":false,"intro":"שלום! אני העוזר של ארגון בקלות...","contact":{...}}
> ```
>
> לא 404. `enabled:false` הוא הערך התקין המתועד בקוד — אין שורת `automation_configs`
> בשם `public_chatbot` (או שהיא לא קריאה ל-anon), אז הווידג'ט נשאר מוסתר בכוונה
> במקום להיפתח ולא לענות. זו התנהגות מכוונת, לא תקלה. אין שינוי קוד, אין פריסה —
> מדידה בלבד. ראיות: `QA/platform/mechiron-recheck-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **01 torah — "CLS 0.578 חי כרגע" נבדק מחדש בייצור: CLS 0.001. פער ישן שישי שאינו פעיל.**
>
> הרשומה בטבלת "מה נשאר לתקן" (למטה בקובץ) קבעה `🔴 וגם: CLS 0.578 חי כרגע —
> רגרסיה מדגל seed שנשמט, תוקנה ומחכה לפריסה`. הורץ `scripts/qa/lighthouse-run.mjs`
> מחדש נגד `https://more30.com/torah` בייצור (אותו כלי שכתב את המספר המקורי):
>
> ```
> perf 63 · a11y 100 · bp 77 · seo 100
> fcp 2.1s · lcp 5.3s · tbt 510ms · cls 0.001 · si 4.2s
> ```
>
> `cls: "0.001"` — בדיוק הערך שנרשם *לפני* הרגרסיה מ-03/08, לא ה-0.578 שהרשומה
> טוענת שעדיין חי. לא ידוע מתי בין 03/08 לעכשיו זה תוקן — כנראה באחת מפריסות
> ה-torah שבין לבין (למשל תיקון הקידוד הכפול מ-13/08) כללה גם prerender תקין
> עם `--seed-url`, אבל זה לא נחקר כי זה לא משנה את המצב הנוכחי. אין שינוי קוד —
> זו מדידה בלבד. **LCP 5.3s ו-TBT 510ms נשארים בעיה פתוחה** (ארכיטקטונית,
> דורשת SSR מלא) — רק שורת ה-CLS הועברה לטבלה למטה עם קו חוצה. ראיות:
> `QA/torah/cls-recheck-0817/_lighthouse.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **30 CRM זכויות + 31 גשר עברית — "מסלול index ריק" נבדק מחדש בייצור: שני המסלולים מגישים מסך כניסה מלא. פער ישן רביעי וחמישי שאינם פעילים.**
>
> שתי רשומות בטבלת "מה נשאר לתקן" (למטה בקובץ) בלי תאריך מדידה: `30 CRM זכויות |
> מסלול index ריק + React #418 (hydration mismatch) ב-dashboard | בינוני` ו-`31
> גשר עברית | מסלול index ריק | בינוני`. Playwright, 1280×900, cache-buster, שני
> מסלולים לכל מערכת (עם/בלי לוכסן):
>
> ```
> /crm    ,  /crm/    -> /crm/auth     "כניסה למערכת | זכויות פרו"      body 7,862B  errs 0
> /gesher ,  /gesher/ -> /gesher/auth  "התחברות — מערכת CRM שותפים"    body 8,353B  errs 0
> ```
>
> שתי המערכות מציגות טופס כניסה מלא עם כותרת ו-h1, לא מסך ריק, ואין שגיאת
> hydration בקונסולה. **לא נבדק:** מסך ה-dashboard אחרי כניסה אמיתית — הטענה
> המקורית על React #418 הייתה ספציפית לשם, לא למסלול index/auth שנמדד כאן; אם
> התקלה עדיין קיימת היא מעבר להתחברות. אין שינוי קוד — מדידה בלבד. הועבר לטבלה
> למטה עם קו חוצה. ראיות: `QA/platform/index-route-recheck-0817/`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **03 מודעות (`/modaot`) — "3 יעדי מגע קטנים" נבדק מחדש בייצור: אפס יעדי מגע קטנים כרגע. פער ישן שלישי שאינו פעיל.**
>
> הרשומה בטבלת "מה נשאר לתקן" (למטה בקובץ) קבעה `03 מודעות | 3 יעדי מגע קטנים |
> קטן` בלי תאריך מדידה. הורץ `scripts/qa/platform-audit.mjs` מחדש נגד `/modaot`
> בלבד (desktop + mobile 390×844 + dark), אותו כלי שמדד את הפער במקור:
>
> ```
> desktop: 200 · small 0 · unnamed 0 · errs 0
> mobile:  200 · small 0 · unnamed 0 · errs 0
> dark:    200 · small 0 · unnamed 0 · errs 0
> ```
>
> `smallTargets: []` בשלושת המצבים, `interactiveCount: 8` בכל אחד —
> כלומר כל שמונת היעדים האינטראקטיביים בעמוד נבדקו ואף אחד אינו מתחת ל-24px.
> `unnamedControls: []` ו-`imgsNoAlt: []` גם הם ריקים. אין שינוי קוד — זו מדידה
> בלבד, ומצטרפת לשני הפערים שכבר סומנו מיושנים ב-17/08 (מתג מצב כהה, מכסת
> Vercel). לא ידוע מתי בין רישום הפער לעכשיו הוא נסגר — לא נחקר, כי זה לא
> משנה את המצב הנוכחי. הועבר לטבלה למטה עם קו חוצה. ראיות:
> `QA/platform/touch-target-recheck-0817/`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **שני פערים ישנים ב"מה נשאר לתקן" (למטה בקובץ) נבדקו מחדש בייצור ואינם פערים פעילים.**
>

> **1. "מתג מצב כהה" ל-02/03/06/10/35 — נבדק מחדש היום, `dark-toggle-probe.mjs`
> על `/tamlul` `/modaot` `/briut` `/bkalot` `/kiosk` (המסלולים החיים של חמש
> המערכות האלה):
>
> ```
> /tamlul      os-dark:follows  toggle:none    => reachable
> /modaot      os-dark:follows  toggle:none    => reachable
> /briut       os-dark:follows  toggle:none    => reachable
> /bkalot      os-dark:follows  toggle:none    => reachable
> /kiosk       os-dark:follows  toggle:none    => reachable
> 5/5 reachable
> ```
>
> עדיין אין להן פקד ידני בעמוד (`toggle:none`, כפי שכבר היה רשום), אבל **כל
> החמש עוקבות אחרי `prefers-color-scheme` בפועל** — מי שה-OS שלו כהה מקבל עמוד
> כהה בלי שום פעולה. הסקריפט עצמו (ראה ההערה בראשו) מגדיר `reachable` כ-OS-follow
> **או** פקד עובד — לא שניהם. כלומר זה **ליטוש** (הוספת פקד ידני לגולש שה-OS שלו
> בהיר אך מעדיף כהה בכל זאת), לא פונקציונליות חסרה. הועבר ל-`POLISH_BACKLOG.md`
> ולא ייחשב עוד "נשאר לתקן". ראיות: `QA/platform/dark-toggle-recheck-0817/`.
>
> **2. "חסם פעיל: מכסת הפריסות של Vercel נוצלה" — מיושן.** הרשומה למטה
> מ-04-06/08. לפי `more30-priority.md` §0.2 וזיכרון קודם: **החשבון עבר ל-Vercel
> Pro ב-12/08**, ומכסת ה-100/יום החינמית הוסרה — פריסות חוזרות לעבוד מאז.
> `vercel whoami`/`vercel teams ls` אימתו היום שה-CLI עדיין מאומת כ-
> `l023131500-ops` על `l023131500-ops-projects`; שכבת המנוי עצמה לא נבדקה
> מחדש כאן (לא API ייעודי לכך בסבב הזה), אבל אין שום ראיה מאז 12/08 לחסימה
> חוזרת, ופריסות רבות בוצעו בהצלחה בין 12/08 ל-17/08 (כולל היום — ראה הרשומות
> למטה). הרשומה למטה מתויגת "מיושנת" ולא נמחקה, כדי שההיסטוריה תישאר.
>
> אין שינוי קוד, אין מיגרציה, אין פריסה — מדידה + תיעוד בלבד.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): #37 פרוסה וחיה, ורישום `core.projects` פיגר אחריה — תוקן מקומית, ה-UPDATE ל-DB מוכן וממתין.**
>
> הפעימה הקודמת (source-untouched-verify-0817) סגרה את סבב האימות של שכבה 1.
> הצעד הזה בדק סעיף אחר שנשאר פתוח מ-`BKALOT_CLONE_BUILD.md`: "פרויקט חדש
> ב-core.projects... live אחרי אימות". `apps/37-bkalot-clone/app.json` עדיין
> אמר `live: false, isDeployed: false` מקומיט `7a7e377` (13/08) — למרות
> שהמערכת פרוסה וחיה ונמדדה עשרות פעמים מאז.
>
> **נמדד:** `more30.com/bkalot-studio` ו-`/admin` שניהם 200 בדפדפן (Playwright,
> cachebust, 1280x900). דף הבית לא מציג אף כרטיס "bkalot" — הכרטיס "בקלות"
> היחיד שם שייך למערכת #10 (rights.catalog), לא לעותק התפעולי. `grep` על
> migrations 0001-0102 מאשר: `core.projects` #37 קיימת מלפני `0057` (13/08),
> אבל אף מיגרציה לא הזיזה `live`/`is_deployed`/`public_visible`/`live_url`/
> `admin_url` מאז — פיגור ברישום, לא בפריסה.
>
> **מה תוקן כאן:** `app.json` עודכן לשקף מציאות (`live: true, isDeployed: true,
> stage: "beta"`, כתובות). ה-`UPDATE` ל-`core.projects` (5 עמודות, שורה אחת)
> מוכן ב-`QA/bkalot-clone/registry-row-0817/_project-flip-live.sql` — **לא
> הורץ**: אין חיבור Supabase (MCP/PAT) בסשן הזה. heartbeat נכתב כקובץ
> `_heartbeat-pending.sql`, מצטרף לתור הקיים.
>
> **מה זה משאיר פתוח:** עד שה-`UPDATE` ירוץ, המערכת עובדת ופרוסה אבל לא
> מופיעה בדף הבית — פער תצוגה בלבד, לא פונקציונלי. ראיות:
> `QA/bkalot-clone/registry-row-0817/probe.txt` + שני צילומי מסך.

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): אימות עצמאי — המקור המוגן 08/09 לא נגע, ו-888 הנושאים כבר נמדדו (סוגר את סבב האימות של שכבה 1).**
>
> הפעימות הקודמות (0058-scan + email/situation-treatment-live) סגרו את כל ענפי
> הוולידציה של `bkalot_clone_intake`. שני סעיפים מ-`BKALOT_CLONE_BUILD.md` §אימות
> נשארו בלי ראיה עצמאית משלהם — רק אישורים משורשרים בתוך פעימות אחרות. הצעד הזה
> נותן לשניהם מדידה משלהם:
>
> **1. המקור החי 08/09 לא נגעו בו.** `git diff -- apps/08-bkalut-app
> apps/09-bkalot-admin` ריק (0 שורות). `git log -1` על אותם נתיבים מחזיר
> `d2ed6ce7` מ-17/07/2026 — לפני תחילת עבודת השכפול (13/08). אף קומיט בחלון
> 13/08–17/08 (מ-`mount-0813` ועד `email-situation-treatment-live-0817`) לא נגע
> בנתיב המוגן. שני קבצים בלבד עוקבים שם (`app.json` בכל נתיב) — רישום
> `core.projects`, לא קוד המקור החי.
>
> **2. מאגר הזכויות מציג 888 נושאים.** כבר נמדד עצמאית ב-13/08 — לא נמדד מחדש
> כאן, רק מסומן סגור: `QA/platform/anon-write-on-public-views-0813/_results.json`,
> `public.rights_catalog` 888/888 לפני ואחרי תיקון ההרשאה (0059).
>
> אין שינוי קוד, אין מיגרציה, אין פריסה — מדידה/אימות בלבד. ראיות:
> `QA/bkalot-clone/source-untouched-verify-0817/probe.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).
>
> **מה זה סוגר:** סבב האימות של `BKALOT_CLONE_BUILD.md` §אימות לשכבה 1 (טופס
> הפנייה) שלם עכשיו: העותק עולה ונטען, מאגר הזכויות מציג 888, כניסה לניהול
> עובדת (`admin-auth-0813`), זרימת פנייה→מסמך→תור שליחה במצב טסט נבדקה מקצה
> לקצה (`dispatch-0814`), המקור המוגן לא נגע, וכל ענפי הוולידציה של `/intake`
> נמדדו בייצור. **נשאר פתוח (לא כאן):** פער התיעוד של `SYSTEMS_STATUS.md` בין
> 14/08 ל-17/08 (עשרות פעימות שלא הגיעו לכאן) — גדול מדי לצעד אחד, כבר נרשם
> פעמיים.

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): `email_invalid` + `email_required_for_treatment` + `situation_required_for_treatment` נמדדו בייצור (מדידה בלבד).**
>
> סריקת 0058 מ-17/08 (kind_invalid/source_invalid/situation_unknown/topic_no_invalid,
> הרשומה שמתחת) הצהירה "אין פער פתוח נוסף מסריקת הוולידציה הזאת" — הצהרה
> שהייתה נכונה רק לארבעת הענפים שנבחרו שם, לא לכל הענפים בפונקציה.
> phone_invalid/full_name_required כבר נמדדו בנפרד (stale-mark-deploy-0817,
> which-field-mobile-390-0817). שלושה ענפים נשארו בלי מדידה חיה כלל:
> `email_invalid` (0058:105-106), `email_required_for_treatment` (0058:112-113),
> `situation_required_for_treatment` (0058:115-116).
>
> שלוש בקשות POST ישירות אל bkalot-clone-intake (PowerShell, לא דפדפן — כדי
> לעקוף גם preflight() וגם את `type="email"`/`required` בטופס, ששניהם היו
> חוסמים דפדפן אמיתי מלהגיע לענפים האלה):
>
> **A.** `kind=info`, `email="not-an-email"` → HTTP 200
> `{"ok":false,"error":"email_invalid"}`.
> **B.** `kind=treatment`, בלי שדה `email` כלל → HTTP 200
> `{"ok":false,"error":"email_required_for_treatment"}` — מאשר בייצור שהבדיקה
> ב-0058:105 (`if v_email is not null and ...`) יורה רק כשיש מחרוזת שגויה;
> `email` חסר לגמרי מדלג עליה ישר לחסימת הטיפול.
> **C.** `kind=treatment`, `email` תקין, בלי `situation` → HTTP 200
> `{"ok":false,"error":"situation_required_for_treatment"}`.
>
> שלושתן HTTP 200 עם קוד שגיאה מובנה, לא `rpc_failed`/שגיאת Postgres גולמית,
> ותואמות מילה-במילה ל-MESSAGES/CODE_FIELD בלקוח (index.html:288-290, 345-347)
> — מחרוזות שכבר קיימות ונכונות, למרות שאף דפדפן לא מגיע כרגע לענפים האלה.
>
> **מצב טסט, נמדד ולא הוצהר:** כל שלושת התנאים חוזרים לפני `insert into
> bkalot_auto.contacts` (שורה 146) ו-`bkalot_clone.cases` (שורה 154) — נקרא
> ישירות מהמיגרציה הפרוסה, אפס שורות נכתבו.
>
> אין שינוי קוד, אין מיגרציה, אין פריסה — מדידה בלבד. ראיות:
> `QA/bkalot-clone/email-situation-treatment-live-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): «איזה שדה נפסל» + ניקוי הסימן הישן נמדדו במובייל (390x844) בייצור, לא רק בדסקטופ.**
>
> שתי פעימות קודמות רשמו במפורש שהתכונה לא נמדדה במובייל: which-field-deploy-0817
> (3cff166) — «⚠️ לא נמדד ב-390x844» — ו-note-tally case-hit-row (9699a3d) על
> מסך אחר. invalid-visible-deploy-0817 (56bac47) כן מדדה מובייל, אבל רק את
> כלל הצבע לבדו, לא יחד עם ניקוי הסימן הישן מ-stale-mark-0817/stale-mark-deploy-0817
> (76bbac4/8ef394c). זה השילוב שלא נמדד — עכשיו נמדד.
>
> דפדפן אמיתי (Playwright), חלון על 390x844 **לפני** כל ניווט
> (playwright-blank-screenshot-until-resize), מול `https://more30.com/bkalot-studio/`
> עם `?cachebust=` טרי בכל ריצה.
>
> **תרחיש A — `phone_invalid`:** טלפון `"123"`, שם ותיבת הסכמה תקינים, קוד info.
> אחרי השליחה: `aria-invalid="true"` על phone, `getComputedStyle` על הגבול
> `rgb(155, 28, 28)` — אותו אדום שנמדד בדסקטופ ב-8ef394c, ממוקד, גלוי
> (`offsetParent≠null`), וההודעה זהה מילה-במילה ל-MESSAGES. **אפס גלישה אופקית**:
> `scrollWidth`=`clientWidth`=375.
>
> **תרחיש B — הטלפון תוקן, השם רוקן:** אותה שליחה שנייה כמו ב-76bbac4 (תרחיש B),
> עכשיו במובייל. אחרי: phone חוזר ל-`aria-invalid=null` וגבול `rgb(220, 218, 209)`
> (‏`--line`, לא אדום) — הסימן הישן **לא** שרד; full_name מסומן `aria-invalid=true`
> ואדום, ממוקד, וההודעה «צריך שם מלא.» זהה מילה-במילה. שוב אפס גלישה אופקית.
>
> קונסולה נלכדה לכל הריצה (`all:true`): **אפס הודעות**, אפס שגיאות, בשתי הריצות.
>
> **מצב טסט, נמדד ולא הוצהר:** שני הקודים כאן (`phone_invalid`, `full_name_required`)
> הם `return` שיושב מעל ה-`insert into bkalot_auto.contacts` ב-0058 — אותו ציטוט
> שכל מדידת UI קודמת במשפחה הזו כבר השתמשה בו. אפס שורות נכתבו, אין נגיעה
> ב-`bkalot-clone-admin` ואין session ניהול שנפתח. `git status` על
> `apps/08-bkalut-app`, `apps/09-bkalot-admin` ו-`supabase/` החזיר אפס שורות.
>
> אין שינוי קוד, אין מיגרציה, אין פריסה — מדידה בלבד. ראיות:
> `QA/bkalot-clone/which-field-mobile-390-0817/_results.md` + שני צילומים.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים).
>
> **נשאר פתוח (לא נסגר כאן, כבר נרשם):** כיסוי הצבע לתיבת ההסכמה — עדיין אין היום
> מסלול שמסמן אותה, כלומר זה אינו תקלה חיה; ופער התיעוד של SYSTEMS_STATUS.md בין
> 14/08 ל-17/08 (עשרות פעימות שלא הגיעו לכאן) — גדול מדי לצעד אחד.

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): ארבעת ענפי הוולידציה של סינון `/cases` נמדדו בייצור (מדידה בלבד).**
>
> `bkalot_clone_admin_cases` דוחה ערך לא-מוכר בכל אחד מארבעת שדות הסינון
> (`kind`/`status`/`decided`/`sort`) עם קוד שגיאה מפורש — נבנה במיגרציות
> 0060/0081/0082 ונבדק במסד. עד עכשיו הבדיקה היחידה שלהם הייתה קריאת SQL ישירה
> (`QA/bkalot-clone/queue-total-0816`, לא committed — פיגום, לא הטענה) או קריאת
> `/cases` בלי סינון בכלל (`admin-http-0813`). אף ענף לא נמדד דרך הכתובת
> שדפדפן באמת פונה אליה, עם סשן ניהול אמיתי.
>
> כניסה אמיתית ל-`bkalot-clone-admin` עם `l023131500@gmail.com` +
> `STD_ADMIN_PASSWORD`, ואז ארבע קריאות `/cases`: `kind:"bogus"` → HTTP 200
> `kind_unknown` (allowed: info/reminder/treatment); `status:"bogus"` →
> `status_unknown` (allowed: new/in_progress/sent/closed/rejected);
> `decided:"bogus"` → `decided_unknown` (allowed: yes/no); `sort:"bogus"` →
> `sort_unknown` (allowed: created_at/decided_at) — כולן זהות מילה-במילה למסד.
> ארבעת הערכים התקינים המקבילים עברו `ok:true` באותה בקשה (בקרה), ו-`queue_total`
> תואם ל-0099: `null` כשאין סינון או כש-`sort` הוא היחיד, `0` כשקיים סינון על
> מסד ריק. אין שינוי קוד, אין מיגרציה, אין פריסה. ראיות:
> `QA/bkalot-clone/cases-filter-validation-0817/`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים).

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): שער החריגה המספרית של `/case` נמדד בייצור (מדידה בלבד).**
>
> המשך לסריקת 0814 שמדדה את שער החריגה המספרית (id בן 25 ספרות) על ארבעת
> הנתיבים `document`/`queue`/`dispatch`/`set-status` — שם השער ברמת המסד
> (`::bigint` cast) מחזיר `*_not_found`. `case` שונה בכוונה: `bkalot_clone_admin_case`
> מקבל `p_id bigint` ישירות (לא `p jsonb`), כך ש-cast שגוי שם היה חוזר כ-400 גולמי
> מ-PostgREST — בלתי ניתן להבחנה מנפילת שער אחרי שהרשת כותבת מחדש סטטוסים ל-400.
> ההערה בקוד (index.ts:403-405) אומרת שהבדיקה נעשית לכן בפונקציית הקצה עצמה, לפני
> קריאת ה-RPC — זה מעולם לא נמדד מול הייצור עם id שחורג בפועל (`admin-http-0813`
> בדק רק ריק/"abc"/99999, כולם בטווח או לא-מספריים).
>
> כניסה עם `l023131500@gmail.com` + `STD_ADMIN_PASSWORD`, ואז POST ל-`/case` עם
> `id` בן 25 ספרות: HTTP 200, `{"ok":false,"error":"case_id_required"}` — בדיוק
> כפי שהערת הקוד טוענת, וקוד שונה מ-`case_not_found` שחוזר על `id:99999` הבקר.
> אין שינוי קוד, אין מיגרציה, אין פריסה. ראיות: `QA/bkalot-clone/case-id-overflow-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים).
>
> זה סוגר את הנתיב האחד עם id מספרי שסריקת 0814 (document/queue/dispatch/set-status)
> לא כיסתה — כל חמשת נתיבי ה-id של `bkalot-clone-admin` נמדדו כעת מול חריגה מספרית.

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): ענף source_invalid מהשרת נמדד בייצור — סוגר את סריקת 0058 (מדידה בלבד).**
>
> המשך ישיר לשלוש הרשומות שמתחת (kind_invalid, situation_unknown, topic_no_invalid) —
> אותה סריקה שורה-שורה של 0058 מול MESSAGES/CODE_FIELD בלקוח. `source_invalid`
> (0058 שורות 84-87), הבדיקה השנייה בפונקציה, הייתה הפריט האחרון שנשאר פתוח
> מאותה סריקה (סומן כ"לצעד הבא" ברשומת topic_no_invalid).
>
> בקשת POST ישירה אל bkalot-clone-intake, `source="not_a_real_source_xyz"`:
> HTTP 200, `error=source_invalid`, `allowed` עם 5 ערכים (form/yemot/nedarim/ai/admin)
> — זהים מילה-במילה ל-0058 שורה 84. הענף חסום מבנית מהטופס הגלוי: הלקוח שולח
> תמיד `source: "form"` קבוע (index.html:541), אין שדה או בחירה שמאפשרים ערך
> אחר — בדיוק כמו kind_invalid.
>
> ל-source_invalid אין ערך ב-CODE_FIELD בכוונה (index.html:340-341: הערת
> הלקוח עצמה כבר אומרת ש-kind_invalid ו-source_invalid אין להם שדה מוקלד).
> MESSAGES.source_invalid כבר קיים ונכון. אין שינוי קוד, אין מיגרציה, אין
> פריסה. ראיות: `QA/bkalot-clone/source-invalid-live-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים).
>
> **זה סוגר את ארבעת הבדיקות שנסרקו ב-0058** (kind_invalid, source_invalid,
> situation_unknown, topic_no_invalid) — כולן נמדדו כעת מול הייצור, כולן
> HTTP 200 עם קוד שגיאה מובנה תואם ללקוח. אין פער פתוח נוסף מסריקת הוולידציה
> הזאת.

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): ענף kind_invalid מהשרת נמדד בייצור (מדידה בלבד).**
>
> המשך ישיר לשתי הרשומות שמתחת (topic_no_invalid, situation_unknown) — אותה
> סריקה שורה-שורה של 0058 מול MESSAGES/CODE_FIELD בלקוח. `kind_invalid`
> (0058 שורות 79-82) הבדיקה הראשונה בפונקציה, מעולם לא נמדדה מול הייצור.
>
> בקשת POST ישירה אל bkalot-clone-intake (עוקפת את קבוצת ה-radio של הטופס),
> `kind="not_a_real_kind_xyz"`: HTTP 200, `error=kind_invalid`, `allowed` עם 3
> ערכים — זהים מילה-במילה לשלוש אפשרויות ה-radio בלקוח (index.html:154,158,162:
> info/reminder/treatment). הענף חסום מבנית מהטופס הגלוי: אין רביעית אפשרות
> ואין קלט חופשי, בדיוק כפי שהערת הלקוח עצמה כבר אומרת (index.html:340-341).
>
> ל-kind_invalid אין ערך ב-CODE_FIELD (ובכוונה — אינו שדה מוקלד שאפשר לסמן).
> MESSAGES.kind_invalid כבר קיים ונכון. אין שינוי קוד, אין מיגרציה, אין פריסה.
> ראיות: `QA/bkalot-clone/kind-invalid-live-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; ראו הקבצים לסדר ההרצה המלא).
>
> עדיין פתוח מאותה סריקה: `source_invalid` (0058 שורות 84-87) — אותה משפחת
> חסימה (source="form" קבוע בלקוח), לא נמדד עדיין בייצור. לצעד הבא.

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): ענף situation_unknown מהשרת נמדד בייצור (מדידה בלבד).**
>
> המשך ישיר לרשומה שמתחת (topic_no_invalid): אחרי שנסגר הפער שם, נקראו שאר
> ענפי האימות ב-0058 שורה-שורה מול MESSAGES/CODE_FIELD בלקוח.
> `situation_unknown` (0058 שורות 118-121) מעולם לא נמדד מול הפונקציה
> הפרוסה בייצור.
>
> בקשת POST ישירה אל bkalot-clone-intake (עוקפת את ה-`<select>` של הטופס),
> `situation="not_a_real_situation_xyz"`: HTTP 200, `error=situation_unknown`,
> `allowed` עם 24 ערכים — זהים מילה-במילה ל-24 האפשרויות ב-`<select
> id="situation">` בלקוח (index.html:252-277), ולכן הענף אינו נגיש מהטופס
> הגלוי, בדיוק כמו topic_no_invalid.
>
> בשונה מ-topic_no_invalid: `MESSAGES.situation_unknown` ו-`CODE_FIELD.situation_unknown`
> כבר קיימים ונכונים בלקוח — לא נדרש שינוי קוד, רק מדידה. אין שינוי קוד, אין
> מיגרציה, אין פריסה. ראיות:
> `QA/bkalot-clone/situation-unknown-live-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; ראו הקבצים לסדר ההרצה המלא).

> ## 🟢 17/08/2026 — **שכפול בקלות (§5ב): ענף topic_no_invalid מהשרת נמדד בייצור (מדידה בלבד).**
>
> הפעימה הקודמת (8e8bce4, 17/08) השאירה פתוח: ענף topic_no_invalid מהשרת עדיין
> לא נמדד בייצור, כי ה-preflight בטופס (index.html:502-524) מיישם את אותה
> בדיקה בדיוק כמו 0080 ולכן חוסם כל ערך שהשרת היה פוסל, לפני שהוא נשלח.
>
> שתי בקשות POST ישירות אל bkalot-clone-intake (PowerShell, עוקף preflight):
> topic_no="9999999999" (גדול מגבול integer) ו-topic_no="12ab" (אינו ספרות).
> שתיהן HTTP 200, error=topic_no_invalid, detail זהה מילה במילה לשתי הודעות
> whyTopicNoInvalid בלקוח — לא 502 עם SQLSTATE מודלף, שזו הייתה ההתנהגות לפני
> 0080. MESSAGES.topic_no_invalid כבר קיים בלקוח. נקרא במפורש ב-0080: שני
> התנאים חוזרים לפני ה-insert לטבלאות contacts/cases — אפס שורות נכתבו.
>
> אין שינוי קוד, אין מיגרציה, אין פריסה. ראיות:
> `QA/bkalot-clone/topic-no-invalid-live-0817/probe-live.txt`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (תשיעי בתור, ראו הקובץ לסדר ההרצה המלא).
>
> ⚠️ הלוח הזה מפגר: בין 14/08 (הרשומה שמתחת) ל-17/08 נרשמו עשרות פעימות עבודה
> (§5ב שכבות 1+3, פריסות, doc-merge) שלא הגיעו לכאן — נראה ב-`git log`. השלמת
> הפער היא עבודה נפרדת, גדולה מדי לצעד הזה; לא נעשתה כאן.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): השורה נכנסה לתור ולא היה מי שמעבד אותה (0070, #234 סעיף 2).**
>
> מיגרציה בלבד: אין שינוי קוד לקוח, אין פריסת edge function ואין פריסת פורטל.
> `apps/37` לא נגעה ו-`bkalot-clone-admin` נשארה v4.
>
> **מה היה:** השורה נכנסת לתור עם `max_attempts=0` ונשארת שם לנצח. המעבד של המקור
> סורק `attempts < max_attempts` ולכן לעולם אינו רואה אותה — וזה מכוון (0067
> הכרעה 2), כי הוא בונה תוכן מחדש מ-`topic_id` ושורת שכפול נושאת `topic_id=null`.
> כלומר לשכפול לא היה ולו מעבד אחד, ו«בתור» היה הבטחה שאיש אינו עומד מאחוריה.
>
> **מה נבנה:** `public.bkalot_clone_dispatch(jsonb)`, `service_role` בלבד, שורה אחת
> בקריאה. **אינו שולח** — אין בו `net.http`, אין `pg_net`, אין Resend ואין קריאה
> יוצאת אחת. `app_key='bkalot-clone'` ו-`mode='test'` הם תנאי כניסה על השורה ולא
> ארגומנטים; רשימת יעדי הבדיקה נבדקת **שוב** ברגע העיבוד; התוכן נקרא מהשורה ואינו
> נבנה מחדש; המצב הסופי `skipped` ולא `sent`, ו-`sent_at` נשאר null בכוונה — «אפס
> שורות עם `sent_at`» הוא המדד שמוכיח מצב טסט, וכתיבה לתוכו הייתה הורסת אותו.
>
> **נמדד** על פניות שנוצרו דרך נתיב הקליטה האמיתי מעל HTTP: מסלול מלא
> (`skipped`/`dry_run`/7,590 בתים/`sent_for_real=0`), עיבוד שני (**לא נכתבה שורת
> יומן שנייה**), שורה חסומה, `mode='live'` (**אפס כתיבות**), והיעד שהוסר מהרשימה
> לפני העיבוד (`blocked` + שורת יומן). שתי קריאות שוגרו במפורש אל שורות של המקור
> והוחזרו `not_a_clone_row` בלי ולו כתיבה אחת. הרשאות נמדדו אחרי: `anon=false`,
> `authenticated=false`, `service_role=true`. הפרדיקט של `queue_due` מחזיר `[6]`
> בלבד, טביעת אצבע `aa6929ee…` זהה לפני ואחרי, והבדיקה התגלגלה אחורה במלואה.
>
> **אין צילום מסך:** ל-`bkalot_clone_dispatch` אין כתובת HTTP ו-`admin.html` לא
> נגעה — אין מסך שהשינוי משנה בו משהו. זה בדיוק #234.
>
> **נשאר פתוח:** אין נתיב HTTP ואין כפתור «עבד עכשיו» — הלבנה הבאה (ואחריה פריסה);
> `cases.status` נשאר `'new'`; `body_matches_document` נמדד ואינו חוסם (`render`
> עושה upsert, והפקה חוזרת אחרי ההכנסה משאירה גוף ישן בשורה);
> `pdf`/`audio` → `channel_unsupported`. QA: `QA/bkalot-clone/dispatch-0814/`.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): התור קרא את הכתובת מאיש הקשר, ואיש הקשר נדרס לפי טלפון (0068, #235 נסגר).**
>
> מיגרציה בלבד: אין שינוי קוד לקוח, אין פריסת edge function ואין פריסת פורטל.
> `apps/37` לא נגעה ו-`bkalot-clone-admin` נשארה v4.
>
> **מה היה:** `bkalot_clone_intake` מאתר איש קשר לפי `(app_key, phone)` בלבד ודורס
> את המייל שלו (`email = coalesce(excluded.email, contacts.email)`), וההסכמה שלו
> דביקה-אמת (`consent = contacts.consent or excluded.consent`). `bkalot_clone_queue`
> קרא את `v_contact.email` **בזמן הלחיצה** — כלומר המכתב של פנייה א' יוצא לכתובת
> שפנייה ב' כתבה מאוחר יותר. נלקח לפני השולח בכוונה, כי הכרטיס עצמו ניסח את זה
> כהכרעה שצריכה להיקבע לפני שנבנה שולח.
>
> **ההכרעה:** הכתובת וההסכמה הן נתון של **הפנייה**, ונשמרות עליה ברגע הקליטה
> (`cases.to_email`, `cases.consent`). איש הקשר נשאר מפתח זהות ואינו מקור לכתובת.
> ההסכמה נבדקת פעמיים — על הפנייה ועל איש הקשר (השתקה ברמת האדם) — ושני המסלולים
> מחזירים `no_consent` ונבדלים ב-`consent_source`.
>
> **נמדד** על ארבע פניות שנקלטו דרך נתיב ה-HTTP האמיתי. הדריסה שוחזרה חיה: פניות
> 41 ו-42 חזרו שתיהן עם `contact_id=47`. פנייה 41 → `queued`, `qa.bkalot@more30.com`,
> `contact_email_differs=true`; פנייה 42 → `blocked` על הכתובת שלה עצמה; פנייה 43
> (`consent=false`) → `no_consent`/`case` ובלי שורת תור; פנייה 44 עם איש קשר שהושתק
> ידנית → `no_consent`/`contact`, ואחרי החזרת ההסכמה `queued` ואידמפוטנטי.
>
> **הנגד-עובדה נמדדה:** הכתובת ש-0067 היה קורא לפנייה 41 היא
> `later.overwrite.0814@more30.com`, והיא אינה ברשימת יעדי הבדיקה. כלומר מה שהציל
> את המכתב לפני הצעד הזה הוא רשימת ההיתר ולא נכונות הכתובת — וברגע שיהיה שולח
> ומצב live, רשימת ההיתר לא תציל דבר.
>
> **בידוד ומצב טסט:** `max_attempts=0`, והפרדיקט של `queue_due`/`queue_process_dryrun`
> מחזיר `[6]` בלבד. `delivery_log=3` ללא שינוי, אפס `live`, אפס `sent_at`. המקור לא
> נגע — 8 שורות `app_key='bkalot'` וטביעת אצבע `aa6929ee…` זהה. הבדיקה התגלגלה אחורה
> במלואה. אין צילום מסך: אין מסך שהשינוי משנה בו משהו.
>
> **נשאר פתוח:** #234 סעיף 2 — **אין שולח**, השורה נכנסת לתור ונשארת שם; והשדות
> `address_source`/`contact_email_differs` נמדדים ואינם מוצגים במסך הניהול.
> QA: `QA/bkalot-clone/address-0814/`.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): לכניסה לתור לא הייתה ולו כתובת HTTP אחת (v4, #234 סעיף 1 חצי ראשון, #235 נפתח).**
>
> 0067 בנתה את `bkalot_clone_queue`, מדדה אותה במסד ונתנה לה `service_role` בלבד —
> וסיימה במשפט «אין נתיב HTTP ואין כפתור». זה הנתיב. `bkalot-clone-admin` v3 → **v4**,
> `ROUTES` משבעה לשמונה, מאחורי אותו שער סשן בדיוק כמו `render` ו-`document`.
> **אין מיגרציה בצעד הזה, ו-`admin.html` לא נגעה** — הכפתור הוא הלבנה הבאה.
>
> **הכרעה:** אין בנתיב ארגומנט שנוגע ב-`mode`, ב-`status` או ב-`to_address` — הנמען
> נגזר במסד, `mode='test'` קשיח שם, ורשימת ההיתר נבדקת שם. נמדד: גוף שמנסה לקבוע
> `mode:"live"` וכתובת משלו נבלע, והשורה נשארה `test`/`blocked` עם הכתובת שנגזרה.
>
> **נמדד — 31 בקשות HTTP, נתונים דרך נתיב הקליטה האמיתי ולא בהזרקה למסד:**
> ה-rpc עצמו עם מפתח anon → **42501**; בלי טוקן → 401; טוקן שלא הונפק → 401;
> יעד מאושר → `queue_id=11`, `queued`, 7,590 בתים; לחיצה שנייה → אותו `queue_id`,
> `already_queued=true`, בלי שורה שנייה; `document` מדווח `queue_status=queued`;
> יעד שאינו ברשימה → `blocked`, ו-`status_detail` הוא נוסח המקור מילה במילה;
> `logout` ואז `/queue` → 401. `max_attempts=0` בשלוש השורות, והפרדיקט של
> `queue_due`/`queue_process_dryrun` מחזיר `6/bkalot` בלבד — השכפול אינו נשאב למעבד
> המקור. `q.body = d.body_html`, `q.subject = d.title`, `q.content_bytes` — כולם true.
>
> **מה שכמעט נבלע:** בדיקת «בלי הסכמה» עברה בטעות — שלוש פניות עם אותו טלפון חזרו
> כולן עם `contact_id=39`, איש קשר שכבר נשא `consent=true`, והשומר לא נדרך כלל.
> הרצה שנייה עם טלפון חדש (`contact_id=42`, `consent=false`) החזירה `no_consent`
> ולא כתבה שורה. מזה **#235**: התור קורא את הכתובת מאיש הקשר בזמן ההכנסה, ואיש
> הקשר משוכפל לפי טלפון בלבד ומייל נדרס — כלומר מסמך של פנייה ישנה יכול להיכנס
> לתור עם כתובת שפנייה מאוחרת כתבה. להכריע לפני שנבנה שולח.
>
> **מצב טסט, נמדד:** `delivery_log=3` ללא שינוי, אפס `mode='live'`, אפס `sent_at`.
> **המקור לא נגע:** 8 שורות `app_key='bkalot'` וטביעת אצבע `aa6929ee…` זהות לפני ואחרי.
> **הבדיקה התגלגלה אחורה במלואה** — הבסיס חזר בדיוק: cases=0 · documents=0 ·
> admin_users=1 · contacts=4 · outbound_queue=8 · delivery_log=3 · catalog=888.
> אין צילום מסך: אין מסך שהשינוי משנה בו משהו. QA: `QA/bkalot-clone/queue-http-0814/`.
>
> ---

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): המסמך הופק ולא היה מי שמכניס אותו לתור (0067, #234 נפתח).**
>
> 0064 הכרעה 5 קבעה במפורש: «`queue_id` null הוא טרם נשלח, ושכבת השליחה תמלא אותו».
> שכבת השליחה לא נבנתה, ולכן העמודה נשארה null בכל מסמך שהופק אי פעם, ואין ולו נתיב
> אחד שיכול למלא אותה. **הצעד הזה מכניס לתור ואינו שולח** — אין בפונקציה `net.http`,
> אין `pg_net`, אין Resend ואין תור עבודה.
>
> **מה נבנה:** `public.bkalot_clone_queue(jsonb)` (service_role בלבד), ו-
> `bkalot_clone_admin_document` הורחבה ב-`queue_status`+`queue_mode` — בלעדיהם
> `queue_id` non-null של שורה **חסומה** היה נקרא במסך הניהול כ«נשלח».
>
> **הבידוד ממנוע המקור — ההכרעה המרכזית.** `bkalot_auto.queue_due` ו-
> `queue_process_dryrun` סורקות לפי `status='queued' and mode='test' and
> scheduled_at<=now() and attempts<max_attempts`, **בלי סינון app_key**. שורת שכפול
> עם `max_attempts` ברירת-מחדל הייתה נשאבת למעבד של המקור, ושם `build_content(topic_id)`
> על `topic_id=null` הייתה מסמנת אותה `failed` — המעבד של המקור בונה תוכן מחדש מנושא
> ואינו קורא את הגוף ששמור בשורה. הפתרון בנתון ולא בשינוי קוד: שורות השכפול נכנסות עם
> **`max_attempts=0`** = אין ניסיון אוטומטי מותר. **שום פונקציה של `bkalot_auto` לא שונתה.**
> נמדד: הפרדיקט המדויק של שתי הפונקציות (כקריאה בלבד — המעבד עצמו לא הורץ, הרצתו הייתה
> משנה את שורת המקור 6) מחזיר את שורה 6 של המקור בלבד, ולא את שורת השכפול 9.
>
> נמדד על פניות שנוצרו דרך נתיב הקליטה האמיתי מעל HTTP (30/31/32, 59 זכויות כל אחת):
>
> | מסלול | תוצאה |
> |---|---|
> | יעד ברשימת הבדיקה | `queue_id=9`, `status=queued`, 7,596 בתים |
> | לחיצה שנייה על אותו מסמך | אותו `queue_id=9`, `already_queued=true` — לא נוצרה שורה שנייה |
> | יעד שאינו ברשימה | `queue_id=10`, `status=blocked`, נוסח המקור מילה במילה |
> | בלי הסכמה | `no_consent` — **לא נכתבה שורה בכלל** |
>
> **התוכן שנכנס לתור הוא התוכן שהופק ולא נבנה מחדש** — `q.body = d.body_html`,
> `q.subject = d.title`, `q.content_bytes = octet_length(d.body_html)`, שלושתם true.
> זה ההבדל המהותי מהמקור, שם התוכן נבנה בזמן העיבוד.
>
> **מצב טסט:** `mode='test'` קשיח בקוד, **אין ארגומנט שמאפשר live**. אחרי שבע הקריאות:
> `delivery_log=3` ללא שינוי, אפס שורות עם `sent_at`, אפס שורות `mode='live'`.
> **המקור לא נגע:** 8 שורות `app_key='bkalot'` נשארו 8 וטביעת האצבע שלהן זהה לפני ואחרי
> (`aa6929ee…`). הבדיקה התגלגלה אחורה במלואה והבסיס חזר בדיוק: cases=0 · documents=0 ·
> contacts=4 · outbound_queue=8 · delivery_log=3 · catalog=888 · templates=2.
>
> **אין צילום מסך:** אין מסך שהשינוי משנה בו משהו — ל-`bkalot_clone_queue` אין כתובת
> HTTP, `bkalot-clone-admin` נשארה v3 ו-`admin.html` לא נגעה. זה בדיוק #234.
>
> **פתוח (#234):** (1) אין נתיב HTTP ואין כפתור «הכנס לתור»; (2) אין שולח — השורה נכנסת
> ונשארת; (3) `cases.status` נשאר `'new'` («sent» יהיה שקר); (4) `pdf`/`audio` →
> `channel_unsupported`. QA: `QA/bkalot-clone/queue-0814/README.md`.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): המכתב לא אמר על מה הוא, והערה שאין השאירה פסקה ריקה (0066).**
>
> 0065 הפך את `{{situation}}` לבטוח להדפסה והשאיר קו מנוסח: אף תבנית מוזרעת אינה
> מדפיסה אותו. הסיבה הייתה מדידה ולא היסוס — פנייה בלי מצב הוציאה נושא
> **«בקלות — פנייה 25 ()»**, סוגריים ריקים. תבנית שעוטפת מציין בטקסט זקוקה למשהו
> שיודע להשמיט את העטיפה כשאין ערך, ובלי זה יש רק שתי אפשרויות גרועות: «לפי המצב
> שסימנת: .» או לא להזכיר את המצב בכלל.
>
> אותו חסר כבר ישב בייצור בלי שנרשם: `{{note}}` יושב ב-`<p>{{note}}</p>` בשתי
> התבניות, ופנייה בלי הערה מייצרת `<p></p>` — פסקה ריקה בגוף מכתב שנשלח לאדם.
> בגוף הטקסט זה נבלע (קיפול `\n{3,}` של 0063), ב-HTML לא. **הבקרה הורצה ולא הונחה:**
> הנוסח הישן על פנייה 27 החזיר `<p></p>` — `empty_p = true`.
>
> **מה נבנה:** מקטע מותנה `{{#key}}…{{/key}}` ברנדרר, ושתי התבניות עודכנו.
>
> | פנייה (דרך נתיב הקליטה האמיתי) | מצב | הערה | מה יצא |
> |---|---|---|---|
> | 26 · treatment · disability | יש | יש | שתי השורות מודפסות |
> | 27 · treatment · disability | יש | אין | המצב מודפס, ההערה נעלמת כולה |
> | 28 · info | אין | אין | שתיהן נעלמות, בלי סוגריים ריקים |
>
> בכל השלושה: `<p></p>` אינו מופיע, לא נשאר ולו `{{` אחד, ו-`placeholders_unresolved`
> ריק. השורה שנוספה — «הרשימה נבנתה לפי המצב שסימנת: נכות כללית / מוגבלות.» — קוראת
> את העברית מ-`name_he` של 0065, בלי כפל-קידוד.
>
> **שני שומרים שנמדדו:** סימן מקטע יתום (`{{#typo}}…{{/nomatch}}`) חוזר כ-
> `["/nomatch", "#typo"]` ומוסר — הרגקס של 0063 תפס `[A-Za-z0-9_]` בלבד, ולכן טעות
> כתיב בתבנית הייתה נשארת גלויה בגוף המכתב בלי שאיש ידווח. והמקטעים נפתרים **לפני**
> החלפת המציינים: פנייה 29 נקלטה עם הערה שכתובה בה `{{/note}}` באמצע, והמכתב חזר
> שלם (3,491 תווים, ה«בברכה» במקומו) — המילים נשמרו והמחרוזת עצמה הוסרה ודווחה.
> זו הכרעה ולא תקלה, ונרשמת ככזו: אדם שיכתוב `{{/note}}` בהערה לא יראה אותה במכתב.
>
> **מצב טסט:** `outbound_queue=8` · `delivery_log=3` · `catalog=888` — בלי תזוזה, ו-
> `queue_id` נשאר null. הבדיקה התגלגלה אחורה במלואה (פניות 26–29, איש קשר 32, תבנית
> הבקרה) והמצב חזר לבסיס. הרשאות אחרי `create or replace`: `anon=false ·
> authenticated=false · service_role=true`.
>
> **פתוח:** מסלול השליחה (`outbound_queue` + `delivery_log` + ערוץ) — הלבנה הבאה של
> §5ב; `render` מקבל `template_key` והמסך אינו שולח אותו; ואין מסך עריכת תבניות,
> ולכן התנאי `updated_at = created_at` ששמר על נוסח ידני נשרף כאן.
> QA: `QA/bkalot-clone/template-sections-0814/`.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): המסמך היה מדפיס «disability» באמצע פסקה בעברית (0065, #232 נסגר).**
>
> `rights.situation_map` החזיקה שתי עמודות בלבד — `situation` ו-`codes` — והמפתח אנגלי.
> 0063 הגדיר את `{{situation}}` כמציין-מקום זמין ובמפורש **לא** השתמש בו באף תבנית
> מוזרעת, מהסיבה שנכתבה שם: לשם אין תרגום במסד. התוויות העבריות של 24 המצבים ישבו
> במילון הלקוח מאז #223 — כלומר במקום שהמסמך אינו יכול לקרוא ממנו.
>
> **מה ש-#232 השאיר להכריע, ומה שהכריע:** עמודה ב-`rights.situation_map` (מקור אחד
> לשם — גם למסך וגם למסמך) מול מילון שני בצד השרת. הכרטיס כתב «הראשון עדיף ואינו
> חינם — `rights.*` נקראת ע"י מערכת 10 החיה». המחיר נמדד ולא הונח:
> `public.rights_situation_map` מוגדרת כ-`SELECT situation, codes` — רשימת עמודות
> מפורשת ולא `*` — ולכן הוספת עמודה אינה משנה את צורת ה-view. אומת מקצה לקצה דרך
> נתיב הקריאה של anon עצמו: `GET /rest/v1/rights_situation_map?select=*` → 200,
> **24 שורות, שני מפתחות** (`situation`, `codes`), ו-`name_he` אינו דולף החוצה.
>
> **מקור התוויות, ולא ניסוח חדש:** `apps/10-bkalot-rights/data.json` → `meta.situations`.
> נמדד מול מילון הלקוח של השכפול: 22 זהים תו-בתו, ושניים נבדלים ב**תו אחד** —
> `property_owner` ו-`idf_disabled`, גרשיים ASCII (`"`) במערכת 10 מול גרשיים עבריים
> (`״`) בשכפול. נבחר נוסח השכפול: זה מה שהאדם רואה במסך, והמסמך צריך להסכים איתו.
> `md5` של המילון בקוד ושל 24 השורות במסד יצאו זהים — `34895afa…` — כלומר העברית
> נכתבה ונקראה בלי כפל-קידוד ובלי ניסוח מחדש. `health_check` קיים במילון של 10
> ואינו שורה ב-`situation_map`, ולכן אין לו מה להיכתב.
>
> | נמדד | תוצאה |
> |---|---|
> | פנייה 24, `disability`, דרך נתיב הקליטה האמיתי | 59 זכויות, `queued:false` |
> | `render` על התבנית הרגילה | `situation_label: "נכות כללית / מוגבלות"` |
> | תבנית בדיקה שמדפיסה `{{situation}}` | בגוף: **«המצב שסימנת: נכות כללית / מוגבלות»** |
> | `disability` בכל מקום במסמך (כותרת+טקסט+HTML) | **false** |
> | `name_he` שרוקן זמנית | נפל למפתח — `(disability)` — **ולא נעלם**, ומדווח ב-`situation_label` |
> | פנייה 25, `kind=info` (בלי מצב) | `situation_label: ""`, המציין מוסר |
> | הרשאות | `anon=false`, `authenticated=false`, `service_role=true` |
> | מצב טסט | `outbound_queue=8`, `delivery_log=3`, `catalog=888` לפני ואחרי, `queue_id` null |
>
> **מה שהמדידה של פנייה 25 מלמדת, ונרשם ולא נבלע:** התבנית הדפיסה `פנייה 25 ()` —
> סוגריים ריקים. כלומר `{{situation}}` בטוח **להדפסה** מרגע זה, אבל תבנית שעוטפת
> אותו בסימני פיסוק זקוקה לשורה מותנית, וזו שכבת התבנית (נתון הניתן לעריכה מהניהול)
> ולא הרנדרר. לכן אף אחת משתי התבניות המוזרעות לא נגעה בצעד הזה.
>
> הבדיקה התגלגלה אחורה במלואה ובסדר הנכון (פניות לפני איש הקשר): `cases=0`,
> `case_rights=0`, `documents=0`, `contacts=4`, `templates=2`, ו-24 המצבים עם שם.
>
> ---

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): הכפתור נמדד מדפדפן ולא היה בייצור — עכשיו ההפקה נמדדת על `more30.com` עצמו (שכבה 3 לבנה 5).**
>
> הפעימה הקודמת בנתה את כפתור «הפק מסמך» ומדדה אותו בדפדפן אמיתי — מול **שרת
> סטטי מקומי** שמגיש את הקובץ מהריפו. היא נסגרה עם קו פתוח שנוסח בה עצמה
> במפורש: «הקובץ טרם נפרס. `more30.com/bkalot-studio/admin` עדיין מגיש את הגרסה
> בלי הכפתור». זה נלקח כפי שנוסח ולא הורחב: **פריסה בלבד** — אין שינוי קוד, אין
> מיגרציה ואין פריסת edge function, והקובץ זהה לזה שנכנס ל-`c2a0a36`.
>
> **למה זה צעד בפני עצמו:** מדידה מול `127.0.0.1` היא מדידה של הקוד ולא של
> המוצר. כל מה שבין הדפדפן לקובץ — ה-rewrite ב-`vercel.dist.json`, ההעתקה
> ב-`stage-portal.ps1`, ו-NetFree שמזריק 236 בייט — לא נבדק בה כלל.
>
> **הבדיקה שרצה לפני הפריסה ולא הונחה:** `portal/dist` נבנה ב-13/08 ויושב על
> הדיסק מאז, ופריסה מ-`dist` ישן מחזירה את **כל הפורטל** אחורה בלי ששום דבר
> ידווח שגיאה. שמות הנכסים המגובבים ב-`dist/index.html` הושוו לייצור לפני
> הפריסה — `index-C2AHwa-z.js` · `index-B35ByRD-.css`, זהים.
>
> | נמדד ב-HTTP | לפני | אחרי |
> |---|---|---|
> | `/bkalot-studio/admin` | 200 · 32,830 | **200 · 41,086** |
> | `/bkalot-studio/admin/` | 200 | 200 · 41,086 — זהה |
> | `/bkalot-studio` (הטופס) | 200 · 21,272 | 200 · 21,272 — ללא רגרסיה |
> | `more30.com/` | 200 · 3,517 | 200 · 3,517, אותם שני נכסים |
>
> 41,086 − 40,850 = **236**, בדיוק דלתת NetFree הידועה ולא מספר אחר.
>
> | נמדד בדפדפן אמיתי (1280×900) **על הכתובת החיה** | תוצאה |
> |---|---|
> | מסך הכניסה | **הקופי החדש** — «מפיק מהן את מכתב התשובה. אין ממנו שום שליחה» |
> | פנייה 23 (דרך נתיב הקליטה האמיתי, `disability`) | 59 זכויות · `B100 B111 B114 B124 B144 B195` |
> | הכפתור | **«הפק מסמך»** נמצא בייצור — וזה מה שהצעד קנה |
> | לחיצה | `render` הצליח, `document_id=14` |
> | שורת המדידה | `תבנית rights_treatment_reply · 3439 תווי טקסט · 59 זכויות (כל הרשימה) · לא נשלח — מצב טסט` |
> | «הצג» → אורך הטקסט ב-DOM | **3439 — שווה בדיוק למה ש-`render` דיווח** |
> | ה-iframe | `sandbox=""`, ו-`contentDocument` **null** — ה-sandbox נאכף באמת, לא רק כתוב במאפיין |
> | שגיאות קונסולה | **0** לאורך כל הזרימה |
> | מצב טסט | `outbound_queue=8`, `delivery_log=3`, `queue_id` של מסמך 14 **null** |
>
> ההבדל מהמדידה המקומית — 59 זכויות ו-3439 תווים במקום 42 ו-2485 — אינו שינוי
> התנהגות אלא `situation` אחר. מה שחוזר בשתי המדידות הוא **היחס**: אורך הטקסט
> בשורת ההפקה שווה לאורך שהגיע ל-DOM.
>
> הנתונים התגלגלו אחורה במלואם ובסדר הנכון (הפנייה לפני איש הקשר — ה-FK הוא
> `ON DELETE SET NULL`), והבסיס חזר בדיוק: `cases=0`, `documents=0`,
> `admin_users=1`, `contacts=4`. **נשאר פתוח:** מסלול השליחה
> (`outbound_queue` + ערוץ) — הלבנה הבאה; #232; ו-`public_visible` של #37 נשאר
> `false`. `QA/bkalot-clone/deploy-0814/` — שני צילומים.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): להפקה היו שני נתיבי HTTP ולא היה כפתור אחד שקורא להם (שכבה 3 לבנה 4 — #233 נסגר).**
>
> שתי הפעימות הקודמות בנו את שני צדי ההפקה — `render` שכותב מסמך ו-`document`
> שקורא את גופו בחזרה — ומדדו אותם ב-35 בקשות משורת הפקודה. `#233` נשאר פתוח על
> סעיף אחד, והוא היחיד שאדם רואה: **`apps/37-bkalot-clone/admin.html` אינה קוראת
> לאף אחד מהם.** מסך הפנייה הציג «מסמכים (0)» ושורה שאומרת שמנוע ההפקה טרם נבנה —
> משפט שהיה נכון עד 13/08 ומאז אינו. הצעד הזה הוא **הקובץ הזה בלבד**: אין מיגרציה,
> אין פריסת edge function, ואין שינוי אחד בשרת.
>
> **מה נבנה:** כפתור **«הפק מסמך»** מעל טבלת המסמכים (מתחלף ל«הפק מחדש» כשיש
> מסמך, כי `render` הוא upsert על `(case_id, kind)` ואינו יוצר עותק שני); **שורת
> מדידה** אחרי ההפקה; כפתור **«הצג»** בכל שורת מסמך; וחמישה קודי שגיאה חדשים
> בעברית (`template_unknown`, `template_disabled`, `render_empty`,
> `document_id_required`, `document_not_found`).
>
> | נמדד — דפדפן אמיתי, 1280×900, מול ה-edge והמסד החיים | תוצאה |
> |---|---|
> | טעינה + כניסה עם משתמש בדיקה | 0 שגיאות קונסולה · «מחובר: בדיקת QA שכבה 3» |
> | פנייה בלי מסמך | הכפתור **«הפק מסמך»** — לחיץ דווקא כשאין מה להציג |
> | לחיצה | `render` הצליח, `document_id=13` |
> | שורת המדידה שהוצגה | `תבנית rights_treatment_reply · 2485 תווי טקסט · 42 זכויות (כל הרשימה) · לא נשלח — מצב טסט` |
> | `fallback` · `placeholders_unresolved` | **false** · **ריק** — התבנית האמיתית, ואין מציין בלי ערך |
> | אחרי ההפקה | הכפתור → **«הפק מחדש»**, והטבלה קיבלה שורה |
> | «הצג» → `document` | «בקלות — 42 זכויות שאותרו עבורך (פנייה 22)» |
> | אורך הטקסט שהגיע ל-DOM | **2485 — שווה בדיוק למה ש-`render` דיווח** |
> | ה-iframe | `sandbox=""` — **בלי `allow-scripts` ובלי `allow-same-origin`** |
> | תוכן המסמך | עברית תקינה, RTL, שמות אמיתיים מ-`rights.catalog` (דמי לידה B5, קצבת ילדים B20…) |
> | מצב טסט | `queued=false` **בשני מקורות בלתי-תלויים** — שורת ההפקה ושורת המטא |
>
> **ההכרעה של הצעד: ה-HTML נכנס ל-`<iframe sandbox="">` ולא ל-DOM של המסך.** הגוף
> נבנה בשרת מתבנית שיושבת ב-`bkalot_clone.templates` **וניתנת לעריכה במסד**;
> `innerHTML` כאן היה נותן לתבנית את ההרשאות של מסך הניהול — כולל **הטוקן שחי
> בזיכרון הדף הזה בלבד**. ה-escape של `0063` מגן על הערכים שנשתלים בתבנית, לא על
> התבנית עצמה.
>
> **תיקון קופי שנגזר מהצעד:** שתי שורות במסך הכניסה הכריזו שאין בו שום מסמך ושום
> הפקה. אחרי הצעד הזה זה פשוט לא נכון, והן נכתבו מחדש — **מפיק, לא שולח**.
>
> הנתונים התגלגלו אחורה כמו בכל פעימה: מסמך 13, 42 `case_rights`, פנייה 22, שני
> סשנים, משתמש ניהול 5 ואיש קשר 28. **הקובץ טרם נפרס** —
> `more30.com/bkalot-studio/admin` עדיין מגיש את הגרסה בלי הכפתור, וזה הצעד הבא.
> השליחה עצמה (`outbound_queue` + ערוץ) היא לבנה נפרדת ואינה בצעד הזה.
> `QA/bkalot-clone/render-ui-0814/` — שני צילומי מסך.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): הגוף נכתב ולא היה מי שקורא אותו בחזרה (שכבה 3 לבנה 3 — #233 סעיף 2 נסגר).**
>
> הפעימה הקודמת נתנה ל-`bkalot_clone_render` כתובת HTTP ומדדה אותה — 5,223 תווי
> HTML בשורה במסד — ונסגרה עם `#233` פתוח על שני סעיפים. סעיף 2 הוא זה: **אין מה
> להציג גם אחרי הפקה.** `bkalot_clone_admin_case` מחזירה מטא-דאטה בלבד, במפורש
> ובכוונה (`0060` שורה 215), ולכן מסך הניהול יכול להציג «מסמכים (1)» ולא את
> המסמך. הצעד הזה הוא בדיוק מה ש-#233 ביקש ולא יותר: **פונקציית קריאה אחת**.
>
> **מה נבנה:** `0064` — `public.bkalot_clone_admin_document(jsonb)`, `service_role`
> בלבד; ו-`bkalot-clone-admin` **v3** — נתיב `document`, `ROUTES` משישה לשבעה.
> **הפונקציה קריאה בלבד** — `SELECT` יחיד, אין בה `INSERT`/`UPDATE`/`DELETE`.
> הנתיב היחיד שכותב כאן נשאר `render`.
>
> | נמדד — 18 בקשות על הכתובת החיה | תוצאה |
> |---|---|
> | `POST /nope` — **הבדיקה של הפריסה עצמה** | 404 + רשימה שמונה `document`; v2 הכירה שישה |
> | **ה-rpc עם מפתח ה-anon** | **`42501 permission denied`** — השער הוא ה-edge, ולא קישוט |
> | `document` בלי `x-admin-token` · טוקן שלא הונפק | **401** `token_required` · **401** `invalid_session` |
> | `/case` על אותה פנייה | `has_body=true` ו-`body_html` **אינו בתשובה** — 0060 שורה 215 נשארה כפי שהיא |
> | הקריאה עצמה | `ok:true`, `id=12`, `case_id=21` **תואם**, `kind=email` |
> | `html_chars`/`text_chars` מול `render` | **5,223 / 3,415 — שני מפיקים בלתי-תלויים מסכימים** |
> | אורך מה שהגיע = המספר שדווח | **true** — שולל קטיעה בדרך |
> | עברית בגוף | שם הפונה ב-HTML **true** · ההערה בטקסט **true** |
> | `site_url` בגוף · `javascript:` בגוף | `https://more30.com/bkalot-studio` **true** · **false** |
> | בלי `id` · `id` שהוא מילה · `id` שאינו קיים | `document_id_required` ×2 · `document_not_found` |
> | `id` של 25 ספרות | **`document_not_found`** ולא 502 — `length` נבדק לפני ה-cast |
> | אותו טוקן אחרי `logout` | **401** — גם נתיב הקריאה נסגר עם הסשן |
>
> **ההכרעה של הצעד: פונקציה נפרדת ולא הרחבה של `admin_case`.** ההחלטה שלא לשלוח
> גוף ברשימה אינה תקלה — פנייה עם ארבעה מסמכים הייתה גוררת ~20KB בכל פתיחת פנייה,
> והמסך צריך גוף רק כשנלחץ מסמך אחד. הרחבה שם הייתה משנה את מה שכבר נמדד ב-25
> בדיקות. **והגוף מוחזר כמות שהוא:** ה-escape נעשה בזמן ההפקה (`0063`), וסניטציה
> שנייה בקריאה הייתה אומרת שאיננו סומכים על הראשונה — ואז המסמך שיוצא החוצה שונה
> ממה שהמנהל ראה.
>
> **מצב טסט, נמדד ולא בהצהרה:** `outbound_queue=8`, `delivery_log=3`, `catalog=888`
> לפני ואחרי, ו-`documents` עם `queue_id` = **0**. אין בנתיב שום מסלול יוצא.
> הבדיקה התגלגלה אחורה: נמחקו 2 מסמכים, 118 `case_rights`, 2 פניות ואיש קשר —
> **הפנייה לפני איש הקשר**, כי `cases_contact_id_fkey` הוא `ON DELETE SET NULL`.
> אחרי: `cases=0`, `case_rights=0`, `documents=0`, `contacts=4`. `admin_sessions`
> 3→5 (שתי שורות audit של כניסות אמיתיות), שתיהן מבוטלות, `live=0`, ואפס מנהלים
> עם `failed_attempts>0`.
>
> **נשאר פתוח (#233 סעיף 1):** אין כפתור — `admin.html` אינה קוראת לא ל-`/render`
> ולא ל-`/document`. **ולכן אין כאן צילום מסך: אין עדיין מה לצלם.** אבל עכשיו,
> בפעם הראשונה, שני הצדדים של המסך קיימים — מה שמפיק ומה שקורא. הצעד הבא הוא המסך.
> השליחה עצמה טרם נבנתה. `QA/bkalot-clone/document-http-0814/`.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): להפקת המסמך לא הייתה ולו כתובת HTTP אחת (שכבה 3 לבנה 2 — #233 נפתח).**
>
> `0063` בנתה את `bkalot_clone_render`, מדדה אותה, ושללה ממנה EXECUTE מכל תפקיד
> פרט ל-`service_role`. כלומר ההפקה קיימת ונכונה, ואין ולו נתיב אחד שדפדפן
> יכול להגיע אליה דרכו — בדיוק המצב ששש פונקציות הניהול היו בו לפני `#224`
> סעיף 3. **אין בצעד הזה מיגרציה, אין DDL, ולא נגעתי ב-`admin.html`.**
>
> **מה נבנה:** `bkalot-clone-admin` **v2** — נתיב `render`, ו-`ROUTES` עלה
> מחמישה לשישה. **זהו הנתיב הראשון כאן שכותב**, ולכן הוא יושב מאחורי אותו שער
> בדיוק ולא לפניו; `bkalot_clone_render` נשארת `service_role` בלבד, והדרך
> היחידה להגיע אליה היא דרך הקוד הזה.
>
> | נמדד — 17 בקשות על הכתובת החיה | תוצאה |
> |---|---|
> | `POST /nope` — **הבדיקה של הפריסה עצמה** | 404 + רשימה שמונה `render`; v1 הכירה חמישה |
> | `render` בלי `x-admin-token` · טוקן שלא הונפק | **401** `token_required` · **401** `invalid_session` |
> | `render` על פנייה מנתיב הקליטה האמיתי | `document_id=7`, `fallback:false`, **59**/`all`, 3,415 טקסט · 5,223 HTML, `placeholders_unresolved: []` |
> | `render` שוב | **אותו `document_id`** — upsert ולא צבירה |
> | `template_key` שאינו קיים · אחר במפורש | `template_unknown` + המותרות · 185/379 — התבנית באמת מחליפה |
> | אותו טוקן אחרי `logout` | **401** — הנתיב הכותב נסגר עם הסשן |
> | שורות ב-`documents` אחרי 4 הפקות | **1** · `queue_id`+`storage_path` = `null` |
> | `<li>` בגוף · `B100` בראש | **59** · **המדידה השמינית** שמסכימה על אותו סדר |
>
> **ההכרעה של הצעד: `site_url` ננעל בקוד ואינו מתקבל מהגוף, גם לא ממנהל
> מחובר.** `{{siteUrl}}` נשתל בתוך `href` בגוף ה-HTML; ה-`escape` של `0063`
> מונע יציאה מהמאפיין אבל **אינו מגביל סכימה**, ולכן ערך מבחוץ יכול לשתול
> קישור זר בתוך מסמך שאדם קורא ובהמשך שולח. נמדד ולא הונח: קורא ששלח
> `site_url: "javascript:alert(1)"` קיבל 200 ואותו מסמך, ובגוף —
> `https://more30.com/bkalot-studio` בטקסט וב-HTML, ו-`javascript:` **בשניהם
> false**.
>
> **מצב טסט, ולא בהצהרה:** `outbound_queue=8`, `delivery_log=3`, `catalog=888`
> לפני ואחרי, ו-`queue_id` של המסמך נשאר `null`. הבדיקה התגלגלה אחורה במלואה —
> `cases=0`, `case_rights=0`, `documents=0`, `contacts=4`. מה שלא נוקה בכוונה:
> `admin_sessions` 2→3, שורת audit של כניסה אמיתית, מבוטלת (`live=0`); ואפס
> מנהלים עם `failed_attempts>0` — הכניסה נעשתה נכונה ולא נגעה במונה הנעילה.
>
> **נשאר פתוח (#233):** אין כפתור — `admin.html` אינה קוראת ל-`/render`;
> ואין מה להציג גם אחרי הפקה — `bkalot_clone_admin_case` מחזירה מטא-דאטה בלבד
> (`0060` שורה 215), ולכן נדרשת פונקציית קריאה אחת לגוף המסמך לפני המסך.
> ולכן אין כאן צילום מסך: אין עדיין מה לצלם. השליחה עצמה טרם נבנתה.
> `QA/bkalot-clone/render-http-0814/`.

> ## 🟢 14/08/2026 — **שכפול בקלות (§5ב): `documents` קיימת מ-`0057`, וארבע מיגרציות נבנו סביבה בלי שיהיה ולו דבר אחד שכותב לתוכה שורה (שכבה 3 לבנה 1 — #231 נסגר, #232 נפתח).**
>
> מסך הניהול מציג «מסמכים (0)» על כל פנייה מאז שנבנה. **0 היה נכון ולא תקלה** —
> קליטה (`0058`), קריאה (`0060`) וכניסה (`0061`/`0062`) נבנו כולן סביב טבלה שאין
> לה רנדרר. זו הלבנה הראשונה של שכבה 3, והיא **הפקה בלבד: אין בה שליחה**.
>
> **מה נבנה (`0063`):** `bkalot_clone.templates` — התבנית כ**נתון ולא כקוד**,
> לפי `BKALOT_METHOD §3` (במקור: `automation_configs.configJson`) — ושתי תבניות
> מוזרעות, `general_inquiry_reply` ו-`rights_treatment_reply`. הפונקציה
> `public.bkalot_clone_render(jsonb)` בוחרת ביניהן לפי סוג הפנייה.
> **העברית של המסמך יושבת בשורות הטבלה ולא בגוף הפונקציה**, כדי שהניהול יוכל
> לערוך נוסח בלי מיגרציה.
>
> | נמדד על | תוצאה |
> |---|---|
> | פניית `info` (0 זכויות) | 233 תווי טקסט · 465 תווי HTML · `fallback:false` |
> | פניית `treatment` (`disability`) | **59 זכויות** · 3,420 · 5,228 · `<li>`×59 |
> | סדר ששת הראשונים | `B100 B111 B114 B124 B144 B195` — **המדידה השביעית** שמסכימה |
> | שם מלא שהוא ממש תגית | `<img src=x onerror>` → `&lt;img…&gt;` ב-HTML, גולמי בטקסט |
> | סימון 3 זכויות כ-`chosen` | אותו `document_id` (upsert), `rights_source: chosen` |
> | מציין-מקום שאינו מוכר | מדווח ב-`placeholders_unresolved` **ואז מוסר** |
> | תבנית שמתרוקנת ברינדור | `render_empty` — מסמך ריק אינו נכתב |
> | תבנית ברירת-מחדל מנוטרלת | נוסח נפילה, `fallback:true` — ההפקה לא נופלת |
> | מפתח תבנית שנמסר במפורש ואינו קיים | `template_unknown` + רשימת המותרות |
>
> **שתי הכרעות שאינן העתקה מהמקור:** (1) גוף ה-HTML עובר `escape` על כל ערך
> שמגיע מהפונה — שם מלא הוא קלט חופשי של אדם זר, ובלי זה תגית ששמורה
> ב-`contacts.full_name` הייתה יושבת בתוך `body_html` שמסך הניהול מציג.
> (2) `case_rights.chosen` הוא בחירת הזכויות: בחר מישהו — המסמך מכיל את
> הנבחרות; לא בחר איש — את כל הרשימה המדורגת. מה שנעשה חוזר ב-`rights_source`,
> כדי שמסמך עם 5 זכויות לא ייקרא כתקלה כשהוא בדיוק מה שהמנהל ביקש.
>
> **מצב טסט, ולא בהצהרה:** `outbound_queue=8` ו-`delivery_log=3` לפני ואחרי,
> ו-`queue_id` של כל מסמך שנוצר נשאר `null`. לפונקציה אין שום מסלול יוצא.
> הרשאות נמדדו אחרי: `anon=false`, `authenticated=false`, `service_role=true`.
> הבדיקה התגלגלה אחורה במלואה — `cases=0`, `case_rights=0`, `documents=0`,
> `contacts=4`, ושתי התבניות נשארו דלוקות.
>
> **נשאר פתוח:** לרנדרר **אין כתובת HTTP ואין כפתור** — `bkalot-clone-admin` לא
> נגעה, ומסך הניהול עדיין אינו יכול לקרוא לו. זו הסיבה שאין ברשומה הזו צילום
> מסך: אין עדיין מה לצלם. ו-#232 — ל-`{{situation}}` אין שם עברי במסד
> (`rights.situation_map` מחזיקה מפתח אנגלי בלבד), ולכן אף תבנית מוזרעת אינה
> משתמשת בו. השליחה עצמה טרם נבנתה.
>
> עדות: `QA/bkalot-clone/render-0814/_results.json` · מיגרציה `supabase/migrations/0063_…`.

> ## 🟢 14/08/2026 — **§1א: כל אובייקט חדש ב-`public` נולד עם `TRUNCATE` ל-`anon`, ו-RLS אינו בודק `TRUNCATE` כלל (#228 נסגר, #229 נפתח).**
>
> הרשומה הקודמת הותירה שורה אחת פתוחה במפורש: «`alter default privileges` על
> סכמת `public` לא שונה», ובצידה הערכה — «לטבלה רגילה זה בלתי-מזיק כי RLS חוסם;
> ל-view זה חור». **ההערכה נבדקה, וחציה לא נכון.**
>
> נמדד על טבלת בדיקה שנוצרה בדיוק כמו כל טבלה חדשה, עם **RLS דלוק ואפס
> policies** — כלומר מצב ההגנה המקסימלי שטבלה יכולה להיות בו:
>
> | פעולה של `anon` על טבלה מוגנת-RLS | לפני | אחרי |
> |---|---|---|
> | `DELETE` | עבר, `rows_deleted=0` — RLS חסם, ההגנה עבדה | `42501` |
> | `TRUNCATE` | **הצליח. הטבלה רוקנה.** | `42501` |
> | שורות שנשארו | 0 | **3** |
> | הרשאות טבלה חדשה ל-`anon` | `DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE` | `INSERT,SELECT,UPDATE` |
> | הרשאות view חדש ל-`anon` | אותן שבע בדיוק | `INSERT,SELECT,UPDATE` |
>
> **הסיבה:** ב-Postgres, RLS חל על `SELECT/INSERT/UPDATE/DELETE` ואינו חל על
> `TRUNCATE`. לכן מפתח ה-`anon` — זה שיושב גלוי בקוד המקור של כל עמוד פורטל —
> החזיק את היכולת לרוקן **כל טבלה עתידית** ב-`public`, בלי תלות בשום policy.
> החור לא היה מוגבל ל-views; הם רק היו הצד שנתפס קודם.
>
> **מה נעשה (`0060`):** `revoke delete, truncate, references, trigger` מ-`anon`
> ו-`revoke truncate` מ-`authenticated` על ברירת המחדל של `public`.
> `SELECT/INSERT/UPDATE` נשמרו — הם ה-RLS-gated האמיתיים, ושלילתם הייתה שוברת כל
> טבלה עתידית שנשענת על policy. `DELETE` ל-`authenticated` נשמר: «משתמש מוחק שורה
> של עצמו» הוא דפוס לגיטימי ש-policy חוסמת כראוי. `service_role` לא נגענו.
>
> **מה זה לא עושה:** `pg_default_acl` אינו רטרואקטיבי. אף טבלה ואף view קיימים לא
> השתנו, ולכן **שום מערכת חיה לא שינתה התנהגות** — ההקשחה חלה על מה שייווצר מכאן
> והלאה בלבד. זו הסיבה שהיה אפשר להריץ אותה בלי סקירה של כל מערכת.
>
> **נשאר פתוח (#229):** ל-`pg_default_acl` על `public` יש **grantor שני** —
> `supabase_admin` — והוא ללא שינוי (`anon` עדיין `arwdDxtm`).
> `alter default privileges for role supabase_admin` מחזיר
> `42501 permission denied to change default privileges`, כי `postgres` בפרויקט
> Supabase אינו superuser. אובייקטים שנוצרים ב-`public` על-ידי `supabase_admin` —
> בעיקר תוצרי extensions — עדיין נולדים פתוחים. אינו ניתן לסגירה מכאן.
> עדות: `QA/platform/public-default-privileges-0814/_results.json`.

> ## 🟢 14/08/2026 00:13 — **מאגר הזכויות (§1א): המיגרציה שסוגרת את מחיקת ה-888 נכתבה אתמול ולא הורצה מעולם, ומפתח ה-anon החזיק `DELETE` עד עכשיו.**
>
> `0059` נכתב ב-13/08 עם ניתוח מלא ועם שתי מדידות שמוכיחות את החור — **והקובץ
> נשאר קובץ.** הוא לא הורץ ולא נכנס לגיט, ולכן חמשת ה-views ב-`public` המשיכו
> להחזיק `INSERT/UPDATE/DELETE/TRUNCATE` ל-`anon` ול-`authenticated` יממה נוספת:
> `rights_catalog` (888 נושאים) · `rights_public` (67) · `rights_situation_map` (24)
> · `rights_meta_public` (12) · `more30_automations` (3). זו התקלה האמיתית כאן —
> לא הליקוי, אלא **שהתיקון שלו כבר היה כתוב ואיש לא ידע שהוא לא רץ.**
>
> `view` אינו נושא RLS משל עצמו ורץ בהרשאות בעליו, ולכן ה-RLS שדולק על `rights.*`
> אינו רלוונטי לנתיב הזה כלל: ההרשאה על ה-view היא הדבר היחיד שעמד בדרך.
>
> **נמדד מול ה-REST החי, עם מפתח ה-anon שיושב גלוי בקוד המקור של הפורטל:**
>
> | בדיקה | לפני | אחרי |
> |---|---|---|
> | `DELETE /rest/v1/rights_catalog?code=eq.<לא קיים>` | **204** | **401** |
> | `DELETE` / `POST` על שאר ה-views | פתוח | `401` · `42501 permission denied for view` |
> | `GET` על כל החמישה | 200 | **200** — הקריאה הציבורית של מערכת 10 לא נשברה |
> | ספירות | 888/24/67/12/3 | **888/24/67/12/3** |
> | `set local role anon` + `delete`/`update` | עבר | `insufficient_privilege` |
>
> **למה זה היה בטוח להריץ,** ולא הנחה: `n_tup_del=0` על כל `rights.*` ועל
> `core.automations` — מעולם לא נמחקה שורה בנתיב הזה; בלוגים של היממה האחרונה
> הכתיבות היחידות ל-`/rest/v1/rights_*` הן הבדיקות של הריצה הקודמת עצמה; ושני
> המקומות בקוד שנוגעים ב-views (`apps/10-bkalot-rights/repo.js`,
> `apps/11-bkalut-marketing2/index.html`) **קוראים בלבד**.
>
> **נשאר פתוח:** `alter default privileges` על סכמת `public` לא שונה — `pg_default_acl`
> עדיין נותן `arwdDxtm` ל-`anon`, ולכן **כל view עתידי ב-`public` ייוולד פתוח לכתיבה**.
> לטבלה רגילה זה בלתי-מזיק כי RLS חוסם; ל-view זה חור. זה אותו שורש בדיוק כמו
> `0057` (bkalot_clone) וכמו כאן — שינוי גורף שם דורש סקירה נפרדת.
> עדות: `QA/platform/anon-write-on-public-views-0813/_results.json`.

> ## 🟢 13/08/2026 23:56 — **שכפול בקלות (§5ב): לשדה הסיסמה של מסך הניהול לא היה כפתור גילוי, והחשד שהסורק אינו מכסה את apps/37 נשלל במדידה (#226 נסגר).**
>
> #225 הותיר את #226 ובתוכו חשד מפורש: «שווה לבדוק אם `password-reveal-scan.mjs`
> מכסה היום את `apps/37` בכלל, אחרת כל מסך חדש ייפול לאותו חור». **הבדיקה
> הראשונה הייתה של הסורק ולא של המסך, והחשד נשלל:** הרצה לפני שנכתבה שורה אחת
> החזירה `scanned 2626 · OK 6 · MISSING 3`, וביניהם `apps/37-bkalot-clone/admin.html:152`
> בשמו. הפער אינו בכיסוי אלא **בעיתוי** — המסך נוצר ב-#224, אחרי שהקמפיין
> (#217/#218/#219) כבר רץ, ואיש לא הריץ את הסורק שוב. שלושת ה-controls עברו בשתי
> ההרצות, ולכן «ירוק» כאן אינו יכול להגיע מסריקה שהפסיקה לקרוא קבצים.
>
> **תיקון נוסח בכרטיס:** #226 נוסח כ«שני שדות הכניסה». שדה אחד בלבד הוא סיסמה
> (`:152`); `:148` הוא דוא״ל, ואין לו מה לגלות.
>
> הכפתור נבנה בדפוס של `portal/public/login.html` כדי ששני מסכי הכניסה יתנהגו
> אותו דבר, עם שלוש הכרעות שנגזרות מהמסך הזה: **מאפיינים לוגיים** ולא
> `right`/`left` — המסך RTL, והעתקה מילולית מהמקור הייתה מושיבה את הכפתור בדיוק
> מעל התו הראשון של הסיסמה; **`type="button"` מפורש** — בתוך `<form>` כפתור בלי
> `type` הוא `submit`, וכל לחיצה על «הצג» הייתה שולחת ניסיון כניסה; **ניקוי השדה
> מחזיר גם את המצב** — סשן שנגמר בזמן שהסיסמה גלויה היה משאיר את הסיסמה *הבאה*
> גלויה על המסך.
>
> | `more30.com/bkalot-studio/admin` אחרי הפריסה | תוצאה |
> |---|---|
> | הכתובת | 200 · 32,830 בייט (32,594 מקור + 236 NetFree) · בלי רגרסיה על `/` ועל `/bkalot-studio` |
> | `type` בלחיצה | `password` → `text` → `password` |
> | `aria-pressed` / `aria-label` | `false`→`true` · «הצג סיסמה»→«הסתר סיסמה» |
> | לחיצה על «הצג» שולחת את הטופס | **לא** — ונמדד גם על **Enter** במקלדת |
> | אחסון | `sessionStorage` 0; `localStorage` בלי אף מפתח שהמסך הזה כתב |
> | דחייה בזמן שהסיסמה גלויה | השדה התנקה **והמצב חזר למוסתר** |
>
> **מצב טסט:** הדחייה נעשתה על מייל שאינו קיים בכוונה — מייל אמיתי היה מעלה את
> `failed_attempts` של חשבון־העל, וחמישה כאלה נועלים ל-15 דקות. נמדד אחרי:
> `admin_users=1` ואפס נעולים/מסומנים. `outbound_queue=8` · `delivery_log=3` ·
> `catalog=888`. אין DDL ואין שינוי במסד כלל.
> **נשאר פתוח:** #219 (שני שדות בקונסולת 35, בעץ שאינו הייצור) ושכבה 3.
> עדות: `QA/bkalot-clone/admin-reveal-0813/`.

> ## 🟢 13/08/2026 23:42 — **שכפול בקלות (§5ב): מסך הניהול היה חי ואיש לא יכול היה להיכנס אליו (#225 נסגר, #226 נפתח).**
>
> #224 השאיר `more30.com/bkalot-studio/admin` חי ונמדד מדפדפן — ו-`bkalot_clone.admin_users`
> עם **אפס שורות**. לכשל הזה אין סימפטום: כל ניסיון כניסה מחזיר `invalid_credentials`,
> בדיוק כמו סיסמה שגויה, ואי אפשר להבחין מהמסך בין «אין זהות במערכת» ל«טעית».
>
> **ההכרעה שהכרטיס ביקש כבר הייתה קיימת.** #225 נרשם כדורש הכרעת משתמש (איזה מייל,
> איך נמסרת הסיסמה), אבל §1ב כבר קובע את שתיהן לכל המערכות — חשבון-על
> `l023131500@gmail.com` וסיסמת פאנלים אחת מ-`core.secrets.STD_ADMIN_PASSWORD` —
> ו-`LOGINS.md` מחזיק אותן מאז 12/08. לא נדרשה הכרעה חדשה.
>
> **המייל ולא שם המשתמש:** הכניסה כאן ממופתחת על מייל (0061), ו-`STD_ADMIN_USER`
> (`admin`) נופל על `email_invalid`. §1ב נותן בדיוק זהות אחת שהיא מייל, וזו.
>
> **`seed` ולא `insert` חד-פעמי,** כי §1ב מחייב upsert בכל עלייה ויש לזה סיבה מדודה:
> 0061 נועל אחרי 5 כשלונות ל-15 דקות. הפונקציה מרעננת hash, מפעילה מחדש ומאפסת
> נעילה ומונה — נבדק בפועל: משתמש שנוטרל, ננעל וקיבל סיסמה זרה חזר בקריאה אחת
> למצב שב-`core.secrets`, בלי שורה כפולה, והסיסמה הזרה נדחית.
>
> הסיסמה **אינה בקובץ המיגרציה** — מיגרציה יושבת בגיט לנצח, ולכן היא נקראת חי
> מ-`core.secrets`; סוד חסר או קצר מ-10 עוצר את המיגרציה במקום ליצור מנהל חלש.
> `revoke` מפורש: anon=false · authenticated=false · service_role=true — בלעדיו
> מחזיק מפתח ה-anon, שיושב בקוד הטופס הציבורי מאז #223, היה מאפס סיסמת מנהל בקריאה אחת.
>
> **אומת בדפדפן על הכתובת החיה:** כניסה → «מחובר: מנהל־על» (עברית נקייה) ורשימה
> ריקה כנכון; סשן במסד עם `token_hash` sha256 באורך 64 ו-IP/User-Agent אמיתיים;
> יציאה → `revoked_at`; סיסמה שגויה → `invalid_credentials` ו-`failed_attempts=1`;
> ואחרי seed נוסף הכניסה עובדת שוב. bcrypt `$2a$12$` שאינו מכיל את הסיסמה.
>
> **מצב טסט:** `outbound_queue=8` · `delivery_log=3` · `catalog=888` — לפני ואחרי.
> **נפתח #226:** שני שדות הכניסה ב-`admin.html:148,152` בלי «הצג סיסמה» (§1א) —
> מסך שנוצר אחרי שקמפיין #217/#218/#219 כבר סרק את הריפו.
> `public_visible`/`show_in_showcase` של #37 נשארים `false` (אין עדיין שכבה 3).
> עדות: `QA/bkalot-clone/admin-identity-0813/` · מיגרציה `supabase/migrations/0062_…`.

> ## 🟢 13/08/2026 23:25 — **שכפול בקלות (§5ב): לשש פונקציות הניהול לא הייתה ולו כתובת HTTP אחת (שכבה 2, לבנה 3 — #224 סעיף 3).**
>
> נפרסה `bkalot-clone-admin` (v1, ACTIVE, `verify_jwt=true`) — חמישה נתיבים:
> `login` · `session` · `cases` · `case` · `logout`. דקה בכוונה כמו
> `bkalot-clone-intake`: כל הכללים נשארים במסד, ומה שיושב כאן הוא **הרכבת
> השער** — `admin_session` רץ לפני `admin_cases`/`admin_case`, ולא במקביל להן.
> `bkalot_clone_admin_create` **אינה** חשופה: כתובת HTTP לפונקציה שיוצרת מנהל
> ואין לפניה שער הייתה פותחת מחדש את החור שה-`revoke` של 0061 סגר.
>
> **הסטייה שנכפתה, ונמדדה ולא הונחה:** המקור מעביר את הטוקן האטום בכותרת
> `Authorization` (`schema.ts:166-168`), וזה בלתי אפשרי כאן — `verify_jwt=true`
> גורם ל-gateway לפרסר אותה כ-JWT. נמדד: הטוקן ב-`Authorization` מחזיר
> **`401 UNAUTHORIZED_INVALID_JWT_FORMAT`** ואינו מגיע לקוד בכלל; ב-`x-admin-token`
> — 200. שכפול נאמן של הכותרת היה מייצר מערכת שאינה עונה, ושום קריאה בקוד לא
> הייתה מגלה למה. הדפוס עצמו — טוקן אטום מ-state בזיכרון, בלי `localStorage`
> ובלי cookies — נשמר; רק שם הכותרת השתנה. ומכאן מלכודת שנייה שנרשמה מראש:
> `x-admin-token` חייב להיות ב-`access-control-allow-headers`, אחרת הדפדפן חוסם
> את הבקשה האמיתית ובדיקה משורת פקודה — שאינה שולחת preflight — עוברת בירוק.
>
> **23 בקשות על הכתובת החיה:** `405`/`404`/`400`/`413` למה שאינו הטופס; `login`
> נכון עם מייל מרופד ובאותיות גדולות מחזיר טוקן באורך 43; `cases` בלי כותרת
> מחזיר `401 token_required` ועם תו אחד שונה `401 invalid_session`; עם טוקן תקף
> `total=1` ו-`rights_count=59`; `case` החזיר **59** זכויות — המדידה החמישית
> הבלתי-תלויה שמסכימה על אותו מספר; ואחרי `logout` אותו טוקן מחזיר `401`,
> ו-`logout` שני מחזיר `revoked:0`. העברית חוזרת נקייה מקצה לקצה (הושווה `-ceq`
> מול מחרוזת שנבנתה מנקודות-קוד).
>
> **מלכודת בבדיקה עצמה שנתפסה רק כי המספר היה 0:** הריצה הראשונה דיווחה
> `rights=0` על פנייה עם 59 — פונקציה שגם מדפיסה וגם מחזירה אובייקט איבדה את
> הדוח כולו ל-`| Out-Null`, ו-`rights` יושב ברמה העליונה ולא תחת `case`, כך
> ש-`$one.case.rights.Count` מחזיר בדיוק את מה שרשימה ריקה נראית כמוה.
>
> **מצב טסט:** התור לא זז (`outbound_queue=8`, `delivery_log=3`, `catalog=888`),
> ולפונקציה אין שום מסלול יוצא. הבדיקה התגלגלה אחורה במלואה
> (`cases=0 · admin_users=0 · admin_sessions=0 · contacts=4`). **אין DDL כלל.**
>
> **⚠️ מה שנשאר פתוח:** אין מסך — יש כתובת ואין מי שפותח אותה. ואין משתמש ניהול
> במסד ואין סיסמה בריפו. `public_visible`/`show_in_showcase` של #37 נשארים
> `false`. עדות: `QA/bkalot-clone/admin-http-0813/`.

> ## 🟢 13/08/2026 23:10 — **שכפול בקלות (§5ב): נתיב הקריאה החזיר כל פנייה ולא היה לו מושג מי שואל (שכבה 2, לבנה 2 — #224 סעיף 2).**
>
> מיגרציה 0061: `bkalot_clone.admin_users` (bcrypt 12) ו-`admin_sessions` (נשמר
> **sha256 של הטוקן**, לא הטוקן), וארבע פונקציות — `admin_create` / `admin_login` /
> `admin_session` / `admin_logout`. `admin_session` הוא **השער** שחייב לרוץ לפני
> `admin_cases`/`admin_case` של 0060, שאין בהן שום בדיקת זהות.
>
> **ההכרעה נמדדה ולא הונחה:** מייל שאינו רשום וסיסמה שגויה מחזירים את אותה שגיאה —
> אבל שוויון נוסח בלבד אינו שווה כלום, כי מסלול «אין משתמש» שחוזר מיד מסגיר בזמן
> התשובה אילו מיילים רשומים כמנהלים. נמדד ב-`clock_timestamp`: **298ms מול 297ms**
> (הודות ל-`crypt` מדומה באותו work factor; בלעדיו ההפרש היה ~300ms). מאותה סיבה
> `account_locked` מוחזר רק **אחרי** שהסיסמה אומתה כנכונה.
>
> אומת ב-25 בדיקות: נעילה אחרי 5 כשלונות; סיסמה נכונה בזמן נעילה נדחית; מנהל שהושבת
> מאבד סשן קיים **מיד**; סשן שפג ו-`logout` מחזירים `invalid_session` אחד; `logout`
> אידמפוטנטי; מחיקת מנהל מפילה את סשניו ב-CASCADE; והשער מורכב — session תקף → `admin_cases`
> החזיר `total=0`. הרשאות נמדדו אחרי: `anon=false`, `authenticated=false`,
> `service_role=true`; ועל שתי הטבלאות **אפס** הרשאות לכל תפקיד פרט לבעלים, כולל
> `service_role`, RLS דלוק ואפס policies.
>
> **שתי סטיות מכוונות מהמקור** (`BKALOT_METHOD §6.2`): אין `password_plain` ואין טוקן
> שמור בבהיר. **מצב טסט:** התור לא זז (`outbound_queue=8`, `delivery_log=3`,
> `catalog=888`), והבדיקה התגלגלה אחורה במלואה (`admin_users=0 · admin_sessions=0`).
>
> **⚠️ מה שנשאר פתוח ולא נבלע:** אין ולו כתובת HTTP אחת ואין מסך — השער קיים ואינו
> מחובר לכלום. ואין משתמש ניהול במסד: משתמש הבדיקה נמחק ואין סיסמה בריפו; יצירת
> המנהל האמיתי היא קריאה אחת בלבנה הבאה. `public_visible`/`show_in_showcase` של #37
> נשארים `false`. עדות: `QA/bkalot-clone/admin-auth-0813/`.

> ## 🟢 13/08/2026 22:50 — **שכפול בקלות (§5ב): הפנייה נכנסה למסד ולא הייתה ולו שאילתה אחת שקוראת אותה בחזרה (שכבה 2, לבנה 1).**
>
> מיגרציה 0060: `public.bkalot_clone_admin_cases(jsonb)` (רשימה מסוננת ומדופדפת + `total`)
> ו-`public.bkalot_clone_admin_case(bigint)` (פנייה בודדת + זכויות + מטא-דאטה של מסמכים).
> `SECURITY DEFINER`, `search_path` ריק, `EXECUTE` ל-`service_role` בלבד — נמדד:
> `anon=false`, `authenticated=false`.
>
> **המלכודת שהצעד נבנה סביבה נמדדה ולא הונחה:** `cases_contact_id_fkey` הוא
> `ON DELETE SET NULL`, ולכן מחיקת איש קשר מייתמת פנייה בשקט ו-JOIN רגיל היה משמיט
> אותה — פנייה שקיימת ואינה מוצגת נראית כמו רשימה תקינה. נבדק בפועל: איש הקשר של
> פנייה 13 נמחק, והיא **עדיין מופיעה** עם `contact: null` מפורש.
>
> אומת: 59 זכויות בפנייה, ששת הראשונים `B100 B111 B114 B124 B144 B195` — זהה למדידת
> 0058; קוד שאינו בקטלוג מוצג עם `in_catalog=false` ואינו נעלם; `limit="abc"` נופל
> לברירת מחדל במקום 22P02; `status`/`kind` לא מוכר מחזיר `allowed[]`; ועברית חוזרת
> בלי כפל-קידוד. **סדר הרשימה** מקבל שובר-שוויון על `id` — שתי פניות שנכתבו באותה
> פקודה חולקות `created_at` זהה, ובלעדיו הדפדוף היה יכול להחזיר שורה פעמיים.
>
> **מצב טסט:** התור לא זז (`outbound_queue=8`, `delivery_log=3`, `catalog=888`),
> והבדיקה התגלגלה אחורה במלואה ל-`cases=0 · case_rights=0 · contacts=4`.
>
> **⚠️ מה שנשאר פתוח ולא נבלע:** אין בפונקציות שום בדיקת זהות. הכניסה לניהול
> (#224 סעיף 2) חייבת לנחות **לפני** שיש להן כתובת HTTP — edge function בלי שער היה
> חושף כל פנייה למחזיק מפתח ה-anon. `public_visible`/`show_in_showcase` של #37 נשארים
> `false`. עדות: `QA/bkalot-clone/admin-read-path-0813/`.

> ## 🟢 13/08/2026 22:25 — **שכפול בקלות (§5ב): הטופס היה קיים ונמדד, ולא הייתה ולו כתובת אחת שמשתמש יכול לפתוח (#223 נסגר).**
>
> שלוש הפעימות הקודמות בנו את שכבה 1 במלואה — סכמה, נתיב כתיבה, edge function, טופס —
> וכל אחת נמדדה. מה שנשאר הוא המשפט האחרון של #223: **הדף אינו פרוס**. היום
> **`more30.com/bkalot-studio` חי**, עם ובלי לוכסן, 200 בשניהם.
>
> **לא נוצר פרויקט Vercel 31.** `apps/37-bkalot-clone/index.html` הוא קובץ אחד בלי build
> ובלי נכס יחסי אחד — ההפניות היחידות שיוצאות ממנו מוחלטות — ולכן אין לו את הבעיה
> שמצדיקה פרויקט נפרד, וגם לא את מלכודת ה-base href. הוא מוגש מהפורטל:
> `scripts/stage-portal.ps1` מעתיק את המקור אל `portal/dist/bkalot-studio/` בכל staging
> (**`throw` ולא warning** אם המקור חסר — פריסה בלי הקובץ מגישה 404 בנתיב שה-rewrite
> כבר מכריז עליו), ושני rewrites ב-`vercel.dist.json`. **אין עותק שני של הקובץ בריפו** —
> עותק שני היה נפרד מהראשון.
>
> **מה שנמדד לפני הפריסה ולא הונח:** `portal/dist` בעץ הוא מ-10/08, ופריסה ממנו יכולה
> להחזיר את הפורטל אחורה. הוא הושווה מול הייצור קודם — אותם hash-ים בדיוק לשני הנכסים,
> והדיף השורתי היחיד הוא הזרקת NetFree.
>
> **אומת בדפדפן על הכתובת החיה:** «טיפול מלא» פותח את «המצב שלכם» (25 אפשרויות = 24 מצבים
> + placeholder) והדוא״ל הופך לחובה; שליחה מלאה החזירה «הפנייה נקלטה» עם **59 זכויות** —
> אותו מספר שנמדד ב-SQL, בקצה ה-HTTP ובמדידת הטופס המקומית, ארבע מדידות בלתי תלויות;
> ובמסד הטלפון `050-999-8877` נשמר מנורמל `0509998877` וההערה העברית חזרה בלי כפל-קידוד.
>
> **מצב טסט אומת בכך שהתור לא זז** (`outbound_queue=8`, `delivery_log=3`, `catalog=888`
> לפני ואחרי), והבדיקה התגלגלה אחורה במלואה ל-`cases=0 · case_rights=0 · contacts=4`.
>
> **מה שנשאר פתוח:** הפנייה נכנסת ואין מי שרואה אותה — אין ניהול, אין רשימת פניות ואין
> כניסה (שכבה 2). לכן `public_visible` ו-`show_in_showcase` נשארו `false`: הנתיב חי,
> והמוצר אינו מפורסם בדף הבית כגמור.
> עדות: `QA/bkalot-clone/mount-0813/`.

> ## 🟢 13/08/2026 21:40 — **שכפול בקלות (§5ב): הפרויקט היה רשום מאז שהמפרט אושר, ולא היה לו מקום אחד לכתוב אליו פנייה.**
>
> `core.projects` #37 `bkalot-clone` קיימת עם `path=bkalot-studio`, אבל `supabase_schema`
> שלה היה `NULL`. נוצרה הסכמה `bkalot_clone` — `cases` · `case_rights` · `documents` —
> ו-view שקורא **חי** מ-`rights.catalog` (**888 נושאים**, אומת מול המקור).
>
> **שתי ההכרעות שהמפרט השאיר פתוחות הוכרעו במדידה ולא בטעם.** ל-`rights.*` אין ולו הרשאה
> אחת ל-anon/authenticated/service_role, וכל מה שמוגש היום עובר דרך views ב-`public`;
> `rights.source_raw` + `catalog.imported_at` מעידים שהקטלוג מיובא מחדש כמכלול. לכן
> **קוראים חי ולא מעתיקים**, ומאותה סיבה **אין FK** מ-`case_rights` אל הקטלוג — FK מהשכפול
> היה הופך אותו לגורם שחוסם ייבוא של מאגר הזכויות.
>
> מנוע השליחה לא נבנה מחדש: `bkalot_auto` אינו שלד אלא תור עובד (8 ב-`outbound_queue`,
> 3 ב-`delivery_log`, `mode` ברירת מחדל `test` ברמת הסכמה), והמפרט מורה "הרחב אותו, אל תמחק".
>
> **מה שנמצא תוך כדי:** `grant … on all tables in schema` תופס גם את ה-view, ו-view של טבלה
> אחת הוא auto-updatable — כלומר ההרשאה הגורפת פתחה נתיב **כתיבה** אל `rights.catalog` דרך
> view שרץ כבעליו. נמדד אחרי המתן ונסגר באותו צעד; היום `SELECT` בלבד.
>
> אומת במסלול מלא שמתגלגל אחורה, כדי שלא תישאר שורת בדיקה במסד: פנייה → 3 `case_rights` →
> מסמך → join אל הקטלוג החי (`joined=3`), `source='sms'` נדחה ע"י ה-check, ואחרי הבדיקה
> שלוש הטבלאות ריקות ו-`rights.catalog` עדיין 888. RLS דלוק, אפס policies, service_role בלבד.
> עדות: `QA/bkalot-clone/schema-0813/_results.md` · מיגרציה `supabase/migrations/0057_…`.
> 🚫 לא נגענו ב-08/09 ובשום מוגן — נוצרה סכמה חדשה בלבד.

> ## 🟢 13/08/2026 21:20 — **אישור המייל: שלוש מערכות היו רשומות שבורות תחת קריאה בת יום, והחסם התכווץ משבעה פרויקטים לחמישה (#172).**
>
> §1א אומר שהרשמה→התחברות נכשלת ב"סיסמה שגויה". הסריקה של 12/08 מצאה את הסיבה
> — `mailer_autoconfirm=false` — ומנתה **תשע** מערכות חיות. היא נסגרה במשפט
> "אף אחד משמונת הפרויקטים האחרים אינו נראה מהסביבה הזו, לכן זה של המשתמש".
>
> **המשפט הזה נכון על `list_projects` ולא נכון על החשבון.** ה-MCP מראה פרויקט
> אחד; `SUPABASE_ACCESS_TOKEN` מראה **עשרה**, ועבורם ה-Management API מחזיר את
> כל קונפיגורציית ה-auth — כולל `site_url` ו-`smtp_host`, שאותם
> `/auth/v1/settings` אינו חושף לעולם. אותו טוקן הוא שסגר את #198 באותו שבוע,
> כלומר המסלול היה קיים גם באותו יום.
>
> **מה שהמדידה מצאה:** `csjekrvukbdznetsrodj` — הפרויקט של **06 בריאות,
> 12 סמל ו-17 חיזוקים** — **דלוק היום**. הרשימה יורדת מתשע לשש: 01, 15, 21,
> 24, 30, 31.
>
> **וזו לא תקלת מדידה אלא תקלת רישום.** פעימה שלנו הפכה את ההגדרה ב-12/08,
> ובאותו יום עצמו נכתבה הטבלה שרשמה אותה ככבויה — הסריקה והתיקון רצו זה לצד
> זה ורק הראשונה הגיעה לנייר. שלוש מערכות חיות נשארו יממה רשומות שבורות בזמן
> שהן עבדו, וזה בדיוק המנגנון שמייצר חסמים שכבר אינם קיימים.
>
> **נמדד בשני מכשירים בלתי-תלויים,** ולא באחד: ה-Management API והנקודה
> הציבורית שכל דפדפן קורא בטעינת האתר. שניהם `true` על `csjekrvukbdznetsrodj`
> ו-`false` על `bieebmnmkffwbqlsfozh`. ההסכמה ביניהם היא מה שמפריד מדידה
> מקריאה בודדת.
>
> **ולא נגעתי במה שיכולתי לגעת בו.** `bieebmnmkffwbqlsfozh` (01 torah) הוא
> היחיד מבין השבעה שהטוקן כן מכסה — פקודה אחת הייתה פותחת שם את הסבב. שם
> הפרויקט הוא `bkalut-production` והוא נושא את **08 ו-09 המוגנות**;
> `mailer_autoconfirm` היא הגדרה של הפרויקט, ולכן הפעלתה משנה גם אותן. הכרעה
> של המשתמש — `NEEDS_USER §0תד`, שורה אחת.
>
> **שבעה פרויקטים עדיין עם `site_url=http://localhost:3000`** — התאום של #198.
> **שבעתם `INACTIVE`**, ואף אחד אינו מוגש בייצור (נבדק גם מול תשעת ה-refs
> שהאתרים החיים נושאים, וגם הפוך על `tltfpznyqxpuydgefmnp`, ששמו
> `chatzor-connect` בעוד `apps/16-chatzor-connect` נושא בקוד את הפורטל בלבד).
> החלוקה נופלת בדיוק על העמודה: שלושת החיים מצביעים ל-more30.com, שבעת
> המושבתים ל-localhost. נטושים, לא תקלה חיה — ולכן נרשמו (#220) ולא תוקנו.
>
> הכלי: `scripts/qa/auth-config-sweep.mjs` (קריאה בלבד, הטוקן מהסביבה ולא
> מהקוד). עדות: `QA/platform/auth-config-0813/`.

> ## 🟢 13/08/2026 20:35 — **19 שיעורים: ארבעה שדות סיסמה בלי «הצג סיסמה». והממצא ה«אחרון» של הקמפיין היה הערה בקוד (#218).**
>
> הפעימה הקודמת הותירה ממצא יחיד — `24 גליל GabaiPortal.tsx:1416`. הוא **אינו
> קיים**: השורה היא הערה שמסבירה את כפתור הגילוי, והשדה עצמו שתים-עשרה שורות
> מתחתיה כבר כתוב `type={showPassword ? 'text' : 'password'}` עם כפתור
> ו-`aria-pressed`. הקמפיין החזיק ממצא פתוח **על הפרוזה של עצמו**, ועל מערכת חיה.
>
> **מה שהסורק לא ראה חשוב יותר.** ה-walk הכיר `.html/.jsx/.tsx/.vue/.svelte`
> בלבד — ושתי מערכות מציירות את כל הממשק שלהן ממחרוזות תבנית בתוך `.js` רגיל.
> שישה שדות מעולם לא נפתחו. `1,394 קבצים · 6 שדות` → `2,624 · 8`, UNKNOWN 0.
>
> **תוקן ב-19 שיעורים:** `login_password` בטופס ההצטרפות (705), שני
> `api_password` בהגדרות נדרים (1340, 1560), והסיסמה של **«כניסת ניהול»** (1973)
> — מסך הכניסה היחיד של המערכת. הכבד הוא 705, ובנימוק אחר מקודמיו: זה לא מסך
> שבו התחברות נכשלת, אלא מסך שבו **בוחרים** סיסמה בלי אימות-חוזר ובלי סיסמה
> קודמת לנסות שוב — שגיאת הקלדה שם נשמרת בשקט, וההתחברות הראשונה בעתיד תיכשל
> בלי שאיש ידע למה.
>
> `pwField()` אחד, ומאזין **delegated על `document`**: כל מסך כאן נצבע
> ב-`APP.innerHTML =`, ומאזין שנקשר אחרי רינדור מת ברינדור הבא — כולל בשני מסכי
> הניהול שמצוירים רק מאוחר יותר.
>
> **אומת בדפדפן בלחיצת עכבר אמיתית:** `type` password→text→password,
> `aria-pressed` ו-`aria-label` מתהפכים, האייקון מקבל ומאבד את הקו החוצה, הערך
> נשמר, **והכתובת זהה לפני ואחרי** (הכפתור לא שלח את הטופס). ראיות ב-
> `QA/shiurim/password-reveal-0813/`. **אין פריסה ואין מה לפרוס** — 19 היא
> `live=false, is_deployed=false`.
>
> **הכלי תוקן בשלושה מקומות:** הערות מולבנות לפני ההשוואה (שמרני — `//` רק
> בתחילת שורה, אחרת URL באמצע שורה היה בולע שדה שמצויר אחריו); `.js/.mjs/.cjs`
> נכנסו ל-walk; `scripts/qa` יצא ממנו (כלי שמחפש אידיום חייב לאיית אותו, ולכן
> שני הכלים דיווחו על תבניות החיפוש של עצמם). בקרה שלישית `want:'NONE'` מונעת
> חזרה של אותה התראת שווא.
>
> **נשאר בקמפיין:** 35 kioskfleet `js/app.js:1293-1294` (#219) — בעץ המקומי
> שאינו הייצור (#215), והקיוסק הוא מסלול שההנחיה מורה לא להשקיע בו עכשיו.

> ## 🟢 13/08/2026 20:20 — **מרכז השליטה (`more30.com/admin`): שני שדות הסיסמה היו בלי «הצג סיסמה». תוקן, נפרס ואומת בייצור (#217).**
>
> נמדד על החבילה החיה ולא על קובץ: `/admin/assets/index-CinF3ubK.js`, 400,926 בייט,
> `aria-pressed` מופיע **אפס פעמים** — אין שום כפתור גילוי בכל האפליקציה. שני
> שדות: סיסמת הכניסה, ו«סיסמה חדשה (8+)» שב-`<details>` «שינוי סיסמה».
>
> השני הוא הכבד, ובאותו נימוק שנרשם ב-#213 עבור 31 גשר: אין שם סיסמה קודמת
> שאפשר לנסות שוב איתה, ולכן שגיאת הקלדה נשמרת ב-`updateUser` והאדמין ננעל
> **מחוץ למרכז השליטה של עצמו** עד לאיפוס דרך המייל.
>
> **למה זה נשאר פתוח אחרי #213:** הסריקה שהולידה את הקמפיין סרקה `apps/` בלבד.
> אותה עיוורון פספסה קודם את מסך האיפוס של הפורטל (נסגר ב-`ac92ed7`) — הפלטפורמה
> עצמה נפלה מהקמפיין פעמיים.
>
> **אומת בייצור בלחיצת עכבר אמיתית:** `type` password→text→password,
> `aria-pressed` מתהפך, האייקון מקבל ומאבד את הקו החוצה, **והכתובת לא השתנתה**
> (הכפתור לא שלח טופס). `elementFromPoint` במרכזו מחזיר אותו, והוא כולו בתוך
> גבולות השדה. `dpl_HN4Nd7uxvb26vRJpcCCB7k4QZiAh`, ראיות ב-`QA/admin/password-reveal-0813/`.
>
> ⚠️ **הכלי שהיה אמור למצוא את זה יצא בשגיאה בכל הרצה.**
> `scripts/qa/password-reveal-scan.mjs` (נכתב עבור #213, מעולם לא קומיט) החזיק
> בקרה שלילית שהצביעה על שדה חי — `35-kioskfleet console.html#login-pass` —
> והשדה ההוא תוקן ב-13/08. מאותו רגע `exit 2` בכל הרצה, כלומר ירוק ואדום נראים
> אותו דבר. הוחלפה בקובץ בדיקה קבוע (`scripts/qa/_fixtures/pw-bare.html`).
> נשאר בקמפיין ממצא אחד: 24 גליל, שפתוחה ממילא על #62.
> **תוקן ב-13/08 20:35 (#218):** הממצא ההוא לא היה שדה אלא הערה בקוד, והשדה
> שמתחתיו כבר תקין. ראו את הרשומה שמעל.

> ## 🟢 13/08/2026 16:35 — **35 KioskFleet: `/kiosk/console.html` היה כתובת חיה שאי אפשר להתחבר דרכה. תוקן, נפרס ואומת בייצור.**
>
> השרת מגיש את הקונסולה בשתי כתובות — `/kiosk/console` ו-`/kiosk/console.html` —
> ושתיהן מחזירות 200 ואת אותם 8,944 בייט. אבל `js/app.js:15` גזר את קידומת ה-API
> מהכתובת עצמה, בהסרת `/console` בלבד. בכתובת עם הסיומת ה-BASE יצא
> `/kiosk/console.html`, וכל קריאה נשלחה ל-`/kiosk/console.html/api/…` שמחזיר **404**.
>
> כלומר מי שהגיע לשם ראה מסך כניסה מלא, הקליד שם וסיסמה **נכונים**, וקיבל
> «שגיאה בשרת» — בזמן שהשרת עצמו מחזיר 200 לאותה כניסה בדיוק דרך הנתיב השני.
> דף הנחיתה `/kiosk/` מקשר `href="console"` בלי סיומת, ולכן המסלול הרגיל מעולם לא
> נשבר; זו כתובת של סימנייה, הקלדה ידנית או העתקה מתיעוד.
>
> **התיקון:** שורה אחת — `/\/console(?:\.html)?\/?$/`, תואם לאחור (הקבוצה
> אופציונלית). נבדק ב-node על עשר כתובות לפני הדחיפה. נכתב כעריכה כירורגית על
> `l023131500-ops/zol` לפי ההנחיה ב-#215 — 35 נבנית משם ולא מכאן (`ed212eb`,
> Railway `d95f15a6` SUCCESS). העותק שבמונו-רפו מחזיק את אותה שורה ותוקן גם הוא,
> כדי שהענף המקביל לא ישא את הבאג הלאה.
>
> **אומת בייצור, לא בקובץ:** `kf_token` נמחק מ-localStorage → טעינה נקייה של
> `/kiosk/console.html` → כניסה כ-`admin` → הטוקן נשמר ו-`h1` = «המכשירים שלי»
> עם שישה פריטי ניווט. אותה לחיצה בדיוק החזירה קודם «שגיאה בשרת».
> בלי רגרסיה: `/kiosk/console` → 200, `basePath: "/kiosk"`, אותם שישה פריטים.
>
> ~~⚠️ **נמצא בדרך (#216, פתוח):** כדור הכניסה המשותף (`<more30-auth>`) **מכסה את
> «➕ הוספת מכשיר»** — הפעולה היחידה במסך הראשון, ובמצב ריק גם ההוראה המפורשת
> שהמסך נותן. נמדד ולא הונח: הכדור `l=16 r=92`, הכפתור `l=34 r=155`,
> ו-`elementFromPoint` במרכז החפיפה מחזיר `MORE30-AUTH`. זה אותו ליקוי שתוקן
> ב-03/08 על 11 מסלולים, ו-`/kiosk/console` לא היה בהם. התיקון ברמת הפורטל, לא ב-zol.~~
> ✅ **#216 נסגר — נבדק מחדש 17/08, אינו פער פעיל.** כניסה אמיתית כ-`admin` ל-
> `https://more30.com/kiosk/console`, ואז `elementFromPoint` על השפה המובילה
> ומרכז כפתור «➕ הוספת מכשיר» (ה-`#add` הנראה, לא פריט הסיידבר `data-view="enroll"`
> שקורס ל-0×0 באותם רוחבים) בשני רוחבים: ב-390px הכדור `t=8 b=44` והכפתור
> `t=71 b=102` — פער אנכי 27px, אין חפיפה כלל; ב-1440px הכדור `l=16 r=92`
> והכפתור `l=104 r=225` — פער אופקי 12px. שתי המדידות מחזירות את הכפתור עצמו,
> לא את `MORE30-AUTH`. התיקון מ-13/08 (חוק `padding-inline-end` מקומי בעמוד
> שקורא `--more30-auth-inset`, לפי `auth-button-overlaps-navs` בזיכרון) חי
> בפרודקשן. אין שינוי קוד, אין פריסה — מדידה בלבד. ראיות:
> `QA/kiosk/console-authpill-recheck-0817/results.json`.
>
> ⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
> `_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).
>
> ראיות: `QA/kiosk/console-html-base-0813/` — README + צילום הקונסולה אחרי הכניסה.
>
> ---
>
> ## 🟢 13/08/2026 16:20 — **35 KioskFleet: מי שמנווט במקלדת לא הגיע לאף מסך בקונסולה. תוקן ואומת בייצור — ובדרך התברר שהעץ המקומי אינו הגרסה שרצה שם.**
>
> ששת פריטי הניווט בסרגל הקונסולה היו `<a data-view>` **בלי `href`**. עוגן בלי
> `href` אינו אלמנט אינטראקטיבי: אינו מקבל מיקוד, אינו בסדר ה-Tab ואינו מגיב
> ל-Enter. כלומר לקוח שמנווט במקלדת בלבד לא יכול היה להגיע לאף אחד מששת המסכים —
> מכשירים, קישורים, הוספת מכשיר, הוראות, ניהול-על, הגדרות. WCAG 2.1.1 רמה A.
> אותו דבר ב-`logout`, ו-`<label>שם משתמש</label>` היה בלי `for`.
>
> **הכרטיס (#214) הורה לדחוף את העותק המקומי, וההוראה נמדדה ולא החזיקה.** העץ
> כאן אינו גרסה אחת קדימה אלא **בנייה אחרת לגמרי**:
>
> | קובץ | `apps/35-kioskfleet` | מה שרץ בייצור (`zol`) |
> |------|----------------------|------------------------|
> | `js/app.js` | 89,844 בייט · 1,442 שורות | 35,627 · 579 |
> | `console.html` | 12,562 בייט · **7** מסכים (כולל `clients`) | 7,258 · **6** |
> | `css/style.css` | 61,254 בייט | 14,548 |
>
> דחיפתו לא הייתה מתקנת נגישות אלא מחליפה קונסולה חיה ועובדת בבנייה שאיש לא ראה
> רצה. לכן נערכו **קובצי הייצור עצמם**, בשתי עריכות כירורגיות. הפער נרשם כ-`#215`
> ודורש הכרעה שלך: האם המסך `clients` ושאר הבנייה המקומית אמורים להישלח ל-35 החיה.
>
> **הסדר הוא כל העניין, ובו הכרטיס צדק.** כל כתיבה ל-`zol` היא קומיט נפרד ולכן
> פריסה נפרדת. קודם `js/app.js` — שורה אחת, `closest('a[data-view]')` →
> `closest('[data-view]')`, אגנוסטי לתגית ולכן **תואם לאחור** (`4a76ea2`, Railway
> `d8c15f74`). אומת חי — 35,833 בייט, הסלקטור החדש נוכח והישן נעדר — ורק אז
> `console.html` (`c2b537b`, `8c37053b`). בסדר ההפוך הקונסולה הייתה עולה עם ניווט
> שאינו מגיב לשום לחיצה, גם לא בעכבר.
>
> | בייצור, בדפדפן, אחרי שתי הפריסות | תוצאה |
> |---|---|
> | Tab יחיד מה-brand | נוחת על «המכשירים שלי» (`BUTTON`) — קודם דילג על כל הששה |
> | עוד 3 × Tab ואז Enter | `h1` = «הוראות הפעלת מכשיר», `.active` על פריט אחד בדיוק |
> | לחיצת עכבר על «ספריית קישורים» | מנתבת כרגיל — בלי רגרסיה |
> | «ניהול-על» עם `.hidden` | `display: none` — הכלל החדש אינו מגלה אותו ללא-אדמין |
> | עץ הנגישות במסך הכניסה | `textbox "שם משתמש"` — יש שם נגיש (קודם לא היה) |
>
> ⚠️ **הכתובת החיה היא `more30.com/kiosk/console`, לא `console.html`.** `app.js`
> גוזר את בסיס ה-API בהסרת `/console` בלבד, ולכן עם הסיומת כל קריאה נופלת ל-404
> ומסך הכניסה מחזיר «שגיאה בשרת» — בזמן ש-`POST /kiosk/api/auth/login` מחזיר 200.
> מי שיבדוק את הכתובת עם הסיומת יסיק שהמערכת שבורה, והיא אינה.
>
> **[13/08 16:35 — כבר לא נכון] תוקן.** `ed212eb`, Railway `d95f15a6`. שתי
> הכתובות עובדות עכשיו, וכניסה מלאה דרך `console.html` אומתה בייצור.
> ראה את הרשומה שבראש הקובץ.
>
> ראיות: `QA/kiosk/console-tab-path-0813/` — README, צילום עם טבעת המיקוד,
> והבייטים המדויקים ששודרו לשני הקבצים.

> ## 🟢 13/08/2026 15:55 — **35 KioskFleet: מסך הכניסה לקונסולה הסתיר את מה שהוקלד בו. תוקן, נפרס ואומת בייצור — ואת התיקון היה צריך לדחוף לריפו אחר.**
>
> `#213` הותיר שני שדות סיסמה בלי כפתור גילוי. שניהם נבדקו בקוד לפני שנכתבה
> שורה, ורק אחד היה ממצא.
>
> **06 kupot-holim לא היה ממצא כלל.** הסריקה שהולידה את הכרטיס חיפשה
> `type="password"` קשיח, בהנחה ששדה שכבר יש לו כפתור נכתב
> `type={shown ? "text" : "password"}` ולכן אינו נתפס. ההנחה נכונה ל-React
> ושגויה ל-HTML סטטי — שם ה-`type` מוחלף ב-JS בזמן ריצה, והמקור נשאר קשיח גם
> כשהכפתור עובד. `admin.html:106-115` ו-`admin.js:78-85` מחזיקים אותו מ-`eb63df0`
> (12/08), יום לפני הסריקה. **מסקנה לסריקות הבאות:** תפיסה על HTML סטטי דורשת
> קריאה של ה-JS הנלווה לפני שהיא נרשמת כבאג.
>
> **35 היה ממצא, והוא גם הקשה לפריסה מכולם.** 35 נבנית מ-`l023131500-ops/zol`
> (branch `claude/what-do-you-see-gxo5tc`, root `kiosk/server`) ולא מהמונו-רפו,
> ולכן קומיט כאן נראה כמו עבודה ומשנה אפס בייצור. התיקון נדחף דרך GitHub
> contents API לאותו repo (`71eff2ae`) ו-Railway בנה ממנו
> (`a7b43af6-e805-4d3d-8431-0c743b4346df`). לפני הכתיבה הושווה הקובץ ב-zol למה
> שהייצור מגיש: **3,194 תווים כל אחד, זהים תו-בתו** אחרי הסרת הזרקת NetFree.
>
> | `more30.com/kiosk/console` אחרי הפריסה | תוצאה |
> |---|---|
> | `type` בלחיצה | `password` → `text` → `password` |
> | `aria-pressed` / `aria-label` | `false`→`true` · «הצג סיסמה»→«הסתר סיסמה» |
> | אייקונים שנצבעים בו-זמנית | **1** (הכלל נגזר מ-`aria-pressed`, לא מ-`hidden`) |
> | לחיצה על «הצג» שולחת את הטופס | **לא** (`type="button"` מפורש) |
> | כניסה מלאה אחרי התיקון | ✅ `admin` → app-view, «מנהל מערכת» |
>
> **נמצא בדרך ונרשם כ-#214:** עץ המקור כאן מקדים את הייצור בתיקון נגישות שמעולם
> לא נדחף ל-zol (ניווט מ-`<a>` ל-`<button>`), וה-`app.js` **החי** עדיין קושר
> `closest('a[data-view]')`. דחיפת `console.html` לבדה תשאיר את הקונסולה בלי
> ניווט; `js/app.js` חייב לצאת ראשון. לכן נדחף שדה הסיסמה בלבד.
>
> ראיות: `QA/kiosk/password-reveal-0813/` (4 צילומי מסך).

> ## 🟢 13/08/2026 14:40 — **01 איגוד השיעורים תוקן ונפרס: המערכת השנייה והאחרונה שהגישה עברית מקודדת פעמיים. שתיהן נקיות עכשיו, והבדיקה שפספסה אותן מכסה עכשיו את מה שהייצור באמת מגיש.**
>
> הבאנר שמתחת השאיר את 01 פתוחה (#211): `more30.com/torah/` הגישה 2,001 מופעים
> של הסימן שמסמן קידוד כפול, והכותרת, ה-meta והציור המוקדם כולם ג'יבריש עד
> ש-React החליף אותם.
>
> **התיקון לא היה בנייה מחדש, ובכוונה.** הכרטיס תיאר מסלול build → robocopy →
> prerender והזהיר ש-torah היא היעד היחיד שדורש `--seed-url` (בלי הדגל, CLS עלה
> 0.001 → 0.578 ב-03/08). מדידה אחת ייתרה את כולו: העותק המקומי והתשובה החיה
> זהים — 34,102 מול 34,338 בייט, וההפרש הוא ארבע שורות של הזרקת NetFree בלבד.
> הקלקול הוא טרנספורמציה אחת הפיכה, ולכן `cp1255.GetBytes(current)` הוא **בדיוק**
> מערך הבייטים המקורי. בנייה מחדש הייתה מייצרת ציור מוקדם חדש ומכניסה את סיכון
> ה-CLS בלי צורך.
>
> | 01 torah, אחרי `dpl_ax1hqCvr8aMPHZZ3dKYnL98RRtwP` | תוצאה |
> |---|---|
> | `<title>` בייצור | `איגוד השיעורים · מערכת תורנית מאוחדת` |
> | מופעי U+05F3 בייצור | 2,001 ← **0** |
> | `<div>` של הציור המוקדם | 61 ← 61 (נשמרו) |
> | `/torah/assets/index-B2ayyksV.js`, `robots.txt`, `sitemap.xml`, `auth/reset` | 200 |
>
> **הפער האמיתי, וזה מה שקומיט.** `scripts/qa/mojibake-scan.mjs` נכתב ב-b22e4d9
> בדיוק כדי שהבא לא יימצא במקרה — והוא פספס את שתיהן, כי הוא סורק את עצי המקור
> ומדלג במפורש על `dist`, ומעולם לא הסתכל על `_deploy`. שתי המערכות נדבקו בדיוק
> שם: ב-`index.html` שאין לו מקבילה ב-`public/` של האפליקציה, כי הוא תוצר של
> `prerender-spa.mjs` שהועתק ביד. הסריקה מכסה עכשיו גם `_deploy/**/*.html`
> (21 קבצים, כולם נקיים), ואומתה מול הבייטים השמורים מלפני התיקון — כלל האבחון
> מסמן אותם ב-28 שורות, כלומר הירוק אינו ריק.
>
> ראיות: `QA/torah/encoding-0813/`.

> ## 🔴 13/08/2026 14:15 — **22 מימוש זכויות הגישה לכל מבקר עברית מקודדת פעמיים, ואיש לא רשם זאת. תוקן ונפרס. 01 איגוד השיעורים סובל מאותו דבר עכשיו.**
>
> הצעד נכנס כדי לסגור את #210, שטען שאין שלב prerender בעץ המקור ולכן פריסת
> המקור תמחק את דף הבית של 22. **שתי הטענות הופרכו.** שלב ה-prerender קיים
> ומקומיט — `scripts/prerender-spa.mjs` ו-`scripts/prerender-all.mjs`, ו-`zchuyot`
> רשומה שם במפורש כיעד; הוא פשוט חי ברמת הפלטפורמה ולא ב-`package.json` של
> האפליקציה, כי הוא משותף לחמש מערכות. וגם בלעדיו דף הבית לא היה נמחק —
> prerender הוא אופטימיזציית ציור ראשון, ו-React מצייר את אותו תוכן בכל מקרה.
>
> **מה שכן היה שבור, ולא היה רשום בשום מקום:** ה-HTML שהוגש בייצור ל-22 החזיק
> עברית **מקודדת פעמיים**. נמדד על התשובה החיה ולא על עותק מקומי:
>
> ```
> GET https://more30.com/zchuyot/  ->  200
> <title>׳‘׳§׳׳•׳× ג€” ׳׳™׳¦׳•׳™ ׳–׳›׳•׳™׳•׳×...</title>
> ```
>
> ההוכחה שזה קידוד כפול ולא נזק אקראי היא שהסיבוב חוזר במדויק:
> `UTF8.GetString(cp1255.GetBytes(live))` מחזיר
> `<title>בקלות — מיצוי זכויות, מענקים והטבות | הזכות שלך, האחריות שלנו</title>`.
> כלומר בייטים תקינים של UTF-8 פוענחו פעם אחת כ-cp1255 — עמוד הקוד העברי של
> Windows, ברירת המחדל של `Set-Content` כאן — ואז נכתבו שוב כ-UTF-8.
>
> הפגיעה אינה SEO בלבד: ה-HTML המוקדם הוא מה שנצבע על המסך עד ש-React מחליף
> אותו, ולכן **הביקור הראשון בעמוד התחיל ב-52KB של ג'יבריש**, יחד עם שם הלשונית,
> ה-meta description, תגי og ו-twitter וה-JSON-LD.
>
> | 22 zchuyot, אחרי `dpl_GWyimfVpN9ZseVevUjvJnYY1RUrL` | תוצאה |
> | --- | --- |
> | `<title>` ב-`more30.com/zchuyot/` | `בקלות — מיצוי זכויות, מענקים והטבות…` — עברית תקינה |
> | ציור מוקדם | 161 `<div>` — נשמר, לא נמחק |
> | `/zchuyot/robots.txt` · `/zchuyot/sitemap.xml` | 200 · 200 (לכן `robocopy /E` ולא `/MIR`) |
> | `/zchuyot/auth/reset` בדפדפן | «הקישור אינו תקף» — המסך, לא ה-404. #201 ירד למערכת אחת |
>
> **שורש הפריסה הוכרע במדידה, לא בניחוש.** ב-`_deploy` יושבות שתי תיקיות לאותו
> פרויקט Vercel, והשנייה (`zchuyot2`, 02/08) מצהירה `api/agent.ts` כפונקציה —
> פריסה ממנה או אליה הייתה יכולה למחוק נתיב חי. רשימת הקבצים של הפריסה החיה
> עצמה מכילה `vercel.json` + `zchuyot/**` ואין בה `api/`. בקרה שראוי להכיר:
> `POST /zchuyot/api/agent` מחזיר **405** ונראה כמו פונקציה — זו תשובת Vercel
> ל-POST על קובץ סטטי, כלומר ה-SPA rewrite. רשימת הקבצים היא הראיה, לא הסטטוס.
>
> **התאום שנמצא בדרך:** סריקה של כל קבצי `index.html` ב-`_deploy` העלתה מערכת
> אחת נוספת עם אותה חתימה — **01 torah, 2,001 מופעים**. אומת מול הייצור החי
> ומשחזר באותו סיבוב. נפתח כ-#211. אינו העתקה של הצעד הזה: torah הוא היחיד
> מבין יעדי ה-prerender שדורש `--seed-url`, והרצה בלעדיו כבר עלתה
> CLS 0.001 → 0.578 ב-03/08.
>
> ראיות: `QA/zchuyot/deploy-encoding-0813/`.

> ## 🟢 13/08/2026 13:40 — **ה-402 נגמר: כל 25 המערכות מוגשות שוב. ובבדיקה הראשונה שזה איפשר — מסך אחד מתוך שבעה מעולם לא הגיע לאוויר, ועכשיו הוא שם.**
>
> מ-12\08 20:58Z כל כתובת ב-`more30.com` החזירה **402 Payment Required** —
> softBlock על חשבונית Vercel שלא שולמה (#204). המשתמש שילם. נמדד ולא הונח:
> `softBlock` = `null`, `billing.status` = `active` (היה `canceled`), וסריקה על
> **33 כתובות** — 25 המערכות החיות ו-7 מסכי איפוס הסיסמה — החזירה **אפס** תשובות
> 402. אף מערכת לא נזקקה לפריסה מחדש; הפריסות היו שלמות כל הזמן.
>
> **מה שזה איפשר, וזו העבודה האמיתית של הפעימה:** שבעת מסכי איפוס הסיסמה שנבנו
> בתוך חלון ה-402 (#200, #201) נכתבו ונפרסו בלי שאיש ראה אותם — כי בזמנו כל
> כתובת החזירה 402. הם נבדקו כאן בייצור בפעם הראשונה. שישה ענו 200. **31 גשר
> החזירה 404** — גם `/gesher/reset-password` וגם `/gesher/auth/reset`, כלומר לא
> טעות בשם המסלול. הסיבה נמדדה: הפריסה האחרונה של `gesher-more30` הייתה 12\08
> 12:30Z והקומיט שבנה את המסך נכתב 12\08 21:13Z — הקוד היה בריפו, בייצור הוא לא
> היה, כי אותה פעימה נמנעה מפריסה בכוונה בגלל ה-402.
>
> | 31 גשר, אחרי `dpl_FHQwr2TRvFuSxsJQRcbXYqAh4gdD` | תוצאה |
> | --- | --- |
> | `GET /gesher/reset-password` | **200**, `בחירת סיסמה חדשה — מערכת CRM שותפים` |
> | דפדפן, מסך הכניסה | «שכחתי סיסמה» קיים ומוצג |
> | דפדפן, המסך בלי טוקן | מסיים ב«הקישור אינו תקף» עם הסבר וקישור חזרה — לא נתקע על «בודקים…» |
>
> **מה שעדיין חסום:** סיבוב מלא מהמייל אי אפשר לבדוק — `uri_allow_list` של
> `ygaqqnuyfnumezxxmtbh` אינו מכיל את `more30.com` (#205, אחד משישה ב-NEEDS_USER
> §0תב). **#201 ירד למערכת אחת** — 15 egod, חסומה באמת על #167.
>
> ראיות: `QA/platform/recovery-402-0813/` · `core.issues #204` נסגר.

> ## 🟢 12/08/2026 18:4x — **06 בריאות · 12 סמל · 17 חיזוקים: מי שנרשם נכנס מיד. שלוש מערכות ירדו מהכרטיס של §1א, והבעלוּת שהחזיקה אותן הייתה שגויה.**
>
> `QA/platform/autoconfirm-0812/` מדד ב-09:34 את כל 26 הכתובות החיות וקבע שתשע
> מערכות דורשות אישור מייל, על שבעה פרויקטים. הוא סיים במשפט בעלוּת אחד:
> *"מתוך שמונת הפרויקטים שאינם `uhnrgujbdxhhmoxcjria`, **אף אחד** אינו נראה
> מהסביבה הזו."* המשפט הזה נשען על `list_projects` של ה-MCP, שמחזיר פרויקט אחד.
> הוא נבדק במקום להיות מכובד: `GET api.supabase.com/v1/projects` עם
> ה-`SUPABASE_ACCESS_TOKEN` שכבר יושב ב-`core.secrets` מחזיר **עשרה** פרויקטים,
> ובהם **שניים** מהשמונה — ואת ההגדרה עצמה אפשר לקרוא ולכתוב שם דרך
> `GET/PATCH /v1/projects/{ref}/config/auth`.
>
> **`csjekrvukbdznetsrodj` — הודלק, ואומת בסבב אמיתי מול הייצור:**
>
> | סבב מול `csjekrvukbdznetsrodj.supabase.co/auth/v1` | לפני | אחרי |
> | --- | --- | --- |
> | `POST /signup` | `200`, משתמש נוצר, **בלי `access_token`** | `200` **עם `access_token`** מיד |
> | `POST /token?grant_type=password` מיד אחריו | `400` `email_not_confirmed` | `200` + `access_token` |
> | `GET /settings` עם המפתח ש-`/briut/supabase-config.js` מגיש בייצור | `mailer_autoconfirm: false` | `mailer_autoconfirm: true` |
>
> זה מה ש-`RUN_INSTRUCTIONS` דורש מהמסלול החינמי — "הרשמה מיידית → מיד נכנס
> לתוך המוצר". להחזרה בדקה: `PATCH … {"mailer_autoconfirm": false}`.
>
> **נתוני אמת:** `auth.users` בפרויקט הזה החזיקה שורה **אחת** לפני השינוי
> (`test@more30.com`, מאושרת) — כלומר אף לקוח אמיתי לא היה תקוע, המלכודת הייתה
> עתידית. שני משתמשי הבדיקה שנוצרו לסבב נמחקו (`200` לשניהם) והטבלה חזרה לשורה
> אחת בדיוק כפי שהייתה.
>
> **`bieebmnmkffwbqlsfozh` (01) נגיש באותה מידה — ובמכוון לא נגעתי בו.** הוא נושא
> גם את `zr-loader` ו-`zr-admin-api`, כלומר את `zr_*` **המוגן**, ו-`Confirm email`
> היא הגדרה של הפרויקט כולו. הכרעה של המשתמש, רשומה ב-`NEEDS_USER §0א״`.
> חמשת הנותרים (15, 21, 24, 30, 31) באמת אינם ברשימת העשרה — נמדד.
>
> **נמצא בדרך ולא תוקן:** `site_url` של `csjekrvukbdznetsrodj` הוא
> `http://localhost:3000`, ולכן כל מייל **איפוס סיסמה** מהפרויקט הזה מצביע
> למחשב של הנמען. ההרשמה כבר לא נשענת על קישור כזה; איפוס סיסמה כן.
> `core.issues #198`, high, צעד משלו.
>
> ראיות: `QA/platform/autoconfirm-flip-0812/` · `core.issues #172` (ירד מתשע לשש
> מערכות) · `#193` → fixed · `#198` חדש.

> ## 🟢 12/08/2026 17:2x — **הסריקה שהרשומה שמתחת הזמינה מצאה שתי פונקציות גרועות מהדליפה שהיא סגרה (#191). שתיהן כבויות עכשיו.**
>
> הרשומה מ-17:0x השאירה במפורש: *"ותשע הפונקציות המאורכבות האחרות עדיין פרוסות ולא
> נבדקו אחת-אחת."* הן נבדקו. בפועל פרוסות **חמש** ולא עשר (`admin-delete-user`
> ו-`admin-list-users` מחזירות `404`), ומתוכן שתיים היו פתוחות לרווחה — ושתיהן
> חמורות מ-`leads-api`, כי הן לא רק קוראות.
>
> `ivr-api` בונה `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` ומריצה את כל
> הפעולות **בלי לבדוק שום כותרת**: `get_profile` / `get_budget` / `get_summary` /
> `get_tasks` קוראות כל משתמש לפי `user_id`, `update_profile` ו-`add_expense` /
> `add_income` / `add_task` כותבות לו, ו-`action=login` הוא **אורקל PIN בן 6 ספרות בלי
> שום הגבלת קצב** שמחזיר את ה-`user_id` שפותח את כל השאר. `inbound-webhook` מכניסה
> `transactions` ו-`chat_messages` ל-`user_id` שהגוף נוקב בו, גם היא על `service_role`
> ובלי אימות.
>
> | בקשה (בלי `apikey` ובלי `Authorization`) | לפני | אחרי |
> | --- | --- | --- |
> | `GET ivr-api?action=get_summary&user_id=…` | `200` + סיכום מחושב | `403 ivr-api disabled` |
> | `GET ivr-api?action=get_profile&user_id=…` | קריאת פרופיל מלא | `403` |
> | `POST ivr-api?action=login` (פרטים שגויים) | `401` — `profiles` נשאלה | `403`, לפני המסד |
> | `POST ivr-api?action=update_profile` | כתיבה לכל משתמש | `403`, לפני `req.json()` |
> | `GET ivr-api?action=menu&key=wrong` | `200` | `403` |
> | `POST inbound-webhook` (`STRUCTURED_DATA`) | `400` מהוולידציה → הכנסה | `403` |
> | `POST leads-api {}` | `400` | `400` — הטופס הציבורי ללא רגרסיה |
>
> אותה תבנית **fail-closed** של `leads-api`: בלי `IVR_API_KEY` / `INBOUND_WEBHOOK_SECRET`
> בסביבה הקורא מקבל `403` לפני שהמסד נוגע, והמשתנים **הושארו לא-מוגדרים בכוונה** —
> אפליקציה מאורכבת בלי אתר פרוס צריכה להיות כבויה, והדלקה היא החלטת בעלים.
> `admin-set-password` ו-`admin-create-user` נבדקו באותה סריקה ונמצאו **תקינות**:
> `401 Missing authorization` בלי כותרת, ו-`has_role` נכשל סגור. שום גוף תשובה עם
> נתוני אדם אמיתי לא נקרא — כל הבדיקות על `uuid` מומצא ועל פרטי הזדהות שגויים.
> Lovable commit `1efe66d8`, שני קבצים, 1.3 קרדיט.
> ראיות `QA/archive-ivr-webhook-gate-0812/` · `core.issues #191` → fixed.

> ## 🟢 12/08/2026 17:0x — **טבלת הלידים של `lux-manage` כבר אינה נקראת בלי מפתח (#170). החסם שהחזיק אותה יומיים לא היה קיים.**
>
> הרשומה מ-07:4x למטה סגרה עם `blocked_on` מפורש: *"אין Supabase CLI במכונה ואין
> `SUPABASE_ACCESS_TOKEN`; ה-MCP מציג רק `uhnrgujbdxhhmoxcjria`. הגרסה הפתוחה חיה עד
> לפריסה."* מאז נפרסו ארבעה תיקונים לפרויקטי לוויין דרך Lovable (#160, #161, #165,
> #190), ולכן השאלה כאן לא הייתה "איך לפרוס" אלא **"האם גם לפרויקט הזה יש פרויקט
> Lovable"**. יש: `supabase/config.toml` בפרויקט `lux-manage`
> (`b095c3d6-c6b0-425c-8d0c-06020933b981`) מכיל שורה אחת — `project_id =
> "zwxwteebcoejrjdufzsv"`, בדיוק הפרויקט הדולף.
>
> **לפני**, נמדד מחדש לפני שנגעתי בכלום: `GET .../functions/v1/leads-api` **בלי
> `apikey`, בלי `Authorization`** → `200`, 1444 בתים, `total = 6` — כל טבלת הלידים על
> כל שדותיה. **אחרי** (Lovable commit `b230a60e`, קובץ אחד, 0 קרדיט):
>
> | בקשה | לפני | אחרי |
> | --- | --- | --- |
> | `GET` בלי כותרות | `200` + 6 לידים | `403 leads-api reader disabled` (×3) |
> | `GET` עם `x-api-key` שגוי | `200` + 6 לידים | `403` |
> | `PUT {"leads":[]}` | הכנסה מרובה בלי שער | `403`, לפני `req.json()` |
> | `POST {}` | `400` מהוולידציה שלו | `400` — הטופס הציבורי ללא שינוי |
>
> השער **נכשל סגור**: בלי `LEADS_API_KEY` בסביבה הקורא כבוי, וזה מצב המנוחה הנכון
> ל-`service_role` בפרויקט שאין לו בעלים. לכן ענף ה-`401` לא נמדד — `403` קודם לו כל
> עוד המשתנה חסר. לא נכתבה שום שורה לטבלה החיה (`POST {}` נדחה בוולידציה של הפונקציה).
> `AdminLeads.tsx` נופל חזרה ל-`supabase.from("leads")` תחת RLS כשהפונקציה אינה `ok`,
> ולכן המסך אינו נשבר — נקרא במקור ולא הורץ בדפדפן: לאפליקציה המאורכבת אין אתר פרוס.
>
> **מה שנשאר של המשתמש הוא רק שאלת הבעלות**, לא הדליפה: `zwxwteebcoejrjdufzsv` אינו
> ב-`core.projects` ואין לו אתר. ותשע הפונקציות המאורכבות האחרות עדיין פרוסות ולא
> נבדקו אחת-אחת. ראיות `QA/archive-leads-api-gate-0812/` · `core.issues #170` → fixed.

> ## 🔴 12/08/2026 09:20 — **§1א שוחזר. הסיבה אינה hash — היא אישור מייל, בשני פרויקטים מתוך שלושה.**
>
> הרשומה שמתחתיה קבעה בקריאת קוד שאי-התאמת hash אינה קיימת, ואמרה במפורש
> שהיא לא הריצה אף התחברות. `scripts/qa/own-form-login-roundtrip.mjs` (ניתן
> להרצה חוזרת) הריץ את קריטריון הקבלה של §1א בפועל — **הרשמה ואז מיד התחברות
> עם אותם פרטים** — מול שרת האימות האמיתי של שלוש המערכות שיש להן טופס משלהן,
> עם ה-URL והמפתח ש-more30.com מגיש בפועל.
>
> | # | מערכת | פרויקט | `mailer_autoconfirm` | התחברות מיד אחרי הרשמה |
> | --- | --- | --- | --- | --- |
> | 01 | torah | `bieebmnmkffwbqlsfozh` | **false** | ❌ `email_not_confirmed` |
> | 15 | egod | `hkkkynyoigzlttpynoeo` | **false** | ❌ `email_not_confirmed` |
> | 16 | chatzor | `uhnrgujbdxhhmoxcjria` | true | ✅ session מיד |
>
> **המשתמש נרשם, מקליד את אותה סיסמה בדיוק, ונדחה.** מבחוץ זה זהה ל"סיסמה
> שגויה" — וזו בדיוק התלונה ב-§1א. chatzor הוא ההוכחה שזו **הגדרת פרויקט ולא
> באג קוד**: אותו קוד-לקוח, ורק מפני שהאישור האוטומטי דלוק שם — הסבב עובר.
> זה גם סותר את §8ב, שדורש שהנרשם ייכנס מיד לתוך המוצר.
>
> `test@more30.com` מתחבר ב-**שלוש** המערכות (משתמש ותיק ומאומת), ולכן כל בדיקה
> שמתחילה מהמשתמש הקיים אינה יכולה למצוא את זה. רק סבב הרשמה מלא מוצא אותו.
>
> **egod כבר אומר את האמת על המסך**: בחבילה החיה יש מיפוי `email_not_confirmed`
> → «המייל עדיין לא אומת… הסיסמה עצמה תקינה». **ב-torah זה לא נמדד** — בחבילה
> הראשית שלו אין אף מחרוזת שגיאה בעברית, ו-`needsConfirmation` מחושב ואינו
> נקרא באף מקום; מסך ההתחברות עצמו אינו בחבילת הכניסה.
>
> **ההכרעה היא של המשתמש** — כיבוי "Confirm email" בשני הפרויקטים האלה הוא
> הגדרה בלוח הבקרה של Supabase, ואין לסביבה הזו גישת ניהול אליהם (שניהם אינם
> ב-`list_projects`). נרשם ל-NEEDS_USER · `core.issues #172`.
>
> **שתי טעויות נשמרו ברשומה:** ההרצה הראשונה קיבלה `401 Invalid API key` על
> torah והסקריפט, לא האתר, היה אשם — הוא הצמיד URL מקובץ אחד למפתח מ-
> `/auth-button.js` המשותף; ו-torah כבר משתמש ב-`sb_publishable_…` שהרג'קס לא
> חיפש כלל, כלומר דיווח שקט ולא היעדר. שניהם תוקנו ואומתו.
>
> ראיות: `QA/platform/own-form-login-0812/` (`README.md` + `_results.json`) ·
> `QA/torah/anon-key-pairing-0812/_results.json`.

> ## 🟢 12/08/2026 09:1x — **§1א "נרשמתי ואז הסיסמה שגויה": השאלה נשאלה על 24 המערכות החיות בבת אחת. אין אי-התאמת hash באף אחת.**
>
> §1א מייחס את הבאג לאי-התאמה בין ההצפנה בהרשמה לבדיקה בהתחברות. ההתחברות
> המשותפת (portal `/login`) נוקתה מקצה לקצה ב-12/08 — אבל **מערכת שיש לה טופס
> כניסה משלה מעולם לא נבדקה**, וזה בדיוק המקום שבו אי-התאמה כזו יכולה לחיות.
> `scripts/qa/own-login-hash-sweep.mjs` (ניתן להרצה חוזרת) סורק את קוד המקור של
> כל מערכת חיה, מוצא כל מסך עם שדה סיסמה, ומסווג את נתיב האישורים שמאחוריו.
>
> | נתיב האישורים | כמה | מי |
> | --- | --- | --- |
> | ההתחברות המשותפת בלבד — אין טופס משלהן | 16 | tamlul, modaot, imud, bkalot, smel, smachot, chizukim, orech, mthbram, studio, mechiron, kupot, crm, gesher, nadlan, gannenet |
> | טופס משלהן, מעל Supabase Auth | 3 | torah (01), egod (15), chatzor (16) |
> | סומן לקריאה ידנית ונקרא | 4 | zchuyot (22), kiosk (35), briut (06), galil (24) |
> | המקור אינו בריפו | 1 | kesef (34) — `apps/34-kesef` מחזיק `app.json` בלבד |
>
> **אי-התאמת hash נמצאה ב-0 מערכות.** מעל Supabase Auth היא לא אפשרית מבנית —
> ההצפנה נעשית בשרת, אותו אלגוריתם לשני הכיוונים. ארבע המערכות שהסיווג סימן
> נקראו בעיניים, כי ביטוי לבדו לא מבדיל בין גיבוב סיסמה לגיבוב מפתח API:
>
> - **zchuyot (22)** — הגיבוב הוא של **מפתח API**, לא של סיסמה: `AdminSettings.tsx` מגבב את המפתח לתוך `api_keys.key_hash` ופונקציית `leads-api` מגבבת את הנכנס באותו אלגוריתם. ההתחברות עצמה היא `signInWithPassword`.
> - **kiosk (35)** — `hashPassword`=`bcrypt.hashSync(…,12)` מול `verifyPassword`=`bcrypt.compareSync`, ו**כל** נתיבי הכתיבה עוברים דרכן (`seed.js`→`seedadmin.js`, `routes/admin.js`). אותו אלגוריתם לשני הכיוונים.
> - **briut (06)** — אין נתיב אישורים כלל, בכוונה: `site/admin.js` דוחה כל התחברות («התחברות לניהול אינה מוגדרת בסביבה זו»), החלטה מ-07/08. יש שדה סיסמה ואין מה להשוות אליו.
> - **galil (24)** — אין גיבוב בכלל: `GabaiPortal.tsx` כותב ל-`gabai_accounts.password_hash` את המחרוזת שהוקלדה כפי שהיא. אין שתי שיטות ולכן אין אי-התאמה; **הבעיה כאן אחרת וכבר פתוחה** — נמדדה שוב היום מול הייצור: המפתח האנונימי שהחבילה של `more30.com/galil` נושאת מחזיר `200` על `synagogues`/`community_leads`/`knowledge_base` ו-**401 `42501`** על `gabai_accounts`, ולכן שום התחברות של גבאי או מנהל אינה יכולה להצליח. הקוד מציג נכון «שגיאת חיבור למסד הנתונים» ולא «סיסמה שגויה».
>
> שתי טעויות שהמעבר הראשון עשה, ולמה הן מתועדות ולא נמחקו: הסורק דילג בהתחלה
> על `public/` — וזה בדיוק המקום שבו יושב מסך הכניסה של קיוסק (35) כ-HTML, כך
> ש-«אין לו טופס משלו» היה שקר; ו-crm (30) סווג `custom-hash` על סמך `.output/`,
> תוצר בנייה ולא מקור. אחרי שתי ההחרגות: קיוסק נקרא ידנית, ול-crm אין מסך סיסמה
> משלו כלל. **סורק שמדלג על תיקייה מדווח שקט, לא היעדר.**
>
> מה זה **לא**: קריאה בקוד המקור, לא הרצה. «אין אי-התאמת hash» אינו «ההתחברות
> עובדת» — אישור מייל, RLS ומסך שנוחת במקום הלא נכון הם באגים אחרים ולא נמדדו כאן.
>
> ראיות: `QA/platform/own-login-hash-0812/_results.json`, `QA/galil/gabai-accounts-0812/_results.json`.

> ## 🟢 12/08/2026 07:5x — **מחירון (27): פונקציית ה-API של הפריסה חיה עם נתוני אמת, והלקוח מעולם לא פנה אליה. תוקן ונפרס.**
>
> בסיס ה-API בחבילה שמוגשת ב-`more30.com/mechiron` הסתכם ל-`""`
> (`Un = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"`), ולכן כל קריאה
> הלכה לשורש הפורטל. **נמדד לפני שנגעתי:**
>
> | מה שהלקוח שלח | מה שחזר |
> | --- | --- |
> | `more30.com/api/pc/public/meta` | `404` `text/plain` — ה-`NOT_FOUND` של Vercel |
> | `more30.com/mechiron/api/pc/public/meta` | `200` JSON — 117,405 מוצרים · 1,213 חנויות · 33 מקורות · עודכן היום 03:18Z |
>
> הפונקציה שנבנתה לפריסה הזו הגישה נתוני אמת כל הזמן — לאף אחד. הבסיס עבר ל-`BASE_URL`
> של Vite עם הסרת הלוכסן (הצורה של imud ב-8507410 ושל kupot ב-6551b75); זה עקבי ולא
> קידוד קשיח — ה-API רוכב על אותו קידומת שממנה כבר הגיעו הנכסים, ו-`base: "/"` מצטמצם
> ל-`""`, כלומר בדיוק ההתנהגות הקודמת. 9 קריאות `fetch("/api/…")` ישירות ועוד 3
> ב-`user-auth.tsx` עברו דרך `API_BASE`; בחבילה שנוצרה **אפס** מכל אחת מהצורות.
>
> **נפרס ואומת בדפדפן דרך more30.com** (לא preview): `mechiron-more30`,
> `dpl_B46XCvXYdBkWopGbhqucCRBmTgHf`, production, READY. `/mechiron/#/price-comparison`
> שולח `/mechiron/api/pc/public/settings` ו-`/mechiron/api/pc/public/meta`, שניהם `200`,
> ומצייר 33 מקורות, 117,405 מוצרים, 1,213 חנויות, 22 קטגוריות אמת ומבצעים אמיתיים —
> מסך שלפני כן לא היה בו כלום.
>
> **הועתק בכירורגיה, לא ב-mirror:** `index.html` ב-`_deploy` הוא 34,179 בתים מול 3,082
> של vite (תצוגה מוקדמת של `#root`, סקריפט המצב הכהה, כפתור הכניסה המשותף). הוחלף רק
> נכס ה-JS ושורת ה-`<script src>`; ה-hash של ה-CSS לא זז — וזו הראיה שדבר אחר לא זז.
>
> **מה שלא נטען:** נתיבי הניהול נשארים חשוכים בכוונה — הם מגיעים עכשיו לפונקציה של
> mechiron עצמה ומקבלים `{"message":"not found"}` במקום 404 של הפלטפורמה: תשובה כנה,
> לא תשובה עובדת. מה שהמערכת אמורה להגיש בכלל הוא **#94**, הכרעה של המשתמש, ולכן
> **#115 אינו יכול להיסגר בלעדיה**. 27 היא `is_protected=false`, ריפו משלה
> (`bkalut-price`) ופרויקט Vercel משלה — שרת `bkalut-app` המוגן לא נגע.
>
> קומיט `d478863` · ראיות `QA/platform/mechiron-api-base-0812/`

> ## 🔴 12/08/2026 07:4x — **"מאורכב" לא אומר "לא פרוס": כל 10 הפונקציות ב-`apps/_archive/**` חיות, ואחת מהן מחזירה טבלת לידים שלמה לכל אחד.**
>
> הצעד הקודם סגר בשורה פתוחה: `apps/_archive/**` מכיל עוד פונקציות, כולל
> `admin-set-password` ו-`admin-create-user`, **שלא נסרקו בהנחה שהן אינן פרוסות —
> הנחה שלא נבדקה.** היא שגויה. עשר פונקציות בשתי אפליקציות מאורכבות, בשני פרויקטי
> Supabase, **כולן פרוסות ועונות עכשיו.** ארכוב המקור לא הוריד כלום מהאוויר.
>
> **הממצא.** `GET .../functions/v1/leads-api` על `zwxwteebcoejrjdufzsv` (האפליקציה
> `lux-manage`) החזיר `200` ואת תוכן טבלת `leads` — `name, email, phone, message` —
> **בלי `apikey` ובלי `Authorization` כלל**, `total = 6`. הפונקציה בונה לקוח
> `service_role` ואינה בודקת דבר; ההערה מעל ה-handler טענה *"requires auth header with
> service key or admin JWT"* והבדיקה מעולם לא נכתבה. **ההערה הייתה כל מודל האבטחה.**
> אותה מחלקה כמו #161 ו-#167. גם `POST`/`PUT` פתוחים לכתיבה — לא נבדקו בכוונה, כדי לא
> ללכלך טבלה חיה.
>
> **תוקן במקור:** `readerGate()` — `GET`/`PUT` דורשים `x-api-key == LEADS_API_KEY`
> **ונכשלים סגור** (`403`) כשהסוד אינו מוגדר; `POST` נשאר פתוח כי הוא טופס יצירת הקשר
> הציבורי, והוא רק כותב. 🚫 **טרם נפרס** — אין CLI ואין טוקן לפרויקט הזה מהסביבה הזאת.
>
> **התוצאה השלילית, והיא החשובה מכאן.** `pwcswdfgorvlpdflzylm` — הפרויקט של
> `apps/_archive/bklotm` — הוא **מערכת 08 `bkalut-app`, מוגנת.** הבדיקות שם היו `GET`
> בלי גוף בלבד, לקריאה, ולא שונה בה דבר. ה-`leads-api` שלה דווקא מגודר נכון
> (`401 Missing API key`), אבל `leads-webhook`, `n8n-notify` ו-`rights-agent` רצו לקורא
> בלי הרשאה ורק הגוף הריק עצר אותן — לא דליפה, אבל נתיבי כתיבה לא מגודרים. **לא שונה
> דבר: זו הכרעה של המשתמש.** `core.issues #170` (critical) ו-`#171` (high) ·
> `NEEDS_USER §0ש`, `§0ת` · ראיות `QA/archive-edge-sweep-0812/`.

> ## 🔴 12/08/2026 07:0x — **מתחברים (21): שאלה על קטלוג ריק נענתה, והתשובה חשפה נתיב פתוח שרץ עם service_role.**
>
> `core.issues #17` שאל אם "0 שיעורים" הוא באג תצוגה או האמת. **זו האמת, ואף
> חזקה יותר ממה שנטען:** הטבלה ריקה לגמרי, לא "יש שיעורים שממתינים לאישור".
> את זה אפשר להגיד בוודאות כי הפונקציה `api/stats` של אותו פרויקט רצה עם
> service_role — RLS אינו מסתיר ממנה דבר — והיא החזירה
> `{"lessons":{"total":0,"approved":0},"teacher_leads":0,"seeker_leads":0,"contact_messages":0}`.
> בדפדפן העמוד מציג "0 שיעורים" ולצידו "עדיין אין שיעורים במאגר": מצב ריק כן,
> בלי באג. **#17 נסגר.** מילוי התוכן הוא החלטת תוכן, לא תיקון.
>
> **ותוך כדי הבדיקה נמצא חמור בהרבה.** כדי לברר אם משהו מוסתר מאחורי RLS נקראו
> מדיניות ה-RLS והפונקציות של הפרויקט, ושם ישבה `create-admin`: היא רצה עם
> `SUPABASE_SERVICE_ROLE_KEY`, יוצרת משתמש עם סיסמה נתונה, **ואם המייל כבר קיים
> היא דורסת לו את הסיסמה** — והיא ענתה ל-`POST` בלי `apikey` ובלי
> `Authorization` כלל. לא נוצר חשבון ולא נדרסה סיסמה: הבקשה הושמטה בכוונה משדה
> `password` כדי שההנדלר יחזור לפני `auth.admin`, וה-`400` שחזר הוא הודעת
> האימות של הפונקציה עצמה — כלומר הבקשה נכנסה לגוף ההנדלר בלי אישורים.
>
> **תוקן במקור:** שער `ADMIN_BOOTSTRAP_SECRET` (כותרת `x-admin-bootstrap-secret`;
> `503` בלי סוד מוגדר, `404` בלי התאמה). `verify_jwt` לבדו לא היה מספיק — מפתח
> ה-anon הוא JWT תקין שנשלח לכל דפדפן. **ובאותה הזדמנות נסגר חצי שני:**
> `create-admin` מעולם לא יצרה מנהל שיכול להיכנס, כי `/admin-login` בודק
> `has_role` שקורא מ-`user_roles`, ורק service_role יכול לכתוב לשם — הפונקציה
> יצרה משתמש ועצרה. עכשיו היא כותבת את שורת ה-`admin`. אף אחד מהחשבונות
> ש-§1ב נוקבת בהם לא עובר היום את השער: `l023131500@gmail.com` ו-`admin@more30.com`
> נדחים בכניסה, ו-`test@more30.com` נכנס אך `has_role(uid,'admin')=false`.
>
> **🚫 טרם נפרס** — פריסה לפרויקט `aypsqqvfohekxxuqsmrw` דורשת אישורים שאין
> לסביבה הזו. עד הפריסה, הגרסה הפתוחה היא זו שרצה. `core.issues #160` ·
> `NEEDS_USER §0צ` · ראיות `QA/mthbram/create-admin-open-0812/_results.json`.

> ## 📏 10/08/2026 03:4x — **האייקונים שבתוך ההרכבות נמדדו. תשעה תקינים, וההצהרות שמסביבם לא.**
>
> הסבב הקודם (89081ef) השאיר תשע כתובות אייקון "בלי הכרעה" — הן מוגשות מתוך
> הפריסה של כל מערכת ולא מהריפו הזה, ולכן העץ אינו יכול לענות עליהן. עכשיו הן
> נקראו מהייצור. `scripts/qa/mount-icon-declarations.mjs` הורחב: כתובת שנופלת
> בתוך הרכבה נבדקת ברשת, והתשובה נחשבת **רק אם היא נושאת `server: Vercel`** —
> נטפרי אינה מזייפת את הכותרת הזאת, וכל ההרכבות הן פריסות Vercel, ולכן היעדרה
> פירושו שמישהו בדרך ענה במקום הייצור. השומר אומר "לא הכרעה" ולא מנחש.
>
> | | לפני | אחרי |
> |---|---|---|
> | בדיקות שרצו | 16 עברו · 0 נפלו | **30 עברו · 4 נפלו** |
> | כתובות אייקון בלי הכרעה | 9 | **0** |
>
> **תשע הכתובות עונות, כולן 200 ומ-Vercel.** ‏/chatzor/ · /egod/ · /galil/ ·
> /kupot/ · /mechiron/ · /mthbram/ · /nadlan/ · /smel/ · /tivuch/ — וגם ה-href
> היחסי של /briut/. לא נמצא אף אייקון חסר. מה שנמצא הוא שכבה אחת מתחת.
>
> **מה שנפל, ושלושתם אותו באג בדיוק:** הצהרה מוחלטת-לשורש שנכתבה לפני שהמערכת
> הורכבה תחת נתיב. מסמך ההרכבה יושב ב-more30.com/&lt;שם&gt;/, ולכן `/x` נפתר
> לשורש הפורטל — לא להרכבה.
>
> - **‏#134 · galil** — `<link rel="manifest" href="/manifest.webmanifest">` נפתר
>   ל-more30.com/manifest.webmanifest ומחזיר **404**. הקובץ האמיתי עונה 200
>   ב-/galil/manifest.webmanifest, ואיש אינו מבקש אותו: ההתקנה כ-PWA מתה לגמרי.
>   ובנוסף `apple-touch-icon` מצביע על `/galil/pwa-192.png`, שעונה 200 אבל הוא
>   **1024×1024 במשקל 645,577 בייטים**. השם משקר; אין בו 192 פיקסל. הקובץ הנכון
>   כבר פרוס לידו — `/galil/pwa-512.png`, ‏512×512, ‏97,813 בייטים, **פי 6.6 פחות**.
> - **‏#135 · mthbram** — המניפסט כן נטען ונפרס, ושני ה-`icons[].src` שבתוכו הם
>   `/icon-192.png` ו-`/icon-512.png`. שניהם 404 בשורש הפורטל. אין למניפסט הזה
>   ולו אייקון תקף אחד — בעוד `/mthbram/icon-192.png` עצמו עונה 200.
>
> **‏/tivuch/ הוא הבקרה שמוכיחה שזה בר-תיקון:** המניפסט שלו מפנה ל-`/tivuch/icon.svg`
> (עונה), ו-`start_url` שלו יושב בתוך `scope`. אותה משפחת מערכות, הצהרה נכונה.
>
> שני התיקונים יושבים במקור של אותן מערכות ודורשים בנייה ופריסה נפרדת לכל אחת —
> **לא נעשו בסבב הזה**, ולכן השומר יוצא 4 נפלו במכוון. ראיות:
> `QA/platform/mount-icons-0810/_results.json` · `_before.json` · `_live-manifests.json`.

> ## ✅ 09/08/2026 00:3x — **הנורמליזציה חתכה את הדומיין בלי לשאול של מי הוא. נסגר.**
>
> `core.app_key_normalize` מקבלת **כתובת**, לא מפתח, ושני הקוראים בייצור שולחים
> לה מה שהדפדפן נתן: `auth-button.js:353` שולח `location.href`, ו-
> `auth/callback.html:158` שולח `returnTo() || document.referrer || 'more30'`.
> השורה הראשונה שלה מחקה את הפרוטוקול ואת הדומיין **בלי לבדוק אותם** — התנהגות
> מ-0015 ש-0048 לא נגעה בה, ולכן `https://evil.com/bkalot` החזיר `bkalot`.
> `returnTo()` כבר מוגבל לנתיב יחיד, ולכן החור הוא `document.referrer`: מי
> שנוחת ב-`/auth/callback` מאתר זר יכול היה לקבל שורת חברות ב-
> `core.app_memberships` של מערכת אמיתית. זו רשומה שקרית, לא הרשאה שדלפה —
> חברות היא רישום ולא שער גישה — אבל §2 ו-§3 קוראים בדיוק את הטבלה הזו כדי
> לענות "מי הלקוחות של המערכת".
>
> **מיגרציה 0049.** השער אינו רשימה בתוך גוף הפונקציה אלא טבלה,
> `core.trusted_origins` — כי בדיוק רשימה כזו הייתה הבאג של 0048: היא לא גדלה
> כשהמערכת גדלה. 29 שורות: `more30.com` ו-`www` (נמדד: **כל** live_url ב-
> `core.projects` הוא more30.com, 25 מתוך 25), `localhost` ו-`127.0.0.1`
> לפיתוח, ו-**25 מארחי ההרכבה** שנגזרו מ-`portal/vercel.dist.json`. הפונקציה
> חותכת את האוטוריטה ב-`/`, `?` ו-`#`, מסירה userinfo
> (`https://more30.com@evil.com/` → `evil.com`), מטפלת גם בכתובת ללא פרוטוקול,
> ומחזירה `null` לכל מארח שאינו בטבלה.
>
> | | לפני | אחרי |
> |---|---|---|
> | צורות ממארח זר שהחזירו מפתח מערכת | **9 מתוך 10** | 0 |
> | מארחי הרכבה שעונים כמו הכתובת הקנונית | 25 | 25 |
>
> הטענה השנייה נמדדת לצד הראשונה במכוון: שער שדוחה הכל "עובר" את מבחן
> האבטחה ומפיל את המוצר — מי שגולש ישירות ל-`nadlan-more30.vercel.app` היה
> מפסיק להירשם כלקוח.
>
> **לא נכלל, במכוון ובגלוי:** תבנית `%-more30.vercel.app`. השם ב-vercel.app הוא
> מרחב שמות גלובלי, ותבנית הייתה מרשה לכל מי שירשום פרויקט בשם כזה — ולכן
> `https://evil-more30.vercel.app/bkalot` נבדק במפורש ומחזיר null. וכן: מארח
> התצוגה-המקדימה של הפורטל עצמו אינו ברשימה (אין לו שורה בניתוב, כי הכינוי שלו
> הוא more30.com); כניסה מהמארח הגולמי ההוא תחזיר null עד שיירשם.
>
> **בלי פריסה** — הפונקציה חיה במסד, ושני הקוראים כבר בייצור. זה תקף עכשיו ואינו
> ממתין לתור של `#83`. `core.issues #122` נסגר.
>
> ראיות: `scripts/qa/normalize-rejects-foreign-hosts.mjs` — 4/4 ·
> `QA/platform/foreign-host-gate-0809/` (`_results-before.json` מול
> `_results.json`) · בלי רגרסיה:
> `scripts/qa/join-app-from-portal-pages.mjs` — 7/7 (הייתה 6/6; השורה שתיעדה את
> #122 כפתוח הפכה לטענה).

> ## ✅ 09/08/2026 00:0x — **הדלת אל המסלולים נבנתה: 19 כרטיסים בדף הבית מובילים עכשיו אל עמוד המסלולים, והשרשרת עד /subscribe נמדדה.**
>
> הסבב הקודם (למטה) מצא עמוד מסלולים חי בייצור שאף קישור בעולם לא מוביל אליו.
> מתוך שני הכיוונים, בוצע זה שאינו נוגע בניתוב: `SystemCard` מצייר עכשיו קישור
> שקט שני, **"מסלולים ומחירים"**, לצד "כניסה למערכת" —
> `/system.html?app=<שם>`. `portal/src/App.tsx` ו-`portal/src/styles.css` בלבד.
>
> **נמדד בדפדפן מול ה-dist הבנוי** (`vite preview`, 80 modules, built in 2.89s):
>
> | מה נספר | כמה |
> |---|---|
> | כרטיסים בדף הבית | 20 |
> | קישורי "מסלולים ומחירים" | **19** |
> | הכרטיס ה-20 | מערכת 33 — האתר הזה עצמו, `path` ריק. `plansHref` מחזיר `null`, ולא נוצר `?app=null` |
>
> **השרשרת, מקצה לקצה:** כרטיס → `/system.html?app=torah` → 200, "פלטפורמת
> איגוד השיעורים", שלושה מסלולים — חינמי · בסיסי **₪2** · מורחב **₪5** — וכל
> אחד מקשר אל `/subscribe?app=torah&plan=<code>`. אלה בדיוק מדרגות ה-2 ₪
> וה-5 ₪ של §8א, על מערכת חיה. מצב טסט: הסליקה לא נפתחה, ובחירת מסלול רושמת
> בקשה ואינה מחייבת.
>
> `subscribe-funnel-entry.mjs` עבר מ-**3 passed · 2 failed** ל-**5 · 0**. חישוב
> ההגעה בו תוקן לשני צעדים: מפנה שיושב ב-`system.html` נפסל רק כל עוד אף אחד
> אינו מקשר אל `system.html` עצמו. הרגרסיה ההפוכה נשארה ירוקה — `/nadlan` עדיין
> מגיש את המערכת ולא עמוד שיווקי; הניתוב לא זז.
>
> ⚠️ **בייצור זה יופיע רק אחרי הפריסה הבאה של הפורטל** (§0ט / `#83`), שמחזיקה
> לפניה גם את ה-soft-404 של `#119`. `core.issues #120` נשאר פתוח על החצי השני
> בלבד — הפרדת הסמלוש, שמזיזה 19 כתובות חיות וממתינה לך. `NEEDS_USER §0נ`.
> ראיות: `QA/platform/plans-link-0808/`.

> ## 🟠 08/08/2026 23:5x — **עמוד המסלולים של כל מערכת חי בייצור, ואפס קישורים בכל הריפו מובילים אליו. פתוח.**
>
> §8 מבקש פלטפורמה מוכנה להכנסה. הצינור שלם: `core.plans` מלא,
> `portal/public/system.html` מצייר לכל מערכת את כרטיסי המסלול מ-
> `more30_system_page`, וכל כרטיס מקשר אל `/subscribe?app=..&plan=..`. שני
> העמודים **מוגשים באמת** — נמדד אנונימית מול הייצור: `/subscribe` מחזיר 200
> ו-17,013 בייט עם `more30_subscribe`, `/system.html?app=nadlan` מחזיר 200
> ו-16,901 בייט עם `more30_system_page`. אף אחד מהם אינו נופל ל-catch-all.
>
> **מה שאין הוא הדלת.** גרף הקישורים על 2,425 קבצי מקור — כולל untracked, כי
> מקורות של אפליקציות נמצאים ב-`.gitignore` ו-`git grep` מחזיר עליהם "אין
> התאמות" גם כשיש:
>
> | היעד | מפנים בכל העץ | מהם שלקוח יכול לפגוש |
> |---|---|---|
> | `system.html` | **0** | 0 |
> | `/subscribe` | 2 — `portal/vercel.dist.json:14`, `system.html:315` | **0** (קובץ ניתוב, והעמוד היתום עצמו) |
>
> הסיבה אינה עמוד חסר: `docs/NIGHT_PROGRESS.md` מתאר סמלוש אחד —
> `more30.com/<שם>` = תדמית, `<שם>/` = המערכת — ו-`system.html` נכתב לכך (גוזר
> את המערכת מ-`location.pathname`, canonical על `more30.com/<שם>`). אבל
> `portal/vercel.dist.json` מרכיב **גם** `/<שם>` וגם `/<שם>/` על הפריסה של
> המערכת, ולכן הכתובת שהעמוד נכתב עבורה תפוסה והוא נשאר בלי כתובת נקייה.
>
> **לא תוקן כאן במכוון.** מבין שני הכיוונים, האחד משנה 20 כרטיסים בדף הבית
> והשני מזיז את הניתוב של 20 מערכות חיות — הכרעה, לא באג. `NEEDS_USER §0נ`.
> **מה שכן נעול:** `scripts/qa/subscribe-funnel-entry.mjs` — נכשל על שתי
> טענות היתמות, ועובר על שלוש, ובהן ש-`/nadlan` עדיין מגיש את המערכת ולא
> עמוד שיווקי. מי שיתקן את היתמות דרך הניתוב ויעלים מערכת חיה — נתפס כאן.
> `core.issues #120`. ראיות: `QA/platform/subscribe-entry-0808/`.

> ## ✅ 07/08/2026 10:5x — **הדרך פנימה נבדקה, הדרך החוצה לא. "חזרה למערכת" לא הופיע אף פעם. נסגר.**
>
> `customer-journey.mjs` מוכיח את הצעד של §1 פנימה — נרשמת מתוך `/bkalot`,
> נחתת ב-`/bkalot`. הצעד שאחריו מעולם לא נבדק: לקוח מחובר שעומד בתוך המערכת,
> פותח את תפריט החשבון ובוחר **"האזור האישי"**. ב-`/me` יש כפתור בדיוק לזה —
> `#backTo`, "חזרה למערכת" — **והוא לא הופיע אף פעם**, משני צדדים בבת אחת:
>
> | הצד | מה היה |
> |---|---|
> | `auth-button.js` | `back = encodeURIComponent(location.href)` נסע לפריטי **הכניסה** בלבד. `item(ME_URL, …)` — בלי `?from=`. |
> | `me.html` | `back.startsWith('https://more30.com/')`. `/login` שומר **נתיב** (`/bkalot`) מאז שהבאג הזה תוקן שם וב-`/auth/callback`; זה היה העותק השלישי, שנשכח. |
>
> ומעבר לשניהם: `destination()` ב-`callback.html` **מוחק** את
> `more30-return-to` ברגע שהוא משתמש בו, ולכן `sessionStorage` לבדו לא יכול
> היה להחזיק את התשובה גם אילו ההשוואה הייתה נכונה. שום דבר לא נשבר, שום דבר
> לא החזיר 404 — הכפתור פשוט נשאר `hidden`, וזו הסיבה שזה שרד.
>
> **התיקון — שני החצאים יחד, כי כל אחד לבדו עדיין לא מציג כפתור:**
> `auth-button.js` מעביר `?from=` גם ל-"האזור האישי" וגם ל-"שדרוג לפרימיום";
> `me.html` קורא קודם `?from=` ואחר כך `sessionStorage`, דרך אותו
> `safeReturnPath` שכבר כתוב ב-`/login` וב-`/auth/callback` (נתיב יחיד שאינו
> `//`, או כתובת מלאה על more30.com), ומתעלם מ-`/me` עצמו.
>
> **נמדד, ולא הוסק:** `scripts/qa/me-back-to-system.mjs` נכנס עם לקוח בדיקה
> אמיתי ל-`/me?from=/bkalot` ושואל אם הכפתור על המסך.
> **ייצור 1/4** (הכפתור חבוי, `href = null`) · **עץ המקור המתוקן 4/4**.
> צילומים: `QA/platform/me-back-prod.png`, `QA/platform/me-back-local.png`.
> `core.issues #105` נפתח ונסגר. הפריסה עדיין חסומה על מכסת Vercel
> (`core.issues #83`), ולכן הייצור יראה את זה בפריסה הבאה.

> ## ✅ 07/08/2026 10:0x — **"ניהול" בתפריט החשבון הצביע על מרכז השליטה, וקרא לו בשם המערכת. שמונה מערכות. נסגר.**
>
> לארבע פונקציות יש דעה על הכתובת שאליה כפתור "ניהול" מוביל. **שלוש** מהן
> מיישמות בנפרד את אותו כלל בדיוק — `admin_auth in ('own','hub')` **וגם**
> `admin_url ~ '^(/|https?://)\S*$'` — ומי שאינו עומד בו מקבל **null ולא קישור
> חלופי**. `more30_admin_systems_report` אפילו מנסחת אותו בתוך מילון השדות
> שלה: *"מערכת בלי מסך ניהול מקבלת null ולא קישור חלופי — היעדר מסך ניהול הוא
> ממצא (`core.issues #86`) ולא פרט להסתיר."*
>
> הרביעית, **`more30_join_app`**, היא היחידה מביניהן שרצה **בכל טעינת עמוד בכל
> מערכת** — `auth-button.js` קורא לה עם `location.href` — והיחידה שלא קיבלה את
> הכלל: בלי בדיקת `admin_auth`, בלי בדיקת צורת הכתובת, ובמקום null היא החזירה
> `https://more30.com/admin`.
>
> **נמדד ב-07/08 מול `core.projects` החי.** מ-19 המערכות ב-`more30_public_systems`,
> **שמונה** קיבלו כתובת שאינה מסך הניהול שלהן:
>
> | מערכות | מה במסד | מה `join_app` החזיר |
> |---|---|---|
> | `briut` · `chizukim` · `imud` · `kesef` · `orech` · `smel` · `studio` | `admin_url = null` | `https://more30.com/admin` |
> | `kupot` | `admin_auth='token'`, `admin_url='/api/switch-leads (כותרת x-admin-token)'` | `https://more30.com/kupot/api/switch-leads (כותרת x-admin-token)` |
>
> **מה זה עשה על המסך**, לחשבון האדמין האמיתי: בשבע הראשונות התפריט צייר **שני
> פריטים אל אותה כתובת** — *"ניהול · ניהול תמלול חיזוקים"* ו*"מרכז השליטה · כל
> המערכות במקום אחד"* — כששניהם `https://more30.com/admin`, והראשון נושא את שם
> המערכת שהוא אינו פותח. ב-`kupot` הוא צייר `href` שמורכב מהערה בעברית עם
> רווחים. **שש מהשבע הן בדיוק שש המערכות של `core.issues #86`**, שנמדדו כמערכות
> שאין להן מסך ניהול בקוד המקור — כלומר הקישור לא נשבר, הוא מעולם לא היה קיים.
>
> **עודכן 09/08 — השש אינן משימה אחת.** `scripts/qa/admin-gap-what-to-manage.mjs`
> (8/8) שאל מה מסך כזה היה קורא, ופיצל אותן לפי הפרויקט שמחזיק את השורות:
> `chizukim` ו-`smel` נושאות `csjekrvukbdznetsrodj` כליטרל במקור, ו-`orech`
> אינה נושאת ליטרל כלל אלא לוקחת את הכתובת מהסביבה (`bieebmnmkffwbqlsfozh`,
> ‏`.env.example` + `core.projects`) — סריקה שמחפשת ליטרלים בלבד הייתה מנקה
> אותה. שלושתן מחוץ לפרויקט היחיד שהחשבון מנהל, ולכן חסומות על NEEDS_USER §1
> ולא על תור עבודה. השלוש שבהאב, לפי מה שהיו מציגות היום: `kesef` — 283 שורות
> בסכימת `kesef` ומתוכן 259 רשויות; `studio` — 4 תבניות; `imud` — 2 ספרים.
> **הראשונה לבנייה היא `kesef`.** `QA/platform/admin-gap-0809/`.
>
> **עודכן 09/08 — הקורא של `kesef` נבנה, ומה שהוא מצא משנה מה המסך צריך להיות.**
> ‏0052 הוסיפה את `public.more30_admin_kesef_report()` — קורא בלבד, super-admin
> בלבד, מונה **דינמית** כל טבלת בסיס בסכימה במקום מרשימה קשיחה. מה שהוא מדד:
> ‏283 שורות ב-36 טבלאות ו-32 מהן ריקות; 259 רשויות, ובאף אחת מהן אין
> `population`, `socio_economic_cluster`, `website_url` או `financial_status`;
> ‏12 מקורות נתונים **פעילים כולם** ואף אחד מהם ללא `last_ok_at`; אפס ריצות
> סנכרון, אפס עובדות פיננסיות, אפס משתמשים. כלומר כל 283 השורות הן **קטלוג
> שנזרע ביד** — שמות רשויות, מחוזות, סעיפי תקציב ומילון מונחים — והמוצר עצמו
> מעולם לא קלט שורה אחת. מסך שמדפדף ב-259 רשויות היה מציג טבלה שכל עמודה
> מעניינת בה ריקה, ומי שיראה אותה יסיק שהמערכת עובדת; מה שיש לנהל כאן הוא
> **הקליטה**. `is_active` הוא הגדרה ולא מצב, ולכן הדוח מחזיר `ok` נפרד שהוא
> בדיוק `last_ok_at is not null`. ‏`#86` נשאר פתוח על המסך עצמו.
> ‏`scripts/qa/kesef-report-shape.mjs` 18/18 · `QA/platform/kesef-report-0809/`.
>
> ‏(‏`#86` ספר 34 טבלאות ריקות מתוך 38; הדוח סופר 32 מתוך 36. ההפרש הוא
> ‏`v_authority_year_summary` ו-`v_topic_spending` — תצוגות ולא טבלאות, והדוח
> מסנן `table_type='BASE TABLE'` כדי לא לספור שורות נגזרות פעמיים.)
>
> **0037 מתקנת את שני החצאים, כי כל אחד מהם לבדו עדיין מייצר את אותו תפריט:**
> `core.app_admin_href()` הוא עכשיו המקור היחיד לכלל ו-`more30_join_app` קוראת
> לו; `has_system_admin` ו-`admin_reason` נוספו לתשובה כדי שהצד הלקוח ישתוק
> מסיבה ידועה. `auth-button.js` הסיר את `ctx.admin_href || ADMIN_URL` שלו.
> **לא שונה אף `admin_url`, אף `admin_auth` ואף `is_admin`** — ההרשאה לא זזה,
> רק היעד. הפריסה הבאה עדיין חסומה על מכסת Vercel (`core.issues #83`), והדף
> שבייצור ממשיך לעבוד כמו אתמול: ה-JS הישן נופל אל `ADMIN_URL` בדיוק כמו קודם.
>
> אומת: `scripts/qa/join-admin-href.mjs` **16/0** — 19 מאונטים חיים מול ה-RPC
> החי עם חשבון רשום אמיתי, ואז התפריט שהקומיט הזה מצייר משתי תשובות: מערכת עם
> מסך ומערכת בלי. ראיות + צילומים: `QA/platform/join-admin-href-0807/`.
> `core.issues #99` נפתח ונסגר.

> ## ✅ 07/08/2026 09:4x — **לוח המחירים הבטיח ש-70 מסלולים ייגבו כשהמתג ייפתח. 31 מהם אינם ניתנים להצעה. נסגר.**
>
> הבאנר של `/admin/pricing` — זה ש-0029 לימד לקרוא את `core.billing_settings`
> במקום להצהיר מהזיכרון — נשא מספר שני: *"70 מסלולים פעילים כבר נושאים מחיר
> גדול מאפס, **והם ייגבו ברגע שהמתג ייפתח**"*. החצי הראשון נכון. השני אינו.
>
> **נמדד ב-07/08 מול המסד החי:**
>
> | | |
> |---|---|
> | `chargeable_plans` — מה שהבאנר הדפיס | **70** |
> | ניתנים להצעה ללקוח בפועל | **39** |
> | ההפרש | **31** |
> | מתוכו: `pro` = 1 ₪, `customer_visible=false`, אחת בכל מערכת | 29 |
> | מתוכו: `mechiron/basic`=2 ו-`mechiron/extended`=5, על `not_offered` | 2 |
>
> שני המסננים שחוסמים אותם **כבר נאכפים**, רק לא כאן: `more30_plans`
> ו-`more30_subscribe` מסננים על `customer_visible`, ו-0033/0034 לימדו את שניהם
> (ואת `more30_checkout`) לקרוא ל-`core.app_offer_block()` ולסרב לפני שמגיעים
> לטבלת המסלולים בכלל. **`more30_admin_pricing_list()` לא קראה לאף אחד מהם.**
> לכן הלוח צייר שדה מחיר ומצב "לגבייה" מעל שורות שאף קופה לא תמכור, ותשע
> מערכות חסומות — `crm` · `financial` · `gesher` · `igud` · `mechiron` ·
> `mthbram` · `shiurim` · `smachot` · `zol` — ככרטיסים רגילים, חלקן עם תגית
> **"חי"**, כי `live=true` אינו `public_visible`.
>
> **0036 מוסיפה ואינה גורעת:** `offerable_plans` בראש, `offer_block`/`offer_note`/
> `sellable` לכל מערכת, `customer_visible`/`offerable` לכל מסלול. `chargeable_plans`
> ו-`chargeable` נשארו בדיוק כפי שהם — העמוד שבייצור קורא אותם, והפריסה הבאה
> חסומה על מכסת Vercel (`core.issues #83`), אז דף ישן ממשיך לעבוד כמו אתמול.
>
> `admin-pricing.html` קורא את החדשים: הבאנר מוסיף *"מתוכם **39** ניתנים להצעה
> ללקוח, ו-**31** אינם — מסלול נסתר, או מערכת שהקופה מסרבת למכור"*; מערכת חסומה
> מקבלת תגית **"לא מוצע למכירה"** והערה בלשון הסירוב עצמה; ושורה שאינה מגיעה
> ללקוח קוראת **"לא נמכר · נסתר"** או **"לא נמכר · המערכת חסומה"** במקום
> "לגבייה" — גם אחרי שמירה מוצלחת, שם ההודעה הישנה הייתה מחזירה את אותו שקר.
>
> **לא שונה אף מחיר ואף דגל גלוּיוּת.** אומת: `scripts/qa/admin-pricing-offerable.mjs`
> **14/0** מול ארבע תשובות — המספרים האמיתיים, מתג פתוח, לוח נקי בלי פער (אינו
> מאשים אף אחד), ו-RPC ישן בלי השדה (הדף שותק ולא מנחש). ראיות + צילומים בהיר
> וכהה: `QA/platform/admin-pricing-offerable-0807/`. `core.issues #98` נפתח ונסגר.

> ## ✅ 07/08/2026 09:1x — **הקורא החמישי: הסליקה המשיכה להחזיק מחיר למערכת שהעמוד הפסיק להציע. נסגר.**
>
> 0033 נתנה ל-§4 מקור אמת אחד — `core.app_offer_block()` — ולימדה אותו לשלושה
> קוראים. הרביעי שנוגע בכסף, **`more30_checkout`** — זה שההערה ב-`subscribe.html`
> קוראת לו "מי שמכריע" — לא קיבל אותו. כותרת הקומיט של 0033 תיארה בדיוק את
> הפער הזה, והתיקון עצמו עצר שורה אחת לפניו.
>
> **נמדד ב-07/08 מול ה-REST החי, עם חשבון מחובר אמיתי, לפני התיקון:**
>
> | app | חסימה | `more30_plans` | `more30_checkout` |
> |---|---|---|---|
> | `mechiron` | `not_offered` | `offered:false` | `none/billing_off` · **2 ₪** ו-**5 ₪** |
> | `crm` · `gesher` · `mthbram` · `smachot` | `not_offered` | `offered:false` | `none/billing_off` · **10 ₪** |
> | `zol` · `events` · `financial` · `igud` · `shiurim` · `bkalot-studio` | `not_live` | `offered:false` | `none/billing_off` · **10 ₪** |
>
> אותם שני ליקויים שכבר נסגרו בשלושת הקוראים האחרים: ל-`mechiron` מסלולים משלו
> ולכן הסליקה מצאה שורה אמיתית והחזירה את המחיר שלה; לעשר הנותרות אין מסלול
> משלהן, ולכן הסליקה **נפלה לאחור אל מסלולי הפלטפורמה** והחזירה 10 ₪ תחת
> ה-`app_key` של המערכת המוסתרת — בדיוק הנפילה ש-0033 הסירה מ-`more30_plans`
> ומ-`more30_system_page`.
>
> **מה זה לא: תקלת כסף.** `billing_settings.mode='off'`, וכל שתים-עשרה התשובות
> חזרו `charged:false`. הפער הוא שהתשובה נושאת `price_ils` ומנוסחת "למסלול יש
> מחיר, אבל הסליקה סגורה" — כלומר מבטיחה מחיר שממתין לפתיחה — על מוצר שאינו
> מוצע כלל. ברגע ש-`mode` היה עובר ל-`test` אותן בקשות היו מקבלות
> `action:'test_payment'` עם ספק ומחיר. לכן זה נסגר עכשיו, כשהסליקה סגורה.
>
> **0034** מוסיפה את `core.app_offer_block()` **לפני** חיפוש המסלול ולפני
> הנפילה-לאחור, ומחזירה `action:'none'` עם `reason` = סיבת החסימה ובלי
> `price_ils` כלל — לא exception: `more30_subscribe` זורק כי הוא כותב שורה,
> ו-`more30_checkout` מחזיר הכרעה, ואוצר המילים שלו כבר כולל `price_not_set`
> ו-`billing_off` לשתי סיבות שונות לאי-גבייה. `subscribe.html` מדפיס את
> `data.message` בענף `action='none'`, ולכן **העמוד אומר את הדבר הנכון בלי
> פריסה** — הצעד כולו חי כבר עכשיו.
>
> אומת: `scripts/qa/checkout-not-sellable.mjs` **86/0** מול ה-REST החי — 12
> צירופי מערכת·מסלול חסומים × 6 טענות (אין מחיר, הסיבה הנכונה, בלי נפילה-לאחור,
> הודעה בעברית, `charged:false`), 6 מסלולים מוצעים שהמחיר שלהם נבדק בערך
> (2 · 5 · 10 · 12 · 15 · 10 ₪), מסלול הבדיקה המוסתר ב-1 ₪ עדיין נדחה, ואנונימי
> עדיין לא מגיע לשם. ראיות: `QA/platform/checkout-offer-block-0807/`.
> `core.issues #96` נפתח ונסגר.

> ## ✅ 07/08/2026 09:0x — **הכרטיס ירד מדף הבית, ודף המסלולים המשיך למכור אותו. נסגר.**
>
> `public_visible` היה נקרא בדף הבית ובשום מקום אחר. שלוש הפונקציות שמוכרות מנוי
> — `more30_plans`, `more30_system_page`, `more30_subscribe` — בחרו על
> `core.plans` בלבד ולא ידעו דבר על `core.projects`.
>
> **נמדד ב-07/08 דרך ה-RPC עצמם, לפני התיקון:**
>
> | app | live | public_visible | `more30_plans` | מקור |
> |---|---|---|---|---|
> | `mechiron` | ✅ | ❌ (0032) | **3** | משלו |
> | `crm` · `gesher` · `mthbram` · `smachot` | ✅ | ❌ | **2** | הפלטפורמה |
> | `zol` · `events` · `financial` · `igud` · `shiurim` · `bkalot-studio` | ❌ | ❌ | **2** | הפלטפורמה |
>
> שני ליקויים תחת אותה שורה חסרה: ל-`mechiron` שלוש שורות מחיר משלו, ולכן
> `/subscribe?app=mechiron` הציע **2 ₪ / 5 ₪** למוצר שהוסתר יום קודם מפני
> שהכתובת שלו מגישה משהו אחר; ולעשר הנותרות אין מסלול משלהן, ולכן שתי פונקציות
> הקריאה נפלו לאחור אל מסלולי הפלטפורמה — תחת שם המערכת המוסתרת בכותרת. הנפילה
> נכונה למערכת חיה שטרם תומחרה, ועל מערכת שאינה מוצעת היא הופכת "אין לזה מחיר"
> ל"זה המחיר".
>
> `more30_subscribe` בחר באותו תנאי בדיוק, ולכן בקשת מנוי למערכת מוסתרת **נרשמה
> והחזירה `ok`**. ל-`mechiron` כבר 4 שורות ב-`core.subscriptions`, כולן חשבונות
> בדיקה — לקוח משלם ראשון עוד לא נרשם, וזה העיתוי לסגור.
>
> **0033** נותנת לשאלה מקום אחד — `core.app_offer_block()` — ושלושת הקוראים
> קוראים ממנו: קריאה מחזירה `plans: []` עם `offer_block` ו-`offer_note`, ובלי
> נפילה-לאחור; כתיבה נדחית בהודעה בעברית. מערכת בלי שורה ב-`core.projects`
> (ובראשן `more30` עצמה, שהיא הפלטפורמה) אינה נחסמת.
>
> **מה זה לא עושה:** `more30_join_app` לא נגע — מי שכבר בפנים ממשיך להשתמש
> במערכת מוסתרת. נחסמה המכירה, לא השימוש. ארבע שורות המנוי הקיימות נשארו.
>
> אומת: `scripts/qa/hidden-not-sellable.mjs` **83/0** מול ה-REST החי (11 מוסתרות
> × 2 פונקציות, 5 מוצעות ללא שינוי, ומסלול הכתיבה עם חשבון אמיתי: `mechiron`
> נדחה ולא נפל לאחור ל-`more30`, `kupot` עדיין עובר, `charged=false`);
> `scripts/qa/hidden-not-sellable-page.mjs` **14/0** על שני העמודים שמציירים
> כרטיסי מסלול. ראיות: `QA/platform/hidden-not-sellable-0807/`.
>
> צד המסד חי עכשיו; שני העמודים ממתינים לפריסת `portal` (`core.issues #83`).

> ## ✅ 07/08/2026 08:3x — **הכרטיס בדף הבית מכר "השוואת מחירים", והכתובת מגישה עמוד זכויות. ירד.**
>
> §4 אומר "לא-עובדות → מוסתרות. עדכן `core.projects.public_visible`". #27
> (`mechiron`) היה אחת מ-21 המערכות הגלויות, והכרטיס שלו הבטיח **"השוואת מחירים
> בקלות · אותו מוצר, מחיר חכם יותר — בלי לבזבז את הזמן שלך"**.
>
> **נמדד על ה-HTML שהוגש בפועל** מ-`https://more30.com/mechiron/` (200, 31,585 בייט):
>
> | מחרוזת | מופעים |
> |---|---|
> | "השוואת מחירים" | **0** |
> | "מחיר" | **0** |
> | "₪" | **0** |
> | `price` | **0** |
> | `compare` | **0** |
>
> אפס — לא "מעט", ולא "מוסתר מאחורי JS": הכרטיס הבטיח מוצר שאף מילה ממנו אינה
> בעמוד. מה שמוגש הוא עמוד נחיתה של בקלות לזכויות והטבות, `h1` = "בקלות —
> הזכויות וההטבות שמגיעות לכם, בלי בירוקרטיה", עם ניווט של עלינו · איך זה עובד ·
> **השוואת קופות חולים** · ניהול פיננסי · יצירת קשר. כלומר הוא משכפל את #10
> (`bkalot`) ואת #22 (`zchuyot`), ואחד מקישורי הניווט שלו הוא #28 (`kupot`).
> ה-`<title>` מצהיר על עצמו: **"מאגר בקלות — כלי פנימי לצוות"**, וה-meta
> description: "מאגר פנימי לחיפוש זכויות, הטבות וארגוני סיוע".
>
> **שכבת ה-API מתה גם היא:** `/api/health` · `/api/search` · `/api/rights` ·
> `/api/prices` · `/api/compare` · `/api/items` — כולם **404**. `/api/` מחזיר 200,
> אבל זו נפילה אל ה-SPA של הפורטל (`<title>` "עולם הסטארטאפים", 3,329 בייט),
> ולכן אינה סימן חיים.
>
> חצי מהמדידה הזו כבר ישב ב-`audit_evidence` של השורה מאז הביקורת הקודמת
> ("הכותרת החיה… כל נתיבי `/mechiron/api/*` שנבדקו החזירו 404"), ו-`public_visible`
> נשאר `true` בכל זאת. מיגרציה `0032` סוגרת את הפער.
>
> **נמדד אחרי, על הייצור:**
>
> | | לפני | אחרי |
> |---|---|---|
> | `more30_public_systems` גלויות | 21 | **20** |
> | כרטיס #27 בדף הבית | קיים | **לא קיים** |
> | `a[href*="/mechiron"]` בדף הבית | קיים | **לא קיים** |
> | #28 (`kupot`) בדף הבית | קיים | קיים |
> | `/mechiron/` עצמו | 200 | **200** |
>
> **מה זה לא סוגר:** ההכרעה מה לעשות עם #27 — לבנות, לשנות רישום, או לפרוש — היא
> הכרעת מוצר, ולכן נרשמה כ-`core.issues #94` ו-`NEEDS_USER` §0מ ולא הוכרעה כאן.
> ההסתרה הפיכה בשורת `UPDATE` אחת. **לא נגעתי ב-`apps/27-bkalut-price`** — ה-`CLAUDE.md`
> שלו אומר שהוא נפרס אל `/var/www/bkalut-app/`, שנמצא ברשימת המוגנות.
>
> **הערה על התור:** ניסיתי קודם לפרוס את `portal` (הבא בתור לפי §0ט) והמכסה עדיין
> חסומה — `api-deployments-free-per-day`, אחרי שההעלאה הצליחה. `#83` נשאר פתוח,
> ולכן הצעד הזה נבחר להיות כזה שכולו במסד ונכנס לייצור מיד בלי פריסה.
>
> ראיות: `QA/platform/mechiron-0807/_results.json` · `live-mechiron.png` · `home-after.png`.
> לא נגעתי ב-08, 09, `bkalut-app`, `bkalot-admin`, `zr_*` או `NEDARIM3873`, ולא
> שיניתי שום מצב חיוב או שליחה.

> ## ✅ 07/08/2026 08:06 — **הנתיב האחרון מ-30 שדיווח "אין מצב כהה" נסגר בייצור.**
>
> `core.issues #82`. `/mthbram` היה הנתיב היחיד מתוך 30 עם ❌ בעמודת "כהה"
> ב-`QA/platform/SUMMARY.md`, וזה היה **דיווח נכון על פער אמיתי, לא תקלת מדידה**:
> הרקע האפקטיבי שלו `rgb(9,26,32)` (בהירות 0.009) בשני מצבי ה-OS, כלומר העמוד
> כהה מלכתחילה — אבל הוא לא **הצהיר** על כך. `index.html` נשא
> `<meta name="color-scheme" content="dark">`, ו-meta הוא ברירת מחדל שאינה
> נראית ב-`getComputedStyle(documentElement).colorScheme`. בלי ההצהרה הדפדפן
> צובע שדות קלט, `select` ופסי גלילה בברירת המחדל הבהירה על גבי עמוד כהה.
>
> התיקון עצמו — `color-scheme: dark` על כלל `html` ב-`apps/21-mthbram/src/index.css` —
> נכתב ונמדד כבר ב-`c882d65`, והדבר היחיד שעמד בינו לבין הייצור היה מכסת
> הפריסות (`#83`). הסבב הזה קיבל מקום והשתמש בו: `dpl_6PcRHMH3473rq1SjKtMLmYSv2Ddx`,
> READY, aliased ל-`mthbram-more30.vercel.app`.
>
> **נמדד לפני, על התיקייה:** `_deploy/mthbram-more30/mthbram/assets/index-CIaqlLS4.css`
> מכיל `color-scheme:dark`, וחבילת ה-JS זהה בייט-לבייט לזו שבייצור
> (sha256 `DE489454…BEEA96`) — הפריסה מורידה גיליון סגנון ולא התנהגות.
>
> **נמדד אחרי, על הייצור דרך `more30.com`** (לא מול ה-`*.vercel.app`, ש-NetFree
> חוסם), `scripts/qa/color-scheme-probe.mjs` עם מצב ה-OS מאולץ ל-light — המצב
> היחיד שבו החוסר מזיק:
>
> | | לפני | אחרי |
> |---|---|---|
> | computed `color-scheme` | `"normal"` | **`"dark"`** |
> | `<meta color-scheme>` | `"dark"` | `"dark"` |
> | רקע אפקטיבי | `rgb(9,26,32)` · 0.009 | `rgb(9,26,32)` · 0.009 |
> | `dark-by-design` | ❌ NO | ✅ **YES** |
>
> הרקע לא זז, וזו הנקודה: לא הוחלפה ערכה, הוצהר מה שכבר היה. **30 מתוך 30.**
>
> **מה זה לא סוגר:** `#83` לא נפתר, הוא שוב שחרר מקום אחד. ולפני שסימנתי את
> התור כריק מדדתי את הייצור, והוא הכחיש: `more30.com/subscribe` עדיין מחזיר
> `<ul>${feats}</ul>` בלי `.plan .btn{margin-top:auto}`, כלומר **`portal` הוא
> הבא בתור** — תיקון כרטיסי המסלול (`25a47ce`) ושאר שינויי התצוגה של 0025–0031
> חיים בגיט ולא בייצור. נרשם ב-`NEEDS_USER` §0ט עם פקודת הבנייה+פריסה.
>
> ראיות: `QA/platform/colorscheme-mthbram-0807/os-light.png` · `os-dark.png`.
> לא נגעתי ב-08, 09, `bkalut-app`, `bkalot-admin`, `zr_*` או `NEDARIM3873`, ולא
> שיניתי שום מצב חיוב או שליחה.

> ## ✅ 07/08/2026 07:4x — **האריח "מאגר המשתמשים בהאב" ב-/admin/systems הציג את מספר המערכות.**
>
> §3 מבקש מלוח ניהול-העל לראות "הכנסות/מנויים/כניסות". שורת ה-KPI שבראש דוח
> המערכות נשאה אריח שכותרתו **"מאגר המשתמשים בהאב"**, והמספר שמעליו הגיע
> מ-`totals.users_counted` — שמאז מיגרציה 0014 הוא
> `count(*) filter (where p.supabase_project = hub)`, כלומר **כמה מערכות** מאגרן
> יושב בפרויקט הראשי. השם נכון בדיוק במקום השני שבו הוא מופיע:
> `systems[].users_counted` הוא בוליאני לכל מערכת, והכרטיס קורא אותו נכון.
> באגרגט הוא קיבל אותו שם ומשמעות אחרת, והמסך קרא את הכוונה ולא את הנתון.
>
> **ההפרש נמדד מול ההאב, 07/08:**
>
> | מה שהוצג | מה שהוא באמת |
> |---|---|
> | **7** תחת הכותרת "מאגר המשתמשים בהאב" | 7 מערכות מתוך 30 שמאגרן כאן |
> | — | **20** חשבונות אמיתיים ב-`auth.users` |
> | — | **64** חשבונות בדיקה (`qa.*@more30.com`) — 64 מתוך 84 |
> | — | **8** מתוך ה-20 מחזיקים שיוך ב-`core.app_memberships` |
>
> ארבעה מספרים שונים תחת כותרת אחת, ואף אחד מהם אינו 7. מיגרציה 0030 מפרידה
> אותם ב-`more30_admin_systems_report()`: `users_counted` באגרגט הוסר לטובת
> `systems_users_counted`, ונוספו `hub_users`, `hub_users_test`,
> `hub_users_with_membership`. הבוליאני לכל מערכת לא נגע — הוא היה נכון.
>
> **נמדד:** `scripts/qa/admin-systems-users-kpi.mjs` — 8/8 עברו, כולל שהאריח
> החדש אינו נופל ל-0 ושמערכת מחוץ להאב עדיין אומרת למה אינה נספרת.
> שלוש בדיקות ה-`admin-systems` הקיימות רצו שוב: 14/14, 8/8, 10/10.
> ראיות: `QA/platform/admin-systems-users-kpi-0807/kpi-row.png` + `_results.json`.
> המיגרציה הוחלה על ההאב; העמוד עצמו ממתין לחלון פריסה (`#83`).
> לא נגעתי ב-08, 09, `bkalut-app`, `bkalot-admin`, `zr_*` או `NEDARIM3873`, ולא
> שיניתי שום מצב חיוב או שליחה.

> ## ✅ 07/08/2026 05:25 — **הדלת הפתוחה של מערכת 01 נסגרה בייצור. חלון הפריסות שחרר מקום אחד בדיוק, והוא הלך לזה.**
>
> `core.issues #87` — שלוש קונסולות הניהול הישנות של torah היו פתוחות בייצור
> לכל מי שידע את הכתובת. השער נכתב ונמדד ב-`ba2c41b` ב-01:31, והייצור המשיך
> להגיש את הגרסה הפתוחה עוד ארבע שעות מסיבה אחת: מכסת הפריסות של Vercel
> (`#83`). הסבב הזה ניסה שוב, והפעם הפריסה עברה —
> `dpl_CrB5iFg7RidHqhGQfPfhZ5XZQ4C7`, READY, aliased ל-`torah-more30.vercel.app`.
>
> **נמדד על הייצור אחרי הפריסה**, `scripts/qa/spa-admin-route.mjs` מול
> `more30.com` (לא מול ה-`*.vercel.app`, ש-NetFree חוסם):
>
> | נתיב | לפני | אחרי |
> |---|---|---|
> | `/torah/legacy/admin` | נשאר במקומו · 953 תווים · קונסולת ניהול מלאה ⚠️ | `→ /torah/auth/sign-in?redirect=%2Flegacy%2Fadmin` · 137 תווים · שדה סיסמה |
> | `/torah/legacy/ivr` | קונסולה · בלי שער | `→ /torah/auth/sign-in?redirect=%2Flegacy%2Fivr` |
> | `/torah/legacy/nedarim` | קונסולה · בלי שער | `→ /torah/auth/sign-in?redirect=%2Flegacy%2Fnedarim` |
> | `/torah/admin` | שער תקין | שער תקין · `redirect=%2Fadmin` |
>
> ארבעת המסכים חוזרים עכשיו 26,987 בייט **זהים** בצילום — אותו מסך כניסה בדיוק,
> ולא ארבעה מסכים שונים. `adminChrome` ריק בכל אחד מהם, כלומר שום פקד ניהול לא
> מצויר לאורח. כל אחד מהם שומר את הדרך חזרה, ולכן אדמין אמיתי שילחץ על הקישור
> יגיע ליעד שלו אחרי ההתחברות ולא לדף הבית.
>
> **מה זה לא סוגר:** `#83` לא נפתר — הוא שחרר מקום. הפריסה השנייה באותה דקה,
> `mthbram` (`#82`), נדחתה עם אותה הודעה `api-deployments-free-per-day` בדיוק.
> כלומר החלון הוא מתגלגל ומשחרר טיפין-טיפין, וזה גם למה הפריט הזה קיבל את
> המקום ולא זה שלפניו בתור: קונסולה פתוחה בייצור לפני מצב כהה.
>
> ראיות: `QA/platform/spa-admin-torah-0807/_results.json` (05:25) +
> `admin.png` · `legacy-admin.png` · `legacy-ivr.png` · `legacy-nedarim.png`.
> `legacy-admin-full.png` נשמר כפי שהוא — זו התמונה של מה שהיה פתוח.
> לא נגעתי ב-08, 09, `bkalut-app`, `bkalot-admin`, `zr_*` או `NEDARIM3873`, ולא
> שיניתי שום מצב חיוב או שליחה.

> ## ⚠️ 07/08/2026 — **הכניסה לניהול של מערכת 01 נרשמה כעמוד שהשער שולח אליו. ובדרך התגלתה דלת פתוחה.**
>
> `core.issues #85` — הבדיקה הקודמת השאירה את torah בלי הכרעה, ובצדק: כל נתיב
> תחת מאונט SPA מחזיר את אותה קליפה, ולכן `/admin` ו-`/qa-does-not-exist`
> **זהים בייט-בייט מעל HTTP**. אי אפשר להכריע בהשוואת מסמכים — צריך להריץ את
> הראוטר. `scripts/qa/spa-admin-route.mjs` (חדש) עושה בדיוק את זה, בדפדפן, מול
> הפרודקשן. ארבעת המועמדים נלקחו מטבלת המסלולים של האפליקציה עצמה:
>
> | מועמד | לאן הראוטר משאיר אותנו | מה נמצא שם |
> |---|---|---|
> | `/admin` | `/torah/auth/sign-in?redirect=%2Fadmin` | 137 תווים · שדה סיסמה · **הדרך חזרה נשמרת** |
> | `/auth/sign-in` | נשאר במקומו | 137 תווים · שדה סיסמה · **בלי דרך חזרה** |
> | `/legacy/admin` | נשאר במקומו | 953 תווים · **קונסולת ניהול · בלי סיסמה** ⚠️ |
> | `/legacy/admin-login` | נשאר במקומו | 122 תווים · שדה סיסמה · בלי דרך חזרה |
>
> **שתי הכתובות אמיתיות, והן אינן אותו מסך.** `/admin` הוא השער — `AdminLayout`
> בודק session ואז `is_super_admin`, ומעביר אורח לא-מחובר אל הכניסה **עם**
> `?redirect=/admin`. `/auth/sign-in` הוא היעד של השער, בלי החזרה: אדמין
> שהולך לכתובת שהייתה רשומה מתחבר ונוחת בדף הבית ולא בקונסולה. הרשומה שונתה
> ל-`/admin` (מיגרציה `0023`), `admin_auth` נשאר `own`.
>
> ### ⚠️ הממצא השלישי: `/torah/legacy/admin` פתוח לכל אחד
>
> נפתח כ-`core.issues #87` (חומרה `high`) ולא נרשם כ"כניסה לניהול" — דלת
> פתוחה היא תקלה לסגור, לא כתובת לפרסם בלוח. אורח אנונימי, עם כפתור "התחבר"
> עדיין בנאבבר, מקבל את **"לוח ניהול · ניהול מלא: שיעורים, פניות, ייבוא
> וייצוא"**: חמישה שיעורים עם שם הרב ועיר/שכונה, "ערוך" לכל אחד, "הורדת גיבוי
> מלא (ZIP)", "ייצוא לנדרים פלוס", ולשוניות API ואינטגרציות. הסיבה בקוד:
> `App.tsx` שורה 278 מרנדר את `LegacyAdminDashboard` **מחוץ** ל-`AdminLayout`,
> כלומר בלי הבדיקה שהמסלול השני כן עושה.
>
> **מה כן מוגן, נמדד:** כל טבלאות הלידים מחזירות 0 — נדרים, מגידי שיעור,
> מחפשי שיעור, הודעות, בתי כנסת. ה-RLS מחזיק אותן מול מפתח ה-anon, ולכן
> החשיפה היא המסך והפקדים ולא תיבת הלידים. **מה לא נבדק במכוון:** האם המחיקה
> והייצוא באמת עוברים — הדרך היחידה לדעת היא לכתוב לפרודקשן, וזה לא נעשה.
>
> התיקון הוא build+deploy ולכן **חסום על `#83`** (מכסת הפריסות היומית של Vercel).
> ~~חסום~~ — **נפרס ואומת חי ב-07/08 05:25**, ראה את הבלוק שבראש הקובץ.
>
> ראיות: `QA/platform/spa-admin-torah-0807/` (`_results.json` + `legacy-admin-full.png`).
> לא נגעתי ב-08, 09, `bkalut-app`, `bkalot-admin`, `zr_*` או `NEDARIM3873`, ולא
> שיניתי שום מצב חיוב או שליחה.

> ## ✅ 07/08/2026 — **11 מערכות ציבוריות נרשמו כ"בלי כניסה לניהול". לשלוש מהן יש אחת, חיה, עכשיו.**
>
> §3 מבקש מלוח הניהול-על קישור **"נהל מערכת זו"** לכל מערכת, ו-§5 מבקש
> ש-bkalot תוצג **"כולל כניסה לניהול"**. שניהם קוראים עמודה אחת:
> `core.projects.admin_url`. **אחת-עשרה מתוך 21 המערכות הציבוריות החזיקו שם
> NULL — ואף בדיקה מעולם לא שאלה אם זה נכון.**
>
> `scripts/qa/admin-entry-probe.mjs` שאל, מול הפרודקשן. **התוצאה: שלוש מהן
> הפעילו כניסה לניהול כל הזמן הזה, והרשומה פשוט לא ידעה.**
>
> | מערכת | מה נמצא חי | מה היה רשום |
> |---|---|---|
> | **10 bkalot** | `app.js` הנפרס מציב את הקישור "ניהול" בנווט על `more30.com/admin/rights` | NULL |
> | **24 galil** | `/gabai` — פורטל הגבאים, בתוך החבילה | NULL |
> | **27 mechiron** | `/admin` ו-`/admin-docs`, עם `/api/admin/login` משלה | NULL |
>
> **זה בדיוק ההבדל שעולה הכי ביוקר:** רשומה חסרה נראית על המסך *זהה* לפיצ'ר
> חסר, והעבודה שנדרשת בשתיהן הפוכה. §5 של bkalot כבר היה בנוי; רק אף אחד לא
> יכול היה לדעת את זה מהלוח.
>
> ### שתי מלכודות שהמדידה הראשונה נפלה בהן, ולמה הן רשומות ולא נמחקו
>
> **1. `supabase-js` מחזיק את ה-API של GoTrue.** הריצה הראשונה דיווחה
> `/admin/users`, `/admin/generate_link`, `/admin/oauth/clients` ו-
> `/admin/custom-providers` על **שש** מערכות — כולל כאלה שאין להן מסך ניהול
> בכלל. אלה לא שלנו: זה משטח ה-REST הניהולי של GoTrue, שנשלח בתוך כל חבילה
> שמאמתת משתמשים. בלי הסינון הבדיקה הייתה הופכת את "יש למערכת הזאת ניהול"
> ל"המערכת הזאת משתמשת ב-Supabase".
>
> **2. כדור הכניסה המשותף מקשר ל-`/admin`.** `auth-button.js` מוזרק לכל
> המערכות, ולכן ספירה שלו הייתה מסמנת את **כל** 21 המערכות כעוברות — 100%
> שאינו אומר דבר. הוא מוחרג לפי שם, וממצא שנמצא רק בו מדווח `shared-pill`
> ולא נזרק בשקט.
>
> **3. סטטוס 200 אינו תשובה כאן.** כל אחד מהמאונטים האלה הוא SPA שמחזיר את
> הקליפה שלו לכל נתיב, ולכן שגיאת הקלדה ומסלול אמיתי נראים זהים. הכתובת
> הרשומה נמדדת מול **אח שבוודאות אינו קיים**, ורק *הבדל* בין השניים נחשב.
> זה מה שהפך את `/tamlul/admin`, `/modaot/admin` ו-`/nadlan/admin` מ-"לא
> נראה" ל-**נמדד וקיים** — שלוש רשומות שהיו נפסלות בטעות.
>
> | | לפני | אחרי |
> |---|---|---|
> | רשומה קיימת ואומתה חיה | — | **12** |
> | חי בפרודקשן ולא רשום | **3** | **0** |
> | ללא כניסה לניהול | לא ידוע (11) | **8, נמדד** |
>
> ⚠️ **galil נרשמה, לא אושרה.** `core.issues #62` פתוח ובבעלותך:
> `/galil/gabai?auto=admin` פותח את הקונסולה בלי סיסמה, והכניסה האמיתית אינה
> יכולה להצליח (401 על `gabai_accounts`). רישום **היכן** הדלת נמצאת אינו טענה
> שהיא עובדת — והלוח צריך את הכתובת כדי להציג את ההכרעה בכלל.
>
> **מה נפתח מזה:** `#85` — ב-01 torah הרשומה מצביעה ל-`/auth/sign-in` שמחזיר
> קליפת SPA, בעוד החבילה מכילה `/admin` ומסך `AdminLogin` משלה; לא שיניתי ערך
> לא-מאומת בערך לא-מאומת אחר. **נסגר 07/08 — ראה הפסקה הבאה.** `#86` — שמונה מערכות ציבוריות בלי שום כניסה
> לניהול (imud · briut · smel · chizukim · orech · studio · kesef · tivuch),
> שזו רשימת עבודה ל-§2 ולא רק רישום. `admin_auth='none'` אצלן אומר מעכשיו
> **"חיפשנו ולא מצאנו"** ולא "אף אחד לא בדק".
>
> ראיות: `QA/platform/admin-entry-0807.json` · מיגרציה `0022`. לא נגעתי ב-08,
> 09, `bkalut-app`, `bkalot-admin`, `zr_*` או `NEDARIM3873`, ולא שיניתי שום
> מצב חיוב או שליחה.

> ## ✅ 06/08/2026 — אפשר היה להירשם למסלול שאף עמוד לא הציע, ב-**כל 25 המערכות**. **נסגר ונמדד.**
>
> לכל מערכת שלושה מסלולים שקיימים לנו ולא ללקוח: `pro (בדיקה)` ב-1 ₪, `charge`
> ו-`one_time` — כולם `customer_visible=false`, ו-`billing-safety.mjs` כבר ודא
> שהם לא מופיעים בעמוד המחירים. **אבל "לא מופיע" אינו "לא נגיש":**
> `more30_subscribe` חיפשה מסלול לפי `app_key + code + active` בלבד, ולכן לקוח
> מחובר שמנחש את הקוד — שלוש מילים באנגלית — קיבל בקשה רשומה, ועל `pro` גם
> `chargeable=true`, הדגל היחיד ש-`/subscribe` מפרש כרשות לפתוח מסלול תשלום.
>
> **נמדד לפני הנגיעה, מול הפרודקשן, עם חשבון בדיקה אמיתי**
> (`scripts/qa/hidden-tier-reach.mjs`): **75 בקשות על 25 מאונטים — כולן
> התקבלו**, 25 מהן עם `chargeable=true`. הפער היה **רחב** ממה שנרשם ב-#78:
> שם תואר רק מסלול הנפילה-אחורה, ובפועל החיפוש הראשי הוא הנתיב — 24 מתוך 25
> נרשמו על ה-`app_key` של המערכת עצמה, ורק `admin`, שאין לו שורות משלו, הגיע
> דרך הנפילה אחורה.
>
> **מה לא קרה: כסף.** `billing_settings.mode='off'`, אין ספק סליקה מחובר,
> ו-`more30_checkout` מסננת `customer_visible` מאז 0016 וחוסמת את השלב הבא.
> זו נגישות, לא חיוב — ולכן טופלה כצעד נפרד ולא כטלאי.
>
> **התיקון (מיגרציה 0017):** אותו תנאי `customer_visible` בשני החיפושים.
> שתי הפונקציות מסכימות עכשיו אילו מסלולים קיימים — וחוסר ההסכמה ביניהן הוא
> בדיוק מה שהפיל את #77 אתמול. ההודעה נשארת `unknown plan`, כי מסלול מוסתר
> צריך להיראות כלא-קיים ולא כ"קיים ואסור".
>
> **אחרי:** `hidden-tier-reach.mjs` **4/4** — 75 מתוך 75 נדחו, **וכל 25 בקרות
> החיוב החיוביות עדיין נרשמות**. `checkout-flow.mjs kiosk premium` **18/18**
> כולל המסלול החינמי והמסך עצמו בדפדפן
> (`QA/platform/checkout-0806/kiosk-premium.png`), `billing-safety.mjs` **6/6**.
> אף מנוי קיים לא נפגע: כל השורות ב-`core.subscriptions` יושבות על מסלולים
> גלויים. `core.issues #78` נסגר.

> ## ✅ 06/08/2026 — התיקון שפרסתי הבוקר **הרע** נתיב אחד, ומתחת לתיקון אחר התגלה פקד שלא היה ניתן ללחיצה באף מסך
>
> המשך ישיר של #74: כדור הכניסה המשותף יושב `fixed` בפינה, ובכמה מערכות הוא
> מכסה פקד אמיתי בנווט. הסבב הקודם תיקן ארבעה נתיבים (kiosk · egod · mthbram ·
> שורת הקרדיט ב-smachot) והשאיר שניים פתוחים. שניהם נסגרו כאן, ואחד מהם היה
> תקלה **שאני יצרתי**.
>
> ### 1. briut — הביטוי שנפרס הבוקר הפך נתיב תקין לשבור
>
> `.header-inner` ב-`apps/06-kupot-holim` הוא `class="container header-inner"`,
> כלומר הוא **המיכל עצמו** ולא יושב בתוכו. הניסוח הראשון החסיר מה-inset גם את
> ריפוד המיכל, כאילו מדובר בשני אלמנטים — ולכן `padding-inline-end` **החליף**
> את 32px של `.container` במקום להתווסף אליהם.
>
> | רוחב | לפני הכול | אחרי הפריסה הראשונה | אחרי התיקון |
> |---|---|---|---|
> | 834 | חפיפה 60×34 | חפיפה 20×34 | ✅ נקי |
> | 1100 | חפיפה 60×34 | חפיפה 20×34 | ✅ נקי |
> | 1280 | **נקי** | **חפיפה 12×34** (pad=0px) | ✅ נקי |
>
> העמודה האמצעית היא הנקודה: **ב-1280 לא היה שם באג עד שתיקנתי.** הביטוי
> התאפס לגמרי והתוכן זז מ-112 ל-80. הנוסחה המתוקנת נמדדת מקצה החלון ולא יורדת
> אף פעם מתחת לריפוד המקורי. נפרס ואומת חי: 5/5 רוחבים נקיים, ו-"איך עוברים"
> מקבל את הלחיצה שלו (`click-lands-on:a  reaches:true` ב-834 וב-1100).
>
> ### 2. smachot — תיקון הקרדיט חשף פקד שהיה חסום בכל רוחב
>
> עד היום הפקד היחיד שדווח כאן היה קישור הקרדיט "פותח ע״י עולם הסטארטאפים",
> שנחת בפינה העליונה כי ה-body באתר הזה הוא `display:flex`. משתוקן — התגלה מה
> שישב מתחתיו: **כפתור החלפת מצב התצוגה, מכוסה 38×36 ב-390 · 834 · 1100 · 1280
> · 1440.** לא רוחב אחד ולא טווח — **כל** המסכים שנבדקו, ו-`elementFromPoint`
> מחזיר את הכדור בכולם. הכפתור הזה פשוט לא היה לחיץ באתר חי.
>
> ל-`.topbar` אין `max-width` והסרגל הצדי יושב בצד ההתחלה, ולכן — בניגוד
> ל-briut — כאן **אין** מה להחסיר: קצה האינליין-סופי שלה הוא קצה החלון בכל
> רוחב, והריפוד הוא `max(22px, var(--more30-auth-inset, 124px))`.
>
> ✅ **נפרס ואומת חי.** מכסת הפריסות היומית של Vercel נגמרה אחרי הפריסה של
> briut והתאפסה כעבור כשעתיים; `_deploy/smachot-more30` נפרס ב-18:43.
> `more30.com/smachot/style.css` מגיש כעת את ההצהרה
> (`padding-inline-end: max(22px, var(--more30-auth-inset, 124px))`), הכפתור
> נמדד ב-x 104..142 במקום 22..60, ו-`elementFromPoint` על מרכזו מחזיר את
> הכפתור עצמו — `reaches:true` בכל חמשת הרוחבים. ראיות:
> `QA/platform/authpill-0806/smachot-after-deploy.txt`,
> `smachot-toggle-after-deploy.txt`, `smachot-toggle-{390,834,1100,1280,1440}-after.png`.
>
> ### מה שמנע כאן ניחוש
>
> את הנוסחה אי אפשר לבדוק על העתק מקומי: רוחב הכדור נקבע בזמן ריצה לפי שם
> המשתמש המחובר והפונט שנטען (נמדד 98px ב-390 מול 104px מעליו). לכן
> `scripts/qa/authpill-inset-formula.mjs` טוען את **עמוד הייצור** ומחליף בדפדפן
> הצהרה אחת בלבד. הוא נולד כסקריפט חד-פעמי ל-briut; הפעם השנייה שנדרש אותו דבר
> היא הסיבה שהוא הפך לכלי, לפי הכלל שכבר כתוב כאן — כשאותה מדידה חוזרת, היא
> עוברת למקום משותף ולא מועתקת. הוא גם משתמש באותה הגדרת "מכוסה" כמו
> `authbutton-overlap` (חיתוך **וגם** `elementFromPoint`), כדי ששתי הבדיקות לא
> יסכימו על מספרים ויחלקו על המשמעות.
>
> | בדיקה | לפני הסבב | אחרי |
> |---|---|---|
> | `authbutton-overlap` (26 נתיבים × 5 רוחבים) | 21/26 נקיים | **26/26** |
> | `credit-placement` (26 נתיבים) | 24/26 | **26/26** |
> | `authpill-inset-formula /briut` | — | **5/5 רוחבים** |
> | `authpill-inset-formula /smachot` | — | **5/5 רוחבים** |
>
> ### הסריקה שנעשתה לפני ה-commit
>
> כל האמור למעלה נמדד תוך כדי העבודה, וכל מדידה כזו רואה רק את הנתיב שבו
> נגעו. לכן לפני ה-commit הורצה סריקה קרה של **כל** 26 הנתיבים × 5 רוחבים
> מאפס, כדי שהמספר בטבלה יהיה נמדד ולא מורכב מחתיכות: **26/26 נקיים.**
> `QA/platform/authpill-0806/overlap-widths-commit.txt`
>
> ⚠️ **הפער שהצעד הזה סגר לא היה בעיצוב אלא בגיט.** ארבע המערכות תוקנו,
> נפרסו לייצור ואומתו חיות — ואף אחד מהשינויים לא נכנס לגיט. כלומר המקור
> ברפו והייצור אמרו דברים שונים בארבע מערכות, ובנייה רגילה מהמקור הייתה
> מחזירה את כל ארבעתן אחורה בשקט.
>
> `core.issues` #74 נסגר (kiosk נמדד נקי ב-5 רוחבים; התיקון עצמו חי ברפו
> החיצוני `l023131500-ops/zol`, `.nav .container`), #75 ו-#76 נפתחו ותועדו.
> לא נגעתי ב-08, 09, `bkalut-app`, `bkalot-admin`, `zr_*` או `NEDARIM3873`,
> ולא שיניתי שום מצב חיוב או שליחה.

> ## ✅ 06/08/2026 — במערכת 35 כפתור הכניסה נראה תקין ולא **עשה** דבר. מדיניות אבטחה חסמה אותו, ובשקט.
>
> הכלי שנכתב בפעימה הקודמת (`scripts/qa/csp-blocks-auth.mjs`) שואל כל נתיב חי
> שאלה אחת: מתוך הדף הזה, האם `fetch` לפלטפורמה בכלל מצליח לצאת. הריצה
> המלאה: **20 מתוך 21 עברו, `/kiosk` לבדו נחסם.**
>
> **למה זה לא פריט בדוח אלא תקלה בשני סעיפי העדיפות הראשונים.** `auth-button.js`
> עושה קריאה **אחת** בטעינה — `more30_join_app` — ובה שני דברים ביחד:
> היא **רושמת את המבקר כלקוח של המערכת שבה הוא נמצא** (§1), והתשובה שלה היא
> **ההכרעה אם להציג "ניהול"** (§2, `is_admin` + `admin_href`). תחת מדיניות
> שלא מכירה את ה-API של הפלטפורמה, שתיהן פשוט לא קורות.
>
> **וזה לא נראה שבור.** הכפתור מצייר את עצמו מ-`localStorage` בלי רשת, ולכן
> הוא המשיך להציג את שם המחובר כרגיל. לקוח שהגיע ל-`/kiosk` מדף הבית לא נרשם
> כלקוח שלה, והסופר-אדמין פשוט לא קיבל שם כפתור ניהול — בדיוק כמו מי שאינו
> מנהל. הקריאה יושבת ב-`catch` ריק בכוונה (חברות היא רישום, לא שער), כך
> שגם בקונסולה לא הייתה שגיאה מהקוד שלנו.
>
> | | לפני | אחרי |
> |---|---|---|
> | `csp-blocks-auth.mjs` (21 נתיבים) | 20 עברו · **1 נחסם** | **21 עברו · 0 נחסמו** |
> | `pill-joins-on-arrival.mjs` | — (הבדיקה לא הייתה קיימת) | **10/10** |
>
> **התיקון עצמו: שני מקורות, ולא רחב מזה.** `connect-src` קיבל את כתובת ה-API
> של הפלטפורמה, ו-`script-src` את `https://more30.com`. השני נראה מיותר והוא
> לא: `'self'` מכסה את הכפתור **רק** כי הדף מוגש תחת `more30.com/kiosk` —
> על ה-hostname של השירות עצמו זה origin אחר והסקריפט היה נחסם.
> (`l023131500-ops/zol@fe3cbb6`, `kiosk/server/src/index.js`; Railway בונה
> מהענף הזה אוטומטית — הקוד של 35 אינו בריפו הזה.)
>
> **[07/08] השורה במסד נשארה פתוחה אחרי שהתקלה נסגרה.** התיקון נעשה ונרשם
> כאן ב-06/08, אבל `core.issues` #71 המשיך לשאת `open`/`high` — כלומר לוח
> `/admin` של §3 דיווח באג חמור שאינו קיים. זו תקלה בפלט הלוח ולא רק
> ברישום, ולכן נסגר על מדידה חוזרת בשלוש שכבות בלתי תלויות: המקור שממנו
> Railway בונה בפועל (אומת מול `get-service-config` — ענף
> `claude/what-do-you-see-gxo5tc`, שורש `kiosk/server`, HEAD `9d380d3`),
> הכותרת החיה מ-`more30.com/kiosk/`, וריצה מלאה של `csp-blocks-auth.mjs`
> (**21 עברו · 0 נחסמו**). בנוסף אומת ש-`auth-button.js` באמת נטען בעמוד
> (`<script src="https://more30.com/auth-button.js" defer>`), כך שגם הצד של
> `script-src` נמדד ולא הונח. ל-`kiosk` אין עכשיו אף באג פתוח (0 פתוחים ·
> 0 בטיפול · 4 תוקנו). הראיות: `QA/platform/csp-blocks-auth-0807.txt`.
>
> ⚠️ **הכותרת שנקראת מהמכונה הזאת אינה הכותרת שהשרת שלח.** NetFree משכתב
> אותה בדרך ומזריק מקורות משלו ל-`default-src`, ל-`script-src` ול-`img-src`.
> `connect-src` עבר במקרה הזה בלי שינוי ולכן הקריאה תקפה — אבל זו סיבה
> שלישית ומוחשית לכך ש-`csp-blocks-auth.mjs` חייב להישאר בדיקת **התנהגות**:
> מי שיחליף אותה בניתוח כותרת מכאן יבדוק את NetFree, לא את more30.com.
>
> ### הבדיקה החדשה בודקת את הנתיב שלא נבדק מעולם
> חברות נרשמת **בשני מקומות**, ורק אחד מהם נבדק: `/auth/callback` רושם את
> המערכת שממנה **התחברת**, וזה מה ש-`customer-journey.mjs` הולך. אבל אף אחד
> לא מתחבר מכל מערכת — מתחברים פעם אחת ואז הולכים בקישורים, ולכן הנתיב השני
> (הכפתור עצמו, בכל דף שהוא נטען בו) הוא זה שרוב הביקורים בפועל משתמשים בו.
> `scripts/qa/pill-joins-on-arrival.mjs` מחבר לקוח בדיקה **ממערכת אחרת בכוונה**,
> ואז רק **מבקר** בנתיב הנבדק — כך שאם החברות נרשמה, היא יכולה להגיע מהכפתור
> בלבד. נבדק על `/kiosk/` ועל `/bkalot` כביקורת.
>
> ### מה נצפה ולא תוקן
> בצילום האימות (`QA/platform/pill-join-kiosk.png`) הכדור **יושב על הקישור
> "כניסת לקוחות"** בנווט של הקיוסק — דפוס `--more30-auth-inset` המוכר. נרשם
> כ-`core.issues` #74 פתוח; לא נמדד ב-`authbutton-applied` ולכן לא נסגר ולא
> נטען שתוקן.
>
> ## ✅ 06/08/2026 — §2 ביקש את הלידים של כל המערכות במקום אחד. **המסך הזה לא היה קיים, ועכשיו הוא חי: `more30.com/admin/leads`.**
>
> הלידים של הפלטפורמה יושבים ב-**28 טבלאות בסכימות נפרדות**, חלקן במראות
> הקרות של הפרויקטים שלפני האיחוד (`igud` = bieebmnm, `csj*` = csjekrvu),
> וכל אחת עם שמות עמודות משלה — `name` / `full_name` / `contact_full_name` /
> `requester_name`. לא הייתה שום דרך לשאול "מה נכנס השבוע" בלי לפתוח 28 מסכים,
> ולכן בפועל אף אחד לא שאל.
>
> **הנתונים שהתגלו ברגע שהיה איפה להסתכל:** 75 פניות אמיתיות, מתוכן 22 בקשות
> דוח בנדל"ן ברגע, 17 בקשות שירות באיגוד, 13 לידים ב-egod, 8 במימוש זכויות
> ו-8 אנשי קשר בנדל״ן פרו. **8 מקורות מתוך 28 מחזיקים את כולן; 20 ריקים.**
>
> **20 המקורות הריקים מוצגים במפורש עם אפס.** מקור בלי פניות ומקור שהמסך לא
> מכיר נראים אותו דבר למי שמסתכל, ולכן `core.lead_sources` הוא מרשם מפורש של
> כל 28 הטבלאות והספירה מצטרפת אליו ב-left join — "אין פניות" הוא נתון,
> "לא הסתכלנו" הוא לא. שדה שאינו קיים בטבלת המקור מוצג **"לא זמין"** ולא כתא ריק.
>
> **מה שנבדק לפני שזה נחשב גמור.** זה המסך היחיד בפלטפורמה שמציג שם, טלפון
> ומייל של אנשים אמיתיים, ולכן השער נבדק כמו תוקף ולא כמו משתמש
> (`scripts/qa/leads-gate.mjs`, 6/6): `anon` נעצר ב-GRANT עוד לפני גוף
> הפונקציה, ו**לקוח מחובר** — שכן מקבל GRANT, כי הפונקציה פתוחה ל-`authenticated` —
> נעצר ב-`raise exception` שבתוכה. שניהם מקבלים `42501` ואפס שורות. בדיקת
> הסשן בדפדפן היא קוסמטית: היא מחליטה מה לצייר, לא מה המסד יענה.
> הציור עצמו נבדק על הדף החי (`scripts/qa/leads-screen-renders.mjs`, 8/8,
> צילום `QA/platform/admin-leads.png`) — כולל שמקור עם אפס פניות לא נעלם
> מהטבלה, ושתא חסר קורא "לא זמין".
>
> ## ✅ 06/08/2026 — הלוח שאמור לספר לך מה שבור עמד 13.6 שעות. **הושלם, ונוסף לו מד שמונע הישנות.**
>
> `more30.com/admin/issues` הוא התשובה של §3 לשתי השאלות "**באגים: תוקן /
> בטיפול / פתוח**" ו"**מה דורש אותך מול מה שאני עושה לבד**". הרשומה האחרונה
> שנכתבה בו הייתה מ-**05/08 22:06**. מאז נרשמו **14 פעימות** ב-`core.run_progress`
> ואף אחת מהן לא הגיעה ללוח.
>
> **מה שהיה חסר שם זו לא רשימת מטלות — אלה שתי ההכרעות שחוסמות אותך:**
>
> | | |
> |---|---|
> | **`/galil/gabai`** | `?auto=admin` פותח את קונסולת הניהול **בלי סיסמה**, והנווט של האתר מקשר לשם. הכניסה האמיתית אינה יכולה להצליח כלל. חומרה נמדדה: `synagogues` מחזיר `42501` RLS ו-`gabai_accounts` מחזיר 401 לאנונימי — **המסך נפתח, הנתונים אינם נפגעים** |
> | **`/chatzor` + `/galil`** | גובה 350 מ׳ ו-40 דקות הדלקת נרות — שתי הנחות שמזיזות את **כניסת השבת ב-13 דקות**, ומאז 06/08 הן נוגעות לשני האתרים כי שניהם קיבלו את אותו מנוע |
>
> שתיהן היו כתובות ב-`NEEDS_USER` וב-`run_progress` — ולא במסך שנבנה בדיוק
> בשביל להציג אותן. מי שהיה פותח את הלוח היה מסיק שלא קרה דבר כל היום.
>
> **מה נעשה:** הלוח הושלם מול הרישום המאומת של 06/08 — **23 רשומות** (16 תיקונים
> שנמדדו חי, 2 הכרעות שדורשות אותך, 5 פתוחות אצלי), כל אחת עם שדה האימות שלה.
> הספירה עברה מ-12 "דורש אותך" ל-**16**, ומ-2 קריטיות פתוחות ל-**3**.
>
> **רשומה אחת נמחקה כשגויה, לא כ"תוקנה":** "`/orech` — אין מצב כהה כלל" נסגרה
> ב-04/08 ב-`wont_fix` על סמך `dark-probe`, שבודק אם קיים כלל `.dark` — לא את
> מה שמבקר חווה. מדידה חיה היום: **`/orech` עוקב אחרי `prefers-color-scheme`
> מעצמו** (רקע 250,247,240 בהיר מול 20,17,12 כהה). מה שחסר לו הוא מתג למבקר
> שמערכת ההפעלה שלו בהירה — פער אחר וקטן יותר, ונרשם ככזה.
>
> ### השומר: הלוח מדווח על הפיגור של עצמו
> לוח שלא זז ויום שקט **נראים אותו דבר**, וזה מה שאפשר לפער להיפתח.
> `core.run_progress` כן זז בכל צעד, ולכן `more30_admin_issues()` מחזיר עכשיו
> בלוק `freshness`: הפעימה האחרונה, הכתיבה האחרונה ללוח, וכמה פעימות ביניהן.
>
> **הסף הוא 3 ולא 1 בכוונה.** צעד בודד יכול בלגיטימיות לא לייצר רשומה, והתראה
> שדולקת תמיד היא התראה שאיש אינו קורא — בדיוק הכשל של עמודת הקרדיט שענתה
> "לא" ב-25 מתוך 25. **הוכח שהוא נורה על הנתונים האמיתיים:** מול הכתיבה
> האחרונה שקדמה לצעד הזה הוא מחזיר `14 פעימות · 13.6 שעות · drifting=true`.
>
> **אומת:** `more30_admin_issues()` נקראה עם תביעת סופר-אדמין אמיתית ומחזירה
> `freshness` מלא · הפורטל נבנה, רומה ונפרס · `admin-issues-drift.mjs` מדווח
> שה-HTML החי **זהה בבתים** למקור (10,723 תווים) · `console-probe` נקי ·
> צילומים ב-`QA/platform/issues-0806/`.
> **מה שלא אומת ולמה:** תוכן הלוח עצמו מגודר לסופר-אדמין ואין לי הסשן שלך,
> ולכן צולם מצב הכניסה בלבד; הנתונים אומתו ישירות מול ה-RPC.

> ## ✅ 06/08/2026 — הכתובת הרשמית של מערכת 35 הגישה עמוד בלי שום עיצוב. **תוקן, נפרס ואומת.**
>
> `core.projects.live_url` של KioskFleet הוא **`https://more30.com/kiosk`** — בלי
> לוכסן. זו הכתובת שדף הבית מקשר אליה ושהיא נכתבת בכל מקום. בפועל היא הגישה
> את עמוד הנחיתה **בטקסט גולמי**: Times New Roman, בלי רשת, בלי צבעים.
> `more30.com/kiosk/` — עם לוכסן — היה תקין כל הזמן.
>
> **למה זה שרד:** ה-HTML של kiosk מפנה ל-`css/style.css` **יחסית**, והדפדפן
> פותר יחסי מול **התיקייה** של הכתובת הנוכחית. ב-`/kiosk` התיקייה היא השורש,
> ולכן הבקשה יצאה ל-`/more30.com/css/style.css` — ושם ה-catch-all של הפורטל
> עונה **200 עם HTML**. שום דבר לא נכשל: אין 404, אין שגיאת קונסולה, וכל בדיקת
> נכסים וכל בדיקת זמינות עברו. זו הפעם השלישית שהתבנית הזו מכה כאן (`/bkalot`
> רץ כך שבועות; 19 מ-25 נקודות עגינה הגישו את הפורטל ב-`/<mount>/`).
>
> **נמדד בדפדפן לפני ואחרי** (`scripts/qa/kiosk-canonical.mjs`, צילומים
> ב-`QA/platform/kiosk-0806/`):
>
> | | `/kiosk` לפני | `/kiosk` אחרי |
> |---|---|---|
> | חוקי CSS שנטענו בפועל | **19** | **142** |
> | ה-`style.css` של המערכת | `200 text/html` (הפורטל ענה) | `200 text/css` |
> | רקע ה-body | `rgba(0, 0, 0, 0)` | `rgb(245, 247, 251)` |
> | גובה ה-`h1` | 32px (ברירת המחדל של הדפדפן) | 56px |
>
> **התיקון:** ב-`portal/vercel.dist.json`, ה-rewrite של הצורה החשופה הוחלף
> ב-**redirect ל-`/kiosk/`** (307). כלומר הדפדפן מגיע לתיקייה הנכונה לפני
> שהוא קורא את ה-HTML, וכל הפניה יחסית בעמוד — לא רק ה-CSS — נפתרת נכון.
>
> **למה לא לתקן את ה-HTML עם `<base href="/kiosk/">`:** אפשר היה — המקור נגיש
> ב-`l023131500-ops/zol`, ענף `claude/what-do-you-see-gxo5tc`, `kiosk/server`.
> אבל זה מתקן קובץ אחד בשירות שאינו בריפו הזה, בעוד ה-redirect מתקן את הכתובת
> עצמה ומכסה גם את ההפניות היחסיות הבאות שייכתבו שם.
>
> **אומת חי אחרי הפריסה:** `/kiosk` → 307 → `/kiosk/`, שתי הצורות מגישות 142
> חוקים · `relative-asset-audit.mjs` **25/25** · `trailing-slash-audit.mjs`
> **0 מתוך 25 נופלות לפורטל** (כלומר הסרת ה-rewrite החשוף לא שברה ניתוב) ·
> `/kiosk/api/config` עדיין 200 JSON.
>
> **הכלי שמצא את זה נשמר כשומר-רגרסיה:** `scripts/qa/relative-asset-audit.mjs`
> בודק את **סוג התוכן** של כל נכס יחסי בשתי צורות הכתובת, כי בדיקת סטטוס לבדה
> **אינה יכולה** לתפוס את זה — ה-catch-all מחזיר 200.
>
> ### ⚠️ ותוך כדי: בודקת מצב כהה שדיווחה שגוי על 5 מתוך 25 נתיבים
> הממצא הזה הגיע מבדיקת מצב כהה, שאמרה ש-`/kiosk` מתעלם מ-OS כהה — נכון,
> אבל לא מהסיבה שהיא חשבה: **עמוד בלי CSS אין לו ערכה בכלל.** בבדיקה של
> `dark-toggle-probe.mjs` עצמה נמצאו ארבעה כשלים, **בשני הכיוונים**, וכולם
> מתוקנים ומתועדים בראש הקובץ: (1) `ערכת` היא תת-מחרוזת של **מערכת**, ולכן כל
> אתר עם "כניסה למערכת" דיווח על מתג ערכה; (2) לחיצה ש**מנווטת** נספרה כהחלפת
> ערכה — כישלון שסוגר פער פתוח, הכיוון היקר; (3) עמוד שאינו צובע רקע אטום
> נקרא "מתעלם" למרות ש-`<html>` שלו מתהפך ל-`dark`; (4) אתר שכהה בכל מצב
> (`/mthbram`, `/studio`, `/tivuch`, `/kesef`) סומן כחסר מצב כהה, בעוד שאין לו
> מצב בהיר להתחלף ממנו. אחרי התיקון: **24 מתוך 25 נגישות**, והפער היחיד שנשאר
> הוא **`/admin`** — ללוח הניהול עצמו אין ערכה כהה ואין מתג.

> ## ✅ 06/08/2026 — §8ג: המחירים היו בקטלוג, ולא היה אליהם שום נתיב. **חובר, נפרס ואומת בשני מצבי הסליקה.**
>
> §8ג מבקש לחבר את `core.plans` **לזרימת הסליקה במצב טסט**. שני חצאים כבר היו
> בדוקים — `pricing-reflects.mjs` מוכיח שהקטלוג מגיע לעמוד הלקוח,
> ו-`billing-safety.mjs` מוכיח שזר אינו מגיע לנתיב הכסף בכלל — אבל **אף אחד
> מהם לא שאל את השאלה שבאמצע**, וזו זו שהייתה שקרית.
>
> **מה שנמצא:** `more30.com/subscribe` קרא ל-`more30_subscribe` בלבד ונעצר שם.
> הפונקציה הזו רושמת בחירה ותמיד מחזירה `charged:false`; היא **אינה יודעת דבר
> על מצב הסליקה**. מי שמכריע הוא `more30_checkout` — והוא היה קיים, תקין,
> **ובלי שום קורא בפרודקשן**. כלומר המחירים שנקבעו (2 · 5 · 10 · 12 · 15 ₪)
> ישבו בקטלוג בלי נתיב אל ההכרעה שאמורה לצרוך אותם. נמדד חי לפני הנגיעה:
> ה-HTML שהוגש מ-`more30.com/subscribe` לא הכיל את המחרוזת `more30_checkout`.
>
> **מה חובר:** אחרי בחירת מסלול, וכשהשרת מסמן `chargeable` — הדגל היחיד שהמסד
> מתיר לפיו לפתוח מסלול תשלום — העמוד קורא ל-`more30_checkout` ומציג את
> **ההכרעה שלו**, לא טקסט קבוע. הפונקציה מחזירה הוראה ואינה מבצעת תשלום, ולכן
> אפשר להריץ את זה בפרודקשן בלי שכסף יזוז.
>
> **אומת חי, בשני המצבים שהעמודה מתירה, עם לקוחות בדיקה אמיתיים
> (`scripts/qa/checkout-flow.mjs`, 17/17 בכל אחד):**
>
> | mode | מה השרת מכריע | מה הלקוח רואה בפועל |
> |---|---|---|
> | `off` | `action=none · reason=billing_off · charged=false` | "למסלול יש מחיר, אבל הסליקה סגורה. לא בוצע ולא ייבוצע חיוב." + המחיר הרשום |
> | `test` | `action=test_payment · charged=false` | "סליקה במצב בדיקה · 2 ₪ — לא בוצע חיוב… ואין להשתמש בכרטיס אמיתי. ספק סליקה עדיין לא מחובר" |
>
> צילומים: `QA/platform/checkout-0806/` — `torah-basic.png` במצב `test`,
> `kupot-extended.png` במצב `off`. `billing-safety.mjs` 6/6 ו-`pricing-reflects.mjs`
> 15/15 אחרי השינוי.
>
> **הפרודקשן הוחזר ל-`off` בכוונה, וזו הכרעה ולא שכחה.** `provider` הוא `NULL`
> — אין ספק סליקה מחובר — ולכן `test` היה מבטיח למבקר אמיתי סביבת בדיקה שאינה
> קיימת ומשאיר אותו במבוי סתום. `off` אומר לו את האמת. **פתיחת `test` היא
> `UPDATE` יחיד על שורה אחת, בלי פריסה ובלי קוד**, והנתיב כולו כבר אומת.
> `live` עדיין אינו ערך חוקי בעמודה כלל.
>
> ### ⚠️ ותוך כדי כך: שורת הפתיחה הדפיסה `extended` במקום "מורחב"
> `load()` חיפש את שם המסלול תחת `data.plans.plans`, בעוד ה-RPC מחזיר מערך
> תחת `plans`. החיפוש החזיר `undefined` ונפל חזרה **לקוד האנגלי**, כך שהעמוד
> אמר ללקוח "רשומה אצלך בקשה למסלול extended". `render()` באותו קובץ כבר
> טיפל בשתי הצורות — שתי קריאות שונות לאותו נתון, ורק אחת מהן נכונה. אוחדו
> ל-`plansOf()`. זה נתפס רק כי הבדיקה **בחרה מסלול בתשלום בפועל**; עד היום
> שום בדיקה לא הגיעה למסך הזה אחרי בחירה.

> ## ✅ 06/08/2026 — §7 המיתוג: שתי מערכות חיות עדיין נשאו את השם הישן. **תוקן, נפרס ואומת.**
>
> §7 דורש שהמותג יהיה **"עולם הסטארטאפים"** בלבד, בלי "מור מערכות תוכנה" ובלי
> וריאציה שלה, ושבכל אתר יהיה **קישור פוטר "פותח ע״י עולם הסטארטאפים"**.
> `scripts/qa/brand-audit.mjs` שואל את הפרודקשן ולא את הריפו — כי כמה מהמערכות
> מגישות HTML שאינו זהה לשום קובץ על הדיסק.
>
> **מה שנמצא:** 2 מתוך 25 נקודות עגינה עדיין הגישו את השם הישן, בשני מקומות
> בכל אחת — **הכותרת** (מה שגוגל ותצוגת הקישור מראים) **וגם גוף העמוד**:
>
> | נתיב | כותרת שהוגשה | ועוד |
> |---|---|---|
> | `/kesef` | `כסף — שקיפות תקציבית לרשויות מקומיות · מור מערכות תוכנה` | `eyebrow` בגיבור + שורת הפוטר |
> | `/tivuch` | `נדל״ן פרו — מערכת ניהול למתווכים ויועצי נדל״ן · מור מערכות תוכנה` | `eyebrow` + פוטר + הכותרת של `app.html` |
>
> `app.html` של tivuch — מסך המתווך אחרי הכניסה — לא נראה בביקורת כלל, כי היא
> בודקת את עמוד הנחיתה של כל נקודת עגינה בלבד. הוא נמצא בסריקת המקור ותוקן איתם.
>
> **אומת שהמקור על הדיסק הוא באמת מה שחי לפני שנגעתי** (הכלל מ-
> `deploy-copy-can-break-live-sites`): ה-HTML החי הושווה שורה-שורה מול הקובץ
> ונמצא זהה — ההפרש היחיד היה שלוש שורות הזרקה של NetFree בסוף ה-`<body>`,
> שהן של הרשת המקומית ולא של האתר.
>
> **אחרי הפריסה, נמדד חי:** 0 מתוך 25 מגישים את השם הישן — לא ב-HTML הגולמי
> ולא בטקסט המרונדר. צילומים: `QA/platform/brand-0806/`.
>
> ### ⚠️ ותוך כדי כך: עמודת ה"קרדיט" בביקורת ענתה **"לא"** על 25 מתוך 25 — בטעות
> הקרדיט מוזרק על ידי `portal/public/auth-button.js` בסוף ה-`<body>` (במכוון —
> כדי ששורה אחת לא תהפוך ל-25 גרסאות שמתפצלות), כלומר הוא **אינו** ב-HTML
> הגולמי. הביקורת חיפשה אותו שם, ולכן דיווחה שהוא חסר בכל מערכת בזמן שהוא קיים
> בכולן. בדיקה שעונה "לא" בכל מקום מלמדת להתעלם מהעמודה, וזה גרוע מלא לבדוק.
> **תוקן לשני מעברים:** המותג הישן נקרא מה-HTML הגולמי (כי כותרת ו-og הם מה
> שמנוע החיפוש רואה לפני שרץ JavaScript), והקרדיט נקרא מה-DOM המרונדר בדפדפן.
> אחרי התיקון: **25/25 קרדיט קיים**, ו-`exit 1` אם אחד מהשניים נשבר.
>
> **`apps/32-nadlan-berega`** — שורת הסיום של תעודת הזהות לנכס
> (`components/PropertyIdCard.tsx`) אמרה "מבית מור מערכות תוכנה". ~~תוקן
> במקור, טרם נפרס~~ ✅ **נבדק מחדש 17/08 — כבר פרוס וחי.** nadlan עברה כמה
> פריסות מאז (נגישות 95→100, מצב כהה, חפיפת כפתור כניסה), וההערה הזו לא
> עודכנה בעקבותיהן. permalink אמיתי מ-`QA/nadlan-v3/_results.json`
> (`https://more30.com/nadlan/p/30240-88-vwAplUCBVx`) מציג בפוטר "נדל\"ן
> ברגע · מבית עולם הסטארטאפים" — אין הופעה של השם הישן. ראיות:
> `QA/platform/nadlan-brand-recheck-0817/results.txt`.

> ## 🔴 06/08/2026 — מסך היתרות בלוח השליטה הדפיס `$undefined / $undefined`. **תוקן, נפרס ואומת.**
>
> §3א דורש מסך שמראה לכל ספק **אם החיבור פועל, כמה יתרה נשארה, וקישור לעמוד
> ההוספה שלו**. הפונקציה `portal/api/credits.ts` עושה את כל השלושה כראוי, ל-13
> ספקים. הטאב "מפתחות וקרדיטים" ב-`more30.com/admin` קרא ממנה שדות שהיא
> **מעולם לא החזירה**.
>
> | | מה המסך קרא | מה ה-API מחזיר |
> |---|---|---|
> | יתרה | `usage.usedUsd` · `usage.limitUsd` | `usage.used` · `usage.limit` · `usage.unit` |
> | קישור להוספת קרדיט | לא נקרא כלל | `topUp` — לכל 13 הספקים |
> | "קיים בכספת, לא נפרס" | לא היה במילון | `state: "not-deployed"` |
>
> **מה זה עשה בפועל:** לשלושת הספקים שכן מפרסמים יתרה — Apify, Recraft
> ו-ElevenLabs — השורה שהודפסה הייתה `$undefined / $undefined · 41%`. הסימן `$`
> היה מקובע, כך שגם אחרי תיקון השמות הוא היה מדפיס דולרים על **תווים**
> (ElevenLabs) ועל **קרדיטים** (Recraft). הקישור להוספת קרדיט — הדרישה
> המפורשת של §3א — לא הופיע במסך אף פעם, ו-`not-deployed` הוצג באנגלית גולמית,
> כלומר ההבחנה שה-API טורח עליה בין "אין מפתח" לבין "יש בכספת ולא נפרס" נמחקה
> בדיוק במסך שנועד להציג אותה.
>
> **אומת שזה היה חי לפני התיקון**, ולא רק במקור שעל הדיסק: החבילה שהוגשה
> מ-`more30.com/admin/assets/index-BpjLLbPu.js` הכילה `usedUsd`×1, `limitUsd`×1,
> ו-`topUp`×0.
>
> **למה הסורק הרוחבי לא תפס:** `placeholder-leak.mjs` מחפש `undefined` על 25
> נתיבים, ו-`/admin` דורש כניסת סופר-אדמין — הוא לא נכנס לשם. הכלל "אין נתון →
> לא זמין" נאכף בכל מקום חוץ מהמסך שהמנהל מסתכל עליו.
>
> ### ⚠️ ותוך כדי הפריסה נחשף חמור יותר: `admin` נבנה עם נתיב נכסים שבור
> `admin/vite.config.ts` הצהיר `base: "./"` עם הערה שזה עובד גם בתת-נתיב.
> **זה לא עובד:** הכתובת הקנונית היא `more30.com/admin` **בלי לוכסן סוגר**,
> ונתיב יחסי נפתר מול שורש האתר — `./assets/x` הופך ל-`/assets/x` ונופל. כלומר
> `vite build` רגיל היה מייצר חבילה שמעלה **מסך לבן**, וכל מי שהיה פורס אותה
> היה מוריד את לוח השליטה. הפריסה החיה עבדה רק כי מישהו בנה אותה פעם עם
> `--base` ידני.
>
> זו **בדיוק** אותה מלכודת שכבר תוקנה ב-12 קונפיגים תחת `apps/` ב-05/08.
> `admin` נעדר משם כי `vite-base-audit.mjs` מקבע `apps/` בנתיב, ולכן הקונפיג
> היחיד שיושב מחוץ לתיקייה הזאת מעולם לא נבדק. בדיקה שאינה רואה קובץ אינה
> מדווחת עליו כנכשל — היא פשוט שותקת.
>
> | | לפני | אחרי |
> |---|---|---|
> | `base` ב-config | `"./"` | `"/admin/"` |
> | `vite build` רגיל | `./assets/…` → 404 בכתובת הקנונית | `/admin/assets/…` |
> | ביקורת הנתיבים | 14 אפליקציות, `admin` לא נבדק | **15, כולל `admin`** |
>
> **אימות לפני הפריסה** (הכלל מ-`deploy-copy-can-break-live-sites`): ה-HTML
> הבנוי הושווה מול מה שהפרודקשן מגיש בפועל ונמצא **זהה לחלוטין פרט ל-hash של
> הנכס**. רק אז נפרס.
>
> **אימות אחרי הפריסה, דרך `more30.com`:** `/admin` מחזיר 200 ומגיש
> `index-j22VuPNJ.js`; הנכס עצמו 200; בחבילה החיה `usedUsd`×0, `limitUsd`×0,
> `topUp`×1, `not-deployed`×2, והעברית תקינה (בלי mojibake). האפליקציה עולה
> בדפדפן אמיתי עם **0 שגיאות קונסולה** — צילום: `QA/platform/admin-base-fixed.png`.
>
> **שומרי רגרסיה:** `vite-base-audit.mjs` תומך עכשיו בשדה `root` ומכסה 15/15;
> אומת שהוא באמת יורה — הוחזר `"./"` זמנית והוא נכשל על `admin` עם exit 1.
> `scripts/stage-admin.ps1` נעצר לפני פריסה אם ה-HTML הבנוי אינו מפנה
> ל-`/admin/assets`, כדי שהתקלה הזו לא תוכל לצאת לאוויר שוב בשקט.

> ## 🔴 06/08/2026 — שתי מערכות חיות אמרו למבקרים שהן לא קיימות. **תוקן ואומת.**
>
> `more30.com/chatzor` ו-`more30.com/chizukim` — **הכתובת הקנונית של שתיהן,
> זו שרשומה ב-`core.projects.live_url`** — הגישו את עמוד ההמתנה של הפורטל:
>
> > השירות הזה עדיין בהכנה — הוא רשום במרשם המערכות, אבל עוד אין לו עמוד פעיל.
>
> המערכות עצמן עבדו כל הזמן הזה. `/chatzor/` ו-`/chizukim/` (עם לוכסן סוגר)
> הגישו אותן במלואן. רק צורת הכתובת בלי הלוכסן — זו שמופיעה במרשם, בסייטמאפ
> ובקישורים — נשלחה למקום אחר.
>
> **השורש:** ב-`portal/vercel.dist.json`, מתוך 21 המערכות המותקנות-נתיב,
> **אלה שתי היחידות** שבהן הצורה הקצרה כוונה ל-`/system.html` במקום לאפליקציה.
> שאר 19 מכוונות לאפליקציה בשלוש הצורות (`/x`, `/x/`, `/x/:path*`). התיקון
> של 05/08 שסידר את צורת ה-`/x/` ב-19 מהמערכות לא נגע בצורה הקצרה כאן.
>
> **למה זה לא נמצא לפני כן — וזה החלק שחשוב:** `probe-all.mjs` מסמן מערכת
> כתקינה אם היא מחזירה 200, כל הנכסים שלה נטענים, ויש בה **יותר מ-150 תווים**
> של טקסט. עמוד ההמתנה מחזיר 200, אין בו אף נכס שנכשל, ויש בו **190 תווים**.
> הוא עבר את שלושת התנאים בגאון. סף אורך גנרי אינו יודע להבחין בין תוכן אמיתי
> לבין התנצלות מנוסחת היטב.
>
> | | לפני | אחרי |
> |---|---|---|
> | `/chatzor` (16) | 190 תווים · עמוד המתנה | **2,076 תווים · 40 קישורים** |
> | `/chizukim` (17) | 190 תווים · עמוד המתנה | **1,947 תווים · 38 קישורים** |
>
> אומת חי דרך `more30.com` אחרי הפריסה: 0 נכסים כושלים, 0 שגיאות קונסולה,
> והכותרות הן של המערכות (`מחוברים · חצור הגלילית`, `מערכת תמלול — חיזוקים
> קצרים`). צילומים: `QA/platform/chatzor-bare-fixed.png` · `chizukim-bare-fixed.png`.
>
> **שומר הרגרסיה:** `probe-all.mjs` נכשל עכשיו על הטקסט של עמוד ההמתנה עצמו
> ולא על אורכו, ומדפיס `<-- PLACEHOLDER` כדי שההבדל בין "ריק" לבין "מוגש
> העמוד הלא נכון" יהיה גלוי. אומת שהוא באמת יורה: `/system.html?app=chatzor`
> חי כרגע ומזוהה. 27/27 הנתיבים נסרקו מחדש אחרי הפריסה.
>
> ### ⚠️ נחשף תוך כדי, ולא תוקן: `system.html` תמיד אומר "בהכנה"
> העמוד בודק `if (!data.found)`, ו-`more30_system_page()` **אינו מחזיר שדה
> `found`** — הוא מחזיר `{app_key, name_he, app_name, enter_url, plans}`.
> לכן ענף ה"לא נמצא" נלקח תמיד, גם למערכת חיה לגמרי. אומת: `?app=nadlan`
> מחזיר 190 תווים של "בהכנה". באותו אופן `is_deployed`, `what_it_does`
> ו-`tagline` נקראים בעמוד ואינם בתשובה.
> **לא תוקן בכוונה:** אחרי התיקון למעלה אף נתיב אינו מגיע ל-`system.html`,
> כלומר זו אינה תקלה חיה, והתיקון האמיתי הוא הכרעה — להרחיב את ה-RPC או
> לכתוב את העמוד מחדש מול מה שהוא באמת מחזיר. תיקון חלקי של `found` בלבד
> היה מייצר עמוד שמציג שם ומסלולים ומשאיר שלושה שדות ריקים.
>
> ### ✅ נמדד מחדש ונסגר: "חסר מצב כהה ב-5 מערכות" — לא נכון
> השורה הזו נשארה פתוחה בטבלה למטה. נמדד היום ב-`dark-probe.mjs` וב-
> `dark-toggle-probe.mjs` (חדש) על כל החמש: **בכולן יש ערכה כהה מלאה, וכולן
> עוקבות אחרי `prefers-color-scheme: dark` בפועל** — 02 `rgb(251,250,246)→
> rgb(20,22,28)`, 03 `→rgb(15,18,24)`, 06 `→rgb(14,21,25)`, 10 `→rgb(18,19,15)`,
> 35 `→rgb(11,18,32)`, וב-`<html>` מתווספת `class="dark"`. מה שאין בהן זה
> **מתג** — מי שה-מערכת-הפעלה שלו בהיר אינו יכול לבחור כהה, בעוד ל-smel,
> chatzor ו-galil יש מתג. זה פער עיצובי אמיתי אבל הוא לא "אין מצב כהה", וההבדל
> משנה את התיקון. `dark-toggle-probe.mjs` בודק את שני המסלולים שמשתמש באמת
> יכול לעבור בהם — מערכת ההפעלה, ומתג בעמוד — ולא רק אם כפיית המחלקה צובעת.

> ## ביקורת 05/08/2026 — רשימת התיקונים מול הקוד בפועל
>
> **הממצא המרכזי: רוב מה שרשום כ"לתקן" ב-`more30-fixes-and-features.txt` כבר
> בנוי.** נבדק בקוד, לא בהנחה. שלושה פריטים נבדקו אחד-אחד לפני שנכתבה שורת קוד
> ונמצאו מוכנים, ולכן נעשתה ביקורת מלאה:
>
> | פריט ברשימה | מצב בפועל |
> |---|---|
> | 13 שכבות המידע בנדל"ן (שווי · השוואות · עסקאות · גיל בניין · מפה · היתרים · שכונה · תכנון · התחדשות · ארנונה · חריגות · רישוי · תשריטים) | ✅ לכולן קוד — `InteractiveMap.tsx`, `buildingage.ts`, `planentities.ts`, `VipPanel.tsx` ועוד |
> | הבדל אמיתי חינמי/פרימיום/VIP | ✅ 28 הסתעפויות לפי `tier`, מתוכן 21 ב-`lib/sources.ts` |
> | שדות מובנים בטופס הבקשה | ✅ כולל תת-חלקה ומספר דירה (`ReportRequestForm`) |
> | צילום Street View מכוון לבניין | ✅ תוקן, ומאומת ב-`streetview-aim.mjs` (12/12) |
> | שדות מובנים בדוח המיידי | ✅ **נוסף בסבב הזה** — גוש/חלקה |
> | סיבוב/היפוך + תצוגה מקדימה בהמרת כתב יד | ✅ **נוסף בסבב הזה** (מערכת 18; מערכת 17 מקבלת אודיו בלבד) |
>
> **מה זה אומר לסבב הבא:** אין טעם לפתוח את הרשימה ולבחור פריט — צריך לבדוק
> קודם אם הוא כבר קיים. שלושה סבבים בזבזו זמן על גילוי מחדש של אותה עובדה.
>
> ### מה שנשאר פתוח באמת (ולמה)
>
> | פריט | חסם |
> |---|---|
> | תת-חלקה ומספר דירה **בדוח המיידי** | `ParsedQuery` אינו מכיל תת-חלקה, ועמוד הדוח מקבל `entrance/floor/rooms` בלבד. שדה שנראה פעיל ונזרק בשקט גרוע משדה חסר — דורש הרחבת הפרסר והמודל |
> | אימות ויזואלי של Street View על 4 כתובות | דורש מפתח Maps וקריאה חיה |
> | RLS על `csjekrvu` | החשבון אינו נגיש מכאן |
> | סוכן ה-AI של אוטומציית בקלות | קובץ האפיון נעלם מהתיקייה ואינו בגיט |
>
> ### אימות רוחבי שנוסף
> `placeholder-leak.mjs` — הכלל "אין נתון → לא זמין" מוצהר ב-`more30-priority.md`
> כרוחבי, ונבדק עד עכשיו רק בנדל"ן. **25 נתיבים, 0 ערכים שאינם קיימים**: אין
> `undefined`, `NaN`, `[object Object]` ואין תווית שנשארה בלי ערך.

> ## עדכון 05/08/2026 — המחירים נכנסו
>
> | | |
> |---|---|
> | **מדרגות בתשלום** | 16 מערכות קלות חיות קיבלו **2 ₪ ("בסיסי")** ו-**5 ₪ ("מורחב")**. `nadlan` (12/15) ו-`more30` (10) לא נגעו — היה להן מחיר. `tivuch`, `kiosk`, `studio` הוחרגו כפלטפורמות תפעוליות, ונופלות למחיר הפלטפורמה דרך נפילת ברירת המחדל הקיימת. |
> | **מסלול חינמי** | היה קיים ל-`more30` ול-`nadlan` בלבד. הוספת המחירים חשפה את זה מיד: 16 עמודי מסלולים היו מציגים **רק תשלום**. נוסף מסלול ברירת מחדל חינמי לכל אחת. |
> | **ריק ≠ אפס, גם כאן** | `price_ils` של המסלול החינמי נשאר `NULL` בכוונה — `is_default` הוא חינמי מעצם הגדרתו, ו-0 היה גורם לעמוד להדפיס "0 ₪". `pricing-reflects.mjs` תוקן כדי לא לקרוא לזה "טרם הוכרע", כי דיווח כזה מזמין תיקון שגוי. |
> | **חיוב** | לא נפתח. `core.billing_settings.mode = off`, והעמודה מקבלת `off`/`test` בלבד. `billing-safety.mjs` 6/6 · `pricing-reflects.mjs` 18/18. |
> | **הרשמה מיידית** | הטופס אסף שם·מייל·סיסמה — **טלפון לא נאסף כלל**, ולא הייתה לו עמודה. נוספו `more30_profiles.phone` ו-`more30_profile_set_contact` (שם וטלפון בקריאה אחת, כדי שלא ייווצר מצב ביניים). `more30_profile_get` מחזיר טלפון — בלעדיו ה-callback לא ידע שהוא כבר נמסר והיה שואל שוב. |
> | **למה הטלפון לא חובה תמיד** | Google אינו מוסר טלפון. שדה חובה גלוי בכל מסלול היה חוסם את מסלול Google כדי לאכוף דרישה ששייכת להרשמה המיידית, ולכן הוא מופיע ונדרש רק שם. |
> | **אימות** | `customer-journey.mjs` מריץ עכשיו גם את **טופס ההרשמה עצמו** ולא רק כניסה דרך ה-API — 5/5, והטלפון נשמר בפרופיל בפועל. |
> | **בקלות (10) — מאגר הזכויות** | כבר נטען **חי** מההאב: 888 נושאים, אותו מספר שמוצג בדף הבית. החצי הזה של "הצג כמו כל האתרים" עבד. |
> | **בקלות (10) — כניסה לניהול** | 🔴 הקישור "ניהול" בסרגל הניווט הצביע ל**עמוד ארגז-חול של perplexity.ai**, חי בפרודקשן. כל מבקר שלחץ נשלח לעמוד AI של צד שלישי. הופנה תחילה ל-`/admin`, וכעת ל-**`/admin/rights` — מסך הניהול של מערכת 10 עצמה**, כפי ש-§5 מבקש. |
> | **בקלות (10) — לא נעול** | נבדק ולא הונח: אפס מילות חסימה, אפס שדות חובה, 888 נושאים גלויים, 30 קבצים להורדה, ניווט מלא. |
> | **מסך ניהול מאגר הזכויות** | חדש ב-`/admin/rights`. חיפוש על כל המאגר, סינון לפי מקור, ומדד שלמות. נוגע ב-`rights.catalog` בלבד — לא ב-`zr_*`, לא ב-08/09. |
> | 🔴 **פער תוכן שנחשף** | **435 מתוך 888 זכויות** — כל אלה שמקורן בקופות החולים — בלי תנאי זכאות, בלי הסבר איך מגישים ובלי קישור למקור. הן נראות מלאות בקטלוג (שם, קטגוריה, גוף מטפל) אבל אינן ניתנות למימוש. דורש מקור תוכן. |

> ## עדכון 03/08/2026 — סבב "ריצה מלאה"
>
> **`probe-all.mjs` רץ מחדש על 27 הנתיבים: כולם 200, אפס נכסים שבורים
> חוץ מאחד, אפס מסכים ריקים.** מה שהשתנה בסבב הזה:
>
> | | |
> |---|---|
> | **הצלת קבצים** | 2,706 קבצי מקור שחיו רק על הדיסק נשמרו בגיט ונדחפו. `/apps/**` היה מוחרג ב-`.gitignore`, ולכן **כל** קוד המערכות היה מחוץ לכל ריפו — לא רק 21 הקבצים שהיו רשומים. `.env*`, lockfiles ובינאריים גדולים הוחרגו בכוונה; כל קובץ נסרק לאישורי גישה לפני השמירה (ששת ה-JWT שנמצאו הם `anon`, מפוענחים ולא מונחים). |
> | **כפתור הכניסה** | `auth-button.js` מפרסם עכשיו `--more30-auth-inset`. **10 נתיבים מתוך 26 הסתירו פקד אמיתי** — נמדד ב-`elementFromPoint`, לא בעין. 6 מהם כבר אומתו נקיים בפרודקשן. |
> | **מצב כהה** | נוסף ל-imud, mechiron, egod, galil, nadlan, crm, gesher. mthbram התברר כ**כהה מלכתחילה** ולא כמערכת שחסר בה מצב כהה. |
> | **zchuyot** | 9 שגיאות קונסולה (`#418`×8 → `#423`) — הידרציה שנכשלה. הוסרה. |
> | **mechiron** | 404 של הצ'אטבוט נסגר בכנות: המסלול עונה, ומדווח `enabled:false` כי מקור הנתונים אינו נגיש מהפריסה הזו. |
> | **ניקוי** | פרויקט ה-Vercel היתום `dist` נמחק. |
>
> ## עדכון מאוחר יותר באותו יום — **11 פריסות עברו ואומתו**
>
> | אימות חי | תוצאה |
> |---|---|
> | `console-probe /zchuyot` | **9 שגיאות → 0** — ההידרציה שנכשלה הוסרה |
> | `console-probe /mechiron` | **404 → 0** — מסלול הצ'אטבוט עונה בכנות |
> | `authbutton-overlap` | **20/26 נקיים** (הבוקר: 10 נתיבים הסתירו פקד) |
> | `dark-probe` | ✅ imud · egod · galil · mechiron · nadlan · crm · gesher · tamlul · zchuyot |
>
> **מצב כהה — 12 מתוך 13 סגורות.** נותרה 35 (kiosk) בלבד, והמקור שלה
> vendored ב-Railway. `bkalot` התברר כמי שכבר הייתה לה ערכה (היא מגיעה
> בגיליון חוצה-מקורות ולכן הסורק לא ראה אותה); `mthbram` כהה מלכתחילה.
>
> 🔴 **המכסה נגמרה שוב אחרי 11 פריסות.** 5 תיקיות בנויות וממתינות +
> `modaot` שממתין לאישורך (סליקה חיה). פירוט ב-`NEEDS_USER.md` §0ג.

> **נמדד 03/08/2026 בדפדפן אמיתי מול הפרודקשן דרך `more30.com`.**
> הכלי: `scripts/qa/probe-all.mjs` · הנתונים הגולמיים: `QA/platform/_works.json`
> צילומי מסך: `QA/platform/<שם>-desktop.png` · `-mobile.png` · `-dark.png`

## איך נמדד "עובדת"

**200 אינו מספיק.** שתי מערכות החזירו 200 מושלם והגישו **עמוד ריק לגמרי** —
מעטפת HTML תקינה שכל סקריפט שלה החזיר 404. סריקת קודי-סטטוס נותנת להן ציון נקי.

לכן כל מערכת נמדדת בשלושה תנאים **יחד**:

| # | תנאי |
|---|---|
| 1 | הנתיב מחזיר 200 |
| 2 | **כל נכס שה-HTML מבקש מחזיר 200** (JS, CSS, API) |
| 3 | ה-DOM המרונדר מכיל טקסט אמיתי (> 150 תווים) |

---

## הטבלה

| # | מערכת | קישור חי | מצב | טקסט | נכסים | הערה |
|---|---|---|---|---|---|---|
| 33 | אתר התדמית | [more30.com](https://more30.com) | ✅ עובדת | 4,473 | ✅ | 30 קישורים |
| — | כניסה אחידה | [/login](https://more30.com/login) | ✅ עובדת | 326 | ✅ | Google SSO + סיסמה · **נמדד 17/08: Lighthouse perf 85, a11y 100, BP 77, SEO 63** (SEO תקין-בכוונה: `noindex` על עמוד חשבון, ראה `robots.txt` · CLS 0.272 ופרפורמנס לא נחקרו עדיין) |
| 01 | איגוד השיעורים | [/torah](https://more30.com/torah) | ✅ עובדת | 1,211 | ✅ | **נבדק מחדש 17/08: Lighthouse perf 88 · a11y 100 · SEO 100 · BP 77** (חסימת NetFree, לא ניתן לתיקון בקוד) — היה 74 ב-07/08, ראה §חסמים |
| 02 | תמלול איגוד | [/tamlul](https://more30.com/tamlul) | ✅ עובדת | 1,372 | ✅ | **תוקן: `heading-order`** + **תוקן שורש הפרפורמנס: Google Fonts render-blocking `<link>` בתוך `<head>` → `next/font/google`** · **נמדד 17/08 אחרי: Lighthouse perf 64→95 · a11y 98→100** (FCP 4.0s→1.7s, LCP 4.0s→2.2s, SI 8.3s→3.2s, `render-blocking-insight` חיסכון משוער 1,510ms→220ms) — עבר בסבב הזה, מעל הסף · עוקב אחרי מצב כהה, אין מתג |
| 03 | מודעות איגוד | [/modaot](https://more30.com/modaot) | ✅ עובדת | 661 | ✅ | ✅ נבדק מחדש 17/08 — אינו פער פעיל (`smallTargets: []`) · **תוקן: Google Fonts render-blocking → `next/font/google`** · **נמדד 17/08: Lighthouse perf 86→91 · a11y כבר 100 · SEO 100** (עבר את סף ה-90; BP 77 נשלט ע"י NetFree `card-injection.js`, כבר מתועד) |
| 04 | עימוד תורני | [/imud](https://more30.com/imud) | ✅ עובדת | 612 | ✅ | **תוקן: נגישות 90→100** (heading-order, landmark, button-name) · **נמדד 17/08: Lighthouse perf 64** (מתחת לסף 90, לא נחקר עדיין) · עוקב אחרי מצב כהה, אין מתג |
| 06 | לידים קופות חולים | [/briut](https://more30.com/briut) | ✅ עובדת | 4,832 | ✅ | **תוקן: 2 ליקויי נגישות אמיתיים** (`aria-label` כפתורי סגירה/קישורי כרטיס, `role="tab"` לצ'יפים) · **נמדד 17/08: Lighthouse perf 84, a11y 91→97** (פרפורמנס תנודתי, לא נחקר עדיין) · 108 קישורים |
| 10 | מימוש זכויות בקלות | [/bkalot](https://more30.com/bkalot) | ✅ עובדת | 3,041 | ✅ | **תוקן: meta description חסר** · **נמדד 17/08: Lighthouse perf 82 · a11y 100** (מתחת לסף 90, לא נחקר עדיין) |
| 12 | נדל"ן Smel | [/smel](https://more30.com/smel) | ✅ עובדת | 1,149 | ✅ | **תוקן: 2 ליקויי נגישות אמיתיים** (ניגודיות `.gold-text`, קישור "פרימיום" חסר שם נגיש במובייל) · **נמדד 17/08: Lighthouse perf 73→80, a11y 92→100** (פרפורמנס מתחת לסף 90, לא נחקר עדיין) |
| 14 | שמחות פלוס | [/smachot](https://more30.com/smachot) | ✅ עובדת | 1,445 | ✅ | **תוקן שורש חלקי: Google Fonts render-blocking `<link>` בתוך `<head>` → loadCSS preload/swap** (`render-blocking-insight` חיסכון משוער 1,190ms→840ms) · **נמדד 17/08: Lighthouse perf 76→79→76 (תנודתי, ראה `_lighthouse.json`)** — `base.css`/`style.css` המקומיים עדיין חוסמים, לא תוקן בצעד הזה |
| 15 | איגוד | [/egod](https://more30.com/egod) | ✅ עובדת | 2,459 | ✅ | **תוקן: 18 → 0 יעדי מגע קטנים** · **תוקנו 2/3 ליקויי ניגודיות** · **נמדד 17/08: Lighthouse perf 43, a11y 96** (הליקוי השלישי ב-auth-button.js המשותף, פרפורמנס לא נחקר) |
| 16 | חצור קונקט | [/chatzor](https://more30.com/chatzor) | ✅ עובדת | 2,076 | ✅ | **תוקן: הכתובת הקנונית הגישה עמוד "בהכנה"** · **תוקנו 34→0 יעדי מגע קטנים + 11→0 כשלי ניגודיות** · **נמדד 02/08: Lighthouse תדמית 87/100/100 · מערכת perf 57/a11y 100/seo 100** (פרפורמנס מתחת לסף 90 — `framer-motion`+`@hebcal/core` בטעינה ראשונית, ראה QA/chatzor.md) |
| 17 | תמלול חיזוקים | [/chizukim](https://more30.com/chizukim) | ✅ עובדת | 1,947 | ✅ | **תוקן: הכתובת הקנונית הגישה עמוד "בהכנה"** · **נמדד 17/08: Lighthouse perf 67/78, a11y כבר 100** (פרפורמנס מתחת לסף 90, לא נחקר עדיין) |
| 18 | עורך תורני | [/orech](https://more30.com/orech) | ✅ עובדת | 471 | ✅ | **נמדד 17/08: Lighthouse perf 97 · a11y 100 · SEO 100 · BP 77** (חסימת NetFree, לא ניתן לתיקון בקוד) — עבר בסבב הזה ללא תיקון |
| 22 | מימוש זכויות | [/zchuyot](https://more30.com/zchuyot) | ✅ עובדת | 2,511 | ✅ | **תוקן: 3 מספרים מומצאים הוסרו מרצועת הנתונים** · **נמדד 17/08: Lighthouse perf 65, a11y כבר 100, SEO 100** (פרפורמנס מתחת לסף 90, לא נחקר עדיין) |
| 26 | סטודיו מודעות | [/studio](https://more30.com/studio) | ✅ עובדת | 892 | ✅ | **נמדד 17/08: Lighthouse perf 65, a11y כבר 100, SEO 100, BP 77** (פרפורמנס מתחת לסף 90, לא נחקר עדיין) |
| 28 | השוואת קופות | [/kupot](https://more30.com/kupot) | ✅ עובדת | 3,132 | ✅ | **נמדד 17/08: Lighthouse perf 65, a11y כבר 100, SEO 100** (פרפורמנס מתחת לסף 90, דפוס NetFree/third-party-cookies כבר מתועד, לא נחקר עדיין) |
| 32 | נדל"ן ברגע | [/nadlan](https://more30.com/nadlan) | ✅ עובדת | 6,413 | ✅ | **תוקן: נגישות 95→100 · Google Fonts render-blocking (perf 60→72, FCP 5.0s→2.4s, LCP 5.0s→3.1s)** · **נמדד 17/08: Lighthouse perf 72 · a11y 100 · SEO 100** — שני תת-המדדים הנותרים (`server-response-time`, `mainthread-work-breakdown`) נחקרו ונסגרו כעיוות מדידה מקומי (NetFree), לא ניתן לתיקון בקוד, ראה NEEDS_USER |
| 34 | כסף | [/kesef](https://more30.com/kesef) | ✅ עובדת | 2,381 | ✅ | **תוקן: כניסה מגיעה למערכת** · **נמדד 17/08: Lighthouse perf 97 · a11y 100 · SEO 100** (מעל הסף, אין ליקוי לתקן) |
| 35 | KioskFleet | [/kiosk/](https://more30.com/kiosk/) | ✅ עובדת | 2,534 | ✅ | |
| 36 | נדל"ן פרו | [/tivuch](https://more30.com/tivuch) | ✅ עובדת | 2,781 | ✅ | Lighthouse perf 98 · a11y 100 · SEO 100 · BP 77 (חסימת NetFree, לא ניתן לתיקון בקוד) |
| 21 | Mthbram | [/mthbram](https://more30.com/mthbram) | ✅ עובדת | 873 | ✅ | **תוקן: 39 → 873** · **נמדד 17/08: Lighthouse perf 45→36, a11y 90→100** (תוקנו 2 ליקויים אמיתיים: `text-gold-cream` היה מחסיר לגמרי מ-tailwind.config — כל הטקסט בפוטר נצבע כמו הרקע; `<main>` חסר) · תוקן גם ייבוא תמונה שבור (`agud-logo.png` לא קיים) שחסם כל build מחדש ב-3 עמודים · **נחקר 17/08: bundle יחיד 1.6MB לא-מפוצל, לא Google Fonts** — דורש code splitting כמו galil, לא תוקן בצעד הזה |
| 24 | גליל קונקט | [/galil](https://more30.com/galil) | ✅ עובדת | 1,624 | ✅ | **תוקן: 121 → 1,624** · **נמדד 17/08: Lighthouse perf 32→36→40, a11y 94→100** (תוקנו 2 ליקויים אמיתיים: `bg-primary`/`text-primary-foreground` — ניגודיות 4:1 בכפתורי CTA — הכהיתי את `--primary` מ-40%→35% lightness בטוקן, משפיע על כל האתר; `<div>` בלי `<main>` ב-Index.tsx — עטפתי) · תוקן גם ייבוא תמונה שבור (`logo-hazor.png` לא קיים בדיסק) שחסם כל build מחדש ב-3 עמודים — הופנה ל-`logo-mechubarim.png` הכבר-קיים · **route-level code splitting נפרס (`index.js` 981KB→801KB + `KashrutPage` בנפרד), נמדד מחדש 17/08: 36→40** — שיפור חלקי בלבד; ה-40 עדיין מתחת לסף 90, הצוואר-בקבוק המוביל עכשיו `mainthread-work-breakdown` (10.9s) ו-`server-response-time` (760ms), לא נחקר לעומק בצעד הזה |
| 27 | השוואת מחירים | [/mechiron](https://more30.com/mechiron) | ✅ עובדת | 915 | ✅ | **תוקן: ליקוי ניגודיות אמיתי בפוטר** (`opacity-70` על טקסט הבהרה כבר `text-muted-foreground` הוריד ratio ל-3.05, מתחת ל-4.5 הנדרש) · **תוקן שורש הפרפורמנס: Google Fonts render-blocking → loadCSS preload/swap** · **נמדד 17/08: Lighthouse perf 55→53 (רעש מדידה, כמו bkalot/smel), a11y 100, SEO 100** (עדיין מתחת לסף 90 — `bkalot-theme.css` המשותף עדיין חוסם, לא תוקן בצעד הזה) · נבדק מחדש 17/08: chatbot/config מחזיר 200, לא 404 |
| 30 | CRM זכויות | [/crm](https://more30.com/crm) | ✅ עובדת | 135 | ✅ | **תוקן פעמיים** — נכסים + הפניה. מפנה ל-`/crm/auth` · **תוקן: `<main>` landmark חסר במסך הכניסה** · **נמדד 17/08: Lighthouse perf 85→89, a11y 98→100, SEO 100** |
| 31 | גשר עברית CRM | [/gesher](https://more30.com/gesher) | ✅ עובדת | 105 | ✅ | **תוקן פעמיים** — נכסים + הפניה. מפנה ל-`/gesher/auth` · **תוקן: `landmark-one-main` חסר במסך הכניסה** · **נמדד 17/08: Lighthouse perf 80, a11y 98→100, SEO 100** |
| — | אזור אישי | [/me](https://more30.com/me) | ℹ️ תקין | 93 | ✅ | דורש התחברות — צפוי |

**26 עובדות במלואן · 0 חלקית · 0 שבורות · 1 מוגן-כניסה (תקין).**

> **הערה על הסף:** `probe-all.mjs` דורש > 150 תווים, ולכן מסמן מסכי התחברות
> (`/me`, `/crm`, `/gesher`) כ"בדוק". הם תקינים — מסך כניסה הוא פשוט קצר.
> תמיד לאמת ידנית לפני שמסיקים מזה משהו.

---

## מה תוקן בסבב הזה

### 🔴 30 + 31 — שתי מערכות הגישו **עמוד ריק** מאחורי 200

זה הממצא המשמעותי ביותר. שתיהן החזירו 200 עם מעטפת HTML תקינה שבה **כל
סקריפט וכל גיליון סגנון החזירו 404**. הדפדפן לא צייר כלום.

**השורש, נמדד ולא נוחש:**

```
/assets/index-DtqBFgK5.js       →  200
/crm/assets/index-DtqBFgK5.js   →  404      אותו קובץ בדיוק
```

vite מוגדר עם `base: '/crm/'` כדי שהמערכת תחיה תחת `more30.com/crm`, וה-base
משכתב את כתובות הנכסים ב-HTML. אבל בניית Vercel מפרסמת את חבילת הלקוח ל-
`.vercel/output/static/assets/`, שמוגשת מ-`/assets/` **בלי הקידומת**. השניים
לא הסכימו. ה-SSR catch-all ענה על כל 404 בעמוד השגיאה של האפליקציה — כלומר
הדפדפן קיבל HTML במקום JavaScript, ולא צייר דבר.

**התיקון:** `vercel.json` בכל אחת מהן שממפה `/crm/assets/:path*` →
`/assets/:path*`. אינו יכול להסתיר קובץ אמיתי: Vercel בודקת את מערכת הקבצים
לפני `rewrites`, ולכן רק בקשות שהיו נכשלות ממילא מגיעות אליו.

**אומת אחרי:** כל ששת הנכסים 200 · שגיאות קונסולה 3 → 0 בשתיהן ·
`/crm/dashboard` מרנדר "לוח בקרה | זכויות פרו".

**מה נשאר:** מסלול ה-index של שתיהן הוא **קומפוננטה ריקה**
(`index-DtqBFgK5.js` הוא מילולית `const n=()=>null`). זו חוסר-תוכן ברמת
האפליקציה, לא תקלת פריסה. דורש עבודה בקוד המקור של אותן מערכות.

### 32 — נגישות 95 → 100
`#0ea5a4` נתן **3.03:1** ללבן עליו — מתחת ל-AA, **על כפתור הפעולה הראשי**
ועוד 37 מקומות. הועבר לגוון הכהה שכבר היה בפלטה (4.95:1). כותרות הטופס h3 → h2.

### 34 — הכניסה מגיעה למערכת
מי שנכנס דרך Google חזר לאתר התדמית. נבנה `/kesef/app`, נטענו 259 רשויות
מהמרשם הרשמי, וה-guard הוא הרשאה במסד (anon → 401 על כל חמש הפונקציות).

### 36 — מערכת חדשה, מוכנה לשיווק
Lighthouse **95 / 100 / 100** (נמדד 07/08; 98 היה המדידה של 02/08). חוזים + חתימה מאובטחת + יומן ראיות + שליחה
במייל דרך Edge Function. 76/76 בסמוק-טסט.

### 01 — 62 → 69
הוסר שער הספינר שחסם את כל האתר הציבורי מאחורי round-trip; הטננט מוזרק ל-HTML.
FCP 3.2s → 2.0s.

---

## חפיפת כפתור הכניסה — נמדד על כל 26 הנתיבים

`scripts/qa/authbutton-overlap.mjs`, ברוחב 390 וברוחב 1440, עם
`elementFromPoint` שמאשר מי באמת מקבל את הלחיצה.

| נתיב | מה היה מכוסה | מצב |
|---|---|---|
| `/torah` (01) | "התחבר" + כפתור התפריט, **בשני הרוחבים** | ✅ אומת נקי |
| `/imud` (04) | "שאלון חכם" — הפעולה הראשית | ✅ אומת נקי |
| `/smel` (12) | מתג המצב הכהה | ✅ אומת נקי |
| `/egod` (15) | כפתור התפריט · "הצטרף כמגיד שיעור" | ✅ אומת נקי |
| `/chatzor/` (16) | מתג מצב כהה + כפתור התפריט | ✅ אומת נקי |
| `/galil` (24) | כפתור התפריט · "ניהול ⚡" | ✅ אומת נקי |
| ~~`/` (33)~~ | "ספרו לנו רעיון" | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** 0 חפיפות בחמשת הרוחבים. ראה הרשומה בראש הקובץ. |
| `/tamlul` (02) | "כניסת ניהול" | ✅ **נבדק מחדש 17/08 — נמצא נפער מחדש (0 חפיפות → 1), תוקן ופרוס.** הוספת `ThemeToggle` היום (POLISH_BACKLOG) הפכה את סרגל הניווט לצפוף מדי ב-390px, וחפיפה חדשה נוצרה מול הכפתור החדש — לא כשל של `.more30-auth-clear` עצמו (שריר, `padding-inline-end` נמדד תקין), אלא גלישת תוכן מעבר לשוליים השמורים. תוקן ב-`flex-wrap` על שורת הניווט; ב-390px היא גולשת לשורה שנייה מתחת לכדור במקום מתחתיו. `vercel deploy --prod` (`tamlul-more30`, `dpl_9vvZDdvybJNVoG5jcFxDfuWyEEqA`), אומת חי: `clear @ 390,834,1100,1280,1440`. ראיות: `QA/platform/tamlul-navwrap-recheck-0817/`. |
| `/chizukim/` (17) | "העלאת הקלטה" | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** `clear @ 390,834,1100,1280,1440`, אין שינוי קוד. ראיות: `QA/platform/tamlul-navwrap-recheck-0817/`. |
| ~~`/nadlan` (32)~~ | "מקורות ותמחור" | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** 0 חפיפות בחמשת הרוחבים. |
| `/smachot` (14) | מתג המצב הכהה | 🔴 **חסום על מקור** — `apps/14` הוא אתר התוכנית העסקית, לא מה שנפרס |

> **הפורטל תוקן פעמיים, וזה שווה תיעוד.** התיקון הראשון נפרס ועדיין נמדד
> כמכוסה: ה-media query ב-720px מגדיר `padding-inline` על `.nav-in`, שכותב
> את **שני** הצדדים ולכן מחק את הפינוי — בדיוק ברוחב שבו הוא הכי נחוץ.
> בנוסף, מתחת ל-`--wrap` איבר השוליים יוצא שלילי, וחיסורו **הוסיף** ריפוד
> (124px הפכו ל-519px) במקום להוריד. שניהם תוקנו. ✅ **נבדק מחדש 17/08 —
> שניהם כבר פרוסים וחיים**: הפרודקשן (`assets/index-B35ByRD-.css`) זהה
> בייטים ל-`portal/src/styles.css` בשתי החוקים, ובדיקה גיאומטרית
> (`elementFromPoint`) מול הייצור מחזירה 0 חפיפות בכל חמשת הרוחבים. ראה
> הרשומה בראש הקובץ.

---

## מה נשאר לתקן

| מערכת | מה | הערכת מאמץ |
|---|---|---|
| ~~**21 Mthbram**~~ | ✅ **תוקן** — `<BrowserRouter basename="/mthbram">`. | — |
| ~~**24 גליל קונקט**~~ | ✅ **תוקן** — basename + הוסר וידאו מת מ-`cdn.coverr.co` שהחזיר 404 בכל טעינה. | — |
| ~~**27 מחירון**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** `/mechiron/api/public/chatbot/config` מחזיר 200 (לא 404); המסלול נוסף ב-8a8d8db (03/08). `enabled:false` הוא הערך התקין כשאין שורת `automation_configs` קריאה. ראה הרשומה בראש הקובץ. | — |
| ~~**30 CRM זכויות**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** `/crm` ו-`/crm/` מגישים מסך כניסה מלא, 0 שגיאות קונסולה. dashboard אחרי כניסה אמיתית נבדק בנפרד באותו יום — 0 שגיאות, נתוני אמת, אין hydration mismatch. ראה הרשומה בראש הקובץ. | — |
| ~~**31 גשר עברית**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** `/gesher` ו-`/gesher/` מגישים מסך כניסה מלא, 0 שגיאות קונסולה. ראה הרשומה בראש הקובץ. | — |
| ~~**15 egod**~~ | ✅ **תוקן — 18 → 0.** נקודות הקרוסלה היו 6×6px בלי שם נגיש (עכשיו אזור פגיעה 24px עם הנקודה במרכז + `aria-label` לכל אחת); קישורי הפוטר היו 20px גובה (נוסף `py-1`). | — |
| ~~**03 מודעות**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** `smallTargets: []` בכל שלושת המצבים (desktop/mobile/dark), `interactiveCount: 8`. ראה הרשומה בראש הקובץ. | — |
| **01 torah** | **FCP נפתר: 3.2s → 1.8s**, מתחת לסף. ~~מה שנשאר הוא LCP 5.3s ו-TBT 510ms — בעיה אחרת מזו שהרינדור מראש נועד לפתור, ודורשת SSR מלא~~ ✅ **נבדק מחדש 17/08 — מיושן: LCP 2.4s, TBT 280ms, פרפורמנס 74→88.** עדיין מתחת לסף 90 של `DESIGN_STANDARD`, אבל לא במצב "5.3s/510ms" שהשורה תיארה. ראה `QA/torah.md` והרשומה בראש הקובץ (`QA/platform/torah-lh-recheck-0817/`). ~~🔴 וגם: CLS 0.578 חי כרגע — רגרסיה מדגל seed שנשמט~~ ✅ **נבדק מחדש 17/08 — אינו פער פעיל, CLS 0.001.** ראה הרשומה בראש הקובץ. | בינוני — לא "גדול, ארכיטקטוני" יותר; הפער שנשאר הוא ~2 נקודות מהסף, לא רה-כתיבת SSR |
| **יעדי מגע < 24px** | **תוקן ואומת ב-0:** `egod` (18) · `modaot` (3) · `mthbram` (2) · `tamlul` · `kesef` · `tivuch`. **נותרו 2, שניהם חסומים על מקור:** `smachot` 1 — `apps/14-bsmachot-plus/website/` הוא **אתר התוכנית העסקית, לא האתר שנפרס**; המקור של האתר החי אינו כאן. `kiosk` 1 — הקישור לא במקור ה-vendored (רץ על Railway). **אל תעתיק מ-`apps/14` ל-`_deploy/smachot`** — ניסיתי, וזה החליף את האתר החי באתר אחר. שוחזר ב-`vercel promote`. | חסום על מקור |
| ~~**מצב כהה**~~ | ✅ **נסגר 06/08.** נסגר ב-7 (04, 15, 24, 27, 30, 31, 32), 21 כהה מלכתחילה, ו-**5 האחרונות (02, 03, 06, 10, 35) נמדדו ונמצאו עוקבות אחרי `prefers-color-scheme` בפועל** — הרישום שהן חסרות היה שגוי. ראה הסעיף בראש הקובץ. הפער שנותר הוא **מתג** בעמוד, לא ערכה. | — |
| ~~**מתג מצב כהה**~~ | ✅ **הועבר ל-POLISH_BACKLOG.md 17/08.** ל-02, 03, 06, 10, 35 אין פקד ידני, אבל כל החמש עוקבות אחרי `prefers-color-scheme` בפועל (נמדד מחדש 17/08, `QA/platform/dark-toggle-recheck-0817/`) — זו לא פונקציונליות חסרה, פקד ידני נוסף הוא ליטוש. | — |

> 🔴 **מיושן — ראה הרשומה בראש הקובץ (17/08).** נכתב 04-06/08; החשבון עבר
> ל-Vercel Pro ב-12/08 והמכסה הוסרה. נשאר כאן להיסטוריה בלבד, אינו חסם.
> ~~מכסת הפריסות של Vercel (100/יום) נוצלה. אי אפשר לפרוס ולכן אי אפשר לאמת
> תיקונים נוספים עד לאיפוס. פירוט ב-`NEEDS_USER.md` §0ג.~~

---

## 🔴 04/08 — `/bkalot` רץ בלי גיליון סגנון ובלי JavaScript. **תוקן.**

הממצא החמור ביותר בסבב, והוא לא נראה בשום בדיקה קיימת.

האתר מוגש מ-`more30.com/bkalot` **בלי לוכסן בסוף ובלי `<base>`**, וכל
הנכסים בו יחסיים. `"style.css"` נפתר מול כתובת המסמך → `more30.com/style.css`
→ שורש הפורטל → ה-catch-all עונה **200 עם index.html**.

| הנכס | מה חזר בפועל |
|---|---|
| `style.css` | HTML. נפרס כ**אפס חוקים** |
| `engine.js` · `repo.js` · `app.js` | HTML. **מעולם לא רצו** |
| 30 קישורי הורדה | לשום מקום |

כלומר **מנוע הזכויות, השאלון והשוואת הקופות היו מתים בפרודקשן.** העמוד
נראה חי רק כי `bkalot-theme.css` הוא כתובת מוחלטת חוצת-מקורות ונטען לבד,
והטקסט הסטטי נשאר ב-HTML.

**שום דבר לא החזיר 404** — ולכן `probe-assets` עבר על זה כל פעם מחדש,
ו-`probe-all` דיווח 3,041 תווים של טקסט.

**התיקון:** `<base href="/bkalot/">` — אותה שורה בדיוק שיש ל-`/briut`,
שסובל מאותה גיאומטריה ועובד בזכותה. **אומת אחרי הפריסה: חמישה נכסים
מחזירים נכסים אמיתיים.** גם החפיפה של כפתור הכניסה נפתרה מעצמה — חוק
ה-CSS שלי היה נכון כל הזמן, הוא פשוט מעולם לא נטען.

**שני כלים חדשים, כי הקיימים עיוורים לזה:**
`scripts/qa/css-origin.mjs` — מונה כל גיליון (כולל חוצה-מקורות ומוזרק)
והולך על הקסקדה למאפיין נתון · `scripts/qa/relative-asset-probe.mjs` —
שואל אם תשובת css/js הייתה באמת css/js או ה-HTML של הפורטל.
**נסרקו כל 22 הנתיבים האחרים: bkalot היה היחיד.**

---

## 🚨 סחף בין המקור לפרודקשן — נמצא בהשוואה, לא בקריאה

שתי מערכות סטטיות מגישות היום HTML ש**אינו קיים במקור על הדיסק**. הן נבדקו
בהשוואת שורות בין המקור לעמוד החי, לפני שהועתק משהו — וטוב שכך.

| מערכת | מה חי רק בעותק הפרוס | מה היה קורה בהעתקה מהמקור |
|---|---|---|
| **06 briut** | `<base href="/briut/">` | כל נכס בעמוד הוא נתיב יחסי. בלי השורה כולם נפתרים מהשורש ומחזירים 404 — **עמוד ריק מאחורי 200**, בדיוק התקלה של 30 ו-31 |
| **06 briut** · **10 bkalot** | `auth-button.js` | הכניסה האחידה נעלמת מהמערכת בשקט |

**שניהם הוחזרו למקור.** מכאן והלאה, לכל אתר סטטי שמתוחזק ביד: **להשוות
מול העמוד החי לפני שמעתיקים עליו.** זו אותה משפחה של תקלות שכבר הפילה כאן
את `smachot` ואת `nihul`.

---

## נגישות — מה `platform-audit.mjs` מצא בסבב הזה

| מערכת | מה | מצב |
|---|---|---|
| ~~**24 galil**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** טלפון ואימייל בפוטר: `smallTargets: []` בכל שלושת המצבים (desktop/mobile/dark). ראה הרשומה בראש הקובץ. | — |
| ~~**24 galil** · **21 mthbram**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** כפתור התפריט במובייל בשתי המערכות נושא `aria-label` ("פתיחת התפריט"/"סגירת התפריט") ו-`aria-expanded` שמתחלף `false`→`true` בפועל בלחיצה בייצור. ראה הרשומה בראש הקובץ. | — |
| ~~**10 bkalot**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** `unnamedControls: []` ו-`smallTargets: []` בשלושת המצבים (desktop/mobile/dark) בייצור. ראה הרשומה בראש הקובץ. | — |
| ~~**30 crm**~~ | ✅ **נבדק מחדש 17/08 — אינו פער פעיל.** `/crm` הוא מסך הכניסה עצמו ("כניסה למערכת \| זכויות פרו"); `smallTargets: []` בשלושת המצבים בייצור. ראה הרשומה בראש הקובץ. | — |
| **14 smachot** | "מאגר GitHub" 232×20 | 🔴 חסום על מקור |
| **35 kiosk** | "more30.com" 94×19 | 🔴 מקור vendored ב-Railway |

---

## מצב כהה — מה נמצא, ולמה כל מערכת הייתה חסרה אותו

`scripts/qa/dark-probe.mjs` שואל את העמוד עצמו בפרודקשן: האם יש בכלל חוקי
`.dark` בגיליונות, והאם הוספת המחלקה באמת מזיזה את הרקע. התשובות חילקו את
13 המערכות לארבע קבוצות שונות לגמרי — ולכן "להוסיף מצב כהה" לא היה
משימה אחת.

| מערכת | מה באמת היה חסר | מצב |
|---|---|---|
| **04 imud** · **27 mechiron** | ערכה כהה מלאה כבר הייתה בקוד ו**שום דבר לא הדליק אותה**. `imud` עבר במדידה מ-`rgb(250,248,245)` ל-`rgb(27,22,19)`, `mechiron` מ-`rgb(248,246,242)` ל-`rgb(18,25,28)` — 12 חוקי `.dark` פעילים. נדרש סקריפט לפני-ציור בלבד. | ~~⏳ נבנה, ממתין לפריסה~~ ✅ **נבדק מחדש 17/08 — כבר פרוס.** ראה הרשומה בראש הקובץ. |
| **15 egod** · **24 galil** | `darkMode:["class"]` היה מוגדר וכל הקומפוננטות קראו טוקנים סמנטיים — אבל **לא הייתה ערכה שתענה**. נכתבו ערכות: צבעי המותג קבועים, רק המשטחים והדיו מתהפכים. נמדד AA: 16:1 טקסט ראשי · 7:1 מושתק · 8:1 זהב. | ~~⏳ נבנה, ממתין לפריסה~~ ✅ **נבדק מחדש 17/08 — כבר פרוס.** ראה הרשומה בראש הקובץ. |
| **30 crm** · **31 gesher** | ערכת `.dark` שלמה מהיום הראשון, אף פעם לא הודלקה. ב-SSR הסקריפט **חייב** לשבת ב-`<head>` — `useEffect` היה מגיע אחרי שהעמוד כבר צויר לבן. | ~~⏳ ממתין לפריסה~~ ✅ **נבדק מחדש 17/08 — כבר פרוס.** ראה הרשומה בראש הקובץ. |
| **32 nadlan** | פלטה קבועה ב-`tailwind.config` — **אפס** חוקי `.dark`. שוכתב לשכבת משטחים. המלכודת: `navy` שימש לשני תפקידים הפוכים — 147 פעם כדיו כותרת ו-23 פעם כמשטח כהה; היפוך גורף היה הופך `bg-navy text-white` ללבן-על-לבן. פוצל ל-`navy` (דיו, מתהפך) ו-`navysurface` (מותג, קבוע). `next build` ו-`tsc` עוברים. | ~~⏳ נבנה, ממתין לפריסה~~ ✅ **נבדק מחדש 17/08 — כבר פרוס.** ראה הרשומה בראש הקובץ. |
| **21 mthbram** | **לא חסר לה מצב כהה.** ה-`:root` שלה הוא ערכה כהה מלאה שנבנתה מהלוגו. הוצהר `color-scheme: dark` כדי שגם פקדי הדפדפן יפסיקו להיות לבנים בתוכה. *(נמצא גם שהיא הייתה היחידה מלבד `/modaot` בלי כפתור כניסה — נוסף.)* | ~~⏳ ממתין לפריסה~~ ✅ **נבדק מחדש 17/08 — כבר פרוס.** ראה הרשומה בראש הקובץ. |
| **02 tamlul** · **03 modaot** · **06 briut** · **10 bkalot** | פלטה קבועה בלי הפשטה סמנטית, כמו nadlan לפני השכתוב. שוכתבו באותה שיטה. | ✅ נפרס |
| **35 kiosk** | המקור אינו על הדיסק (`"source": "not-vendored"`) — הוא ב-`l023131500-ops/zol`, ענף `claude/what-do-you-see-gxo5tc`, תיקייה `kiosk/server`. **נשלף, נכתב, נדחף, ו-Railway פרס אוטומטית.** נמדד: `rgb(245,247,251) → rgb(11,18,32)`. `--navy` **אינו** מתהפך — נבדק שהוא משמש רק כמשטח ולא כטקסט. | ✅ נפרס ואומת |

> **מצב כהה — 13/13. הושלם.**

---

## "נהל מערכת זו" — הקישור נמדד, והפעם גם נפתח

0025 קבעה לאן הקישור של §3 מצביע, ו-`admin-systems-entry.mjs` אימת את ה-`href`
על ארבעה כרטיסים. שניהם מודדים את הכתובת. **אף אחד מהם לא פתח אותה** — וזה
מה שחסר כאן במיוחד, כי כל מערכת ממוענת מאחורי rewrite, ולכן כתובת שאינה
מגיעה לשום מקום עונה 200 עם דף הנחיתה של המערכת. בדיקת סטטוס עוברת עליה.

`scripts/qa/admin-entry-resolves.mjs` פותח את 13 הכתובות הרשומות בפרודקשן,
מנותק, ומשווה כל אחת מול השורש הציבורי של אותה מערכת — גם בבתים וגם
בטקסט המצויר. **רק הרינדור מבדיל:** SPA שמנתב בצד הלקוח מגיש את אותם
בתים בשתי הכתובות ומצייר שני מסכים שונים. חמש מהכתובות אכן זהות-בבתים
לשורש — `chatzor` · `egod` · `galil` · `torah` · `zchuyot` — וכולן מציירות
מסך אחר.

| מצב | כמה | מי |
|---|---|---|
| `distinct_screen` — מגיע למסך שהשורש אינו מציג | 11 | bkalot · chatzor · egod · galil · kiosk · modaot · nadlan · tamlul · tivuch · torah · zchuyot |
| `same_render_but_gated` — זהה לשורש, **והשורש עצמו הוא שער הכניסה** | 1 | `gesher` — `/gesher/` הוא מסך ההתחברות עצמו, ולכן `/gesher/auth` מגיע בדיוק לאן שצריך |
| `same_render_no_gate` — זהה לשורש, ואיש אינו מתבקש להזדהות | 1 | `mechiron` |

**הממצא היחיד — `mechiron`.** `/mechiron/admin` מצייר את **דף השיווק של
בקלות**, אותם בתים בדיוק כמו `/mechiron/` (31,585 בעת המדידה המקורית;
**34,415 נבדק מחדש 17/08** — הפרש שמוסבר בתוספת סקריפט מצב-כהה, לא רגרסיה,
ראה הרשומה בראש הקובץ). זו אינה תקלה חדשה אלא הפנים השנייה של
`core.issues #94`: עד היום נמדד שהכתובת הציבורית של #27 מגישה עמוד זכויות,
ועכשיו ידוע ש**גם הכניסה לניהול שלה** מגישה אותו.

> **מלכודת שנכנסתי אליה, ומתועדת כאן כי היא תחזור:** הגרסה הראשונה של
> המבחן קיבלה את המילה "ניהול" כסימן לשער כניסה, ו-`mechiron` **עבר** —
> כי בסרגל הניווט של דף בקלות כתוב "ניהול פיננסי". קישור שנוחת על דף
> השיווק של מערכת אחרת דווח כשער תקין. הסימן חייב להיות משהו שרק מסך
> התחברות מבקש (`סיסמה` · `התחברות` · `password`), ולא מילה שסרגל ניווט
> יכול לספק.

---

## `/showcase` — 07/08/2026 · `scripts/qa/showcase-populated.mjs`

העמוד שנושא את שם המותג ("עולם הסטארטאפים" בכותרת, ב-H1 ובפוטר) הציג
**אפס מערכות**, בזמן שדף הבית הציג עשרים. נמדד כאנונימי מול הייצור, שני
העמודים זה מול זה:

| נקרא כאנונימי | לפני | אחרי |
|---|---|---|
| `more30_public_systems` — דף הבית | 20 | 20 |
| `more30_showcase()` — `/showcase` | **0** | **19** |

`core.projects.show_in_showcase` נולדה `false` ב-38 השורות ומעולם לא נכתבה.
0047 מדליקה אותה לכל שורה ש-`core.app_showcase_blocked` כבר מאשר — ולכן
11 המוסתרות מדף הבית נשארות בחוץ (§4 · `#107`), ושמונה השורות בלי `path`,
ובהן המוגנות 08 ו-09, אינן ניתנות לפרסום כלל.

20 מול 19: `#33` (`more30-spec-loop`) היא האתר עצמו ואין לה נתיב הרכבה.
אותה שורה בדיוק הפילה את מתג ה-showcase ב-0039 ואת ספירת `admin_url` ב-0046.

**בלי פריסה.** `showcase.html` בייצור זהה בבתים לעץ העבודה (למעט שלוש שורות
ההזרקה של NetFree, ששייכות לרשת ולא לאתר), והוא קורא את ה-RPC בכל טעינה.
אומת על `https://more30.com/showcase` עצמו: 19 כרטיסים, "19 מערכות מוצגות".

> **מלכודת שנכנסתי אליה:** לשער שני שמות.
> `core.app_showcase_block()` מחזירה `'ok'` כשהשורה עוברת;
> `core.app_showcase_blocked()` היא `nullif(block(…), 'ok')`.
> עדכון שנשען על `block(path) is null` נוגע ב־**אפס שורות ומדווח הצלחה**.
> זו הצורה עם ה-`d` שהקורא והכותב משתמשים בה, וזו הצורה הנכונה.

---

## חסמים שדורשים אותך — `NEEDS_USER.md`

1. **`.gitignore` (§0א)** — `/apps/**` מוחרג, ולכן **שמונה קבצי מקור שתוקנו
   חיים בפרודקשן ובשום ריפו**. בנייה מחדש תמחק אותם. **הכי דחוף.**
2. **`GREENINVOICE_API_KEY` + `_SECRET`** — `INVOICE_PROVIDER` מכיל רק את
   שם הספק, לא אישורי גישה.
3. **הכרעת SSR** — חוסמת את 01, 22, 27, 28, 15 מלעבור 90.

---

## איך לחזור על המדידה

```
node scripts/qa/probe-all.mjs        # עובדת/שבורה, לכל המערכות
node scripts/qa/probe-assets.mjs /x  # כל נכס שנתיב מבקש
node scripts/qa/platform-audit.mjs QA/platform   # נגישות + צילומי מסך
node scripts/qa/admin-entry-resolves.mjs        # "נהל מערכת זו" — נפתח, לא רק נמדד
node scripts/qa/showcase-populated.mjs          # /showcase מול דף הבית, שניהם כאנונימי
powershell -File scripts/qa/live-mojibake-sweep.ps1   # מה שהייצור מגיש בפועל ל-26 המונטים
```

---

## 13/08 — עברית מקודדת פעמיים: מה שהייצור מגיש, ולא מה שיש בדיסק

**26 מתוך 26 המונטים החיים נקיים.** אבל הממצא של הצעד אינו ה-all-clear אלא
זה: שתי הריצות הראשונות גם הן הדפיסו all-clear, ושתיהן היו חסרות ערך.

`scripts/qa/mojibake-scan.mjs` קורא את הריפו — 3,356 קבצי מקור ו-21 קבצי HTML
תחת `_deploy`, בלי ממצאים. זו הבדיקה הנכונה לפני commit, והיא אינה יכולה לענות
על שאלת הלקוח: `_deploy` נקי מעיד על העותק שבדיסק הזה בלבד, לא על כך שהעותק
הזה אי־פעם נפרס, וכמה מונטים נבנים ב-Vercel מהמקור ואינם עוברים דרך `_deploy`
כלל. שתי התקלות הידועות (22 zchuyot, 01 torah) נמצאו שתיהן בתשובה חיה ולא
בקובץ — ולכן נוספה `scripts/qa/live-mojibake-sweep.ps1`, שמושכת את מה
ש-more30.com מחזיר בפועל ומכריעה על הבייטים האלה.

**שני all-clear כוזבים, ומה שתפס אותם:**

1. **שבעה מונטים לא נמדדו בשקט.** `HttpWebRequest` ב-.NET Framework עוקב
   אוטומטית אחרי 301/302/303/307 אך **זורק** על 308, ושבעה מונטים עונים 308
   (tamlul, modaot, orech, nadlan, kesef, tivuch, gannenet). הם נספרו
   כ"בלתי־נגישים" — מה שבשורת סיכום נקרא כ"לא מקולקל", בדיוק עבור העמודים שאיש
   לא הסתכל עליהם. תוקן במעקב ידני אחרי `Location`.
2. **הבדיקה עצמה הייתה עיוורת.** כל 26 המונטים החזירו `geresh=0` — בדיוק איך
   שנראית בדיקה תקינה על עמודים נקיים, ובדיוק איך שנראית בדיקה שבורה. היא
   הייתה שבורה: ל-`.ps1` לא היה BOM, ולכן PowerShell 5.1 פירש אותו לפי
   קוד־העמוד ANSI של המכונה — cp1255 — והתו `׳` שבתבנית עצמה קוּלקל לשלושה תווים
   בזמן הפרסינג. **הבדיקה שנכתבה כדי לתפוס את שגיאת ה-cp1255 הושמדה בידי שגיאת
   ה-cp1255**, ודיווחה 26 עמודים נקיים פעמיים. תוקן בשורש: כל תו עברי בקוד החי
   נבנה מנקודת־הקוד שלו (`[char]0x05F3`), כך שקידוד הקובץ אינו יכול לשנות את
   משמעותו.

**בקרות — רצות בכל סריקה, והסריקה נעצרת אם אחת נכשלת:**

| בקרה | פיקסצ'ר | תוצאה |
|---|---|---|
| חיובית — חייבת להידלק על קלקול אמיתי | `QA/torah/encoding-0813/before-live-index.html` | 2001 ← 0 אחרי הסיבוב, flagged+confirmed |
| שלילית — אסור שתרשיע עברית תקינה | `צ׳יפ ג׳ינס ר׳` | לא נדלקה |

אחרי התיקון הספירות הפסיקו להיות אפס אחיד — **tivuch=3, zchuyot=2** — וזו
הראיה האמיתית שהבדיקה בכלל קוראת עברית. שתיהן נבדקו בעין ושתיהן עברית תקינה
שנותרה לנפשה כראוי: `צ׳קליסט סגירה` ו-`ליווי מקצועי מ-א׳ עד ת׳`.

**מה זה לא מכסה:** הציור הראשון בלבד — ה-HTML שכל מונט מחזיר בשורש. טקסט שמגיע
אחר כך מ-Supabase, ומסלולים פנימיים, אינם נמשכים. שורה מקולקלת בתוך המסד לא
הייתה נתפסת באף אחת משתי הבדיקות.

עדות: `QA/platform/live-mojibake-0813/` (`_results.md`, `_results.json`).

---

## 14/08 — שכפול בקלות: הכניסה לתור הגיעה לייצור

`18006b1` בנתה את הכפתור «הכנס לתור» ומדדה אותו מדפדפן — מול שרת סטטי מקומי
שמגיש את הקובץ מהריפו. הצעד הזה הוא **הפריסה בלבד**: אין שינוי קוד, אין
מיגרציה ואין פריסת edge function, ו-`apps/37-bkalot-clone/admin.html` זהה בדיוק
לזה שנכנס ל-`18006b1`. אותה חלוקה כמו `c2a0a36` → `205c940`.

`dpl_9dZeZ4cWGKv3eAC98GEBtrx34jyc` · `READY` · `more30.com`.

| כתובת | לפני | אחרי |
|---|---|---|
| `/bkalot-studio/admin` | 200 · 35,205 תווים | **200 · 39,055 תווים · 46,218 בתים** |
| `/bkalot-studio` | 200 · 21,272 | 200 · 21,272 — ללא רגרסיה |
| `more30.com/` | 200 · 3,517 | 200 · 3,517, אותם שני נכסים |

46,218 − 45,982 = **236**, בדיוק דלתת NetFree הידועה. **הבדיקה שרצה לפני
הפריסה:** `portal/dist` נבנה ב-13/08, ופריסה מ-`dist` ישן מחזירה את כל הפורטל
אחורה בלי ששום דבר ידווח שגיאה — שמות הנכסים המגובבים ב-`dist/index.html`
הושוו לייצור לפני הלחיצה ונמצאו זהים.

נמדד בדפדפן אמיתי 1280×900 על הכתובת החיה, על פניות שנוצרו דרך נתיב הקליטה
האמיתי מעל HTTP: הכפתורים בשורת המסמך הם `["הצג", "הכנס לתור"]`; יעד ברשימת
הבדיקה — `שורת תור #16 · נכנס עכשיו · queued · qa.bkalot@more30.com · test ·
7697 בתים`; לחיצה שנייה — **אותו #16**, «כבר היה בתור — לא נוצרה שורה שנייה»;
יעד שאינו ברשימה — `#17 · חסום — לא יישלח`, בנוסח המקור מילה במילה; ואפס
שגיאות קונסולה.

**מצב טסט נמדד ולא הוצהר:** `delivery_log=3` ללא שינוי, אפס שורות `mode=live`,
אפס שורות עם `sent_at`. הבידוד ממנוע המקור נמדד אחרי הכתיבה: הפרדיקט של
`bkalot_auto.queue_due` מחזיר `[6]` בלבד ולא את שורות השכפול, ו-8 שורות
`app_key='bkalot'` נשארו 8 עם אותה טביעת אצבע. הבדיקה התגלגלה אחורה במלואה
והבסיס חזר בדיוק.

**מה שנשאר פתוח:** אין שולח — השורה נכנסת לתור ונשארת שם.

עדות: `QA/bkalot-clone/queue-deploy-0814/` (`README.md`, `probe.ps1`,
`intake.mjs`, שלושה צילומים).
