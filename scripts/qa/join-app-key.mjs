/**
 * When a customer signs in, does the platform actually record them as a member
 * of the system they were standing in?
 *
 * more30-priority.md §1 is the whole reason this matters: "מי שנכנס/נרשם/מתחבר
 * נכנס לתוך המוצר עצמו כלקוח מלא". `more30_join_app` is the write that turns
 * "I signed in" into "I am a customer of this system", and it takes a single
 * text argument that two different live callers build in two different shapes:
 *
 *   portal/public/auth-button.js  →  more30_join_app({ p_app: location.href })
 *        i.e. an absolute URL:  https://more30.com/bkalot/
 *
 *   portal/public/auth/callback.html →
 *        more30_join_app({ p_app: returnTo() || document.referrer || 'more30' })
 *        i.e. a bare path (/bkalot), a full referrer, or the bare literal
 *        'more30' when neither is available.
 *
 * customer-login-flow.mjs measures the half before the sign-in — that the pill
 * carries a `from` back into the system. This measures the half after it, which
 * nothing did: given each shape a live caller really passes, does the server
 * resolve it to a real app key and write a membership row?
 *
 * It signs up a throwaway account against production Supabase Auth and calls
 * the RPC with that account's own JWT, because the failure mode being hunted
 * is invisible to an anonymous probe: `more30_join_app` returns HTTP 200 with
 * {"ok":false,"reason":"unknown_app"} on an unrecognised key, and callback.html
 * wraps the call in a try/catch that discards the result. A caller that never
 * joins anything looks exactly like a caller that joined successfully.
 *
 * Test mode: one fixed throwaway account under @qa.more30.test, reused across
 * runs (a fresh signup per run would leak an auth user every time this is run,
 * and nothing here can delete them). It joins only — no charge, no message.
 *
 *   node scripts/qa/join-app-key.mjs
 */
const URL_ = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

/**
 * Every value a live caller really passes, with the app key it has to resolve
 * to. Nothing invented: each row names the file and the expression it comes
 * from, so a future change to either caller can be checked against this list.
 */
const CASES = [
  // auth-button.js — location.href on each mount the pill is served from.
  ['https://more30.com/bkalot/', 'bkalot', 'auth-button.js · location.href'],
  ['https://more30.com/kiosk/', 'kiosk', 'auth-button.js · location.href'],
  ['https://more30.com/mthbram/lessons', 'mthbram', 'auth-button.js · deep link'],
  ['https://more30.com/nadlan/#/report', 'nadlan', 'auth-button.js · hash router'],
  ['https://more30.com/', 'more30', 'auth-button.js · portal home'],

  // callback.html — returnTo(), which /login stores as a path, not a URL.
  ['/bkalot', 'bkalot', 'callback.html · returnTo()'],
  ['/chizukim', 'chizukim', 'callback.html · returnTo()'],
  ['/zchuyot?x=1', 'zchuyot', 'callback.html · returnTo() with query'],

  // callback.html — document.referrer, when no `from` was carried.
  ['https://more30.com/login', 'more30', 'callback.html · document.referrer'],

  // callback.html — the hard-coded last resort. This is the one that fired for
  // every Google sign-in started at /login without a `from`: a 302 from the
  // auth provider sets no referrer, so both earlier terms are empty strings.
  ['more30', 'more30', 'callback.html · literal fallback'],
];

// ── a throwaway customer, on production auth for real ───────────────────────
// The credentials are in the source on purpose and this account is to be
// treated as exposed: it holds nothing, and a QA account whose password lives
// somewhere else is a QA account nobody can re-run.
const email = 'qa.join.probe@qa.more30.test';
const password = 'qa-join-probe-Aa1!';

async function auth(path, body) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

console.log('=== membership is recorded for the system the customer came from ===');
console.log(`    test account: ${email}`);

// Sign in if the account is already there, sign up the first time. Both arms
// exercise the same §8ב promise — a customer reaches a session in one step.
let res = await auth('token?grant_type=password', { email, password });
let how = 'sign-in';
if (!res.body?.access_token) {
  res = await auth('signup', { email, password });
  how = 'first sign-up';
}
const token = res.body?.access_token;
ok(`a customer reaches a session immediately (${how})`, !!token,
   token ? '' : `${res.status} ${JSON.stringify(res.body).slice(0, 140)}`);

if (!token) {
  console.log(`\n${pass} passed · ${fail} failed`);
  process.exit(1);
}

async function joinApp(app) {
  const r = await fetch(`${URL_}/rest/v1/rpc/more30_join_app`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_app: app }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

for (const [input, expected, origin] of CASES) {
  const { status, body } = await joinApp(input);
  // ok:false is the failure being hunted, and it arrives as HTTP 200.
  const joined = status === 200 && body?.ok === true && body?.app_key === expected;
  ok(
    `${origin.padEnd(38)} ${JSON.stringify(input)} → ${expected}`,
    joined,
    joined ? '' : `${status} ${JSON.stringify(body)}`,
  );
}

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
