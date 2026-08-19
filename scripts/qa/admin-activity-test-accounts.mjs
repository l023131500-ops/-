/**
 * /admin/activity — the board screen that counted QA robots as registered users.
 *
 * §3 asks the super-admin board for "הכנסות · מנויים · כניסות". The first two
 * come from more30_admin_systems_report, which has excluded qa.*@more30.com from
 * every customer-facing number since 0038. The third — this screen — came from
 * more30_admin_activity(), the one board RPC that had never heard of
 * core.is_test_account. Migration 0044 gave it the same split.
 *
 * The payload below is not a hand-written fixture. It is the literal return of
 * more30_admin_activity() against the hub on 07/08/2026, after 0044, minus the
 * two prose keys the checks re-supply. Before 0044 the same call returned
 * users_total 91, active_24h 62, and per-system members of 7/4/5/4/5/3/3.
 *
 * The RPC half is already applied to the hub; the page is served from the
 * working tree, because the deploy queue is still on the Vercel quota
 * (core.issues #83).
 *
 *   node scripts/qa/admin-activity-test-accounts.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5213;
const OUT = 'QA/platform/admin-activity-test-accounts-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

/** What the screen used to show for the same rows, read before 0044. */
const BEFORE = {
  users_total: 91, active_24h: 62, active_7d: 79, active_30d: 79,
  members: { kesef: 7, chatzor: 4, kupot: 5, nadlan: 4, tivuch: 5, imud: 3, studio: 3, portal: 7 },
};

const sys = (number, app_key, name, members, test_accounts, a24, a7, a30, last_activity) => ({
  number, app_key, name, live: true, live_url: `https://more30.com/${app_key}`,
  members, test_accounts, active_24h: a24, active_7d: a7, active_30d: a30, last_activity,
});

const PAYLOAD = {
  generated_at: '2026-08-07T09:15:43.123460+00:00',
  hub_project: 'uhnrgujbdxhhmoxcjria',
  active_means:
    'נפתחה מערכת על ידי משתמש מחובר (core.app_memberships.last_seen_at). מבקר אנונימי אינו נספר.',
  test_accounts_means:
    'חשבונות בדיקה (qa.*@more30.com) נוצרים על ידי מבחני הרגרסיה של §1 ונכנסים בכל ריצה. ' +
    'הם נספרים בעמודה נפרדת ואינם נכללים באף אחד מהמספרים שמתארים לקוחות.',
  platform: {
    users_total: 20, confirmed: 20, active_24h: 2, active_7d: 8, active_30d: 8,
    never_signed_in: 9, test_accounts: 71, test_active_24h: 60,
  },
  systems: [
    sys('34', 'kesef', 'כסף — שקיפות תקציבית', 3, 4, 0, 3, 3, '2026-08-04T23:24:42.789193+00:00'),
    sys('16', 'chatzor', 'חצור קונקט', 1, 3, 0, 1, 1, '2026-07-31T11:42:33.127376+00:00'),
    sys('28', 'kupot', 'השוואת קופות חולים', 1, 4, 0, 1, 1, '2026-08-04T21:53:02.920112+00:00'),
    sys('32', 'nadlan', 'נדל"ן ברגע', 1, 3, 1, 1, 1, '2026-08-06T16:25:43.517903+00:00'),
    sys('36', 'tivuch', 'נדל״ן פרו — ניהול למתווכים', 1, 4, 0, 1, 1, '2026-08-03T21:28:39.432288+00:00'),
    sys('04', 'imud', 'עימוד תורני', 0, 3, 0, 0, 0, null),
    sys('26', 'studio', 'סטודיו מודעות', 0, 3, 0, 0, 0, null),
  ],
  portal: {
    app_key: 'more30', members: 6, test_accounts: 1,
    active_24h: 2, active_7d: 6, active_30d: 6,
    last_activity: '2026-08-07T05:37:56.446525+00:00',
  },
  not_counted: [
    { number: '01', app_key: 'torah', name: 'איגוד השיעורים', live: true,
      users_live_in: 'mwljkonwdeuaahsigjdp', reason: 'מאגר המשתמשים שלה בפרויקט Supabase אחר' },
  ],
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1500 } });
const page = await ctx.newPage();

// The page bails before the RPC when there is no session. The real gate is
// server-side — the function raises 42501 — so only the shape matters here.
await page.addInitScript(() => {
  localStorage.setItem('more30-auth', JSON.stringify({
    access_token: 'qa.fixture.token', refresh_token: 'qa.fixture.refresh',
    token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'qa.fixture@more30.com' },
  }));
});
await page.route('**/rest/v1/rpc/more30_admin_activity', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) }));

console.log('\n/admin/activity — 91 registered users, 71 of them robots\n');

await page.goto(`http://127.0.0.1:${PORT}/admin-activity.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the board renders instead of the access notice',
   await page.isVisible('#content'),
   ((await page.textContent('#denied').catch(() => '')) || '').trim().slice(0, 80));

const cards = await page.$$eval('#platform .card', (els) => els.map((e) => ({
  n: e.querySelector('.n')?.textContent.trim(),
  l: e.querySelector('.l')?.textContent.replace(/\s+/g, ' ').trim(),
})));
const card = (needle) => cards.find((c) => c.l?.includes(needle)) ?? { n: null, l: '(no card)' };

ok('the headline card counts the 20 customers and not the 91 accounts',
   card('לקוחות רשומים').n === '20',
   `${card('לקוחות רשומים').n} — expected 20, the old card showed ${BEFORE.users_total}`);

ok('"נכנסו ב-24 שעות" is the 2 real sign-ins, not the 62 that include the test runs',
   card('נכנסו ב-24 שעות').n === '2',
   `${card('נכנסו ב-24 שעות').n} — expected 2, the old card showed ${BEFORE.active_24h}`);

ok('the 71 test accounts get their own card and say they are not counted',
   card('חשבונות בדיקה').n === '71' && /לא נספרים/.test(card('חשבונות בדיקה').l),
   `${card('חשבונות בדיקה').n} · ${card('חשבונות בדיקה').l}`);

ok('no card on the page still shows any of the inflated totals',
   !cards.some((c) => [BEFORE.users_total, BEFORE.active_24h, BEFORE.active_7d]
                        .map(String).includes(c.n)),
   cards.map((c) => `${c.n}=${c.l}`).join(' | '));

// Scoped to the systems table on purpose: the page carries a second table
// ("מערכות שאינן נספרות") whose three headings would otherwise be counted as
// columns this table is missing.
const heads = await page.$$eval('#systems', (els) =>
  [...els[0].closest('table').querySelectorAll('thead th')].map((e) => e.textContent.trim()));
ok('the per-system table has a column for test accounts',
   heads.includes('חשבונות בדיקה') && heads.includes('לקוחות'),
   heads.join(' | '));

const rows = await page.$$eval('#systems tr', (els) => els.map((tr) => ({
  cells: [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()),
})));
const row = (needle) => rows.find((r) => r.cells[0]?.includes(needle)) ?? { cells: [] };

// The portal is unshifted to the top of the same table and shares the columns.
ok('the portal row leads the table with 6 customers and its 1 test account',
   row('הפורטל').cells[1] === '6' && row('הפורטל').cells[2] === '1',
   `${row('הפורטל').cells.slice(0, 3).join(' / ')} — the old row showed ${BEFORE.members.portal}`);

ok('imud shows zero customers where it used to show three',
   row('עימוד').cells[1] === '0' && row('עימוד').cells[2] === '3',
   `${row('עימוד').cells.slice(0, 3).join(' / ')} — the old row showed ${BEFORE.members.imud}`);

ok('studio shows zero customers where it used to show three',
   row('סטודיו').cells[1] === '0' && row('סטודיו').cells[2] === '3',
   `${row('סטודיו').cells.slice(0, 3).join(' / ')} — the old row showed ${BEFORE.members.studio}`);

ok('kesef keeps its 3 real customers with the 4 robots beside them',
   row('כסף').cells[1] === '3' && row('כסף').cells[2] === '4',
   `${row('כסף').cells.slice(0, 3).join(' / ')} — the old row showed ${BEFORE.members.kesef}`);

ok('every row still draws one cell per column heading',
   rows.length === 8 && rows.every((r) => r.cells.length === heads.length),
   `${rows.length} rows · ${heads.length} headings · widths ${[...new Set(rows.map((r) => r.cells.length))].join(',')}`);

const hint = (await page.textContent('#activeMeans')) || '';
ok('the hint under the table says what a test account is and that it is excluded',
   /qa\.\*@more30\.com/.test(hint) && /אינם נכללים/.test(hint), hint.slice(0, 120));

const tagline = (await page.textContent('#tagline')) || '';
ok('the tagline no longer claims a bare count of everyone in auth.users',
   /לצידם ולא בתוכם/.test(tagline), tagline.slice(0, 140));

await page.screenshot({ path: `${OUT}/activity-board.png`, fullPage: true });
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: `${OUT}/activity-board-dark.png`, fullPage: true });

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'more30_admin_activity() against the hub, 07/08/2026, after migration 0044 — no value here was written by hand',
  before_0044: BEFORE,
  payload: PAYLOAD.platform, cards, heads, rows, results, pass, fail,
}, null, 2));

await browser.close();
server.kill();

console.log(`\n  ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
