/**
 * A system hidden from the home page must not still be for sale.
 *
 * more30-priority.md §4: "לא-עובדות → מוסתרות. עדכן core.projects.public_visible."
 * Migration 0032 did exactly that to #27 (mechiron) — the address serves a rights
 * landing page while the register sells price comparison — and the card came off
 * the home page. But `public_visible` was read by the home page and by nothing
 * else: `more30_plans`, `more30_system_page` and `more30_subscribe` all selected
 * on core.plans alone, so /subscribe?app=mechiron kept offering 2 ₪ / 5 ₪, and
 * the ten other hidden systems fell back to the platform's own plans under their
 * own name in the heading.
 *
 * Migration 0033 put the question in one place — core.app_offer_block() — and
 * gave all three readers the same answer. This measures it through the live REST
 * API with the anon key a visitor actually holds, and through a real signed-up
 * account for the write path, because a read-side fix that leaves the RPC
 * writable is not a fix.
 *
 *   node scripts/qa/hidden-not-sellable.mjs
 *
 * Creates one real account (qa.offer+ prefix). Nothing here can charge: billing
 * mode is off in the database and every success answer is asserted charged=false.
 * The one subscription row it writes is reported at the end for cleanup.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';
const OUT = 'QA/platform/hidden-not-sellable-0807';

// core.projects as measured on 07/08/2026. Kept explicit rather than read back
// from the same database the fix lives in — a fixture that derives itself from
// the thing under test cannot fail.
const HIDDEN = [
  ['mechiron', 'not_offered', 'live, hidden by 0032 — the only hidden system carrying plans of its own'],
  ['crm', 'not_offered', 'live, hidden'],
  ['gesher', 'not_offered', 'live, hidden'],
  ['mthbram', 'not_offered', 'live, hidden'],
  ['smachot', 'not_offered', 'live, hidden'],
  ['zol', 'not_live', 'not live'],
  ['events', 'not_live', 'not live'],
  ['financial', 'not_live', 'not live'],
  ['igud', 'not_live', 'not live'],
  ['shiurim', 'not_live', 'not live'],
  ['bkalot-studio', 'not_live', 'not live'],
];
const OFFERED = ['kupot', 'torah', 'nadlan', 'bkalot', 'kiosk'];

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
  const email = `qa.offer+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
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
  console.log('\n— read side: what a visitor is offered —\n');

  for (const [app, expected, why] of HIDDEN) {
    for (const fn of ['more30_plans', 'more30_system_page']) {
      const { json } = await rpc(fn, { p_app: app });
      const n = Array.isArray(json?.plans) ? json.plans.length : -1;
      ok(`${fn}(${app}) draws no plan — ${why}`, n === 0, `plans=${n}`);
      ok(`${fn}(${app}) says why, and says which why`,
        json?.offered === false && json?.offer_block === expected &&
        typeof json?.offer_note === 'string' && json.offer_note.length > 10,
        `offered=${json?.offered} block=${json?.offer_block} note=${JSON.stringify(json?.offer_note)}`);
      // A blocked system must not carry a plans_from either — "מהפלטפורמה"
      // next to an empty list is the same claim the fallback used to make.
      ok(`${fn}(${app}) names no source for plans it did not draw`,
        json?.plans_from === null, `plans_from=${JSON.stringify(json?.plans_from)}`);
    }
  }

  // Hiding the price is not hiding the system: the rest of the page still loads.
  const page = (await rpc('more30_system_page', { p_app: 'mechiron' })).json;
  ok('more30_system_page(mechiron) still returns the system itself',
    page?.found === true && typeof page?.name_he === 'string' && page.name_he.length > 0,
    `found=${page?.found} name_he=${JSON.stringify(page?.name_he)}`);

  console.log('\n— read side: what is still on sale —\n');

  for (const app of OFFERED) {
    for (const fn of ['more30_plans', 'more30_system_page']) {
      const { json } = await rpc(fn, { p_app: app });
      const n = Array.isArray(json?.plans) ? json.plans.length : -1;
      ok(`${fn}(${app}) still draws its plans`, n > 0 && json?.offered === true,
        `plans=${n} offered=${json?.offered}`);
    }
  }

  // The default on p_app is what every "plans of the platform" call relies on;
  // create or replace refuses to drop it silently, and this proves it survived.
  const bare = (await rpc('more30_plans', {})).json;
  ok('more30_plans() with no argument is still the platform',
    bare?.app_key === 'more30' && (bare?.plans?.length ?? 0) > 0,
    `app_key=${bare?.app_key} plans=${bare?.plans?.length}`);

  console.log('\n— write side: the RPC itself, not the button —\n');

  const { email, session } = await signup();
  const token = session.access_token;
  console.log(`  account: ${email}`);

  const blocked = await rpc('more30_subscribe', { p_app: 'mechiron', p_plan: 'basic' }, token);
  ok('more30_subscribe(mechiron, basic) is refused',
    blocked.status >= 400 && !blocked.json?.ok,
    `HTTP ${blocked.status} ${blocked.text.slice(0, 200)}`);
  ok('the refusal says what happened, in the language the customer reads',
    /אינה מוצעת|אינה פעילה/.test(blocked.text),
    blocked.text.slice(0, 200));
  // The old fallback is the trap: without the block, an unknown plan on a hidden
  // app silently became a platform subscription under a different app_key.
  ok('the refusal did not fall back to a platform subscription',
    blocked.json?.app_key !== 'more30',
    `app_key=${blocked.json?.app_key}`);

  const allowed = await rpc('more30_subscribe', { p_app: 'kupot', p_plan: 'basic' }, token);
  ok('more30_subscribe(kupot, basic) still works',
    allowed.status === 200 && allowed.json?.ok === true && allowed.json?.app_key === 'kupot',
    `HTTP ${allowed.status} ${allowed.text.slice(0, 200)}`);
  ok('and it charged nothing', allowed.json?.charged === false,
    `charged=${allowed.json?.charged}`);

  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/_results.json`, JSON.stringify({
    measured_at: new Date().toISOString(),
    supabase: SUPABASE,
    qa_account: email,
    subscription_written: allowed.json?.id ?? null,
    pass, fail, results,
  }, null, 2), 'utf8');

  console.log(`\n${pass} passed / ${fail} failed`);
  console.log(`row to clean up: core.subscriptions id=${allowed.json?.id ?? '—'} (${email})`);
  process.exit(fail === 0 ? 0 : 1);
};

main().catch((e) => { console.error(e); process.exit(1); });
