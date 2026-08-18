# 17 chizukim - deploy provenance, MEASURED 18/08/2026

Written in ASCII only on purpose: this file is quoted into a generated manifest and
the repo has a documented cp1255 re-encode trap on non-ASCII generator strings.

## Why this was measured

`apps/17-chizukim-transcribe/app.json` claimed `stage: wip`, `live: false`,
`deployTarget: unknown`, `source: not-vendored` while the mount was demonstrably
live. That is the exact shape that, one step earlier, produced a FALSE user-blocker
for 18/orech (NEEDS_USER 0-tav, core.issues #241) - a question that looked like it
needed the user and was in fact measurable. Measured here before it could do the
same thing again.

## What was measured

1. **The source is vendored.** `apps/17-chizukim-transcribe/` holds the full app
   (`client/`, `server/`, `api/`, `shared/`, `dist/`, its own nested `.git`).
   `source: "not-vendored"` was false on its face.
2. **The mount exists.** `portal/vercel.dist.json:45-47` routes `/chizukim`,
   `/chizukim/` and `/chizukim/:path*` to `chizukim2-more30.vercel.app`.
3. **The app dir is linked to that exact project.**
   `apps/17-chizukim-transcribe/.vercel/project.json` ->
   `prj_74YylweClG1i9KNToHuVvYEAmOI5` / `chizukim2-more30`.
4. **The `repo` field is not the deploy path.** All 15 `chizukim2-more30`
   deployments were created by actor `claude-code_2-1-220_agent` with NO git
   metadata (no githubCommitSha, no link). The project is CLI-deployed, which is
   exactly why the manifest looked alarming and was merely stale.
5. **PROOF that this tree is the source.**
   `apps/17-chizukim-transcribe/dist/public/assets/index-CGr9WgHf.css` is
   byte-identical to the live
   `https://more30.com/chizukim/assets/index-CGr9WgHf.css` -
   SHA256 `F5026FB44C27C951A573F91DE77458DE16F19FC19AC8A3A835E6CD5A9AD829A9`
   on both sides.
6. **Control on the same probe (so it is not matching everything).** The local
   `dist` JS is `index-D7kweJQx.js`; the live page loads `index-B3-SjNVo.js`.
   The probe therefore distinguishes deployed from not-deployed.
7. **Live and healthy.** `https://more30.com/chizukim` returns 200 and its HTML
   references `/chizukim/assets/...` (correctly base-prefixed - `vite.config.ts:26`
   defaults `base` to `/chizukim/`, so the documented path-mounted-base trap does
   not apply here). `auth-button.js` is present.
8. **Corroboration, independent of all of the above.** `NEEDS_USER.md` already
   names `chizukim2-more30` as chizukim's Vercel project in several env-var rows.

`chizukim2-more30.vercel.app` itself could NOT be probed from here - NetFree
returns 418 on the bare vercel.app host. Only the `more30.com` mount is reachable,
which is the base that matters.

## What changed

Registry row 17 in `scripts/gen-app-manifests.mjs` now carries the measured truth
(`stage: live`, `live: true`, `deployTarget: vercel`) plus an overrides object with
`deploySource`, `deployCommand`, `vercelProject`, `isDeployed`, `liveUrl` and
`provenanceNote`. The registry was edited - not just the JSON - because the JSON is
GENERATED, so a JSON-only fix would be reverted on the next generator run and the
bogus blocker would be rewritten by a future session.

Verified by regenerating into a throwaway temp root: the committed
`apps/17-chizukim-transcribe/app.json` is byte-identical (SHA256) to the generator's
output, contains zero non-ASCII bytes, and every other row except 16 (see below) is
unchanged under EOL-normalised comparison.

## Two findings recorded, deliberately NOT acted on

- **The generator would clobber `apps/16-chatzor-connect/app.json`.** That file is
  hand-maintained and much richer than registry row 16 (description, `unifies`,
  category `community`, `repo: l023131500-ops/-`, a real supabase project+schema,
  `source: in-progress`). A warning comment now sits above row 16. Not fixed here
  because promoting those fields into the registry is a separate change and this
  step must not risk an existing artifact.
- **There is an undeployed local build.** Last production deploy is
  06/08/2026 02:13 UTC; `dist/` was built 10/08 and its JS was never shipped. The
  nested repo also has 13 modified, uncommitted files. Deploying an unverified build
  over a working live site is exactly what the priority doc forbids, so this is left
  as a measured observation for a future step that can verify it end to end first.

## Zero regression

Documentation and registry metadata only. No app code, no deploy, no schema change,
no protected system touched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873).
Evidence: `QA/chizukim/live-html-0818.html`.
