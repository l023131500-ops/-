# 01 Torah Platform (HUB) — deploy-readiness (P3, per OWNER ORDER 2026-09-02b)

## 2026-09-02, session (loop A) — third system checked; confirms the blocker is environmental, not per-system

`core.projects` note #33's `OWNER ORDER 2026-09-02b`: MERGE each priority
system's best/latest work to main and DEPLOY, in order 35 → 32+36 → 01 → ...
35 (`apps/35-kioskfleet/STATUS.md` session 7) and 32+36
(`apps/32-nadlan-berega/STATUS.md`) were already diagnosed today. This round
did the equivalent check for 01, the next system in priority order, instead
of re-running the same diagnosis a third time on an already-checked system.

**Build state:** `core.build_tasks` has zero `todo` rows for `01`, `15`,
`32`, `36`, `35` (all `done`), reconfirmed live via MCP this round.

**Integration tip:** this branch already carries `01-torah-platform:
reconcile orphaned feat/*-0831 branch chain` (`a33a7f72`), which merged the
18-branch chain implementing build_tasks #22-49,54 (religious council
synagogue/kashrut CRUD, tenant invite/status gates, donation campaigns,
zmanim, materials library, custom-domain whitelist, etc.) into this tip.
`git rev-list --left-right --count` against this repo's own main
(`claude/build-monorepo-more30-peilok`) shows this branch is a clean
**fast-forward** ahead of main (0 commits behind, 1792 ahead) — `git
merge-tree` against their merge-base shows no conflict markers anywhere in
the diff. Same shape as 35 and 32/36: reconciled, individually verified per
build_task, not merged.

**What "deploy" actually means here:** unlike a Vercel-git-integrated app,
`more30.com/torah` does **not** redeploy from a `git push` to this repo at
all, confirmed two ways:
1. This repo's root `vercel.json` has `"git": {"deploymentEnabled": false}`
   (same finding as 32/36's report) — irrelevant anyway, because 01's own
   Vercel project builds nothing (`buildCommand: "echo no-build"`, per
   `dfacb299`/`f20bf1f4` below) and only serves whatever static files were
   last uploaded.
2. Git history (`dfacb299`, `f20bf1f4`, both 2026-08-19, author
   `l023131500@gmail.com` — the owner's own machine, not this bot) documents
   the actual pipeline: `npm run build` (vite) → mirror `dist/` into
   `_deploy/torah-more30/torah` → re-run the tenant-seeded prerender bake
   (`scripts/prerender-all.mjs` — skipping it silently regresses CLS
   0.001→0.578, per that commit's own warning) → `vercel deploy --prod`
   from `_deploy/torah-more30`. Deploying straight from
   `apps/01-torah-platform` uploads the raw unbuilt source tree instead (that
   commit documents recovering from exactly that mistake).

**This sandbox cannot run that pipeline:** `_deploy/torah-more30/` in this
repo holds only `vercel.json` (last touched 2026-08-03) — the built `dist/`
output is correctly gitignored, regenerated per-machine, not something to
diff for staleness here. Rebuilding it requires `npm install` in
`apps/01-torah-platform` (no `node_modules` present, and this session's own
standing instructions say not to wait on installs), and the final
`vercel deploy --prod` step needs the Vercel CLI, which — like Railway's
CLI for 35 and Vercel's for 32/36 — is not present in this sandbox
(`which vercel` empty, no `VERCEL_*`/deploy-hook secret in env or
`core.automations`/`core.missing_tokens`).

**Net effect, now confirmed on all three systems checked today (35, 32+36,
01):** the "not deployed" blocker is an **environment property of this
sandbox** (no Vercel/Railway CLI, no deploy-hook secret, no MCP deploy tool
for any of these targets), not something specific to one system's git
state. Re-running this same diagnosis for the remaining priority systems
(17, 30, 26, 34, 28, 27) would very likely reach the identical conclusion
and is exactly the kind of repeat-busywork `OWNER ORDER 2026-09-02b` rule 2
says to stop — flagging that here once, cross-system, instead of writing a
fourth near-identical report. Getting any of these systems' reconciled tips
live needs a human with the relevant CLI/credentials (Vercel for
01/32/36, Railway for 35) to pull the tip and run the documented deploy
sequence; that step cannot be done from here regardless of which system's
branch is ready.

Not merged, not deployed, no app-source lines changed this round
(verification-only: 1 new STATUS.md file). `core.build_tasks` for 01/15
confirmed still 0 `todo` — no regression, no new work invented to look
busy.
