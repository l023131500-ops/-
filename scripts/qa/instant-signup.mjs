/**
 * §8ב — "הרשמה מיידית: שם · טלפון · מייל · סיסמה → מיד נכנס לתוך המוצר".
 *
 * join-app-key.mjs measured the membership write. This measures the four fields
 * that come before it: does the one form the customer fills actually reach the
 * profile, or does the customer get asked for the same details a second time on
 * the very next screen?
 *
 * The chain the live pages run, in order:
 *
 *   portal/public/login.html      sb.auth.signUp({ email, password,
 *                                   options: { data: { full_name, phone } } })
 *   portal/public/auth/callback.html
 *                                 more30_profile_get()            -> is it empty?
 *                                 more30_profile_set_contact(name, phone)
 *                                 -> and only if that write fails does the
 *                                    onboarding form appear and ask again.
 *
 * So the promise holds only if all three of these are true, and each is checked
 * here against production:
 *   1. signUp returns a session in one step (no e-mail confirmation wall),
 *   2. full_name AND phone survive into user_metadata, which is the only place
 *      callback.html can read them from,
 *   3. more30_profile_set_contact persists both, so more30_profile_get on the
 *      next screen answers with a name and the onboarding form stays hidden.
 *
 * Test mode: one fixed throwaway account under @qa.more30.test, reused across
 * runs — a fresh signup per run would leak an auth user every time, and nothing
 * here can delete them. No charge, no message, no real customer touched.
 *
 *   node scripts/qa/instant-signup.mjs
 */
const URL_ = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

// The credentials are in the source on purpose and this account is to be
// treated as exposed: it holds nothing, and a QA account whose password lives
// somewhere else is a QA account nobody can re-run.
const email = 'qa.signup.probe@qa.more30.test';
const password = 'qa-signup-probe-Aa1!';
// The exact shapes login.html sends: a trimmed full name and phone stripped to
// digits (`$('phone').value.replace(/\D/g, '')`).
const FULL_NAME = 'בודק הרשמה';
const PHONE = '0501234567';

async function auth(path, body) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function rpc(name, args, token) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

console.log('=== §8ב · instant signup lands the customer inside the product ===');
console.log(`    test account: ${email}`);

// Same call login.html makes, metadata included. On a re-run the account is
// already there, so fall back to the password grant — the metadata written by
// the first run persists on the user and is still what callback.html reads.
let res = await auth('signup', {
  email,
  password,
  data: { full_name: FULL_NAME, phone: PHONE },
});
let how = 'first sign-up';
if (!res.body?.access_token) {
  res = await auth('token?grant_type=password', { email, password });
  how = 'sign-in (account already exists)';
}
const token = res.body?.access_token;

// 1. one step to a session. If the project ever turns e-mail confirmation on,
//    this is the check that fails, and login.html falls into its "we sent you a
//    confirmation mail" branch — which is exactly the "stays outside the
//    product" state §8ב rules out.
ok(`a session in one step (${how})`, !!token,
   token ? '' : `${res.status} ${JSON.stringify(res.body).slice(0, 160)}`);

if (!token) {
  console.log(`\n${pass} passed · ${fail} failed`);
  process.exit(1);
}

// 2. the two typed fields survive into user_metadata — the only place
//    callback.html can read them from (`session.user.user_metadata`).
const meta = res.body?.user?.user_metadata || {};
ok('full_name survives into user_metadata', meta.full_name === FULL_NAME,
   `got ${JSON.stringify(meta.full_name)}`);
ok('phone survives into user_metadata', String(meta.phone || '') === PHONE,
   `got ${JSON.stringify(meta.phone)}`);

// 3. the profile write callback.html performs on arrival, with the digits-only
//    shape login.html produces.
const set = await rpc('more30_profile_set_contact',
  { p_full_name: FULL_NAME, p_phone: PHONE.replace(/\D/g, '') }, token);
ok('more30_profile_set_contact accepts the signup form values',
   set.status === 200 && !!set.body?.full_name,
   `${set.status} ${JSON.stringify(set.body).slice(0, 160)}`);

// 4. and the screen after it sees a complete profile, so the onboarding form
//    stays hidden — no second ask for details already typed.
const got = await rpc('more30_profile_get', {}, token);
const p = got.body || {};
ok('profile has the full name → onboarding form stays hidden',
   got.status === 200 && p.full_name === FULL_NAME, `${got.status} ${JSON.stringify(p)}`);
ok('profile has the phone → it is not lost between the form and the product',
   String(p.phone || '') === PHONE, `got ${JSON.stringify(p.phone)}`);
ok('profile carries the e-mail the account was opened with', p.email === email,
   `got ${JSON.stringify(p.email)}`);

// 5. the free tier §8ב promises is what a brand-new account actually gets.
ok("a new account is on the free plan", p.plan === 'free', `got ${JSON.stringify(p.plan)}`);

// 6. the customer is a customer of the platform, not just an auth row.
const joined = await rpc('more30_join_app', { p_app: 'more30' }, token);
ok('the account is recorded as a member of the platform',
   joined.status === 200 && joined.body?.ok === true,
   `${joined.status} ${JSON.stringify(joined.body)}`);

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
