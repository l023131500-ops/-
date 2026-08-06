/**
 * Does a price the admin set actually reach the checkout decision — and does it
 * stay at charged=false while it gets there?
 *
 * more30-priority.md §8ג asks for core.plans to be *wired to the checkout flow
 * in test mode*. `pricing-reflects.mjs` already proves the catalogue reaches the
 * customer page, and `billing-safety.mjs` proves a stranger cannot reach the
 * money path at all. Neither of them asks the question in the middle, and that
 * is the one that was false: /subscribe called `more30_subscribe` and stopped.
 * `more30_checkout` — the function that actually decides whether anything is
 * chargeable — existed, was correct, and had no caller anywhere in production.
 *
 * So this walks the customer's half: a brand-new account through the public
 * signup endpoint, a paid tier chosen through the real RPC, then the checkout
 * decision, then the same thing again through the real page in a browser so a
 * page that quietly stops calling it fails here instead of in production.
 *
 *   node scripts/qa/checkout-flow.mjs                 # torah/basic
 *   node scripts/qa/checkout-flow.mjs kupot extended
 *
 * It then sweeps every mount in the rewrite table, because one hand-picked app
 * is exactly how the next defect hid: torah has its own rows in core.plans, and
 * a system with none falls back to the platform's — more30_system_page and
 * more30_subscribe both did, more30_checkout did not, so /subscribe offered
 * "פרימיום · 10 ₪" on kiosk, studio and tivuch and answered the click with
 * "unknown plan: premium for kiosk" in English on the customer's screen. The
 * sweep asks every tier the page actually offers, on every mount, so a tier the
 * page shows and the checkout rejects fails here.
 *
 * The invariant asserted in every billing mode: charged is false. Nothing here
 * moves money, and it cannot — the mode column rejects 'live' at the CHECK.
 * Creates real rows in auth.users, identifiable by the qa.checkout+ prefix.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const APP = process.argv[2] || 'torah';
const PAID = process.argv[3] || 'basic';
const SHOTS = 'QA/platform/checkout-0806';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function signup() {
  const email = `qa.checkout+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`signup failed: HTTP ${r.status}`);
  const d = await r.json();
  // The signup response carries a session when confirmation is off; when it is
  // on it does not, and the password grant is the honest way to find out rather
  // than assuming either shape.
  if (d.access_token) return { email, password, token: d.access_token };
  const t = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!t.ok) throw new Error(`login failed: HTTP ${t.status}`);
  return { email, password, token: (await t.json()).access_token };
}

async function rpc(fn, body, token) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* left null on purpose */ }
  return { status: r.status, json, text };
}

console.log(`=== checkout — does the price reach a decision? (${APP}/${PAID}) ===`);

const me = await signup();
console.log(`        customer: ${me.email}`);

// --- the catalogue half, so a failure below can be told apart from a bad tier
const page = await rpc('more30_system_page', { p_app: APP });
const plans = page.json?.plans ?? [];
const tier = plans.find((p) => p.code === PAID);
ok(`${APP}: tier "${PAID}" is on the customer page`, !!tier, `codes: ${plans.map((p) => p.code).join(', ')}`);
ok(`${APP}/${PAID}: carries a price`, tier?.price_ils != null && Number(tier.price_ils) > 0,
   `price_ils=${tier?.price_ils ?? 'null'}`);

// --- the free tier must never be routed into a payment path
const dflt = plans.find((p) => p.is_default);
if (dflt) {
  const free = await rpc('more30_subscribe', { p_app: APP, p_plan: dflt.code }, me.token);
  ok('free tier: recorded without charge', free.json?.charged === false, free.text.slice(0, 120));
  ok('free tier: not chargeable', !free.json?.chargeable, `chargeable=${free.json?.chargeable}`);
}

// --- the paid tier: request, then decision
const sub = await rpc('more30_subscribe', { p_app: APP, p_plan: PAID }, me.token);
ok('paid tier: request recorded', sub.json?.ok === true, sub.text.slice(0, 160));
ok('paid tier: nothing charged by the request', sub.json?.charged === false, `charged=${sub.json?.charged}`);
ok('paid tier: flagged chargeable', sub.json?.chargeable === true, `chargeable=${sub.json?.chargeable}`);

const co = await rpc('more30_checkout', { p_app: APP, p_plan: PAID }, me.token);
ok('checkout answers a signed-in customer', co.status === 200, `HTTP ${co.status} ${co.text.slice(0, 120)}`);

const action = co.json?.action;
console.log(`        checkout: action=${action} reason=${co.json?.reason ?? '-'} mode=${co.json?.mode ?? 'off'} provider=${co.json?.provider ?? 'none'}`);

// This is the assertion the whole file exists for, and it holds in every mode
// the column accepts. 'live' is not one of them.
ok('checkout does not charge', co.json?.charged === false, `charged=${co.json?.charged}`);
ok('checkout returns a known decision', ['none', 'grant', 'test_payment'].includes(action), `action=${action}`);
ok('checkout carries the catalogue price', String(co.json?.price_ils) === String(tier?.price_ils),
   `checkout=${co.json?.price_ils} catalogue=${tier?.price_ils}`);

if (action === 'test_payment') {
  ok('test mode says so in words', co.json?.mode === 'test' && /בדיק/.test(co.json?.message ?? ''),
     co.json?.message);
} else if (action === 'none') {
  ok('closed billing explains itself', typeof co.json?.reason === 'string' && !!co.json?.message, co.text.slice(0, 120));
}

// --- the same thing through the real page, because the RPC being right is not
// the failure that happened. The page not calling it is.
//
// A second account on purpose: the customer above already holds this tier, and
// the page correctly renders the tier you are on as a disabled "זה המסלול
// הנוכחי". Reusing them makes the click time out on a page that is behaving
// exactly as it should.
const guest = await signup();
console.log(`        browser customer: ${guest.email}`);
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: 'he-IL' });
const p = await ctx.newPage();

try {
  await p.goto('https://more30.com/login?from=%2Fsubscribe', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(2500);
  await (await p.$('input[autocomplete="username"]')).fill(guest.email);
  await (await p.$('input[type=password]')).fill(guest.password);
  await (await p.$('button[type=submit], form button')).click();
  await p.waitForTimeout(8000);
  if (await p.$('#onboard:not([hidden])')) {
    await (await p.$('#fullName')).fill('לקוח בדיקה');
    await (await p.$('#saveName')).click();
    await p.waitForTimeout(7000);
  }

  await p.goto(`https://more30.com/subscribe?app=${encodeURIComponent(APP)}`, {
    waitUntil: 'domcontentloaded', timeout: 90000,
  });
  await p.waitForTimeout(4000);

  // Watch the wire, not the words: a page that renders a reassuring sentence
  // without asking the server is exactly the state this replaces.
  const calls = [];
  p.on('request', (r) => {
    if (r.url().includes('/rpc/more30_checkout')) calls.push(r.url());
  });

  const btn = await p.$(`button[data-plan="${PAID}"]`);
  ok('page offers the paid tier', !!btn, `no button[data-plan="${PAID}"]`);
  if (btn) {
    await btn.click();
    await p.waitForTimeout(7000);

    ok('page calls more30_checkout', calls.length > 0, 'the checkout RPC was never requested');

    const block = await p.$eval('#checkout', (el) => ({ hidden: el.hidden, text: el.innerText.trim() }))
      .catch(() => null);
    ok('page shows the checkout decision', !!block && !block.hidden && block.text.length > 0,
       block ? `hidden=${block.hidden}` : 'no #checkout element');
    if (block?.text) console.log(`        on screen: ${block.text.replace(/\s+/g, ' ').slice(0, 160)}`);

    // The page reloads its state after a choice, and that reload is where the
    // plan name is printed back to the customer. It printed the English code
    // ("extended") because the lookup read a nested shape the RPC does not
    // return — invisible until a paid tier was actually chosen, which is what
    // this file is the first thing to do.
    const lede = await p.$eval('#lede', (el) => el.textContent.trim()).catch(() => '');
    ok('the plan is named in Hebrew, not by its code', !!lede && !new RegExp(`\\b${PAID}\\b`).test(lede), lede);

    // Nothing on this page may ask for a card while billing is not live.
    const cardFields = await p.$$eval(
      'input',
      (els) => els.filter((e) => /card|credit|cvv|אשראי/i.test(`${e.name} ${e.id} ${e.placeholder}`)).length,
    );
    ok('no card field anywhere on the page', cardFields === 0, `${cardFields} found`);

    await p.screenshot({ path: `${SHOTS}/${APP}-${PAID}.png`, fullPage: true });
  }
} catch (e) {
  ok('page journey completes', false, String(e.message).slice(0, 140));
}

await browser.close();

// --- the sweep: every mount, every tier its own page offers.
//
// The mount list comes out of the rewrite table rather than an array typed here,
// for the reason admin-screens-reachable.mjs gives: a hardcoded list keeps
// passing after the next system is added, and the systems that fall back to the
// platform's plans are precisely the ones nobody remembers to add.
const here = path.dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(readFileSync(path.resolve(here, '../../portal/vercel.dist.json'), 'utf8'));
const mounts = [...new Set(
  table.rewrites.map((r) => /^\/([a-z0-9-]+)\/:path\*$/.exec(r.source)?.[1]).filter(Boolean),
)].sort();

console.log(`\n=== sweep — does every offered tier reach a decision? (${mounts.length} mounts) ===`);
const sweeper = await signup();
console.log(`        sweep customer: ${sweeper.email}`);

const rejected = [];
let asked = 0;
for (const app of mounts) {
  const d = (await rpc('more30_system_page', { p_app: app })).json;
  const tiers = (d?.plans ?? []).filter((t) => t.price_ils != null && Number(t.price_ils) > 0);
  const from = d?.plans_from ?? '?';
  const bad = [];
  for (const t of tiers) {
    asked++;
    const c = await rpc('more30_checkout', { p_app: app, p_plan: t.code }, sweeper.token);
    // charged must stay false even on the paths that answer — a 200 that
    // charged something would be worse than the 400 this sweep was written for.
    if (c.status !== 200 || c.json?.charged !== false) {
      bad.push(`${t.code} -> HTTP ${c.status} ${(c.json?.message ?? c.text).slice(0, 60)}`);
    }
  }
  if (bad.length) rejected.push({ app, from, bad });
  console.log(
    `        ${app.padEnd(12)} plans_from=${String(from).padEnd(8)} ` +
      `${tiers.length} priced tier(s)  ${bad.length ? 'REJECTED: ' + bad.join(' | ') : 'ok'}`,
  );
}
ok(`every priced tier on every mount reaches a decision (${asked} asked)`,
   rejected.length === 0,
   rejected.map((r) => `${r.app}[${r.from}]: ${r.bad.join(', ')}`).join(' ; '));

console.log(`\n${pass} passed · ${fail} failed   (shots: ${SHOTS})`);
process.exit(fail ? 1 : 0);
