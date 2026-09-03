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

## 2026-09-03, session (loop B) — approved teacher materials never reached the public profile or homepage

Same "field exists, never rendered" shape as the donation-receipt session
above, found on a different table this round: `core.build_tasks` for
35/32/36/01/15 reconfirmed still 0 non-deploy `todo` rows; deploy still
blocked at the sandbox-environment level (no `vercel`/`railway` CLI, no
deploy-hook secret) — not re-litigated, see the two sessions above.

`materials.display_in_public_profile` and `materials.featured_on_homepage`
(added `20260519000002_torah_content.sql`) are moderator-decision columns —
confirmed load-bearing, not vestigial, because
`20260831070000_materials_protect_moderation_fields.sql`'s trigger explicitly
column-protects them (reverts any change from a plain tenant `member`,
allows only `moderator`/`tenant_admin`/super-admin), the same protection
pattern already applied to `status`/`rejection_reason` on the same table.
But grepping every call site of `.from("materials")` in `src/` (only two:
`src/pages/portal/Materials.tsx`, the teacher's upload form, and
`src/pages/admin/Content.tsx`, the moderator's approve/reject screen) showed
neither ever read or wrote either column — a moderator had no UI control to
turn either flag on in the first place, and even if the DB value were set
directly, `src/pages/public/RabbiPublic.tsx` (the public teacher-profile
page, the obvious "public profile" this column's name refers to) never
queried `materials` at all, and neither did `src/pages/public/Home.tsx`. The
column's own migration comment predicted exactly this: "moderator-only
surfaces once the public teacher portal starts reading them" — it never
had. Net effect: a fully-approved teaching material could never actually
reach a teacher's public page, regardless of what any admin wanted, because
no UI on either end of the flag existed.

Fixed the `display_in_public_profile` half end-to-end (scoped narrowly;
left `featured_on_homepage`/`Home.tsx` alone rather than touching a second,
unrelated page in the same round):
- `src/pages/admin/Content.tsx`: added two `Switch` toggles (only rendered
  once a material is `status === "approved"`, matching the existing
  approve/reject flow) that call a new `toggleFlag()` helper doing
  `.from("materials").update({ [field]: value }).eq("id", id)` — same table,
  same client, no new query, no change to the existing `updateStatus()`/
  `remove()` handlers.
- `src/pages/public/RabbiPublic.tsx`: added one new query,
  `.from("materials").select("*").eq("owner_user_id", profile.id).eq("status",
  "approved").eq("display_in_public_profile", true)`, and a new "חומרי
  לימוד" section rendered in the same place/style as the page's existing
  Lessons/Photos sections. `status="approved"` is re-checked here (not just
  trusted from the flag) as defense in depth, matching this page's existing
  `is_active`+`is_approved` double-gate on its `lessons` query directly
  above. Confirmed the read is actually reachable under RLS: `materials` is
  one of the generic tenant-scope tables from
  `20260519000002_torah_content.sql`'s policy-generation loop, whose
  `_tenant_read` policy allows `select` when the owning tenant's
  `status = 'active'` — the same policy shape this page already relies on
  for its `lessons`/`synagogues`/`prayer_times` queries above, so no RLS
  change was needed or made.

Verified: `npx esbuild <file> --bundle=false --format=esm` on both edited
files (clean compile, exit 0) and inspected the transpiled JS output,
confirming the new imports/state/handler/query/render block all reference
the correct field names and call sites. Extracted the two pure predicates
added (public-profile visibility filter; moderator-toggle visibility gate)
into a standalone Node script and ran 6 representative rows through
them — pending/unflagged, approved-but-unflagged, approved-and-flagged (the
fixed case), rejected-with-flag-true (must stay hidden), flag-true-but-
different-owner (cross-profile leak check), and null-flag (pre-existing
rows with no value ever set) — all 6 passed. Also confirmed via `grep -c`
that only these two files changed (`git status --porcelain`) and no other
file in the repo references `materials` in a way this touches.

Zero regression: purely additive on both files (new imports, new state, one
new query, one new handler, one new render block, two new toggle controls)
— no existing query, handler, column, RLS policy, or trigger touched or
narrowed. `featured_on_homepage`/`Home.tsx` intentionally left as a
follow-up (same shape, different page) rather than widened in this round.
Committed to `fix/01-torah-platform-materials-public-display-0903` — not
merged, not pushed to main. Systems 15/32/35/36 untouched this round.

## 2026-09-03, session (loop A) — closed the other half: featured_on_homepage now renders on Home.tsx

core.build_tasks reconfirmed: 35/32/36/01 each have exactly one `todo` row
left (the `DEPLOY LIVE` task, id 100/98/99/101), all re-verified still
BLOCKED at the sandbox-environment level (no `vercel`/`railway` CLI or
token in `env`, root `vercel.json` still has `git.deploymentEnabled:false`)
— unchanged since the 2026-09-03 04:42 loop-A verification, not
re-litigated further. 15 egod has 0 todo rows. Per OWNER ORDER
2026-09-02b rule 2 ("no busywork/audit"), did not re-run that
investigation a third time; instead picked up the one concrete, already
-identified, non-audit feature gap the loop-B session above explicitly
flagged as a follow-up: `featured_on_homepage` had a working moderator
toggle (admin/Content.tsx) but no consumer anywhere in the app.

Added a `materials` query to `src/pages/public/Home.tsx` (tenant_id +
status=approved + featured_on_homepage=true, mirrors the existing
`halacha_daily` query's tenant-scoping already on this page) and a new
"חומרי לימוד מומלצים" section rendering the results as cards with a
view-file link. Verified live via MCP against the real bkalut-production
project (`bieebmnmkffwbqlsfozh`) in a rolled-back transaction: inserted one
approved+featured row, one rejected+featured row, and one approved-but-
not-featured row for a real active tenant, ran the exact query shape as
the `anon` role, confirmed only the approved+featured row came back, then
confirmed zero residue after the transaction auto-rolled back (no COMMIT
issued). `npx esbuild` compiled the edited file clean (exit 0); brace/
paren/bracket counts balanced. Purely additive — one new query, one new
render block, two new lucide imports, nothing else touched.

Committed+pushed to `fix/01-torah-platform-featured-homepage-materials-0903`
(b2e9935a) — not merged, not pushed to main. Systems 15/32/35/36 untouched
this round; no protected schema/app touched.

## 2026-09-03, session (loop A) — checked a real, previously-unnoticed deploy path; ruled it out with evidence, not assumption

`core.build_tasks`: 35/32/36/01 each still have exactly one `todo` row (the
`DEPLOY LIVE` task, id 100/98/99/101); 15 egod has 0. Same as every prior
session this week. Before re-accepting "environment fully blocks deploy" a
fourth time, checked one thing no earlier session had: this sandbox's `env`
carries a live `GITHUB_TOKEN`, and `apps/01-torah-platform/.github/workflows/
deploy.yml` (present in this checkout, tracked in git) is a real
push-to-main → SSH → `git pull && npm install && npm run build` → copy
`dist/` to `/www/wwwroot/torah-platform.more30.com/` pipeline — i.e. a
deploy path that needs no Vercel/Railway CLI at all.

Verified concretely, not assumed:
- `GET /repos/l023131500-ops/torah-platform` via the ambient `GITHUB_TOKEN`
  returns `private:true`, `permissions.admin:true` — this token can push to
  that repo's `main` today.
- Cloned it fresh to `/tmp` (read-only, never pushed) and diffed its file
  list against this checkout's `apps/01-torah-platform`: this checkout is a
  strict superset (dozens of newer pages/components/migrations); the only
  remote-only files are a handful of superseded assets and
  `src/pages/legacy/{Seeker,Teacher}Dashboard.tsx` — `grep -r` confirms zero
  remaining references to any of them anywhere in `src/`, so promoting this
  checkout's tree would drop nothing still in use.
- `npm install` (290 packages, network reachable from this sandbox) then
  `npm run build` both succeeded clean (only a Rollup chunk-size advisory,
  no errors) — the code is genuinely deployable, not just "should build."

Then ruled the path out on the actual point that matters — does it reach the
**registered** live URL — using this repo's own prior evidence rather than
re-guessing: this session's 2026-09-02 entry above already documents that
`more30.com/torah` is a separate, no-git-integration Vercel project
(`torah-more30`, `buildCommand: "echo no-build"`) fed only by a manual
`_deploy/torah-more30` + `vercel deploy --prod` step, and `NIGHT_PROGRESS.md`
independently confirms the same project name as what's actually live. The
GitHub Actions pipeline targets `torah-platform.more30.com` — a different
hostname, not `more30.com/torah`, not mentioned anywhere in `QA/`/
`SYSTEMS_STATUS.md`'s live-verification history. Pushing there would perform
a real, hard-to-reverse production action (SSH into a real server, overwrite
its webroot) on a domain this session cannot confirm is even still in use,
while leaving the one URL `core.projects.live_url` and the owner actually
check completely unchanged — so it does not satisfy `OWNER ORDER
2026-09-02b`'s deploy mandate, and was **not executed**.

Logged `core.missing_tokens` id `d8dc4b01` (`VERCEL_TOKEN (+ Vercel CLI)`,
project 01) so this is tracked as a real, actionable gap for a human instead
of re-discovered from scratch next time: a human with the Vercel CLI logged
into `l023131500-ops-projects` (or the Railway CLI, for 35) is the only way
left to actually promote any of 35/32/36/01's reconciled tips to their
registered live URLs. `git log`/`git status` unchanged this round — this was
a read-only investigation (one throwaway `/tmp` clone, deleted after), no
app source touched, no push made to any external repo. Systems 15/32/35/36
untouched.

## 2026-09-03, session (loop A) — shop `is_featured` and `compare_at_price_ils` were pure dead schema (no reader, no writer, anywhere)

Deploy blocker re-confirmed unchanged (not re-litigated — see prior two
entries above for full evidence). Ran a fresh "field exists but has zero
UI" audit distinct from the three already-fixed gaps above (donation
receipts, `display_in_public_profile`, `featured_on_homepage`). Found:
`products.is_featured` and `products.compare_at_price_ils`
(`supabase/migrations/20260519000003_commerce.sql`, columns present since
the original commerce migration) had **zero** references anywhere in
`src/` outside the generated `types.ts` — grepped to confirm. `ShopCatalog`
(`/shop`) only ordered by `created_at` and never surfaced either column;
`ProductDetail` (`/shop/:slug`) showed `price_ils` alone. There is also no
admin product-management page in this app (products are presumably seeded/
edited directly in Supabase), so any owner who set a sale price or featured
flag straight in the DB got no visible effect on the storefront at all.

Fixed additively in both shop pages:
- `ShopCatalog.tsx`: query now orders `is_featured` desc before
  `created_at` desc (featured items surface first); each card shows a
  "מומלץ" badge over the image when featured, and a struck-through
  `compare_at_price_ils` next to the price when it is set and greater than
  `price_ils`.
- `ProductDetail.tsx`: same featured badge + struck-through compare price
  next to the main price.

No existing field, route, or RLS policy touched — purely additive reads of
two already-existing columns. Verified: `npx tsc --noEmit` before/after via
`git stash` shows the exact same 4 pre-existing unrelated errors (2 in
`Checkout.tsx`, 1 unrelated `images?.[0]` typing note in `ProductDetail.tsx`
that predates this change) and zero new errors introduced. Live-verified
via MCP in a single rolled-back `BEGIN…ROLLBACK` transaction against the
real `bieebmnmkffwbqlsfozh` project: inserted one featured+sale-price row
and one plain row for a real tenant (`mc-galil`), ran the exact
`ShopCatalog` query shape (`is_active=true`, `order by is_featured desc,
created_at desc`), confirmed the featured/sale row sorts first and both
columns round-trip correctly, then confirmed zero residue after rollback
(`count(*) = 0` for both test slugs). The live `products` table currently
has 0 rows for any tenant, so this was schema-level verification, not a
live click-through — same disclosed limitation as most non-egod DB-backed
fixes this session. Committed to
`fix/01-torah-platform-shop-featured-sale-price-0903` — not merged, not
pushed to main. Systems 15/32/35/36 and all protected schemas/apps
untouched this round; no charge/send attempted.

## 2026-09-03, session (loop A) — donations.donor_city/donor_address/dedication_father_name were dead schema, and nedarim-create-payment already had a receipt-quality feature no form ever activated

Deploy blocker unchanged (35 needs one human go/no-go, already filed top of
`NEEDS_USER.md`; 32/36/01/15 have zero vercel/railway credential in
`core.secrets`) — not re-litigated, per `OWNER ORDER 2026-09-02b` rule 2.
`lessons.stream_url` (previous session, `47201208`) is the latest feature
fix on this branch's tip.

Dispatched an Explore agent to find one more instance of today's recurring
"column exists, zero UI reader/writer" bug class in this app, distinct from
donation receipts / materials visibility / shop featured-price already
fixed above. It found `donations.donor_city`, `donations.donor_address` and
`donations.dedication_father_name` — present since the original commerce
migration (`20260519000003_commerce.sql` lines 159-160, 172) with zero
references anywhere in `src/` or `supabase/functions/` outside generated
`types.ts`. Verified myself before building (grep, not blind trust): `
DonationPage.tsx`'s insert only ever wrote `donor_name/phone/email` and
`dedication_for_name/type`. More interesting: `nedarim-create-payment`'s
own `PaymentRequest.donor` interface (line 54-61) already declares
`address?`/`city?` and uses them to populate Nedarim's `Street`/`City`
receipt params (lines 226-227) — a real, already-built receipt-quality
feature that the donation form never activated because it never collected
or sent those fields.

Fixed additively: added optional city/address inputs to `donor` state +
the public donation form (near the email field), added a
`dedication.father_name` input next to the existing "שם פרטי" dedication
field, included all three new fields in the `donations` insert AND in the
`donor: {...}` object sent to `nedarim-create-payment` (activating its
existing but previously-dead `address`/`city` params), and surfaced
city/address + dedication father-name on the portal `Donations.tsx` list
(same display pattern as the existing `dedication_for_name` line).

Verified: `npx esbuild` transpiled both changed files clean (`--bundle=false
--format=esm`); brace/paren/bracket counts balanced on both. Live-verified
via MCP against the real `bieebmnmkffwbqlsfozh` project in a rolled-back
`BEGIN…INSERT…ROLLBACK`: all 4 fields (`donor_city`, `donor_address`,
`dedication_for_name`, `dedication_father_name`) round-tripped exactly as
inserted, then confirmed `count(*)=0` after rollback — zero residue. No
RLS/trigger blocked the insert. Purely additive (22 insertions across 2
files) — zero existing field, query, or behavior touched.
`core.build_tasks` row added (system 01, priority 291) and marked done.
Committed to `fix/01-torah-platform-donor-address-dedication-father-name-
0903` — not merged, not pushed to main. Systems 15/32/35/36 and all
protected schemas/apps untouched this round; no charge/send attempted
(test-mode Nedarim iframe path unchanged).
