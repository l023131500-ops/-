# 16 חצור קונקט (chatzor) — חקירת פרפורמנס 41 (המשך סבב-2, הבא ב-ROUTES אחרי egod)

מקור הנתונים: `QA/platform/chatzor-lh-0817/_lighthouse.json` (נמדד עכשיו — מסלול
`chatzor` = `/chatzor` מעולם לא נמדד בנפרד קודם; רק `chatzor-app` = `/chatzor/`
נמדד ב-`chatzor-app-lh-0817`). **פרפורמנס 41 · נגישות 100 · Best Practices 77 ·
SEO 100**.

## למה זה לא דפוס Google Fonts שתוקן ב-01/02/03/04/06/10/12/14
`apps/16-chatzor-connect/index.html` **כבר** נושא את תבנית ה-loadCSS
(`media="print" onload="this.media='all'"` + `<noscript>` fallback) — תוקן
בעבר, ואף מתועד בהערת קוד בקובץ עצמו שה-NetFree חוסמת את fonts.googleapis.com
לסירוגין. אין כאן תיקון חדש לבצע.

## למה זה גם לא דפוס NetFree/bundle כמו chatzor-app או egod
`render-blocking-insight` עדיין מראה חיסכון משוער 740ms, אבל `bootupTime`
מראה תמונה שונה מכל חקירה קודמת: הפריט הגדול ביותר הוא **המסמך עצמו**
(`https://more30.com/chatzor`, total **13114ms**, scripting זניח — 21ms), לא
סקריפט. ה-JS (`motion--tJVryAK.js` 768ms, `react-NN3IinNy.js` 710ms,
`auth-button.js` 162ms, `netfree.link/card-injection.js` 124ms) כולו קטן
בהשוואה.

`mainThreadBreakdown` תומך: **Other 7394ms, Rendering 4307ms, Style & Layout
3200ms** — מול Script Evaluation 1177ms בלבד. זה לא JS כבד ולא NetFree חוסם —
זו עבודת רינדור/layout כבדה על ה-thread הראשי (`forced-reflow-insight` גם
מסומן). `server-response-time` (880ms) ו-`document-latency-insight` תורמים
תוספת, אבל לא מסבירים 13s.

זה תואם את מה שכבר תועד בשורת הסטטוס הקיימת של chatzor (02/08: "פרפורמנס
מתחת לסף 90 — framer-motion+@hebcal/core בטעינה ראשונית") — `motion` (framer-
motion) בטעינה ראשונית גורם לעבודת רינדור/אנימציה כבדה לפני האינטראקטיביות,
לא רק גודל bundle.

## מסקנה
זו לא תקלה שניתן לתקן בצעד קטן כמו תבנית loadCSS (קובץ אחד, 5 דקות). התיקון
האמיתי — דחיית טעינת `framer-motion`/אנימציות ל-lazy/lazy-mount אחרי
האינטראקטיביות הראשונית, או הסרת אנימציות מהמסך הראשון — עבודת קוד נפרדת
וגדולה מ"צעד אחד" על `apps/16-chatzor-connect`. לא בוצעה כאן. אין שינוי
קוד/פריסה בצעד הזה — חקירה/תיעוד בלבד.

הבא בסבב-2 (פרפורמנס, בסדר `ROUTES`): `chizukim` (הבא אחרי `chatzor` ו-
`chatzor-app`, ששניהם כבר נמדדו/נחקרו).
