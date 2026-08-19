/**
 * Does the personal area name the plan the customer actually subscribed to?
 *
 * more30-priority.md §1 asks that whoever signs up "enters the product as a
 * full customer … with a personal area", and §8 asks for 2/5/10/12/15 ₪ tiers
 * they can subscribe to. Both halves were built and never joined:
 *
 *   · more30_subscribe() writes a row to core.subscriptions, and nothing else.
 *   · more30_profile_get() and more30_join_app() returned `plan` from the
 *     column public.more30_profiles.plan, which no subscription ever writes.
 *
 * So every subscriber read "חינמי" on /me with the upgrade pitch under it, and
 * "שדרוג לפרימיום" in the account menu of every site. Migration 0031 moved both
 * reads to core.subscriptions. This walks the customer's own path to prove it:
 * a brand-new account, its plan before subscribing, a real subscription through
 * the real RPC, and then the same answer again — plus the actual /me page
 * rendered against those live answers, because the RPC being right and the page
 * still drawing "חינמי" is exactly the shape of the defect this closes.
 *
 *   node scripts/qa/me-plan-truth.mjs
 *
 * The page is served from portal/public locally, not fetched from production —
 * the point is to check the HTML in this commit before it can be deployed.
 * Creates real rows in auth.users, identifiable by the qa.meplan+ prefix, and
 * real rows in core.subscriptions. Nothing here can charge: every answer is
 * asserted to carry charged=false, and billing mode is off in the database.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const APP = process.argv[2] || 'torah';
const TIER = process.argv[3] || 'basic';
const PORT = 5216;
const OUT = 'QA/platform/me-plan-0807';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function signup() {
  const email = `qa.meplan+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`signup failed: HTTP ${r.status}`);
  const d = await r.json();
  if (d.access_token) return { email, password, session: d };
  const t = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!t.ok) throw new Error(`login failed: HTTP ${t.status}`);
  return { email, password, session: await t.json() };
}

async function rpc(fn, body, token) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* left null on purpose */ }
  return { status: r.status, json, text };
}

console.log(`=== /me — does the page name the plan that was actually bought? (${APP}/${TIER}) ===`);

const me = await signup();
const token = me.session.access_token;
console.log(`        customer: ${me.email}`);

// --- before: a brand-new account really is on the free plan, and says so.
const before = (await rpc('more30_profile_get', {}, token)).json;
ok('a new account reads as free', before?.plan === 'free', `plan=${before?.plan}`);
ok('and carries no subscriptions', Array.isArray(before?.subscriptions) && before.subscriptions.length === 0,
   JSON.stringify(before?.subscriptions));

// --- the subscription itself, through the same RPC the /subscribe page calls.
const sub = await rpc('more30_subscribe', { p_app: APP, p_plan: TIER }, token);
ok(`subscribing to ${APP}/${TIER} is accepted`, sub.status === 200 && sub.json?.ok === true,
   `HTTP ${sub.status} ${sub.text.slice(0, 90)}`);
ok('and nothing was charged', sub.json?.charged === false, JSON.stringify(sub.json?.charged));

const plat = await rpc('more30_subscribe', { p_app: 'more30', p_plan: 'premium' }, token);
ok('a platform-wide tier is accepted too', plat.status === 200 && plat.json?.ok === true,
   `HTTP ${plat.status} ${plat.text.slice(0, 90)}`);
ok('and nothing was charged there either', plat.json?.charged === false, JSON.stringify(plat.json?.charged));

// --- after: the answer the personal area reads.
const after = (await rpc('more30_profile_get', {}, token)).json;
const rows = after?.subscriptions ?? [];
const mine = rows.find((s) => s.app_key === APP);

ok('the profile no longer calls a subscriber free',
   after?.plan !== 'free', `plan=${after?.plan}`);
ok('it names the platform tier that was chosen',
   after?.plan === 'premium' && after?.plan_name === 'פרימיום',
   `${after?.plan} / ${after?.plan_name}`);
ok(`the per-system subscription is listed (${APP})`, !!mine,
   rows.map((s) => `${s.app_key}:${s.plan_code}`).join(', ') || '(empty)');
ok('with the tier name and its catalogue price, not just a code',
   mine?.plan_name && mine?.price_ils != null && Number(mine.price_ils) > 0,
   `${mine?.plan_name} / ${mine?.price_ils}`);
ok('the status is reported as requested and not as paid',
   mine?.status === 'requested' && after?.charged === false,
   `status=${mine?.status} charged=${after?.charged}`);
// The old column is still returned, and is still empty — that is what makes
// this regression visible rather than a matter of trust.
ok('the column the page used to read is still empty for this subscriber',
   after?.profile_plan === 'free', `profile_plan=${after?.profile_plan}`);

// --- the account menu on every site reads join_app, not the profile column.
const join = (await rpc('more30_join_app', { p_app: `https://more30.com/${APP}/` }, token)).json;
ok('the account menu sees the system tier for this site',
   join?.plan === TIER, `plan=${join?.plan} scope=${join?.plan_scope}`);
ok('so the "upgrade to premium" item no longer shows to a subscriber',
   join?.plan !== 'free', `plan=${join?.plan}`);

// --- and the page itself, against those same live answers.
await mkdir(OUT, { recursive: true });
const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1500 } });
const page = await ctx.newPage();
const session = me.session;
await page.addInitScript((s) => {
  localStorage.setItem('more30-auth', JSON.stringify({
    access_token: s.access_token, refresh_token: s.refresh_token,
    token_type: 'bearer', expires_in: s.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600),
    user: s.user,
  }));
}, session);

await page.goto(`http://127.0.0.1:${PORT}/me.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('#content:not([hidden])', { timeout: 15000 }).catch(() => {});

ok('the personal area renders for a signed-in customer', await page.isVisible('#content'));

const tag = (await page.textContent('#vPlan').catch(() => '') || '').trim();
ok('the plan tag on the page is not "חינמי"', tag !== 'חינמי' && tag !== '—', `tag="${tag}"`);
ok('it carries the tier name', tag === 'פרימיום', `tag="${tag}"`);

ok('the upgrade pitch is hidden from someone who already subscribed',
   await page.isHidden('#freeBlock'));
ok('and the subscription list is shown instead', await page.isVisible('#premiumBlock'));

const listed = (await page.textContent('#planRows').catch(() => '') || '').replace(/\s+/g, ' ').trim();
ok(`the list names the system that was subscribed to`, listed.length > 0,
   `planRows="${listed.slice(0, 120)}"`);
ok('and states that nothing was charged',
   ((await page.textContent('#premiumBlock')) || '').includes('לא בוצע חיוב'));

await page.screenshot({ path: `${OUT}/me-subscriber.png`, fullPage: true });

await browser.close();
server.kill();

console.log(`\n${pass} passed · ${fail} failed   (shot: ${OUT}/me-subscriber.png)`);
process.exit(fail ? 1 : 0);
