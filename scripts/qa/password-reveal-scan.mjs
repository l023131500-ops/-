#!/usr/bin/env node
// Password fields that have no "show password" control (§1א, core.issues #213).
//
// Why this file exists at all: the first sweep looked for a literal
// type="password" and read every match as a missing reveal. That inference holds
// for JSX only — a JSX field that already has a reveal is written
// type={shown ? 'text' : 'password'} and cannot match. Static HTML has no other
// way to spell the attribute: the reveal flips it from script at runtime, so an
// HTML field matches whether or not it has one. Run against apps/06 the first
// sweep reported a bug on a field whose button, CSS, aria-controls and handler
// were all already in place (site/admin.js:79). One idiom, two meanings.
//
// So each idiom is decided on its own terms:
//   JSX/TSX/vue/svelte — a dynamic type={...'password'} IS the reveal. A static
//                        one is the finding.
//   HTML and .js       — find the control, don't infer it: a button that names
//                        the field in aria-controls, plus a handler that flips
//                        the type, in the page or in any same-folder script the
//                        page loads. A field with no id cannot be resolved this
//                        way and is reported as UNKNOWN, never as clean.
//
// .js is in that list because two systems draw their whole UI from template
// literals inside plain script files (19 shiurim, 35 kioskfleet) — six fields
// the markup-only walk never opened. Same idiom as HTML, same rules.
//
// Comments are blanked before matching. A comment that *describes* the idiom is
// not a field, and the scan spent a day reporting one as the campaign's last
// open bug (24 galil GabaiPortal.tsx:1416 — prose about the reveal button that
// the field twelve lines below already had).
//
// Two controls run on every invocation and the scan exits 2 if either fails, so
// a green report can't come from a scan that stopped reading files.
//
// Usage: node scripts/qa/password-reveal-scan.mjs [--json]

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage',
  '.vercel', '.turbo', '_archive', 'gannenet-incoming', 'QA', '_fixtures',
]);
// The QA tooling itself. Every scan that hunts for an idiom has to spell that
// idiom out, so scripts/qa reports its own search patterns as bare fields — two
// of them the moment .js joined the walk. Not a product surface; skipped by
// path, not by folder name, so a real `qa/` inside an app still gets scanned.
// Control files under it are still resolved, because controls are inspected
// explicitly and not through the walk.
const SKIP_PATHS = new Set(['scripts/qa']);
// Protected systems — read nothing, report nothing (RUN_INSTRUCTIONS "מוגן").
const PROTECTED = /(^|[\\/])(08-|09-|bkalut-app|bkalot-admin|zr_|NEDARIM3873|csj|csj_src|igud)/i;

const MARKUP = new Set(['.html', '.htm']);
const JSXISH = new Set(['.jsx', '.tsx', '.vue', '.svelte']);
// Plain script files that build markup as strings. Decided by the HTML rules.
const SCRIPTISH = new Set(['.js', '.mjs', '.cjs']);

const STATIC_PW = /type\s*=\s*(["'])password\1/gi;
const DYNAMIC_PW = /type\s*=\s*\{[^}]*["']password["'][^}]*\}/gi;
// A handler that actually flips the attribute. Both spellings are in the tree:
// portal/public/login.html assigns .type, others use setAttribute.
const FLIPS_TYPE = [
  /\.type\s*=\s*[^;\n]*["']text["']/,
  /setAttribute\(\s*["']type["']\s*,/,
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (PROTECTED.test(sep + relative(ROOT, full))) continue;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (SKIP_PATHS.has(relative(ROOT, full).split(sep).join('/'))) continue;
      walk(full, out);
    } else if (MARKUP.has(extname(e.name)) || JSXISH.has(extname(e.name))
               || SCRIPTISH.has(extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

// Every <script src="..."> the page loads from its own folder, concatenated.
// A reveal handler for a static page almost always lives in a sibling file
// (06 admin.html -> admin.js), so reading the page alone would flag it.
function siblingScripts(file, text) {
  let js = '';
  for (const m of text.matchAll(/<script[^>]+src\s*=\s*["']([^"']+)["']/gi)) {
    const src = m[1];
    if (/^(https?:)?\/\//.test(src)) continue;
    const path = join(dirname(file), src.split('?')[0]);
    if (existsSync(path) && statSync(path).isFile()) {
      try { js += '\n' + readFileSync(path, 'utf8'); } catch { /* unreadable */ }
    }
  }
  return js;
}

// Blank out comments, keeping every byte position so line numbers stay exact.
// Deliberately conservative: a `//` is only a comment when it opens the line,
// because `href="https://…"` mid-line would otherwise swallow the rest of it —
// and a field drawn after a URL on the same line would vanish from the scan.
// Blinding the scan is a worse failure than the false positive this removes.
const blank = (s) => s.replace(/[^\n]/g, ' ');
function stripComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, blank)          // HTML
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, blank) // JSX {/* … */}
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, blank)   // block comment opening a line
    .replace(/^[ \t]*\/\/[^\n]*/gm, blank);        // line comment opening a line
}

// The id of the input that this static type="password" belongs to.
function fieldIdAt(text, index) {
  const start = text.lastIndexOf('<', index);
  const end = text.indexOf('>', index);
  if (start < 0 || end < 0) return null;
  const tag = text.slice(start, end);
  const id = tag.match(/\bid\s*=\s*["']([^"']+)["']/);
  return id ? id[1] : null;
}

function inspect(file) {
  const ext = extname(file);
  // Everything below reads the comment-blanked copy: a commented-out reveal
  // button must not clear a live field either, not just the other way round.
  const text = stripComments(readFileSync(file, 'utf8'));
  const rel = relative(ROOT, file).split(sep).join('/');
  const findings = [];

  if (JSXISH.has(ext)) {
    // Dynamic type IS the reveal; a static one in JSX is the finding.
    for (const m of text.matchAll(STATIC_PW)) {
      findings.push({
        file: rel, line: lineOf(text, m.index), field: fieldIdAt(text, m.index),
        verdict: 'MISSING', why: 'JSX field with a hard-coded type="password" — no state drives it',
      });
    }
    return findings;
  }

  const js = text + stripComments(siblingScripts(file, text));
  const flips = FLIPS_TYPE.some((re) => re.test(js));
  for (const m of text.matchAll(STATIC_PW)) {
    const id = fieldIdAt(text, m.index);
    const line = lineOf(text, m.index);
    if (!id) {
      findings.push({ file: rel, line, field: null, verdict: 'UNKNOWN',
        why: 'field has no id — no aria-controls can name it, decide by eye' });
      continue;
    }
    const named = new RegExp(`aria-controls\\s*=\\s*["']${escapeRe(id)}["']`).test(text);
    if (named && flips) {
      findings.push({ file: rel, line, field: id, verdict: 'OK',
        why: 'a control names the field in aria-controls and a handler flips the type' });
    } else {
      findings.push({ file: rel, line, field: id, verdict: 'MISSING',
        why: named ? 'a control names the field but nothing flips the type'
                   : 'no control names this field in aria-controls' });
    }
  }
  return findings;
}

const lineOf = (text, i) => text.slice(0, i).split('\n').length;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- controls -------------------------------------------------------------
// Positive: a field that is known-good must come back OK. Negative: a field
// that is known-bare must come back MISSING. If the scan ever stops reading
// files, or the aria-controls convention changes, these fail before the summary.
//
// The negative one is a fixture and not a live file, and that is the whole
// point: it used to be apps/35-kioskfleet/server/public/console.html#login-pass,
// that field was fixed on 13/08, and from then on the control failed on every
// run — the scan exited 2 whether or not it had found anything, which is a
// green light and a red light at once. A control aimed at a live bug dies the
// moment the campaign succeeds.
//
// The third is want:'NONE' — a file that mentions the idiom in prose and must
// produce no finding at all. Without it, restoring the old comment-blind match
// would just make 24 galil light up again and read as a regression in galil.
const CONTROLS = [
  { file: 'apps/06-kupot-holim/site/admin.html', field: 'adminPass', want: 'OK' },
  { file: 'scripts/qa/_fixtures/pw-bare.html', field: 'bare', want: 'MISSING' },
  { file: 'scripts/qa/_fixtures/pw-commented.jsx', want: 'NONE' },
];

const files = walk(ROOT);
const all = files.flatMap((f) => { try { return inspect(f); } catch { return []; } });

// The fixture is outside the walk (SKIP_DIRS), so controls are resolved against
// the walk plus an explicit inspect of each control file. That also means a
// control whose file was deleted or renamed reports NOT-FOUND instead of
// quietly passing.
const controlPool = [...all, ...CONTROLS.flatMap((c) => {
  const p = join(ROOT, c.file);
  try { return existsSync(p) ? inspect(p) : []; } catch { return []; }
})];

let controlsOk = true;
for (const c of CONTROLS) {
  let got;
  if (c.want === 'NONE') {
    // A file that must exist and must yield nothing. Missing file != clean.
    const found = controlPool.filter((f) => f.file === c.file);
    got = !existsSync(join(ROOT, c.file)) ? 'NOT-FOUND'
        : found.length ? found.map((f) => `${f.verdict}@${f.line}`).join(',') : 'NONE';
  } else {
    const hit = controlPool.find((f) => f.file === c.file && f.field === c.field);
    got = hit ? hit.verdict : 'NOT-FOUND';
  }
  const pass = got === c.want;
  if (!pass) controlsOk = false;
  const name = c.field ? `${c.file}#${c.field}` : c.file;
  console.log(`control ${pass ? 'PASS' : 'FAIL'}: ${name} want ${c.want}, got ${got}`);
}

const missing = all.filter((f) => f.verdict === 'MISSING');
const unknown = all.filter((f) => f.verdict === 'UNKNOWN');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ scanned: files.length, fields: all.length, findings: all }, null, 2));
} else {
  console.log(`\nscanned ${files.length} markup files, found ${all.length} password fields`);
  console.log(`OK ${all.length - missing.length - unknown.length} · MISSING ${missing.length} · UNKNOWN ${unknown.length}\n`);
  for (const f of [...missing, ...unknown]) {
    console.log(`${f.verdict}  ${f.file}:${f.line}  #${f.field ?? '(no id)'}  — ${f.why}`);
  }
}

process.exit(!controlsOk ? 2 : (missing.length ? 1 : 0));
