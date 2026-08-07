// Reads the Lighthouse reports that lh-batch.mjs already wrote to QA/shots/ and
// turns them into rows for core.lighthouse_runs, so §3 ("לכל מערכת: ... Lighthouse")
// can be answered from the register instead of from a folder on one laptop.
//
//   node scripts/qa/lh-import.mjs            → prints the rows + writes _results.json
//   node scripts/qa/lh-import.mjs --sql      → also writes the INSERT to stdout
//
// Two rules this script keeps, because both were violated by reading the summary
// file instead of the reports:
//   1. Scores come from the report, and so does the time it was taken
//      (`fetchTime`). A score without its own timestamp cannot be labelled stale,
//      and every one of these is days old.
//   2. Metrics are read from `numericValue`, not `displayValue` — displayValue is
//      a localised string ("1.8 s", with a non-breaking space) and QA/shots/_lh.json
//      already holds it mojibaked.
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = 'QA/shots';
const OUT_DIR = 'QA/platform/lh-import-0807';

// route as served → core.projects.path. Only routes that are actually a system;
// a report whose route has no system is reported and skipped, never guessed.
const ROUTE_TO_APP = {
  torah: 'torah', egod: 'egod', chatzor: 'chatzor', zchuyot: 'zchuyot',
  mechiron: 'mechiron', kupot: 'kupot', nadlan: 'nadlan', tivuch: 'tivuch',
};

const files = fs.readdirSync(SHOTS)
  .filter((f) => /^lh-.*\.json$/.test(f))
  .sort();

const rows = [];
const skipped = [];

for (const f of files) {
  const key = f.replace(/^lh-|\.json$/g, '');
  const j = JSON.parse(fs.readFileSync(path.join(SHOTS, f), 'utf8'));
  const url = j.finalDisplayedUrl || j.finalUrl || j.requestedUrl || '';
  const route = (new URL(url).pathname.split('/')[1] || '').toLowerCase();
  const app = ROUTE_TO_APP[route];

  if (!app) { skipped.push({ file: f, url, reason: `route '${route}' maps to no system` }); continue; }

  const score = (c) => {
    const s = j.categories?.[c]?.score;
    return s == null ? null : Math.round(s * 100);
  };
  const num = (id) => {
    const v = j.audits?.[id]?.numericValue;
    return v == null ? null : Math.round(v * 1000) / 1000;
  };

  const row = {
    app_key: app,
    route: '/' + route,
    url,
    perf: score('performance'),
    a11y: score('accessibility'),
    best_practices: score('best-practices'),
    seo: score('seo'),
    fcp_ms: num('first-contentful-paint'),
    lcp_ms: num('largest-contentful-paint'),
    tbt_ms: num('total-blocking-time'),
    cls: num('cumulative-layout-shift'),
    measured_at: j.fetchTime,
    lh_version: j.lighthouseVersion || null,
    source: `${SHOTS}/${f}`,
  };

  // Same route measured twice (lh-nadlan / lh-nadlan2): keep the newer report and
  // say so, rather than letting file order decide which number the board shows.
  const prev = rows.findIndex((r) => r.app_key === app);
  if (prev >= 0) {
    if (new Date(row.measured_at) > new Date(rows[prev].measured_at)) {
      skipped.push({ file: rows[prev].source, url: rows[prev].url, reason: `superseded by ${f}` });
      rows[prev] = row;
    } else {
      skipped.push({ file: f, url, reason: `older than ${rows[prev].source}` });
    }
    continue;
  }
  rows.push(row);
  void key;
}

rows.sort((a, b) => a.app_key.localeCompare(b.app_key));

const now = new Date();
for (const r of rows) {
  const ageH = (now - new Date(r.measured_at)) / 3.6e6;
  console.log(
    `${r.app_key.padEnd(10)} perf=${String(r.perf).padEnd(4)} a11y=${String(r.a11y).padEnd(4)} ` +
    `bp=${String(r.best_practices).padEnd(4)} seo=${String(r.seo).padEnd(4)} ` +
    `measured=${r.measured_at}  (${ageH.toFixed(1)}h ago)`);
}
for (const s of skipped) console.log(`SKIP ${s.file} — ${s.reason}`);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, '_results.json'),
  JSON.stringify({ generated_at: now.toISOString(), reports_read: files.length, rows, skipped }, null, 2),
  'utf8');

if (process.argv.includes('--sql')) {
  const lit = (v) => (v == null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const cols = ['app_key', 'route', 'url', 'perf', 'a11y', 'best_practices', 'seo',
    'fcp_ms', 'lcp_ms', 'tbt_ms', 'cls', 'measured_at', 'lh_version', 'source'];
  console.log(`\ninsert into core.lighthouse_runs (${cols.join(', ')}) values`);
  console.log(rows.map((r) => '  (' + cols.map((c) => lit(r[c])).join(', ') + ')').join(',\n') + ';');
}
