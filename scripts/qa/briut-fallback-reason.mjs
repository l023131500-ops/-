/**
 * Does the admin panel say why it fell back?
 *
 * Companion to briut-leads-access.mjs, which measured that the key briut ships
 * is insert-only. leads-store.js used to catch every failure the same way and
 * report `storage:"local"`, and admin.js turned that into "could not connect to
 * Supabase" — a network fault. The thing that actually happens is a 401 that no
 * retry will fix, so the message pointed the reader at the wrong problem.
 *
 *   node scripts/qa/briut-fallback-reason.mjs
 *
 * The file is a browser IIFE with no exports, so it runs here inside a vm with
 * window/fetch/localStorage shimmed — the same code the browser gets, not a
 * copy of it. That is the point: a re-implementation would prove nothing.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = 'apps/06-kupot-holim/site/leads-store.js';
const code = readFileSync(SRC, 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

/** One store instance, wired to a fetch that fails the way we want to test. */
function load(fetchImpl) {
  const store = {};
  const win = {
    KUPOT_SUPABASE: { url: 'https://example.invalid', anonKey: 'k', table: 'kupot_leads' },
  };
  const ctx = {
    window: win,
    fetch: fetchImpl,
    localStorage: { getItem: () => '[]', setItem: () => {}, removeItem: () => {} },
    Promise, JSON, Date, Math, console,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  Object.assign(store, win.LeadsStore);
  return store;
}

console.log('\nbriut — the three ways listLeads() can fall back\n');

const denied = await load(async () => ({ ok: false, status: 401 })).listLeads();
ok('a 401 is reported as a refusal', denied.reason === 'denied', `reason ${denied.reason}`);
ok('…and still returns rows, not a throw', Array.isArray(denied.rows));

const offline = await load(async () => { throw new TypeError('Failed to fetch'); }).listLeads();
ok('a network fault is still reported as offline', offline.reason === 'offline',
   `reason ${offline.reason}`);

const other = await load(async () => ({ ok: false, status: 500 })).listLeads();
ok('a server error is not mislabelled a refusal', other.reason === 'offline',
   `reason ${other.reason}`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
