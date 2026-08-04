/**
 * The queue's safety properties, asserted rather than trusted.
 *
 * BKALOT_AUTOMATION_BUILD is explicit: build it, but do not send anything real
 * and do not charge anyone without approval. "Safe mode" written as a comment
 * is worth nothing — these are the four things that actually have to be true,
 * and they are enforced in the database so no screen can forget them:
 *
 *   1. live mode is refused outright
 *   2. a recipient without consent never enters the queue
 *   3. in test mode, only pre-approved test targets can be sent to; anyone
 *      else is recorded as `blocked` so the attempt is visible
 *   4. nothing anonymous can touch any of it
 *
 * Run against production. Read-only except through the guarded RPCs.
 *
 *   node scripts/qa/bkalot-queue-safety.mjs
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
  return { status: r.status, body: await r.text() };
}

console.log('=== bkalot automation queue — safety ===');

// Every entry point must be closed to a stranger. If any of these opens, the
// consent and test-target checks behind them stop meaning anything.
for (const [fn, body] of [
  ['queue_enqueue', { p_app: 'bkalot', p_contact: 1, p_topic: 1, p_channel: 'email' }],
  ['queue_due', { p_limit: 5 }],
  ['queue_mark', { p_id: 1, p_outcome: 'sent' }],
  // The public wrappers are the ones a browser can actually reach, so they
  // matter more than the schema-local names above.
  ['more30_auto_overview', { p_app: 'bkalot' }],
  ['more30_auto_build', { p_topic: 1 }],
  ['more30_auto_enqueue', { p_app: 'bkalot', p_contact: 1, p_topic: 1, p_channel: 'email' }],
  ['more30_auto_dryrun', { p_limit: 5 }],
]) {
  const r = await rpc(fn, body);
  ok(`anon cannot call ${fn}`, r.status >= 400, `HTTP ${r.status}`);
}

// The schema itself must not be readable over PostgREST either.
const direct = await fetch(`${URL_}/rest/v1/outbound_queue?select=id`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
});
ok('queue table not exposed to anon', direct.status >= 400, `HTTP ${direct.status}`);

console.log(`\n${pass} passed · ${fail} failed`);
console.log(
  '\nThe consent / test-target / live-mode gates are enforced inside\n' +
    'bkalot_auto.queue_enqueue and verified against the database directly —\n' +
    'they cannot be exercised from here precisely because anon is locked out.',
);
process.exit(fail ? 1 : 0);
