/**
 * `deploy_target` is a field two lists claim and nobody measured.
 *
 * Issue #156 left it open with the words «there is no measurement showing
 * where mthbram is hosted», and closed `live` by asking the address. So the
 * first attempt here asked the address for this field too: fetch each mount
 * through more30.com and read the platform signature off the response —
 * `x-vercel-id` for Vercel, `server: railway-edge` for Railway.
 *
 * That method is wrong, and one row proves it. /kiosk/ is rewritten to
 * kioskfleet-production.up.railway.app, and it answers `server: Vercel` with
 * an `x-vercel-id`. A Vercel rewrite proxies the upstream, so the headers the
 * client sees are the *portal's* edge in every case — the upstream never signs
 * anything the browser can read. All 24 mounts return the same signature, and
 * a check that returns the same answer for every input measures nothing. It
 * would have "confirmed" Vercel for the one system that is on Railway.
 *
 * Reading the upstream directly (imud-more30.vercel.app) is not available
 * either: NetFree answers *.vercel.app and *.up.railway.app with 418 from this
 * machine, so an upstream probe measures the filter, not the host.
 *
 * What does carry the answer is `portal/vercel.dist.json` — not as a list
 * someone maintains, but as the deployed routing artifact: it names the origin
 * that actually serves each mount, and more30.com/<mount>/ returning that
 * system is the proof the route is in force. So the destination host is the
 * evidence, and the address is used for the one thing it can settle — that the
 * mount is served by its own origin and not swallowed by the portal's
 * catch-all, which is fingerprinted the same way registry-vs-projects.mjs does.
 *
 *   node scripts/qa/deploy-target-from-routing.mjs
 *
 * A system with no rewrite of its own, or no `path` at all, cannot be measured
 * and is reported `no-rewrite` / `not-mounted` with no verdict. Guessing a
 * target for an unrouted row is the invented datum the run forbids.
 *
 * 08 and 09 are protected: never fetched, never compared.
 *
 * Writes QA/platform/deploy-target-0810/_results.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ORIGIN = 'https://more30.com';
const OUT_DIR = 'QA/platform/deploy-target-0810';
const ROUTING = 'portal/vercel.dist.json';
const REGISTRY_TS = 'packages/config/src/registry.ts';
const SNAPSHOT = 'QA/platform/registry-vs-projects-0810/_core-projects.json';

/** 08 and 09 are protected — never probed, never compared, never touched. */
const PROTECTED = new Set(['08', '09']);

/** Host suffix → DeployTarget, the union in packages/config/src/types.ts:36. */
function targetOfHost(host) {
  if (!host) return null;
  if (host.endsWith('.up.railway.app') || host.endsWith('.railway.app')) return 'railway';
  if (host.endsWith('.vercel.app')) return 'vercel';
  if (host.endsWith('.netlify.app')) return 'netlify';
  if (host.endsWith('.lovable.app') || host.endsWith('.lovableproject.com')) return 'lovable';
  return null;
}

/**
 * What the edge that answered says it is. Only sound when nothing proxied the
 * response — see `method_rejected`; used here for the portal's own origin only.
 */
function targetOfHeaders(res) {
  const server = (res.server ?? '').toLowerCase();
  if (server.includes('railway')) return 'railway';
  if (res.xVercelId || server.includes('vercel')) return 'vercel';
  if (server.includes('netlify')) return 'netlify';
  return null;
}

/** mount → origin host, from the portal's own deployed rewrite table. */
function parseRouting(text) {
  const map = {};
  for (const r of JSON.parse(text).rewrites ?? []) {
    const mount = r.source.match(/^\/([a-z0-9-]+)(?:\/|$)/)?.[1];
    if (!mount || mount === 'api') continue;
    let host = null;
    try {
      host = new URL(r.destination).host;
    } catch {
      continue; // a destination like "/login.html" is a local file, not an origin
    }
    map[mount] ??= host;
  }
  return map;
}

/** One registry line → number + the target it claims. */
function parseRegistry(text) {
  const body = text.slice(text.indexOf('export const REGISTRY'), text.indexOf('export const ARCHIVE_REPOS'));
  const out = new Map();
  for (const line of body.split('\n')) {
    const number = line.match(/\{\s*number:\s*"([^"]+)"/)?.[1];
    if (!number) continue;
    out.set(number, line.match(/deployTarget:\s*"([^"]+)"/)?.[1] ?? null);
  }
  return out;
}

/** The assets an HTML document pulls in — enough to tell two SPAs apart. */
function fingerprint(html) {
  const assets = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]),
  ].filter((a) => !a.includes('auth-button')); // the shared login pill is on every mount
  return assets.sort().join('|');
}

const routing = parseRouting(readFileSync(ROUTING, 'utf8'));
const registry = parseRegistry(readFileSync(REGISTRY_TS, 'utf8'));
const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'more30-qa/deploy-target' } });
    const body = await res.text();
    return {
      url,
      status: res.status,
      finalUrl: res.url,
      bytes: Buffer.byteLength(body),
      // Kept in the record as the counter-evidence: it is the portal's edge on
      // every mount, including the Railway one, and settles nothing.
      server: res.headers.get('server') ?? null,
      xVercelId: res.headers.get('x-vercel-id') ? '(present)' : null,
      fingerprint: fingerprint(body),
    };
  } catch (err) {
    return { url, status: null, error: String(err?.message ?? err) };
  }
}

const home = await probe(`${ORIGIN}/`);
console.log(`portal home: ${home.status}, ${home.bytes} bytes, server=${home.server}\n`);

const rows = [];
for (const rec of snapshot.rows) {
  if (PROTECTED.has(rec.number)) continue;

  const mount = rec.path;
  const rewriteHost = mount ? (routing[mount] ?? null) : null;
  const byRewrite = targetOfHost(rewriteHost);
  const inRegistry = registry.get(rec.number) ?? null;
  const inDb = rec.deploy_target ?? null;

  // The portal itself is the one row the headers *can* answer: its live_url is
  // the origin, so nothing proxies it and `server` is its own edge, not a
  // relay's. That is exactly the case the rejected method mistook for general.
  const isOrigin = (() => {
    try { return new URL(rec.live_url).host === new URL(ORIGIN).host; } catch { return false; }
  })();

  let address = null;
  let verdict;
  if (!mount && isOrigin) {
    address = home;
    verdict = home.status === 200 && targetOfHeaders(home) ? 'settled-origin' : 'no-signature';
  } else if (!mount) {
    verdict = 'not-mounted';
  } else if (!rewriteHost) {
    verdict = 'no-rewrite';
  } else {
    address = await probe(`${ORIGIN}/${mount}/`);
    verdict =
      address.status !== 200 ? 'mount-missing'
      : address.fingerprint && address.fingerprint === home.fingerprint ? 'portal-fallback'
      : byRewrite == null ? 'host-unrecognised'
      : 'settled';
  }

  // Only a `settled` row may contradict a list: the deployed routing names the
  // origin, and the mount proves that route serves the system and not the
  // portal's home page.
  const measured =
    verdict === 'settled' ? byRewrite
    : verdict === 'settled-origin' ? targetOfHeaders(home)
    : null;
  const dbWrong = measured != null && (inDb ?? 'unknown') !== measured;
  const registryWrong = measured != null && (inRegistry ?? 'unknown') !== measured;

  rows.push({
    number: rec.number,
    slug: rec.slug,
    path: mount,
    rewriteHost,
    byRewrite,
    address,
    verdict,
    measured,
    db: inDb,
    registry: inRegistry,
    dbWrong,
    registryWrong,
  });

  const mark = !measured ? '—' : dbWrong || registryWrong
    ? `WRONG:${[dbWrong && 'db', registryWrong && 'registry'].filter(Boolean).join('+')}`
    : 'agree';
  console.log(
    `${rec.number} ${String(rec.slug).padEnd(26)} ${(mount ?? '—').padEnd(14)} ` +
      `${verdict.padEnd(18)} measured=${String(measured ?? '—').padEnd(8)} ` +
      `db=${String(inDb ?? 'null').padEnd(8)} registry=${String(inRegistry ?? 'null').padEnd(8)} ${mark}`,
  );
}

const summary = {
  measured_at: new Date().toISOString(),
  origin: ORIGIN,
  routing_file: ROUTING,
  snapshot_captured_at: snapshot.captured_at,
  method_rejected:
    'response headers: every mount answers server=Vercel + x-vercel-id because the portal proxies the ' +
    'rewrite, including /kiosk/ whose origin is kioskfleet-production.up.railway.app. Same answer for ' +
    'every input, and wrong for the one Railway row.',
  home,
  counts: {
    compared: rows.length,
    settled: rows.filter((r) => r.verdict === 'settled').length,
    settled_origin: rows.filter((r) => r.verdict === 'settled-origin').length,
    no_signature: rows.filter((r) => r.verdict === 'no-signature').length,
    not_mounted: rows.filter((r) => r.verdict === 'not-mounted').length,
    no_rewrite: rows.filter((r) => r.verdict === 'no-rewrite').length,
    portal_fallback: rows.filter((r) => r.verdict === 'portal-fallback').length,
    mount_missing: rows.filter((r) => r.verdict === 'mount-missing').length,
    host_unrecognised: rows.filter((r) => r.verdict === 'host-unrecognised').length,
    db_wrong: rows.filter((r) => r.dbWrong).length,
    registry_wrong: rows.filter((r) => r.registryWrong).length,
    protected_skipped: [...PROTECTED],
  },
  rows,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/_results.json`, JSON.stringify(summary, null, 2));
console.log('\n' + JSON.stringify(summary.counts, null, 2));
console.log(`\n→ ${OUT_DIR}/_results.json`);
