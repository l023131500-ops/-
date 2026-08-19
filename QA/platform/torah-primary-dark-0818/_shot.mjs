import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE, headless: true });

for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'he-IL', colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.goto(`https://more30.com/torah?cachebust=0818shot-${scheme}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `QA/platform/torah-primary-dark-0818/torah-${scheme}.png` });
  await ctx.close();
}

await browser.close();
console.log('done');
