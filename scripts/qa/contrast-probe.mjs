// contrast-probe.mjs — name the text that fails the contrast threshold.
//
// Lighthouse says "colors do not have a sufficient contrast ratio" and stops
// there. DESIGN_STANDARD §2 sets the thresholds (4.5:1 body, 3:1 for text
// >= 24px or bold >= 18.66px), so this reports the actual ratio per element
// and which threshold it missed — enough to fix a variable instead of guessing.
//
// Usage:  node contrast-probe.mjs <url>

import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const url = process.argv[2];
if (!url) { console.error('usage: node contrast-probe.mjs <url>'); process.exit(1); }

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'he-IL' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3500);

const bad = await page.evaluate(() => {
  const rgb = (s) => {
    const m = String(s).match(/-?[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // the painted backdrop behind an element: first opaque ancestor background
  const backdrop = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c && c.a === 1) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const t = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;
    const fg = rgb(s.color);
    if (!fg || fg.a < 1) continue;
    const size = parseFloat(s.fontSize);
    const weight = Number(s.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, backdrop(el));
    if (got < need) {
      out.push({
        text: t.slice(0, 42), tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 34),
        color: s.color, bg: `rgb(${Object.values(backdrop(el)).slice(0, 3).join(', ')})`,
        size: Math.round(size), weight, need, got: +got.toFixed(2),
      });
    }
  }
  return out;
});

if (!bad.length) console.log('no contrast failures');
for (const b of bad) {
  console.log(`${b.got}:1 (needs ${b.need}) — ${b.tag}.${b.cls} ${b.size}px/${b.weight} ${b.color} on ${b.bg}\n   "${b.text}"`);
}

await browser.close();
