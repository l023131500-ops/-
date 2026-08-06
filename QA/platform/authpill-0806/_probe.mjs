import { chromium } from 'playwright-core';
import { settle } from '../../../scripts/qa/lib/settle.mjs';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const b = await chromium.launch({ executablePath: EXE, headless: true });
for (const [key, url] of [['orech','https://more30.com/orech'],['smachot','https://more30.com/smachot']]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(p, { minChars: 40 });
  const info = await p.evaluate(() => {
    const link = document.querySelector('.more30-credit');
    const box = link && link.parentElement;
    const kids = [...document.body.children].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''), pos: cs.position, display: cs.display,
               rect: `y ${Math.round(r.top)}..${Math.round(r.bottom)} x ${Math.round(r.left)}..${Math.round(r.right)}` };
    });
    const r = box.getBoundingClientRect();
    return { bodyDisplay: getComputedStyle(document.body).display, bodyH: Math.round(document.body.getBoundingClientRect().height),
             creditRect: `y ${Math.round(r.top)}..${Math.round(r.bottom)} x ${Math.round(r.left)}..${Math.round(r.right)}`, kids };
  });
  console.log('=== ' + key + ' ===');
  console.log(JSON.stringify(info, null, 1));
  await p.screenshot({ path: `QA/platform/authpill-0806/${key}-credit-before.png` });
  await ctx.close();
}
await b.close();

