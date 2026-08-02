// shots.mjs — full-page screenshots at both widths, for the QA record.
//
// DESIGN_STANDARD requires a screenshot with every completion claim. This takes
// them from production, at the two widths that actually render differently
// (the nav collapses below 900px), and writes them next to the QA note.
//
//   node scripts/qa/shots.mjs <outDir> <name>=<url> [<name>=<url> ...]

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const out = process.argv[2];
const targets = process.argv.slice(3).map((a) => {
  const i = a.indexOf('=');
  return { name: a.slice(0, i), url: a.slice(i + 1) };
});
if (!out || !targets.length) {
  console.error('usage: node shots.mjs <outDir> <name>=<url> ...');
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, headless: true });
for (const { name, url } of targets) {
  for (const [label, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: width <= 500,
      locale: 'he-IL',
    });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

      // ⚠️ Scroll the whole page before capturing. Several systems reveal
      // content with an IntersectionObserver that sets opacity from 0, and a
      // fullPage screenshot does NOT trigger it — anything below the fold was
      // captured still invisible, producing an empty page that looks like a
      // catastrophic bug and is purely an artefact of how the shot was taken.
      await page.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const step = Math.round(window.innerHeight * 0.6);
        // Re-read scrollHeight each turn: revealing content changes the page
        // height, so a bound captured once stops short of the real bottom.
        // Dwell longer than the 0.7s reveal transition, or the element is
        // captured mid-fade and reads as a contrast failure.
        for (let y = 0, guard = 0; guard < 200; guard++) {
          window.scrollTo(0, y);
          await sleep(260);
          const max = document.documentElement.scrollHeight - window.innerHeight;
          if (y >= max) break;
          y = Math.min(y + step, max);
        }
        window.scrollTo(0, 0);
        await sleep(400);
      });
      // Let the reveal transitions and the shared login pill settle.
      await page.waitForTimeout(2500);
      const file = path.join(out, `${name}-${label}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  ${name}-${label}.png  (${width}px)`);
    } catch (e) {
      console.log(`  ${name}-${label}  FAILED: ${e.message.split('\n')[0]}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\nDone -> ${out}`);
