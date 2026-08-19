/**
 * /admin/systems — the third item §3 asks for on every card.
 *
 * §3 asks the board for "סטטוס (חיה/שבורה/מוסתרת), קישור, Lighthouse" per
 * system. Migration 0028 gave the score a place in the database and put it on
 * more30_admin_systems_report().systems[].lighthouse, and the 07/08 re-measure
 * refreshed all eight rows — but admin-systems.html never drew the field. The
 * board fetched it, the browser parsed it, and it was dropped: the card showed
 * status and link and nothing else. This script checks the half a migration
 * cannot — what the page renders with it.
 *
 * The numbers below are NOT invented. They are the rows core.lighthouse_runs
 * holds on 07/08/2026, read straight out of the table:
 *
 *   tivuch    perf 95 · a11y 100 → the only system in the green band
 *   torah     perf 74            → the mid band
 *   egod      perf 51 · a11y 96  → mid, and the one non-100 accessibility
 *   nadlan    perf 69            → drawn TWICE below, see next paragraph
 *   kesef     no row at all      → must read "לא נמדדה", not 0
 *
 * The stale branch needs a measurement older than 48 hours, and after the
 * re-measure none of the live rows is. Rather than invent one, the fixture uses
 * nadlan's OWN earlier run — 03/08 11:55, perf 79 — which is a real row in
 * core.lighthouse_runs, just no longer the latest. age_hours and stale are
 * computed here from that real timestamp exactly as the RPC computes them, so
 * the branch is exercised against a measurement that actually happened.
 *
 * The page is served from the working tree, not production: the deploy queue is
 * blocked on the Vercel quota (core.issues #83). The RPC half is already live.
 *
 *   node scripts/qa/admin-systems-lighthouse.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5209;
const OUT = 'QA/platform/admin-systems-lighthouse-0807';
const STALE_AFTER_H = 48; // the same threshold more30_admin_systems_report uses

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

// Exactly what the RPC does with measured_at, so the fixture cannot drift from
// the real report by being written down instead of computed.
const ageHours = (iso) => Math.round(((Date.now() - Date.parse(iso)) / 36e5) * 10) / 10;
const lh = (o) => ({
  ...o,
  age_hours: ageHours(o.measured_at),
  stale: ageHours(o.measured_at) > STALE_AFTER_H,
  lh_version: '13.4.1',
});

const sys = (number, app_key, name, lighthouse) => ({
  number, app_key, path: app_key, name, tagline: '', live: true,
  live_url: `https://more30.com/${app_key}`, stage: 'live', show_in_showcase: false,
  supabase_project: 'uhnrgujbdxhhmoxcjria', users_counted: true,
  admin_url: null, admin_auth: null,
  users: { members: 0, test_accounts: 0, active_7d: 0, last_activity: null },
  subscriptions: { active: 0, by_plan: {} }, plans_from: 'more30',
  pricing: {}, pricing_internal: null, mrr_estimate_ils: 0,
  lighthouse: lighthouse ?? null,
});

const PAYLOAD = {
  generated_at: new Date().toISOString(),
  notes: {},
  totals: {
    systems: 6, live: 6, in_showcase: 0, systems_users_counted: 6, with_admin_url: 0,
    hub_users: 20, hub_users_test: 64, hub_users_with_membership: 8,
    with_lighthouse: 5, lighthouse_fresh: 4,
  },
  systems: [
    sys('01', 'torah', 'איגוד השיעורים', lh({
      perf: 74, a11y: 100, best_practices: 77, seo: 100,
      lcp_ms: 4396.245, cls: 0.001, url: 'https://more30.com/torah',
      measured_at: '2026-08-07T03:22:34.489Z',
    })),
    sys('15', 'egod', 'אגודת עגד', lh({
      perf: 51, a11y: 96, best_practices: 77, seo: 100,
      lcp_ms: 5599.289, cls: 0.1, url: 'https://more30.com/egod',
      measured_at: '2026-08-07T03:24:47.981Z',
    })),
    sys('32', 'nadlan', 'נדל"ן', lh({
      perf: 69, a11y: 100, best_practices: 77, seo: 100,
      lcp_ms: 3292.598, cls: 0.007, url: 'https://more30.com/nadlan',
      measured_at: '2026-08-07T03:23:25.313Z',
    })),
    // nadlan's own earlier run, kept under a second card so the stale branch is
    // drawn from a measurement that really happened rather than a made-up one.
    sys('32b', 'nadlan-old', 'נדל"ן — מדידת 03/08', lh({
      perf: 79, a11y: 100, best_practices: 77, seo: 100,
      lcp_ms: 3001.58, cls: 0.008, url: 'https://more30.com/nadlan',
      measured_at: '2026-08-03T11:55:41.122Z',
    })),
    sys('34', 'kesef', 'כסף', null),
    sys('36', 'tivuch', 'מתווכים', lh({
      perf: 95, a11y: 100, best_practices: 77, seo: 100,
      lcp_ms: 1503.23, cls: 0.004, url: 'https://more30.com/tivuch',
      measured_at: '2026-08-07T03:23:00.737Z',
    })),
  ],
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1600 } });
const page = await ctx.newPage();

// The page bails before the RPC when there is no session. Only the shape matters
// here — both answers are substituted below, and the real gate is server-side.
await page.addInitScript(() => {
  localStorage.setItem('more30-auth', JSON.stringify({
    access_token: 'qa.fixture.token', refresh_token: 'qa.fixture.refresh',
    token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'qa.fixture@more30.com' },
  }));
});

await page.route('**/rest/v1/rpc/more30_admin_systems_report', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) }));
await page.route('**/rest/v1/rpc/more30_admin_issues', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ by_app: {} }) }));

console.log('\n/admin/systems — the Lighthouse score §3 asks for\n');

await page.goto(`http://127.0.0.1:${PORT}/admin-systems.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the board renders instead of the access notice',
   await page.isVisible('#content'),
   ((await page.textContent('#denied').catch(() => '')) || '').trim().slice(0, 80));

const rows = await page.$$eval('.sys', (els) => els.map((e) => {
  const dt = [...e.querySelectorAll('dt')].find((d) => d.textContent.trim() === 'Lighthouse');
  const dd = dt?.nextElementSibling ?? null;
  return {
    title: e.querySelector('h2')?.innerText.trim(),
    has_row: !!dt,
    text: dd ? dd.innerText.replace(/\s+/g, ' ').trim() : null,
    bands: dd ? [...dd.querySelectorAll('.lh')].map((s) => s.className.replace('lh ', '')) : [],
    stale_marked: dd ? !!dd.querySelector('.stale') : false,
  };
}));
const row = (n) => rows.find((r) => r.title === n) ?? { text: '(no card)', bands: [], has_row: false };

ok('all six cards are drawn', rows.length === 6, `${rows.length} cards`);

ok('every card carries a Lighthouse row — it was on none of them before',
   rows.every((r) => r.has_row),
   rows.filter((r) => !r.has_row).map((r) => r.title).join(', '));

ok('the four scores are drawn with their names, not colour alone',
   row('מתווכים').text.startsWith('ביצועים 95 נגישות 100 שיטות 77 SEO 100'),
   row('מתווכים').text);

ok('a 95 lands in the green band and a 51 does not',
   row('מתווכים').bands[0] === 'g' && row('אגודת עגד').bands[0] === 'm',
   `tivuch=${row('מתווכים').bands[0]} egod=${row('אגודת עגד').bands[0]}`);

ok('a non-100 accessibility score is printed as measured, not rounded up',
   row('אגודת עגד').text.includes('נגישות 96'),
   row('אגודת עגד').text);

ok('a fresh score says when it was measured',
   /נמדד לפני (פחות משעה|\d+ שע׳)/.test(row('איגוד השיעורים').text),
   row('איגוד השיעורים').text);

ok('a fresh score is NOT marked stale',
   row('איגוד השיעורים').stale_marked === false,
   row('איגוד השיעורים').text);

ok('a measurement older than 48h is named ישנה in words',
   row('נדל"ן — מדידת 03/08').stale_marked === true &&
   row('נדל"ן — מדידת 03/08').text.includes('ישנה'),
   row('נדל"ן — מדידת 03/08').text);

ok('the stale card reports its age in days, not in hours',
   /נמדד לפני \d+ ימים/.test(row('נדל"ן — מדידת 03/08').text),
   row('נדל"ן — מדידת 03/08').text);

ok('a system that was never measured reads לא נמדדה, not 0',
   row('כסף').text === 'לא נמדדה',
   row('כסף').text);

ok('no card invents a score for an unmeasured system',
   row('כסף').bands.length === 0,
   row('כסף').bands.join(','));

const kpis = await page.$$eval('.kpi', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
ok('the KPI row states how many were measured and how many are fresh',
   kpis.some((k) => k.includes('נמדדו ב-Lighthouse') && k.includes('4 טריות')),
   kpis.join(' | '));

await page.screenshot({ path: `${OUT}/board.png`, fullPage: true });
await ctx.close();

// The same board in dark mode: the three bands are colour-mixed against tokens
// that swap, and a badge that vanishes there would never be noticed in light.
const dark = await browser.newContext({
  locale: 'he-IL', viewport: { width: 1280, height: 1600 }, colorScheme: 'dark',
});
const dpage = await dark.newPage();
await dpage.addInitScript(() => {
  localStorage.setItem('more30-auth', JSON.stringify({
    access_token: 'qa.fixture.token', refresh_token: 'qa.fixture.refresh',
    token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'qa.fixture@more30.com' },
  }));
});
await dpage.route('**/rest/v1/rpc/more30_admin_systems_report', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) }));
await dpage.route('**/rest/v1/rpc/more30_admin_issues', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ by_app: {} }) }));
await dpage.goto(`http://127.0.0.1:${PORT}/admin-systems.html`, { waitUntil: 'networkidle' });
await dpage.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

const darkBadges = await dpage.$$eval('.lh', (els) => els.map((e) => {
  const c = getComputedStyle(e);
  return { text: e.innerText.trim(), color: c.color, bg: c.backgroundColor };
}));
ok('the badges are drawn in dark mode too, with a colour of their own',
   // five measured cards × four scores. kesef has none and must not add any.
   darkBadges.length === 20 && darkBadges.every((b) => b.color && b.color !== 'rgba(0, 0, 0, 0)'),
   `${darkBadges.length} badges`);

await dpage.screenshot({ path: `${OUT}/board-dark.png`, fullPage: true });

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'core.lighthouse_runs, read 07/08/2026 — no value here was written by hand',
  stale_after_hours: STALE_AFTER_H,
  fixture: PAYLOAD.systems.map((s) => ({
    app: s.app_key, perf: s.lighthouse?.perf ?? null,
    measured_at: s.lighthouse?.measured_at ?? null,
    age_hours: s.lighthouse?.age_hours ?? null, stale: s.lighthouse?.stale ?? null,
  })),
  rows, kpis, dark_badges: darkBadges, results, pass, fail,
}, null, 2));

await browser.close();
server.kill();

console.log(`\n  ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
