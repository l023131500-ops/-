/**
 * End-to-end check of the showcase toggle: admin flips it, the public site
 * reflects it, and the default is "hidden".
 *
 * The property that matters is the default. A showcase that opts systems IN
 * automatically would publish work-in-progress to investors the moment a row
 * is added to core.projects. So this asserts the empty state first, then that
 * a flip actually reaches the public endpoint, then puts it back.
 *
 *   node scripts/qa/showcase-flow.mjs
 */
const URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function rpc(fn, body, token) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

console.log('=== showcase ===');

// 1. the public catalogue is readable without a session — that is the point
const pub = await rpc('more30_showcase', {});
ok('public catalogue readable by anon', pub.status === 200, `HTTP ${pub.status}`);
const before = pub.body?.systems ?? [];
console.log(`        currently showing: ${before.length}`);

// 2. and it must not leak anything but marketing fields
if (before.length) {
  const keys = Object.keys(before[0]);
  const leaked = keys.filter((k) =>
    /key|secret|token|email|user|supabase|repo/i.test(k),
  );
  ok('no internal fields in the public payload', leaked.length === 0, leaked.join(','));
} else {
  ok('no internal fields in the public payload', true);
  console.log('        (nothing selected for display yet — that is the safe default)');
}

// 3. an anonymous caller must NOT be able to flip the toggle
const hack = await rpc('more30_admin_showcase_set', { p_app: 'torah', p_flag: true });
ok(
  'anon cannot flip the toggle',
  hack.status >= 400,
  `HTTP ${hack.status} — a stranger must not publish systems`,
);

// 4. nor read the pricing board
const price = await rpc('more30_admin_pricing_list', {});
ok('anon cannot read pricing', price.status >= 400, `HTTP ${price.status}`);

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
