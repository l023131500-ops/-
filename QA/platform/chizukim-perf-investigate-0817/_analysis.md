# 17 תמלול חיזוקים (chizukim) — חקירת פרפורמנס 55-67/78 (המשך סבב-2, הבא ב-ROUTES אחרי chatzor/chatzor-app)

מקור הנתונים: `_lighthouse.json` באותה תיקייה (נמדד 21:44, `node
scripts/qa/lighthouse-run.mjs QA/platform/chizukim-perf-investigate-0817 chizukim`
מול `https://more30.com/chizukim`) + `QA/platform/chizukim-lh-0817/_lighthouse.json`
(מדידה ראשונה מוקדם יותר היום, 67/78).

## למה זה לא דפוס Google Fonts שתוקן ב-01/02/03/04/06/10/12
`apps/17-chizukim-transcribe/client/index.html` **כבר** נושא את תבנית ה-loadCSS
(`media="print" onload="this.media='all'"`) — תוקן בעבר, אין תיקון חדש כאן. אושר
זהה גם ב-`dist/public/index.html` (עותק הבנוי).

## הממצא: ה-CSS המובנה של Vite חוסם, לא הגופנים — אותו דפוס כמו egod/smachot/bkalot
`render-blocking-insight` (score 0.5) מצביע על המשאב החוסם היחיד:
`<link rel="stylesheet" crossorigin href="/chizukim/assets/index-CGr9WgHf.css">` —
חבילת ה-CSS המובנית של האפליקציה (Tailwind + עיצוב מלא). זהה בעקרון ל-
`bkalot-theme.css`, ל-`style.css`/`base.css` של smachot ול-CSS העצמי של egod —
בכולם הוחלט במפורש להשאיר סינכרוני כדי לא לסכן הבזק-לא-מעוצב (FOUC) בעמוד חי.
לא נגעתי בזה כאן — עקבי עם ההחלטה התיעודית הקיימת.

## הבדל מ-egod: אין bundle-JS דומיננטי יחיד
`bootupTime`: "Unattributable" 789ms (98 scripting) גדול כמעט כמו ה-bundle העצמי
`index-D7kweJQx.js`/`index-B3-SjNVo.js` (503ms total, 436ms scripting). לא כמו
egod (bundle עצמי פי 13-19 מכל דבר אחר) — כאן העבודה מפוזרת:
`mainThreadBreakdown` 2.4s מתחלק Other 919ms / Script Evaluation 689ms / Style &
Layout 578ms, בלי קטגוריה אחת דומיננטית. `unused-javascript` (60 KiB) ו-
`unused-css-rules` (10 KiB) קטנים משמעותית מ-egod (179 KiB / 12 KiB) — לא סימן
ל-bundle לא-ממוצה שדורש code-splitting דחוף.

## מסקנה
אין ממצא חדש לתקן: הגופנים כבר מתוקנים, ה-CSS העצמי מוגן מסיבת FOUC (החלטה
קיימת), וה-bundle העצמי לא דומיננטי מספיק כדי להצדיק עבודת code-splitting
כמו egod. הציון הנמוך/הרועש (55-78, מתחת לסף 90) תואם את דפוס רעש-המדידה/
NetFree שכבר מתועד ב-32/10/06/04/02/12/14/15/12(smel) — לא עבודה חדשה כאן. אין
שינוי קוד/פריסה בצעד הזה — חקירה/תיעוד בלבד.

`server-response-time` (score 0, ~1,100-1,180ms) תואם גם הוא את דפוס המדידה
המקומית שכבר נחקר ונסגר במערכות אחרות (ראה NEEDS_USER).

הבא בסבב-2 (פרפורמנס, בסדר `ROUTES`): `orech` (הבא אחרי `chizukim`/`chizukim-app`,
ששניהם כבר נמדדו/נחקרו).
