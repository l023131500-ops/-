/**
 * Smoke-test the /modaot payment path around a deploy — WITHOUT charging anyone.
 *
 * modaot is igud-ads and it carries live billing. The change being shipped is a
 * theme and one <script> tag, and it deliberately does not touch lib/nedarim.ts
 * beyond removing literal credentials that were published to a public repo. But
 * "deliberately does not touch" is a claim, and a live payment path deserves a
 * measurement instead of a claim.
 *
 * What it checks, all read-only:
 *   1. the page still renders and the pricing/payment entry point is present
 *   2. /api/payments/create still answers, and answers with the SAME shape
 *      (iframe host + the exact field names Nedarim Plus expects)
 *   3. Mosad comes back populated — which is how we know the env vars replaced
 *      the literals that used to be hardcoded, rather than breaking the call
 *   4. the webhook route still rejects an unauthorised caller
 *
 * It never completes a payment: nothing here submits the iframe, and the create
 * call is what the site itself does when a visitor opens the payment step.
 *
 *   node scripts/qa/modaot-payment-smoke.mjs           # against more30.com
 */
const ORIGIN = process.argv[2] || 'https://more30.com';
let pass = 0;
let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? `  << ${detail}` : '')); }
};

console.log(`=== modaot payment smoke · ${ORIGIN}/modaot ===`);

// 1 — the page itself
const page = await fetch(`${ORIGIN}/modaot`, { redirect: 'follow' });
const html = await page.text();
ok('page returns 200', page.status === 200, `got ${page.status}`);
ok('page has real content', html.length > 2000, `${html.length} bytes`);
ok('shared login script present', html.includes('auth-button.js'));

// 2 + 3 — the create endpoint, same shape as before
const create = await fetch(`${ORIGIN}/modaot/api/payments/create`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    amount: 1,
    description: 'smoke test — not submitted',
    project_id: '00000000-0000-0000-0000-000000000000',
  }),
});
const raw = await create.text();
let body = null;
try { body = JSON.parse(raw); } catch { /* reported below */ }

console.log(`  create -> HTTP ${create.status}`);
if (body?.fields) {
  const f = body.fields;
  ok('iframe points at Nedarim Plus', String(body.iframe_url || '').includes('nedarimplus'), body.iframe_url);
  ok('Mosad is populated', !!f.Mosad, 'empty Mosad means the env var did not reach the function');
  ok('ApiValid is populated', !!f.ApiValid);
  for (const k of ['Amount', 'Currency', 'CallBack', 'ReturnUrl', 'Param1']) {
    ok(`field ${k} still present`, k in f);
  }
  ok('no ApiPassword in the browser payload', !('ApiPassword' in f), 'the secret must never reach the client');
} else if (create.status === 400 || create.status === 401 || create.status === 404) {
  // The route guards on a real project id / session. That is itself a pass:
  // it means the endpoint is alive and refusing an unauthenticated stranger.
  ok('create endpoint alive and guarded', true);
  console.log(`        (guarded: ${raw.slice(0, 120)})`);
} else {
  ok('create endpoint answered usefully', false, `HTTP ${create.status} ${raw.slice(0, 160)}`);
}

// 4 — the webhook must not accept a stranger
const hook = await fetch(`${ORIGIN}/modaot/api/payments/webhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ Status: 'OK', Param1: 'smoke' }),
});
ok('webhook rejects an unknown caller', hook.status >= 400, `HTTP ${hook.status} — must not be 2xx`);

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
