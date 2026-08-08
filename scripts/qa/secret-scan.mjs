/**
 * Look for credentials committed to this repo — which is PUBLIC.
 *
 * Why this exists: the 03/08 rescue commit force-added the whole apps/ tree.
 * The scan that ran before it looked for the obvious shapes (Supabase JWTs,
 * sk-, ghp_, sbp_, AIza) and found only anon keys. It did not look for short
 * provider-specific credentials, and `apps/03-igud-ads/lib/nedarim.ts` carries
 * a live Nedarim Plus MosadId, ApiValid and ApiPassword as literal fallbacks.
 * Those went public.
 *
 * So this scans for assignment shapes, not just token prefixes: any identifier
 * that reads like a secret being given a literal string value.
 *
 *   node scripts/qa/secret-scan.mjs             # everything git tracks
 *   node scripts/qa/secret-scan.mjs apps/03-igud-ads
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const GIT =
  'C:\\Users\\USER\\AppData\\Local\\GitHubDesktop\\app-3.6.3\\resources\\app\\git\\cmd\\git.exe';

const scope = process.argv.slice(2);
const tracked = execFileSync(GIT, ['ls-files', ...scope], { encoding: 'utf8', maxBuffer: 1 << 28 })
  .split(/\r?\n/)
  .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs|json|html|sql|yml|yaml|sh|ps1|md|env|txt)$/i.test(f))
  .filter((f) => !/node_modules|package-lock|pnpm-lock/.test(f));

// A name that means "secret", assigned a literal that is long enough to be one.
// Deliberately not anchored on a provider prefix: that is what missed nedarim.
//
// `[_-]pass\b` and `[_-]pwd\b` are separate from the `password|passwd` branch
// on purpose: they need the separator so that `bypass` and `compass` are not
// secrets, and without them `ADMIN_PASS = "…"` reads as an ordinary variable.
// That is exactly the spelling that hid a live admin password in
// apps/06-kupot-holim/site/admin.js through every run of this scan.
const NAME =
  '[A-Za-z_][A-Za-z0-9_]*(?:api[_-]?(?:key|valid|password|secret|token)|' +
  'secret|password|passwd|token|private[_-]?key|client[_-]?secret|mosad[_-]?id|' +
  'access[_-]?key|auth[_-]?key|service[_-]?role|[_-]pass\\b|[_-]pwd\\b)';

const ASSIGN = new RegExp(
  `(?<name>${NAME})\\s*[:=]\\s*["'\`](?<value>[^"'\`\\n]{4,})["'\`]`,
  'gi',
);

/**
 * The shape that got past the first scan, and the reason this file exists:
 *
 *   api_valid: process.env.NEDARIM_API_VALID || "LU/Aw5hcm1",
 *
 * The name is right there and the literal is right there, but the literal is
 * not the *first* thing after the colon, so an anchored pattern walks past it.
 * A fallback is not a safer place to keep a credential than a plain assignment;
 * it is a worse one, because it reads as if the value came from the environment.
 */
const FALLBACK = new RegExp(
  `(?<name>${NAME})\\s*[:=][^\\n]*?\\|\\|\\s*["'\`](?<value>[^"'\`\\n]{4,})["'\`]`,
  'gi',
);

/**
 * The third shape, and the one both patterns above are blind to by design:
 *
 *   *   SOME_ADMIN_PASSWORD  plain password — preview only (default: <redacted>)
 *
 * There is no assignment and no quotes — it is a doc comment. ASSIGN and
 * FALLBACK both want `name <op> "literal"`, so a prose default walks free.
 * It should not: apps/27-bkalut-price/server/auth.ts had removed the hardcoded
 * fallback from the code and left the password in the comment describing it,
 * three lines above a SECURITY note saying there is no default. The comment is
 * as public as the code.
 */
const DOC = new RegExp(
  `(?<name>${NAME})[^\\n]{0,80}?\\bdefaults?\\s*[:=]\\s*["'\`]?(?<value>[^\\s)\\]}"'\`,;]{6,})`,
  'gi',
);

const TOKEN = /\b(eyJhbGciOiJ[\w-]{6,}|sbp_[a-z0-9]{20,}|sb_secret_[\w-]{10,}|ghp_[\w]{30,}|github_pat_[\w]{30,}|sk-[\w-]{25,}|re_[\w]{20,}|AIza[\w-]{30,}|xox[baprs]-[\w-]{10,})\b/g;

// Values that are obviously not credentials. `[REDACTED]` and `not-a-real…`
// are here rather than in ACCEPTED because they are self-describing wherever
// they appear — including in documentation that quotes the redaction.
//
// `qa.fixture` joined them for the same reason. Fourteen Playwright checks seed
// localStorage with `access_token: 'qa.fixture.token'` to get past the client
// gate; the real gate is more30_is_admin on the server, so the string is not a
// credential and could not become one. Left unlisted it produced 28 of this
// scan's 29 findings — and a scan whose output is 97% noise is one nobody reads
// to the bottom, where the single real finding was sitting.
const BENIGN =
  /^(process\.env|import\.meta|undefined|null|true|false|localhost|https?:\/\/|\/|\.{1,2}\/|[A-Z_]+$|your[_-]|xxx|placeholder|example|changeme|redacted|\[redacted\]|not-a-real|qa\.fixture|<[^>]+>|\$\{)/i;

/**
 * Known-benign findings, each read and understood rather than pattern-matched
 * away. A scanner that always reports the same five things it cannot act on is
 * a scanner people stop reading, and then it misses the sixth. Every entry
 * here says why it is safe.
 */
const ACCEPTED = [
  { file: 'packages/billing/src/index.ts',
    value: '7016674', why: 'the Mosad (institution) id — public, and documented as not a secret in that file' },
  { file: 'scripts/Use-SupabasePat.ps1',
    value: 'sbp_...', why: 'placeholder shown in usage text' },
];
// Two entries were removed the day the staleness check below was added — the
// nedarim-admin `[REDACTED]` literal and nadlan-pro-smoke's
// `not-a-real-token-just-a-string`. Neither file changed; both values were
// already caught by BENIGN, which runs first, so the entries had never once
// been reached. They read like understanding this scan did not have.

/**
 * Real leaks that are open in core.issues and cannot be closed from here.
 *
 * This is a separate list from ACCEPTED on purpose. ACCEPTED says "read it,
 * it is not a secret". KNOWN says "it IS a secret, it is published, and the
 * decision to remove it is not this scan's to make". Collapsing the two would
 * let a genuine leak be filed under "benign" and quietly stop being a problem.
 *
 * KNOWN entries do not fail the run — otherwise the scan is red forever and
 * stops being read — but they are printed on every run, with their issue
 * number, so nobody mistakes silence for safety.
 */
const KNOWN = [
  { file: 'apps/27-bkalut-price/server/auth.ts',
    value: 'eueu1234',
    issue: 88,
    why:
      'a real admin password, published in the doc comment three lines above the ' +
      'SECURITY note that says there is no default. The code itself is already ' +
      'env-driven and fails closed. Not redacted here because apps/27 deploys to ' +
      '/var/www/bkalut-app/ (its own CLAUDE.md), and bkalut-app is on the protected ' +
      'list — a one-line comment edit is still an edit inside a protected boundary. ' +
      'NEEDS_USER.',
  },
];

// Every suppression records whether it actually matched anything this run. An
// entry that stops matching is a line of dead permission: it looks like the
// scan understands that file when it no longer does, and it silently widens
// what a future edit there could hide. Stale entries fail the run.
const matched = new Map();
const hit = (list, file, value) => {
  const e = list.find(
    (a) => file === a.file && value.startsWith(a.value.replace(/\.\.\.$/, '')),
  );
  if (e) matched.set(e, (matched.get(e) ?? 0) + 1);
  return e;
};
const accepted = (file, value) => hit(ACCEPTED, file, value);
const known = (file, value) => hit(KNOWN, file, value);

/**
 * A Supabase key is only a finding if it is not the anon key. The anon key is
 * designed to be public — it ships in every browser bundle — so reporting it
 * as a leak trains people to ignore this scanner. Decode the role and say so.
 */
function jwtRole(token) {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  let p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  p += '='.repeat((4 - (p.length % 4)) % 4);
  try {
    return JSON.parse(Buffer.from(p, 'base64').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

let hits = 0;
let publicKeys = 0;
let acceptedCount = 0;
const knownFound = [];
for (const file of tracked) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  if (/\.example$/.test(file)) continue;
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    const seen = new Set();
    for (const re of [ASSIGN, FALLBACK, DOC]) {
      for (const m of line.matchAll(re)) {
        const { name, value } = m.groups;
        if (BENIGN.test(value.trim())) continue;
        if (accepted(file, value.trim())) { acceptedCount++; continue; }
        const k = `${name}:${value}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const open = known(file, value.trim());
        if (open) {
          knownFound.push({ ...open, where: `${file}:${i + 1}`, name });
          continue;
        }
        hits++;
        console.log(`${file}:${i + 1}\n  ${name} = ${value.slice(0, 6)}… (${value.length} chars)`);
      }
    }
    // The token match runs on the whole line, so grab the full token, not the
    // truncated one the assignment patterns would have produced.
    for (const m of line.matchAll(/eyJhbGciOiJ[\w-]+\.[\w-]+\.[\w-]+/g)) {
      const role = jwtRole(m[0]);
      if (role === 'anon') { publicKeys++; continue; }
      hits++;
      console.log(`${file}:${i + 1}\n  supabase key role=${role ?? 'unknown'} — NOT anon`);
    }
    for (const m of line.matchAll(TOKEN)) {
      if (m[0].startsWith('eyJhbGciOiJ')) continue; // handled above
      hits++;
      console.log(`${file}:${i + 1}\n  literal token ${m[0].slice(0, 12)}… (${m[0].length} chars)`);
    }
  });
}

if (knownFound.length) {
  console.log(`\nknown and still published — open in core.issues, not new:`);
  for (const k of knownFound) {
    console.log(`  ${k.where}  ${k.name}  (core.issues #${k.issue})`);
    console.log(`    ${k.why}`);
  }
}

// A suppression that matched nothing has outlived the thing it excused.
const stale = [...ACCEPTED, ...KNOWN].filter((e) => !matched.has(e));
if (stale.length) {
  console.log(`\nstale suppressions — matched nothing this run, delete them:`);
  for (const e of stale) console.log(`  ${e.file}  ${e.value}`);
}

console.log(
  `\nscanned ${tracked.length} tracked files · ${hits} new finding(s)` +
    ` · ${knownFound.length} known leak(s) still published` +
    ` · ${publicKeys} anon key(s) skipped (public by design)` +
    ` · ${acceptedCount} known-benign accepted (see ACCEPTED above)` +
    ` · ${stale.length} stale suppression(s)`,
);
process.exit(hits || stale.length ? 1 : 0);
