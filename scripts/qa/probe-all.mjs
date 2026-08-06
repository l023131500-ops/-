/**
 * Does every system actually WORK, not merely answer 200?
 *
 * Two systems were serving blank pages behind a perfectly healthy 200: the HTML
 * shell arrived, every script it referenced 404'd, and nothing rendered. A
 * status-code sweep gives those a clean bill of health. This checks the three
 * things that actually distinguish a working page from a dead one:
 *
 *   1. the route answers 200
 *   2. every asset the HTML references also answers 200
 *   3. the rendered DOM contains real text
 *   4. the text is the SYSTEM's, not the portal apologising for it
 *
 * (4) was added on 06/08 because (3) let a real failure through for weeks.
 * `/chatzor` and `/chizukim` were rewritten to the portal's system.html, which
 * renders "השירות הזה עדיין בהכנה" — 190 characters, comfortably over the
 * 150-character bar, so both scored OK while telling every visitor the system
 * did not exist. A generic length threshold cannot tell real content from a
 * well-formed apology; the placeholder has to be named.
 *
 * Writes QA/platform/_works.json for SYSTEMS_STATUS.md to read.
 *
 *   node scripts/qa/probe-all.mjs
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

const ROUTES = [
  ['home', '33', '/'], ['login', '--', '/login'], ['me', '--', '/me'],
  ['torah', '01', '/torah'], ['tamlul', '02', '/tamlul'], ['modaot', '03', '/modaot'],
  ['imud', '04', '/imud'], ['briut', '06', '/briut'], ['bkalot', '10', '/bkalot'],
  ['smel', '12', '/smel'], ['smachot', '14', '/smachot'], ['egod', '15', '/egod'],
  ['chatzor', '16', '/chatzor'], ['chizukim', '17', '/chizukim'], ['orech', '18', '/orech'],
  ['mthbram', '21', '/mthbram'], ['zchuyot', '22', '/zchuyot'], ['galil', '24', '/galil'],
  ['studio', '26', '/studio'], ['mechiron', '27', '/mechiron'], ['kupot', '28', '/kupot'],
  ['crm', '30', '/crm/dashboard'], ['gesher', '31', '/gesher/'], ['nadlan', '32', '/nadlan'],
  ['kesef', '34', '/kesef'], ['kiosk', '35', '/kiosk/'], ['tivuch', '36', '/tivuch'],
];

// The portal's stand-in for a system it has no page for. Matched on the
// sentence rather than on system.html, because the route that serves it is
// exactly what goes wrong — by the time the browser has the text, the rewrite
// that produced it is invisible.
const PLACEHOLDER = 'השירות הזה עדיין בהכנה';

const out = {};
const browser = await chromium.launch({ executablePath: EXE });

for (const [key, sys, path] of ROUTES) {
  const url = ORIGIN + path;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'he-IL' });
  const page = await ctx.newPage();

  // Every failed subresource, captured as it happens rather than inferred.
  const failed = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace(ORIGIN, '')}`);
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));

  let status = 0;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = res ? res.status() : 0;
    await page.waitForTimeout(4200);
  } catch (e) {
    errors.push('navigation: ' + e.message.slice(0, 100));
  }

  const body = await page
    .evaluate(() => (document.body ? document.body.innerText.replace(/\s+/g, ' ').trim() : ''))
    .catch(() => '');
  const text = body.length;
  const placeholder = body.includes(PLACEHOLDER);
  const buttons = await page.locator('button, a[href]').count().catch(() => 0);
  const overflow = await page
    .evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    .catch(() => 0);

  // NetFree injects its own scripts into every page; its failures are the
  // network's, not the system's, and counting them would blame the wrong thing.
  const ours = failed.filter((f) => !/netfree|fonts\.googleapis|fonts\.gstatic/.test(f));

  out[key] = {
    sys, path, status, text, buttons,
    failedAssets: ours.slice(0, 6),
    failedCount: ours.length,
    errors: errors.slice(0, 3),
    overflow,
    placeholder,
    works: status === 200 && text > 150 && ours.length === 0 && !placeholder,
  };
  console.log(
    `${key.padEnd(10)} ${sys.padEnd(3)} ${String(status).padEnd(4)} text=${String(text).padEnd(6)} ` +
    `links=${String(buttons).padEnd(4)} badAssets=${String(ours.length).padEnd(3)} ` +
    `err=${errors.length} ${out[key].works ? 'OK' : placeholder ? '<-- PLACEHOLDER' : '<-- CHECK'}`,
  );
  await ctx.close();
}

await browser.close();
fs.writeFileSync('QA/platform/_works.json', JSON.stringify(out, null, 2), 'utf8');
const broken = Object.entries(out).filter(([, v]) => !v.works).map(([k]) => k);
console.log(`\n${Object.keys(out).length} routes · needs attention: ${broken.join(', ') || 'none'}`);
