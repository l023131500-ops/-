import { chromium } from 'playwright-core';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  locale: 'he-IL', colorScheme: 'dark',
});
const page = await ctx.newPage();
await page.goto('https://more30.com/smel/?cachebust=0818tier' + Math.random(), { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(3000);
const card = await page.locator('[data-testid="card-tier-premium"]');
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
  const label = document.querySelector('[data-testid="card-tier-premium"] > div:nth-child(2)');
  const card = document.querySelector('[data-testid="card-tier-premium"]');
  return {
    matchesDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    labelText: label && label.textContent,
    labelColor: label && getComputedStyle(label).color,
    cardBg: card && getComputedStyle(card).backgroundColor,
  };
});
console.log(JSON.stringify(info, null, 2));
await card.screenshot({ path: 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform\\smel-dark-tier-0818\\smel-dark-tier-after.png' });
await browser.close();
