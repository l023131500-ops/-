/**
 * core.issues #131 was written as one system's bug. It is a shape, and this
 * script asks how many systems have it.
 *
 * The shape: every system on more30.com is mounted under a path. The portal
 * (portal/vercel.dist.json) rewrites /<mount>/:path* to that system's own Vercel
 * project, and nothing else. A client bundle that calls fetch("/api/...") —
 * relative to the root, not to its mount — therefore asks more30.com for the
 * path, the portal has no rewrite for it, and the answer is the portal's 404.
 * On the system's own *.vercel.app origin the same call works, because there the
 * root is the system. So the bug is invisible everywhere except the address the
 * customer actually uses.
 *
 * studio (26) hit it and was fixed in bbf2472 by deriving the prefix from
 * Vite's BASE_URL. This script measures the same question for all 24 mounts, so
 * the fix is locked as a regression and the remaining instances are counted
 * rather than guessed.
 *
 * How each side is read:
 *
 *   • the mounts — parsed from portal/vercel.dist.json, which is the file
 *     production routes on. Each /<mount>/:path* rewrite names the origin host,
 *     and the host's first label is the Vercel project.
 *
 *   • the artifact — _deploy/<dir>/.vercel/project.json carries projectName, so
 *     a directory is matched to a mount by the project it deploys to and not by
 *     its own name. Two directories can name the same project (imud-more30 does),
 *     and then only one of them is in the air; see "which artifact is live".
 *
 *   • the client — .js and .html under the artifact's outputDirectory, minus
 *     api/, which is the function and not the browser. A route registered by the
 *     server reads "/api/books" too; counting it as a client call would report a
 *     bug in every system that has a server.
 *
 * Which artifact is live is not assumed: the mount's index.html is fetched from
 * more30.com and the asset filenames in it are matched against the candidate
 * directories. Vite's hashed names make that exact. A directory whose assets the
 * live document does not name is staged and not deployed, and is reported as
 * such instead of being read as production.
 *
 * The live probe is the verdict, and it has to be, because the literal alone
 * proves nothing: studio was fixed in bbf2472 and its bundle still reads
 * "/api/brands" — the prefix is applied at the call, not written into the
 * string. Counting literals reported studio as broken when it is not. So for
 * every distinct concrete path (ones carrying ${...} or :param are templates and
 * are skipped) both forms are requested anonymously — https://more30.com<path>,
 * what a base-less client asks for, and https://more30.com/<mount><path>, what a
 * based one asks for — and each pair is classified by what production returned:
 *
 * The probe only settles paths the browser actually asks more30.com for, and one
 * class of literal is never one of those. @supabase/realtime-js is bundled into
 * every client that imports supabase-js, and it builds its HTTP broadcast address
 * by taking the project's own socket URL and overwriting the path:
 *
 *     e.pathname === "" || e.pathname === "/" ? e.pathname = "/api/broadcast"
 *                                             : e.pathname = e.pathname + "/api/broadcast"
 *
 * The request that leaves the browser is https://<project>.supabase.co/realtime/v1/api/broadcast.
 * more30.com is never asked, so probing /api/broadcast against it can only return
 * "absent_in_production" — a failure the client cannot experience. A literal
 * written onto a URL object's .pathname is carried by an absolute origin by
 * construction, so those are recorded as skipped, with the context that proves it,
 * and not probed. (The first run of this script reported exactly that false
 * positive on seven mounts: admin, chatzor, egod, galil, mthbram, torah, zchuyot.)
 *
 * A second class is a literal that is only a react-query cache key. Usually a
 * queryKey element IS the path, because the default queryFn in these bundles is
 * fetch(API_BASE + queryKey.join("/")) — so the key must stay probed by default.
 * But a query that supplies its own queryFn never lets that run, and then the key
 * is a cache label and nothing more. smel (12) is the case: its bundle carries
 * "/api/questionnaire" inside
 *
 *     {queryKey:["/api/questionnaire"],queryFn:()=>Yb()}
 *
 * and Yb is fetchQuestionnaire from client/src/lib/nadlanApi.ts, which requests
 * <project>.supabase.co/rest/v1/questionnaire_templates. more30.com is never
 * asked for /api/questionnaire, so probing it there can only return
 * "absent_in_production" — the probe describing itself again. So a queryKey array
 * whose enclosing options object also declares queryFn is skipped, per occurrence:
 * the same path elsewhere in the bundle without a queryFn is still probed.
 *
 * The sibling search runs forward from the key array only. A queryFn written
 * before its queryKey in the same object is therefore not recognised, and the
 * cost of that is a probe that could have been skipped — never a bug that is
 * hidden. The detector errs toward reporting.
 *
 * Both forms are sent with GET, and a route the client only ever POSTs to cannot
 * answer one. studio (26) is the case: /api/ai/copy, /api/ai/background,
 * /api/branding/logo, /api/branding/strategy and /api/branding/vectorize are all
 * app.post(...) in server/routes.ts, and a run that read their GET 404 as
 * "absent_in_production" was describing its own verb. The verb is recoverable
 * from the bundle — these clients call apiRequest("POST", path), so the literal
 * is preceded by "POST", — and when it is not GET, express's own 404 settles the
 * question without sending a write: finalhandler answers
 *
 *     <pre>Cannot GET /studio/api/branding/logo</pre>
 *
 * which only a server that received the request at that address can produce. An
 * SPA fallback returns its shell and the portal returns its own 404; neither
 * names the path back. So the reply is read rather than a POST being sent blind
 * at 24 mounts.
 *
 *   mount_prefix       root is not JSON, mounted is JSON. The route exists and
 *                      only the prefix is missing. This is #131 exactly.
 *   mount_other_method the client declares a verb other than GET, and the mounted
 *                      address answered with express's "Cannot GET <path>". The
 *                      route is served under the mount; same candidate standing
 *                      as mount_prefix, and for the same reason.
 *   absent_in_production
 *                      neither form is JSON. The route is not served at all —
 *                      usually an SPA fallback answering 200 text/html, which
 *                      fails on parse rather than on status. A prefix would not
 *                      help; something is missing from the deploy.
 *   served_at_root     root is JSON, via one of the portal's hand-written /api
 *                      rewrites. Works today, and only for the paths written out
 *                      by hand.
 *
 * Passes when every shipped path is served_at_root or mount_prefix-free. Each
 * failure names the file, the path, and both answers.
 *
 *   node scripts/qa/mounted-api-base.mjs
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const outDir = join(root, 'QA/platform/mounted-api-base-0810');

const pass = [];
const fail = [];
const ok = (m) => { pass.push(m); console.log('  PASS  ' + m); };
const bad = (m) => { fail.push(m); console.log('  FAIL  ' + m); };

/* ---- the mounts, from the file production routes on ---------------------- */

const portal = JSON.parse(readFileSync(join(root, 'portal/vercel.dist.json'), 'utf8'));
const mounts = new Map(); // mount -> project
for (const r of portal.rewrites || []) {
  const m = /^\/([a-z0-9-]+)\/:path\*$/.exec(r.source);
  if (!m) continue;
  const host = /^https:\/\/([^/]+)/.exec(r.destination || '');
  if (!host) continue;
  mounts.set(m[1], host[1].split('.')[0]);
}
// Paths the portal forwards to somewhere other than a mount. These are the
// hand-written patches for exactly this bug, and they are evidence of it.
const rootApiRewrites = (portal.rewrites || [])
  .filter((r) => r.source.startsWith('/api/') || r.source === '/api')
  .map((r) => r.source);

/* ---- the artifacts ------------------------------------------------------- */

const deployRoot = join(root, '_deploy');
const artifacts = [];
for (const name of readdirSync(deployRoot)) {
  const dir = join(deployRoot, name);
  if (!statSync(dir).isDirectory()) continue;
  const pj = join(dir, '.vercel/project.json');
  if (!existsSync(pj)) continue;
  let cfg = {};
  const vj = join(dir, 'vercel.json');
  if (existsSync(vj)) { try { cfg = JSON.parse(readFileSync(vj, 'utf8')); } catch { cfg = {}; } }
  artifacts.push({
    dir: name,
    project: JSON.parse(readFileSync(pj, 'utf8')).projectName,
    outputDirectory: cfg.outputDirectory || '.',
  });
}

const walk = (d, acc = []) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.vercel' || e.name === '.git') continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|mjs|html)$/i.test(e.name)) acc.push(p);
  }
  return acc;
};

// A path literal inside quotes or a template. Template literals keep their
// ${...} so they can be recognised and skipped by the prober.
const API_LITERAL = /["'`](\/api\/[^"'`\s]*)["'`]?/g;

// A literal assigned to, or appended to, a URL object's .pathname is placed on
// whatever origin that object already carries. It is not a request to the page's
// own origin, so more30.com's answer for it means nothing.
const ON_A_URL_PATHNAME = /\.pathname\s*=\s*$|pathname\s*\+\s*$/;

// apiRequest("POST", "/api/...") survives minification as f("POST","/api/...") —
// the verb sits immediately before the literal. Recovering it keeps a GET probe
// from reporting a POST-only route as missing.
const DECLARED_METHOD = /["'`](GET|POST|PUT|PATCH|DELETE)["'`]\s*,\s*$/i;

// Skip past a quoted string starting at i, honouring backslash escapes, and
// return the index just after its closing quote. Minified bundles put brackets
// and braces inside strings, so a depth counter that does not do this drifts.
const afterString = (text, i) => {
  const q = text[i];
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\\') { j++; continue; }
    if (text[j] === q) return j + 1;
  }
  return text.length;
};

// Index ranges of every queryKey:[...] array whose enclosing options object also
// declares queryFn. A literal inside one of these is a cache label: the default
// queryFn — the only thing that turns a key into a URL — does not run for it.
const SHADOWED_KEY_WINDOW = 4000;
const shadowedKeyRanges = (text) => {
  const ranges = [];
  for (const m of text.matchAll(/queryKey\s*:\s*\[/g)) {
    const start = m.index + m[0].length - 1; // at the '['
    let depth = 0, end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"' || ch === "'" || ch === '`') { i = afterString(text, i) - 1; continue; }
      if (ch === '[' || ch === '{' || ch === '(') depth++;
      else if (ch === ']' || ch === '}' || ch === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    // Walk the rest of the enclosing object for a sibling queryFn, stopping at
    // the '}' that closes it.
    let d = 0;
    for (let j = end + 1; j < text.length && j < end + SHADOWED_KEY_WINDOW; j++) {
      const ch = text[j];
      if (ch === '"' || ch === "'" || ch === '`') { j = afterString(text, j) - 1; continue; }
      else if (ch === '[' || ch === '{' || ch === '(') d++;
      else if (ch === ']' || ch === ')') d--;
      else if (ch === '}') { if (d === 0) break; d--; }
      else if (d === 0 && text.startsWith('queryFn', j)) { ranges.push([start, end]); break; }
    }
  }
  return ranges;
};

const scanClient = (a) => {
  const base = join(deployRoot, a.dir, a.outputDirectory === '.' ? '' : a.outputDirectory);
  if (!existsSync(base)) return { hits: [], skipped: [] };
  const hits = [];
  const skipped = [];
  for (const f of walk(base)) {
    const rel = relative(join(deployRoot, a.dir), f).replace(/\\/g, '/');
    if (rel === 'api' || rel.startsWith('api/')) continue; // the function, not the browser
    const text = readFileSync(f, 'utf8');
    const shadowed = shadowedKeyRanges(text);
    for (const m of text.matchAll(API_LITERAL)) {
      const before = text.slice(Math.max(0, m.index - 80), m.index);
      const key = shadowed.find(([s, e]) => m.index >= s && m.index <= e);
      if (key) {
        skipped.push({
          file: rel,
          path: m[1],
          reason: 'a react-query cache key whose query supplies its own queryFn — the default queryFn that would turn a key into a URL never runs, so more30.com is never asked for it',
          context: text.slice(key[0], Math.min(key[1] + 40, text.length)).replace(/\s+/g, ' '),
        });
        continue;
      }
      if (ON_A_URL_PATHNAME.test(before)) {
        skipped.push({
          file: rel,
          path: m[1],
          reason: 'written onto a URL object .pathname — carried by an absolute origin, never requested from more30.com',
          context: (before.slice(-60) + m[0]).replace(/\s+/g, ' '),
        });
        continue;
      }
      const declared = DECLARED_METHOD.exec(before);
      hits.push({ file: rel, path: m[1], ...(declared ? { method: declared[1].toUpperCase() } : {}) });
    }
  }
  return { hits, skipped };
};

/* ---- which artifact is live --------------------------------------------- */

const get = async (url) => {
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'more30-qa/mounted-api-base' } });
    const body = await res.text();
    return { status: res.status, type: res.headers.get('content-type') || '', bytes: body.length, body };
  } catch (e) {
    return { status: 0, type: '', bytes: 0, body: '', error: String(e.message || e) };
  }
};

const results = { measured_at: new Date().toISOString(), mounts: {} };

for (const [mount, project] of [...mounts.entries()].sort()) {
  const candidates = artifacts.filter((a) => a.project === project);
  const entry = { project, artifacts: candidates.map((c) => c.dir), live_artifact: null, client_hits: [], not_requested_from_root: [], probes: [] };
  results.mounts[mount] = entry;
  if (candidates.length === 0) { entry.note = 'no _deploy directory deploys this project'; continue; }

  const doc = await get(`https://more30.com/${mount}/`);
  const liveAssets = [...doc.body.matchAll(/assets\/([A-Za-z0-9_.\-]+\.(?:js|css))/g)].map((m) => m[1]);
  entry.live_document = { status: doc.status, bytes: doc.bytes, assets: [...new Set(liveAssets)] };

  for (const c of candidates) {
    const files = walk(join(deployRoot, c.dir)).map((f) => f.split(/[\\/]/).pop());
    c.matches = liveAssets.filter((a) => files.includes(a)).length;
  }
  const live = candidates.slice().sort((x, y) => (y.matches || 0) - (x.matches || 0))[0];
  entry.live_artifact = live.matches > 0 ? live.dir : null;
  entry.staged_not_deployed = candidates.filter((c) => c.dir !== entry.live_artifact).map((c) => c.dir);

  const target = entry.live_artifact ? live : candidates[0];
  const scanned = scanClient(target);
  entry.client_hits = scanned.hits;
  entry.not_requested_from_root = scanned.skipped;
  for (const reason of new Set(scanned.skipped.map((s) => s.reason))) {
    const of = scanned.skipped.filter((s) => s.reason === reason);
    console.log(`  NOTE  ${mount}: ${of.length} literal(s) skipped — ${[...new Set(of.map((s) => s.path))].join(', ')} (${reason})`);
  }
  if (entry.client_hits.length === 0) { ok(`${mount}: the shipped client names no /api path the browser asks more30.com for`); continue; }

  const concrete = [...new Set(entry.client_hits.map((h) => h.path))]
    .filter((p) => !/[$:{}*]/.test(p) && p !== '/api/' && p.length > 5)
    .sort()
    .slice(0, 6);
  for (const p of concrete) {
    const asShipped = await get(`https://more30.com${p}`);
    const asMounted = await get(`https://more30.com/${mount}${p}`);
    const shape = (r) => ({ status: r.status, type: r.type.split(';')[0], bytes: r.bytes });
    const isJson = (r) => r.status === 200 && r.type.includes('json');
    // Verbs the shipped client uses for this path. GET is the probe's own, so
    // only the others make the probe unable to answer on status alone.
    const verbs = [...new Set(entry.client_hits.filter((h) => h.path === p && h.method).map((h) => h.method))];
    const otherVerb = verbs.filter((v) => v !== 'GET')[0];
    // express/finalhandler names the path it could not route back to you. The
    // portal's 404 and an SPA shell do not, so this only matches a server that
    // received the request at this exact address.
    const expressMissedVerb = (r, at) => r.status === 404 && r.body.includes(`Cannot GET ${at}`);
    const verdict = isJson(asShipped)
      ? 'served_at_root'
      : isJson(asMounted)
        ? 'mount_prefix'
        : otherVerb && expressMissedVerb(asMounted, `/${mount}${p}`)
          ? 'mount_other_method'
          : otherVerb && expressMissedVerb(asShipped, p)
            ? 'served_at_root'
            : 'absent_in_production';
    entry.probes.push({
      path: p,
      as_shipped: shape(asShipped),
      as_mounted: shape(asMounted),
      verdict,
      ...(otherVerb ? { client_method: otherVerb } : {}),
      ...(verdict === 'mount_other_method'
        ? { caveat: `the client sends ${otherVerb} here; the mounted address answered with express's own "Cannot GET", so the route is served under /${mount} and only the probe's verb missed. Whether the client prefixes it is a call-site question, as with mount_prefix` }
        : {}),
      // mount_prefix proves the route is served under the mount. It does not
      // prove the shipped client fails to prefix it: studio applies its base at
      // the call, so "/api/brands" reads bare in the bundle and still resolves
      // to /studio/api/brands — which the regression lock below confirms. The
      // verdict stays a failure because under-reporting a real #131 is the worse
      // error, but it is a candidate and not a proof.
      ...(verdict === 'mount_prefix'
        ? { caveat: 'the route answers under the mount; a client that prefixes at the call site would already reach it, so this needs the call site read before it counts as a bug' }
        : {}),
    });
  }
  const count = (v) => entry.probes.filter((p) => p.verdict === v).length;
  entry.verdict_counts = {
    served_at_root: count('served_at_root'),
    mount_prefix: count('mount_prefix'),
    mount_other_method: count('mount_other_method'),
    absent_in_production: count('absent_in_production'),
  };
  const files = [...new Set(entry.client_hits.map((h) => h.file))];

  if (count('mount_prefix') === 0 && count('mount_other_method') === 0 && count('absent_in_production') === 0) {
    ok(`${mount}: every probed path is answered at more30.com (${entry.probes.length} probed)`);
  } else {
    const parts = [];
    if (count('mount_prefix')) parts.push(`${count('mount_prefix')} answered only under /${mount} (candidate — read the call site)`);
    if (count('mount_other_method')) parts.push(`${count('mount_other_method')} served under /${mount} for the verb the client sends (candidate — read the call site)`);
    if (count('absent_in_production')) parts.push(`${count('absent_in_production')} answered by neither form`);
    bad(`${mount}: ${parts.join(', ')} — ${entry.client_hits.length} literal(s) in ${files.length} file(s), e.g. ${files[0]}`);
  }
}

/* ---- the regression lock and the portal's hand patches ------------------- */

// bbf2472 gave studio a base; /studio/api/brands answering JSON is the proof it
// is still applied, and it does not depend on reading the minified bundle.
const brands = await get('https://more30.com/studio/api/brands');
if (brands.status === 200 && brands.type.includes('json')) ok('studio stays fixed (#131): /studio/api/brands answers JSON');
else bad(`studio regressed (#131): /studio/api/brands returned ${brands.status} ${brands.type}`);

results.portal_root_api_rewrites = rootApiRewrites;
if (rootApiRewrites.length) {
  console.log(`  NOTE  the portal forwards ${rootApiRewrites.length} root /api path(s) by hand: ${rootApiRewrites.join(', ')}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, '_results.json'), JSON.stringify({ ...results, pass, fail }, null, 2));
console.log(`\n${pass.length} passed, ${fail.length} failed  ->  ${relative(root, join(outDir, '_results.json'))}`);
process.exit(fail.length ? 1 : 0);
