/**
 * studio (26) — the five routes mounted-api-base.mjs reported absent, sent with
 * the verb the client actually uses.
 *
 * The suite sends one GET per path. All five are declared app.post(...) in
 * apps/26-modaot-studio/server/routes.ts, so a GET could only ever miss, and
 * "absent_in_production" was the probe describing its own verb. This sends the
 * GET and then the declared verb to the same address and prints both, so the
 * pair decides whether the route is missing or merely method-mismatched.
 *
 * /api/brands is the control: it is a real GET route and already answers, which
 * is the same fact the suite's regression lock asserts.
 *
 * Two of these routes act rather than read, and the first run learned that the
 * hard way:
 *
 *   • POST /api/brands has no required field — insertBrandSchema accepts {} —
 *     so the empty body created brand id=1 ("מותג חדש") in studio's live
 *     database. It was removed the same minute with DELETE /api/brands/1, and
 *     GET /api/brands returned to [], the state it was in before. The control is
 *     GET-only here now, and no route is sent a verb it did not declare.
 *   • POST /api/ai/copy validates nothing and calls Anthropic on whatever body
 *     it gets. The one send — 200, 920 bytes of generated JSON — is what proved
 *     the route live, and it is skipped on a plain re-run so repeating the
 *     measurement costs nothing.
 *
 * The other three answer 400 application/json on an empty body: they validate
 * before they act, which is itself the proof that the route ran.
 *
 * Run: node QA/platform/studio-method-0810/probe.mjs [--include-billed]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://more30.com';
const MOUNT = '/studio';
const UA = 'more30-qa/studio-method';

/** Reaches a paid provider — sent only under --include-billed. */
const BILLED = new Set(['/api/ai/copy']);
const includeBilled = process.argv.includes('--include-billed');

/** Declared in server/routes.ts with the verb noted; /api/brands is the control. */
const ROUTES = [
  { path: '/api/ai/copy', declared: 'POST' },
  { path: '/api/ai/background', declared: 'POST' },
  { path: '/api/branding/logo', declared: 'POST' },
  { path: '/api/branding/strategy', declared: 'POST' },
  { path: '/api/branding/vectorize', declared: 'POST' },
  { path: '/api/brands', declared: 'GET' },
];

async function send(url, method) {
  const init = { method, redirect: 'manual', headers: { 'user-agent': UA } };
  if (method !== 'GET') {
    init.headers['content-type'] = 'application/json';
    init.body = '{}';
  }
  try {
    const res = await fetch(url, init);
    const body = await res.text();
    return {
      status: res.status,
      type: (res.headers.get('content-type') || '').split(';')[0],
      bytes: Buffer.byteLength(body),
      excerpt: body.slice(0, 200).replace(/\s+/g, ' ').trim(),
    };
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

const line = (r) => (r ? `${r.status ?? r.error ?? r.skipped} ${r.type ?? ''} ${r.bytes ?? ''}`.trim() : '—');
const answers = (r) => typeof r?.status === 'number' && r.status !== 404;

const results = [];
for (const route of ROUTES) {
  const url = ORIGIN + MOUNT + route.path;
  const as_get = await send(url, 'GET');

  if (BILLED.has(route.path) && !includeBilled) {
    // Recorded from the one send that was made; see the header.
    const declared = { skipped: 'reaches a paid provider — pass --include-billed', recorded: { status: 200, type: 'application/json', bytes: 920 } };
    results.push({ ...route, url, as_get, as_declared: declared, verdict: 'method_only' });
    console.log(`${route.declared.padEnd(4)} ${route.path.padEnd(24)} GET ${line(as_get)} | ${route.declared} not sent → method_only (recorded: 200 application/json 920)`);
    continue;
  }

  const as_declared = route.declared === 'GET' ? as_get : await send(url, route.declared);
  /**
   * absent      → the declared verb misses too; the route really is not served.
   * method_only → the GET the suite sends misses, the declared verb answers.
   * served      → GET answers; the suite's verb was never the problem.
   */
  const verdict = answers(as_get) ? 'served' : answers(as_declared) ? 'method_only' : 'absent';
  results.push({ ...route, url, as_get, as_declared, verdict });
  console.log(`${route.declared.padEnd(4)} ${route.path.padEnd(24)} GET ${line(as_get)} | ${route.declared} ${line(as_declared)} → ${verdict}`);
}

const out = { measured_at: new Date().toISOString(), origin: ORIGIN, mount: MOUNT, results };
const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/_results.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`\n${results.filter((r) => r.verdict === 'absent').length} absent, ${results.filter((r) => r.verdict === 'method_only').length} method_only, ${results.filter((r) => r.verdict === 'served').length} served  ->  _results.json`);
