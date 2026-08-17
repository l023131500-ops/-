import { chromium } from 'playwright-core';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'he-IL', colorScheme: 'dark',
});
const page = await ctx.newPage();
await page.goto('https://more30.com/galil/?cachebust=0818hero' + Math.random(), { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const h1 = document.querySelector('h1');
  return {
    htmlClass: document.documentElement.className,
    matchesDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    h1Text: h1 && h1.textContent,
    h1Color: h1 && getComputedStyle(h1).color,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform\\galil-dark-mixed-0818\\galil-dark-after-fix.png', fullPage: false });
await browser.close();
