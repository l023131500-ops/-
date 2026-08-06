/**
 * Does /admin/leads actually draw what the RPC hands it?
 *
 * The gate is covered by leads-gate.mjs and the numbers are checked against the
 * database directly. What neither of those touches is the rendering code, and
 * that is where this screen can lie quietly: a source with zero leads that
 * silently vanishes from the table, or an empty cell where the source table has
 * no such column — both look like a clean screen rather than a missing one.
 * §2 asks for every system's leads in one place, and a row that is not drawn is
 * not in that place.
 *
 * So the payload here is a FIXTURE, not production data, and deliberately so:
 *   · it is built to contain the two shapes that are easy to drop — a zero-count
 *     source and a lead whose phone/email/subject do not exist at the source;
 *   · the real leads carry the name, phone and email of real people, and a
 *     regression test that a repo can run must not have those in it.
 * The live page is the real one (more30.com/admin/leads, deployed); only the RPC
 * response is substituted, at the network layer, exactly as the browser would
 * have received it.
 *
 *   node scripts/qa/leads-screen-renders.mjs
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PAGE = 'https://more30.com/admin/leads';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const PAYLOAD = {
  generated_at: '2026-08-06T12:00:00Z',
  totals: {
    leads: 2, sources: 3, sources_with_leads: 1, systems_with_leads: 1,
    last_7_days: 1, last_30_days: 2, newest_at: '2026-08-04T21:40:05Z',
  },
  sources: [
    { src: 'bkalot_auto.contacts', system_number: '10', system_name: 'מימוש זכויות בקלות',
      system_path: 'bkalot', count: 2, last_at: '2026-08-04T21:40:05Z' },
    // the two shapes that must survive the render:
    { src: 'public.national_requests', system_number: null,
      system_name: 'פניות ארציות (לא משויך למערכת)', system_path: null, count: 0, last_at: null },
    { src: 'csj.hf_requests', system_number: null, system_name: 'מראת csjekrvu',
      system_path: null, count: 0, last_at: null },
  ],
  leads: [
    { src: 'bkalot_auto.contacts', system_number: '10', system_name: 'מימוש זכויות בקלות',
      system_path: 'bkalot', kind: 'איש קשר', full_name: 'בודק אחד', phone: '050-0000000',
      email: 'one@example.test', subject: 'נושא', status: 'new',
      created_at: '2026-08-04T21:40:05Z' },
    // no phone, no email, no subject — the source table has no such columns
    { src: 'bkalot_auto.contacts', system_number: '10', system_name: 'מימוש זכויות בקלות',
      system_path: 'bkalot', kind: 'איש קשר', full_name: 'בודק שני', phone: null,
      email: null, subject: null, status: null, created_at: '2026-07-20T08:00:00Z' },
  ],
};

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL' });
const page = await ctx.newPage();

// The page bails before the RPC when there is no session, so it needs one to
// exist. Only the shape matters — the answer is substituted below, and the
// server-side gate is what actually protects the data (see leads-gate.mjs).
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

console.log('\n/admin/leads — what the screen draws\n');

await page.goto(PAGE, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the screen renders instead of the access notice',
   await page.isVisible('#content'),
   (await page.textContent('#denied').catch(() => '') || '').trim().slice(0, 80));

const kpis = (await page.textContent('#kpis')) || '';
ok('the KPI row reports sources-with-leads out of all sources', kpis.includes('1/3'), kpis.replace(/\s+/g, ' ').slice(0, 120));

const srcRows = await page.$$eval('#src tbody tr', (rs) => rs.map((r) => r.innerText));
ok('every source is listed, including the empty ones', srcRows.length === 3, `${srcRows.length} rows`);
ok('a source with zero leads still appears, showing its zero',
   srcRows.some((r) => r.includes('public.national_requests') && /(^|\D)0(\D|$)/.test(r)));

const leadRows = await page.$$eval('#tbl tbody tr', (rs) => rs.map((r) => r.innerText));
ok('both leads are drawn', leadRows.length === 2, `${leadRows.length} rows`);
ok('a field the source table does not have reads "לא זמין", not blank',
   (leadRows[1] || '').split('\t').filter((c) => c.trim() === 'לא זמין').length >= 4,
   JSON.stringify(leadRows[1] || ''));

// The filter is the only way to answer "what came in from this system", which
// is the question §2 is actually asking.
await page.selectOption('#sys', 'מימוש זכויות בקלות');
ok('filtering by system keeps the matching leads',
   (await page.$$('#tbl tbody tr')).length === 2);
await page.fill('#q', 'בודק שני');
ok('search narrows to the matching lead',
   (await page.$$('#tbl tbody tr')).length === 1);

await page.screenshot({ path: 'QA/platform/admin-leads.png', fullPage: true });
console.log('\n  screenshot: QA/platform/admin-leads.png');

await browser.close();
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
