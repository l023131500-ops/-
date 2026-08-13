/**
 * Is any other system shipping double-encoded Hebrew?
 *
 * The zchuyot rights catalogue was served as gibberish for an unknown length of
 * time: src/data/rightsData.ts held UTF-8 bytes that had been read as
 * Windows-1255 and saved back, across 214 of its 378 lines. It reached the
 * built bundle and therefore the customer. Nothing caught it, because nothing
 * was looking — it was found by eye while reading copy for something else.
 *
 * This looks across every source tree so the next one is not found by accident.
 *
 * ⚠️ Source trees are not enough, and two live mounts proved it on 13/08. The
 * HTML that production serves for a mounted app is NOT the HTML vite builds:
 * scripts/prerender-spa.mjs bakes the first paint into it, and the result is
 * hand-copied into _deploy/<project>/<mount>/index.html, which has no
 * counterpart in the app's public/ or dist/. Both zchuyot and torah were
 * corrupted there — a PowerShell write without -Encoding, cp1255 being this
 * machine's ANSI codepage — while every source file under apps/ stayed clean.
 * So _deploy/**\/*.html is scanned too. Only .html: the bundles beside it are
 * built from sources this scan already covers, and reading all of them costs
 * far more than it finds.
 *
 * ⚠️ The detection rule matters. A lone ׳ (U+05F3 geresh) is perfectly good
 * Hebrew — צ׳יפ, ג׳ינס, ר׳ — and appears in healthy comments and copy. Only a
 * RUN of them signals corruption, because the mangling emits one per letter.
 * Flagging the character alone would condemn correct prose, and a check that
 * cries wolf gets switched off.
 *
 *   node scripts/qa/mojibake-scan.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['apps', 'portal', 'packages', 'scripts', 'supabase'];
// what production actually serves, scanned separately and narrowly (see header)
const DEPLOY_ROOT = '_deploy';
const DEPLOY_EXT = new Set(['.html']);
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.md', '.css', '.sql']);
const SKIP = new Set(['node_modules', '.next', 'dist', 'build', '.git', '.vercel', 'coverage', '.turbo']);

// three or more markers separated by a single character: the fingerprint of
// per-letter mangling, not of ordinary Hebrew punctuation.
const RUN = /׳[^\s]׳[^\s]׳/;

const findings = [];
let scanned = 0;

function walk(dir, ext = EXT) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walk(full, ext);
    } else if (ext.has(path.extname(e.name))) {
      scanned++;
      let text;
      try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
      if (!RUN.test(text)) continue;
      const lines = text.split(/\r?\n/);
      const hits = lines.filter((l) => RUN.test(l));
      findings.push({
        file: full.replace(/\\/g, '/'),
        lines: hits.length,
        totalLines: lines.length,
        sample: (hits[0] || '').trim().slice(0, 70),
      });
    }
  }
}

for (const r of ROOTS) if (fs.existsSync(r)) walk(r);
const sourceFiles = scanned;
if (fs.existsSync(DEPLOY_ROOT)) walk(DEPLOY_ROOT, DEPLOY_EXT);

console.log(`scanned ${sourceFiles} source files under: ${ROOTS.join(', ')}`);
console.log(`scanned ${scanned - sourceFiles} served .html files under: ${DEPLOY_ROOT}`);
if (!findings.length) {
  console.log('\nno double-encoded Hebrew found.');
} else {
  console.log(`\n${findings.length} file(s) with double-encoded Hebrew:\n`);
  findings
    .sort((a, b) => b.lines - a.lines)
    .forEach((f) => console.log(`  ${String(f.lines).padStart(4)} / ${String(f.totalLines).padEnd(5)} lines  ${f.file}\n        ${f.sample}`));
}
console.log(
  '\nA lone geresh is valid Hebrew and is not flagged; only runs are, because\n' +
    'the mangling emits one marker per letter.',
);
process.exit(findings.length ? 1 : 0);
