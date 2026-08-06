/**
 * Can anyone who is not the super-admin read the leads?
 *
 * /admin/leads (more30-priority §2 — "גישה כללית ללידים של כל המערכות במקום
 * אחד") is the only screen on the platform that puts the name, phone number and
 * email of 75 real people from 28 tables onto one page. Every other admin screen
 * shows counts; this one shows the people.
 *
 * The page checks `sb.auth.getSession()` before it calls, but that check is
 * cosmetic — it decides what to render, not what the database will answer. The
 * only thing standing between a stranger and the list is the gate inside
 * public.more30_admin_leads, and a gate that is never exercised is a gate nobody
 * has seen work. So this asks the API directly, the way an attacker would,
 * skipping the page entirely.
 *
 *   node scripts/qa/leads-gate.mjs
 *
 * Two callers, because they fail differently: `anon` is stopped by GRANT before
 * the function body runs at all, while a signed-in customer gets past GRANT
 * (the function is granted to `authenticated`) and must be stopped by the
 * `raise exception` inside it. Testing only the first would leave the second —
 * the realistic one, since anyone can register — completely unverified.
 *
 * Creates one throwaway account, identifiable by the qa. prefix and excluded
 * from every customer number by core.is_test_account.
 */
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function callLeads(token) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/more30_admin_leads`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  });
  let body = null;
  try { body = await r.json(); } catch { /* an empty body is itself an answer */ }
  return { status: r.status, body };
}

/** A lead row leaking would look like this: a person's contact details. */
const looksLikeLeads = (b) =>
  !!b && typeof b === 'object' && (Array.isArray(b.leads) || 'totals' in b);

console.log('\n/admin/leads — who can read 75 real people\n');

// ── 1. a stranger ────────────────────────────────────────────────────────
{
  const { status, body } = await callLeads(ANON);
  ok('anon is refused', status === 401 || status === 403, `HTTP ${status}`);
  ok('anon is refused by GRANT, not by luck', body?.code === '42501',
     `code ${body?.code ?? 'none'}`);
  ok('anon receives no lead data', !looksLikeLeads(body));
}

// ── 2. a signed-in customer who is not the super-admin ───────────────────
{
  const email = `qa.leadsgate+${Date.now()}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const su = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await su.json();
  const token = session?.access_token;

  if (!token) {
    ok('a throwaway customer account can be created', false,
       `signup HTTP ${su.status} — the second half of this test did not run`);
  } else {
    const { status, body } = await callLeads(token);
    ok('a signed-in customer is refused', status >= 400, `HTTP ${status}`);
    ok('…by the gate inside the function', body?.code === '42501',
       `code ${body?.code ?? 'none'}`);
    ok('a signed-in customer receives no lead data', !looksLikeLeads(body));
  }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
