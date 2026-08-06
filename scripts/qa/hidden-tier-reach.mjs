/**
 * Can a signed-in customer subscribe to a tier no page ever offered them?
 *
 * more30-priority.md §8 keeps everything in test mode, and the catalogue carries
 * three rows per system that exist for us and not for the customer: 'pro'
 * (1 ₪, the priced test tier), 'charge' and 'one_time'. All three are
 * customer_visible=false, and billing-safety.mjs already asserts they never
 * appear on the public pricing page.
 *
 * Not appearing is not the same as not being reachable. `more30_subscribe` looks
 * a plan up by `app_key = <system> and code = p_plan and active` and falls back
 * to the platform's rows on the same terms — neither lookup reads
 * customer_visible. So the codes are guessable, and 'pro' comes back with
 * chargeable=true, the one flag /subscribe treats as permission to open a
 * payment path. Nothing charges (mode is off, no provider is connected, and
 * more30_checkout does filter customer_visible so it blocks the next hop), which
 * is why this is a reachability gap and not a money one — recorded as
 * core.issues #78 while migration 0016 closed the checkout half.
 *
 *   node scripts/qa/hidden-tier-reach.mjs
 *
 * Two things are asserted together, because either alone can be satisfied by
 * accident: the hidden codes are rejected, AND a tier the page really offers
 * still records normally. A function that rejected everything would pass the
 * first half and break the product.
 *
 * The mount list is parsed from the rewrite table, not typed here, for the
 * reason checkout-flow.mjs gives: a hardcoded list keeps passing after the next
 * system is added. Creates real rows in auth.users under the qa.hidden+ prefix.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

// The same three codes billing-safety.mjs keeps off the customer page. Kept in
// step with it deliberately: if a fourth admin-only tier is ever added, both
// files have to learn about it, and the page assertion below is what says so.
const ADMIN_ONLY = ['pro', 'charge', 'one_time'];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function signup() {
  const email = `qa.hidden+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`signup failed: HTTP ${r.status}`);
  const d = await r.json();
  if (d.access_token) return { email, token: d.access_token };
  const t = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!t.ok) throw new Error(`login failed: HTTP ${t.status}`);
  return { email, token: (await t.json()).access_token };
}

async function rpc(fn, body, token) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* left null on purpose */ }
  return { status: r.status, json, text };
}

const here = path.dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(readFileSync(path.resolve(here, '../../portal/vercel.dist.json'), 'utf8'));
const mounts = [...new Set(
  table.rewrites.map((r) => /^\/([a-z0-9-]+)\/:path\*$/.exec(r.source)?.[1]).filter(Boolean),
)].sort();

console.log(`=== hidden tiers — reachable by a signed-in customer? (${mounts.length} mounts) ===`);
const me = await signup();
console.log(`        customer: ${me.email}`);

const reached = [];   // hidden tier the customer got a subscription row for
const shown = [];     // hidden tier that turned up on a public page
let asked = 0, offered = 0;

for (const app of mounts) {
  const page = (await rpc('more30_system_page', { p_app: app })).json;
  const codes = (page?.plans ?? []).map((p) => p.code);

  // What makes a code "hidden" is that the customer is never shown it. If that
  // stops being true the rest of this file is asking the wrong question, so it
  // is checked rather than assumed.
  for (const c of ADMIN_ONLY) if (codes.includes(c)) shown.push(`${app}/${c}`);

  const got = [];
  for (const code of ADMIN_ONLY) {
    asked++;
    const s = await rpc('more30_subscribe', { p_app: app, p_plan: code }, me.token);
    if (s.status === 200 && s.json?.ok === true) {
      got.push(`${code}${s.json?.chargeable ? ' (chargeable!)' : ''} -> ${s.json?.app_key}/${s.json?.plan}`);
    }
  }
  if (got.length) reached.push({ app, got });

  // The positive control, per mount: whatever priced tier this page really
  // offers has to keep working. Systems with no priced tier just skip it.
  const real = (page?.plans ?? []).find((p) => p.price_ils != null && Number(p.price_ils) > 0);
  let control = 'no priced tier';
  if (real) {
    offered++;
    const s = await rpc('more30_subscribe', { p_app: app, p_plan: real.code }, me.token);
    control = s.json?.ok === true ? `${real.code} ok` : `${real.code} BROKEN HTTP ${s.status}`;
    if (s.json?.ok !== true) reached.push({ app, got: [`control ${control}`] });
  }

  console.log(
    `        ${app.padEnd(12)} ${got.length ? 'REACHED: ' + got.join(' | ') : 'all rejected'}` +
      `   · control: ${control}`,
  );
}

ok(`no admin-only tier is offered on any public page (${mounts.length} checked)`,
   shown.length === 0, shown.join(', '));
ok(`no admin-only tier can be subscribed to (${asked} asked)`,
   reached.filter((r) => !r.got[0].startsWith('control')).length === 0,
   reached.map((r) => `${r.app}: ${r.got.join(', ')}`).join(' ; '));
ok(`every real priced tier still records (${offered} mounts)`,
   reached.filter((r) => r.got[0].startsWith('control')).length === 0,
   reached.filter((r) => r.got[0].startsWith('control')).map((r) => r.app).join(', '));

// more30_checkout has filtered customer_visible since migration 0016. Asking it
// the same question keeps the two functions honest about each other: the defect
// being fixed is exactly the two of them disagreeing on which plans exist.
const co = await rpc('more30_checkout', { p_app: 'more30', p_plan: 'pro' }, me.token);
ok('checkout still rejects the hidden tier', co.status >= 400, `HTTP ${co.status} ${co.text.slice(0, 80)}`);

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
