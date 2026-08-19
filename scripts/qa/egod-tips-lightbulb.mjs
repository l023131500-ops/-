/**
 * §6 (core.issues #5) — egod's tips band drew the same mark twice.
 *
 * QA/platform/_icon-slots-egod.md, measured against production on 10/08, lists
 * slots 9 and 10 in one section of the page:
 *
 *   |  9 | תובנה קצרה ליום... | `lightbulb` | 16px | ... | טיפים וכלים למגיד השיעור |
 *   | 10 | תובנה קצרה ליום... | `lightbulb` | 24px | ... | הקשב לקהל תן מקום לשאלות... |
 *
 * An eyebrow chip whose own words open with "טיפים", and below it the rotating
 * card's tile — both carrying a lightbulb. Fault A from icon-decisions.mjs
 * ("one control, the same mark twice"), the same shape the mthbram round found
 * in a donation banner, in a different system.
 *
 * The chip's glyph is the one removed. The card's tile keeps its lightbulb:
 * a rotating card draws a tip's title and body and nothing on it says the word
 * "tip", so there the mark carries what the text does not. The chip's words say
 * it already.
 *
 * Why this is asserted here and not by `decisions`: that count is per SLOT, and
 * the two lightbulbs sat in two different slots — deleting one moves the number
 * by exactly one and says nothing about whether the right one went. The zchuyot
 * round learned this the expensive way (two real fixes, every number in
 * _icon-decisions.json identical bit-for-bit).
 *
 * So the shape is checked directly, and against the built artifact rather than
 * the source, because the source is not what a visitor gets:
 *
 *   1. the band has exactly ONE lightbulb, and it is the card's tile
 *   2. the chip's words survived — the fix removes a mark, not a label
 *   3. the rest of the page is untouched (lightbulb count elsewhere unchanged)
 *
 * Production is read in the same run for the "before" side, so both sides of the
 * comparison are measured and neither is a note.
 *
 *   node scripts/qa/egod-tips-lightbulb.mjs
 *
 * Serves apps/15-egod/dist under /egod/ (the base vite.config.ts compiles in)
 * from a temp copy — Playwright blocks file:, and the absolute /egod/assets
 * references in index.html cannot resolve when dist is served at the root.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, cp, rm } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 8142;
const STAGE = join(tmpdir(), 'm30-egod-check');
const OUT = 'QA/platform/egod-lightbulb-0810';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

await rm(STAGE, { recursive: true, force: true });
await cp('apps/15-egod/dist', join(STAGE, 'egod'), { recursive: true });

const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = resolve(STAGE, rel === '' ? 'index.html' : rel);
  if (file !== STAGE && !file.startsWith(STAGE + sep)) { res.writeHead(404); return res.end(); }
  // The SPA is mounted on a path and its router matches "/egod/", not
  // "/egod/index.html" — asking for the file directly renders the app's own
  // not-found page, which has no tips band and reads as a failed fix.
  const spa = () => readFile(join(STAGE, 'egod', 'index.html'));
  try {
    const body = extname(file) ? await readFile(file) : await spa();
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/**
 * The band is found by its own heading, not by a class or an nth-child: the
 * class list is tailwind and would match the fix's own markup change, and the
 * heading is the string a reader sees. The card's tile is identified by the
 * tip title next to it, not by position, for the same reason.
 */
const readBand = () => {
  const heads = [...document.querySelectorAll('h2')];
  const h = heads.find((e) => (e.textContent || '').includes('תובנה קצרה ליום'));
  const band = h?.closest('section');
  const q = (sel) => (band ? [...band.querySelectorAll(sel)] : []);
  const bulbs = q('svg[class*="lucide-lightbulb"]');
  // The card is the element that also holds the rotating tip's h3; the chip is
  // the pill above the heading. A lightbulb belongs to one or the other.
  const card = band?.querySelector('h3')?.closest('div.relative') || null;
  return {
    found: !!band,
    heading: (h?.textContent || '').replace(/\s+/g, ' ').trim(),
    chipText: q('div').map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
      .find((t) => t === 'טיפים וכלים למגיד השיעור') || '',
    bulbsInBand: bulbs.length,
    bulbsOnCard: card ? [...card.querySelectorAll('svg[class*="lucide-lightbulb"]')].length : -1,
    bulbsOnPage: document.querySelectorAll('svg[class*="lucide-lightbulb"]').length,
    tipTitle: (band?.querySelector('h3')?.textContent || '').replace(/\s+/g, ' ').trim(),
    // The carousel controls are the part of this band that must not move.
    arrows: q('svg[class*="lucide-chevron"]').length,
    dots: q('[role="tab"]').length,
  };
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const shot = async (page, name, sel) => {
  fs.mkdirSync(OUT, { recursive: true });
  const el = sel ? await page.$(sel) : null;
  await (el || page).screenshot({ path: `${OUT}/${name}.png` });
};

const visit = async (url, name) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1200);
  const f = await page.evaluate(readBand);
  const h = await page.$('h2:has-text("תובנה קצרה ליום")');
  if (h) { await h.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); }
  const sec = await page.$('h2:has-text("תובנה קצרה ליום")');
  await shot(page, name, sec ? 'section:has(h2:has-text("תובנה קצרה ליום"))' : null);
  await page.close();
  return f;
};

const before = await visit('https://more30.com/egod/?cb=' + process.pid, 'production-before');
const after = await visit(`http://127.0.0.1:${PORT}/egod/`, 'built-after');
await browser.close();
server.close();
await rm(STAGE, { recursive: true, force: true });

const checks = [
  ['production tips band located', before.found],
  ['production drew the mark twice', before.bulbsInBand === 2],
  ['production card tile carried one of them', before.bulbsOnCard === 1],
  ['built band located', after.found],
  ['built band draws one lightbulb', after.bulbsInBand === 1],
  ['the surviving lightbulb is the card tile', after.bulbsOnCard === 1],
  ['chip kept its words', after.chipText === 'טיפים וכלים למגיד השיעור'],
  ['chip words unchanged from production', after.chipText === before.chipText],
  ['heading unchanged', after.heading === before.heading],
  ['carousel arrows unchanged', after.arrows === before.arrows && after.arrows === 2],
  ['tip dots unchanged', after.dots === before.dots && after.dots > 0],
  ['no lightbulb elsewhere on the page, before', before.bulbsOnPage === before.bulbsInBand],
  ['no lightbulb elsewhere on the page, after', after.bulbsOnPage === after.bulbsInBand],
  ['exactly one mark removed', before.bulbsOnPage - after.bulbsOnPage === 1],
];

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/_results.json`,
  JSON.stringify({ before, after, checks: checks.map(([n, ok]) => ({ check: n, ok })) }, null, 2), 'utf8');

for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
const bad = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - bad}/${checks.length}  -> ${OUT}/`);
process.exit(bad ? 1 : 0);
