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
 * payloads. Three shapes are flagged, and each of the last two exists because
 * an earlier version of this scanner missed a defect it was written for:
 *
 *   1. a bare identifier named like a payload —  console.log("x", payload)
 *   2. an object literal with a personal key —   console.log("x", { payload: p })
 *   3. the same, written shorthand —             console.log("x", { phone, message })
 *
 * Shape 2 is how outbox-dispatch.ts leaked. Shape 3 was added after the first
 * sibling sweep: the scanner reported nothing in 27-bkalut-price, where
 * `server/yemot.ts` logs `{ url, phone, message, ... }` — a customer's phone
 * number and the text of the voice message read out to them — on every send.
 * ES6 shorthand omits the colon, and the shape-2 pattern required one.
 *
 * A scanner is only worth its zero if it has been shown to return non-zero on
 * the thing it is looking for, so `--self-test` runs all three shapes (and
 * three near-misses that must NOT fire) through the real matcher.
 *
 * It deliberately does NOT try to judge whether the data is really personal,
 * nor whether the file is reachable in production — both need a human. It
 * points at the places worth looking.
 *
 * Run: node scripts/qa/pii-log-scan.mjs [appDir ...]
 *      node scripts/qa/pii-log-scan.mjs --self-test
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");

/**
 * Generated output, not source. Left in, these bury the real findings: the
 * first sweep returned 12 hits, and 6 of them were the same two vendored
 * Supabase realtime files copied into .output/ and .vercel/output/ by a build.
 * Nobody can fix a console.log in a build artefact.
 */
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".output",
  ".vercel",
  ".turbo",
  ".git",
  "coverage",
]);

const SUSPECT =
  /^(payload|data|lead|client|clients|body|form|input|row|rows|user|profile|result|res|json|values|fields)$/;

/**
 * Personal- or secret-looking keys, matched whether written `key:`, `key,` or
 * `key }`. The credential half of this list was added after the first sweep:
 * 24-galilee-connect-hub logged `{ data, dbError, passwordEntered: password }`
 * on its admin login, and only `data` was in the list — the typed password
 * would have gone unflagged if the same line had not also dumped the rows.
 */
const PERSONAL_KEY =
  /(^|[{,\s])(\w*(?:password|passwd|secret|token|api_?key|credential)\w*|payload|body|message|email|phone|name|full_name|contact_info|data)\s*(:|,|\}|$)/gi;

/** console.x(...) calls. */
const CALL = /console\.(log|info|warn|error|debug)\s*\(([^;]*?)\)\s*;/gs;

/** Split call arguments at top level, so object literals stay in one piece. */
function topLevelArgs(args) {
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
  return parts.map((p) => p.trim());
}

/** The whole judgement, in one place, so --self-test exercises the real thing. */
function inspect(src) {
  const hits = [];
  for (const m of src.matchAll(CALL)) {
    const parts = topLevelArgs(m[2]);
    const bad = parts.filter((p) => SUSPECT.test(p));

    for (const p of parts) {
      if (!p.startsWith("{")) continue;
      for (const k of p.matchAll(PERSONAL_KEY)) bad.push(`{ ${k[2]} }`);
    }

    if (!bad.length) continue;
    hits.push({
      method: m[1],
      what: [...new Set(bad)].join(", "),
      line: src.slice(0, m.index).split("\n").length,
    });
  }
  return hits;
}

/** This file's own self-test fixtures are, by construction, the thing it hunts. */
const SELF = fileURLToPath(import.meta.url);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && p !== SELF) out.push(p);
  }
  return out;
}

// ─── self-test ───────────────────────────────────────────────────────────────

if (process.argv.includes("--self-test")) {
  const MUST_FIRE = [
    ['shape 1 — bare payload', 'console.log("lead", payload);'],
    ['shape 2 — keyed', 'console.log("out", { id, payload: JSON.parse(raw) });'],
    ['shape 3 — shorthand', 'console.log("[yemot] req:", { url, phone, message, keyLen });'],
    ['shape 3 — single shorthand', "console.log('x', { phone });"],
    ['credential key', "console.log('login', { ok, passwordEntered: password });"],
    ['credential key, prefixed', "console.log('auth', { access_token: t });"],
  ];
  const MUST_NOT_FIRE = [
    ["identifier only", 'console.log("done");'],
    ["id-shaped keys", 'console.log("out", { lead_id, message_id, row_count });'],
    ["a plain string", 'console.error("send failed: " + err.message);'],
  ];

  let bad = 0;
  for (const [label, src] of MUST_FIRE) {
    const n = inspect(src).length;
    console.log(`${n ? "caught " : "MISSED "} ${label}`);
    if (!n) bad++;
  }
  for (const [label, src] of MUST_NOT_FIRE) {
    const n = inspect(src).length;
    console.log(`${n ? "FALSE ALARM" : "quiet  "} ${label}`);
    if (n) bad++;
  }
  console.log(
    `\nself-test: ${MUST_FIRE.length + MUST_NOT_FIRE.length - bad}/${
      MUST_FIRE.length + MUST_NOT_FIRE.length
    } correct`,
  );
  process.exit(bad ? 1 : 0);
}

// ─── sweep ───────────────────────────────────────────────────────────────────

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["apps/31-hebrew-bridge-crm/src"];

/**
 * Files whose hits are real but unreachable, each with the check that says so.
 * They are reported separately rather than deleted from the output: a hit that
 * disappears is a hit nobody re-checks, and "unrouted" expires the day someone
 * adds a route.
 */
const KNOWN_PATH = path.join(repo, "QA/platform/pii-log-known.json");
const known = new Map(
  (fs.existsSync(KNOWN_PATH)
    ? JSON.parse(fs.readFileSync(KNOWN_PATH, "utf8")).known
    : []
  ).map((k) => [k.file, k]),
);

let findings = 0;
let excused = 0;
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
    const rel = path.relative(repo, file).replace(/\\/g, "/");
    for (const hit of inspect(src)) {
      const excuse = known.get(rel);
      if (excuse) {
        console.log(`known  ${rel}:${hit.line}  (${excuse.reason})`);
        excused++;
        continue;
      }
      console.log(`${rel}:${hit.line}  console.${hit.method}(... ${hit.what} ...)`);
      findings++;
    }
  }
}

console.log(
  `\n${scanned} files scanned, ${findings} call(s) logging a whole object` +
    (excused ? `, ${excused} known-unreachable (QA/platform/pii-log-known.json)` : ""),
);
process.exit(findings ? 1 : 0);
