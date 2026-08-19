/**
 * Name the elements that shift, instead of guessing at the CLS number.
 *
 *   node scripts/qa/cls-why.mjs torah
 *
 * Reads the report lh-batch.mjs already wrote to QA/shots/lh-<key>.json.
 */
import fs from 'node:fs';

for (const key of process.argv.slice(2)) {
  const file = `QA/shots/lh-${key}.json`;
  if (!fs.existsSync(file)) { console.log(`${key}: no report at ${file}`); continue; }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const a = j.audits;
  console.log(`\n===== ${key} =====  CLS ${a['cumulative-layout-shift']?.displayValue ?? '?'}`);

  const items = a['layout-shifts']?.details?.items ?? a['layout-shift-elements']?.details?.items ?? [];
  for (const it of items.slice(0, 8)) {
    const score = it.score ?? it.value ?? 0;
    const node = it.node ?? it.subItems?.items?.[0]?.node;
    console.log(`  ${String(Math.round(score * 1000) / 1000).padStart(6)}  ${(node?.nodeLabel || node?.snippet || '(unnamed)').slice(0, 100)}`);
    for (const cause of it.subItems?.items ?? []) {
      if (cause.extra?.value || cause.cause) console.log(`          cause: ${cause.cause ?? cause.extra.value}`);
    }
  }
  if (!items.length) console.log('  (lighthouse reported no shifting elements)');

  const fonts = a['font-display'];
  if (fonts?.details?.items?.length) {
    console.log('  fonts without font-display:swap:');
    for (const f of fonts.details.items.slice(0, 4)) console.log(`    ${String(f.url).split('/').pop().slice(0, 70)}`);
  }
}
