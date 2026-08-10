#!/usr/bin/env node
// Finds imports in TRACKED app sources that point at files git does not have.
//
// .gitignore line 29 is `/apps/**`, so every source file under apps/ enters the
// repo only through `git add -f`. Forget the -f once and the commit still builds
// locally — the file is right there on disk — while a clean clone gets a tracked
// file importing something that was never committed. Nothing in the normal loop
// catches that: tsc, vite and the dev server all read the working tree.
//
// So: walk every tracked source file, resolve its relative and `@/` imports the
// way the bundler would, and classify each target as tracked, untracked-on-disk
// (the .gitignore trap) or missing entirely (a genuinely broken import).
//
//   node scripts/qa/untracked-imports.mjs            # all apps
//   node scripts/qa/untracked-imports.mjs 16-chatzor-connect
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

// Extensions the bundler will try, in order, for an extensionless specifier.
const RESOLVE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css']
// Files worth parsing for imports at all.
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function tracked() {
  const out = execFileSync(GIT, ['ls-files', '-z', 'apps/'], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  }).toString('utf8')
  return new Set(out.split('\0').filter(Boolean))
}

// A committed esbuild/vite bundle is not a source file: its `require("./get")`
// calls are vendored library internals that resolve inside node_modules at build
// time, not paths into this repo. Reading them produces nothing but noise, so
// files this large are skipped and counted separately.
const BUNDLE_BYTES = 300 * 1024
// dist/ and build/ are gitignored on purpose (line 6-7) and reproduced by the
// build, so a tracked file importing into them is expected, not a lost file.
const BUILD_OUTPUT = /(^|\/)(dist|build)\//

// Static imports/exports, bare side-effect imports, dynamic import(), require().
const SPEC_PATTERNS = [
  /(?:^|\n)\s*(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]/g,
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

function specifiers(text) {
  const found = new Set()
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

// Mirror the bundler: exact path, then +ext, then /index+ext.
function resolveTarget(base) {
  if (isFile(base)) return base
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
  const app = f.split('/')[1]
  if (only.length && !only.includes(app)) continue
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
  const appDir = path.join(ROOT, 'apps', app)
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
    if (IGNORED_DIR.test(r + '/')) continue
    if (e.isDirectory()) walk(p, out)
    else if (SOURCE_EXT.has(path.extname(e.name))) out.push(r)
  }
  return out
}

const trackedDirs = new Set([...trackedSet].map((f) => f.slice(0, f.lastIndexOf('/'))))
const orphans = []
for (const app of byApp.keys()) {
  for (const r of walk(path.join(ROOT, 'apps', app))) {
    if (trackedSet.has(r)) continue
    const dir = r.slice(0, r.lastIndexOf('/'))
    if (trackedDirs.has(dir)) orphans.push({ app, file: r })
  }
}

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
