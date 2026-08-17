// Local pre-deploy check: does the tamlul nav (with ThemeToggle) clear the
// auth pill at 390px after adding flex-wrap, and does desktop (1440) still
// look normal (single row, no unwanted wrap)?
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'http://localhost:3402';

const PROBE = () => {
  const host = document.querySelector('more30-auth');
  const pill = host && host.shadowRoot && host.shadowRoot.querySelector('.pill');
  const p = pill && pill.getBoundingClientRect();
  const nav = document.querySelector('nav');
  const navRect = nav ? nav.getBoundingClientRect() : null;
  const out = { pill: p ? `${Math.round(p.left)}..${Math.round(p.right)}` : null, navRect: navRect ? `${Math.round(navRect.left)}..${Math.round(navRect.right)} y ${Math.round(navRect.top)}..${Math.round(navRect.bottom)}` : null, hits: [] };
  if (!p) return out;
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, summary')) {
    if (host.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.top > 80) continue;
    const ox = Math.min(p.right, r.right) - Math.max(p.left, r.left);
    const oy = Math.min(p.bottom, r.bottom) - Math.max(p.top, r.top);
    if (ox > 0 && oy > 0) {
      const top = document.elementFromPoint(Math.max(p.left, r.left) + ox / 2, Math.max(p.top, r.top) + oy / 2);
      out.hits.push({ label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), coveredBy: top === host ? 'auth-pill' : top?.tagName });
    }
  }
  return out;
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
for (const width of [390, 834, 1100, 1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width <= 500 ? 844 : 900 }, locale: 'he-IL', isMobile: width <= 500, hasTouch: width <= 500 });
  const page = await ctx.newPage();
  await page.goto(ORIGIN + '/tamlul', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(400);
  const r = await page.evaluate(PROBE);
  console.log(width, JSON.stringify(r));
  await ctx.close();
}
await browser.close();
