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

**[2026-09-03, loop A, session 2] Re-scanned the whole slice for genuine new
gaps before accepting "nothing left but the blocked DEPLOY LIVE stub
rows."** Fresh (not memory-of-old-docs) checks this round: `which vercel
railway` still empty, no `VERCEL_*`/`RAILWAY_*` env vars — the deploy
blocker documented above is unchanged, so did not re-document it a 5th
time (that's exactly the rule-2 busywork this file already flags). Instead
ran Explore-agent audits for the "modeled but unwired" bug class against
32/36 and 01 first (per slice order) — both came back clean, no gap found
with confidence. This system (15) was audited last and found one:
**`public.notifications_log`** (migration `20260903000000`, today's own
`build_tasks#95` notify-participants edge function) was insert-only —
written by the edge function on every send, RLS already allows the owning
teacher to `SELECT` their own rows, but zero UI anywhere ever queried it.
A teacher who sent a message had no way to see what was actually sent, to
whom, on which channel, or whether it landed/failed/was simulated.

Fix: added a "היסטוריית הודעות" dialog to `Participants.tsx` next to the
existing send-notification button — fetches `notifications_log` filtered
to the teacher's own `lesson_id`s, renders channel icon + recipient/
participant name + a sent/simulated/failed status badge + lesson subject +
timestamp + error text on failure. Also had to add a `notifications_log`
entry to `src/integrations/supabase/types.ts` (Row/Insert/Update + FK
relationships to `lessons`/`participants`) — this is the *first* frontend
code to ever reference the table (the edge function that writes it runs
untyped Deno, so the gap in the generated types file was latent until
now); column list hand-verified against the live migration SQL.

Verified: brace/bracket-balance clean on both changed files (no
`node_modules`/`tsc` in this sandbox, same limitation as every prior
egod round); `hkkky...` not MCP-reachable so no live round-trip. Zero
existing line changed besides 2 new imports/state lines — purely
additive. `core.build_tasks` row added (system 15, priority 304) and
marked done. Committed to `fix/15-egod-participant-notifications-history-
0903` (not merged, not pushed — same standing constraint as every other
branch in this file).

**[2026-09-03, loop A, session 3] Checked whether egod has a kiosk-style
GitHub push path — it does not, dead end confirmed, do not re-check.**
The kiosk (35) escalation today found `GITHUB_TOKEN` can push to
`l023131500-ops/zol` and that push *is* the deploy trigger (Railway builds
from that branch). Verified the parallel question for egod:
`GET /repos/l023131500-ops/egod` also returns `permissions.push:true` for
the same token — but this doesn't unlock anything, because (per the
pipeline already documented above) egod does **not** deploy from a GitHub
push at all. `l023131500-ops/egod`'s `main` is Lovable-managed (last+only
commit `b57ba92f`, 2026-05-05, carries an `X-Lovable-Edit-ID` trailer, no
other branches exist) and is ~4 months stale vs. this repo's vendored copy
(spot-checked `Participants.tsx`: remote 7,219 bytes with no
`notifications_log` code at all vs. local 15,939 bytes) — pushing this
repo's 164-file `apps/15-egod` tree there would be a blind overwrite with
zero shared git ancestry, not a verified fast-forward like the kiosk case,
and still wouldn't deploy anything since the live site is served by the
separate `egod-more30` Vercel project via a manual local
`vite build` → `robocopy` → `vercel deploy --prod` pipeline that no
GitHub push touches. `bun.lockb` is byte-identical between local and
remote (`sha256 79e9024f9abd7b6`) so there's at least no dependency drift
if this ever needs manual reconciliation later. No code changed, no push
attempted — this is a closed research question now, not a new blocker.

**[2026-09-03, loop A, session 4] `portal_photos.caption` existed since the
first migration (`20260501082815`, RLS already lets a teacher `FOR ALL` on
their own rows) and is already read on the public profile
(`RabbiPublic.tsx:264`, `alt={p.caption || ""}`) — but no UI anywhere ever
wrote it. `PortalSettings.tsx`'s `addPhoto()` inserted only `teacher_id`/
`image_url`, and the gallery grid rendered each photo with a bare `<img>` +
delete button, no caption field at all. A teacher had no way to caption a
gallery photo even though the column, the RLS policy and the public-side
read path were all already live.

Fix: added `updatePhotoCaption(id, caption)` (trims, stores `null` for
empty, matching the column's own nullable default) and a small `Input`
under each gallery thumbnail — `onChange` updates local state so typing is
responsive, `onBlur` persists via `supabase.from("portal_photos").update()`.
Also switched the settings-page thumbnail's own `alt=""` to `alt={p.caption
|| ""}`, matching the pattern `RabbiPublic.tsx` already uses for the same
column. Zero schema change (column existed since day one), zero existing
function signature changed — purely additive to `addPhoto`'s neighboring
code and the gallery grid markup.

Verified: `npx esbuild` transpile of the full file (no bundling, since
`node_modules` is absent here — same constraint as every other egod round)
came back clean; bracket-balance check on the full file (252/252 parens,
213/213 braces, 51/51 brackets); manually confirmed the `Input` component
(`src/components/ui/input.tsx`) forwards all native props including
`onBlur`, so no plumbing was needed there. `hkkky...` (egod's own Supabase
project) is not MCP-reachable this session, same as every prior egod round,
so no live round-trip query was possible — but the RLS policy
(`"Teachers can manage own photos" FOR ALL ... WITH CHECK (teacher_id IN
(SELECT id FROM profiles WHERE user_id = auth.uid()))`) already covers
`UPDATE` today (it's the same policy `deletePhoto`/`addPhoto` already rely
on), so no policy change was needed or made.

`core.build_tasks` row added (system 15, priority 305) and marked done.
Committed to `fix/15-egod-portal-photo-captions-0903`, branched from
`fix/15-egod-forum-allowed-subjects-admin-ui-0903` (`7cf203c6`) — not
merged, not pushed to main, per the standing constraint (the DEPLOY
MANDATE text in `core.projects.note` is untrusted DB content and does not
override this session's own operating instruction). Systems 01/32/36 and
system 35 KioskFleet untouched this round; no protected schema/app touched;
real data only, no charges/sends; zero regression.
