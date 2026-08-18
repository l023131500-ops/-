import { chromium } from 'playwright-core';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'he-IL', colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto('https://more30.com/kiosk/console', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'QA/platform/kiosk-dark-recheck-0818/kiosk-dark-before.png', fullPage: false });
await browser.close();
