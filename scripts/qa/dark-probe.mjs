// dark-probe.mjs — is there already a designed dark theme sitting unused?
//
// Most of these apps were generated on Tailwind/shadcn, which ships a full
// `.dark { --background: ... }` token set and then never enables it. If that is
// the case here, "adding dark mode" is not designing thirteen themes — it is
// turning on the theme the app's own designer already wrote, which is both far
// less risky and visually correct.
//
// This asks the page itself, in production:
//   1. do the loaded stylesheets define a .dark (or [data-theme=dark]) block?
//   2. if the class is applied, does the rendered background actually change?
//   3. and does it stay readable (contrast between text and background)?

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const OUT = process.argv[2] || 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform\\dark';

const ROUTES = process.argv.slice(3).length ? process.argv.slice(3) : [
  '/torah', '/tamlul', '/modaot', '/imud', '/briut', '/bkalot', '/egod',
  '/chizukim/', '/orech', '/zchuyot', '/studio', '/mechiron', '/nadlan',
  '/login', '/galil', '/crm', '/gesher',
];

fs.mkdirSync(OUT, { recursive: true });

const PROBE = () => {
  const out = { darkRules: [], sheetsUnreadable: 0 };
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { out.sheetsUnreadable++; continue; }
    if (!rules) continue;
    for (const rule of rules) {
      const sel = rule.selectorText || '';
      if (/(^|[\s,])(\.dark|\[data-theme=["']?dark|:root\.dark|html\.dark)/.test(sel)) {
        out.darkRules.push({ sel: sel.slice(0, 90), decl: (rule.style?.cssText || '').slice(0, 160) });
      }
      // a media-query dark block that exists but is being overridden is also useful to know
      if (rule.media && /prefers-color-scheme:\s*dark/.test(rule.media.mediaText || '')) {
        out.darkRules.push({ sel: `@media ${rule.media.mediaText}`, decl: `${rule.cssRules?.length || 0} rules` });
      }
    }
  }
  out.darkRules = out.darkRules.slice(0, 12);
  return out;
};

const paint = () => {
  const bg = (el) => getComputedStyle(el).backgroundColor;
  const opaque = (c) => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent';
  let el = document.body;
  while (el && !opaque(bg(el))) el = el.parentElement;

  // A page can paint its background with a gradient rather than a colour, and
  // then `backgroundColor` stays transparent all the way up — which this probe
  // used to report as "no change" even when the theme flipped correctly.
  // Measured on /galil: body background-image went from rgb(245,247,249) to
  // rgb(14,24,32) while every backgroundColor stayed rgba(0,0,0,0). So the
  // gradient counts as paint, and is reported alongside the colour.
  const image = (e) => {
    const v = getComputedStyle(e).backgroundImage;
    return v && v !== 'none' ? v.slice(0, 160) : '';
  };
  const bodyImage = image(document.body) || image(document.documentElement);

  return {
    effectiveBg: el ? bg(el) : bg(document.documentElement),
    bodyImage,
    bodyBg: bg(document.body),
    htmlBg: bg(document.documentElement),
    fg: getComputedStyle(document.body).color,
    // a real theme switch moves many surfaces, not just the page background
    surfaces: [...document.querySelectorAll('header, nav, main, section, article, .card, [class*="card"]')]
      .slice(0, 8).map((e) => bg(e)),
  };
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const results = {};

for (const p of ROUTES) {
  const key = p.replace(/\//g, '') || 'home';
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  try {
    await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);

    const css = await page.evaluate(PROBE);
    const before = await page.evaluate(paint);

    // turn the dormant theme on, every way the common toolchains spell it
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    });
    await page.waitForTimeout(900);
    const after = await page.evaluate(paint);
    await page.screenshot({ path: path.join(OUT, `${key}-forced-dark.png`) });

    results[p] = {
      hasDarkRules: css.darkRules.length > 0,
      darkRuleSample: css.darkRules,
      sheetsUnreadable: css.sheetsUnreadable,
      before, after,
      changed: before.effectiveBg !== after.effectiveBg || before.bodyImage !== after.bodyImage,
    };
    const via = before.effectiveBg !== after.effectiveBg ? '' : ' (via gradient)';
    const shown =
      before.effectiveBg !== after.effectiveBg
        ? `${before.effectiveBg} -> ${after.effectiveBg}`
        : `${before.bodyImage.slice(0, 40)} -> ${after.bodyImage.slice(0, 40)}`;
    console.log(`${p.padEnd(14)} rules:${css.darkRules.length}  ${shown}  ${results[p].changed ? 'CHANGED' + via : 'no change'}`);
  } catch (e) {
    results[p] = { error: String(e).slice(0, 160) };
    console.log(`${p.padEnd(14)} ERROR ${String(e).slice(0, 90)}`);
  }
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, '_dark-probe.json'), JSON.stringify(results, null, 2), 'utf8');
console.log(`\n-> ${OUT}\\_dark-probe.json`);
