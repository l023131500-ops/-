# 15 egod — deploy-readiness (P3, per OWNER ORDER 2026-09-02b)

Short by design — see `apps/01-torah-platform/STATUS.md` for the full
cross-system reasoning; this file only records what's specific to egod
rather than re-deriving the same conclusion a fourth time (that repeat
would itself be the busywork rule 2 of the 2026-09-02b order bans).

**Build state:** `core.build_tasks` has zero `todo` rows for `15`. Live at
`https://more30.com/egod` (HTTP 200, confirmed this session).

**Same deploy mechanism as 01, same blocker.** Unlike the "not vendored"
note in `apps/15-egod/app.json`, egod's source *is* vendored here and its
real deploy history is in this repo's own log: commit `6a1e5128` (owner's
machine, 2026-08-19) documents the actual pipeline —
`apps/15-egod` → `vite build` → robocopy `dist/` into
`_deploy/egod-more30/egod` → `vercel deploy --prod` from the linked
`egod-more30` Vercel project (prebuilt-only, `buildCommand: echo no-build`).
Same shape as 01/32/36: no Vercel CLI or deploy-hook credential exists in
this sandbox (`which vercel` empty, nothing in `core.automations` /
`core.missing_tokens`), so this session cannot run that last step either.

**Not reconciled, and deliberately left that way.** Egod has 10 open
`fix/15-egod-*-0902` branches (6–15 commits each ahead of this tip,
one per completed `build_task`), never merged into a single integration
branch — the same shape 35/32/36/01 had before earlier sessions today
folded each into one tip. `OWNER ORDER 2026-09-02b` rule 2 explicitly
lists "orphaned-branch reconciliation" as banned busywork now, so this
session does not start that merge for egod; noting the branch list here
so the gap is visible rather than silently skipped:
`fix/15-egod-{custom-sections-wireup,featured-materials-homepage,
forum-access-control,forum-comments-wireup,forums-post-toggle,
lessons-recording-status-public-profile,public-profile-contact-fields,
public-profile-materials,route-level-feature-gate,teacherform-lead-kind}-0902`.

**Slice status (35, 32, 36, 01, 15 — this session's full assigned scope):**
all five systems now have zero open `build_tasks` and a documented,
Vercel/Railway-CLI-shaped deploy blocker. No further compliant action
exists in this sandbox without one of: (a) owner-supplied deploy
credentials/CLI, or (b) an explicit owner decision on the standing
conflict between this session's "never push to main" instruction and
`core.projects` note #33's 2026-09-02b mandate to merge reconciled tips
to main and push. Not merged, not deployed, no app-source lines changed
this round (verification-only: this file).
