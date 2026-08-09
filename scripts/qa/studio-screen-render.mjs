/**
 * core.issues #86 — the studio screen, drawn against the payload the reader returned.
 *
 * 0054 added public.more30_admin_studio_report(). This is the other half, and the same
 * split kesef and imud got: portal/public/admin-studio.html exists now, and the question
 * here is whether it draws — and whether every key it reaches for is a key the function
 * actually returns.
 *
 * Same harness as imud-screen-render.mjs, and for the same reason: the screen is
 * super-admin only, it signs in through Supabase, and /admin/studio is not deployed yet
 * (#83, the Vercel quota). So two things are swapped and nothing else — the createClient
 * import and the client it builds — for a stub that hands back the captured payload. The
 * markup, the CSS and every line of rendering logic are the committed file.
 *
 * Two evidence files, on purpose:
 *
 *   • QA/platform/studio-report-0810/report.json is the reader's evidence, and it strips
 *     `notes` and `generated_at` — prose and a clock are not evidence.
 *   • QA/platform/studio-screen-0810/payload.json is the whole payload, because the screen
 *     draws both of those. Left alone, a second copy is exactly how a fixture drifts into
 *     something hand-made, so this file asserts the two agree on every key they share.
 *
 * The rest of the checks:
 *
 *   • every `data.<key>` the screen reads exists in the payload. A screen that reads a key
 *     the function does not return draws an empty section and says nothing — and for studio
 *     "there is nothing here" is the true answer to several questions, which is what makes
 *     the difference worth asserting.
 *
 *   • the stub replaced what it meant to replace. If the import line ever changes shape, a
 *     silent no-op harness would screenshot a page stuck on "טוען…".
 *
 *   • the headline the screen computes matches the payload. The gap note picks its branch
 *     from projects === 0 && brands === 0, and that branch is #129 — the finding that the
 *     zero is a missing client call and not a usage figure.
 *
 * Writes QA/platform/studio-screen-0810/render.html. Open it in a browser — no server,
 * no keys, no network.
 *
 *   node scripts/qa/studio-screen-render.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'QA', 'platform', 'studio-screen-0810');

const html = readFileSync(join(ROOT, 'portal', 'public', 'admin-studio.html'), 'utf8');
const report = JSON.parse(readFileSync(join(OUT, 'payload.json'), 'utf8')).report;
const evidence = JSON.parse(
  readFileSync(join(ROOT, 'QA', 'platform', 'studio-report-0810', 'report.json'), 'utf8')).report;

const checks = [];
const check = (ok, what) => checks.push({ ok: !!ok, what });

/**
 * Same value, whatever order the keys came out in. The evidence file was written by hand
 * from the same reading and jsonb hands its keys back in its own order, so a plain
 * JSON.stringify comparison fails on six of thirteen keys that hold identical data.
 * Arrays keep their order — a report that lists templates in a different order is a
 * different report, and that difference should still fail.
 */
const stable = (v) =>
  Array.isArray(v) ? v.map(stable)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]))
    : v;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

/**
 * The two captures have to be the same reading. Anything the evidence file kept is
 * compared value for value; the two keys it dropped are named here rather than skipped
 * silently, so a third key going missing would be a failure and not a shrug.
 */
const stripped = ['notes', 'generated_at'];
for (const k of Object.keys(report)) {
  if (stripped.includes(k)) {
    check(!(k in evidence), `the evidence file drops ${k} on purpose, and still does`);
    continue;
  }
  check(same(evidence[k], report[k]), `payload.json and the reader's evidence agree on ${k}`);
}

/** Every top-level key the screen reaches for on the RPC result. */
const read = [...new Set([...html.matchAll(/\bdata\.([a-z_]+)\b/g)].map((m) => m[1]))].sort();
for (const k of read) {
  check(k in report, `the screen reads data.${k}, and the payload carries it`);
}

/** The route has to exist, or the page is a file nobody can open. */
const routing = JSON.parse(readFileSync(join(ROOT, 'portal', 'vercel.dist.json'), 'utf8'));
check(
  (routing.rewrites ?? []).some(
    (r) => r.source === '/admin/studio' && r.destination === '/admin-studio.html'),
  'portal/vercel.dist.json serves /admin/studio from admin-studio.html');

/** The stub has to actually land, or the screenshot is of a loading state. */
const IMPORT = /^\s*import \{ createClient \} from 'https:\/\/esm\.sh\/@supabase\/supabase-js@2';\n/m;
const CLIENT = /const sb = createClient\([\s\S]*?\}\);\n/;
check(IMPORT.test(html), 'the createClient import is where the stub expects it');
check(CLIENT.test(html), 'the client construction is where the stub expects it');

/**
 * The finding, re-derived here from the payload rather than trusted from the screen.
 * The gap note has two branches and only one of them says "and that is not a usage figure".
 */
const t = report.totals || {};
const emptyWork = Number(t.projects) === 0 && Number(t.brands) === 0;
check(emptyWork, 'the payload says 0 projects and 0 brands — the branch the screen draws');
check(
  typeof (report.notes || {}).disconnect === 'string' && report.notes.disconnect.length > 0,
  'the disconnect note the gap branch prints comes from the function, not from the page');
check(
  (report.templates || []).length === Number(t.templates),
  `the template list carries every row it counted (${(report.templates || []).length}/${t.templates})`);
check(
  (report.templates || []).reduce((a, x) => a + Number(x.layers || 0), 0) === Number(t.layers),
  'the templates sum to totals.layers');
check(
  (report.by_layer_type || []).reduce((a, x) => a + Number(x.layers || 0), 0) === Number(t.layers),
  'the layer histogram sums to totals.layers — the denominator the bars divide by');
check(
  Number(t.templates_builtin) + Number(t.templates_custom) === Number(t.templates),
  'builtin + custom accounts for every template, with none left over');

/**
 * The screen is reachable only from a sibling bar, so a new screen that nobody links to
 * is a file on a disk. #103 and #104 are the two times that already happened.
 */
const SIBLINGS = [
  'admin-activity', 'admin-automation', 'admin-credits', 'admin-customers', 'admin-imud',
  'admin-issues', 'admin-kesef', 'admin-leads', 'admin-pricing', 'admin-rights', 'admin-systems',
];
for (const name of SIBLINGS) {
  const page = readFileSync(join(ROOT, 'portal', 'public', `${name}.html`), 'utf8');
  check(page.includes('href="/admin/studio"'), `${name}.html links to /admin/studio`);
}
check(
  !html.includes('href="/admin/studio"'),
  'the studio screen does not list itself in its own sibling bar');

const stub =
  `      // ‏מוחלף לצורך הצילום בלבד. הדף עצמו קורא ל-more30_admin_studio_report\n` +
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
    ran: 'scripts/qa/studio-screen-render.mjs',
    issue: 86,
    screen: 'portal/public/admin-studio.html',
    route: '/admin/studio',
    payload_from: 'QA/platform/studio-screen-0810/payload.json',
    cross_checked_against: 'QA/platform/studio-report-0810/report.json',
    keys_read: read,
    checks,
    summary: { pass: checks.length - failures.length, total: checks.length },
  }, null, 2) + '\n',
  'utf8',
);

console.log(`\n${checks.length - failures.length}/${checks.length} pass  →  QA/platform/studio-screen-0810/render.html`);
process.exit(failures.length ? 1 : 0);
