/**
 * /admin/systems — the bug row on the card, and the state it could not name.
 *
 * §3 asks the board for three states per system: "באגים: תוקן / בטיפול / פתוח".
 * more30_admin_issues built its per-system by_app block with
 *
 *   'open', count(*) filter (where status in ('open','in_progress'))
 *
 * so 'בטיפול' had no key to be drawn from, and an issue already being worked on
 * was counted and labelled as open. Migration 0026 separates the three; this
 * script checks the half a migration cannot — what the page draws with them.
 *
 * The four by_app rows below are NOT invented. They are the values the corrected
 * RPC returns for these four systems, read through more30_admin_issues() with a
 * real super-admin claim on 07/08/2026, chosen because between them they cover
 * every branch the row has:
 *
 *   torah    0 open · 1 in_progress · 1 fixed        → the state that could not
 *                                                      be named before (that is
 *                                                      core.issues #87, written
 *                                                      and waiting on the deploy
 *                                                      quota #83 — not untouched)
 *   mthbram  1 open · 1 in_progress · 1 fixed · 1 needs_user
 *                                                    → all four numbers at once,
 *                                                      and the one card where
 *                                                      "2 פתוחים" was two states
 *   kupot    1 open · 0 in_progress · 2 fixed · 1 needs_user
 *                                                    → no in_progress: the row
 *                                                      must not print "0 בטיפול"
 *   imud     0 open · 0 in_progress · 1 fixed        → fixed only
 *
 * and a fifth system with no row in core.issues at all, which must read
 * "לא נרשמו" rather than 0 — "no known faults" and "nobody looked" are two
 * different facts.
 *
 * The page is served from the working tree, not from production, because the
 * deploy queue is blocked on the Vercel quota (core.issues #83). The RPC half is
 * already live on the database.
 *
 *   node scripts/qa/admin-systems-bugrow.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5208;
const OUT = 'QA/platform/admin-systems-bugrow-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const sys = (number, app_key, name) => ({
  number, app_key, path: app_key, name, tagline: '', live: true,
  live_url: `https://more30.com/${app_key}`, stage: 'live', show_in_showcase: false,
  supabase_project: 'uhnrgujbdxhhmoxcjria', users_counted: true,
  admin_url: null, admin_auth: null,
  users: { members: 0, test_accounts: 0, active_7d: 0, last_activity: null },
  subscriptions: { active: 0, by_plan: {} }, plans_from: 'more30',
  pricing: {}, pricing_internal: null, mrr_estimate_ils: 0,
});

const PAYLOAD = {
  generated_at: '2026-08-07T02:35:00Z',
  notes: {},
  totals: { systems: 5, live: 5, in_showcase: 0, users_counted: 5, with_admin_url: 0 },
  systems: [
    sys('01', 'torah',   'איגוד השיעורים'),
    sys('04', 'imud',    'עימוד תורני'),
    sys('06', 'kupot',   'קופות חולים'),
    sys('21', 'mthbram', 'Mthbram'),
    sys('34', 'kesef',   'כסף'),
  ],
};

// Read through more30_admin_issues() with a super-admin claim after 0026.
const BY_APP = {
  torah:   { open: 0, in_progress: 1, fixed: 1, needs_user: 0 },
  imud:    { open: 0, in_progress: 0, fixed: 1, needs_user: 0 },
  kupot:   { open: 1, in_progress: 0, fixed: 2, needs_user: 1 },
  mthbram: { open: 1, in_progress: 1, fixed: 1, needs_user: 1 },
  // kesef is absent on purpose — it has no row in core.issues.
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1500 } });
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
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ by_app: BY_APP }) }));

console.log('\n/admin/systems — the three states §3 asks for\n');

await page.goto(`http://127.0.0.1:${PORT}/admin-systems.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the board renders instead of the access notice',
   await page.isVisible('#content'),
   ((await page.textContent('#denied').catch(() => '')) || '').trim().slice(0, 80));

// The bug row is the <dd> that follows the <dt> reading "באגים".
const rows = await page.$$eval('.sys', (els) => els.map((e) => {
  const dts = [...e.querySelectorAll('dt')];
  const dt = dts.find((d) => d.textContent.trim() === 'באגים');
  return {
    title: e.querySelector('h2')?.innerText.trim(),
    bugs: dt?.nextElementSibling?.innerText.trim() ?? null,
  };
}));
const row = (n) => rows.find((r) => r.title === n)?.bugs ?? '(no card)';

ok('all five cards are drawn', rows.length === 5, `${rows.length} cards`);

ok('an issue being worked on is named בטיפול and is NOT counted as open',
   row('איגוד השיעורים') === '1 בטיפול · 1 תוקנו',
   row('איגוד השיעורים'));

ok('a card with both states shows both numbers, not one covering two',
   row('Mthbram') === '1 פתוחים · 1 בטיפול · מתוכם 1 דורשים אותך · 1 תוקנו',
   row('Mthbram'));

ok('a card with nothing in progress does not print a zero for it',
   row('קופות חולים') === '1 פתוחים · מתוכם 1 דורשים אותך · 2 תוקנו',
   row('קופות חולים'));

ok('a card with only fixed issues says so and nothing else',
   row('עימוד תורני') === '1 תוקנו',
   row('עימוד תורני'));

ok('a system with no row in core.issues reads לא נרשמו, not 0',
   row('כסף') === 'לא נרשמו',
   row('כסף'));

ok('no card counts an in_progress issue as open (the defect 0026 fixes)',
   row('איגוד השיעורים').indexOf('פתוחים') === -1,
   row('איגוד השיעורים'));

await page.screenshot({ path: `${OUT}/board.png`, fullPage: true });
await writeFile(`${OUT}/_results.json`,
  JSON.stringify({ generated_at: new Date().toISOString(), by_app: BY_APP, rows, results, pass, fail }, null, 2));

await browser.close();
server.kill();

console.log(`\n  ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
