/**
 * What can the briut admin panel actually reach?
 *
 * core.issues #86 lists eight live public systems with no admin screen at all,
 * and briut (06) was written up as the cheapest of them: `site/admin.html`
 * already exists in source and is simply not served. #88 then removed the plain
 * text password from `site/admin.js`, and the item was left as "needs a real
 * server-side gate, like /galil/gabai".
 *
 * That framing skips a question nobody had asked: even with a perfect gate, can
 * that page read anything? briut is a static site with no build step and no
 * server. The only credential it has is the anon key in `site/supabase-config.js`
 * — the same key it ships to every visitor — and `site/leads-store.js` uses that
 * one key for all four verbs: the public form's insert, and the panel's list,
 * update and delete. `supabase-config.js:3` says "Row Level Security policies on
 * the kupot_leads table control access", which is a claim about a database in a
 * project (csjekrvukbdznetsrodj) that nobody had queried.
 *
 *   node scripts/qa/briut-leads-access.mjs            # read-only
 *   node scripts/qa/briut-leads-access.mjs --insert   # also writes one row
 *
 * The insert is behind a flag on purpose: it is the one verb that puts a row
 * into a table of real people's names and phone numbers, so it does not run by
 * accident on a re-run. Everything else here is safe to repeat.
 *
 * SELECT is asked for `select=id&limit=0` with an exact count — a refusal and a
 * leak are told apart by the status, and a leak is never printed.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const URL_BASE = 'https://csjekrvukbdznetsrodj.supabase.co/rest/v1/kupot_leads';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzamVrcnZ1a2Jkem5ldHNyb2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDM2NTIsImV4cCI6MjA5NTk3OTY1Mn0.L904gM3-_J7k7WvEDMhR53nzKRND-M_odJtJEePopuk';

const RUN_INSERT = process.argv.includes('--insert');

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
  results.push({ name: n, ok: !!c, detail: d ?? null });
};

const headers = (extra) => ({
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  ...(extra || {}),
});

async function call(method, qs, opts = {}) {
  const r = await fetch(URL_BASE + (qs || ''), {
    method,
    headers: headers(opts.headers),
    body: opts.body,
  });
  let text = '';
  try { text = await r.text(); } catch { /* an empty body is itself an answer */ }
  let code = null;
  try { code = JSON.parse(text)?.code ?? null; } catch { /* not JSON */ }
  return { status: r.status, code, len: text.length, range: r.headers.get('content-range') };
}

/** Refused means the database said no, not that the network did. */
const refused = (s) => s === 401 || s === 403;

console.log('\nbriut — what the shipped anon key can do to kupot_leads\n');

// ── the panel's read path ────────────────────────────────────────────────
const sel = await call('GET', '?select=id&limit=0', { headers: { Prefer: 'count=exact' } });
ok('anon cannot read the leads', refused(sel.status), `HTTP ${sel.status}`);
ok('…and no rows came back with the refusal', sel.len === 0 || !sel.range,
   sel.range ? `content-range ${sel.range}` : null);

// ── the panel's two write paths ──────────────────────────────────────────
const patched = await call('PATCH', '?source=eq.__qa_never_matches__', {
  headers: { 'content-type': 'application/json', Prefer: 'return=minimal' },
  body: '{"status":"done"}',
});
ok('anon cannot change a lead', refused(patched.status), `HTTP ${patched.status}`);

const deleted = await call('DELETE', '?source=eq.__qa_never_matches__', {
  headers: { Prefer: 'return=minimal' },
});
ok('anon cannot delete a lead', refused(deleted.status), `HTTP ${deleted.status}`);

// ── the public form's write path ─────────────────────────────────────────
let ins = null;
if (RUN_INSERT) {
  const stamp = `qa-anon-probe-${Date.now()}`;
  ins = await call('POST', '', {
    headers: { 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      req_type: 'info', full_name: 'QA probe more30', phone: '000',
      status: 'new', source: stamp,
    }),
  });
  ok('the public form can still submit a lead', ins.status === 201, `HTTP ${ins.status}`);
  console.log(`  NOTE  wrote source='${stamp}' — the anon key cannot delete it again`);
} else {
  console.log('  SKIP  the public form\'s insert (writes a real row; pass --insert)');
}

// ── what that adds up to ─────────────────────────────────────────────────
const readable = !refused(sel.status);
console.log('\n  ' + (readable
  ? 'The leads are readable by anyone holding the shipped key.'
  : 'The key briut ships is insert-only: the public form works, and the admin\n'
  + '  panel\'s list/update/delete cannot work at all. leads-store.js catches the\n'
  + '  refusal and falls back to localStorage, so the panel would show only leads\n'
  + '  typed into that same browser — a console with nothing real behind it.'));

const outDir = 'QA/platform/briut-leads-access-0807';
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/_results.json`, JSON.stringify({
  target: URL_BASE,
  key_role: 'anon (shipped in apps/06-kupot-holim/site/supabase-config.js)',
  select: sel, patch: patched, delete: deleted, insert: ins,
  insert_ran: RUN_INSERT,
  checks: results,
  pass, fail,
}, null, 2) + '\n');
console.log(`\n${pass} passed, ${fail} failed  ->  ${outDir}/_results.json\n`);
process.exit(fail ? 1 : 0);
