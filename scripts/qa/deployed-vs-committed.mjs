#!/usr/bin/env node
// Rebuilds a site from its COMMITTED source and byte-compares the result with
// what production actually serves.
//
// `untracked-imports.mjs` proves that what is committed hangs together — every
// import resolves to a tracked file. It cannot prove the opposite direction:
// that the committed tree is *all* of the site. A control centre could be a
// hundred files deployed and three files committed, and an import scan over
// those three would still pass clean.
//
// The only thing that settles it is the artifact. Build from the tree git has,
// fetch the bytes the browser gets, compare. Equal bytes mean the committed
// source is complete, because a bundler cannot emit code from a file that is
// not there.
//
// Two things to get right or the comparison lies:
//
//   1. **The working tree is not the commit.** `vite build` reads what is on
//      disk. If a tracked file is dirty, or an untracked source sits next to a
//      tracked one, the build consumes it and byte-identity proves nothing. So
//      the check refuses to run on a dirty subtree, and lists untracked files
//      in it rather than silently building them in.
//
//   2. **Injected HTML is not our HTML.** The ISP proxy (NetFree) appends
//      script tags after </html>. Everything from that marker on is discarded
//      before comparing; if a target ever serves a differently-injected page,
//      the marker is what needs updating, not the comparison.
//
//   node scripts/qa/deployed-vs-committed.mjs            # every configured target
//   node scripts/qa/deployed-vs-committed.mjs admin
//   node scripts/qa/deployed-vs-committed.mjs --json
//
// Exit 1 on any mismatch or refusal, so this can gate a deploy.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const GIT =
  process.env.GIT_EXE ||
  'C:\\Users\\USER\\AppData\\Local\\GitHubDesktop\\app-3.6.3\\resources\\app\\git\\cmd\\git.exe'

const ROOT = path.resolve(process.argv[1], '../../..')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const only = args.filter((a) => !a.startsWith('--'))

// Two kinds of target:
//
//   build   — a bundled SPA. Needs a vite build here, so the tree on disk has
//             to be clean or the artifact is not evidence about the commit.
//             Apps under apps/ are force-added into git one file at a time
//             (.gitignore /apps/**), so they are the tree this check most wants
//             to cover — but each needs its own build command and mount, so
//             they get added as they are verified rather than assumed.
//
//   static  — files vite copies verbatim out of `public/` into the deploy root.
//             No build, no disk read: the bytes come from `git cat-file`, so
//             the comparison is against the commit itself and a dirty working
//             tree cannot make it pass. Cheap enough to cover every file.
const TARGETS = [
  { name: 'admin', mode: 'build', dir: 'admin', url: 'https://more30.com/admin/' },
  { name: 'portal-static', mode: 'static', dir: 'portal/public', url: 'https://more30.com/' },
]

// Appended by the ISP proxy, outside the document. Not ours, not in the build.
const INJECTION_MARKER = '<!-- Injection By NetFree -->'

// Files where a CRLF/LF difference is a checkout artefact rather than a content
// change. Everything else is compared byte for byte.
const TEXT = /\.(html|js|mjs|css|txt|xml|json|svg|map)$/i

const sha = (buf) => createHash('sha256').update(buf).digest('hex')

function git(...a) {
  return execFileSync(GIT, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 })
}

// The blob as committed, not the file as it sits on disk. For passthrough files
// this is the whole reason the static mode needs no clean-tree refusal: a local
// edit changes what an editor shows and changes nothing here.
function gitBlob(p) {
  return execFileSync(GIT, ['cat-file', 'blob', `HEAD:${p}`], {
    cwd: ROOT,
    encoding: 'buffer',
    maxBuffer: 64 << 20,
  })
}

// A build is only evidence about the commit if the subtree on disk IS the
// commit. Two different ways it might not be, reported separately because they
// mean different things: a dirty tracked file is a local edit, an untracked
// source is the .gitignore trap.
function treeIsClean(dir) {
  const dirty = git('status', '--porcelain', '--', dir).split('\n').filter(Boolean)
  const modified = dirty.filter((l) => !l.startsWith('??'))
  const untracked = dirty
    .filter((l) => l.startsWith('??'))
    .map((l) => l.slice(3).replace(/^"|"$/g, ''))
    // Build outputs and local env are expected to be untracked; they are not
    // source. Env is handled separately below — it is inlined, so it matters.
    .filter((f) => !/(^|\/)(dist|deploy|node_modules)\//.test(f))
  return { modified, untracked }
}

// Vite inlines `import.meta.env.VITE_*` as string literals. Those values come
// from a file git does not have, so a byte-identical bundle is a statement
// about the env too: it says the local values equal the ones the deploy was
// built with. Worth naming, because if they ever drift the bundle differs and
// the source is the wrong place to look.
function inlinedEnvKeys(dir) {
  let raw
  try {
    raw = readFileSync(path.join(ROOT, dir, '.env.local'), 'utf8')
  } catch {
    return []
  }
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => l.split('=', 1)[0])
    .filter((k) => k.startsWith('VITE_'))
}

async function fetchBytes(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

// The served page carries the proxy's tags after </html>. Compare only up to
// the marker, and normalise line endings — the build writes LF, the wire may
// not.
function ourHtml(buf) {
  const text = buf.toString('utf8')
  const cut = text.indexOf(INJECTION_MARKER)
  return (cut >= 0 ? text.slice(0, cut) : text).replace(/\r\n/g, '\n').trim()
}

// Passthrough files. vite copies `public/` into the deploy root untouched, so
// every tracked file under it should arrive on the wire as the exact blob git
// holds — no bundling step in between to explain a difference away. A file that
// differs is either a hand-edit made straight on the deploy, or a deploy older
// than the commit; both are the thing this check exists to catch.
async function checkStatic(target) {
  const result = { name: target.name, url: target.url, mode: 'static', ok: false, assets: [] }
  result.head = git('rev-parse', '--short', 'HEAD').trim()

  const files = git('ls-files', '-z', '--', target.dir)
    .split('\0')
    .filter(Boolean)
    .map((p) => p.slice(target.dir.length + 1))

  for (const rel of files) {
    const committed = gitBlob(`${target.dir}/${rel}`)
    let served
    try {
      served = await fetchBytes(new URL(rel, target.url).href)
    } catch (e) {
      result.assets.push({ ref: `/${rel}`, ok: false, error: String(e.message) })
      continue
    }
    // Binary is compared raw — that is what makes a match on an .ico mean
    // something. Text is compared twice: raw, and with line endings normalised.
    //
    // The gap between those two answers is itself information. `core.autocrlf`
    // is true here, so a checkout writes CRLF and the blob keeps LF; production
    // serves the CRLF form. A Linux build of this commit could not produce that
    // — so these files reached the deploy as an upload of a Windows working
    // copy. Same content, and worth naming: for passthrough files "what is
    // live" is disk state at deploy time, not the commit.
    const asset = { ref: `/${rel}`, bytes: committed.length, sha: sha(committed).slice(0, 12) }
    if (TEXT.test(rel)) {
      const norm = rel.endsWith('.html') ? ourHtml : (b) => b.toString('utf8').replace(/\r\n/g, '\n')
      asset.ok = norm(committed) === norm(served)
      asset.eol = asset.ok && sha(committed) !== sha(served)
    } else {
      asset.ok = sha(committed) === sha(served)
    }
    result.assets.push(asset)
  }

  result.ok = result.assets.length > 0 && result.assets.every((a) => a.ok)
  return result
}

async function check(target) {
  if (target.mode === 'static') return checkStatic(target)
  const result = { name: target.name, url: target.url, mode: 'build', ok: false, assets: [] }

  const { modified, untracked } = treeIsClean(target.dir)
  if (modified.length || untracked.length) {
    result.refused = { modified, untracked }
    return result
  }
  result.env = inlinedEnvKeys(target.dir)
  result.head = git('rev-parse', '--short', 'HEAD').trim()

  const out = mkdtempSync(path.join(tmpdir(), `dvc-${target.name}-`))
  try {
    // vite's own entry under node, not `npx`: node 24 refuses to spawn a .cmd
    // shim without `shell: true`, and `shell: true` would splice this temp path
    // into a command line — one space in TMP and outDir becomes two arguments.
    const vite = path.join(ROOT, target.dir, 'node_modules/vite/bin/vite.js')
    execFileSync(process.execPath, [vite, 'build', '--outDir', out, '--emptyOutDir'], {
      cwd: path.join(ROOT, target.dir),
      encoding: 'utf8',
      stdio: 'pipe',
    })

    const builtHtml = ourHtml(readFileSync(path.join(out, 'index.html')))
    const servedHtml = ourHtml(await fetchBytes(target.url))
    result.html = builtHtml === servedHtml

    // Every asset the built page references, resolved against the live origin.
    // Hashed filenames make this strict: a content change renames the file, so
    // a served 404 is itself the finding.
    const refs = [...builtHtml.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map((m) => m[1])
    for (const ref of refs) {
      const built = readFileSync(path.join(out, ref.replace(/^\/[^/]+\//, '')))
      let served = null
      try {
        served = await fetchBytes(new URL(ref, target.url).href)
      } catch (e) {
        result.assets.push({ ref, ok: false, error: String(e.message) })
        continue
      }
      result.assets.push({
        ref,
        ok: sha(built) === sha(served),
        bytes: built.length,
        sha: sha(built).slice(0, 12),
      })
    }

    result.ok = result.html && result.assets.length > 0 && result.assets.every((a) => a.ok)
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
  return result
}

const targets = TARGETS.filter((t) => !only.length || only.includes(t.name))
if (!targets.length) {
  console.error(`no such target. known: ${TARGETS.map((t) => t.name).join(', ')}`)
  process.exit(1)
}

const results = []
for (const t of targets) results.push(await check(t))

if (asJson) {
  console.log(JSON.stringify(results, null, 2))
} else {
  for (const r of results) {
    console.log(`\n${r.name}  ${r.url}`)
    if (r.refused) {
      console.log('  REFUSED — the working tree is not the commit:')
      for (const m of r.refused.modified) console.log(`    modified  ${m}`)
      for (const u of r.refused.untracked) console.log(`    untracked ${u}`)
      continue
    }
    if (r.mode === 'static') {
      console.log(`  ${r.assets.length} passthrough files, as committed at ${r.head}`)
    } else {
      console.log(`  built from ${r.head}${r.env.length ? ` + env ${r.env.join(', ')}` : ''}`)
      console.log(`  index.html          ${r.html ? 'identical' : 'DIFFERS'}`)
    }
    for (const a of r.assets) {
      const tail = a.error ? a.error : `${a.bytes} bytes  sha ${a.sha}`
      const verdict = a.error || !a.ok ? 'DIFFERS  ' : a.eol ? 'same, CRLF' : 'identical'
      console.log(`  ${verdict}  ${a.ref}  ${tail}`)
    }
    const eol = r.assets.filter((a) => a.eol).length
    if (eol) console.log(`  ${eol} file(s) served CRLF — deployed from a Windows working copy`)
  }
  console.log('')
}

process.exit(results.every((r) => r.ok) ? 0 : 1)
