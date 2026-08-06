// dark-toggle-probe.mjs — a dark theme nobody can reach is not dark mode.
//
// dark-probe.mjs answers "does a .dark rule set exist and does forcing the
// class repaint the page". Every route it was pointed at on 06/08 answered yes.
// That is not the same question a visitor asks. A visitor either:
//   (a) has their OS set to dark and expects the site to follow, or
//   (b) looks for a control on the page and clicks it.
// If neither path reaches the theme, the theme is dead CSS.
//
// So this measures the two reachable paths, in production, per route:
//   1. prefers-color-scheme: dark  -> does the page paint dark on its own?
//   2. is there a visible control  -> and does clicking it repaint the page?
//
// Reported separately, because the fixes differ: (1) is a media query or an
// initial-theme read, (2) is a missing control.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const OUT = process.argv[2] || 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform\\dark';

const ROUTES = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['/tamlul', '/modaot', '/briut', '/bkalot', '/kiosk/'];

fs.mkdirSync(OUT, { recursive: true });

// Same paint reading as dark-probe: a page can theme itself with a gradient and
// leave every backgroundColor transparent, so the image counts as paint too.
const paint = () => {
  const bg = (el) => getComputedStyle(el).backgroundColor;
  const opaque = (c) => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent';
  let el = document.body;
  while (el && !opaque(bg(el))) el = el.parentElement;
  const image = (e) => {
    const v = getComputedStyle(e).backgroundImage;
    return v && v !== 'none' ? v.slice(0, 160) : '';
  };
  return {
    effectiveBg: el ? bg(el) : bg(document.documentElement),
    bodyImage: image(document.body) || image(document.documentElement),
    fg: getComputedStyle(document.body).color,
    rootClass: document.documentElement.className.slice(0, 120),
    rootTheme: document.documentElement.getAttribute('data-theme') || '',
  };
};

// A theme control is not reliably a <button aria-label="dark">. Across these
// apps it has been a bare button holding an svg, an <a role=button>, and a
// checkbox. Match on the words the apps actually use, in either language,
// across the accessible name, title, id, class and data-* — then require the
// element to be visible before treating it as reachable.
const FIND_TOGGLE = () => {
  const WORDS = /(dark|light|theme|mode|כהה|בהיר|ערכת|מצב\s*כהה|תצוגה)/i;
  const cands = [...document.querySelectorAll('button, a, [role="button"], [role="switch"], input[type="checkbox"], label')];
  const hits = [];
  for (const el of cands) {
    const hay = [
      el.getAttribute('aria-label'), el.getAttribute('title'), el.id,
      typeof el.className === 'string' ? el.className : '',
      el.getAttribute('data-testid'), el.getAttribute('name'),
      (el.textContent || '').trim().slice(0, 40),
    ].filter(Boolean).join(' ');
    if (!WORDS.test(hay)) continue;
    const r = el.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    hits.push({ tag: el.tagName.toLowerCase(), hay: hay.slice(0, 90), visible, x: r.x + r.width / 2, y: r.y + r.height / 2 });
  }
  return hits.slice(0, 6);
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const results = {};

for (const p of ROUTES) {
  const key = p.replace(/\//g, '') || 'home';
  const row = { route: p };

  // ---- path 1: the OS says dark ----
  let ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL', colorScheme: 'dark' });
  let page = await ctx.newPage();
  try {
    await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);
    row.osDark = await page.evaluate(paint);
    await page.screenshot({ path: path.join(OUT, `${key}-os-dark.png`) });
  } catch (e) {
    row.osDarkError = String(e).slice(0, 160);
  }
  await ctx.close();

  // ---- path 2: a control on the page, from a light start ----
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL', colorScheme: 'light' });
  page = await ctx.newPage();
  try {
    await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);
    row.light = await page.evaluate(paint);
    const hits = await page.evaluate(FIND_TOGGLE);
    row.toggleCandidates = hits;
    const hit = hits.find((h) => h.visible);
    if (hit) {
      await page.mouse.click(hit.x, hit.y);
      await page.waitForTimeout(1200);
      row.afterClick = await page.evaluate(paint);
      row.clickChanged =
        row.afterClick.effectiveBg !== row.light.effectiveBg ||
        row.afterClick.bodyImage !== row.light.bodyImage;
      await page.screenshot({ path: path.join(OUT, `${key}-after-toggle.png`) });
    }
  } catch (e) {
    row.lightError = String(e).slice(0, 160);
  }
  await ctx.close();

  row.osDarkFollows = !!(row.osDark && row.light) &&
    (row.osDark.effectiveBg !== row.light.effectiveBg || row.osDark.bodyImage !== row.light.bodyImage);
  row.reachable = row.osDarkFollows || row.clickChanged === true;

  results[p] = row;
  console.log(
    `${p.padEnd(12)} os-dark:${row.osDarkFollows ? 'follows' : 'ignores '} ` +
    `toggle:${row.toggleCandidates?.some((h) => h.visible) ? (row.clickChanged ? 'works  ' : 'dead   ') : 'none   '} ` +
    `=> ${row.reachable ? 'reachable' : 'UNREACHABLE'}`,
  );
}

await browser.close();
fs.writeFileSync(path.join(OUT, '_dark-toggle.json'), JSON.stringify(results, null, 2), 'utf8');
const bad = Object.values(results).filter((r) => !r.reachable).map((r) => r.route);
console.log(`\n${Object.keys(results).length - bad.length}/${Object.keys(results).length} reachable`);
if (bad.length) console.log(`unreachable: ${bad.join(' ')}`);
console.log(`-> ${OUT}\\_dark-toggle.json`);
