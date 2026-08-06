// authpill-diagnose.mjs — למה בדיוק הפקד יושב מתחת לכדור הכניסה.
//
// authbutton-overlap.mjs עונה "כן/לא". כשהתשובה כן, צריך לדעת **מה** להזיז:
// מיהו האב שקובע את הרוחב, איזה padding-inline-end יש לו כרגע, ומה הערך של
// --more30-auth-inset שהכדור פרסם. בלי זה התיקון הוא ניחוש.
//
// Usage:  node authpill-diagnose.mjs <routeKey> [width ...]

import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

const ROUTES = {
  briut: '/briut', smachot: '/smachot', egod: '/egod', mthbram: '/mthbram',
  kiosk: '/kiosk/', kesef: '/kesef', home: '/',
};

const key = process.argv[2];
const widths = process.argv.slice(3).map(Number);
const path = ROUTES[key] || key;
if (!path) { console.error('unknown route'); process.exit(2); }

const PROBE = () => {
  const host = document.querySelector('more30-auth');
  const pill = host && host.shadowRoot && host.shadowRoot.querySelector('.pill');
  const p = pill && pill.getBoundingClientRect();
  const out = {
    inset: getComputedStyle(document.documentElement).getPropertyValue('--more30-auth-inset').trim(),
    pill: p ? `${Math.round(p.left)}..${Math.round(p.right)} y ${Math.round(p.top)}..${Math.round(p.bottom)}` : null,
    hits: [],
  };
  if (!p) return out;
  const sel = (el) => {
    if (!el) return null;
    const id = el.id ? '#' + el.id : '';
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + id + cls;
  };
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, summary')) {
    if (host.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.top > 80) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;
    const ox = Math.min(p.right, r.right) - Math.max(p.left, r.left);
    const oy = Math.min(p.bottom, r.bottom) - Math.max(p.top, r.top);
    if (ox <= 0 || oy <= 0) continue;
    const top = document.elementFromPoint(Math.max(p.left, r.left) + ox / 2, Math.max(p.top, r.top) + oy / 2);
    const chain = [];
    for (let a = el.parentElement, i = 0; a && i < 5; a = a.parentElement, i++) {
      const cs = getComputedStyle(a);
      const ar = a.getBoundingClientRect();
      chain.push({
        sel: sel(a),
        rect: `${Math.round(ar.left)}..${Math.round(ar.right)}`,
        pos: cs.position,
        padInlineEnd: cs.paddingInlineEnd,
        maxWidth: cs.maxWidth,
        display: cs.display,
      });
    }
    out.hits.push({
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      rect: `${Math.round(r.left)}..${Math.round(r.right)} y ${Math.round(r.top)}..${Math.round(r.bottom)}`,
      overlap: `${Math.round(ox)}x${Math.round(oy)}`,
      coveredBy: top === host ? 'auth-pill' : sel(top),
      ancestors: chain,
    });
  }
  return out;
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
for (const width of (widths.length ? widths : [834, 1100])) {
  const ctx = await browser.newContext({
    viewport: { width, height: width <= 500 ? 844 : 900 },
    locale: 'he-IL', isMobile: width <= 500, hasTouch: width <= 500,
  });
  const page = await ctx.newPage();
  await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 40 });
  const r = await page.evaluate(PROBE);
  console.log(`\n=== ${key} @ ${width} ===`);
  console.log(JSON.stringify(r, null, 2));
  await ctx.close();
}
await browser.close();
