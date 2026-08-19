// chatzor-flow.mjs — does system 16 still do its job after the colour work?
//
// The central promise of "מחוברים" is real community data: the synagogues of
// חצור הגלילית, and today's astronomical times. Both are computed, not typed,
// so a broken build shows up as a plausible-looking empty page. This checks
// that the numbers are actually there.
//
// Screenshots land in QA/chatzor/.

// ⚠️ Every reading below comes from document.body.innerText, so every one of
// them used to be a bet on the network: a fixed sleep that happened to land
// after the render on the day it was written. settle() replaces the bet.
// minChars: 50 — a zmanim page that has not painted is 0 characters, and three
// stable samples of zero look exactly like a settled page.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\chatzor';
const BASE = 'https://more30.com/chatzor/';

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const results = {};

for (const mode of ['light', 'dark', 'mobile']) {
  const ctx = await browser.newContext({
    viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    locale: 'he-IL',
    colorScheme: mode === 'dark' ? 'dark' : 'light',
    isMobile: mode === 'mobile', hasTouch: mode === 'mobile',
    deviceScaleFactor: mode === 'mobile' ? 2 : 1,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  const rec = { mode, errors: errs };

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 50 }).catch(() => {});
  await page.screenshot({ path: path.join(OUT, `01-home-${mode}.png`), fullPage: mode !== 'mobile' });

  rec.bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Zmanim are computed from latitude/longitude, so a real value proves the
  // calculation ran — an empty strip would still look like a designed page.
  rec.zmanim = await page.evaluate(() => {
    const t = document.body.innerText;
    const times = t.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/g) || [];
    return { count: times.length, sample: times.slice(0, 4) };
  });
  rec.hasSunrise = await page.evaluate(() => /הנץ|זריחה/.test(document.body.innerText));

  // the synagogue directory — the other half of the promise
  await page.goto(BASE + 'batei-knesset', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 50 }).catch(() => {});
  rec.synagogues = await page.evaluate(() =>
    document.querySelectorAll('a[href*="/k/"]').length);
  await page.screenshot({ path: path.join(OUT, `02-synagogues-${mode}.png`), fullPage: mode !== 'mobile' });

  const first = page.locator('a[href*="/k/"]').first();
  if (await first.count()) {
    await first.click().catch(() => {});
    await settle(page, { minChars: 50 }).catch(() => {});
    rec.siteUrl = page.url();
    rec.siteTextLen = await page.evaluate(() => (document.body.innerText || '').length);
    await page.screenshot({ path: path.join(OUT, `03-synagogue-${mode}.png`), fullPage: mode !== 'mobile' });
  }

  results[mode] = rec;
  console.log(`${mode}: bg ${rec.bodyBg} · ${rec.zmanim.count} times ${JSON.stringify(rec.zmanim.sample)} · sunrise ${rec.hasSunrise} · ${rec.synagogues} synagogue links · site ${rec.siteTextLen ?? '-'} chars · errors ${errs.length}`);
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, '_flow.json'), JSON.stringify(results, null, 2), 'utf8');
await browser.close();
