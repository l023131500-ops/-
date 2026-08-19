import { chromium } from 'playwright-core';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE, headless: true });

for (const scheme of ['dark', 'light']) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 400 },
    locale: 'he-IL', colorScheme: scheme,
  });
  const page = await ctx.newPage();
  await page.goto('https://more30.com/tamlul/?cachebust=0818hdr' + Math.random(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const title = document.querySelector('header .font-display');
    const sub = document.querySelector('header .text-ink-muted');
    const header = document.querySelector('header');
    return {
      matchesDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      titleText: title && title.textContent,
      titleColor: title && getComputedStyle(title).color,
      subText: sub && sub.textContent,
      subColor: sub && getComputedStyle(sub).color,
      headerBg: header && getComputedStyle(header).backgroundColor,
    };
  });
  console.log(scheme, JSON.stringify(info));
  await page.screenshot({ path: `C:\\Users\\USER\\Downloads\\more30\\QA\\platform\\tamlul-header-dark-0818\\tamlul-header-${scheme}.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });
  await ctx.close();
}
await browser.close();
