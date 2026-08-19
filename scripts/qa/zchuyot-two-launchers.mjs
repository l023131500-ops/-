// One-off evidence run for the floatingTwice finding on /zchuyot.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const DIR = 'QA/platform/zchuyot-launchers-0810';
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
await page.goto('https://more30.com/zchuyot', { waitUntil: 'domcontentloaded', timeout: 90000 });
await settle(page, { minChars: 200 });

const found = await page.evaluate(() => {
  const out = [];
  for (const svg of document.querySelectorAll('svg[class*="lucide-message-circle"]')) {
    const r = svg.getBoundingClientRect();
    if (r.width < 4) continue;
    let el = svg.parentElement, pinned = null;
    while (el && el !== document.body) {
      if (getComputedStyle(el).position === 'fixed') { pinned = el; break; }
      el = el.parentElement;
    }
    if (!pinned) continue;
    const pr = pinned.getBoundingClientRect();
    const cs = getComputedStyle(pinned);
    out.push({
      glyph: Math.round(r.width) + 'px',
      control: pinned.tagName.toLowerCase(),
      corner: (window.innerHeight - pr.bottom < 60 ? 'bottom' : 'top') + '-' +
              (pr.left < window.innerWidth / 2 ? 'left' : 'right'),
      z: cs.zIndex,
      box: [Math.round(pr.x), Math.round(pr.y), Math.round(pr.width), Math.round(pr.height)],
      text: (pinned.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) || '(אין טקסט)',
      label: pinned.getAttribute('aria-label') || '',
    });
  }
  return out;
});

fs.mkdirSync(DIR, { recursive: true });
await page.screenshot({ path: DIR + '/production-two-launchers.png' });
fs.writeFileSync(DIR + '/_results.json', JSON.stringify({
  url: 'https://more30.com/zchuyot', viewport: '1280x900',
  pinnedMessageCircleControls: found,
}, null, 2), 'utf8');
console.log(JSON.stringify(found, null, 2));
await browser.close();
