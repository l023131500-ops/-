/**
 * Does any server-side console.* hand a whole payload object to the platform
 * log?
 *
 * Found in gesher (31-hebrew-bridge-crm): the public contact form logged
 * `payload` on every submission — a member of the public's name, e-mail, phone
 * and free-text message — and the outbox dispatcher then logged the same
 * object again on its way out. Two copies of every lead in the platform log,
 * on a CRM that ships a consent module for controlling who may see exactly
 * those fields.
 *
 * The rule this enforces is narrow and mechanical: log identifiers, not
 * payloads. Two shapes are flagged, and the second exists because the first
 * version of this scanner missed one of the very defects it was written for:
 *
 *   1. a bare identifier named like a payload —  console.log("x", payload)
 *   2. an object literal carrying a personal field —
 *      console.log("x", { id, payload: JSON.parse(payload) })
 *
 * Shape 2 is how outbox-dispatch.ts leaked, and a self-test against the
 * pre-fix files is what exposed the gap: the scanner reported 1 finding where
 * there were 2. A scanner is only worth its zero if it has been shown to
 * return non-zero on the thing it is looking for.
 *
 * It deliberately does NOT try to judge whether the data is really personal —
 * that needs a human. It points at the places worth looking.
 *
 * Run: node scripts/qa/pii-log-scan.mjs [appDir ...]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["apps/31-hebrew-bridge-crm/src"];

const SUSPECT = /^(payload|data|lead|client|clients|body|form|input|row|rows|user|profile|result|res|json|values|fields)$/;

/** console.x(...) calls with a bare suspect identifier among the arguments. */
const CALL = /console\.(log|info|warn|error|debug)\s*\(([^;]*?)\)\s*;/gs;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

let findings = 0;
let scanned = 0;

for (const t of targets) {
  const root = path.resolve(repo, t);
  if (!fs.existsSync(root)) {
    console.log(`skip (missing): ${t}`);
    continue;
  }
  for (const file of walk(root)) {
    scanned++;
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(CALL)) {
      const args = m[2];
      // Split only at top level, so object literals stay in one piece.
      const parts = [];
      let depth = 0;
      let cur = "";
      for (const ch of args) {
        if ("([{".includes(ch)) depth++;
        if (")]}".includes(ch)) depth--;
        if (ch === "," && depth === 0) {
          parts.push(cur);
          cur = "";
        } else cur += ch;
      }
      parts.push(cur);

      const trimmed = parts.map((p) => p.trim());
      const bad = trimmed.filter((p) => SUSPECT.test(p));

      // Shape 2: an object literal with a personal-looking key whose value is
      // not plainly an id. `{ lead_id: x }` is fine; `{ payload: x }` is not.
      for (const p of trimmed) {
        if (!p.startsWith("{")) continue;
        for (const k of p.matchAll(/(^|[{,\s])(payload|body|message|email|phone|name|full_name|contact_info|data)\s*:/g)) {
          bad.push(`{ ${k[2]}: … }`);
        }
      }

      if (!bad.length) continue;

      const line = src.slice(0, m.index).split("\n").length;
      console.log(
        `${path.relative(repo, file).replace(/\\/g, "/")}:${line}  console.${m[1]}(... ${bad.join(", ")} ...)`,
      );
      findings++;
    }
  }
}

console.log(`\n${scanned} files scanned, ${findings} call(s) logging a whole object`);
process.exit(findings ? 1 : 0);
