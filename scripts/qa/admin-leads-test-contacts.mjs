/**
 * /admin/leads — the board screen that counted fixtures as demand.
 *
 * 0044 closed /admin/activity and named two functions it deliberately left
 * open: more30_admin_snapshot and more30_admin_leads. snapshot turned out to
 * have no human count in it at all (project_overview · tasks · tokens · bugs),
 * so the leads board was the only real one. Migration 0045 gave it the same
 * split, through core.is_test_lead — is_test_account plus the RFC 2606
 * reserved domains, which cannot receive mail and therefore cannot be a person
 * you call back.
 *
 * The payload below is not a hand-written fixture. It is the literal return of
 * more30_admin_leads(2000) against the hub on 07/08/2026, after 0045, with the
 * lead rows trimmed to the ones the checks name. Before 0045 the same call
 * returned leads 75, last_7_days 13, last_30_days 37, newest_at 04/08, and
 * coverage rows of tivuch 8 and bkalot 4.
 *
 * The RPC half is already applied to the hub; the page is served from the
 * working tree, because the deploy queue is still on the Vercel quota
 * (core.issues #83).
 *
 *   node scripts/qa/admin-leads-test-contacts.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5214;
const OUT = 'QA/platform/admin-leads-test-contacts-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

/** What the screen showed for the same rows, read before 0045. */
const BEFORE = {
  leads: 75, last_7_days: 13, last_30_days: 37, systems_with_leads: 8,
  newest_at: '2026-08-04T21:40:05.095626+00:00',
  coverage: { tivuch: 8, bkalot: 4 },
};

const lead = (created_at, number, system_name, kind, full_name, email, is_test) => ({
  src: 'x', system_number: number, system_name, system_path: null, kind,
  full_name, phone: null, email, subject: null, status: null, created_at, is_test,
});

const PAYLOAD = {
  generated_at: '2026-08-07T09:41:12.884301+00:00',
  test_leads_means:
    'פניית בדיקה נכתבה על ידי מבחן, לא על ידי אדם: כתובת qa.*@more30.com או דומיין ' +
    'ששמור ב-RFC 2606 (example.com ודומיו) ואינו יכול לקבל דואר. היא נספרת בנפרד ' +
    'ואינה נכללת באף מספר שמתאר ביקוש. פנייה בלי כתובת מייל נספרת כאמיתית — אין ' +
    'ראיה לכאן או לכאן, ולא נכון להוריד אותה מהספירה בגלל שדה שהמערכת שלה לא אוספת.',
  totals: {
    leads: 64, test_leads: 11, without_email: 39,
    sources: 28, sources_with_leads: 7,
    systems_with_leads: 7, systems_public: 19,
    systems_connected: 8, systems_unconnected: 11,
    last_7_days: 2, test_last_7_days: 11,
    last_30_days: 26, test_last_30_days: 11,
    newest_at: '2026-08-02T19:53:57.056566+00:00',
    test_newest_at: '2026-08-04T21:40:05.095626+00:00',
  },
  coverage: [
    { number: '06', path: 'briut', name: 'לידים קופות חולים', sources: 0, leads: 0,
      test_leads: 0, last_at: null, state: 'unconnected' },
    { number: '10', path: 'bkalot', name: 'מימוש זכויות בקלות', sources: 1, leads: 0,
      test_leads: 4, last_at: null, state: 'test_only' },
    { number: '16', path: 'chatzor', name: 'חצור קונקט', sources: 2, leads: 0,
      test_leads: 0, last_at: null, state: 'connected_empty' },
    { number: '32', path: 'nadlan', name: 'נדל"ן ברגע', sources: 3, leads: 22,
      test_leads: 0, last_at: '2026-07-30T03:19:11.578599+00:00', state: 'has_leads' },
    { number: '36', path: 'tivuch', name: 'נדל״ן פרו — ניהול למתווכים', sources: 1, leads: 1,
      test_leads: 7, last_at: '2026-08-02T19:53:57.056566+00:00', state: 'has_leads' },
  ],
  sources: [
    { src: 'nadlan.report_requests', system_number: '32', system_name: 'נדל"ן ברגע',
      system_path: 'nadlan', count: 22, test_count: 0, last_at: '2026-07-30T03:19:11.578599+00:00' },
    { src: 'nadlan_pro.contacts', system_number: '36', system_name: 'נדל״ן פרו — ניהול למתווכים',
      system_path: 'tivuch', count: 1, test_count: 7, last_at: '2026-08-02T19:53:57.056566+00:00' },
    { src: 'bkalot_auto.contacts', system_number: '10', system_name: 'מימוש זכויות בקלות',
      system_path: 'bkalot', count: 0, test_count: 4, last_at: null },
  ],
  leads: [
    lead('2026-08-04T21:40:05.095626+00:00', '10', 'מימוש זכויות בקלות', 'form',
         'ה', 'qa-probe-not-approved@example.com', true),
    lead('2026-08-04T00:52:57.629345+00:00', '10', 'מימוש זכויות בקלות', 'seed',
         'נמען אמיתי לכאורה', 'real.person@example.com', true),
    lead('2026-08-04T00:52:57.629345+00:00', '10', 'מימוש זכויות בקלות', 'seed',
         'בלי הסכמה', 'qa.bkalot@more30.com', true),
    lead('2026-08-02T22:22:44.916250+00:00', '36', 'נדל״ן פרו — ניהול למתווכים', 'buyer',
         'ישראל ישראלי', 'buyer@example.com', true),
    lead('2026-08-02T19:53:57.056566+00:00', '36', 'נדל״ן פרו — ניהול למתווכים', 'buyer',
         'לקוח אמיתי', null, false),
    lead('2026-07-30T03:19:11.578599+00:00', '32', 'נדל"ן ברגע', 'בקשת דוח',
         'מבקש דוח', null, false),
  ],
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1700 } });
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
await page.route('**/rest/v1/rpc/more30_admin_leads', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) }));

console.log('\n/admin/leads — 13 leads this week, 11 of them written by tests\n');

await page.goto(`http://127.0.0.1:${PORT}/admin-leads.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the board renders instead of the access notice',
   await page.isVisible('#content'),
   ((await page.textContent('#denied').catch(() => '')) || '').trim().slice(0, 80));

const cards = await page.$$eval('#kpis .kpi', (els) => els.map((e) => ({
  n: e.querySelector('.n')?.textContent.trim(),
  l: e.querySelector('.l')?.textContent.replace(/\s+/g, ' ').trim(),
})));
const card = (needle) => cards.find((c) => c.l?.includes(needle)) ?? { n: null, l: '(no card)' };

ok('the total card counts the 64 people and not the 75 rows',
   card('פניות מאנשים').n === '64',
   `${card('פניות מאנשים').n} — expected 64, the old card showed ${BEFORE.leads}`);

ok('"7 ימים אחרונים" is the 2 real inquiries, not the 13 that include the test runs',
   card('7 ימים אחרונים').n === '2',
   `${card('7 ימים אחרונים').n} — expected 2, the old card showed ${BEFORE.last_7_days}`);

ok('"30 יום אחרונים" drops the same 11 fixtures',
   card('30 יום אחרונים').n === '26',
   `${card('30 יום אחרונים').n} — expected 26, the old card showed ${BEFORE.last_30_days}`);

ok('the 11 test leads get their own card and say they are not counted',
   card('פניות בדיקה').n === '11' && /לא נספרות/.test(card('פניות בדיקה').l),
   `${card('פניות בדיקה').n} · ${card('פניות בדיקה').l}`);

ok('"הפנייה האחרונה" is dated by a person, not by the 04/08 probe',
   card('הפנייה האחרונה').n === '2.8.2026' && /מאדם/.test(card('הפנייה האחרונה').l),
   `${card('הפנייה האחרונה').n} · ${card('הפנייה האחרונה').l}`);

ok('"מערכות עם פניות" no longer counts bkalot among the seven',
   card('מערכות עם פניות').n === '7/19',
   `${card('מערכות עם פניות').n} — expected 7/19, the old card showed ${BEFORE.systems_with_leads}/19`);

ok('no card on the page still shows any of the inflated totals',
   !cards.some((c) => [BEFORE.leads, BEFORE.last_7_days, BEFORE.last_30_days]
                        .map(String).includes(c.n)),
   cards.map((c) => `${c.n}=${c.l}`).join(' | '));

const covHeads = await page.$$eval('#cov thead th', (els) => els.map((e) => e.textContent.trim()));
ok('the coverage table separates human inquiries from test ones',
   covHeads.includes('פניות מאנשים') && covHeads.includes('פניות בדיקה'),
   covHeads.join(' | '));

const covRows = await page.$$eval('#cov tbody tr', (els) => els.map((tr) =>
  [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim())));
const covRow = (needle) => covRows.find((r) => r[0]?.includes(needle)) ?? [];

ok('bkalot is no longer green: zero human inquiries and four fixtures',
   covRow('בקלות')[1] === 'מחובר · רק פניות בדיקה' &&
   covRow('בקלות')[3] === '0' && covRow('בקלות')[4] === '4',
   `${covRow('בקלות').slice(1, 5).join(' / ')} — the old row showed ${BEFORE.coverage.bkalot} leads, "מחובר · יש פניות"`);

ok('tivuch keeps its one real contact with the seven copies beside it',
   covRow('פרו')[3] === '1' && covRow('פרו')[4] === '7',
   `${covRow('פרו').slice(1, 5).join(' / ')} — the old row showed ${BEFORE.coverage.tivuch}`);

ok('nadlan, which has no fixtures, is untouched at 22',
   covRow('ברגע')[3] === '22' && covRow('ברגע')[4] === '0',
   covRow('ברגע').slice(1, 5).join(' / '));

ok('every coverage row still draws one cell per column heading',
   covRows.length === PAYLOAD.coverage.length &&
   covRows.every((r) => r.length === covHeads.length),
   `${covRows.length} rows · ${covHeads.length} headings · widths ${[...new Set(covRows.map((r) => r.length))].join(',')}`);

const srcRows = await page.$$eval('#src tbody tr', (els) => els.map((tr) =>
  [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim())));
const srcRow = (needle) => srcRows.find((r) => r[0]?.includes(needle)) ?? [];
ok('the source table names bkalot_auto.contacts as four test rows and zero real ones',
   srcRow('bkalot_auto')[2] === '0' && srcRow('bkalot_auto')[3] === '4',
   srcRow('bkalot_auto').join(' / '));

// The list itself: the rows are marked, not deleted.
const listCount = () => page.textContent('#count').then((s) => s.replace(/\s+/g, ' ').trim());
ok('the list hides the fixtures by default and says how many it hid',
   /2 פניות/.test(await listCount()) && /4 פניות בדיקה מוסתרות/.test(await listCount()),
   await listCount());

await page.uncheck('#hideTest');
const shown = await page.$$eval('#tbl tbody tr', (els) => els.map((tr) => ({
  test: tr.classList.contains('test'),
  cells: [...tr.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()),
})));
ok('unchecking the box brings every row back — nothing was deleted',
   shown.length === PAYLOAD.leads.length,
   `${shown.length} rows for ${PAYLOAD.leads.length} leads`);

ok('the four fixtures are labelled "בדיקה" in place, in date order',
   shown.filter((r) => r.test).length === 4 &&
   shown.filter((r) => r.test).every((r) => r.cells[2]?.startsWith('בדיקה')),
   shown.map((r) => (r.test ? 'T' : '.')).join(''));

ok('the fixture that was built to look real is still caught by its domain',
   shown.some((r) => r.test && r.cells[3] === 'נמען אמיתי לכאורה'),
   shown.filter((r) => r.test).map((r) => r.cells[3]).join(' | '));

const means = (await page.textContent('#testMeans')) || '';
ok('the note says what a test lead is and that a lead without an email still counts',
   /RFC 2606/.test(means) && /בלי כתובת מייל נספרת כאמיתית/.test(means), means.slice(0, 140));

const stamp = (await page.textContent('#stamp')) || '';
ok('the footer states the 39 leads the rule cannot judge',
   /39 פניות אין כתובת מייל/.test(stamp), stamp.slice(0, 160));

const tagline = (await page.textContent('#tagline')) || '';
ok('the tagline no longer presents a bare count of every row in the feed',
   /לצידן ולא בתוכן/.test(tagline), tagline.slice(0, 160));

await page.check('#hideTest');
await page.screenshot({ path: `${OUT}/leads-board.png`, fullPage: true });
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: `${OUT}/leads-board-dark.png`, fullPage: true });
await page.emulateMedia({ colorScheme: 'light' });
await page.uncheck('#hideTest');
await page.screenshot({ path: `${OUT}/leads-board-with-fixtures.png`, fullPage: true });

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  source: 'more30_admin_leads(2000) against the hub, 07/08/2026, after migration 0045 — no value here was written by hand',
  before_0045: BEFORE,
  totals: PAYLOAD.totals, cards, covHeads, covRows, srcRows, results, pass, fail,
}, null, 2));

await browser.close();
server.kill();

console.log(`\n  ${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
