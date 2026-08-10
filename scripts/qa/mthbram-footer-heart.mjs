/**
 * §6 (core.issues #5) — mthbram's donation banner drew the same mark twice.
 *
 * QA/platform/_icon-slots-mthbram.md, measured against production on 10/08,
 * lists slots 15 and 16 in one band of the page:
 *
 *   | 15 | מעוניינים להיות שותפים... | `heart` | 12px | ... | שותפים בהפצת התורה |
 *   | 16 | מעוניינים להיות שותפים... | `heart` | 16px | ... | תרומה דרך נדרים פלוס |
 *
 * A chip whose own text reads "שותפים בהפצת התורה", and fifteen lines below it
 * the CTA that actually donates — both carrying a heart. That is fault A from
 * icon-decisions.mjs ("one control, the same mark twice"), and the reason it is
 * checked here rather than there: `decisions` counts SLOTS, so deleting one of
 * two hearts that sit in two different slots moves the count by one and says
 * nothing about whether the right one went. The zchuyot round learned this the
 * expensive way — two real fixes, every number identical bit-for-bit.
 *
 * So this asserts the shape directly, and against the built artifact rather than
 * the source, because the source is not what a visitor gets:
 *
 *   1. the banner has exactly ONE heart, and it is on the donate link
 *   2. the chip's words survived — the fix removes a mark, not a label
 *   3. the rest of the page is untouched (heart count elsewhere: 0 before, 0 after)
 *
 * Production is read in the same run for the "before" side, so the two numbers
 * come from the same measurement and not from a note.
 *
 *   node scripts/qa/mthbram-footer-heart.mjs
 *
 * Serves apps/21-mthbram/dist under /mthbram/ (the base vite.config.ts compiles
 * in) from a temp copy — Playwright blocks file:, and the absolute /mthbram/assets
 * references in index.html cannot resolve when dist is served at the root.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, cp, rm } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 8141;
const STAGE = join(tmpdir(), 'm30-mthbram-check');
const OUT = 'QA/platform/mthbram-heart-0810';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

await rm(STAGE, { recursive: true, force: true });
await cp('apps/21-mthbram/dist', join(STAGE, 'mthbram'), { recursive: true });

const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = resolve(STAGE, rel === '' ? 'index.html' : rel);
  if (file !== STAGE && !file.startsWith(STAGE + sep)) { res.writeHead(404); return res.end(); }
  // The SPA is mounted on a path and its router matches "/mthbram/", not
  // "/mthbram/index.html" — asking for the file directly renders the app's own
  // not-found page, which has no banner and reads as a failed fix.
  const spa = () => readFile(join(STAGE, 'mthbram', 'index.html'));
  try {
    const body = extname(file) ? await readFile(file) : await spa();
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/**
 * The banner is found by its own heading, not by a class or a nth-child: the
 * class list is tailwind and would match the fix's own markup change, and the
 * heading is the string a reader sees.
 */
const readBanner = () => {
  const heads = [...document.querySelectorAll('h3')];
  const h = heads.find((e) => (e.textContent || '').includes('שותפים בהפצת התורה'));
  const band = h?.closest('div');
  const inBand = band ? [...band.querySelectorAll('svg[class*="lucide-heart"]')] : [];
  const onDonate = inBand.filter((s) => /matara\.pro|nedarim/i.test(s.closest('a')?.getAttribute('href') || ''));
  return {
    found: !!band,
    heading: (h?.textContent || '').replace(/\s+/g, ' ').trim(),
    chipText: [...(band?.querySelectorAll('span') || [])]
      .map((e) => (e.textContent || '').trim()).find((t) => t === 'שותפים בהפצת התורה') || '',
    heartsInBanner: inBand.length,
    heartsOnDonateLink: onDonate.length,
    heartsOnPage: document.querySelectorAll('svg[class*="lucide-heart"]').length,
    donateLabel: (band?.querySelector('a[href*="matara.pro"]')?.textContent || '').replace(/\s+/g, ' ').trim(),
    externalLinkOnDonate: (band?.querySelectorAll('a[href*="matara.pro"] svg[class*="lucide-external-link"]') || []).length,
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
  const f = await page.evaluate(readBanner);
  const h = await page.$('h3:has-text("שותפים בהפצת התורה")');
  if (h) { await h.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); }
  await shot(page, name, 'footer');
  await page.close();
  return f;
};

const before = await visit('https://more30.com/mthbram/?cb=' + process.pid, 'production-before');
const after = await visit(`http://127.0.0.1:${PORT}/mthbram/`, 'built-after');
await browser.close();
server.close();
await rm(STAGE, { recursive: true, force: true });

const checks = [
  ['production banner located', before.found],
  ['production drew the mark twice', before.heartsInBanner === 2],
  ['production heart also on the donate link', before.heartsOnDonateLink === 1],
  ['built banner located', after.found],
  ['built banner draws one heart', after.heartsInBanner === 1],
  ['the surviving heart is the donate link', after.heartsOnDonateLink === 1],
  ['chip kept its words', after.chipText === 'שותפים בהפצת התורה'],
  ['chip words unchanged from production', after.chipText === before.chipText],
  ['heading unchanged', after.heading === before.heading],
  ['donate label unchanged', after.donateLabel === before.donateLabel],
  ['external-link mark kept (opens a new tab)', after.externalLinkOnDonate === 1],
  ['no heart anywhere else, before', before.heartsOnPage === before.heartsInBanner],
  ['no heart anywhere else, after', after.heartsOnPage === after.heartsInBanner],
  ['exactly one mark removed', before.heartsOnPage - after.heartsOnPage === 1],
];

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/_results.json`,
  JSON.stringify({ before, after, checks: checks.map(([n, ok]) => ({ check: n, ok })) }, null, 2), 'utf8');

for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
const bad = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - bad}/${checks.length}  -> ${OUT}/`);
process.exit(bad ? 1 : 0);
