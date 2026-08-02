// authpill-probe.mjs — is the shared login control actually there, and usable?
//
// Loading auth-button.js proves the <script> tag exists, not that the control
// rendered: it lives in a shadow root, so a plain HTML check cannot see it.
// This opens the page, waits for the custom element to upgrade, and reports
// what the visitor would actually get — plus whether the top nav carries its
// own visible way in, which DESIGN_STANDARD §3 requires.
//
//   node scripts/qa/authpill-probe.mjs <url> [<url> ...]

import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const urls = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: EXE, headless: true });
let bad = 0;

for (const url of urls) {
  for (const [label, width] of [['desktop', 1440], ['mobile', 390]]) {
    const ctx = await browser.newContext({ viewport: { width, height: width <= 500 ? 844 : 1000 }, locale: 'he-IL' });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => {
        const host = document.querySelector('more30-auth');
        const pill = host?.shadowRoot?.querySelector('.pill');
        const navLogin = [...document.querySelectorAll('header a, nav a, .nav a')]
          .find((a) => /כניסה|התחבר|כניסת/.test(a.textContent || ''));
        const rect = pill?.getBoundingClientRect();
        return {
          mounted: !!host,
          pillVisible: !!rect && rect.width > 0 && rect.height > 0,
          pillText: pill?.textContent?.trim() || null,
          pillSize: rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : null,
          navLoginText: navLogin?.textContent?.trim() || null,
          navLoginHref: navLogin?.getAttribute('href') || null,
        };
      });
      const good = r.mounted && r.pillVisible && !!r.navLoginText;
      if (!good) bad++;
      console.log(`${good ? 'ok  ' : 'FAIL'} ${url}  [${label}]`);
      console.log(`       shared pill: ${r.pillVisible ? `"${r.pillText}" ${r.pillSize}` : 'NOT VISIBLE'}`);
      console.log(`       nav sign-in: ${r.navLoginText ? `"${r.navLoginText}" -> ${r.navLoginHref}` : 'MISSING'}`);
    } catch (e) {
      bad++;
      console.log(`FAIL ${url} [${label}] — ${String(e).split('\n')[0]}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(bad ? `\n${bad} check(s) failed` : '\nall checks passed');
process.exit(bad ? 1 : 0);
