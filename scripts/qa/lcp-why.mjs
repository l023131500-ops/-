/**
 * Name the LCP element and the biggest opportunities, instead of inferring them.
 *
 * Why this exists: after prerendering, FCP on /torah and /chatzor/ landed at
 * 1.5-1.6s — comfortably under the 1.8s bar — and performance still sat at
 * 47-59, because LCP was 4.4-5.1s. "Prerender the landing route" was aimed at
 * FCP and hit it; the remaining gap is a different problem and deserves to be
 * measured rather than assumed to be the same one.
 *
 *   node scripts/qa/lcp-why.mjs torah chatzor zchuyot
 *
 * Reads the JSON that lh-batch.mjs already wrote to QA/shots/lh-<key>.json.
 */
import fs from 'node:fs';

const keys = process.argv.slice(2);
if (!keys.length) {
  console.error('usage: node scripts/qa/lcp-why.mjs <key> [key ...]   (keys as written by lh-batch)');
  process.exit(2);
}

for (const key of keys) {
  const file = `QA/shots/lh-${key}.json`;
  if (!fs.existsSync(file)) {
    console.log(`${key}: no report at ${file} — run lh-batch first`);
    continue;
  }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const a = j.audits;

  console.log(`\n===== ${key} =====`);
  console.log(
    `perf ${Math.round((j.categories.performance?.score ?? 0) * 100)}` +
      `  FCP ${a['first-contentful-paint']?.displayValue ?? '?'}` +
      `  LCP ${a['largest-contentful-paint']?.displayValue ?? '?'}` +
      `  TBT ${a['total-blocking-time']?.displayValue ?? '?'}` +
      `  CLS ${a['cumulative-layout-shift']?.displayValue ?? '?'}`,
  );

  // Which element is it, and how is the time split
  const el = a['largest-contentful-paint-element'];
  const item = el?.details?.items?.[0];
  const node = item?.node ?? item?.items?.[0]?.node;
  if (node) console.log(`  element : ${(node.nodeLabel || node.snippet || '').slice(0, 110)}`);
  const phases = el?.details?.items?.find((x) => x.items?.[0]?.phase)?.items;
  if (phases) for (const p of phases) console.log(`  phase   : ${p.phase} ${p.timing}ms`);

  // The opportunities, largest saving first — only ones that actually claim time
  const ops = Object.values(a)
    .filter((x) => x?.details?.type === 'opportunity' && (x.numericValue ?? 0) > 100)
    .sort((x, y) => y.numericValue - x.numericValue)
    .slice(0, 6);
  for (const o of ops) console.log(`  saves   : ${Math.round(o.numericValue)}ms  ${o.title}`);

  // Long tasks are what usually keeps LCP away from FCP on a hydrating SPA
  const long = a['long-tasks']?.details?.items?.slice(0, 4) ?? [];
  for (const t of long) {
    console.log(`  task    : ${Math.round(t.duration)}ms  ${String(t.url).split('/').pop().slice(0, 60)}`);
  }
}
