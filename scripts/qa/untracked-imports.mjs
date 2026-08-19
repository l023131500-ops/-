#!/usr/bin/env node
// Finds imports in TRACKED sources that point at files git does not have.
//
// .gitignore line 29 is `/apps/**`, line 43 is `/_deploy/**` and line 47 is
// `/admin/deploy/**`, so every source file under those trees enters the repo only
// through `git add -f`. Forget the -f once and the commit still builds locally —
// the file is right there on disk — while a clean clone gets a tracked file
// importing something that was never committed. Nothing in the normal loop
// catches that: tsc, vite and the dev server all read the working tree.
//
// So: walk every tracked source file, resolve its relative and `@/` imports the
// way the bundler would, and classify each target as tracked, untracked-on-disk
// (the .gitignore trap) or missing entirely (a genuinely broken import).
//
//   node scripts/qa/untracked-imports.mjs            # every scanned root
//   node scripts/qa/untracked-imports.mjs 16-chatzor-connect
//   node scripts/qa/untracked-imports.mjs --root=_deploy
//   node scripts/qa/untracked-imports.mjs --json

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const GIT =
  process.env.GIT_EXE ||
  'C:\\Users\\USER\\AppData\\Local\\GitHubDesktop\\app-3.6.3\\resources\\app\\git\\cmd\\git.exe'

const ROOT = path.resolve(process.argv[1], '../../..')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const only = args.filter((a) => !a.startsWith('--'))
const rootFilter = args.find((a) => a.startsWith('--root='))?.slice('--root='.length)

// Every tracked source tree, not just apps/. `_deploy/<project>/api/**` is the
// one that reaches production most directly: those are Vercel serverless
// functions compiled *on Vercel from a clean clone*, so a file missing from git
// is a runtime 500 rather than a local inconvenience. QA/ is evidence, not
// source, and supabase/ is SQL — neither is scanned.
//
// `nested: true` means the unit is <root>/<name> (each app/project resolves its
// own `@/`); otherwise the whole root is one unit.
const ROOTS = [
  { dir: 'apps', nested: true, ignored: true },
  { dir: '_deploy', nested: true, ignored: true },
  { dir: 'packages', nested: true, ignored: false },
  { dir: 'admin', nested: false, ignored: false },
  { dir: 'portal', nested: false, ignored: false },
  { dir: 'sites', nested: false, ignored: false },
  { dir: 'scripts', nested: false, ignored: false },
  { dir: 'tooling', nested: false, ignored: false },
].filter((r) => !rootFilter || r.dir === rootFilter)

// Extensions the bundler will try, in order, for an extensionless specifier.
const RESOLVE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css']
// Files worth parsing for imports at all.
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function tracked() {
  const out = execFileSync(GIT, ['ls-files', '-z', '--', ...ROOTS.map((r) => r.dir + '/')], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  }).toString('utf8')
  return new Set(out.split('\0').filter(Boolean))
}

const ROOT_BY_DIR = new Map(ROOTS.map((r) => [r.dir, r]))

// The unit a file belongs to: `apps/16-chatzor-connect` under a nested root,
// plain `admin` under a flat one. Alias roots and the orphan walk are per unit.
function unitOf(file) {
  const parts = file.split('/')
  const cfg = ROOT_BY_DIR.get(parts[0])
  if (!cfg) return null
  if (!cfg.nested) return cfg.dir
  return parts.length > 1 ? parts.slice(0, 2).join('/') : null
}

// A committed esbuild/vite bundle is not a source file: its `require("./get")`
// calls are vendored library internals that resolve inside node_modules at build
// time, not paths into this repo. Reading them produces nothing but noise, so
// files this large are skipped and counted separately.
const BUNDLE_BYTES = 300 * 1024
// dist/ and build/ are gitignored on purpose (line 6-7) and reproduced by the
// build, so a tracked file importing into them is expected, not a lost file.
// admin/deploy/ is the same: scripts/stage-admin.ps1 rebuilds it from admin/dist
// on every run, which is why line 47 ignores it.
const BUILD_OUTPUT = /(^|\/)(dist|build)\/|^admin\/deploy\//

// Static imports/exports, bare side-effect imports, dynamic import(), require().
const SPEC_PATTERNS = [
  /(?:^|\n)\s*(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]/g,
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

// A comment that quotes an import is not an import. This file's own header
// discusses `require("./get")`, and scanning it reported itself as broken — so
// comments come out before the patterns run. Strings are left alone: a specifier
// inside one is exactly what we are looking for.
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

function specifiers(text) {
  const found = new Set()
  text = stripComments(text)
  for (const re of SPEC_PATTERNS) {
    re.lastIndex = 0
    let m
    // Vite specifiers carry a query suffix — `../styles.css?url`, `./w?worker`.
    // The file on disk is the part before the '?'.
    while ((m = re.exec(text))) found.add(m[1].split('?')[0])
  }
  return [...found]
}

function isFile(p) {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

// TypeScript ESM asks you to write the *emitted* extension: `./App.js` when the
// file on disk is `App.tsx`. tsc (nodenext/bundler) and vite both resolve that,
// so the detector has to as well — otherwise every such import reads as missing.
// packages/, portal/ and admin/ all write this way.
const TS_FOR_JS = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'] }

// Mirror the bundler: exact path, then the TS source behind a .js specifier,
// then +ext, then /index+ext.
function resolveTarget(base) {
  if (isFile(base)) return base
  const emitted = TS_FOR_JS[path.extname(base)]
  if (emitted) {
    const stem = base.slice(0, -path.extname(base).length)
    for (const ext of emitted) if (isFile(stem + ext)) return stem + ext
  }
  for (const ext of RESOLVE_EXT) if (isFile(base + ext)) return base + ext
  for (const ext of RESOLVE_EXT) {
    const idx = path.join(base, 'index' + ext)
    if (isFile(idx)) return idx
  }
  return null
}

// `@/x` means <appRoot>/src/x in every app here that sets the alias; appRoot is
// the directory holding the tsconfig/vite config, which is not always apps/<app>
// (some apps keep the client under a subdirectory).
function aliasRoots(appDir) {
  const roots = []
  const candidates = [appDir, path.join(appDir, 'client'), path.join(appDir, 'src')]
  for (const c of candidates) {
    const src = path.join(c, 'src')
    if (existsSync(src)) roots.push(src)
  }
  return roots
}

const trackedSet = tracked()
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')

const byApp = new Map()
for (const f of trackedSet) {
  if (!SOURCE_EXT.has(path.extname(f))) continue
  const app = unitOf(f)
  if (!app) continue
  // A bare name on the command line matches the unit's last segment, so
  // `16-chatzor-connect` still works now that units carry their root.
  if (only.length && !only.some((o) => o === app || app.endsWith('/' + o))) continue
  if (!byApp.has(app)) byApp.set(app, [])
  byApp.get(app).push(f)
}

const untrackedHits = []
const missingHits = []
const buildOutputHits = []
const bundles = []
let scanned = 0
let resolvedCount = 0

for (const [app, files] of [...byApp].sort()) {
  const appDir = path.join(ROOT, app)
  const roots = aliasRoots(appDir)
  for (const f of files) {
    const abs = path.join(ROOT, f)
    if (!isFile(abs)) continue // tracked but deleted on disk — a different defect
    if (statSync(abs).size > BUNDLE_BYTES) {
      bundles.push(f)
      continue
    }
    scanned++
    let text
    try {
      text = readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    for (const spec of specifiers(text)) {
      let bases = []
      if (spec.startsWith('.')) {
        bases = [path.resolve(path.dirname(abs), spec)]
      } else if (spec.startsWith('@/')) {
        bases = roots.map((r) => path.join(r, spec.slice(2)))
      } else {
        continue // package import — node_modules, not our problem
      }
      let target = null
      for (const b of bases) {
        target = resolveTarget(b)
        if (target) break
      }
      if (!target) {
        // Only report a relative specifier as missing; an unresolved `@/` may
        // just mean the alias root guess was wrong for that app.
        if (spec.startsWith('.')) missingHits.push({ app, from: f, spec })
        continue
      }
      resolvedCount++
      const relTarget = rel(target)
      if (trackedSet.has(relTarget)) continue
      if (BUILD_OUTPUT.test(relTarget)) buildOutputHits.push({ app, from: f, spec, target: relTarget })
      else untrackedHits.push({ app, from: f, spec, target: relTarget })
    }
  }
}

// The import graph cannot see a file nothing statically imports: TanStack Router
// and vite's import.meta.glob pull routes in by filename. Such a file can be left
// untracked without breaking a single import, and the clean clone silently loses
// a route. So also list source files sitting on disk, inside a directory that
// already holds tracked files, that git does not have.
// .output and .vercel are nitro/vercel build trees: 30 and 31 alone drop 751
// generated .mjs files there. They hold no tracked file, so the trackedDirs
// guard below already filtered them, but naming them keeps the walk honest
// rather than accidentally correct.
const IGNORED_DIR =
  /(^|\/)(node_modules|dist|build|\.next|\.turbo|\.archive|\.git|coverage|\.output|\.vercel)(\/|$)/
// Rebuilt from admin/dist by scripts/stage-admin.ps1; ignored at line 47.
const IGNORED_PATH = /^admin\/deploy\//

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    const r = rel(p)
    if (IGNORED_DIR.test(r + '/') || IGNORED_PATH.test(r + '/')) continue
    if (e.isDirectory()) walk(p, out)
    else if (SOURCE_EXT.has(path.extname(e.name))) out.push(r)
  }
  return out
}

// The blanket rules that put whole source trees behind `git add -f`. A file
// ignored by ONE OF THESE is exactly the trap being hunted, so it must still be
// reported. A file ignored by any other rule — the `_probe-*` scratch convention,
// a local scratch pattern — was deliberately excluded and is not a lost file.
const BLANKET_RULES = new Set(['/apps/**', '/_deploy/**', '/admin/deploy/**'])

// `git check-ignore -v` names the rule that matched, which is what lets the two
// cases above be told apart. Files matching no rule at all are simply absent
// from its output.
function deliberatelyIgnored(paths) {
  if (!paths.length) return new Set()
  let out
  try {
    out = execFileSync(GIT, ['check-ignore', '-v', '-z', '--stdin'], {
      cwd: ROOT,
      input: paths.join('\0') + '\0',
      maxBuffer: 64 * 1024 * 1024,
    }).toString('utf8')
  } catch (e) {
    // exit 1 just means nothing matched; anything else and we have no answer.
    if (e.status !== 1) throw e
    out = e.stdout ? e.stdout.toString('utf8') : ''
  }
  const fields = out.split('\0')
  const ignored = new Set()
  // <source>\0<linenum>\0<pattern>\0<pathname>\0
  for (let i = 0; i + 3 < fields.length; i += 4) {
    const [, , pattern, pathname] = fields.slice(i, i + 4)
    if (!BLANKET_RULES.has(pattern)) ignored.add(pathname.split(path.sep).join('/'))
  }
  return ignored
}

const trackedDirs = new Set([...trackedSet].map((f) => f.slice(0, f.lastIndexOf('/'))))
const candidates = []
for (const app of byApp.keys()) {
  for (const r of walk(path.join(ROOT, app))) {
    if (trackedSet.has(r)) continue
    const dir = r.slice(0, r.lastIndexOf('/'))
    if (trackedDirs.has(dir)) candidates.push({ app, file: r })
  }
}
const excluded = deliberatelyIgnored(candidates.map((c) => c.file))
const orphans = candidates.filter((c) => !excluded.has(c.file))

if (asJson) {
  console.log(
    JSON.stringify(
      {
        scanned,
        resolved: resolvedCount,
        bundlesSkipped: bundles,
        untracked: untrackedHits,
        missing: missingHits,
        buildOutput: buildOutputHits,
        orphans,
      },
      null,
      2,
    ),
  )
} else {
  console.log(
    `scanned ${scanned} tracked source files (${bundles.length} bundles skipped), ` +
      `resolved ${resolvedCount} local imports\n`,
  )

  const group = (hits, key) => {
    const m = new Map()
    for (const h of hits) {
      const k = key(h)
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(h)
    }
    return [...m].sort((a, b) => b[1].length - a[1].length)
  }

  console.log(`== imported but NOT tracked (${untrackedHits.length}) ==`)
  for (const [target, hits] of group(untrackedHits, (h) => h.target)) {
    console.log(`  ${target}`)
    for (const h of hits) console.log(`      <- ${h.from}  ('${h.spec}')`)
  }

  console.log(`\n== imported and MISSING on disk (${missingHits.length}) ==`)
  for (const h of missingHits) console.log(`  ${h.from}  ('${h.spec}')`)

  console.log(`\n== untracked source next to tracked source (${orphans.length}) ==`)
  for (const [app, hits] of group(orphans, (h) => h.app)) {
    console.log(`  ${app} (${hits.length})`)
    for (const h of hits.slice(0, 12)) console.log(`      ${h.file}`)
    if (hits.length > 12) console.log(`      … ${hits.length - 12} more`)
  }

  console.log(`\n== into build output, expected (${buildOutputHits.length}) ==`)
  for (const h of buildOutputHits) console.log(`  ${h.from}  ('${h.spec}')`)

  const apps = new Set([...untrackedHits, ...orphans].map((h) => h.app))
  console.log(
    `\n${untrackedHits.length} untracked import targets, ${orphans.length} orphan sources, ` +
      `${missingHits.length} missing — across ${apps.size} app(s).`,
  )
}

process.exitCode = untrackedHits.length || missingHits.length || orphans.length ? 1 : 0
