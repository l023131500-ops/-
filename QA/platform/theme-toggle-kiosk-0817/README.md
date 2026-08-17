# 35 KioskFleet — פקד מצב-כהה ידני (POLISH_BACKLOG, 5/5, האחרונה)

## מה נבדק
`https://more30.com/kiosk/console` — הקונסולה, לא `index.html` (עמוד הנחיתה
הציבורי לא נגע בו, מחוץ לתחום המשימה).

## מקור ופריסה
הקונסולה **אינה** נבנית מהמונורפו הזה. Railway `kioskfleet` בונה מ-
`l023131500-ops/zol`, ענף `claude/what-do-you-see-gxo5tc`,
`kiosk/server` (זיכרון `kiosk-deploys-from-a-different-repo`). קומיט
ב-`apps/35-kioskfleet` בענף הזה לא היה משנה כלום בפרודקשן.

התיקון בוצע דרך GitHub Contents API ישירות מול `zol`: GET
`kiosk/server/public/console.html` (sha `cc4bda4`), פאץ' מקומי, PUT חזרה
עם אותו sha (commit `3633728` על `zol`). קובץ יחיד — לא נגעתי ב-`js/app.js`
(32KB, ה-bundle הראשי) או ב-`css/style.css` המשותף, כדי לצמצם סיכון
(אין תלות טעינה בין קבצים, אין boot-loop אפשרי).

## מה השתנה ב-console.html
1. תסריט ה-boot ב-`<head>` (כבר החיל `.dark` דרך
   `matchMedia("(prefers-color-scheme: dark)")`) עודכן לקרוא קודם
   `localStorage.getItem("kiosk-theme")` — אותה תבנית בדיוק כמו
   02/03/06/10 (`briut-theme`, `tamlul-theme`, `modaot-theme` וכו').
2. כפתור `#themeToggle` (🌙/☀️) נוסף ב-`<body>`, **מחוץ** ל-`#login-view`
   ול-`#app-view` בכוונה — כך שהוא גלוי בשני המסכים גם יחד, בלי תלות
   באיזה מהם מוצג כרגע.
3. מיקום קבוע (`position:fixed`) בפינה הימנית-עליונה — הצד הפיזי הנגדי
   לכדור הכניסה המשותף `<more30-auth>`, שיושב בפינה השמאלית-עליונה גם
   ב-RTL (ראה זיכרון `auth-button-overlaps-navs` ואת ההערה הקיימת בקובץ
   על `--more30-auth-inset`). נמדד ב-1280px: הכפתור ב-`x:1213–1253`,
   כלומר בפינה הנגדית לחלוטין מהצד שבו הפיל נמצא.

## אימות (Playwright, מול הייצור)
| שלב | תוצאה |
|---|---|
| טעינה ראשונית | `#themeToggle` קיים, `🌙`, `isDark:false` |
| קליק | `isDark:true`, `localStorage["kiosk-theme"]="dark"`, רקע `rgb(11,18,32)` |
| רענון (`?cachebust`) | נשאר `isDark:true` בלי הבזק לבן, אייקון `☀️` נכון מהעמסה הראשונה |
| קליק נוסף | `isDark:false`, `localStorage["kiosk-theme"]="light"`, רקע `rgb(245,247,251)` |

צילום: `kiosk-console-dark.png` (מצב כהה, לפני הקליק החוזר לבהיר, 1280×900).

שגיאת קונסולה אחת נצפתה (`WebSocket ... wss://kiosk.more30.com/ws/console
... ERR_NAME_NOT_RESOLVED`) — קיימת מראש, לא קשורה לשינוי הזה (ניסיון חיבור
WS ל-subdomain שלא נמצא DNS, מתוך `js/app.js` שלא נגעתי בו).

## מוגן
לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. לא נגעתי
ב-`js/app.js` או ב-`css/style.css` של הקיוסק. `index.html` (עמוד הנחיתה)
לא נבדק ולא נגעתי בו — מחוץ לתחום.
