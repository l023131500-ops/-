// Where does a route actually end up in a browser, after client-side routing?
// A redirect gate renders nothing on the server by design, so SSR text length
// says nothing about whether it works. Only the final URL does.
import { chromium } from 'playwright-core';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE });

for (const path of process.argv.slice(2)) {
  const ctx = await browser.newContext({ locale: 'he-IL' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  await page.goto('https://more30.com' + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const text = await page.evaluate(() =>
    document.body ? document.body.innerText.replace(/\s+/g, ' ').trim() : '');
  console.log(`${path}\n   final: ${page.url()}\n   text(${text.length}): ${text.slice(0, 110)}\n   errors: ${errs.length ? errs[0] : 'none'}`);
  await ctx.close();
}
await browser.close();
