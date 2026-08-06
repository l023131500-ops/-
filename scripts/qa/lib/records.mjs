/**
 * Write a QA record file without destroying the routes this run did not visit.
 *
 * Why this exists. Four scanners — placeholder-leak, dead-controls, icon-noise,
 * system-facts — accept a route filter on argv and then write their result with
 * a plain writeFileSync over the whole record. So the full sweep produces a
 * 25-route record, and the very next `node scripts/qa/placeholder-leak.mjs
 * zchuyot` replaces that file with a one-route object. Nothing errors and the
 * command prints a cheerful "1 routes · 0 values shown that do not exist".
 *
 * That is what happened here: QA/platform/_leaks.json went from 25 routes to
 * one, and the loss only surfaced because the deletion showed up in a diff. A
 * record file that silently shrinks to whatever was last spot-checked is worse
 * than no record, because the next reader takes "not in the file" for "not
 * scanned" or for "clean" depending on which way they lean.
 *
 * The rule this follows: a filtered run updates its own entries and leaves the
 * rest alone; only a full run may define the whole file. It never invents an
 * entry for a route it did not visit — untouched entries are carried through
 * exactly as they were, still carrying whatever run wrote them.
 *
 *   import { writeRecord } from './lib/records.mjs';
 *   writeRecord('QA/platform/_leaks.json', out, { filtered: only.length > 0 });
 */
import fs from 'node:fs';
import path from 'node:path';

export function writeRecord(file, out, { filtered = false } = {}) {
  let merged = out;
  let carried = [];

  if (filtered) {
    let prior = null;
    try {
      prior = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // No prior record, or one that is not readable JSON. A filtered run then
      // has nothing to preserve and writes only what it measured — which is
      // honest, and the count printed below says so.
      prior = null;
    }
    if (prior && typeof prior === 'object' && !Array.isArray(prior)) {
      carried = Object.keys(prior).filter((k) => !(k in out));
      merged = { ...prior, ...out };
    }
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf8');

  if (carried.length) {
    console.log(
      `-> ${file} (${Object.keys(out).length} updated, ${carried.length} kept from the previous run)`,
    );
  } else {
    console.log(`-> ${file} (${Object.keys(merged).length} routes)`);
  }
  return merged;
}
