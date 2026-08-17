# 22 zchuyot — perf investigation (17/08, סבב-2)

Baseline (SYSTEMS_STATUS.md, מדידת a11y מוקדמת יותר היום): perf 65, לא נחקר עדיין.
מדידה חוזרת עכשיו: **perf 43** · a11y 100 · bp 77 · seo 100.
FCP 3.3s · LCP 4.1s · TBT 1,920ms · SI 13.1s · TTI 8.5s.

## מה זה לא
- Google Fonts (Rubik) כבר נושא את תבנית ה-loadCSS (`media="print"` +
  `onload`) ב-`apps/22-get-your-rights/index.html` — תוקן בעבר, אין תיקון
  חדש כאן. `render-blocking-insight` Est savings רק 290ms — לא הגורם
  הדומיננטי.

## הממצא
`bootupTime` על `https://more30.com/zchuyot`:
- `assets/motion-B5vKfmr5.js` — **3,930ms total** (878ms scripting, השאר
  "Other"/רינדור) — chunk נפרד של `framer-motion`, אותו ספרייה וגם אותו
  דפוס בדיוק כמו `16 חצור קונקט` (chatzor, לילה-כח).
- המסמך עצמו (`https://more30.com/zchuyot`) — 4,727ms total, scripting
  זניח (86ms) — עבודת רינדור/layout, לא JS.
- `mainThreadBreakdown`: Other 4779ms, Style & Layout 3669ms, Script
  Evaluation 2133ms, Rendering 903ms — פיזור דומה ל-chatzor (רינדור/layout
  דומיננטי, לא script יחיד).
- `forced-reflow-insight` נכשל (score 0) — תואם עבודת layout כבדה, לא
  NetFree חוסם.
- `third-party-cookies` נכשל (1 עוגיה) — NetFree, לא תלוי-קוד (מתועד כבר
  ב-28/16 וכו').

## מסקנה
דורש דחיית טעינת האנימציות (`framer-motion`) ל-lazy/lazy-mount אחרי
האינטראקטיביות הראשונית — **אותו תיקון בדיוק שנדרש ל-16 חצור קונקט**,
עבודת קוד נפרדת וגדולה מ"צעד אחד". אין שינוי קוד/פריסה בצעד הזה —
מדידה/חקירה/תיעוד בלבד. ראיות: `_lighthouse.json`.

Supabase MCP אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
`_heartbeat-pending.sql`.

הבא בסבב-2 (פרפורמנס, בסדר המערכות): `galil` כבר טופל קודם (code splitting
מ-ba36ea0, לילה שלפני תחילת סבב-2 האות-מסודר) — לא חלק מרצף האותיות. הבא
בפועל: `studio` (הבא ברשימת `ROUTES` שטרם נמדד/נחקר בסבב הזה).
