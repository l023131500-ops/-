/**
 * /admin/pricing — the banner counted seventy plans that would be charged the
 * moment the switch opens, and thirty-one of them cannot be reached at all.
 *
 * Measured on the live database, 07/08:
 *
 *   chargeable_plans  (what the banner printed)                     70
 *   offerable_plans   (what a customer can actually reach)          39
 *   ── the gap, 31 ────────────────────────────────────────────────────
 *   'pro' = 1 ₪, customer_visible=false, on all 29 systems          29
 *   mechiron/basic=2 and mechiron/extended=5, on a system that        2
 *     core.app_offer_block() answers 'not_offered' for
 *
 * Both filters already exist and are already enforced: more30_plans and
 * more30_subscribe filter on customer_visible, and 0033/0034 taught both to
 * call core.app_offer_block() and refuse before reaching core.plans at all.
 * more30_admin_pricing_list() called neither — so the board drew a price field
 * and the state "לגבייה" over rows no checkout will ever sell, and drew nine
 * blocked systems (crm, financial, gesher, igud, mechiron, mthbram, shiurim,
 * smachot, zol) as ordinary cards, some of them tagged "חי" because live=true
 * is not public_visible.
 *
 * 0036 adds offerable_plans / offer_block / offer_note / sellable /
 * customer_visible / offerable — additively, so the copy already in production
 * keeps working while the deploy queue is blocked on the Vercel quota
 * (core.issues #83). This run proves the page reads them, over four payloads:
 *
 *   · new   — the real numbers the RPC returns today (70 priced, 39 offerable)
 *   · old   — the same answer without offerable_plans, i.e. an old RPC against
 *             a new page: it must fall back silently, never invent a number
 *   · live  — the switch open, to prove the gap sentence survives that branch
 *   · clean — no gap at all, to prove the page does not accuse a clean board
 *
 * The systems in every payload are the real shape the RPC returns, trimmed to
 * three: one sellable, one blocked, one carrying the hidden 'pro' tier.
 * Served from the working tree.
 *
 *   node scripts/qa/admin-pricing-offerable.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5219;
const OUT = 'QA/platform/admin-pricing-offerable-0807';

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

/** שלוש מערכות: אחת נמכרת, אחת חסומה, ואחת נושאת את השורה הנסתרת. */
const SYSTEMS = [
  {
    number: '32', app_key: 'nadlan', name: 'נדל״ן ברגע', live: true,
    live_url: 'https://more30.com/nadlan', show_in_showcase: true, sort_key: '32',
    offer_block: null, offer_note: null, sellable: true,
    plans: [
      plan({ code: 'free', name_he: 'חינם', price_ils: null, period: null, is_default: true, chargeable: false, offerable: false }),
      plan({ code: 'premium', name_he: 'פרימיום', price_ils: 12 }),
      // השורה שהייתה מצוירת כ"לגבייה" ואינה נמכרת לאיש.
      plan({ code: 'pro', name_he: 'פרו (בדיקה)', price_ils: 1, customer_visible: false, offerable: false }),
    ],
  },
  {
    // 0032 הורידה אותה מדף הבית, 0034 לימדה את הקופה לסרב — והלוח המשיך למכור.
    number: '27', app_key: 'mechiron', name: 'מחירון', live: true,
    live_url: 'https://more30.com/mechiron', show_in_showcase: false, sort_key: '27',
    offer_block: 'not_offered',
    offer_note: 'המערכת הזאת אינה מוצעת כרגע למנוי.',
    sellable: false,
    plans: [
      plan({ code: 'basic', name_he: 'בסיסי', price_ils: 2, offerable: false }),
      plan({ code: 'extended', name_he: 'מורחב', price_ils: 5, offerable: false }),
    ],
  },
  {
    number: '10', app_key: 'bkalot', name: 'מימוש זכויות בקלות', live: true,
    live_url: 'https://more30.com/bkalot', show_in_showcase: true, sort_key: '10',
    offer_block: null, offer_note: null, sellable: true,
    plans: [
      plan({ code: 'basic', name_he: 'בסיסי', price_ils: 2 }),
      plan({ code: 'extended', name_he: 'מורחב', price_ils: 5 }),
    ],
  },
];

const OFF_SWITCH = {
  mode: 'off', provider: null,
  note: 'סגור. מסלול ה-test אומת מקצה לקצה ב-06/08 והוחזר ל-off.',
  updated_at: '2026-08-06T11:29:52.268297+00:00',
  chargeable: false,
};

const base = {
  generated_at: '2026-08-07T06:40:00.000Z',
  price_states: {
    null: 'טרם נקבע — אסור לפתוח סליקה',
    zero: 'הוחלט: ללא חיוב. המערכת פעילה וחינמית',
    positive: 'מחיר לגבייה',
  },
  chargeable_plans: 70,
  offerable_plans: 39,
  systems: SYSTEMS,
  billing: OFF_SWITCH,
};

const CASES = {
  new: base,
  // ה-RPC הישן: אין offerable_plans. הדף החדש חייב לשתוק, לא לנחש.
  old: { ...base, offerable_plans: undefined },
  live: {
    ...base,
    billing: { mode: 'test', provider: 'nedarim-plus', note: null,
               updated_at: '2026-08-07T06:40:00.000Z', chargeable: true },
  },
  // לוח נקי: 39 מתומחרים, כולם ניתנים להצעה. אסור שיאשים אף אחד.
  clean: { ...base, chargeable_plans: 39, offerable_plans: 39 },
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
    locale: 'he-IL', viewport: { width: 1280, height: 1500 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  });
  const page = await ctx.newPage();
  await page.addInitScript(SESSION);
  await page.route('**/rest/v1/rpc/more30_admin_pricing_list', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
  await page.goto(`http://127.0.0.1:${PORT}/admin-pricing.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});
  const banner = await page.$eval('#billing', (e) => e.innerText.replace(/\s+/g, ' ').trim())
    .catch(() => '');
  const sections = await page.$$eval('.sys', (els) =>
    els.map((s) => ({
      head: s.querySelector('.sys-head').innerText.replace(/\s+/g, ' ').trim(),
      note: s.querySelector('.blocked-note')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
      states: [...s.querySelectorAll('.state')].map((x) => x.innerText.trim()),
      reach: [...s.querySelectorAll('button[data-app]')].map((b) => b.dataset.reach),
    })));
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
  await ctx.close();
  return { banner, sections };
}

console.log('\n/admin/pricing — priced is not the same as sellable\n');

const now = await render(CASES.new, { shot: 'offerable-light' });

ok('the banner still reports the 70 priced plans it always did',
   now.banner.includes('70 מסלולים'), now.banner.slice(0, 150));

ok('and now says how many of them a customer can reach — 39, and 31 that cannot',
   now.banner.includes('39') && now.banner.includes('31'), now.banner.slice(0, 260));

ok('and it names why, instead of leaving the admin to guess',
   now.banner.includes('נסתר') && now.banner.includes('מסרבת למכור'),
   now.banner.slice(0, 260));

const [nadlan, mechiron, bkalot] = now.sections;

ok('a blocked system carries the tag on its own card',
   mechiron.head.includes('לא מוצע למכירה') && !bkalot.head.includes('לא מוצע למכירה'),
   `mechiron: ${mechiron.head} | bkalot: ${bkalot.head}`);

ok('and quotes the same refusal the checkout raises, verbatim',
   mechiron.note?.includes('אינה מוצעת כרגע למנוי') && bkalot.note === null,
   mechiron.note ?? '(none)');

ok('its two priced rows stop reading "לגבייה"',
   mechiron.states.every((s) => s.includes('לא נמכר') && s.includes('חסומה')),
   mechiron.states.join(' / '));

ok('the hidden pro tier is marked on a system that is otherwise sold',
   nadlan.states[2].includes('לא נמכר') && nadlan.states[2].includes('נסתר'),
   nadlan.states.join(' / '));

ok('and the tiers next to it are untouched — 12 ₪ still reads "לגבייה"',
   nadlan.states[1] === 'לגבייה' && nadlan.states[0].includes('טרם נקבע'),
   nadlan.states.join(' / '));

ok('a fully sellable system reads exactly as it did before',
   bkalot.states.join('/') === 'לגבייה/לגבייה' &&
   bkalot.reach.join('/') === 'open/open',
   `${bkalot.states.join('/')} · ${bkalot.reach.join('/')}`);

ok('every save button knows which of the three it is',
   mechiron.reach.join('/') === 'blocked/blocked' &&
   nadlan.reach.join('/') === 'open/open/hidden',
   `${mechiron.reach.join('/')} · ${nadlan.reach.join('/')}`);

const old = await render(CASES.old, { shot: 'offerable-old-rpc' });
ok('an old RPC with no offerable_plans makes the page say nothing, not guess',
   old.banner.includes('70 מסלולים') &&
   !old.banner.includes('ניתנים להצעה') && !old.banner.includes('31'),
   old.banner.slice(0, 200));

const live = await render(CASES.live, { shot: 'offerable-live-switch' });
ok('the gap sentence survives the open-switch branch too',
   live.banner.includes('הסליקה פעילה') && live.banner.includes('39') &&
   live.banner.includes('31'),
   live.banner.slice(0, 240));

const clean = await render(CASES.clean, { shot: 'offerable-clean' });
ok('a board with no gap is told so, and is not accused',
   clean.banner.includes('כולם ניתנים להצעה') && !clean.banner.includes('אינם'),
   clean.banner.slice(0, 200));

const dark = await render(CASES.new, { dark: true, shot: 'offerable-dark' });
ok('dark mode draws the same words',
   dark.banner === now.banner, dark.banner.slice(0, 90));

await browser.close();
server.kill();

await writeFile(`${OUT}/_results.json`,
  JSON.stringify({
    ran: 'scripts/qa/admin-pricing-offerable.mjs',
    page: 'portal/public/admin-pricing.html',
    rpc: 'more30_admin_pricing_list (migration 0036)',
    served: 'working tree',
    measured_on_live_db: {
      chargeable_plans: 70, offerable_plans: 39, gap: 31,
      hidden_pro_rows: 29, blocked_system_rows: 2,
      blocked_systems: ['crm', 'financial', 'gesher', 'igud', 'mechiron',
                        'mthbram', 'shiurim', 'smachot', 'zol'],
    },
    banners: { new: now.banner, old: old.banner, live: live.banner, clean: clean.banner },
    sections: now.sections,
    summary: { pass, fail },
    checks: results,
  }, null, 2) + '\n', 'utf8');

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
