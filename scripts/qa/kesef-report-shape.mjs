/**
 * core.issues #86 — the kesef reader, checked before a screen is drawn on it.
 *
 * 0052 added public.more30_admin_kesef_report(). The screen that will read it
 * has not been written yet, and this script is the contract between the two:
 * it takes the payload the function actually returned (QA/platform/kesef-report-0809/_results.json,
 * captured against the live hub on 09/08) and asserts the things a screen is
 * entitled to assume.
 *
 * Why the checks are what they are:
 *
 *   • totals.rows must equal the sum of row_counts. The function counts every
 *     base table in a loop and accumulates as it goes; if the two ever disagree
 *     the loop skipped a table, and a screen showing "283 rows" would be
 *     describing a set it did not read.
 *
 *   • empty_tables must be exactly the tables whose count is 0 — not a hand
 *     kept list. #86's own evidence said 34 empty of 38; this says 32 of 36,
 *     and the difference is the two v_* views. A view is derived, and counting
 *     its rows would count the same facts twice.
 *
 *   • coverage.of must equal the authority count, so "0 of 259" is a rate and
 *     not two unrelated numbers printed side by side.
 *
 *   • ingestion must carry one row per data_source, and ok must be exactly
 *     (last_ok_at is not null). is_active is a setting, not a state: twelve
 *     active sources that never succeeded is the finding, and a screen that
 *     drew is_active as a green light would report the opposite of the truth.
 *
 * What this does NOT do: reach the network or the database. It has no keys and
 * wants none (#88) — the payload was captured through the MCP connection and is
 * committed as evidence. Rerun the capture, replace the file, run this.
 *
 *   node scripts/qa/kesef-report-shape.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../../QA/platform/kesef-report-0809/_results.json');
const ev = JSON.parse(readFileSync(file, 'utf8'));
const r = ev.report;

const checks = [];
const check = (ok, what) => checks.push({ ok: !!ok, what });

const counts = Object.values(r.row_counts);
const sum = counts.reduce((a, b) => a + b, 0);

check(sum === r.totals.rows,
  `totals.rows (${r.totals.rows}) is the sum of row_counts (${sum})`);
check(Object.keys(r.row_counts).length === r.totals.tables,
  `row_counts covers every base table (${r.totals.tables})`);

const emptyFromCounts = Object.entries(r.row_counts)
  .filter(([, n]) => n === 0).map(([t]) => t).sort();
const emptyListed = [...(ev.report.empty_tables ?? [])].sort();
check(emptyListed.length === 0 || emptyListed.join(',') === emptyFromCounts.join(','),
  'empty_tables, when present, is exactly the tables counted at 0');
check(emptyFromCounts.length === r.totals.empty_tables,
  `totals.empty_tables (${r.totals.empty_tables}) matches the tables counted at 0 (${emptyFromCounts.length})`);
check(!Object.keys(r.row_counts).some((t) => t.startsWith('v_')),
  'no derived view is counted as a table — v_authority_year_summary and v_topic_spending are excluded');

check(r.coverage.of === r.totals.authorities,
  `coverage.of (${r.coverage.of}) is the authority count (${r.totals.authorities})`);
check(Object.values(r.coverage.fields).every((n) => n <= r.coverage.of),
  'no coverage field claims more filled rows than there are rows');

const byStatus = Object.values(r.catalog.authorities_by_status).reduce((a, b) => a + b, 0);
const byDistrict = Object.values(r.catalog.authorities_by_district).reduce((a, b) => a + b, 0);
check(byStatus === r.totals.authorities, `authorities_by_status sums to ${r.totals.authorities}`);
check(byDistrict === r.totals.authorities, `authorities_by_district sums to ${r.totals.authorities}`);

check(r.ingestion.length === r.totals.sources,
  `ingestion carries one row per data_source (${r.totals.sources})`);
check(r.ingestion.every((s) => s.ok === (s.last_ok_at !== null)),
  'ok is exactly (last_ok_at is not null) on every source');
check(r.ingestion.filter((s) => s.ok).length === r.totals.sources_ok,
  `totals.sources_ok (${r.totals.sources_ok}) matches the sources with a success`);
check(r.ingestion.reduce((a, s) => a + s.runs, 0) === r.totals.sync_runs,
  `the runs on the sources sum to totals.sync_runs (${r.totals.sync_runs})`);
check(r.ingestion.some((s) => s.is_active && !s.ok),
  'at least one source is active and has never succeeded — is_active is a setting, not a state');

check(r.product.fact_financial === r.totals.facts,
  'product.fact_financial and totals.facts are the same number');
check(r.totals.rows > 0 && r.totals.facts === 0,
  'the finding itself: rows exist and not one of them is an ingested fact');

check(ev.guard.non_admin_caller.raised.includes('42501'),
  'a non-admin caller is refused with 42501, measured against the live function');
check(ev.guard.admin_caller.is_admin === true,
  'the admin caller is recognised, so the refusal above is the guard and not a broken session');

const failures = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.what}`);
console.log(`\n${checks.length - failures.length}/${checks.length} pass`);
process.exit(failures.length ? 1 : 0);
