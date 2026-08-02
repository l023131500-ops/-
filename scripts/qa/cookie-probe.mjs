// cookie-probe.mjs — name the cookies Lighthouse counts as third-party.
//
// "third-party-cookies: 2 cookies found" failed on all 27 routes, including
// deployments that share no code. A defect that uniform is either ours in one
// shared file, or not ours at all — and the difference decides whether there is
// anything to fix. This prints who set what.
//
// Usage:  node cookie-probe.mjs <url>

import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const url = process.argv[2] || 'https://more30.com/';

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'he-IL' });
const page = await ctx.newPage();

const hosts = new Set();
page.on('request', (r) => { try { hosts.add(new URL(r.url()).host); } catch {} });

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4000);

console.log('cookies:');
for (const c of await ctx.cookies()) {
  console.log(`  ${c.domain}${c.path}  ${c.name}=${String(c.value).slice(0, 24)}  sameSite=${c.sameSite} secure=${c.secure} httpOnly=${c.httpOnly}`);
}
console.log('\nrequest hosts:');
for (const h of [...hosts].sort()) console.log('  ' + h);

console.log('\ninjected elements not from our markup:');
console.log(await page.evaluate(() =>
  [...document.querySelectorAll('[id*="netfree" i], [class*="netfree" i], iframe')]
    .map((e) => `${e.tagName.toLowerCase()}#${e.id}.${e.className} src=${e.getAttribute('src') || ''}`)
    .join('\n  ') || '  (none)'));

await browser.close();
