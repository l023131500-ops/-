/**
 * Does a route gate hold — measured on the build, before it can be deployed?
 *
 * spa-admin-route.mjs answers the same question against more30.com, and that is
 * the answer that counts. But production deploys are blocked whenever the
 * Vercel daily quota is spent (core.issues #83), and a security fix that cannot
 * be measured until the window resets is a fix nobody has checked. This runs
 * the same measurement against `vite preview`, which serves dist/ under the
 * app's own `base` — the same bundle, the same router, the same basename.
 *
 * What it reports per route, for a visitor with no session:
 *   landed      where the router left us. A gate that holds does not stay put.
 *   textLen     an ungated console paints its board; a gate paints a spinner
 *               or nothing before it redirects.
 *   password    the sign-in screen rendered.
 *   chrome      labels that exist only behind the gate.
 *
 * A fresh browser context per route: a leaked session would make a gate look
 * open when it is closed, or closed when it is open.
 *
 *   node scripts/qa/local-route-gate.mjs http://localhost:4173/torah \
 *        /legacy/admin /legacy/ivr /legacy/nedarim /admin
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { settle } from './lib/settle.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const argv = process.argv.slice(2);
const BASE = (argv[0] ?? 'http://localhost:4173/torah').replace(/\/$/, '');
const ROUTES = argv.slice(1);
if (!ROUTES.length) {
  console.error('usage: node scripts/qa/local-route-gate.mjs <base-url> <route> [route...]');
  process.exit(2);
}

const SHOT_DIR = join(ROOT, 'QA', 'platform', `route-gate-${new URL(BASE).pathname.replace(/\//g, '-').replace(/^-|-$/g, '') || 'root'}-local`);
mkdirSync(SHOT_DIR, { recursive: true });

/** Labels the consoles render and no public page does. */
const ADMIN_CHROME = ['סופר אדמין', 'ניהול מערכת', 'לוח ניהול', 'ארגונים', 'ייצוא לנדרים'];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const rows = [];

console.log(`=== route gates on ${BASE} (no session) ===\n`);

for (const route of ROUTES) {
  const url = `${BASE}${route}`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  let row = { route, url };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await settle(page, { minChars: 20 }).catch(() => {});

    const seen = await page.evaluate((chrome) => ({
      landed: location.pathname + location.search,
      textLen: document.body.innerText.length,
      password: !!document.querySelector('input[type=password]'),
      heading: (document.querySelector('h1, h2')?.innerText ?? '').trim().slice(0, 80),
      adminChrome: chrome.filter((s) => document.body.innerText.includes(s)),
    }), ADMIN_CHROME);

    const stayed = seen.landed.split('?')[0].replace(/\/$/, '') === new URL(url).pathname.replace(/\/$/, '');
    const verdict = seen.adminChrome.length && !seen.password ? 'OPEN — console painted'
      : seen.password ? 'gated — sign-in'
      : !stayed ? 'gated — bounced'
      : 'stayed, no console';

    row = { ...row, ...seen, stayed, verdict };
    await page.screenshot({ path: join(SHOT_DIR, `${route.replace(/\//g, '-').replace(/^-/, '')}.png`) });
  } catch (e) {
    row = { ...row, verdict: 'errored', error: String(e.message ?? e) };
  }
  await ctx.close();

  rows.push(row);
  console.log(
    `  ${row.verdict.padEnd(24)} ${route.padEnd(20)} -> ${row.landed ?? '—'}\n` +
      `  ${''.padEnd(24)} ${''.padEnd(20)}    ${row.textLen ?? 0} chars · password=${!!row.password} · chrome=${row.adminChrome?.join('/') || '—'}\n`,
  );
}

await browser.close();
const OUT = join(SHOT_DIR, '_results.json');
writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), base: BASE, rows }, null, 2), 'utf8');

const open = rows.filter((r) => r.verdict.startsWith('OPEN'));
const errored = rows.filter((r) => r.verdict === 'errored');
/* "no route painted a console" is a true sentence about a run where the server
   was never up, and it reads exactly like a pass. Say what was not measured. */
if (errored.length) console.log(`NOT MEASURED (${errored.length}/${rows.length}): ${errored.map((r) => r.route).join(', ')}`);
console.log(open.length ? `OPEN: ${open.map((r) => r.route).join(', ')}` : `no route painted a console without a session (${rows.length - errored.length}/${rows.length} measured)`);
console.log(`evidence: ${OUT.replace(ROOT + '\\', '')}`);
process.exit(open.length || errored.length ? 1 : 0);
