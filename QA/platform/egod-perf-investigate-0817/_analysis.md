# 15 איגוד (egod) — חקירת פרפורמנס 53 (המשך סבב-2, הבא ב-ROUTES אחרי smachot)

מקור הנתונים: `QA/platform/egod-lh-a11yfix-0817/_lighthouse.json` (נמדד קודם היום,
12:59, אחרי תיקון הנגישות — אין צורך במדידה חדשה, ה-`mainThreadBreakdown` וה-
`bootupTime` המורחבים כבר נשמרו שם).

## למה זה לא אותו דפוס Google Fonts שתוקן ב-01/02/03/04/06/10/12/14
`apps/15-egod/index.html` (המקור) ו-`dist/index.html` (הבנוי) — **אין בו בכלל
קישור ל-fonts.googleapis.com**. אין גופנים חיצוניים חוסמים לתקן.

`render-blocking-insight` מצביע על חיסכון משוער 750ms, אבל המשאב היחיד שחוסם
הוא `<link rel="stylesheet" crossorigin href="/egod/assets/index-Crke-OnG.css">`
— חבילת ה-CSS **המובנית של Vite לכל האפליקציה** (עיצוב מלא: sidebar, כרטיסים,
צבעים). זהה בעקרון ל-`bkalot-theme.css` (שהוחלט במפורש להשאיר סינכרוני כי
"מחוץ לדפוס המתועד") ול-`style.css`/`base.css` של smachot (הוחלט להשאיר
בצעד הקודם) — דחיית עלה טעינה של CSS קריטי-לעימוד-הראשון מסכנת הבזק-לא-מעוצב
(FOUC) בעמוד חי, לא רק חיסכון מדיד. לא נגעתי בזה בצעד הזה — עקבי עם ההחלטה
התיעודית הקיימת.

## הממצא האמיתי: ה-bundle העצמי, לא רעש רשת
בניגוד לחקירת 32 נדל"ן (`QA/platform/nadlan-mainthread-0817`, שם ה-NetFree
proxy היה הגורם הדומיננטי ו-JS העצמי היה זניח) — כאן זה **הפוך**:

`bootupTime` (`_lighthouse.json` → `egod.bootupTime`):
- `index-DtGWwuYa.js` (חבילת ה-React של egod עצמה): **1786ms total, 724ms
  scripting** — הפריט הגדול ביותר ברשימה, פי 13 מ-`auth-button.js` (138ms) ופי
  19 מ-`netfree.link/card-injection.js` (94ms).
- `mainThreadBreakdown`: Script Evaluation 967ms — לא זניח כמו ב-nadlan (660ms
  מתוך 6.9s שם; כאן 967ms מתוך 3.8s, נתח יחסי גדול בהרבה).

`failedAudits` תומכים: `unused-javascript` (חיסכון משוער **179 KiB**),
`unminified-javascript` (6 KiB), `unused-css-rules` (12 KiB), `valid-source-maps`
חסר. אלה כולם מצביעים על bundle גדול/לא-מפוצל, לא על רעש מדידה.

## מסקנה
זו **לא** תקלה שניתן לתקן בצעד קטן כמו תבנית loadCSS (5 דקות, קובץ אחד). זו
עבודת code-splitting/tree-shaking אמיתית על `apps/15-egod` (Vite+React) —
לבדוק אילו תלויות תורמות ל-179 KiB הלא-בשימוש (לדוגמה `recharts`, שנמצא ב-
`node_modules` בסריקה הזו) ולשקול `React.lazy`/dynamic import למסכים לא-קריטיים.
עבודה נפרדת, גדולה מ"צעד אחד" — לא בוצעה כאן. נרשם ל-NEEDS_USER/SYSTEMS_STATUS
כפריט פתוח לסבב הבא. אין שינוי קוד/פריסה בצעד הזה — חקירה/תיעוד בלבד.

הבא בסבב-2 (פרפורמנס, בסדר `ROUTES`): `chatzor` (הבא אחרי `egod`).
