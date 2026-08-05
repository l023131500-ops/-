/**
 * Controls that look clickable and do nothing.
 *
 * ⚠️ Why this exists, and why it is not the same check as before.
 *
 * The per-system accessibility sweep looked for anchors with **no href**. The
 * zchuyot brand link passed that check for months while being completely dead:
 * it had `href="#"`. An anchor with a bare hash is a live anchor by every
 * structural measure — it is focusable, it is in the tab order, a screen reader
 * announces it as a link, and CSS gives it `cursor: pointer` — and clicking it
 * does nothing at all.
 *
 * That is worse than a missing link. A control that is visibly absent gets
 * reported by users; a control that looks and feels normal and silently does
 * nothing gets blamed on the person clicking it.
 *
 * I found it by accident, on one page, only because I went looking for the text
 * by hand after the structural sweep came back clean. This asks the same
 * question of every public route so the next one is not found by accident.
 *
 * What counts as dead here:
 *   · href="#"                  — anchor to nothing
 *   · href=""                   — reloads the current page, almost never intended
 *   · href="javascript:void(0)" — the explicit "I am not a link" idiom
 *
 * What deliberately does NOT count:
 *   · href="#section"           — a real in-page target
 *   · <button> with no visible effect — cannot be judged without clicking it,
 *     and guessing would produce exactly the kind of false finding that makes a
 *     check worth ignoring.
 *
 * An `href="#"` is only *reported* here, not auto-condemned: a few libraries
 * render it and attach a click handler. The output prints enough context to
 * decide, and the rule stays that a finding is verified on the page before it
 * is fixed.
 *
 *   node scripts/qa/dead-controls.mjs
 *   node scripts/qa/dead-controls.mjs zchuyot smel
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const ROUTES = {
  torah: '/torah', tamlul: '/tamlul', modaot: '/modaot', imud: '/imud',
  briut: '/briut', bkalot: '/bkalot', smel: '/smel', smachot: '/smachot',
  egod: '/egod', chatzor: '/chatzor/', chizukim: '/chizukim/',
  orech: '/orech', zchuyot: '/zchuyot', mthbram: '/mthbram', galil: '/galil',
  studio: '/studio', mechiron: '/mechiron', kupot: '/kupot',
  nadlan: '/nadlan/', crm: '/crm', gesher: '/gesher', kesef: '/kesef',
  kiosk: '/kiosk/', tivuch: '/tivuch', portal: '/',
};

/**
 * Anchors that carry href="#" but are driven by a real click handler, each
 * cleared by actually clicking it on the live page. They stay listed here
 * rather than being silently ignored, so the reason is auditable:
 *
 *   adminLink  — app.js sets .href = ADMIN_URL at runtime; clicking navigates
 *                to the rights admin screen. Confirmed by a real click.
 *   pricesBtn  — onclick opens PRICES_URL in a new tab (confirmed: a second tab
 *                opened at the price-comparison system) and falls back to a
 *                "coming soon" modal when that URL is not configured.
 *
 * ⚠️ Both of these looked dead to the first two versions of this check. The
 * first watched only the original tab, so a window.open target was invisible;
 * the second compared page text before and after and caught late-loading
 * content as if the click had caused it. A control run that measures twice
 * *without* clicking showed zero drift and settled it. Structure cannot tell
 * you whether a control works — only clicking it can.
 */
const CLEARED = ['adminLink', 'pricesBtn'];

const only = process.argv.slice(2).map((s) => s.replace(/^\//, '').replace(/\/$/, ''));
const targets = Object.entries(ROUTES).filter(([k]) => !only.length || only.includes(k));

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const out = {};
let dead = 0;

for (const [key, route] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, locale: 'he-IL' });
  const rec = { route, dead: [], anchors: 0, error: null };
  try {
    await page.goto('https://more30.com' + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page
      .waitForFunction(() => document.body.innerText.length > 60, undefined, { timeout: 30000 })
      .catch(() => {});

    // Let a client-rendered nav finish before judging what it links to.
    let last = -1, stable = 0;
    for (let i = 0; i < 14 && stable < 2; i++) {
      await page.waitForTimeout(1200);
      const n = await page.evaluate(() => document.body.innerText.length);
      stable = n === last ? stable + 1 : 0;
      last = n;
    }

    const seen = await page.evaluate((cleared) => {
      const DEAD = ['#', '', 'javascript:void(0)', 'javascript:void(0);', 'javascript:;'];
      const found = [];
      document.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href');
        if (href === null) {
          found.push({ href: '(none)', text: (a.textContent || '').trim().slice(0, 40) });
        } else if (DEAD.includes(href.trim()) && !cleared.includes(a.id)) {
          found.push({
            href: href.trim() === '' ? '(empty)' : href.trim(),
            text: (a.textContent || '').trim().slice(0, 40),
            cursor: getComputedStyle(a).cursor,
            id: a.id || null,
          });
        }
      });
      return { found, anchors: document.querySelectorAll('a').length };
    }, CLEARED);

    rec.dead = seen.found;
    rec.anchors = seen.anchors;
  } catch (e) {
    rec.error = String(e.message).slice(0, 90);
  }
  await page.close();
  out[key] = rec;
  dead += rec.dead.length;

  console.log(
    key.padEnd(10) +
      (rec.error
        ? 'ERROR ' + rec.error
        : `anchors=${String(rec.anchors).padEnd(4)} dead=${rec.dead.length}`) +
      (rec.dead.length
        ? '   <<< ' + rec.dead.map((d) => `${d.href} "${d.text}"`).join(' | ')
        : ''),
  );
}

await browser.close();
fs.mkdirSync('QA/platform', { recursive: true });
fs.writeFileSync('QA/platform/_deadcontrols.json', JSON.stringify(out, null, 2), 'utf8');

console.log(`\n${Object.keys(out).length} routes · ${dead} control(s) that look clickable and go nowhere`);
console.log('-> QA/platform/_deadcontrols.json');
console.log(
  '\nEach hit needs looking at on the page before it is fixed: a handful of\n' +
    'component libraries render href="#" and attach a real click handler.',
);
process.exit(dead ? 1 : 0);
