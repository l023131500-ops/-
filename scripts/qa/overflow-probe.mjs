// overflow-probe.mjs — name the element that makes a page scroll sideways.
//
// The platform audit reports *that* a page overflows at 390px; it cannot say
// *what* overflows, and guessing from a stylesheet is how you end up "fixing"
// the wrong rule. This walks every element and reports the ones whose box
// crosses the viewport edge, innermost first — the innermost offender is the
// cause, its ancestors are only carrying it.
//
// Usage:  node overflow-probe.mjs <url> [width]

import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const url = process.argv[2];
const width = Number(process.argv[3] || 390);
if (!url) { console.error('usage: node overflow-probe.mjs <url> [width]'); process.exit(1); }

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({
  viewport: { width, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true,
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);

const out = await page.evaluate((vw) => {
  const de = document.documentElement;
  const offenders = [];
  const walk = (el, depth) => {
    const r = el.getBoundingClientRect();
    // RTL: the page starts at the right edge, so a box can stick out either way.
    const over = Math.max(0, Math.round(r.right - vw), Math.round(-r.left));
    if (over > 1 && r.width > 0 && r.height > 0) {
      offenders.push({
        depth,
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 48),
        id: el.id || '',
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        over,
        children: el.children.length,
      });
    }
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(document.body, 0);

  // A pseudo-element cannot be walked, so ask the ones that commonly overflow.
  const pseudo = [];
  for (const el of document.querySelectorAll('*')) {
    for (const which of ['::before', '::after']) {
      const s = getComputedStyle(el, which);
      if (s.content === 'none' || s.position !== 'absolute') continue;
      const pr = el.getBoundingClientRect();
      const left = s.left, right = s.right;
      if (left.includes('-') || right.includes('-')) {
        pseudo.push({ sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().slice(0, 30), which, left, right, host: Math.round(pr.width) });
      }
    }
  }

  return { scrollW: de.scrollWidth, clientW: de.clientWidth, offenders, pseudo };
}, width);

console.log(`scrollWidth ${out.scrollW} · clientWidth ${out.clientW} · overflow ${out.scrollW - out.clientW}px`);
console.log('\n-- elements crossing the edge (deepest last is the real cause) --');
for (const o of out.offenders.sort((a, b) => a.depth - b.depth).slice(0, 25)) {
  console.log(`  d${o.depth} ${o.tag}${o.id ? '#' + o.id : ''}.${o.cls} — left ${o.left} right ${o.right} w ${o.w} over ${o.over}px`);
}
console.log('\n-- absolutely-positioned pseudo-elements with a negative offset --');
for (const p of out.pseudo) console.log(`  ${p.sel}${p.which} left:${p.left} right:${p.right} (host ${p.host}px)`);

await browser.close();
