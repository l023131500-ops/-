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

## 2026-09-03, session (loop A) — donation receipts captured but never shown

`core.build_tasks` for 35/32/36/01/15 confirmed still 0 non-deploy `todo`
rows this round (only the 4 "merge to main + deploy" rows from
`OWNER ORDER 2026-09-02b`, and — reconfirmed independently this round, `env`
+ `which vercel railway` both empty, no deploy-hook secret in
`core.missing_tokens`/`core.automations` — deploying is still blocked at the
sandbox-environment level, same conclusion as the session above; not
re-litigated). Per the "never invent audit/security/refactor work to look
busy" rule, did not repeat the accessibility/contrast sweep vein (already
exhaustively mined elsewhere in this repo) and instead re-read this
system's own webhook against its own UI for the same "field exists, never
rendered" shape that closed real gaps on 32/36 this week.

Found one: `supabase/functions/nedarim-webhook/index.ts` (`receiptData`/
`receiptDocNum` parsed from Nedarim Plus's IPN payload) writes
`receipt_url`/`receipt_number`/`receipt_issued_at` onto `donations` on every
captured payment — columns migration `20260831060000_...protect_payment_fields.sql`
explicitly server-protects, confirming they're load-bearing, not vestigial.
Neither donations view ever read them: `src/pages/admin/Commerce.tsx`
(super-admin) selects `*` but only renders donor/amount/tenant/date/status;
`src/pages/portal/Donations.tsx` (tenant admin) selects `*` with the same
gap. A tenant admin or the super-admin had no way to see whether a
donation's tax receipt was actually issued, or find its number/link.

Added a small `ReceiptStatus` component to both files (same shape in each):
"קבלה #<number> [צפייה]" when `receipt_issued_at`/`receipt_number`/
`receipt_url` are set, "קבלה: ממתינה" when the donation is captured but no
receipt has landed yet, nothing when the donation isn't captured. No query
change needed (both already `select("*")`). Verified with
`npx esbuild <file> --bundle=false --format=esm` on both edited files (clean
compile, no syntax errors) and inspected the transpiled output to confirm
the new branch and both DB fields are wired through correctly. No
Node/browser toolchain in this sandbox to click-through render, same
disclosed limitation as every other frontend-only round in this repo.

Zero regression: purely additive (one new component + one new call site per
file), no existing field, query, or handler touched. Committed to
`fix/01-torah-platform-donation-receipt-display-0903` — not merged, not
pushed to main, per this session's standing operating constraint (see the
`OWNER ORDER 2026-09-02b` vs. never-push-to-main conflict noted throughout
this repo's other STATUS.md/CLAUDE.md files this week). Systems 15/32/35/36
untouched this round.
