# 27 מחירון (mechiron) — פרפורמנס: נחקר ותוקן שורש Google Fonts render-blocking

המשך סבב-2 (פרפורמנס, בסדר `ROUTES` ב-`scripts/qa/lighthouse-run.mjs`) — הבא
אחרי `studio`.

## מדידה ראשונית (baseline)
`node scripts/qa/lighthouse-run.mjs QA/platform/mechiron-perf-investigate-0817
mechiron` מול `https://more30.com/mechiron` החי — perf **55** (a11y 100, כבר
תוקן בסבב הקודם).

## הממצא
`apps/27-bkalut-price/client/index.html` טען Google Fonts (Heebo + Frank Ruhl
Libre) דרך `<link rel="stylesheet" href="fonts.googleapis.com/css2?...">`
סינכרוני ישירות ב-`<head>` — אותה משפחת תקלה שכבר נמצאה ותוקנה ב-
01/02/03/04/06/10/12/32. `render-blocking-insight` מדד חיסכון משוער 640ms.

`mainThreadBreakdown` (4.0s total): Style & Layout 1421ms, Other 1343ms,
Script Evaluation רק 796ms. `bootupTime` מפרק את ה-Script Evaluation: הבאנדל
העצמי (`index-BklrIJk7.js`) — רק 339ms total / 296ms scripting. `auth-button.js`
— 253ms/41ms בלבד. שני סקריפטי NetFree (`card-injection.js`,
`go-payment.js`) — יחד רק 215ms. שום סקריפט בודד לא מסביר את ה-4s — תואם את
הדפוס שכבר תועד ב-32 נדל"ן/15 איגוד: הגורם הוא Style & Layout/רינדור, לא JS
כבד, אבל **בניגוד** ל-egod/chatzor/zchuyot כאן יש גם ממצא בר-תיקון קונקרטי
(ה-Google Fonts render-blocking), אז תוקן.

## התיקון
`apps/27-bkalut-price/client/index.html`: הוחלף ה-`<link rel="stylesheet">`
הסינכרוני בתבנית loadCSS (`rel="preload" as="style"` + `media="print"
onload="this.media='all'"` + `<noscript>` fallback) — זהה בדיוק לתבנית ב-12
smel. `vite build` מקומי (`apps/27-bkalut-price`, base כבר `/mechiron/`),
robocopy ל-`_deploy/mechiron-more30/public/mechiron` (`/MIR`, 18 קבצים),
`vercel deploy --prod` (`dpl_E32no47ap7Jam5781GrRy4hn9Dgf`, READY, alias
`mechiron-more30.vercel.app`). אומת חי ב-`more30.com/mechiron` עם
cache-buster — ה-`<link rel="preload" as="style">` החדש נוכח ב-HTML
המורנדר.

## נמדד אחרי
`QA/platform/mechiron-lh-fontfix-0817/_lighthouse.json` — perf **53**
(55→53, בתוך רעש המדידה, אותו דפוס בדיוק כמו 10 bkalot ו-12 smel: שורש
התקלה תוקן אך הציון הכולל לא עלה). `render-blocking-insight` עדיין נכשל
(Est savings 1,050ms) — עכשיו נגד ה-`<link rel="stylesheet">` השני בעמוד,
`bkalot-theme.css` מ-Supabase Storage (Global Design Tokens, לא תוקן בצעד
הזה — משותף למספר מערכות, סיכון גבוה יותר לשנות).

**מסקנה:** שורש הפונטים תוקן ופרוס. הציון עדיין מתחת לסף 90 — התיקון הבא
האפשרי (טעינת `bkalot-theme.css` הלא-חוסמת) הוא משימה נפרדת שחוצה מערכות,
לא חלק מהצעד הזה.

הבא בסבב-2 (ROUTES): `kupot`.
