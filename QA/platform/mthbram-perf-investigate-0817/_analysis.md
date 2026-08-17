# 21 mthbram — perf investigation (17/08, סבב-2)

Baseline (SYSTEMS_STATUS.md, 17/08 קודם): perf 45, לא נחקר עדיין.
מדידה חוזרת עכשיו: **perf 36** · a11y 100 · bp 77 · seo 100.
FCP 8.5s · LCP 9.2s · TBT 810ms · SI 22.1s · TTI 12.0s.

## מה זה לא
- אין Google Fonts כלל — לא `<link>` ב-`index.html`, לא `@import` ב-`src/`.
  דפוס ה-loadCSS שכבר תוקן ב-01/02/03/04/06/10/12/32 לא רלוונטי כאן.
- `render-blocking-insight` (Est savings 1,910ms) הוא ה-CSS/JS המובנים
  עצמם — אותה קטגוריה כמו egod/chizukim/smachot (Vite bundle סינכרוני),
  לא משאב חיצוני.

## הממצא
`apps/21-mthbram/dist/assets/`:
- `index-ikOh19CR.js` — **1,650,785 בייטים** (1.6MB לא-דחוס) — bundle יחיד,
  ללא code splitting. גדול משמעותית מ-galil לפני הפיצול (981KB).
- `index-CpyDKzc4.css` — 129,898 בייטים.
- `unused-javascript`: Est savings 341 KiB — תואם bundle יחיד לא-מפוצל.
- `mainThreadBreakdown`: Other 1998ms, Style & Layout 1220ms, Script
  Evaluation 990ms — אין script יחיד דומיננטי (בניגוד ל-egod), העבודה
  מפוזרת על כל הקטגוריות, תואם bundle גדול ולא code-split.
- `bootupTime`: `index-ikOh19CR.js` עצמו רק 1240ms total/554ms scripting —
  לא חריג לגודלו; ה-9.2s LCP וה-22.1s SI מוסברים בעיקר ע"י ה-load+parse
  של קובץ 1.6MB לפני שרנדר ראשון קורה.

## מסקנה
דורש **route-level code splitting** (כמו galil, `24 גליל קונקט`) —
lazy-load של מסכים לפי route כדי לפצל את ה-1.6MB לחתיכות קטנות יותר.
זו עבודת קוד נפרדת וגדולה מ"צעד אחד", ובגליל שיפור דומה נתן רק שיפור
חלקי (36→40, לא עבר את 90) — כך שהתוחלת כאן היא גם שיפור חלקי, לא תיקון
מלא. אין שינוי קוד/פריסה בצעד הזה — מדידה/חקירה/תיעוד בלבד, לפי אותו
דפוס כמו egod/chatzor/chizukim.

הבא בסבב-2 (פרפורמנס, בסדר המערכות): `zchuyot` (הבא ברשימת `ROUTES` אחרי
`mthbram`).
