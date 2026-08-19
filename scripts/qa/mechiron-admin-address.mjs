/**
 * The board records /admin as #27's admin entry. Is there any address under
 * the mount that reaches an admin screen?
 *
 * admin-entry-resolves.mjs (0807) opened all thirteen recorded entries and
 * found exactly one that lands on a screen nobody is asked to sign in to:
 * https://more30.com/mechiron/admin, which renders the same marketing page as
 * /mechiron/ itself. That measurement says the link is wrong. It does not say
 * whether a right one exists.
 *
 * The source answers that, and it answers it twice over
 * (apps/27-bkalut-price/client/src/App.tsx):
 *
 *   1. line 211  <Router hook={useHashLocation}> — the app routes on the hash,
 *      not the path. "/admin" as a path is not a route at all; the router reads
 *      an empty hash, resolves "/", and draws the public landing page. So the
 *      recorded address is wrong in *form*.
 *   2. line 198  the internal area is entered only when isAdminSubdomain() is
 *      true, and that reads window.location.hostname.startsWith("admin.").
 *      Under more30.com/mechiron the hostname is more30.com, so even the
 *      correctly-formed "#/admin" falls through to <NotFound />. So no address
 *      is right in *substance* either.
 *
 * This opens all four candidates against production and records what each one
 * actually draws, so the claim rests on the screen and not on a reading of the
 * source:
 *
 *   /mechiron/          the public root, for comparison
 *   /mechiron/admin     the address core.projects records today
 *   /mechiron/#/admin   the same route in the form this router does read
 *   /mechiron/#/login   the sign-in the admin screen redirects to
 *
 *   node scripts/qa/mechiron-admin-address.mjs
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'QA/platform/mechiron-admin-address-0807';
const ORIGIN = 'https://more30.com';

const CANDIDATES = [
  { key: 'root',       url: `${ORIGIN}/mechiron/`,        why: 'the public root, for comparison' },
  { key: 'recorded',   url: `${ORIGIN}/mechiron/admin`,   why: 'core.projects.admin_url as recorded' },
  { key: 'hash-admin', url: `${ORIGIN}/mechiron/#/admin`, why: 'the same route, in the form useHashLocation reads' },
  { key: 'hash-login', url: `${ORIGIN}/mechiron/#/login`, why: 'the sign-in that guards it' },
];

/** Only a credential prompt counts as a gate — a nav word does not. */
const GATE = /סיסמה|התחברות|התחבר עם|password|sign ?in|log ?in/i;
/** wouter's fallthrough route in this app. */
const NOT_FOUND = /404|לא נמצא|not found/i;

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 900 } });

const rows = [];
console.log('\nthe four candidate addresses for #27\'s admin screen, opened against production\n');

for (const c of CANDIDATES) {
  const page = await ctx.newPage();
  const row = { ...c, status: null, final_url: null, h1: null, text: '', renders: null };
  try {
    const resp = await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    row.status = resp ? resp.status() : null;
    // A hash change after load does not renavigate; the router reacts in JS.
    await page.waitForTimeout(3000);
    row.final_url = page.url();
    const seen = await page.evaluate(() => ({
      title: document.title,
      h1: (document.querySelector('h1')?.innerText || '').trim().slice(0, 140),
      text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim(),
    }));
    row.title = seen.title;
    row.h1 = seen.h1;
    row.text = seen.text.slice(0, 600);
    row.text_len = seen.text.length;
    row.renders = NOT_FOUND.test(seen.text) ? 'not_found'
                : GATE.test(seen.text) ? 'asks_to_sign_in'
                : 'a_screen_with_no_gate';
    await page.screenshot({ path: `${OUT}/${c.key}.png` }).catch(() => {});
  } catch (err) {
    row.error = String(err.message || err).slice(0, 160);
    row.renders = 'unreachable';
  }
  await page.close();
  rows.push(row);
  console.log(`  ${String(row.renders).padEnd(22)} ${c.url}`);
  console.log(`  ${''.padEnd(22)} h1: ${row.h1 || '—'}`);
}

const gated = rows.filter((r) => r.renders === 'asks_to_sign_in');

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  at: new Date().toISOString(),
  origin: ORIGIN,
  app: 'mechiron',
  measured: 'production, logged out',
  recorded_admin_url: '/admin',
  source: 'apps/27-bkalut-price/client/src/App.tsx — useHashLocation (211), isAdminSubdomain (198)',
  addresses_that_reach_a_sign_in: gated.map((r) => r.url),
  rows,
}, null, 2));

await browser.close();
console.log(`\n  ${gated.length} of ${rows.length} addresses reach a screen that asks anyone to sign in`);
console.log(`  results: ${OUT}/_results.json\n`);
