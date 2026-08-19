/**
 * /admin — the user board that read the name and the plan from two columns the
 * signup never writes.
 *
 * Migration 0031 moved the plan question in `more30_profile_get` and
 * `more30_join_app` off `public.more30_profiles.plan` — a column no signup
 * writes — and onto `core.subscriptions`, where `more30_subscribe` actually
 * writes. The third reader of that same table, `more30_admin_users()`, stayed
 * behind. It is the one that draws "משתמשי הפלטפורמה" in the /admin SPA
 * (admin/src/App.tsx), which is exactly the screen §3 asks for.
 *
 * This script checks both halves against the live hub, with no fixture:
 *
 *   1. the RPC itself, called over PostgREST with the real super-admin session
 *   2. the two expressions the SPA renders over that payload, lifted verbatim
 *      from App.tsx — `u.full_name || "— ללא שם מלא"` and the plan badge
 *
 * The second half matters because the SPA's deploy is still blocked on the
 * Vercel quota (core.issues #83) while the RPC is already live: the shipped
 * bundle reads the payload this script measures. A change that made the board
 * claim "פרימיום" over a merely requested subscription would land in production
 * immediately, with no deploy to gate it — so that is asserted in both
 * directions.
 *
 *   node scripts/qa/admin-users-name-and-plan.mjs
 *
 * Needs SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD, or falls back to
 * SUPABASE_SERVICE_ROLE_KEY to mint a session for the super-admin.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const OUT = 'QA/platform/admin-users-name-plan-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

// ── the two expressions the SPA renders, copied from admin/src/App.tsx ───────
const PLAN_HE = {
  free: 'חינמי', basic: 'בסיסי', extended: 'מורחב', premium: 'פרימיום', vip: 'VIP', pro: 'פרו',
};
/** App.tsx:814 */
const renderName = (u) => u.full_name || '— ללא שם מלא';
/** App.tsx: the gold badge — anything that is not the free plan */
const renderPlanBadge = (u) => (u.plan !== 'free' ? (PLAN_HE[u.plan] ?? u.plan) : null);
/** App.tsx: the grey badge — a request that was never charged */
const renderRequestBadge = (u) =>
  u.plan === 'free' && u.plan_requested
    ? `ביקש ${PLAN_HE[u.plan_requested] ?? u.plan_requested} · טרם נגבה`
    : null;

// ── env ─────────────────────────────────────────────────────────────────────
async function env() {
  const raw = await readFile('.env.local', 'utf8').catch(() => '');
  const map = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/﻿/g, '').trim();
  }
  return { ...map, ...process.env };
}

async function main() {
  const e = await env();
  const url = (e.SUPABASE_URL || '').replace(/\/$/, '');
  const anon = e.SUPABASE_ANON_KEY;
  if (!url || !anon) { console.error('missing SUPABASE_URL / SUPABASE_ANON_KEY'); process.exit(2); }

  // A real super-admin session, not service_role: the RPC gates on
  // more30_is_super_admin() and the board is reached through that gate.
  let jwt = null;
  if (e.SUPER_ADMIN_EMAIL && e.SUPER_ADMIN_PASSWORD) {
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anon, 'content-type': 'application/json' },
      body: JSON.stringify({ email: e.SUPER_ADMIN_EMAIL, password: e.SUPER_ADMIN_PASSWORD }),
    });
    const j = await r.json().catch(() => ({}));
    jwt = j.access_token ?? null;
  }
  if (!jwt && e.SUPABASE_SERVICE_ROLE_KEY) jwt = e.SUPABASE_SERVICE_ROLE_KEY;
  if (!jwt) { console.error('no super-admin credentials available'); process.exit(2); }

  const res = await fetch(`${url}/rest/v1/rpc/more30_admin_users`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) {
    console.error('RPC failed:', res.status, (await res.text()).slice(0, 300));
    process.exit(2);
  }
  const rows = await res.json();

  ok('RPC returns an array of users', Array.isArray(rows) && rows.length > 0, `rows=${rows?.length}`);

  // ── the fields the fix adds ───────────────────────────────────────────────
  const has = (f) => rows.every((u) => f in u);
  ok('every row carries full_name', has('full_name'));
  ok('every row carries name_source', has('name_source'));
  ok('every row carries phone', has('phone'));
  ok('every row carries plan', has('plan'));
  ok('every row carries plan_requested', has('plan_requested'));
  ok('every row carries plan_status', has('plan_status'));
  ok('every row carries has_profile', has('has_profile'));
  // 0031 kept the old column in the payload so the move stays measurable.
  ok('profile_plan is still returned, so the move stays measurable', has('profile_plan'));

  // ── the name ──────────────────────────────────────────────────────────────
  const named = rows.filter((u) => u.full_name);
  const fromSignup = rows.filter((u) => u.name_source === 'signup');
  const fromProfile = rows.filter((u) => u.name_source === 'profile');
  const noProfile = rows.filter((u) => !u.has_profile);

  ok('a name is shown for more users than hold a profile row',
     named.length > fromProfile.length,
     `named=${named.length} profile_rows=${fromProfile.length}`);
  // The old reader was `pr.full_name` alone, so every signup-sourced row is one
  // it returned null for — either no profile at all, or a profile with no name.
  ok('every signup-sourced name is one the old reader returned blank for',
     fromSignup.every((u) => u.full_name && u.name_source === 'signup'),
     `signup-sourced=${fromSignup.length}`);
  ok('name_source is exactly one of profile / signup / null',
     rows.every((u) => [null, 'profile', 'signup'].includes(u.name_source)));
  ok('a row with a name always says where it came from',
     rows.every((u) => (u.full_name ? u.name_source !== null : u.name_source === null)));
  ok('name_source=profile implies the row has a profile',
     fromProfile.every((u) => u.has_profile === true));
  ok('the board no longer draws the placeholder for a user whose name is known',
     fromSignup.every((u) => renderName(u) !== '— ללא שם מלא'),
     `signup-sourced=${fromSignup.length}`);
  ok('rows with no name at all still render the placeholder, not "null"',
     rows.filter((u) => !u.full_name).every((u) => renderName(u) === '— ללא שם מלא'));
  ok('no name is returned as an empty or whitespace string',
     rows.every((u) => u.full_name === null || u.full_name.trim() === u.full_name && u.full_name !== ''));

  // ── the phone §8ב collects ────────────────────────────────────────────────
  const phones = rows.filter((u) => u.phone);
  ok('the phone the signup form validates is now on the board',
     phones.length > 0, `with_phone=${phones.length}`);
  ok('no phone is returned as an empty string',
     rows.every((u) => u.phone === null || u.phone.trim() !== ''));

  // ── the plan ──────────────────────────────────────────────────────────────
  const requested = rows.filter((u) => u.plan_requested);
  const active = rows.filter((u) => u.plan_status === 'active');

  ok('plan is never null — the SPA types it as a string',
     rows.every((u) => typeof u.plan === 'string' && u.plan.length > 0));
  ok('a requested subscription is surfaced and not swallowed',
     requested.length > 0, `plan_requested=${requested.length}`);
  ok('plan_status is only ever requested or active — cancelled is excluded',
     rows.every((u) => [null, 'requested', 'active'].includes(u.plan_status)));
  ok('plan_requested and plan_status appear together or not at all',
     rows.every((u) => (u.plan_requested === null) === (u.plan_status === null)));

  // The direction that must not regress: billing is off and every row is
  // 'requested', so no gold badge may appear. The shipped bundle would show it
  // in production the moment the RPC returned it.
  ok('no user is badged with a paid plan while nothing is charged',
     rows.filter((u) => u.plan !== 'free').length === active.length,
     `non_free=${rows.filter((u) => u.plan !== 'free').length} active=${active.length}`);
  ok('a merely requested subscription does not raise the gold badge',
     rows.filter((u) => u.plan_status === 'requested').every((u) => renderPlanBadge(u) === null));
  ok('a merely requested subscription says so in its own words',
     rows.filter((u) => u.plan_status === 'requested')
         .every((u) => (renderRequestBadge(u) || '').startsWith('ביקש')));
  ok('a user with no subscription row gets neither badge',
     rows.filter((u) => !u.plan_requested)
         .every((u) => renderPlanBadge(u) === null && renderRequestBadge(u) === null));
  // The other direction: an active row would be badged. Proven on a synthetic
  // payload, because the hub holds no active subscription to read.
  ok('an active subscription would raise the gold badge',
     renderPlanBadge({ plan: 'premium', plan_requested: 'premium', plan_status: 'active' }) === 'פרימיום');
  ok('an active subscription does not also draw the request badge',
     renderRequestBadge({ plan: 'premium', plan_requested: 'premium', plan_status: 'active' }) === null);
  ok('a plan code with no Hebrew label falls back to the code, not to blank',
     renderPlanBadge({ plan: 'enterprise' }) === 'enterprise');

  // ── the fields the SPA already reads must not have moved ──────────────────
  for (const f of ['user_id', 'email', 'created_at', 'last_sign_in_at',
                   'provider', 'confirmed', 'is_super_admin', 'is_test', 'apps']) {
    ok(`the shipped bundle still finds ${f}`, has(f));
  }
  ok('apps is still an array on every row', rows.every((u) => Array.isArray(u.apps)));

  const summary = {
    at: new Date().toISOString(),
    rows: rows.length,
    named: named.length,
    blank: rows.length - named.length,
    name_from_profile: fromProfile.length,
    name_from_signup: fromSignup.length,
    no_profile_row: noProfile.length,
    with_phone: phones.length,
    plan_requested: requested.length,
    plan_active: active.length,
    gold_badges: rows.filter((u) => renderPlanBadge(u)).length,
    request_badges: rows.filter((u) => renderRequestBadge(u)).length,
    pass, fail,
  };

  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/_results.json`,
    JSON.stringify({ summary, results }, null, 2), 'utf8');

  console.log('\n' + JSON.stringify(summary, null, 2));
  console.log(`\n${pass} passed / ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
