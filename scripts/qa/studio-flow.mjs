// studio-flow.mjs — האם מנוע יצירת המודעות עדיין עובד אחרי סבב העיצוב.
//
// MORE30_MASTER_BUILD §2.2: הפעולה המרכזית זמינה ונכונה. במערכת 26 היא
// **יצירת מודעה** — בחירת תבנית, מעבר לעורך, ורינדור בפועל של הקנבס.
// כאן זה קריטי במיוחד כי בסבב הזה העורך הוצא לקטע נפרד (‎React.lazy‎),
// והמקום שבו פיצול כזה נשבר בשקט הוא בדיוק המעבר בין מסלולים.
//
// צילומים: QA/studio/.

// ⚠️ שתי ההמתנות הקבועות הוחלפו ב-settle(). לעורך אין minChars בכוונה:
// ‎stuckOnFallback‎ הוא ממצא לגיטימי, ועמוד שנתקע על "טוען…" חייב להימדד
// כפי שהוא ולא להמתין 30 שניות לתוכן שלא יגיע.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\studio';
const URL = 'https://more30.com/studio';

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

  // ⚠️ תצוגות הגלריה נצבעות רק כשמתקרבים אליהן (LazyPreview). בלי גלילה
  // הצילום מראה ארבע תיבות ריקות — וזו הייתה בדיוק הטעות בצילום הראשון.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 260));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 800));
  });
  rec.previewsRendered = await page.evaluate(
    () => document.querySelectorAll('[data-testid^="entry-"], .grid canvas, .grid svg, .grid [style*="width"]').length,
  );
  await page.screenshot({ path: path.join(OUT, `01-home-${mode}.png`), fullPage: true });

  rec.effBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  rec.colorScheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  rec.overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  // המסנן שהחליף את ה"לשוניות": קבוצה עם שם, כפתורים עם aria-pressed,
  // ואפס aria-controls שמצביע לשומקום.
  rec.filter = await page.evaluate(() => ({
    groups: document.querySelectorAll('[role="group"]').length,
    pressed: [...document.querySelectorAll('[aria-pressed]')].map((b) => ({
      label: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 22),
      pressed: b.getAttribute('aria-pressed'),
      disabled: b.hasAttribute('disabled'),
    })),
    danglingAriaControls: [...document.querySelectorAll('[aria-controls]')].filter(
      (e) => !document.getElementById(e.getAttribute('aria-controls')),
    ).length,
  }));

  rec.templates = await page.evaluate(
    () => document.querySelectorAll('[href*="editor"], [data-template], article, .group').length,
  );

  // הפעולה המרכזית: פתיחת העורך — הקטע שהופרד בסבב הזה
  await page.goto(`${URL}#/editor`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page).catch(() => {});
  rec.editor = await page.evaluate(() => {
    const canvas = document.querySelector('canvas, [data-canvas], #canvas-stage');
    const t = (document.body.innerText || '').replace(/\s+/g, ' ');
    return {
      textLen: t.length,
      stuckOnFallback: t.includes('טוען…') && t.length < 40,
      hasCanvas: !!canvas,
      controls: document.querySelectorAll('button, input, select, textarea').length,
      sample: t.slice(0, 140),
    };
  });
  await page.screenshot({ path: path.join(OUT, `02-editor-${mode}.png`), fullPage: false });

  results[mode] = rec;
  console.log(
    `${mode}: bg ${rec.effBg} · scheme ${rec.colorScheme} · overflow ${rec.overflow} · ` +
    `filter groups ${rec.filter.groups} / pressed ${rec.filter.pressed.length} / dangling ${rec.filter.danglingAriaControls} · ` +
    `editor text ${rec.editor.textLen} controls ${rec.editor.controls} canvas ${rec.editor.hasCanvas} stuck ${rec.editor.stuckOnFallback} · errors ${errs.length}`,
  );
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, '_flow.json'), JSON.stringify(results, null, 2), 'utf8');
await browser.close();
