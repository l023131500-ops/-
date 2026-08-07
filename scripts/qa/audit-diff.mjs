// audit-diff.mjs — compare two platform-audit _results.json files, route by route.
//
// Why this exists: issue #80. settle() stopped charging a 13-second stability
// floor to pages that reach networkidle, and the claim that this changes no
// reading was proved on three routes and a replay harness. Three routes is not
// the fleet. A full pass produces 90 readings; eyeballing 90 readings in a
// 170KB JSON file is how a regression gets called "no change".
//
// What counts as a change is deliberately narrow. textLen and interactiveCount
// are what the loading-shell failure moves (a shell reads 908 chars / 25
// controls where the finished page reads 3164 / 51), and status/darkMode are
// the verdicts other files are written from. Everything else in the record —
// screenshots, console noise, loadMs — is expected to differ between runs and
// is reported separately rather than counted as drift.
//
// loadMs is the cost, not the reading. It is summed and printed per route so
// the "an audit pass takes an hour" half of #80 is answered with a number.
//
// Usage: node audit-diff.mjs <baseline.json> <new.json>

import fs from 'node:fs';

const [, , BASE, NEW] = process.argv;
if (!BASE || !NEW) {
  console.error('usage: node audit-diff.mjs <baseline.json> <new.json>');
  process.exit(2);
}

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
const base = read(BASE);
const next = read(NEW);

const MODES = ['desktop', 'mobile', 'dark'];
// A reading that moved by less than this is page content, not a settle policy
// difference — a clock, a rotating tagline, a count that ticked. Measured: the
// four systems that gained a shared element in commit 63c0234 moved +25..37.
const NOISE = 60;

const rows = [];
let baseMs = 0;
let nextMs = 0;
let readingDrift = 0;
let verdictDrift = 0;

for (const key of Object.keys(next.routes)) {
  const b = base.routes[key];
  const n = next.routes[key];
  if (!b) { rows.push({ key, note: 'NEW — not in baseline' }); continue; }

  for (const mode of MODES) {
    const bm = b[mode] || {};
    const nm = n[mode] || {};
    baseMs += bm.loadMs || 0;
    nextMs += nm.loadMs || 0;

    if (bm.error || nm.error) {
      rows.push({ key, mode, kind: 'error', from: bm.error ? 'err' : String(bm.status), to: nm.error ? 'err' : String(nm.status) });
      verdictDrift++;
      continue;
    }
    if ((bm.status || 0) !== (nm.status || 0)) {
      rows.push({ key, mode, kind: 'status', from: bm.status, to: nm.status });
      verdictDrift++;
    }
    const dText = (nm.textLen || 0) - (bm.textLen || 0);
    const dCtl = (nm.interactiveCount || 0) - (bm.interactiveCount || 0);
    if (Math.abs(dText) > NOISE || Math.abs(dCtl) > 2) {
      rows.push({ key, mode, kind: 'reading', text: `${bm.textLen} -> ${nm.textLen}`, ctl: `${bm.interactiveCount} -> ${nm.interactiveCount}`, dText, dCtl });
      readingDrift++;
    }
  }

  if (b.darkModeImplemented !== n.darkModeImplemented || b.darkModeBasis !== n.darkModeBasis) {
    rows.push({ key, kind: 'dark', from: `${b.darkModeImplemented}/${b.darkModeBasis}`, to: `${n.darkModeImplemented}/${n.darkModeBasis}` });
    verdictDrift++;
  }
  if (b.horizontalOverflow !== n.horizontalOverflow) {
    rows.push({ key, kind: 'overflow', from: b.horizontalOverflow, to: n.horizontalOverflow });
    verdictDrift++;
  }
}

const gone = Object.keys(base.routes).filter((k) => !next.routes[k]);

console.log(`baseline: ${BASE}  (${Object.keys(base.routes).length} routes)`);
console.log(`new:      ${NEW}  (${Object.keys(next.routes).length} routes)`);
if (gone.length) console.log(`routes in baseline but not re-measured: ${gone.join(', ')}`);
console.log('');

if (!rows.length) console.log('no drift — every route reads the same and carries the same verdicts');
for (const r of rows) {
  if (r.note) { console.log(`  ${r.key}: ${r.note}`); continue; }
  if (r.kind === 'reading') {
    const worse = r.dText < 0 ? 'SHORTER' : 'longer';
    console.log(`  ${r.key} ${r.mode}: text ${r.text} (${r.dText > 0 ? '+' : ''}${r.dText}, ${worse}) · controls ${r.ctl}`);
  } else {
    console.log(`  ${r.key}${r.mode ? ' ' + r.mode : ''}: ${r.kind} ${r.from} -> ${r.to}`);
  }
}

// The per-page wait is what #80 is about. loadMs is measured from page.goto to
// the end of settle(), so it is the whole cost of one reading.
const n = MODES.length * Object.keys(next.routes).length;
console.log('');
console.log(`readings drifted: ${readingDrift} · verdicts drifted: ${verdictDrift}`);
console.log(`total wait: baseline ${(baseMs / 1000).toFixed(1)}s -> new ${(nextMs / 1000).toFixed(1)}s over ${n} readings`);
console.log(`mean per reading: ${(baseMs / n / 1000).toFixed(1)}s -> ${(nextMs / n / 1000).toFixed(1)}s`);

// Slowest first — the pages that never reach networkidle still pay the full
// floor by design, and naming them is the point rather than a footnote.
const slow = [];
for (const key of Object.keys(next.routes)) {
  for (const mode of MODES) {
    const ms = next.routes[key][mode]?.loadMs;
    if (ms) slow.push({ key, mode, ms });
  }
}
slow.sort((a, b) => b.ms - a.ms);
console.log('\nslowest readings:');
for (const s of slow.slice(0, 8)) console.log(`  ${s.key} ${s.mode}: ${(s.ms / 1000).toFixed(1)}s`);

process.exit(verdictDrift ? 1 : 0);
