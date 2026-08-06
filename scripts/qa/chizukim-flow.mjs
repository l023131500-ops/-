// chizukim-flow.mjs — does the central action still work after the theme change?
//
// DESIGN_STANDARD closes the design side; MORE30_MASTER_BUILD §2.2 asks a
// different question — whether the thing the system exists to do is reachable
// and correct. For system 17 that is archive search, so this searches a real
// Hebrew word, opens a hit, and checks the transcript rendered.
//
// Screenshots land in QA/chizukim/.

// ⚠️ headline, searchTotal and detailTextLen are all read out of
// document.body.innerText, so a fixed sleep decided them by network luck.
// settle() waits for the text to stop changing instead. The read after the
// search box is filled takes no minChars — the archive is already on screen at
// that point, and the thing being waited for is the result count *changing*.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\chizukim';
const URL = 'https://more30.com/chizukim/';
const TERM = 'תשובה';

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
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 50 }).catch(() => {});
  await page.screenshot({ path: path.join(OUT, `01-archive-${mode}.png`), fullPage: mode !== 'mobile' });

  rec.bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  rec.headline = await page.evaluate(() => (document.body.innerText.match(/[\d,]+\s*הקלטות/) || [''])[0]);

  // the archive search box: a search input, whatever the component wraps it in
  const box = page.locator('input[type="search"], input[placeholder*="חיפוש"], input[placeholder*="חפש"]').first();
  if (await box.count()) {
    await box.fill(TERM);
    await settle(page).catch(() => {});
    rec.searchTotal = await page.evaluate(() => {
      const m = document.body.innerText.match(/([\d,]+)\s*(?:תוצאות|הקלטות|נמצאו)/);
      return m ? m[0] : null;
    });
    await page.screenshot({ path: path.join(OUT, `02-search-${mode}.png`), fullPage: mode !== 'mobile' });

    // open the first hit and confirm a transcript actually rendered
    const hit = page.locator('a[href*="/recordings/"], [data-testid*="recording"], article a').first();
    if (await hit.count()) {
      await hit.click().catch(() => {});
      await settle(page, { minChars: 50 }).catch(() => {});
      rec.detailUrl = page.url();
      rec.detailTextLen = await page.evaluate(() => (document.body.innerText || '').length);
      rec.hasTranscript = await page.evaluate(() => !!document.querySelector('.prose-hebrew'));
      await page.screenshot({ path: path.join(OUT, `03-detail-${mode}.png`), fullPage: mode !== 'mobile' });
    }
  } else {
    rec.searchTotal = 'SEARCH BOX NOT FOUND';
  }

  results[mode] = rec;
  console.log(`${mode}: bg ${rec.bodyBg} · ${rec.headline} · search "${TERM}" -> ${rec.searchTotal} · detail ${rec.detailTextLen ?? '-'} chars · prose ${rec.hasTranscript ?? '-'} · errors ${errs.length}`);
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, '_flow.json'), JSON.stringify(results, null, 2), 'utf8');
await browser.close();
