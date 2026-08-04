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

// ── the one door that is open on purpose, and therefore the one worth testing
//
// more30_auto_intake IS anon-callable: the entry channels are a public form, a
// phone keypress and a donation webhook, and none of them carries a session.
// That makes it the only place where the gates can be exercised from exactly
// where a stranger stands — which is a better test than asserting a locked
// door, because a locked door proves nothing about what is behind it.
//
// Authorisation was separated from protection for this: queue_enqueue_internal
// holds all three gates and is revoked from anon, queue_enqueue keeps the admin
// check and delegates. If that refactor had dropped a gate, these five cases
// are what would catch it.
console.log('\n=== intake is open to anon by design — do the gates still hold? ===');

const intake = (o) =>
  rpc('more30_auto_intake', { p_app: 'bkalot', p_topic_no: 1, p_source: 'form', ...o }).then((r) => {
    try { return { status: r.status, json: JSON.parse(r.body) }; }
    catch { return { status: r.status, json: null }; }
  });

const cases = [
  ['consent is a precondition, not a checkbox we log',
   { p_name: 'א', p_email: 'x@y.com', p_phone: '0501234567', p_consent: false },
   (j) => j?.reason === 'no_consent'],

  ['contact details are validated for shape, not just presence',
   { p_name: 'ב', p_email: 'not-an-email', p_phone: '123', p_consent: true },
   (j) => j?.reason === 'no_valid_contact'],

  ['an unknown topic number is refused',
   { p_topic_no: 77, p_name: 'ג', p_email: 'c@d.com', p_phone: '0509999999', p_consent: true },
   (j) => j?.reason === 'no_such_topic'],

  ['a real-looking address is recorded as blocked, never queued',
   { p_name: 'ד', p_email: 'qa-probe-not-approved@example.com', p_phone: '0507654321', p_consent: true },
   (j) => JSON.stringify(j).includes('not_a_test_target') && j?.queued !== true],

  ['a forged source claim buys nothing — same gates apply',
   { p_source: 'nedarim', p_name: 'ה', p_email: 'qa-probe-not-approved@example.com', p_phone: '0507654321', p_consent: true },
   (j) => JSON.stringify(j).includes('not_a_test_target') && j?.queued !== true],
];

for (const [name, body, holds] of cases) {
  const r = await intake(body);
  ok(name, r.status === 200 && holds(r.json), `HTTP ${r.status} ${JSON.stringify(r.json)?.slice(0, 120)}`);
}

console.log(`\n${pass} passed · ${fail} failed`);
console.log(
  '\nlive mode cannot be reached from here at all: it is refused inside\n' +
    'queue_enqueue_internal, which anon cannot call and no HTTP surface exposes.\n' +
    'Turning it on is a deliberate migration, not a flag in this repo.',
);
process.exit(fail ? 1 : 0);
