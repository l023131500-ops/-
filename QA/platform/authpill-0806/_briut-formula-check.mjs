// אימות הנוסחה המתוקנת בלי פריסה.
//
// מכסת הפריסות היומית של Vercel נגמרה (api-deployments-free-per-day), ולכן
// ה-CSS המתוקן לא יכול להגיע לייצור בריצה הזו. במקום להצהיר שהוא נכון,
// טוענים את העמוד החי ומחליפים בדפדפן **רק** את ההצהרה הזו — כל השאר נשאר
// הייצור האמיתי: אותו HTML, אותו כדור, אותו --more30-auth-inset שנמדד בזמן
// ריצה. מה שנמדד כאן הוא הנוסחה, לא סביבה מדומה.
import { chromium } from 'playwright-core';
import { settle } from '../../../scripts/qa/lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const FIXED = 'max(clamp(16px,4vw,32px), calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - var(--max)) / 2)))';

const b = await chromium.launch({ executablePath: EXE, headless: true });
for (const width of [390, 834, 1100, 1280, 1440]) {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto('https://more30.com/briut', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(p, { minChars: 40 });

  const r = await p.evaluate((fixed) => {
    const inner = document.querySelector('.header-inner');
    const measure = () => {
      const cs = getComputedStyle(inner);
      const ir = inner.getBoundingClientRect();
      // הפריט האינליין-סופי בנווט — בעברית, השמאלי ביותר.
      const links = [...inner.querySelectorAll('a')].map((n) => n.getBoundingClientRect()).filter((q) => q.width);
      const left = links.reduce((a, q) => (!a || q.left < a.left ? q : a), null);
      const hit = left && document.elementFromPoint(left.left + 2, left.top + left.height / 2);
      return {
        pad: cs.paddingInlineEnd,
        contentStart: Math.round(ir.left + Math.min(parseFloat(cs.paddingLeft), parseFloat(cs.paddingRight) || Infinity)),
        lastItem: left && `x ${Math.round(left.left)}..${Math.round(left.right)}`,
        // הנקודה הקריטית היא הקצה של הפקד, לא מרכזו: שם החפיפה מתחילה.
        edgeHit: hit ? hit.tagName.toLowerCase() : null,
      };
    };
    const before = measure();
    inner.style.setProperty('padding-inline-end', fixed);
    const after = measure();
    return {
      inset: getComputedStyle(document.documentElement).getPropertyValue('--more30-auth-inset').trim(),
      before,
      after,
    };
  }, FIXED);

  const ok = r.after.edgeHit !== 'more30-auth';
  console.log(
    `@${width}  inset=${r.inset}\n` +
    `   live   pad=${r.before.pad.padEnd(6)} last-item ${String(r.before.lastItem).padEnd(16)} edge-click→${r.before.edgeHit}\n` +
    `   fixed  pad=${r.after.pad.padEnd(6)} last-item ${String(r.after.lastItem).padEnd(16)} edge-click→${r.after.edgeHit}   ${ok ? 'CLEAR' : 'STILL COVERED'}`
  );
  await p.screenshot({ path: `QA/platform/authpill-0806/briut-${width}-formula-fixed.png`, clip: { x: 0, y: 0, width, height: 90 } });
  await ctx.close();
}
await b.close();
