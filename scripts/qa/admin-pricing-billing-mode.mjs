/**
 * /admin/pricing — the banner that promised nobody is charged, without reading the switch.
 *
 * The reassurance on this screen ("הסליקה אינה מחוברת. אף אחד לא מחויב בפועל")
 * was fixed HTML. It happens to be true — core.billing_settings holds mode='off',
 * provider=null — but the table's own note says reopening it is "UPDATE יחיד, בלי
 * פריסה". A promise that is not measured breaks silently, and it would break over
 * a board that sets the price of 29 systems, 70 of whose plans already carry a
 * number above zero.
 *
 * 0029 gives more30_admin_pricing_list() a `billing` block read from the table.
 * This run proves the page draws all three answers rather than one:
 *
 *   · off + no provider  — the current live row, verbatim (mode/provider/note/
 *     updated_at as measured 07/08). Must still reassure, but say which switch
 *     it read and how many plans are already priced.
 *   · test + provider    — must stop reassuring. Different class, different words.
 *   · no row at all      — must say "unknown", not "closed". This is the branch
 *     that a two-state banner gets wrong by construction.
 *
 * The systems list in every fixture is the real shape the RPC returns, trimmed to
 * two systems; the numbers in the `off` fixture are the rows core.billing_settings
 * and core.plans actually hold. Served from the working tree — the deploy queue is
 * blocked on the Vercel quota (core.issues #83).
 *
 *   node scripts/qa/admin-pricing-billing-mode.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5213;
const OUT = 'QA/platform/admin-pricing-billing-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

/** שתי מערכות בלבד — הבאנר הוא הנבדק, לא הרשימה. */
const SYSTEMS = [
  {
    number: '10', app_key: 'bkalot', name: 'מימוש זכויות בקלות', live: true,
    live_url: 'https://more30.com/bkalot', show_in_showcase: true, sort_key: '10',
    plans: [
      { code: 'basic', name_he: 'בסיסי', billing_kind: 'subscription', price_ils: 2, period: 'month', is_default: false, active: true, chargeable: true },
      { code: 'pro', name_he: 'פרו (בדיקה)', billing_kind: 'subscription', price_ils: 1, period: 'month', is_default: false, active: true, chargeable: true },
    ],
  },
  {
    number: '32', app_key: 'nadlan', name: 'נדל״ן ברגע', live: true,
    live_url: 'https://more30.com/nadlan', show_in_showcase: true, sort_key: '32',
    plans: [
      { code: 'free', name_he: 'חינם', billing_kind: 'subscription', price_ils: null, period: null, is_default: true, active: true, chargeable: false },
      { code: 'premium', name_he: 'פרימיום', billing_kind: 'subscription', price_ils: 12, period: 'month', is_default: false, active: true, chargeable: true },
    ],
  },
];

const base = {
  generated_at: '2026-08-07T04:40:00.000Z',
  price_states: {
    null: 'טרם נקבע — אסור לפתוח סליקה',
    zero: 'הוחלט: ללא חיוב. המערכת פעילה וחינמית',
    positive: 'מחיר לגבייה',
  },
  chargeable_plans: 70,
  systems: SYSTEMS,
};

const CASES = {
  // השורה החיה, כפי שנמדדה ב-07/08.
  off: {
    ...base,
    billing: {
      mode: 'off', provider: null,
      note: 'סגור. מסלול ה-test אומת מקצה לקצה ב-06/08 (charged=false בשני המצבים) והוחזר ל-off.',
      updated_at: '2026-08-06T11:29:52.268297+00:00',
      chargeable: false,
    },
  },
  // מה שיקרה ברגע שה-UPDATE ירוץ. אינו המצב היום, ולכן מסומן כתרחיש.
  live: {
    ...base,
    billing: {
      mode: 'test', provider: 'nedarim-plus', note: null,
      updated_at: '2026-08-07T04:40:00.000Z',
      chargeable: true,
    },
  },
  // טבלה ריקה: אין תשובה, ולא "סגור".
  unknown: { ...base, billing: null },
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

/** מצייר את העמוד מול תשובה נתונה ומחזיר את הבאנר. */
async function render(payload, { dark = false, shot = null } = {}) {
  const ctx = await browser.newContext({
    locale: 'he-IL', viewport: { width: 1280, height: 1400 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  });
  const page = await ctx.newPage();
  await page.addInitScript(SESSION);
  await page.route('**/rest/v1/rpc/more30_admin_pricing_list', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
  await page.goto(`http://127.0.0.1:${PORT}/admin-pricing.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});
  const banner = await page.$eval('#billing', (e) => ({
    cls: e.className,
    text: e.innerText.replace(/\s+/g, ' ').trim(),
  })).catch(() => ({ cls: '(missing)', text: '' }));
  const systems = await page.$$eval('.sys', (els) => els.length);
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
  await ctx.close();
  return { banner, systems };
}

console.log('\n/admin/pricing — the banner now reads core.billing_settings\n');

const off = await render(CASES.off, { shot: 'pricing-off-light' });
ok('the closed switch still reassures — and names the switch it read',
   off.banner.cls.includes('warn') && off.banner.text.includes('הסליקה סגורה') &&
   off.banner.text.includes('core.billing_settings.mode=off'),
   `${off.banner.cls} · ${off.banner.text.slice(0, 110)}`);

ok('and it says how many plans are already priced — 0 charged is not 0 priced',
   off.banner.text.includes('70 מסלולים'), off.banner.text.slice(0, 160));

ok('the systems list is untouched by the change',
   off.systems === SYSTEMS.length, `${off.systems} sections`);

const live = await render(CASES.live, { shot: 'pricing-live-light' });
ok('an open switch stops reassuring — it says money moves',
   live.banner.cls.includes('danger') && live.banner.text.includes('הסליקה פעילה') &&
   !live.banner.text.includes('אף אחד אינו מחויב'),
   `${live.banner.cls} · ${live.banner.text.slice(0, 110)}`);

ok('and it names the mode and the provider, not just "on"',
   live.banner.text.includes('test') && live.banner.text.includes('nedarim-plus'),
   live.banner.text.slice(0, 140));

const unknown = await render(CASES.unknown, { shot: 'pricing-unknown-light' });
ok('no row at all reads as unknown, not as closed',
   unknown.banner.text.includes('אינו ידוע') &&
   !unknown.banner.text.includes('אף אחד אינו מחויב'),
   unknown.banner.text.slice(0, 140));

const offDark = await render(CASES.off, { dark: true, shot: 'pricing-off-dark' });
ok('dark mode draws the same banner',
   offDark.banner.text === off.banner.text, offDark.banner.text.slice(0, 80));

const liveDark = await render(CASES.live, { dark: true, shot: 'pricing-live-dark' });
ok('and the danger branch survives dark mode',
   liveDark.banner.cls.includes('danger'), liveDark.banner.cls);

await browser.close();
server.kill();

await writeFile(`${OUT}/_results.json`,
  JSON.stringify({
    ran: 'scripts/qa/admin-pricing-billing-mode.mjs',
    page: 'portal/public/admin-pricing.html',
    rpc: 'more30_admin_pricing_list (migration 0029)',
    served: 'working tree',
    banners: { off: off.banner, live: live.banner, unknown: unknown.banner },
    summary: { pass, fail },
    checks: results,
  }, null, 2) + '\n', 'utf8');

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
