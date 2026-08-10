/**
 * Two files answer «is system X live», and nobody has ever compared them.
 *
 * `packages/config/src/registry.ts` is the build-time list; `core.projects` is
 * the runtime one that the portal and /admin read. Issue #155 found them
 * disagreeing on system 21: the registry said `live:false`, the database said
 * `live:true`, and the address returned 200. A document quoted the registry,
 * concluded there was no production to measure against, and dropped seven
 * candidates for a whole round. One stale line cost a round.
 *
 * That was one row, found by accident. This compares all of them — and settles
 * every disagreement against the address itself, not against either list.
 *
 *   node scripts/qa/registry-vs-projects.mjs
 *
 * The database side is a captured snapshot (`_core-projects.json`, with the SQL
 * that produced it) rather than a live query: core.projects is not exposed on
 * the Data API, so a script cannot read it anonymously, and embedding a service
 * key in a QA script to re-read a list that changes monthly is a worse trade.
 * Re-capture it with the query in the file header when a row moves.
 *
 * The address verdict is not «200 = live». The portal answers unknown paths
 * with its own home page at 200 (see unknown-path-serves-home.mjs), so a mount
 * that was never deployed looks identical to one that works if you only read
 * the status line. Each mount is therefore fingerprinted by the assets its HTML
 * references, and a mount whose fingerprint equals the portal home's is
 * reported as `portal-fallback` — served, but not the system.
 *
 * Writes QA/platform/registry-vs-projects-0810/_results.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://more30.com';
const OUT_DIR = 'QA/platform/registry-vs-projects-0810';
const REGISTRY_TS = 'packages/config/src/registry.ts';
const SNAPSHOT = `${OUT_DIR}/_core-projects.json`;

/** 08 and 09 are protected — never probed, never compared, never touched. */
const PROTECTED = new Set(['08', '09']);

const src = readFileSync(REGISTRY_TS, 'utf8');

/** One registry line → the four fields that claim deployment state. */
function parseRegistry(text) {
  const body = text.slice(text.indexOf('export const REGISTRY'), text.indexOf('export const ARCHIVE_REPOS'));
  const out = [];
  for (const line of body.split('\n')) {
    const number = line.match(/\{\s*number:\s*"([^"]+)"/)?.[1];
    if (!number) continue;
    out.push({
      number,
      slug: line.match(/slug:\s*"([^"]+)"/)?.[1] ?? null,
      stage: line.match(/stage:\s*"([^"]+)"/)?.[1] ?? null,
      live: line.match(/\blive:\s*(true|false)/)?.[1] === 'true',
      isDeployed: line.match(/isDeployed:\s*(true|false)/)?.[1] === 'true',
      deployTarget: line.match(/deployTarget:\s*"([^"]+)"/)?.[1] ?? null,
    });
  }
  return out;
}

/** TOPIC_ROUTES, for numbers the database has no `path` for. */
function parseTopics(text) {
  const body = text.slice(text.indexOf('export const TOPIC_ROUTES'), text.indexOf('export function topicPath'));
  const map = {};
  for (const m of body.matchAll(/"(\d+)":\s*"([a-z0-9-]+)"/g)) map[m[1]] = m[2];
  return map;
}

const registry = parseRegistry(src);
const topics = parseTopics(src);
const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const db = new Map(snapshot.rows.map((r) => [r.number, r]));

/** The assets an HTML document pulls in — enough to tell two SPAs apart. */
function fingerprint(html) {
  const assets = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]),
  ].filter((a) => !a.includes('auth-button')); // the shared login pill is on every mount
  return assets.sort().join('|');
}

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'more30-qa/registry-vs-projects' } });
    const body = await res.text();
    return {
      url,
      status: res.status,
      finalUrl: res.url,
      contentType: res.headers.get('content-type') ?? null,
      bytes: Buffer.byteLength(body),
      title: body.match(/<title[^>]*>([^<]*)<\/title>/)?.[1]?.trim() ?? null,
      fingerprint: fingerprint(body),
    };
  } catch (err) {
    return { url, status: null, error: String(err?.message ?? err) };
  }
}

const home = await probe(`${ORIGIN}/`);
console.log(`portal home: ${home.status}, ${home.bytes} bytes, fingerprint ${home.fingerprint.slice(0, 60)}…`);

const numbers = [...new Set([...registry.map((r) => r.number), ...db.keys()])]
  .filter((n) => !PROTECTED.has(n))
  .sort();

const rows = [];
for (const number of numbers) {
  const reg = registry.find((r) => r.number === number) ?? null;
  const rec = db.get(number) ?? null;
  const path = rec?.path ?? topics[number] ?? null;

  let address = null;
  if (path) {
    address = await probe(`${ORIGIN}/${path}/`);
    // Same fingerprint as the portal home means the portal answered, not the system.
    address.verdict =
      address.status !== 200 ? 'missing'
      : address.fingerprint && address.fingerprint === home.fingerprint ? 'portal-fallback'
      : 'mount';
  }

  const liveByAddress = address?.verdict === 'mount';
  const disagreements = [];
  if (reg && rec) {
    if (reg.live !== rec.live) disagreements.push(`live: registry=${reg.live} db=${rec.live}`);
    if (reg.isDeployed !== rec.is_deployed) disagreements.push(`is_deployed: registry=${reg.isDeployed} db=${rec.is_deployed}`);
    if (reg.stage !== rec.stage) disagreements.push(`stage: registry=${reg.stage} db=${rec.stage}`);
    if ((reg.deployTarget ?? null) !== (rec.deploy_target ?? null)) {
      disagreements.push(`deploy_target: registry=${reg.deployTarget} db=${rec.deploy_target}`);
    }
  }
  if (!reg) disagreements.push('missing from registry.ts');
  if (!rec) disagreements.push('missing from core.projects');

  // Which side the address contradicts — the only thing worth acting on.
  const wrong = [];
  if (path && address) {
    if (reg && reg.live !== liveByAddress) wrong.push('registry');
    if (rec && rec.live !== liveByAddress) wrong.push('db');
  }

  rows.push({
    number,
    slug: rec?.slug ?? reg?.slug ?? null,
    path,
    registry: reg,
    db: rec,
    address,
    liveByAddress,
    disagreements,
    contradictedByAddress: wrong,
  });

  const mark = wrong.length ? `WRONG:${wrong.join('+')}` : disagreements.length ? 'differs' : 'agree';
  console.log(
    `${number} ${(rec?.slug ?? reg?.slug ?? '?').padEnd(26)} ` +
      `${(path ?? '—').padEnd(14)} ${String(address?.status ?? '—').padEnd(4)} ` +
      `${(address?.verdict ?? 'not-mounted').padEnd(16)} ${mark}` +
      (disagreements.length ? `  [${disagreements.join('; ')}]` : ''),
  );
}

const summary = {
  measured_at: new Date().toISOString(),
  origin: ORIGIN,
  snapshot_captured_at: snapshot.captured_at,
  home,
  counts: {
    compared: rows.length,
    agree: rows.filter((r) => !r.disagreements.length).length,
    differ: rows.filter((r) => r.disagreements.length).length,
    registry_wrong: rows.filter((r) => r.contradictedByAddress.includes('registry')).length,
    db_wrong: rows.filter((r) => r.contradictedByAddress.includes('db')).length,
    portal_fallback: rows.filter((r) => r.address?.verdict === 'portal-fallback').length,
    missing_from_registry: rows.filter((r) => !r.registry).length,
    protected_skipped: [...PROTECTED],
  },
  rows,
};

writeFileSync(`${OUT_DIR}/_results.json`, JSON.stringify(summary, null, 2));
console.log('\n' + JSON.stringify(summary.counts, null, 2));
console.log(`\n→ ${OUT_DIR}/_results.json`);
