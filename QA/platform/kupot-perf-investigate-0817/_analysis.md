# קופות חולים (28, /kupot) — סבב-2 (פרפורמנס), הבא אחרי mechiron(27) לפי ROUTES

Baseline (`QA/platform/kupot-perf-investigate-0817/_lighthouse.json`, נמדד 2026-08-17):
performance 54, accessibility 100, bestPractices 77, seo 100.

## הגופנים כבר תוקנו
`apps/28-kupot-health-funds/client/index.html` כבר נושא את תבנית ה-loadCSS
(`rel="stylesheet" media="print" onload="this.media='all'"` + `<noscript>`
fallback) לשני הגופנים (Assistant, Heebo) — עם הערת קוד מפורשת שמסבירה שהוחלט
כך כי הגיליון היה חוסם (300ms render-blocking, 630ms font-display) ו-NetFree
חוסמת את `fonts.googleapis.com` לסירוגין ברשת הזו. `render-blocking-insight`
כיום מדווח רק **180ms** חיסכון משוער — שיפור אמיתי מול המערכות שעדיין לא
תוקנו (1,000–2,500ms), אין כאן עוד תיקון גופנים לבצע.

## מה שנשאר לא-מוסבר
`mainThreadBreakdown`: `Other` 2296ms, `Style & Layout` 1814ms, `Script
Evaluation` רק 1314ms. `bootupTime` לפי סקריפט: הבאנדל העצמי
(`index-DbBm6hnF.js`) 1024ms סה"כ / 803ms scripting — עלות first-party
אמיתית, אבל לא סקריפט-יחיד-דומיננטי שמצדיק תיקון חד-קובץ (בניגוד ל-egod
שם באנדל יחיד היה פי 13 מ-auth-button.js). `unused-javascript` מדווח 106
KiB חיסכון משוער — מצביע על code-splitting/tree-shaking, לא על גיליון
חוסם יחיד. זו עבודת קוד נפרדת וגדולה יותר (Vite+React, כמו egod/chizukim),
לא תוקנה בצעד הזה.

אין שינוי קוד/פריסה בצעד הזה — השוואת מקור מול הראיות הקיימות בלבד.
הבא בסבב-2 (ROUTES אחרי kupot): `crm`.
