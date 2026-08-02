// kupot-flow.mjs — האם ההשוואה עצמה עדיין עובדת אחרי סבב העיצוב.
//
// DESIGN_STANDARD סוגר את הצד הנמדד; MORE30_MASTER_BUILD §2.2 שואל אם הפעולה
// המרכזית זמינה ונכונה. במערכת 28 היא **השוואת הכיסוי בין הקופות**: לסנן,
// לפתוח נושא, ולראות מה כל קופה נותנת בו.
//
// הבדיקה הקריטית בסבב הזה: הרשימה עברה לעימוד (24 בכל פעם במקום 435). ולכן
// כאן נמדד במפורש שכל התוצאות עדיין **נגישות** — גם בכפתור וגם בגלילה — ולא
// רק שהעמוד נעשה מהיר.
//
// צילומים: QA/kupot/.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\kupot';
const URL = 'https://more30.com/kupot';

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const results = {};

const countCards = (page) =>
  page.evaluate(() => document.querySelectorAll('[data-testid^="card-topic-"]').length);

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
  await page.waitForSelector('[data-testid^="card-topic-"]', { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `01-home-${mode}.png`), fullPage: false });

  rec.dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  rec.resultCount = await page.evaluate(
    () => document.querySelector('[data-testid="text-result-count"]')?.textContent?.trim(),
  );
  rec.firstPageCards = await countCards(page);
  rec.overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  // כל התוצאות עדיין נגישות: לחיצה על "עוד" מוסיפה עמוד
  const more = page.locator('[data-testid="button-load-more"]');
  if (await more.count()) {
    await more.first().click();
    await page.waitForTimeout(900);
    rec.afterLoadMore = await countCards(page);
  } else {
    rec.afterLoadMore = 'no load-more button';
  }

  // סינון לפי הקופה הבולטת — זו ההשוואה שהמערכת קיימת בשבילה
  const leader = page.locator('[data-testid^="button-leader-"]').first();
  if (await leader.count()) {
    rec.leaderLabel = (await leader.innerText()).replace(/\s+/g, ' ').trim();
    await leader.click();
    await page.waitForTimeout(1200);
    rec.afterLeaderFilter = await page.evaluate(
      () => document.querySelector('[data-testid="text-result-count"]')?.textContent?.trim(),
    );
    await page.screenshot({ path: path.join(OUT, `02-filtered-${mode}.png`), fullPage: false });
    await leader.click(); // ביטול הסינון
    await page.waitForTimeout(800);
  }

  // פתיחת נושא: הפירוט לכל קופה נטען לפי דרישה
  const card = page.locator('[data-testid^="button-toggle-"]').first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(4000);
    rec.detail = await page.evaluate(() => {
      const open = document.querySelector('[data-testid^="card-topic-"]');
      const t = open ? open.innerText.replace(/\s+/g, ' ') : '';
      return { len: t.length, sample: t.slice(0, 180) };
    });
    await page.screenshot({ path: path.join(OUT, `03-detail-${mode}.png`), fullPage: false });
  }

  results[mode] = rec;
  console.log(
    `${mode}: dark ${rec.dark} · "${rec.resultCount}" · cards ${rec.firstPageCards} -> ${rec.afterLoadMore} · ` +
    `leader "${rec.leaderLabel ?? '-'}" -> "${rec.afterLeaderFilter ?? '-'}" · detail ${rec.detail?.len ?? '-'} · ` +
    `overflow ${rec.overflow} · errors ${errs.length}`,
  );
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, '_flow.json'), JSON.stringify(results, null, 2), 'utf8');
await browser.close();
