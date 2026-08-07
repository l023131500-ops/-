/**
 * /admin/pricing — the board drew a publish switch for a row that has no
 * project behind it, and the only thing behind that switch was an exception.
 *
 * The switch calls more30_admin_showcase_set(p_app, p_flag), which opens with:
 *
 *   select show_in_showcase, is_protected into v_before, v_protected
 *     from core.projects where path = p_app;
 *   if not found then
 *     raise exception 'no such project path: %', p_app using errcode = '22023';
 *
 * The list it is drawn over comes from core.plans, not core.projects:
 *
 *   from core.plans pl
 *   left join core.projects p on p.path = pl.app_key and coalesce(p.to_delete,false)=false
 *
 * Measured on the live database, 07/08. Of the 29 app_keys that carry plans,
 * exactly one meets no core.projects.path at all:
 *
 *   app_key = 'more30'   number = '—'   project_rows = 0
 *
 * That is not bad data. more30 is the platform — project 33, whose path is
 * null on purpose because it is not mounted under a path, it is the site. It
 * has plans (free, premium at 10 ₪) so it is on the pricing board; it has no
 * path, so more30_admin_showcase_set can never find it. The admin saw a box
 * identical to its twenty siblings, clicked it, and got it snapped back with
 * alert('לא נשמר: no such project path: more30') — a raw database error on a
 * switch that was never able to work.
 *
 * 0039 has the RPC answer it up front, with the same two conditions 0035
 * already enforces on the write side: showcase_settable + showcase_block
 * ('unregistered' | 'protected' | null). This run proves the page reads them,
 * over three payloads served from the working tree:
 *
 *   · new  — the real shape today: two settable systems, more30 unregistered
 *   · old  — the same answer without the fields, i.e. an old RPC against a new
 *            page: every box must still draw, so nothing regresses while the
 *            deploy queue is blocked on the Vercel quota (core.issues #83)
 *   · prot — a protected row, the other branch 0035 refuses, to prove the
 *            reason is the row's own and not one generic sentence
 *
 *   node scripts/qa/admin-pricing-showcase-settable.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5221;
const OUT = 'QA/platform/admin-pricing-showcase-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const plan = (o) => ({
  period: 'month', is_default: false, active: true,
  chargeable: (o.price_ils ?? 0) > 0,
  customer_visible: true,
  offerable: (o.price_ils ?? 0) > 0,
  billing_kind: 'subscription',
  ...o,
});

const settable = { showcase_settable: true, showcase_block: null };

/** שלוש שורות בדיוק כפי שה-RPC מחזיר אותן: שתי מערכות, ואחריהן ההאב עצמו. */
const SYSTEMS = [
  {
    number: '10', app_key: 'bkalot', name: 'מימוש זכויות בקלות', live: true,
    live_url: 'https://more30.com/bkalot', show_in_showcase: false, sort_key: '10',
    offer_block: null, offer_note: null, sellable: true, ...settable,
    plans: [
      plan({ code: 'basic', name_he: 'בסיסי', price_ils: 2 }),
      plan({ code: 'extended', name_he: 'מורחב', price_ils: 5 }),
    ],
  },
  {
    number: '32', app_key: 'nadlan', name: 'נדל״ן ברגע', live: true,
    live_url: 'https://more30.com/nadlan', show_in_showcase: true, sort_key: '32',
    offer_block: null, offer_note: null, sellable: true, ...settable,
    plans: [plan({ code: 'premium', name_he: 'פרימיום', price_ils: 12 })],
  },
  {
    // ה-left join שלא מצא שורה. זו השורה שהמתג שלה זרק שגיאה.
    number: '—', app_key: 'more30', name: 'more30', live: false,
    live_url: null, show_in_showcase: false, sort_key: 'zz',
    offer_block: null, offer_note: null, sellable: true,
    showcase_settable: false, showcase_block: 'unregistered',
    plans: [
      plan({ code: 'free', name_he: 'חינמי', price_ils: null, period: null, is_default: true, chargeable: false, offerable: false }),
      plan({ code: 'premium', name_he: 'פרימיום', price_ils: 10 }),
    ],
  },
];

const base = {
  generated_at: '2026-08-07T08:00:00.000Z',
  price_states: {
    null: 'טרם נקבע — אסור לפתוח סליקה',
    zero: 'הוחלט: ללא חיוב. המערכת פעילה וחינמית',
    positive: 'מחיר לגבייה',
  },
  chargeable_plans: 70,
  offerable_plans: 39,
  systems: SYSTEMS,
  billing: {
    mode: 'off', provider: null,
    note: 'סגור. מסלול ה-test אומת מקצה לקצה ב-06/08 והוחזר ל-off.',
    updated_at: '2026-08-06T11:29:52.268297+00:00',
    chargeable: false,
  },
};

/** ה-RPC הישן: אין את שני השדות בכלל. כל תיבה חייבת להמשיך להיות מצוירת. */
const strip = (s) => {
  const { showcase_settable, showcase_block, ...rest } = s;
  return rest;
};

const CASES = {
  new: base,
  old: { ...base, systems: SYSTEMS.map(strip) },
  prot: {
    ...base,
    systems: [
      SYSTEMS[0],
      { ...SYSTEMS[1], name: 'בקלות (זכאות)', app_key: 'bkalut',
        showcase_settable: false, showcase_block: 'protected' },
    ],
  },
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });

const SESSION = () => {
  localStorage.setItem('more30-auth', JSON.stringify({
    access_token: 'qa.fixture.token', refresh_token: 'qa.fixture.refresh',
    token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'qa.fixture@more30.com' },
  }));
};

async function render(payload, { dark = false, shot = null } = {}) {
  const ctx = await browser.newContext({
    locale: 'he-IL', viewport: { width: 1280, height: 1300 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  });
  const page = await ctx.newPage();
  await page.addInitScript(SESSION);
  await page.route('**/rest/v1/rpc/more30_admin_pricing_list', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
  await page.goto(`http://127.0.0.1:${PORT}/admin-pricing.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});
  const sections = await page.$$eval('.sys', (els) =>
    els.map((s) => ({
      app: s.querySelector('button[data-app]')?.dataset.app ?? null,
      head: s.querySelector('.sys-head').innerText.replace(/\s+/g, ' ').trim(),
      box: s.querySelector('input[data-showcase]')?.dataset.showcase ?? null,
      checked: s.querySelector('input[data-showcase]')?.checked ?? null,
      reason: s.querySelector('.showcase.off')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    })));
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
  await ctx.close();
  return sections;
}

console.log('\n/admin/pricing — a switch is only drawn where it can be saved\n');

const now = await render(CASES.new, { shot: 'showcase-light' });
const [bkalot, nadlan, hub] = now;

ok('a registered system still carries the switch, unchanged',
   bkalot.box === 'bkalot' && bkalot.checked === false && bkalot.reason === null,
   `box=${bkalot.box} checked=${bkalot.checked} reason=${bkalot.reason}`);

ok('and one already showing is still drawn checked',
   nadlan.box === 'nadlan' && nadlan.checked === true,
   `box=${nadlan.box} checked=${nadlan.checked}`);

ok('the row with no project behind it draws no switch at all',
   hub.box === null, `box=${hub.box}`);

ok('and says why, in words, instead of waiting to throw',
   hub.reason === 'אינה מערכת בקטלוג — אין מה להציג', hub.reason ?? '(none)');

ok('its price rows are untouched — it is still a system you can price',
   hub.app === 'more30', `data-app=${hub.app}`);

const old = await render(CASES.old, { shot: 'showcase-old-rpc' });
ok('an old RPC without the fields draws every switch, exactly as before',
   old.length === 3 && old.every((s) => s.box !== null) &&
   old.every((s) => s.reason === null),
   old.map((s) => `${s.box}`).join('/'));

const prot = await render(CASES.prot, { shot: 'showcase-protected' });
ok('a protected row gets its own reason, not the unregistered one',
   prot[1].box === null && prot[1].reason === 'מוגנת — אינה מתפרסמת',
   prot[1].reason ?? '(none)');

const dark = await render(CASES.new, { dark: true, shot: 'showcase-dark' });
ok('dark mode draws the same three rows and the same sentence',
   dark[2].reason === hub.reason && dark[0].box === 'bkalot',
   dark[2].reason ?? '(none)');

await browser.close();
server.kill();

await writeFile(`${OUT}/_results.json`,
  JSON.stringify({
    ran: 'scripts/qa/admin-pricing-showcase-settable.mjs',
    page: 'portal/public/admin-pricing.html',
    rpc: 'more30_admin_pricing_list (migration 0039)',
    served: 'working tree',
    measured_on_live_db: {
      app_keys_with_plans: 29,
      unmatched_by_projects_path: ['more30'],
      showcase_set_error: 'no such project path: more30',
      rows_with_show_in_showcase_true: 0,
    },
    sections: { new: now, old, protected: prot },
    summary: { pass, fail },
    checks: results,
  }, null, 2) + '\n', 'utf8');

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
