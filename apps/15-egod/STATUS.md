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

**[2026-09-03, loop A] New real gap found + fixed: `materials.duration_seconds`
was schema-only.** Column added in migration `20260504220643` alongside
`media_kind` but never written on upload and never rendered anywhere —
`Materials.tsx` (portal upload), `RabbiPublic.tsx` (public profile) and
`FeaturedMaterialsSection.tsx` (homepage) all handled video/audio playback
but the duration field stayed permanently `NULL`, same "modeled but
unwired" pattern as the other 15+ fixes already closed for this system.
Fix: capture duration client-side via a hidden `<video>`/`<audio>` element's
`loadedmetadata` event before upload (`getMediaDuration` in
`Materials.tsx`), store it as `duration_seconds` on insert, and render it
as a `mm:ss`/`h:mm:ss` badge (new shared `formatDuration` in `src/lib/utils.ts`)
next to the media title in all three read paths. Purely additive — no
existing field, query, or RLS policy touched; `materials` RLS ("Uploaders
manage own materials") already permits the uploader to set any column on
their own insert, so no policy change was needed. Not committed to
`core.build_tasks` as a pre-existing row (it wasn't one) — inserted as a
new row and marked done in the same session; see commit for the id.
15-egod's own Supabase project (`hkkkynyoigzlttpynoeo`) is not MCP-reachable
from this session (per `CONNECTIONS.md`), so verification here is static:
bracket-balance clean on all 4 changed files (Materials.tsx, RabbiPublic.tsx,
FeaturedMaterialsSection.tsx, lib/utils.ts), the new state (`any[]`) and prop
paths were traced end-to-end by hand, and the `select("*")`/explicit
duration_seconds select on both read sites were confirmed to already or now
include the column. No `npm install`/typecheck run (no `node_modules` in
this sandbox, and installs are disallowed this session) — same limitation
noted by every prior app.html/tsx-only round in this repo.

**[2026-09-03, loop A] New real gap found + fixed: teacher matching-preference
columns on `profiles` were schema-only.** `profiles.background`,
`teaching_style`, `speaking_style`, `target_audience`, `lesson_locations`,
`frequency`, `available_days`, `available_hours` (all `text[]` except
`frequency`) were added together in migration `20260501082815` — the exact
same columns `TeacherForm.tsx`'s intake questionnaire already collects via
`MultiSelect`/`RadioSelect` — but every one of them was write-only-never
(no field in `PortalSettings.tsx`) and read-only-in-one-place:
`AdminMatching.tsx`'s AI-match prompt already selects `target_audience` off
`profiles` and inlines it into the Claude prompt (`aiMatch()`, line 77), so
that feature has been silently running on permanently-empty data since it
shipped. Same "modeled but unwired" bug class as `duration_seconds`/
`years_teaching`/`custom_category` fixed earlier today.

Fix: added all 8 fields to `PortalSettings.tsx`'s `Profile` type/`empty`
default, a generic `toggleArr` helper (parallel to the existing
`toggleAgeGroup` one), and a new "העדפות התאמה" block in the profile tab
reusing the exact same `MultiSelect`/`RadioSelect` components and option
lists (`backgroundOptions`, `teachingStyleOptions`, `speakingStyleOptions`,
`audienceOptions`, `locationOptions`, `frequencyOptions`, `dayOptions`,
`hourOptions`) `TeacherForm.tsx` already uses at intake — visual/UX
consistency for free. No special save-path handling needed: `handleSave`
already spreads arbitrary `profile`-state keys into the `update()` call
(same mechanism that round-trips `website_url`/`social_links`), so adding
the fields to the `Profile` type was sufficient to make them persist.

Also surfaced all 8 on the public profile (`RabbiPublic.tsx`) as a new
"אופי השיעורים" section (tag-group badges + a `קביעות:` line for
`frequency`), via a new `TagRow` helper, so a visitor can see a teacher's
style/audience/availability before reaching out — mirrors the precedent of
surfacing `years_teaching`/`gender`/`preferred_age_groups` in the hero.
Caught and fixed one bug of my own before verifying: the section's
visibility guard originally mixed array-length numbers and the `frequency`
string under `||` then compared the result `> 0`, which would coerce a
non-empty Hebrew `frequency` string to `NaN` and hide the whole section
when only `frequency` was set — rewrote as an explicit `!!(...)` boolean
instead of a numeric comparison.

Verified via esbuild transpile of both edited files (tsx loader, zero
errors) plus a manual bracket-balance count (parens/braces/brackets
matched exactly on both files) — same constraint as every other egod round
this session: this app's own Supabase project (`hkkky...`) is not
MCP-reachable, so no live round-trip query was possible. `profiles`' own
RLS already lets a user update arbitrary columns on their own row (that's
how `years_teaching`/`gender` already round-trip), so no policy change
needed. Zero existing field/behavior touched, purely additive.
