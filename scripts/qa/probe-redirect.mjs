// Where does a route actually end up in a browser, after client-side routing?
// A redirect gate renders nothing on the server by design, so SSR text length
// says nothing about whether it works. Only the final URL does.
//
// ⚠️ The text sample printed alongside the URL is still read, and it was being
// read too early. Measured 07/08 by fixed-sleep-drift.mjs on /bkalot — the
// route this script is most often pointed at — the 6000ms sleep below read
// 3,104 characters of a page that settles at 8,446, and does not get there
// until 7.4s. The final URL was right; the text beside it described a page
// half-built. settle() replaces the guess. No minChars: a redirect gate that
// renders nothing at all is a legitimate outcome here, and a floor-length
// wait on an empty body is the correct reading of it, not a timeout.
import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE });

for (const path of process.argv.slice(2)) {
  const ctx = await browser.newContext({ locale: 'he-IL' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  await page.goto('https://more30.com' + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page).catch(() => {});
  const text = await page.evaluate(() =>
    document.body ? document.body.innerText.replace(/\s+/g, ' ').trim() : '');
  console.log(`${path}\n   final: ${page.url()}\n   text(${text.length}): ${text.slice(0, 110)}\n   errors: ${errs.length ? errs[0] : 'none'}`);
  await ctx.close();
}
await browser.close();
