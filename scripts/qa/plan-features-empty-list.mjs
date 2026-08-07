/**
 * Does a plan card with nothing to list still draw a list?
 *
 * core.plans holds 60 rows that are active and customer_visible. Three of them
 * carry features: nadlan/premium, nadlan/vip and more30/premium. The other 57 —
 * 19 live systems × (חינמי · בסיסי · מורחב) — carry `[]`, because what the 2 ₪
 * and the 5 ₪ tiers actually include is core.issues #92 and the user's call to
 * make, not something this repo may invent.
 *
 * Both renderers wrote the list unconditionally:
 *
 *   const feats = (p.features ?? []).map((f) => `<li>…</li>`).join('');
 *   …
 *   <ul>${feats}</ul>
 *
 * so those 57 cards shipped a literal `<ul></ul>`: a list of zero items that a
 * screen reader announces as one, plus the 18px of `.plan ul` margin-bottom
 * sitting under the price with nothing above it to explain the gap. Measured on
 * production before the fix — https://more30.com/system.html?app=kupot returned
 * `<ul></ul>` on all three cards.
 *
 *   node scripts/qa/plan-features-empty-list.mjs
 *
 * Reads plan rows live and renders the pages from portal/public locally, so it
 * checks the HTML in this commit rather than what production still serves. Both
 * directions matter and both are asserted: empty features draw no list at all,
 * and non-empty features still draw every item they used to.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const PORT = 5219;
const OUT = 'QA/platform/plans-empty-list-0807';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

// --- the source: neither renderer may emit a list wrapper on its own again.
// The prose above quotes the old line, so only code lines are searched.
for (const f of ['portal/public/system.html', 'portal/public/subscribe.html']) {
  const offending = (await readFile(f, 'utf8')).split('\n')
    .filter((l) => l.includes('<ul>${feats}</ul>') && !/^\s*(\*|\/\/|<!--)/.test(l));
  ok(`${f} — no unconditional <ul> wrapper in code`, offending.length === 0, offending[0]);
}

// --- the data, read through the same RPC the two pages call. core.plans is not
// exposed over PostgREST, and going around the RPC would test a different path.
const rpc = async (name, body) => {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status} ${await r.text()}`);
  return r.json();
};

// more30_showcase is the wrong list here: 0 systems are flagged for the shop
// window on purpose (core.issues #16), and it returns an empty array. The
// registry view is the one the home page and the sitemap already read, and its
// `path` is the app key. 'more30' is the platform's own tier set and has no
// registry row of its own, so it is asked for by name.
const registry = await fetch(
  `${SUPABASE}/rest/v1/more30_public_systems?select=number,path,live&order=number`,
  { headers: { apikey: ANON, authorization: `Bearer ${ANON}` } },
).then((r) => r.json());
const keys = [...new Set([...registry.map((s) => s.path).filter(Boolean), 'more30'])].sort();
if (keys.length < 2) throw new Error('registry returned no systems');

const byApp = new Map();
const noPlans = [];
for (const app of keys) {
  const page = await rpc('more30_system_page', { p_app: app });
  const plans = page?.plans?.plans ?? page?.plans ?? [];
  if (plans.length) byApp.set(app, plans);
  else noPlans.push(app);
}
// Named rather than dropped: a system missing from the loop is a system this
// run did not check, and a count that only grows silently is not evidence.
if (noPlans.length) console.log(`not checked (no plans on the system page): ${noPlans.join(', ')}`);
const rows = [...byApp.values()].flat();
const emptyRows = rows.filter((p) => !(p.features?.length));
const fullRows = rows.filter((p) => p.features?.length);
console.log(`\n${rows.length} customer-visible plan rows across ${byApp.size} systems: ` +
  `${emptyRows.length} with no features, ${fullRows.length} with features\n`);
ok('there is at least one of each kind to test', emptyRows.length > 0 && fullRows.length > 0);

// --- the pages, rendered against those same rows.
await mkdir(OUT, { recursive: true });
const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1400 } });
const page = await ctx.newPage();

const cardsOn = async (file, app) => {
  await page.goto(`http://127.0.0.1:${PORT}/${file}?app=${encodeURIComponent(app)}`);
  // A page that draws no cards is reported by the caller, not thrown from here:
  // 'more30' is the platform's own tier set and has no system page of its own.
  await page.waitForFunction(() => document.querySelectorAll('#planList .plan').length > 0,
    null, { timeout: 8000 }).catch(() => {});
  return page.$$eval('#planList .plan', (els) =>
    els.map((c) => ({
      name: c.querySelector('h2,h3')?.textContent?.trim(),
      lists: c.querySelectorAll('ul').length,
      items: c.querySelectorAll('ul li').length,
      btnTop: Math.round(c.querySelector('.btn').getBoundingClientRect().top),
    })));
};

for (const file of ['system.html', 'subscribe.html']) {
  // every system whose rows are all empty must render zero <ul> elements.
  for (const [app, plans] of byApp) {
    if (plans.some((p) => p.features?.length)) continue;
    const cards = await cardsOn(file, app);
    ok(`${file}?app=${app} — ${cards.length} cards, no empty list`,
      cards.length === plans.length && cards.every((c) => c.lists === 0),
      JSON.stringify(cards));
  }

  // and the systems that do have features must still print every one of them.
  for (const [app, plans] of byApp) {
    if (!plans.some((p) => p.features?.length)) continue;
    const want = plans.reduce((n, p) => n + (p.features?.length ?? 0), 0);
    const cards = await cardsOn(file, app);
    if (!cards.length) { console.log(`  ----  ${file}?app=${app} — page draws no cards, skipped`); continue; }
    const got = cards.reduce((n, c) => n + c.items, 0);
    ok(`${file}?app=${app} — ${want} feature lines still drawn`, got === want, `got ${got}`);
    // §6: the cards sit in a grid, so their buttons have to line up even when
    // one plan lists five items and its neighbour lists four.
    const tops = cards.map((c) => c.btnTop);
    ok(`${file}?app=${app} — buttons aligned across cards`,
      Math.max(...tops) - Math.min(...tops) <= 2, JSON.stringify(tops));
  }
}

await page.goto(`http://127.0.0.1:${PORT}/system.html?app=kupot`);
await page.waitForFunction(() => document.querySelectorAll('#planList .plan').length > 0);
await page.locator('#planList').screenshot({ path: `${OUT}/after-local-system-kupot-plans.png` });
await page.goto(`http://127.0.0.1:${PORT}/subscribe.html?app=kupot`);
await page.waitForFunction(() => document.querySelectorAll('#planList .plan').length > 0);
await page.locator('#planList').screenshot({ path: `${OUT}/after-local-subscribe-kupot-plans.png` });

await browser.close();
server.kill();

console.log(`\n${pass} passed · ${fail} failed   (shots: ${OUT}/)`);
process.exit(fail ? 1 : 0);
