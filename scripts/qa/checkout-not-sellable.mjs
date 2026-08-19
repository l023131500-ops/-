/**
 * The fifth reader: a system hidden from the home page must not still carry a
 * price in the checkout decision.
 *
 * Migration 0033 put §4's question in one place — core.app_offer_block() — and
 * taught it to more30_plans, more30_system_page and more30_subscribe.
 * `scripts/qa/hidden-not-sellable.mjs` measures exactly those three. It does not
 * ask more30_checkout, and that is the one that was still answering: on
 * 07/08/2026 all eleven blocked systems came back with a price — mechiron with
 * its own 2 ₪ / 5 ₪, the other ten with the platform's 10 ₪ under their own
 * app_key, through the same fallback 0033 removed from the readers beside it.
 *
 * Migration 0034 gives checkout the same block. This measures it where the
 * customer's browser measures it: the live REST API, with a real signed-in
 * account, because more30_checkout refuses an anonymous caller outright and a
 * 401 would prove nothing about the branch under test.
 *
 *   node scripts/qa/checkout-not-sellable.mjs
 *
 * Creates one real account (qa.checkout-block+ prefix) and writes no row:
 * more30_checkout returns an instruction and never inserts. Nothing here can
 * charge — billing mode is off in the database, and every answer is asserted
 * charged=false regardless.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';
const OUT = 'QA/platform/checkout-offer-block-0807';

// core.projects as measured on 07/08/2026, and the plan code each one answered
// with before 0034. Kept explicit rather than read back from the database the
// fix lives in — a fixture that derives itself from the thing under test cannot
// fail. `premium` is the platform tier the ten plan-less systems fell back to.
const BLOCKED = [
  ['mechiron', 'basic', 'not_offered', 'hidden by 0032; answered with its own 2 ₪'],
  ['mechiron', 'extended', 'not_offered', 'hidden by 0032; answered with its own 5 ₪'],
  ['crm', 'premium', 'not_offered', 'live, hidden; fell back to the platform 10 ₪'],
  ['gesher', 'premium', 'not_offered', 'live, hidden; fell back to the platform 10 ₪'],
  ['mthbram', 'premium', 'not_offered', 'live, hidden; fell back to the platform 10 ₪'],
  ['smachot', 'premium', 'not_offered', 'live, hidden; fell back to the platform 10 ₪'],
  ['zol', 'premium', 'not_live', 'not live; fell back to the platform 10 ₪'],
  ['events', 'premium', 'not_live', 'not live; fell back to the platform 10 ₪'],
  ['financial', 'premium', 'not_live', 'not live; fell back to the platform 10 ₪'],
  ['igud', 'premium', 'not_live', 'not live; fell back to the platform 10 ₪'],
  ['shiurim', 'premium', 'not_live', 'not live; fell back to the platform 10 ₪'],
  ['bkalot-studio', 'premium', 'not_live', 'not live; fell back to the platform 10 ₪'],
];

// The controls. A block that also silences what is on offer is not a fix, and
// the prices are asserted by value so a guard that empties the catalogue fails
// here rather than passing quietly.
const OFFERED = [
  ['torah', 'basic', 2],
  ['kupot', 'extended', 5],
  ['kiosk', 'premium', 10],
  ['nadlan', 'premium', 12],
  ['nadlan', 'vip', 15],
  ['more30', 'premium', 10],
];

let pass = 0, fail = 0;
const results = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
  results.push({ name, pass: !!cond, detail: detail ?? null });
};

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

async function signup() {
  const email = `qa.checkout-block+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`signup failed: HTTP ${r.status}`);
  const d = await r.json();
  if (d.access_token) return { email, session: d };
  const t = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!t.ok) throw new Error(`login failed: HTTP ${t.status}`);
  return { email, session: await t.json() };
}

const main = async () => {
  const { email, session } = await signup();
  const token = session.access_token;
  console.log(`\naccount: ${email}`);

  console.log('\n— blocked systems: the checkout must not price them —\n');

  const answers = [];
  for (const [app, plan, expected, why] of BLOCKED) {
    const { status, json, text } = await rpc('more30_checkout', { p_app: app, p_plan: plan }, token);
    answers.push({ app, plan, expected, status, json });

    ok(`checkout(${app}, ${plan}) answers, and answers "nothing to charge" — ${why}`,
      status === 200 && json?.action === 'none',
      `HTTP ${status} action=${json?.action} ${text.slice(0, 140)}`);
    ok(`checkout(${app}, ${plan}) names the block, not a billing state`,
      json?.reason === expected,
      `reason=${json?.reason} (expected ${expected})`);
    // The point of the whole step: no price on a product that is not offered.
    ok(`checkout(${app}, ${plan}) returns no price at all`,
      json != null && !('price_ils' in json),
      `price_ils=${JSON.stringify(json?.price_ils)}`);
    ok(`checkout(${app}, ${plan}) explains itself in the language the customer reads`,
      typeof json?.message === 'string' && /אינה מוצעת|אינה פעילה/.test(json.message),
      JSON.stringify(json?.message));
    // The fallback is the trap: before 0034 a plan-less hidden app quietly
    // became a platform answer, priced 10 ₪, under the hidden app's name.
    ok(`checkout(${app}, ${plan}) did not fall back to the platform`,
      json?.app_key === app,
      `app_key=${json?.app_key}`);
    ok(`checkout(${app}, ${plan}) charged nothing`, json?.charged === false,
      `charged=${json?.charged}`);
  }

  console.log('\n— offered systems: the decision they had is the decision they keep —\n');

  for (const [app, plan, price] of OFFERED) {
    const { status, json, text } = await rpc('more30_checkout', { p_app: app, p_plan: plan }, token);
    answers.push({ app, plan, expected: 'billing_off', status, json });
    ok(`checkout(${app}, ${plan}) still decides on the price ${price} ₪`,
      status === 200 && json?.reason === 'billing_off' && Number(json?.price_ils) === price,
      `HTTP ${status} reason=${json?.reason} price=${json?.price_ils} ${text.slice(0, 120)}`);
    ok(`checkout(${app}, ${plan}) charged nothing`, json?.charged === false,
      `charged=${json?.charged}`);
  }

  // A tier the customer was never offered stays unreachable — 0016/0019 made
  // more30_checkout filter customer_visible, and 0034 must not have unpicked it.
  const hiddenTier = await rpc('more30_checkout', { p_app: 'more30', p_plan: 'pro' }, token);
  ok('the hidden 1 ₪ test tier is still refused', hiddenTier.status >= 400,
    `HTTP ${hiddenTier.status} ${hiddenTier.text.slice(0, 120)}`);

  // And an anonymous caller still gets nowhere near any of it.
  const stranger = await rpc('more30_checkout', { p_app: 'more30', p_plan: 'premium' });
  ok('a stranger cannot reach the checkout decision', stranger.status >= 400,
    `HTTP ${stranger.status} ${stranger.text.slice(0, 120)}`);

  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/_results.json`, JSON.stringify({
    measured_at: new Date().toISOString(),
    supabase: SUPABASE,
    migration: '0034',
    qa_account: email,
    rows_written: 0,
    pass, fail, results, answers,
  }, null, 2), 'utf8');

  console.log(`\n${pass} passed / ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
};

main().catch((e) => { console.error(e); process.exit(1); });
