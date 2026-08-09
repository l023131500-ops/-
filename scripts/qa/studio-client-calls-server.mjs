/**
 * core.issues #129 — which of the studio's server routes the shipped client
 * actually calls, counted over every chunk and not over the entry chunk alone.
 *
 * #129 was opened on a measurement of one file: /studio/assets/index-CsiCgOfk.js,
 * 612,504 bytes, one occurrence of "api/" and it was "/api/templates". From that
 * it concluded that the bundle the browser receives touches none of the ten
 * project/brand routes the server registers.
 *
 * The bundle is code-split. client/src/App.tsx routes seven pages, Vite emits a
 * chunk per page, and the entry chunk carries only what the first screen (Home)
 * needs — which is exactly /api/templates. Every call to /api/brands and
 * /api/projects lives in a route chunk that is fetched when that route opens:
 * BrandingHome, BrandingBrief, BrandKitPage, Editor, Brief, Studio. Reading the
 * entry chunk and stopping is reading one seventh of the client.
 *
 * So this script enumerates from both ends and joins them:
 *
 *   • the server side — every app.<method>("/api/...") registered in the
 *     deployed _deploy/studio-more30/api/_lib/server/routes.ts, which is the
 *     file the production function actually runs;
 *   • the client side — every /api/ string literal in every .js under
 *     _deploy/studio-more30/public/studio/assets/, with its method recovered
 *     from the call around it.
 *
 * Recovering the method from minified code, and why these two forms cover it:
 * the client has exactly one way to reach the API with a verb, apiRequest(method,
 * url) in client/src/lib/queryClient.ts, which minifies to X("POST","/api/...")
 * — the verb survives as a string literal next to the path. Reads without a verb
 * go through the default queryFn in the same file, which does
 * fetch(queryKey.join("/")) — a GET, and the extra key elements become path
 * segments, so queryKey:["/api/brands", id] is GET /api/brands/:id and is
 * counted as one.
 *
 * The source tree is scanned the same way and must agree with the bundle. A
 * bundle that calls something the source does not is a stale deploy; the point
 * of checking both is that "the client does not call it" and "the deployed
 * client is old" are different bugs with different fixes.
 *
 * No network, no database, no keys (#88). Everything read is a file in the repo.
 *
 *   node scripts/qa/studio-client-calls-server.mjs
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const deployDir = join(root, '_deploy/studio-more30');
const routesFile = join(deployDir, 'api/_lib/server/routes.ts');
const assetsDir = join(deployDir, 'public/studio/assets');
const srcDir = join(root, 'apps/26-modaot-studio/client/src');
const outDir = join(root, 'QA/platform/studio-client-calls-0810');

/** Routes the deployed server registers. */
function serverRoutes() {
  const text = readFileSync(routesFile, 'utf8');
  const out = [];
  const re = /app\.(get|post|patch|put|delete)\(\s*["'`](\/api\/[^"'`]*)["'`]/g;
  for (const m of text.matchAll(re)) {
    out.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return out;
}

/**
 * Every /api/ string literal in one file, with the method it is called with.
 * `${...}` becomes :p so that a template literal and a route pattern compare.
 */
function callsIn(text) {
  const out = [];
  const re = /(["'`])(\/api\/(?:[^"'`\\]|\\.)*)\1/g;
  for (const m of text.matchAll(re)) {
    const before = text.slice(Math.max(0, m.index - 70), m.index);
    let path = m[2]
      .replace(/\$\{[^}]*\}/g, ':p')   // `/api/brands/${id}` -> /api/brands/:p
      .replace(/\?.*$/, '')            // /api/presets?a=b    -> /api/presets
      .replace(/\/$/, '');

    const verb = before.match(/["'`](GET|POST|PATCH|PUT|DELETE)["'`]\s*,\s*$/i);
    let method;
    let alt = null;
    if (verb) {
      method = verb[1].toUpperCase();
    } else if (/queryKey\s*:\s*\[\s*$/.test(before)) {
      // The default queryFn does fetch(queryKey.join("/")), so extra key
      // elements are path segments: ["/api/brands", id] is GET /api/brands/:p.
      // A query may also override queryFn, and then the key is a cache key and
      // not a URL. Both readings are kept and either may match a route — the
      // alternative is to guess, and a guess here invents a call or hides one.
      const after = text.slice(m.index + m[0].length);
      const close = after.indexOf(']');
      const extra = close < 0 ? '' : after.slice(0, close);
      const segments = extra.split(',').map((s) => s.trim()).filter(Boolean);
      method = 'GET';
      if (segments.length) { alt = path; path += segments.map(() => '/:p').join(''); }
    } else {
      method = 'UNKNOWN';
    }
    out.push({ method, path, alt });
  }
  return out;
}

function scanDir(dir, filter) {
  const found = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) { found.push(...scanDir(full, filter)); continue; }
    if (!filter(name.name)) continue;
    for (const c of callsIn(readFileSync(full, 'utf8'))) found.push({ ...c, file: name.name });
  }
  return found;
}

/** /api/brands/:id and /api/brands/:p are the same route. */
const norm = (p) => p.replace(/\/:[A-Za-z_$][\w$]*/g, '/:p');
const key = (c) => `${c.method} ${norm(c.path)}`;
const keys = (c) => (c.alt ? [key(c), `${c.method} ${norm(c.alt)}`] : [key(c)]);
const hits = (c, k) => keys(c).includes(k);

const routes = serverRoutes();
const bundle = scanDir(assetsDir, (n) => n.endsWith('.js'));
const source = scanDir(srcDir, (n) => /\.tsx?$/.test(n));

const bundleKeys = new Set(bundle.flatMap(keys));
const sourceKeys = new Set(source.flatMap(keys));

const matrix = routes.map((r) => {
  const k = key(r);
  const callers = [...new Set(bundle.filter((c) => hits(c, k)).map((c) => c.file))].sort();
  return { ...r, called_by_bundle: bundleKeys.has(k), called_by_source: sourceKeys.has(k), callers };
});

// Only call sites with an explicit verb are counted here: those are apiRequest
// calls, where the string is unambiguously a URL. A queryKey without one may be
// a cache key, and calling that an orphan route would be an invented finding.
const routeKeys = new Set(routes.map(key));
const orphanCalls = [...new Set(
  bundle.filter((c) => !c.alt && c.method !== 'UNKNOWN' && !routeKeys.has(key(c))).map(key),
)].sort();

const projectRoutes = matrix.filter((r) => /^\/api\/projects/.test(r.path));
const brandRoutes = matrix.filter((r) => /^\/api\/brands/.test(r.path));

const checks = [];
const check = (ok, what) => checks.push({ ok: !!ok, what });

check(routes.length > 0, `the deployed routes.ts registers ${routes.length} /api routes`);
check(bundle.length > 0, `the shipped chunks carry ${bundle.length} /api call sites`);
check(!bundle.some((c) => c.method === 'UNKNOWN'),
  'every call site in the bundle resolved to a method — no call was counted as a guess');

// The correction #129 needs: the entry chunk is not the client.
const entry = bundle.filter((c) => /^index-/.test(c.file));
check(entry.length === 1 && entry[0].path === '/api/templates',
  'the entry chunk really does carry exactly one call, /api/templates — #129 measured this correctly');
check(bundle.some((c) => !/^index-/.test(c.file)),
  `and it is not the client: ${bundle.length - entry.length} more call sites live in the route chunks`);

check(brandRoutes.length === 5 && brandRoutes.every((r) => r.called_by_bundle),
  `all ${brandRoutes.length} brand routes are called by the shipped client, not none of them`);

const projectsCalled = projectRoutes.filter((r) => r.called_by_bundle);
const projectsUncalled = projectRoutes.filter((r) => !r.called_by_bundle);
check(projectsCalled.length === 1 && projectsCalled[0].method === 'POST',
  'of the five project routes the client calls exactly one, POST — work is written');
check(projectsUncalled.length === 4 && projectsUncalled.every((r) => r.method !== 'POST'),
  `and never reads it back: ${projectsUncalled.map((r) => `${r.method} ${r.path}`).join(', ')}`);

check(matrix.every((r) => r.called_by_bundle === r.called_by_source),
  'the bundle and the source agree on every route — the deployed client is not stale');

check(orphanCalls.length === 0,
  orphanCalls.length
    ? `calls with no route behind them: ${orphanCalls.join(', ')}`
    : 'every call the shipped client makes has a route registered behind it');

// gallery.tsx and generator.tsx query /api/ads and /api/config, which the server
// does not register. They are not in the bundle because App.tsx routes neither
// page — dead files, and worth saying so rather than leaving them to be found
// again as a fourth measurement of the same client.
// Same rule as the orphan set: a multi-element queryKey may be a cache key, so
// only unambiguous single-string call sites are counted.
const deadSourceCalls = [...new Set(
  source.filter((c) => !c.alt && c.method !== 'UNKNOWN' && !routeKeys.has(key(c)))
    .map((c) => `${c.method} ${norm(c.path)}  (${c.file})`),
)].sort();

const uncalled = matrix.filter((r) => !r.called_by_bundle);
const results = {
  measured_at_utc_day: '2026-08-10',
  deployed_routes: routes.length,
  bundle_call_sites: bundle.length,
  chunks: readdirSync(assetsDir).filter((n) => n.endsWith('.js')).length,
  entry_chunk_calls: entry.map((c) => `${c.method} ${c.path}`),
  matrix,
  uncalled: uncalled.map((r) => `${r.method} ${r.path}`),
  orphan_calls: orphanCalls,
  source_only_calls_with_no_route: deadSourceCalls,
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, '_results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');

console.log(`server routes: ${routes.length}   shipped chunks: ${results.chunks}   call sites: ${bundle.length}\n`);
for (const r of matrix) {
  const mark = r.called_by_bundle ? 'called ' : 'UNCALLED';
  console.log(`  ${mark}  ${r.method.padEnd(6)} ${r.path.padEnd(38)} ${r.callers.join(' ')}`);
}
console.log('');
const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.what}`);
console.log(`\n${checks.length - failures.length}/${checks.length} pass`);
console.log(`evidence: QA/platform/studio-client-calls-0810/_results.json`);
process.exit(failures.length ? 1 : 0);
