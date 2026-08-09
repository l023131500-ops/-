/**
 * core.issues #86 — the imud screen, drawn against the payload the reader returned.
 *
 * 0053 added public.more30_admin_imud_report() and imud-report-shape.mjs asserted
 * what a screen may assume about it. This is the other half: portal/public/admin-imud.html
 * exists now, and the question here is whether it draws — and whether every key it
 * reaches for is a key the function actually returns.
 *
 * Same harness as kesef-screen-render.mjs, and for the same reason: the screen is
 * super-admin only, it signs in through Supabase, and /admin/imud is not deployed yet
 * (#83, the Vercel quota). So two things are swapped and nothing else — the
 * createClient import and the client it builds — for a stub that hands back the
 * captured payload (QA/platform/imud-report-0810/_results.json, read from the live
 * hub on 10/08). The markup, the CSS and every line of rendering logic are the
 * committed file.
 *
 * Three checks run before the file is written:
 *
 *   • every `data.<key>` the screen reads exists in the payload. A screen that reads
 *     a key the function does not return draws an empty section and says nothing —
 *     the failure looks exactly like "there is no data", which for imud is the true
 *     answer to several questions, and that is what makes it worth asserting.
 *
 *   • the stub replaced what it meant to replace. If the import line ever changes
 *     shape, a silent no-op harness would screenshot a page stuck on "טוען…".
 *
 *   • the headline the screen computes matches the payload. The gap note picks its
 *     branch from anon_books === books, and that branch is the whole finding —
 *     an off-by-one there would draw a reassuring sentence over a real gap.
 *
 * Writes QA/platform/imud-screen-0810/render.html. Open it in a browser — no server,
 * no keys, no network.
 *
 *   node scripts/qa/imud-screen-render.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'QA', 'platform', 'imud-screen-0810');

const html = readFileSync(join(ROOT, 'portal', 'public', 'admin-imud.html'), 'utf8');
const ev = JSON.parse(
  readFileSync(join(ROOT, 'QA', 'platform', 'imud-report-0810', '_results.json'), 'utf8'));
const report = ev.report;

const checks = [];
const check = (ok, what) => checks.push({ ok: !!ok, what });

/** Every top-level key the screen reaches for on the RPC result. */
const read = [...new Set([...html.matchAll(/\bdata\.([a-z_]+)\b/g)].map((m) => m[1]))].sort();
for (const k of read) {
  check(k in report, `the screen reads data.${k}, and the payload carries it`);
}

/** The route has to exist, or the page is a file nobody can open. */
const routing = JSON.parse(readFileSync(join(ROOT, 'portal', 'vercel.dist.json'), 'utf8'));
check(
  (routing.rewrites ?? []).some(
    (r) => r.source === '/admin/imud' && r.destination === '/admin-imud.html'),
  'portal/vercel.dist.json serves /admin/imud from admin-imud.html');

/** The stub has to actually land, or the screenshot is of a loading state. */
const IMPORT = /^\s*import \{ createClient \} from 'https:\/\/esm\.sh\/@supabase\/supabase-js@2';\n/m;
const CLIENT = /const sb = createClient\([\s\S]*?\}\);\n/;
check(IMPORT.test(html), 'the createClient import is where the stub expects it');
check(CLIENT.test(html), 'the client construction is where the stub expects it');

/**
 * The finding, re-derived here from the payload rather than trusted from the screen.
 * The gap note has three branches and only one of them says "every book is anon".
 */
const t = report.totals || {};
const anonAll = Number(t.books) > 0 && Number(t.anon_books) === Number(t.books);
check(anonAll, `the payload says all ${t.books} books sit on anon — the branch the screen draws`);
check(
  (report.books || []).length === Number(t.books),
  `the books list carries every row it counted (${(report.books || []).length}/${t.books})`);
check(
  (report.layers || []).reduce((a, x) => a + Number(x.blocks || 0), 0) === Number(t.blocks),
  'the layer histogram sums to totals.blocks — the denominator the bars divide by');

const stub =
  `      // ‏מוחלף לצורך הצילום בלבד. הדף עצמו קורא ל-more30_admin_imud_report\n` +
  `      // ‏דרך Supabase; כאן הוא מקבל את אותה תשובה, כפי שנקראה מהמסד ב-10/08.\n` +
  `      const REPORT = ${JSON.stringify(report, null, 2).replace(/^/gm, '      ').trim()};\n` +
  `      const sb = {\n` +
  `        auth: { getSession: async () => ({ data: { session: { stub: true } } }) },\n` +
  `        rpc: async () => ({ data: REPORT, error: null }),\n` +
  `      };\n`;

const rendered = html.replace(IMPORT, '').replace(CLIENT, stub);
check(rendered !== html, 'the harness changed the file it was given');
check(!rendered.includes('esm.sh'), 'the rendered copy reaches no network');

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.what}`);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'render.html'), rendered, 'utf8');
writeFileSync(
  join(OUT, '_results.json'),
  JSON.stringify({
    ran: 'scripts/qa/imud-screen-render.mjs',
    issue: 86,
    screen: 'portal/public/admin-imud.html',
    route: '/admin/imud',
    payload_from: 'QA/platform/imud-report-0810/_results.json',
    keys_read: read,
    checks,
    summary: { pass: checks.length - failures.length, total: checks.length },
  }, null, 2) + '\n',
  'utf8',
);

console.log(`\n${checks.length - failures.length}/${checks.length} pass  →  QA/platform/imud-screen-0810/render.html`);
process.exit(failures.length ? 1 : 0);
