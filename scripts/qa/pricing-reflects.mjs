/**
 * Does a price the admin sets actually reach the customer's page — and do the
 * admin-only rows stay off it?
 *
 * The build doc promises "שינוי משתקף מיד באתר הלקוח". That is one claim with
 * two halves, and the second half is the one that bit: seeding a payment-type
 * row per system put `charge`, `one_time` and `pro (test)` straight onto
 * /subscribe, where a visitor would have read "פרו (בדיקה) — לשנות בניהול
 * לפני שיווק" as a tier they could buy.
 *
 * So this asserts both directions against production, with no session needed:
 * more30_system_page is anon-callable because the pricing page is public.
 *
 *   node scripts/qa/pricing-reflects.mjs
 */
const URL_ = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const APPS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['nadlan', 'torah', 'kupot', 'tivuch', 'more30'];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function page(app) {
  const r = await fetch(`${URL_}/rest/v1/rpc/more30_system_page`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_app: app }),
  });
  return r.ok ? r.json() : null;
}

console.log('=== what the customer sees on /subscribe ===');

const ADMIN_ONLY = ['charge', 'one_time', 'pro'];

for (const app of APPS) {
  const d = await page(app);
  if (!d) { ok(`${app} plans load`, false, 'RPC failed'); continue; }
  const plans = d.plans ?? [];
  const codes = plans.map((p) => p.code);

  ok(`${app}: has tiers to show`, plans.length > 0, 'no plans at all');

  const leaked = codes.filter((c) => ADMIN_ONLY.includes(c));
  ok(
    `${app}: no admin-only rows on the customer page`,
    leaked.length === 0,
    `leaked: ${leaked.join(', ')}`,
  );

  // A tier priced 0 is a decision ("free"), not a missing price, and the page
  // must not print "₪0" at it.
  //
  // `Number(null)` is 0, so the null check has to come first or undecided rows
  // get counted as free as well — which is exactly the conflation this whole
  // change exists to remove, and it made the first run print "-1 priced".
  const nul = plans.filter((p) => p.price_ils == null);
  const zero = plans.filter((p) => p.price_ils != null && Number(p.price_ils) === 0);
  console.log(
    `        ${app}: ${codes.join(', ')}  ` +
      `(${nul.length} undecided, ${zero.length} free, ` +
      `${plans.length - nul.length - zero.length} priced)`,
  );
}

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
