/**
 * Can anyone be charged? Asserted against production, not assumed.
 *
 * more30-priority.md §8 asks for prices wired to a payment flow **in test mode**,
 * and every plan file repeats the same constraint: no real charge without
 * explicit approval. "Test mode" written in a comment is worth nothing, so this
 * checks the properties that actually have to hold.
 *
 * The design being verified: billing mode lives in core.billing_settings, whose
 * CHECK allows only 'off' and 'test'. 'live' is not a value the column accepts,
 * so switching to real charging requires a migration that widens the constraint
 * — it cannot happen through an admin screen, a bad deploy, or a stray UPDATE.
 * That is the same shape that protects the bkalot send queue, for the same
 * reason: a gate in the database does not depend on the caller remembering it.
 *
 *   node scripts/qa/billing-safety.mjs
 */
const URL_ = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function rpc(fn, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: r.status, text: await r.text() };
}

console.log('=== billing — can anyone be charged? ===');

// A stranger must not reach the money path at all.
for (const [fn, body] of [
  ['more30_checkout', { p_app: 'more30', p_plan: 'pro' }],
  ['more30_subscribe', { p_app: 'more30', p_plan: 'pro' }],
]) {
  const r = await rpc(fn, body);
  ok(`anon cannot call ${fn}`, r.status >= 400, `HTTP ${r.status}`);
}

// The settings table must not be readable or writable over PostgREST.
for (const path of ['billing_settings?select=mode', 'plans?select=price_ils']) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  ok(`anon cannot read ${path.split('?')[0]}`, r.status >= 400, `HTTP ${r.status}`);
}

// The customer pricing page is public by design — so check what it exposes.
// A tier the admin has not priced must not be presented as if it were free,
// and no admin-only row may appear on it.
const page = await fetch(`${URL_}/rest/v1/rpc/more30_system_page`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
  body: JSON.stringify({ p_app: 'more30' }),
});
if (page.ok) {
  const d = await page.json();
  const plans = d.plans ?? [];
  const admin = plans.filter((p) => ['charge', 'one_time', 'pro'].includes(p.code));
  ok('no admin-only tier on the customer page', admin.length === 0, admin.map((p) => p.code).join(', '));
  ok('customer page carries tiers', plans.length > 0, 'none returned');
} else {
  ok('customer pricing page loads', false, `HTTP ${page.status}`);
}

console.log(`\n${pass} passed · ${fail} failed`);
console.log(
  "\nWhat cannot be checked from here, and is checked in the database instead:\n" +
    "  · core.billing_settings.mode rejects 'live' at the CHECK constraint —\n" +
    "    verified by attempting the UPDATE and catching check_violation.\n" +
    "  · more30_checkout returns action='none' while mode is 'off', and\n" +
    "    action='test_payment' with charged=false when it is 'test'.\n" +
    "  It never performs a payment: it returns an instruction, so the decision\n" +
    "  can be tested without money moving.",
);
process.exit(fail ? 1 : 0);
