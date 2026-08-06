// מדידה נקודתית של החישוב ב-briut: מה --more30-auth-inset מפרסם, מה הכדור
// באמת תופס, ואיפה נגמר תיבת התוכן של הנווט אחרי הריפוד.
import { chromium } from 'playwright-core';
import { settle } from '../../../scripts/qa/lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const b = await chromium.launch({ executablePath: EXE, headless: true });
for (const width of [834, 1100, 1280, 1440]) {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto('https://more30.com/briut', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(p, { minChars: 40 });
  const r = await p.evaluate(() => {
    const inner = document.querySelector('.header-inner');
    const cs = getComputedStyle(inner);
    const ir = inner.getBoundingClientRect();
    const pill = document.querySelector('more30-auth, [id*="more30"], .more30-auth') ||
      [...document.body.children].find((el) => el.tagName.toLowerCase().includes('more30'));
    const pr = pill && pill.getBoundingClientRect();
    const last = [...inner.querySelectorAll('a')].reduce((a, n) => {
      const q = n.getBoundingClientRect();
      return !a || q.left < a.left ? q : a;
    }, null);
    return {
      classes: inner.className,
      parent: inner.parentElement.tagName.toLowerCase() + '.' + inner.parentElement.className,
      inset: getComputedStyle(document.documentElement).getPropertyValue('--more30-auth-inset').trim(),
      padInlineEnd: cs.paddingInlineEnd,
      innerBox: `x ${Math.round(ir.left)}..${Math.round(ir.right)}`,
      contentStartsAt: Math.round(ir.left + parseFloat(cs.paddingLeft)),
      pillTag: pill && pill.tagName.toLowerCase(),
      pillBox: pr && `x ${Math.round(pr.left)}..${Math.round(pr.right)}`,
      leftmostLink: last && `x ${Math.round(last.left)}..${Math.round(last.right)}`,
    };
  });
  console.log(`@${width}  ` + JSON.stringify(r));
  await ctx.close();
}
await b.close();
