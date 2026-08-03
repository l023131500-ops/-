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
const NAME =
  '[A-Za-z_][A-Za-z0-9_]*(?:api[_-]?(?:key|valid|password|secret|token)|' +
  'secret|password|passwd|token|private[_-]?key|client[_-]?secret|mosad[_-]?id|' +
  'access[_-]?key|auth[_-]?key|service[_-]?role)';

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

const TOKEN = /\b(eyJhbGciOiJ[\w-]{6,}|sbp_[a-z0-9]{20,}|sb_secret_[\w-]{10,}|ghp_[\w]{30,}|github_pat_[\w]{30,}|sk-[\w-]{25,}|re_[\w]{20,}|AIza[\w-]{30,}|xox[baprs]-[\w-]{10,})\b/g;

// Values that are obviously not credentials.
const BENIGN =
  /^(process\.env|import\.meta|undefined|null|true|false|localhost|https?:\/\/|\/|\.{1,2}\/|[A-Z_]+$|your[_-]|xxx|placeholder|example|changeme|<[^>]+>|\$\{)/i;

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
for (const file of tracked) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  if (/\.example$/.test(file)) continue;
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    const seen = new Set();
    for (const re of [ASSIGN, FALLBACK]) {
      for (const m of line.matchAll(re)) {
        const { name, value } = m.groups;
        if (BENIGN.test(value.trim())) continue;
        const k = `${name}:${value}`;
        if (seen.has(k)) continue;
        seen.add(k);
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

console.log(
  `\nscanned ${tracked.length} tracked files · ${hits} finding(s)` +
    ` · ${publicKeys} anon key(s) skipped (public by design)`,
);
process.exit(hits ? 1 : 0);
