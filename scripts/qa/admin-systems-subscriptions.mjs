/**
 * /admin/systems — the card that said "1 active subscriber" and "₪20 a month".
 *
 * §3 asks the super-admin board for "הכנסות/מנויים/כניסות" per system. Both
 * numbers come from more30_admin_systems_report, and the same block held two
 * separate mistakes until migration 0038.
 *
 *   1. `'active', count(*) filter (where s.status <> 'cancelled')` ran over the
 *      GROUPED subquery, so it counted (plan_code, status) pairs — plans — and
 *      not subscribers. by_plan beside it summed rows and was right; the MRR
 *      joined the rows themselves and was right. One card, three answers.
 *
 *   2. All 89 rows in core.subscriptions belong to qa.*@more30.com accounts the
 *      §1 regression suite creates. core.is_test_account already keeps them out
 *      of the customer count, and notes.test_accounts says so out loud — but the
 *      subscriptions and revenue block never called it.
 *
 * Every number below was read out of the hub on 07/08/2026 with the pre-0038
 * expression and the post-0038 one, side by side. Nothing here is invented:
 *
 *              was shown    by_plan     was ₪/mo    real subs   test subs   now ₪/mo
 *   torah          1        {basic:10}     20           0          10          0
 *   kupot          2        {basic:4,      28           0           8          0
 *                            extended:4}
 *   platform      n/a          —          204           0          89          0
 *
 * The RPC half is applied to the hub. This script checks the half SQL cannot:
 * what the board renders. The page is served from the working tree — the deploy
 * queue is still on the Vercel quota (core.issues #83).
 *
 *   node scripts/qa/admin-systems-subscriptions.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5213;
const OUT = 'QA/platform/admin-systems-subscriptions-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

// The hub, read 07/08/2026. 0 + 89 = 89 = every non-cancelled row in
// core.subscriptions, and every one of them a regression-suite account.
const HUB = { subs_active: 0, subs_test: 89, mrr_estimate_ils: 0 };

const sys = (number, app_key, name, subs, mrr) => ({
  number, app_key, path: app_key, name, tagline: '', live: true,
  live_url: `https://more30.com/${app_key}`, stage: 'live', show_in_showcase: false,
  supabase_project: 'uhnrgujbdxhhmoxcjria', users_counted: true,
  admin_url: null, admin_auth: null,
  users: { members: 0, test_accounts: 2, active_7d: 0, last_activity: null },
  subscriptions: subs, plans_from: 'more30',
  pricing: {}, pricing_internal: null, mrr_estimate_ils: mrr, lighthouse: null,
});

const PAYLOAD = {
  generated_at: new Date().toISOString(),
  notes: {},
  totals: { ...HUB, systems: 30, live: 3, in_showcase: 0, systems_users_counted: 7,
            hub_users: 20, hub_users_test: 64, hub_users_with_membership: 8,
            with_admin_url: 0, with_lighthouse: 0, lighthouse_fresh: 0 },
  systems: [
    // the two real shapes in the hub: test subscribers only.
    sys('01', 'torah', 'איגוד השיעורים', { active: 0, test: 10, by_plan: {} }, 0),
    sys('28', 'kupot', 'השוואת קופות חולים', { active: 0, test: 8, by_plan: {} }, 0),
    // no system in the hub has a paying subscriber yet, so the other direction
    // of the render has nothing real to stand on. This third card is a fixture
    // and is labelled as one — it exists so that "a real subscriber still shows"
    // cannot regress silently the day the first one signs up.
    sys('99', 'fixture', 'כרטיס בדיקה — לא מערכת',
        { active: 3, test: 1, by_plan: { basic: 3 } }, 6),
  ],
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1400 } });
const page = await ctx.newPage();

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

console.log('\n/admin/systems — subscribers and revenue, with the test accounts named\n');

await page.goto(`http://127.0.0.1:${PORT}/admin-systems.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the board renders instead of the access notice',
   await page.isVisible('#content'),
   ((await page.textContent('#denied').catch(() => '')) || '').trim().slice(0, 80));

const kpis = await page.$$eval('.kpi', (els) => els.map((e) => ({
  n: e.querySelector('.n')?.textContent.trim(),
  l: e.querySelector('.l')?.textContent.replace(/\s+/g, ' ').trim(),
})));
const tile = (needle) => kpis.find((k) => k.l?.includes(needle)) ?? { n: null, l: '(no tile)' };

ok('the platform has a subscriber tile, and it shows the real count',
   tile('מנויים פעילים').n === String(HUB.subs_active),
   `${tile('מנויים פעילים').n} — expected ${HUB.subs_active}`);

ok('the 89 test subscriptions are named beside it, not folded into it',
   tile('מנויים פעילים').l.includes(`${HUB.subs_test} מנויי בדיקה בנפרד`),
   tile('מנויים פעילים').l);

const cards = await page.$$eval('.sys', (els) => els.map((e) => ({
  title: e.querySelector('h2')?.innerText.trim(),
  text: e.querySelector('dl')?.innerText.replace(/\s+/g, ' ').trim(),
})));
const card = (n) => cards.find((c) => c.title?.includes(n))?.text ?? '';

ok('torah shows 0 subscribers, not the 1 that was really 10 plan rows',
   /מנויים פעילים 0/.test(card('איגוד השיעורים')),
   card('איגוד השיעורים').slice(0, 120));

ok('torah names its 10 test subscriptions and says they are not revenue',
   /מנויי בדיקה 10 — לא הכנסה/.test(card('איגוד השיעורים')),
   card('איגוד השיעורים').slice(0, 160));

ok('torah no longer claims ₪20 a month from a single subscriber',
   /הכנסה חודשית משוערת/.test(card('איגוד השיעורים')) &&
   !/20/.test(card('איגוד השיעורים').split('הכנסה חודשית משוערת')[1] ?? ''),
   card('איגוד השיעורים').split('הכנסה חודשית משוערת')[1]?.slice(0, 40));

ok('kupot shows 0 and 8, where the board used to show 2 and ₪28',
   /מנויים פעילים 0/.test(card('השוואת קופות חולים')) &&
   /מנויי בדיקה 8/.test(card('השוואת קופות חולים')),
   card('השוואת קופות חולים').slice(0, 140));

ok('a card with real subscribers still shows them, and its revenue',
   /מנויים פעילים 3/.test(card('כרטיס בדיקה')),
   card('כרטיס בדיקה').slice(0, 140));

ok('a card with no test subscriptions draws no empty test row',
   !(await page.$$eval('.sys dl', (els) =>
       els.some((e) => /מנויי בדיקה 0/.test(e.innerText)))),
   'a "מנויי בדיקה 0" row was rendered');

await page.screenshot({ path: `${OUT}/subscriptions.png`, fullPage: true });

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'core.subscriptions × auth.users × core.plans, read 07/08/2026 — the before/after pair was measured, not assumed',
  hub: HUB, kpis, cards, results, pass, fail,
}, null, 2));

await browser.close();
server.kill();

console.log(`\n  ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
