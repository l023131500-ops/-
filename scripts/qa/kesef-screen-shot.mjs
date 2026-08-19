/**
 * core.issues #86 — the kesef screen, photographed.
 *
 * kesef-screen-render.mjs proves that every key the screen reads is a key the
 * function returns. That is a claim about the payload, not about the page: a
 * screen can pass all twelve of those checks and still draw a blank column, a
 * table with a header and no rows, or a KPI tile reading NaN. This opens the
 * rendered copy in a real browser and photographs it, light and dark, desktop
 * and phone.
 *
 * Two assertions run against the loaded DOM, both about the thing the screen
 * exists to say — that kesef holds 283 rows and not one of them was ingested:
 *
 *   • the content block is visible and #denied is not. A stub session that
 *     failed to satisfy the auth branch would leave the page on "טוען…" and
 *     photograph as an empty frame.
 *
 *   • the gap paragraph, the ingestion table and the tables list all carry
 *     text. These are the three sections built from loops; each is empty
 *     markup until the payload fills it.
 *
 * Reads QA/platform/kesef-screen-0810/render.html — no server, no keys, no
 * network (the harness already stripped the esm.sh import).
 *
 *   node scripts/qa/kesef-screen-shot.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, 'QA', 'platform', 'kesef-screen-0810');
const URL = pathToFileURL(join(DIR, 'render.html')).href;

const SHOTS = [
  { name: '01-desktop-light.png', scheme: 'light', width: 1280, height: 900 },
  { name: '02-desktop-dark.png', scheme: 'dark', width: 1280, height: 900 },
  { name: '03-mobile-light.png', scheme: 'light', width: 390, height: 844 },
];

const checks = [];
const check = (ok, what) => checks.push({ ok: !!ok, what });

mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch();
let seen = null;

for (const s of SHOTS) {
  const ctx = await browser.newContext({
    colorScheme: s.scheme,
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const failed = [];
  page.on('pageerror', (e) => failed.push(String(e)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#content:not([hidden])', { timeout: 8000 });
  await page.screenshot({ path: join(DIR, s.name), fullPage: true });

  check(!failed.length, `${s.name} — the page threw nothing (${failed[0] ?? 'clean'})`);

  if (!seen) {
    seen = await page.evaluate(() => ({
      denied: !!document.getElementById('denied') && !document.getElementById('denied').hidden,
      gap: document.getElementById('gap').textContent.trim(),
      kpis: document.querySelectorAll('#kpis .kpi').length,
      zeroKpis: document.querySelectorAll('#kpis .kpi.zero').length,
      ingestionRows: document.querySelectorAll('#ingestion tr').length - 1,
      coverageRows: document.querySelectorAll('#coverage tr').length - 1,
      catalogChips: document.querySelectorAll('#catalog .chip').length,
      productChips: document.querySelectorAll('#product .chip').length,
      tableChips: document.querySelectorAll('#tables .chip').length,
      notes: document.querySelectorAll('#notes p').length,
      stamp: document.getElementById('stamp').textContent.trim(),
      nan: document.body.innerText.includes('NaN'),
    }));
  }
  await ctx.close();
}
await browser.close();

check(seen && !seen.denied, 'the screen drew its content and not the access notice');
check(seen?.gap.includes('283'), 'the gap paragraph names the 283 rows it was written to explain');
check(seen?.kpis === 8, `eight KPI tiles drew (${seen?.kpis})`);
// ‏ארבעה ולא חמישה: הריקים הם sources_ok, sync_runs, facts ו-users. אריח
// ‏«טבלאות ריקות» מראה 32, שהוא מספר גדול ונכון — הוא לא אמור להיצבע כאפס.
check(seen?.zeroKpis === 4, `four of them are marked zero (${seen?.zeroKpis})`);
check(seen?.ingestionRows === 12, `twelve ingestion sources drew (${seen?.ingestionRows})`);
check(seen?.coverageRows === 8, `eight coverage columns drew (${seen?.coverageRows})`);
check(seen?.catalogChips === 13, `thirteen catalog chips drew (${seen?.catalogChips})`);
check(seen?.productChips === 10, `ten product counters drew (${seen?.productChips})`);
check(seen?.tableChips === 36, `all 36 kesef tables are listed (${seen?.tableChips})`);
check(seen?.notes === 2, `the two closing notes drew (${seen?.notes})`);
check(seen?.stamp.length > 6, `the generated-at stamp is filled ("${seen?.stamp}")`);
check(seen && !seen.nan, 'no tile reads NaN');

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.what}`);

writeFileSync(
  join(DIR, '_shots.json'),
  JSON.stringify({
    ran: 'scripts/qa/kesef-screen-shot.mjs',
    issue: 86,
    of: 'QA/platform/kesef-screen-0810/render.html',
    shots: SHOTS.map((s) => s.name),
    dom: seen,
    checks,
    summary: { pass: checks.length - failures.length, total: checks.length },
  }, null, 2) + '\n',
  'utf8',
);

console.log(`\n${checks.length - failures.length}/${checks.length} pass  →  QA/platform/kesef-screen-0810/`);
process.exit(failures.length ? 1 : 0);
