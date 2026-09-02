# 32 נדל"ן ברגע + 36 נדל"ן פרו — deploy-readiness (P2, per OWNER ORDER 2026-09-02b)

## 2026-09-02, session (loop A) — quantified the P2 "not live" blocker, same method as apps/35-kioskfleet/STATUS.md session 7

`core.projects` note #33 got `OWNER ORDER 2026-09-02b` today: MERGE each
priority system's best/latest work to main and DEPLOY, in order
35 → 32+36 → 01 → .... System 35 was already fully diagnosed (STATUS.md
here in `apps/35-kioskfleet`, session 7): 0 `core.build_tasks` todo rows,
a clean 14-commit-ahead integration tip, but no way to actually promote it
from this sandbox (no Railway CLI/token). This round did the equivalent
check for the next system in priority order, 32+36, instead of re-running
the same diagnosis on 35 a second time (that would be exactly the busywork
the new owner order says to stop).

**Build state:** `core.build_tasks` has **zero** `todo` rows for `32`, `36`,
`01`, `15`, `35` (all `done`) — confirmed live via MCP this round. There is
no pending feature work in this loop's slice; what remains is purely the
deploy step.

**Integration tip:** `feat/32-36-nadlan-reconcile-orphaned-chain-0902`
(`782cbe60`) already reconciles the full ~59-branch, ~1700-commit P2 chain
(360 panorama, street-video walk, TABU + tik-meida-le-heter workflows,
comparables trend chart, marketing-copy/images homepage, personal history,
report/report-pull audit trails, nadlan-pro team/forum/rentals/office-site/
lead-intake/area-watch, RLS + FK-index + search_path perf/security fixes)
into a single clean tip. `git rev-list --left-right --count` against this
repo's own main branch (`claude/build-monorepo-more30-peilok`) shows the
reconcile tip is strictly ahead (0 commits behind), and `git merge-tree`
against their merge-base shows a clean merge with no conflict markers in
the P2-scoped files. Same shape as 35: reconciled, tested (per each session's
own individual verification, logged throughout `apps/32-nadlan-berega/
CLAUDE.md`), not merged.

**What "deploy" actually means here — new finding this round, more severe
than 35's case:** unlike kiosk (a single Railway service tracking one
branch), `/nadlan` and `/tivuch` are **not served by this monorepo's git
history at all**, even though `apps/32-nadlan-berega/` lives here. Checked
three independent ways:
1. This repo's own `vercel.json` (root) has `"git": {"deploymentEnabled":
   false}` — pushing to this repo's `origin` (`l023131500-ops/-`) would not
   trigger a Vercel build even if it were otherwise safe to do.
2. `NIGHT_PROGRESS.md` documents the real mechanism used every time `/nadlan`
   and `/tivuch` actually went live: a **separate Vercel project per system**
   (`nadlan-more30`, `nadlan-pro-more30` — "אינו ב-monorepo `apps/` כלל"),
   updated by manually staging a build into `_deploy/<proj>/` and running
   `vercel deploy --prod` from a machine with the Vercel CLI and
   `l023131500-ops-projects`-scoped credentials, then the **portal's own**
   `vercel.json` rewrites proxy `more30.com/nadlan` → that separate project.
   `SYSTEMS_STATUS.md` (17/08 Lighthouse pass) confirms `/nadlan`/`/tivuch`
   are live today — but that reflects whatever was last hand-deployed that
   way, not this branch's tip.
3. This sandbox has **no Vercel CLI, no Railway CLI, and no `deploy_to_vercel`
   MCP tool connected** (checked `which vercel railway` → empty; `ToolSearch
   vercel deploy` → only `mcp__supabase__deploy_edge_function` matches,
   unrelated). The MCP tool `NIGHT_PROGRESS.md` describes using for this
   exact purpose in an earlier session is not available in this session.

**Net effect:** for 32/36 (and, by the same argument, likely 01/15 — not
individually re-verified this round to stay in scope), reaching the
`OWNER ORDER 2026-09-02b` deploy mandate needs two things this sandbox does
not have: (a) this session's own standing rule against pushing a
production-tracked branch, same as documented for 35, and (b) — new this
round — the actual deploy credentials/CLI simply are not present here even
if (a) were resolved. Unlike 35 (one `git push` + an unknown-shape "Railway
promote" step), getting 32/36 live requires a human with the Vercel CLI
logged into `l023131500-ops-projects` to pull this reconciled tip and run
the `_deploy/`-staging + `vercel deploy --prod` sequence `NIGHT_PROGRESS.md`
documents. Flagging this precisely, the same way 35's session 7 did, instead
of leaving "not deployed" as an unquantified recurring note.

Not merged, not deployed, no code changed this round (verification-only,
zero new commits to app source). `core.build_tasks` for 32/36 confirmed
still 0 `todo` — no regression, no new work invented to look busy.
