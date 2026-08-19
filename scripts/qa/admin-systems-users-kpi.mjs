/**
 * /admin/systems — the headline tile that counted systems and called them users.
 *
 * §3 asks the super-admin board for "הכנסות/מנויים/כניסות" per system. The KPI
 * row at the top of the report carried a tile labelled "מאגר המשתמשים בהאב"
 * whose number came from totals.users_counted — which, since migration 0014, has
 * been `count(*) filter (where p.supabase_project = hub)`: how many SYSTEMS keep
 * their user pool in the main project. The same name is correct one level down
 * (systems[].users_counted is a per-system boolean and the card reads it right);
 * on the aggregate it read as a user count and was not one.
 *
 * Every number in the fixture below is read out of the hub on 07/08/2026, not
 * invented:
 *
 *   systems_users_counted       7   of 30 systems  ← what the tile used to show
 *   hub_users                  20   real accounts in auth.users
 *   hub_users_test             64   qa.*@more30.com, counted beside and not inside
 *   hub_users_with_membership   8   of the 20 hold at least one core.app_memberships row
 *
 * Four different numbers under one heading. This script checks the half the
 * migration cannot: what the KPI row actually renders.
 *
 * The page is served from the working tree — the deploy queue is still on the
 * Vercel quota (core.issues #83). The RPC half is already applied to the hub.
 *
 *   node scripts/qa/admin-systems-users-kpi.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5211;
const OUT = 'QA/platform/admin-systems-users-kpi-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

// The hub, read 07/08/2026. 20 + 64 = 84 = count(*) from auth.users.
const HUB = {
  systems: 30,
  systems_users_counted: 7,
  hub_users: 20,
  hub_users_test: 64,
  hub_users_with_membership: 8,
};

const sys = (number, app_key, name, in_hub) => ({
  number, app_key, path: app_key, name, tagline: '', live: true,
  live_url: `https://more30.com/${app_key}`, stage: 'live', show_in_showcase: false,
  supabase_project: in_hub ? 'uhnrgujbdxhhmoxcjria' : 'mwljkonwdeuaahsigjdp',
  users_counted: in_hub,
  admin_url: null, admin_auth: null,
  users: in_hub ? { members: 3, test_accounts: 2, active_7d: 1, last_activity: null } : null,
  subscriptions: { active: 0, by_plan: {} }, plans_from: 'more30',
  pricing: {}, pricing_internal: null, mrr_estimate_ils: 0, lighthouse: null,
});

const PAYLOAD = {
  generated_at: new Date().toISOString(),
  notes: {},
  totals: { ...HUB, live: 2, in_showcase: 0, with_admin_url: 0,
            with_lighthouse: 0, lighthouse_fresh: 0 },
  // one system inside the hub and one outside, so the per-card boolean that
  // shares the old name is exercised in both directions and cannot regress.
  systems: [sys('01', 'torah', 'איגוד השיעורים', true),
            sys('20', 'galil', 'גבאי הגליל', false)],
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1400 } });
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

console.log('\n/admin/systems — the KPI tile that named systems "users"\n');

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

ok('the user-pool tile shows the account count and not the system count',
   tile('משתמשים במאגר ההאב').n === String(HUB.hub_users),
   `${tile('משתמשים במאגר ההאב').n} — expected ${HUB.hub_users}, the old tile showed ${HUB.systems_users_counted}`);

// A tile whose heading OPENS with "משתמשים" is claiming to count accounts. The
// system tile mentions users too — "מערכות שמשתמשיהן נספרים כאן" — but leads
// with what it counts, so it is not the thing this check is looking for.
ok('no tile that opens by claiming to count users shows the system count',
   !kpis.some((k) => /^משתמשים/.test(k.l ?? '') && k.n === String(HUB.systems_users_counted)),
   kpis.map((k) => `${k.n}=${k.l}`).join(' | '));

ok('the 64 test accounts are named beside the pool, not folded into it',
   tile('משתמשים במאגר ההאב').l.includes(`${HUB.hub_users_test} חשבונות בדיקה בנפרד`),
   tile('משתמשים במאגר ההאב').l);

ok('how many of the real accounts ever entered a system is its own number',
   tile('מתוכם נכנסו לתוך מערכת').n === String(HUB.hub_users_with_membership),
   `${tile('מתוכם נכנסו לתוך מערכת').n} — expected ${HUB.hub_users_with_membership}`);

ok('the system count keeps its own tile, now saying what it counts',
   tile('מערכות שמשתמשיהן נספרים כאן').n === String(HUB.systems_users_counted) &&
   tile('מערכות שמשתמשיהן נספרים כאן').l.includes(`מתוך ${HUB.systems}`),
   `${tile('מערכות שמשתמשיהן נספרים כאן').n} · ${tile('מערכות שמשתמשיהן נספרים כאן').l}`);

// the per-system boolean shares the old name and must keep working both ways.
const cards = await page.$$eval('.sys', (els) => els.map((e) => ({
  title: e.querySelector('h2')?.innerText.trim(),
  text: e.querySelector('dl')?.innerText.replace(/\s+/g, ' ').trim(),
})));

ok('a system inside the hub still counts its customers on the card',
   /לקוחות 3/.test(cards[0]?.text ?? ''), cards[0]?.text?.slice(0, 90));

ok('a system outside the hub still says why it is not counted, and shows no 0',
   /לא נספרים/.test(cards[1]?.text ?? '') && /mwljkonwdeuaahsigjdp/.test(cards[1]?.text ?? ''),
   cards[1]?.text?.slice(0, 110));

await page.screenshot({ path: `${OUT}/kpi-row.png`, fullPage: true });

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'core.projects · auth.users · core.app_memberships, read 07/08/2026 — no value here was written by hand',
  hub: HUB, kpis, cards, results, pass, fail,
}, null, 2));

await browser.close();
server.kill();

console.log(`\n  ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
