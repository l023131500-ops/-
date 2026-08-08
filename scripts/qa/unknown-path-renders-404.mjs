/**
 * §4 — כתובת שאין מאחוריה מערכת אומרת שהיא לא קיימת (באג #119).
 *
 * הצעד הקודם (unknown-path-serves-home.mjs) מדד את ה-HTML הגולמי ומצא שתשע
 * כתובות בלי מערכת חוזרות בייט-בבייט כדף הבית עם 200. זו הייתה מדידה נכונה
 * וחצי-תמונה: הפורטל הוא SPA, ולכן **כל** כתובת מקבלת את אותו קליפה של 2,955
 * בייט — גם /, גם /events. מה שקובע מה המבקר רואה הוא מה שמצויר אחרי הטעינה,
 * וזה מה שנמדד כאן, בדפדפן אמיתי.
 *
 * מה תוקן: App.tsx מצייר עמוד "הכתובת הזו לא נמצאה" ממותג לכל נתיב שאינו
 * מערכת מוכרת ואינו עמוד של הפורטל עצמו, ומוסיף לו meta robots=noindex.
 *
 * ⚠️ הסטטוס עצמו נשאר 200. rewrite של Vercel אינו יכול להחזיר קוד אחר לעמוד
 * SPA, ולכן `noindex` הוא מה שמונע מגוגל לאנדקס את אותו עמוד תחת עשרות
 * כתובות. סטטוס 404 אמיתי דורש להחליף את ה-rewrites ב-routes — צעד נפרד.
 *
 * הבדיקה רצה מול כל בסיס: התצוגה המקומית (`npx vite preview --port 4188`
 * בתוך portal/, אחרי build) או הייצור אחרי פריסה.
 *
 *   node scripts/qa/unknown-path-renders-404.mjs [base-url]
 */
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'http://localhost:4188').replace(/\/$/, '');

// core.projects, 08/08/2026 — נתיב מוכרז שאינו חי. אין להם rewrite, ולכן הם
// נופלים ל-catch-all ומגיעים ל-SPA גם בייצור.
const DECLARED_DEAD = ['bkalot-studio', 'events', 'financial', 'igud', 'shiurim', 'zol'];
// כתובות שאיש לא הכריז עליהן — טעות הקלדה, קישור שבור, סורק.
// ⚠️ 'admin-pricing/' עם לוכסן בכוונה, וכך גם נמדד בייצור: Vercel בודק את
// מערכת הקבצים לפני ה-rewrites, ולכן /admin-pricing (בלי לוכסן) מוצא את
// dist/admin-pricing.html ומגיש מסך לוח אמיתי — לא מקרה של כתובת חסרת מערכת.
const INVENTED = ['zmanim', 'no-such-system-at-all', 'admin-pricing/'];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const browser = await chromium.launch();
const page = await browser.newPage();

/** מה מצויר בפועל, אחרי שה-SPA סיים לקרוא את המערכות מ-Supabase. */
async function render(path) {
  const res = await page.goto(`${BASE}/${path}`, { waitUntil: 'networkidle' });
  return {
    status: res?.status() ?? 0,
    ...(await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      notFound: !!document.querySelector('.soon'),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
      cards: document.querySelectorAll('.card').length,
    }))),
  };
}

console.log(`=== §4 · מה מצויר בכתובת שאין מאחוריה מערכת ===`);
console.log(`    בסיס: ${BASE}\n`);

// ── 1. הבקרה: דף הבית עדיין דף הבית
const home = await render('');
ok(`דף הבית מצייר את רשימת המערכות (${home.cards} כרטיסים)`,
   home.cards > 0 && !home.notFound,
   home.notFound ? 'דף הבית עצמו הוכרז כלא-נמצא' : 'לא נמצאו כרטיסים');

// ── 2. הבקרה השנייה: נתיב של מערכת חיה לא מוכרז כלא-קיים
const live = await render('nadlan');
ok('/nadlan (מערכת חיה) אינו מוכרז כלא-נמצא', !live.notFound || live.h1.includes('לא נמצאה') === false,
   'מערכת חיה קיבלה עמוד לא-נמצא');

// ── 3. התיקון עצמו
console.log('\n— כתובת שאין מאחוריה מערכת —\n');
for (const p of [...DECLARED_DEAD, ...INVENTED]) {
  const r = await render(p);
  const label = DECLARED_DEAD.includes(p) ? 'מוכרז, לא חי' : 'בדוי';
  ok(`/${p} (${label}) אומר שאינו נמצא`, r.notFound && r.h1.includes('לא נמצאה'),
     `נמצא במקום זה: "${r.h1}"`);
  ok(`/${p} מסומן noindex`, r.robots.includes('noindex'),
     r.robots ? `robots="${r.robots}"` : 'אין meta robots — הכתובת ניתנת לאינדוקס');
}

await browser.close();
console.log(`\n${pass} passed · ${fail} failed`);
console.log('הסטטוס נשאר 200 לפי מגבלת rewrite של Vercel — ראו את ההערה בראש הקובץ.');
process.exit(fail ? 1 : 0);
