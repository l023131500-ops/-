# The same trap outside apps/ — 2026-08-10

The previous round (`c0b193e`) checked `apps/` and closed with a stated limit:

> This checks `apps/`. Nothing here says anything about `admin/`, `scripts/` or
> `_deploy/` — `_deploy/**` is gitignored too (line 43), by the same reasoning that
> it is reproducible, and that claim was not tested.

This round removes that limit. **Nothing is missing there either** — but the
reason it matters more than in `apps/` is worth stating, and two of the three
findings on the way were bugs in the detector rather than in the tree.

## Why `_deploy/` is the sharper case

`apps/` is ignored by line 29 and `_deploy/` by line 43, so both are `git add -f`
trees. The difference is what reads them. A file lost under `apps/` breaks a
clean clone. A file lost under `_deploy/<project>/api/` breaks **production**:
those are Vercel serverless functions, and Vercel builds them from a clean clone
on every deploy. `_deploy/studio-more30/api/_lib/` alone is 20 hand-force-added
`.ts` files importing each other; `imud2` is 9 and `mechiron-more30` is 4.

The reasoning at line 39-42 — "all of it is reproducible from the sources in
`apps/`" — is true of the compiled bundles and the `.vercel/project.json` links,
and *not* true of these `api/_lib/**` sources, which exist only there. That is
why they were force-added in the first place, and why the check now covers them.

All 34 tracked `_deploy` sources scan clean: 51 local imports, 0 untracked.

## Coverage now

`node scripts/qa/untracked-imports.mjs` scans eight roots instead of one.
`--root=_deploy` narrows to a single one; a bare app name still works.

| root | tracked sources scanned | imports resolved |
|---|---|---|
| apps | 2181 | 4165 |
| _deploy | 34 | 51 |
| packages | 11 | 6 |
| portal | 9 | 3 |
| admin | 4 | 2 |
| tooling | 1 | 0 |
| sites | 0 | 0 |

2395 files, 4253 imports, **0 untracked import targets**. Re-running `--root=apps`
reproduces the previous round's numbers exactly (2181 / 1 missing / 0 orphans),
so the generalisation did not move the earlier result.

`sites/` has 12 tracked files and 0 sources — it is HTML and assets. `QA/` is
evidence and `supabase/` is SQL; neither is scanned.

## Three findings, one of which was real

The first run over the new roots reported 11 missing and 2 orphans. Nine of the
eleven were the detector being wrong:

1. **TypeScript's emitted-extension convention.** `portal/src/main.tsx` imports
   `'./App.js'`; the file on disk is `App.tsx`. That is what tsc under
   `nodenext`/`bundler` asks you to write, and both tsc and vite resolve it.
   `packages/config` (4 hits), `packages/ui`, `admin/src/main.tsx` (2) and
   `portal/src/main.tsx` all write this way. The resolver now tries `.ts`/`.tsx`
   behind a `.js` specifier, `.mts` behind `.mjs`, `.cts` behind `.cjs`.
2. **The detector reported itself.** `scripts/qa/untracked-imports.mjs ('./get')`
   — that string is in its own header comment, explaining why committed bundles
   are skipped. Comments are now stripped before the specifier patterns run.
   Quoted strings are deliberately left alone: a specifier in a string is the
   thing being looked for.

The tenth and eleventh are the two already-classified survivors from last round
(`.archive/orchestrator.ts`, `chizukim/dist/index.cjs`), unchanged.

The **real** finding is an orphan: `scripts/qa/admin-users-name-and-plan.mjs`,
11.6 KB, written 08/07 to check `more30_admin_users()` against the live hub, used
that round, and never committed. `scripts/` is not gitignored, so nothing forced
it out — it was simply left behind, which is the miss this detector exists to
catch, one tree over from where anyone was looking. Committed here. It reads its
credentials from the environment; no key literals.

## Telling scratch apart from lost

The other orphan, `scripts/qa/_probe-footer-brand.mjs`, calls itself "scratch" on
line 1 — a one-off sweep for §7's footer brand link. The `_probe-` prefix is
already a convention in the tree (`_probe-egod.mjs` at the root), but it lived
only in the filenames, so the detector had no way to honour it and would have
re-reported both files as findings every round.

The convention is now written down (`.gitignore`, `_probe-*.mjs`/`_probe-*.js`)
and the orphan walk consults `git check-ignore -v`.

The `-v` matters. Under `/apps/**` *everything* is ignored, so a plain
check-ignore filter would silence the entire trap this tool was built for. `-v`
names the rule that matched, so the walk can drop files excluded by an ordinary
rule while keeping every file excluded only by a blanket root rule
(`/apps/**`, `/_deploy/**`, `/admin/deploy/**`).

That distinction was verified rather than assumed: dropping an untracked `.ts`
next to a tracked file under `apps/16-chatzor-connect` still reports it as an
orphan, with the `_probe-*` filter live. (Probe file removed.)

## Limit

`admin/` has 4 tracked sources — `App.tsx`, `main.tsx`, `theme.tsx`,
`vite.config.ts`. That is a complete import graph with nothing dangling, so this
check passes it, but "4 files is all the admin SPA is" is a claim this tool
cannot make: an import scan only proves that what *is* committed hangs together.
Whether the deployed control centre is larger than its committed source is a
different question, and not one answered here.
