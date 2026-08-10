# Is anything already missing from history? — 2026-08-10

The previous round (`31bfe42`) added `SynagogueGate.tsx` under `apps/` and found it
did not enter the commit on its own: `.gitignore` line 29 is `/apps/**`, so every
source file there is in the repo only because someone typed `git add -f`. It ended
with an open question rather than an answer:

> מי שיוסיף קובץ שם וישכח את ה--f יקבל קומיט שמייבא קובץ שאינו קיים; שווה בדיקה
> חד-פעמית אם קבצים כאלה כבר חסרים בהיסטוריה.

This round answers it. **Nothing is missing.** All 2,179 real source files on disk
under `apps/` are tracked; no tracked file imports something git does not have.

## Why the normal loop cannot catch this

`tsc`, `vite build` and the dev server all read the *working tree*, where the
forgotten file is sitting right there. The commit is green locally and broken only
for a clean clone — which is what Vercel builds from. So the check has to compare
imports against `git ls-files`, not against the filesystem.

## The detector

`scripts/qa/untracked-imports.mjs` — walks every tracked source file under `apps/`,
resolves its relative and `@/` specifiers the way the bundler would (exact path,
then `+ext`, then `/index+ext`), and classifies each target.

```
node scripts/qa/untracked-imports.mjs            # all apps
node scripts/qa/untracked-imports.mjs 16-chatzor-connect
node scripts/qa/untracked-imports.mjs --json
```

Exit code 1 if anything is untracked, orphaned or missing.

## Result

```
scanned 2181 tracked source files (2 bundles skipped), resolved 4166 local imports

== imported but NOT tracked (0) ==
== imported and MISSING on disk (1) ==
  apps/26-modaot-studio/.archive/orchestrator.ts  ('./gemini')
== untracked source next to tracked source (0) ==
== into build output, expected (1) ==
  apps/17-chizukim-transcribe/api/server.js  ('../dist/index.cjs')
```

Both surviving hits were run down, and neither is a defect:

- **`17-chizukim-transcribe/api/server.js` → `../dist/index.cjs`** — `dist/` is
  gitignored on purpose (line 6) and `package.json` builds it: `"build": "tsx
  script/build.ts"`, `"start": "node dist/index.cjs"`. Reproducible output, not a
  lost file. The detector reports these in their own class.
- **`26-modaot-studio/.archive/orchestrator.ts` → `./gemini`**  — `.archive/` holds
  four parked files and no `gemini.*`. It is a dead reference, but dead: that
  tsconfig's `include` is `["client/src/**/*", "shared/**/*", "server/**/*"]`, so
  the file is never compiled. Left alone deliberately — editing archived code to
  satisfy a detector would be the detector wagging the codebase.

## The two false-positive classes, and why they were not just suppressed

The first run reported 1 untracked and 6 missing. Four of the six were resolver
bugs worth fixing, because each would have hidden real hits later:

1. **Vite query suffixes.** `import '../styles.css?url'` is a real file plus a
   query. Three `__root.tsx` files (30, 31, `_archive/pixel-perfect`) reported
   their stylesheet as missing. Specifiers are now split on `?`.
2. **Committed bundles.** `apps/28-kupot-health-funds/api/index.js` is 1.8 MB of
   esbuild output; its `require("./get")` and `"./list.d.ts"` are vendored library
   internals that resolved inside `node_modules` at build time, not paths into
   this repo. Files over 300 KB are skipped and counted (2 of them).

## The case the import graph structurally cannot see

An import scan only finds a file if something imports it. 30 and 31 use TanStack
Router **file-based** routing, and vite has `import.meta.glob` — a route file can
be left untracked without breaking a single static import, and the clean clone
just silently loses a route. So the detector also walks the disk for source files
that sit in a directory already holding tracked files.

That returned 0, which needed checking rather than believing: the raw walk finds
751 untracked files under `apps/`. All 751 are generated — `30-zchuyotpro-crm/.output/`
(517) and `31-hebrew-bridge-crm/.vercel/output/` (234). Re-running the walk with
those two directories excluded gives **2,179 on-disk source files, 0 untracked**,
which is the number this round actually rests on. The `.output`/`.vercel`
exclusions were then written into the detector so the 0 is honest rather than an
accident of the `trackedDirs` guard.

## Limit

This checks `apps/`. Nothing here says anything about `admin/`, `scripts/` or
`_deploy/` — `_deploy/**` is gitignored too (line 43), by the same reasoning that
it is reproducible, and that claim was not tested.
