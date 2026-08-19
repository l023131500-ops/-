/**
 * §2 + §3 — which URL actually PAINTS the admin entry of an SPA mount?
 *
 * core.issues #85 is the question this exists for, and it is a question
 * admin-entry-probe.mjs is structurally unable to answer. That probe decides
 * whether a recorded path is a route by fetching it beside a sibling that
 * cannot exist and comparing the two documents. On a client-routed SPA the
 * host answers every path under the mount with the same shell, so `/admin`,
 * `/auth/sign-in` and `/qa-does-not-exist` are byte-identical over HTTP. The
 * probe correctly reports "cannot tell" and stops. Telling them apart requires
 * running the router, which means a browser.
 *
 * ── what is measured, and why each signal is here
 *   landed        where the router LEFT us. A gated admin route does not stay
 *                 put — it redirects — and the destination it redirects to is
 *                 the evidence, not a failure to load.
 *   redirect back a login reached from /admin should carry the way back
 *                 (`?redirect=/admin`). A login that does not is a different
 *                 screen from the one the record should name: it returns the
 *                 admin to the home page after they sign in.
 *   password      a login screen rendered, rather than a shell or a 404.
 *   adminChrome   the console itself rendered — nav labels that exist only
 *                 behind the gate. Present without a password field means we
 *                 are already inside.
 *   notFound      the app's own 404 component. This is the answer HTTP could
 *                 not give: the path is not a route at all.
 *
 * ── the trap this script is shaped around
 * `redirect`, `next`, `return`, `returnTo` and `from` are all in use across
 * these systems, so the return trip is read from ANY of them rather than from
 * the one name torah happens to use. Hardcoding `redirect` would report
 * "loses the return trip" about a system that preserves it under another key.
 *
 * Reads production only. No sign-in is attempted, nothing is written, nothing
 * is charged.
 *
 *   node scripts/qa/spa-admin-route.mjs                     # torah, issue #85
 *   node scripts/qa/spa-admin-route.mjs /imud /admin /manage
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { settle } from './lib/settle.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

const argv = process.argv.slice(2);
const MOUNT = (argv[0] ?? '/torah').replace(/\/$/, '');
/** The candidates come from the app's own route table, not from guesswork. */
const CANDIDATES = argv.length > 1 ? argv.slice(1) : ['/admin', '/auth/sign-in', '/legacy/admin', '/legacy/admin-login'];

const SHOT_DIR = join(ROOT, 'QA', 'platform', `spa-admin${MOUNT.replace(/\//g, '-')}-0807`);
const OUT = join(SHOT_DIR, '_results.json');

/** Any of the five names in use across these systems for "come back here". */
const RETURN_KEYS = ['redirect', 'next', 'return', 'returnTo', 'from'];

/** Labels the console renders and no public page does. */
const ADMIN_CHROME = ['סופר אדמין', 'ניהול מערכת', 'לוח בקרה', 'ארגונים'];

mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const rows = [];

console.log(`=== which URL paints the admin entry of ${MOUNT}? ===\n`);

for (const candidate of CANDIDATES) {
  const url = `${ORIGIN}${MOUNT}${candidate}`;
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  let row = { candidate, url };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // minChars 50: an unpainted SPA is 0 characters and reads as three stable
    // samples of a finished page.
    await settle(page, { minChars: 50 }).catch(() => {});

    const seen = await page.evaluate((chrome) => ({
      landed: location.href,
      textLen: document.body.innerText.length,
      password: !!document.querySelector('input[type=password]'),
      heading: (document.querySelector('h1, h2')?.innerText ?? '').trim().slice(0, 80),
      notFound: /(^|\D)404(\D|$)/.test(document.body.innerText),
      adminChrome: chrome.filter((s) => document.body.innerText.includes(s)),
    }), ADMIN_CHROME);

    const landed = new URL(seen.landed);
    const returnTo = RETURN_KEYS.map((k) => landed.searchParams.get(k)).find(Boolean) ?? null;
    const stayed = landed.pathname.replace(/\/$/, '') === `${MOUNT}${candidate}`.replace(/\/$/, '');

    let verdict;
    if (seen.notFound) verdict = 'not-a-route';
    else if (seen.adminChrome.length && !seen.password) verdict = 'admin-console';
    else if (seen.password && returnTo && /admin|console|nihul/i.test(returnTo)) verdict = 'login-returning-to-admin';
    else if (seen.password) verdict = 'login-generic';
    else if (!stayed) verdict = 'bounced';
    else verdict = 'public-page';

    row = { ...row, status: resp?.status() ?? 0, ...seen, stayed, returnTo, verdict };
    await page.screenshot({ path: join(SHOT_DIR, `${candidate.replace(/\//g, '-').replace(/^-/, '')}.png`), fullPage: false });
  } catch (e) {
    row = { ...row, verdict: 'errored', error: String(e.message ?? e) };
  }
  await page.close();

  rows.push(row);
  console.log(
    `  ${row.verdict.padEnd(26)} ${candidate.padEnd(20)} -> ${row.landed ?? '—'}\n` +
      `  ${''.padEnd(26)} ${''.padEnd(20)}    ${row.textLen ?? 0} chars · password=${!!row.password} · ` +
      `back=${row.returnTo ?? '—'} · chrome=${row.adminChrome?.join('/') || '—'}\n`,
  );
}

await browser.close();
writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), origin: ORIGIN, mount: MOUNT, rows }, null, 2), 'utf8');

const best =
  rows.find((r) => r.verdict === 'admin-console') ??
  rows.find((r) => r.verdict === 'login-returning-to-admin') ??
  rows.find((r) => r.verdict === 'login-generic');

console.log(`the admin entry of ${MOUNT} is: ${best ? best.candidate + ` (${best.verdict})` : 'not found among the candidates'}`);
console.log(`evidence: ${OUT.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
