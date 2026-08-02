// orech-flow.mjs — what does system 18 actually offer today?
//
// STATUS.md records "אזור העלאת ספר/קובץ חסר" as the gap the user identified.
// The source now contains app/documents/page.tsx, an .upload-zone and a draft
// list, so the record may be stale — and a stale STATUS is worse than a blank
// one. This walks every page the module exposes and reports what is there.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\orech';
const PAGES = [
  ['home', 'https://more30.com/orech'],
  ['documents', 'https://more30.com/orech/documents'],
  ['editor', 'https://more30.com/orech/editor'],
  ['htr', 'https://more30.com/orech/htr'],
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const results = {};

for (const scheme of ['light', 'dark']) {
  for (const [key, url] of PAGES) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 1000 }, locale: 'he-IL', colorScheme: scheme,
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 140)));
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));

    let status = 0;
    try {
      const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      status = r ? r.status() : 0;
      await page.waitForTimeout(3500);
    } catch (e) {
      results[`${key}-${scheme}`] = { url, error: String(e).slice(0, 120) };
      await ctx.close();
      continue;
    }

    const probe = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      h1: (document.querySelector('h1')?.textContent || '').trim().slice(0, 60),
      textLen: (document.body.innerText || '').length,
      fileInputs: document.querySelectorAll('input[type=file]').length,
      uploadZone: !!document.querySelector('.upload-zone'),
      textareas: document.querySelectorAll('textarea').length,
      buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 8),
    }));

    await page.screenshot({ path: path.join(OUT, `${key}-${scheme}.png`), fullPage: true });
    results[`${key}-${scheme}`] = { url, status, ...probe, errors: errs };
    console.log(`${key}/${scheme}: ${status} · bg ${probe.bg} · h1 "${probe.h1}" · ${probe.textLen} chars · file inputs ${probe.fileInputs} · upload zone ${probe.uploadZone} · textareas ${probe.textareas} · errors ${errs.length}`);
    console.log(`    buttons: ${JSON.stringify(probe.buttons)}`);
    await ctx.close();
  }
}

fs.writeFileSync(path.join(OUT, '_flow.json'), JSON.stringify(results, null, 2), 'utf8');
await browser.close();
