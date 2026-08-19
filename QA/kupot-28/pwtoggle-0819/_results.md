# kupot (28) admin login — "show password" toggle

Date: 2026-08-19

## Why
`more30-priority.md` §1א (mandatory, blocks user testing) requires an eye
icon on every password field: "הוסף כפתור 'הצג סיסמה' (עין) בכל שדות
הסיסמה". The kupot admin login page (`apps/28-kupot-health-funds/server/admin-page.ts`)
was built and deployed to production 19/08 (commit b32ce3c) without one —
it predates today's audit and was missed because it's a hand-embedded
HTML string, not the shared `/login` component that already has this
(`portal/public/login.html`).

## What changed
Additive only, same file (`server/admin-page.ts`):
- `.pw-wrap`/`.pw-toggle` CSS (icon button positioned inside the input).
- An eye/eye-off SVG toggle button next to `#pw`, same markup pattern and
  `aria-pressed`/`aria-label`/`title` behavior as `portal/public/login.html`'s
  `#pwToggle` (kept in sync deliberately, not reinvented).
- One click handler: flips `pw.type` between `password`/`text`, keeps
  aria state and the swapped icon in agreement (the exact bug class the
  `/login` implementation's own comment warns about — a button that says
  "show" while the field is already shown).
- No other code touched: login POST, cookie flow, table rendering,
  logout — all byte-identical to the version verified 19/08 in
  `QA/kupot-28/switch-lead-verified-0819`.

## Verified
- `tsc --noEmit` in `apps/28-kupot-health-funds` — clean, no new errors.
- Local: rendered `renderAdminPage()` to static HTML via a throwaway
  `tsx` script, served on `localhost:8934`, Playwright round-trip —
  typed a password, clicked toggle → `type` flips to `text`, value
  stays intact, `aria-pressed="true"`, `aria-label="הסתר סיסמה"`, eye-off
  icon shown/eye icon hidden; clicked again → reverts to `password`,
  `aria-pressed="false"`, `aria-label="הצג סיסמה"`. Screenshot:
  `pwtoggle-0819-visible.png`.
- Built `script/build-vercel-fn.ts` (esbuild, same command as the
  previous kupot deploy) → `api/index.js` 1.7MB, matches the known-good
  size from `QA/kupot-28/switch-lead-verified-0819`. Confirmed `pwToggle`
  present in the bundled output before copying to `_deploy/kupot-more30`.
- Deployed `vercel deploy --prod --yes` from `_deploy/kupot-more30`
  (project already linked via `.vercel/project.json`) — ~10s upload,
  READY, same fast profile as the known-good deploy (not the ~2min
  build-failure signature from the earlier trap in this app).
  `dpl_5w1aXCcBJEX1V1M9VEeX3tfyKsi3`.
- **Verified live** (Playwright, `more30.com/kupot/api/admin?cachebust=0819pwtoggle`):
  toggle button renders, click flips a typed value from `password` to
  `text` type in the real page. Console: 1 pre-existing 403 on
  `/api/switch-leads` (expected — no session cookie yet, same as the
  prior verified entry) + 1 pre-existing DOM verbose notice (password
  field not wrapped in a `<form>` — unrelated to this change, not a
  console error). No new console errors introduced.
  Screenshot: `pwtoggle-0819-live-visible.png`.

## Not touched
Protected systems (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) —
untouched. No DB writes. No other system's login page touched this step
(the shared `/login` and the other 4 systems from the dark-mode-toggle
backlog already have this; a system-by-system sweep for per-app
custom login forms without it is the natural next step, not done here).
