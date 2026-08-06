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
//
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ The first version of this file was wrong on 5 of 25 routes, in BOTH
// directions, and every correction below is anchored to a measurement rather
// than to a hunch. Kept in full because a checker that has already lied once
// earns its scepticism in writing.
//
//   1. `ערכת` was in the word list, and it is a substring of **מערכת**.
//      Every Hebrew site with a "כניסה למערכת" button therefore reported a
//      theme control. That is how /kesef, /kiosk and /tivuch acquired one, and
//      how /chizukim matched the body text "ובהערכת המצוות".
//
//   2. A click that NAVIGATES was scored as a theme change. /kesef and /kiosk
//      both printed "toggle:works => reachable" after clicking
//      "כניסה למערכת" and landing on a differently-coloured page. A false pass
//      is the expensive direction: it closes a gap that is still open. The
//      click now fails the candidate if the URL moved.
//
//   3. The paint reader walked from <body> up looking for an opaque
//      background-color and gave up as transparent. /kiosk sets no opaque
//      background anywhere in that chain, so it read `rgba(0, 0, 0, 0)` in
//      BOTH modes and was called "ignores" — while its <html> class flips to
//      `dark` and its text flips rgb(0,0,0) -> rgb(255,255,255). It follows the
//      OS perfectly. The comparison now includes the foreground colour, the
//      root class and data-theme, not the background alone.
//
//   4. A site that is dark in every mode was scored UNREACHABLE. /mthbram,
//      /studio, /tivuch and /kesef are designed dark and have no light mode to
//      switch away from; nothing is missing on them. They report `always-dark`
//      now, which is a different fact from `ignores` and needs no fix.
//
//   Not a correction, but worth stating so it is not re-investigated: the
//   fixed 3s sleep was checked against /admin, /kiosk and /kesef at 3s and at
//   12s and the readings were identical, so no route here was mis-measured
//   mid-load. lib/settle.mjs is adopted anyway — it is the house standard and
//   this was the fourth copy of the hand-rolled version.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const OUT = process.argv[2] || 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform\\dark';

const ROUTES = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['/tamlul', '/modaot', '/briut', '/bkalot', '/kiosk'];

fs.mkdirSync(OUT, { recursive: true });

// Same paint reading as dark-probe: a page can theme itself with a gradient and
// leave every backgroundColor transparent, so the image counts as paint too —
// and so do the foreground colour and the root class, which is the only signal
// left on a page that paints its surfaces below <body> (see correction 3).
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

const themed = (a, b) =>
  !!a && !!b &&
  (a.effectiveBg !== b.effectiveBg ||
    a.bodyImage !== b.bodyImage ||
    a.fg !== b.fg ||
    a.rootClass !== b.rootClass ||
    a.rootTheme !== b.rootTheme);

/** sRGB relative luminance, 0 (black) .. 1 (white). */
const lum = (r, g, b) => {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const rgb = (s) => {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s || '');
  if (!m) return null;
  const a = /rgba\([^)]*,\s*([\d.]+)\s*\)$/.exec(s || '');
  if (a && Number(a[1]) === 0) return null; // fully transparent carries no colour
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/**
 * Is the surface the visitor actually sees a dark one? Read in this order,
 * because each fallback is weaker than the one above it:
 *   the opaque background, then the first colour stop of a background image,
 *   then the text colour — light text only sits on a dark surface.
 */
const isDark = (r) => {
  if (!r) return null;
  const bg = rgb(r.effectiveBg);
  if (bg) return lum(...bg) < 0.4;
  const img = rgb(r.bodyImage);
  if (img) return lum(...img) < 0.4;
  const fg = rgb(r.fg);
  if (fg) return lum(...fg) > 0.5;
  return null;
};

// A theme control is not reliably a <button aria-label="dark">. Across these
// apps it has been a bare button holding an svg, an <a role=button>, and a
// checkbox. So match the words the apps actually use — but on the LABEL, not
// on the class list: Tailwind writes `dark:bg-x` and `text-brand-dark` on
// ordinary content, and matching those produced three of the five wrong
// verdicts. `theme` in a class token is still a real signal and is kept, minus
// any token holding ':' (that is a Tailwind variant, not a name).
const FIND_TOGGLE = () => {
  // No bare `ערכת` — it is inside מערכת. `מצב`/`תצוגה` are only taken together
  // or beside כהה/בהיר, so "מצב הנכס" and "תצוגה מקדימה" do not qualify.
  const LABEL = /(כהה|בהיר|החלף\s*מצב|מצב\s*תצוגה|ערכת\s*(נושא|צבעים)|\bdark\s*mode\b|\blight\s*mode\b|\btheme\b|colou?r[-\s]?scheme)/i;
  const CLASS = /(^|[\s_-])(theme|darkmode|lightmode)/i;
  const cands = [...document.querySelectorAll('button, a, [role="button"], [role="switch"], input[type="checkbox"], label')];
  const hits = [];
  for (const el of cands) {
    const label = [
      el.getAttribute('aria-label'), el.getAttribute('title'), el.id,
      el.getAttribute('data-testid'), el.getAttribute('name'),
      (el.textContent || '').trim().slice(0, 40),
    ].filter(Boolean).join(' ');
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/).filter((t) => t && !t.includes(':')).join(' ');
    if (!LABEL.test(label) && !CLASS.test(cls)) continue;
    const r = el.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    hits.push({
      tag: el.tagName.toLowerCase(),
      hay: (label + ' | ' + cls).slice(0, 110),
      visible, x: r.x + r.width / 2, y: r.y + r.height / 2,
    });
  }
  return hits.slice(0, 6);
};

const bare = (u) => u.split('#')[0].replace(/\/$/, '');

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
    await settle(page, { minChars: 50 });
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
    await settle(page, { minChars: 50 });
    row.light = await page.evaluate(paint);
    const hits = await page.evaluate(FIND_TOGGLE);
    row.toggleCandidates = hits;

    // Try each visible candidate until one repaints WITHOUT navigating. A
    // candidate that moves the URL is a link; scoring it as a working toggle
    // is what closed the gap on /kesef and /kiosk while it was still open.
    const before = bare(page.url());
    for (const hit of hits.filter((h) => h.visible).slice(0, 3)) {
      await page.mouse.click(hit.x, hit.y);
      await page.waitForTimeout(1200);
      if (bare(page.url()) !== before) {
        hit.navigated = true;
        await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await settle(page, { minChars: 50 });
        continue;
      }
      const after = await page.evaluate(paint);
      hit.repainted = themed(after, row.light);
      if (hit.repainted) {
        row.afterClick = after;
        row.clickChanged = true;
        await page.screenshot({ path: path.join(OUT, `${key}-after-toggle.png`) });
        break;
      }
    }
    if (row.clickChanged !== true && hits.some((h) => h.visible)) row.clickChanged = false;
  } catch (e) {
    row.lightError = String(e).slice(0, 160);
  }
  await ctx.close();

  row.osDarkFollows = themed(row.osDark, row.light);
  row.alwaysDark = !row.osDarkFollows && isDark(row.osDark) === true;
  // A site with no light mode has nothing to switch away from, so it is not
  // missing dark mode — it IS dark mode.
  row.reachable = row.osDarkFollows || row.alwaysDark || row.clickChanged === true;

  results[p] = row;
  const os = row.osDarkFollows ? 'follows ' : row.alwaysDark ? 'always  ' : 'ignores ';
  const tg = row.toggleCandidates?.some((h) => h.visible)
    ? (row.clickChanged ? 'works  ' : 'dead   ')
    : 'none   ';
  console.log(`${p.padEnd(12)} os-dark:${os} toggle:${tg} => ${row.reachable ? 'reachable' : 'UNREACHABLE'}`);
}

await browser.close();
fs.writeFileSync(path.join(OUT, '_dark-toggle.json'), JSON.stringify(results, null, 2), 'utf8');
const bad = Object.values(results).filter((r) => !r.reachable).map((r) => r.route);
const always = Object.values(results).filter((r) => r.alwaysDark).map((r) => r.route);
console.log(`\n${Object.keys(results).length - bad.length}/${Object.keys(results).length} reachable`);
if (always.length) console.log(`dark by design, no light mode to switch from: ${always.join(' ')}`);
if (bad.length) console.log(`unreachable: ${bad.join(' ')}`);
console.log(`-> ${OUT}\\_dark-toggle.json`);
process.exit(bad.length ? 1 : 0);
