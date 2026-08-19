/**
 * Is more30.com/kiosk — the exact string in core.projects.live_url for system
 * 35 — actually styled?
 *
 * relative-asset-audit answers "does the referenced file come back as CSS",
 * which is the cause. This answers the consequence, in the browser, because a
 * stylesheet that arrives as text/html is not a 404 and not an error: the page
 * renders, in Times New Roman, and every status check stays green.
 *
 * Measured 06/08 before the redirect, and this is what it printed:
 *   /kiosk   19 rules   bodyBg rgba(0, 0, 0, 0)      h1 32px   css -> text/html
 *   /kiosk/  142 rules  bodyBg rgb(245, 247, 251)    h1 56px   css -> text/css
 * After: both forms land on /kiosk/ and read 142 / rgb(245,247,251) / 56px.
 *
 *   node scripts/qa/kiosk-canonical.mjs [before|after]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'QA/platform/kiosk-0806';
const tag = process.argv[2] || 'now';

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const rows = [];

for (const [name, url] of [['bare', 'https://more30.com/kiosk'], ['slash', 'https://more30.com/kiosk/']]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const css = [];
  page.on('response', (r) => {
    if (/\.css(\?|$)/.test(r.url())) css.push(`${r.status()} ${r.headers()['content-type']} ${r.url()}`);
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  // Rule count is the honest measure: the <link> exists either way, and
  // document.styleSheets counts it either way. Only cssRules tells you whether
  // anything inside it parsed as CSS.
  const m = await page.evaluate(() => ({
    finalUrl: location.href,
    sheets: document.styleSheets.length,
    rules: [...document.styleSheets].reduce((n, s) => {
      try { return n + s.cssRules.length; } catch { return n; }
    }, 0),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    h1Size: getComputedStyle(document.querySelector('h1') || document.body).fontSize,
  }));
  await page.screenshot({ path: `${OUT}/${tag}-${name}.png` });
  rows.push({ name, ...m, css });
  console.log(`${name.padEnd(6)} ${m.finalUrl.padEnd(30)} rules:${String(m.rules).padStart(4)}  bg:${m.bodyBg.padEnd(22)} h1:${m.h1Size}`);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/_${tag}.json`, JSON.stringify(rows, null, 2), 'utf8');

// A styled page has far more than the ~19 rules the fonts alone contribute.
const styled = rows.every((r) => r.rules > 100);
console.log(`\n${styled ? 'both URL forms are styled' : 'UNSTYLED at one of the two forms'} -> ${OUT}/_${tag}.json`);
process.exit(styled ? 0 : 1);
