/**
 * /admin/systems — does the card link to the system's own admin, or to the same
 * page for everybody?
 *
 * §3 asks the super-admin board for a "נהל מערכת זו" link per system. The link
 * was there and read exactly that, and on all thirty cards its href was
 * /admin/issues — the platform-wide bug list. Same address for every system, and
 * not the admin screen of any of them.
 *
 * The address itself was never missing: core.projects.admin_url was measured
 * against production in 0022/0023, and 0024 taught the customer-facing
 * more30_system_page to hand it out. more30_admin_systems_report — the other
 * reader — never selected it, which is what 0025 fixes. This script checks the
 * half that a migration cannot: what the page draws with it.
 *
 * The RPC response is a FIXTURE, substituted at the network layer, for the same
 * reason leads-screen-renders.mjs uses one — the live payload carries customer
 * counts. The four rows below are not invented: they are the real records as
 * measured through the RPC at the time of writing (07/08/2026), chosen to cover
 * the four shapes that decide what gets drawn —
 *   torah   relative address + own gate      → must resolve under /torah
 *   bkalot  absolute address + hub gate      → must be left exactly as recorded
 *   kupot   admin_auth='token'               → withheld by 0025, must not link
 *   imud    no admin screen at all           → must say so (core.issues #86)
 *
 * The page is served from the working tree, not from production, because the
 * deploy queue is blocked on the Vercel quota (core.issues #83).
 *
 *   node scripts/qa/admin-systems-entry.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5207;
const OUT = 'QA/platform/admin-systems-entry-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const sys = (number, app_key, name, admin_url, admin_auth) => ({
  number, app_key, path: app_key, name, tagline: '', live: true,
  live_url: `https://more30.com/${app_key}`, stage: 'live', show_in_showcase: false,
  supabase_project: 'uhnrgujbdxhhmoxcjria', users_counted: true,
  admin_url, admin_auth,
  users: { members: 0, test_accounts: 0, active_7d: 0, last_activity: null },
  subscriptions: { active: 0, by_plan: {} }, plans_from: 'more30',
  pricing: {}, pricing_internal: null, mrr_estimate_ils: 0,
});

const PAYLOAD = {
  generated_at: '2026-08-07T02:20:00Z',
  notes: {},
  totals: { systems: 4, live: 4, in_showcase: 0, users_counted: 4, with_admin_url: 2 },
  systems: [
    sys('01', 'torah',  'איגוד השיעורים',        '/admin', 'own'),
    sys('04', 'imud',   'אימוד',                  null,     null),
    sys('06', 'kupot',  'קופות חולים',            null,     null),
    sys('10', 'bkalot', 'מימוש זכויות בקלות',    'https://more30.com/admin/rights', 'hub'),
  ],
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1400 } });
const page = await ctx.newPage();

// The page bails before the RPC when there is no session. Only the shape matters
// here — the answer is substituted below, and the real gate is server-side
// (more30_is_super_admin, verified through the RPC itself).
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

console.log('\n/admin/systems — where "ניהול המערכת הזאת" goes\n');

await page.goto(`http://127.0.0.1:${PORT}/admin-systems.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the board renders instead of the access notice',
   await page.isVisible('#content'),
   ((await page.textContent('#denied').catch(() => '')) || '').trim().slice(0, 80));

const cards = await page.$$eval('.sys', (els) => els.map((e) => ({
  title: e.querySelector('h2')?.innerText.trim(),
  entryText: e.querySelector('.entry')?.innerText.trim() ?? '',
  href: e.querySelector('.entry a')?.getAttribute('href') ?? null,
})));
const byName = (n) => cards.find((c) => c.title === n) || {};

ok('all four cards are drawn', cards.length === 4, `${cards.length} cards`);

ok('a relative address resolves under the system, not the portal root',
   byName('איגוד השיעורים').href === '/torah/admin',
   byName('איגוד השיעורים').href);

ok('an absolute address is left exactly as recorded',
   byName('מימוש זכויות בקלות').href === 'https://more30.com/admin/rights',
   byName('מימוש זכויות בקלות').href);

ok('no card still points at the bug list',
   cards.every((c) => c.href !== '/admin/issues'),
   JSON.stringify(cards.map((c) => c.href)));

ok('two different systems get two different addresses',
   new Set(cards.map((c) => c.href).filter(Boolean)).size === 2,
   JSON.stringify(cards.map((c) => c.href)));

ok('a system with no admin screen says so and gets no link',
   byName('אימוד').href === null && byName('אימוד').entryText.includes('אין מסך ניהול'),
   JSON.stringify(byName('אימוד')));

ok('a recorded-but-withheld entry (kupot, admin_auth=token) draws no link either',
   byName('קופות חולים').href === null,
   JSON.stringify(byName('קופות חולים')));

ok('the card names whose sign-in it is',
   byName('איגוד השיעורים').entryText.includes('הכניסה של המערכת עצמה') &&
   byName('מימוש זכויות בקלות').entryText.includes('סופר-אדמין'),
   JSON.stringify([byName('איגוד השיעורים').entryText, byName('מימוש זכויות בקלות').entryText]));

const kpis = (await page.textContent('#kpis')) || '';
ok('the KPI row reports how many systems have an entry at all',
   /2\s*עם כניסה לניהול/.test(kpis.replace(/\s+/g, ' ')),
   kpis.replace(/\s+/g, ' ').slice(0, 160));

await page.screenshot({ path: `${OUT}/admin-systems.png`, fullPage: true });
await writeFile(`${OUT}/_results.json`,
  JSON.stringify({ at: new Date().toISOString(), page: '/admin/systems',
                   served_from: 'portal/public (deploys blocked, core.issues #83)',
                   cards, results, pass, fail }, null, 2));

await browser.close();
server.kill();
console.log(`\n  screenshot: ${OUT}/admin-systems.png`);
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
