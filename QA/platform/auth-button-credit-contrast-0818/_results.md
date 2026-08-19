# auth-button.js — footer credit contrast fix (0818)

## Root cause
`portal/public/auth-button.js` injects `body > a.more30-credit` (footer credit
link, "פותח ע״י עולם הסטארטאפים") into all 24 systems that load the shared
script. It used `color:inherit; opacity:.65`. Measured on egod 17/08
(`QA/platform/egod-lh-a11yfix-0817`): 4.37:1 against the site's own inherited
color/background — below the 4.5:1 AA floor for 12px text. Left open at the
time because it's out of scope for a single-system step (shared file, 24
consumers) — flagged in SYSTEMS_STATUS.md row 15/egod but never actually
blocked on a user decision (no NEEDS_USER entry existed for it).

## Fix
`portal/public/auth-button.js`: resting opacity `.65` → `.8` (hover stays `1`).
Copied to `portal/dist/auth-button.js` (byte-identical, verified via hash),
staged with `scripts/stage-portal.ps1`, deployed `vercel deploy --prod --yes
--scope l023131500-ops-projects` from `portal/dist` → `dpl_6LGwbNoRk6J4k4RR5dKjkcyBfFba`, READY.

## Verification (live, cache-busted)
`https://more30.com/auth-button.js?cachebust=<rand>` — contains `opacity:.8`,
no `opacity:.65` remaining.

Playwright against `https://more30.com/egod` (real production page, real
computed styles, not the source file in isolation):
- `a.more30-credit` computed color: `rgb(27, 44, 90)`, opacity `0.8`
- Actual page background behind it: `rgb(245, 246, 250)`
- Composited color: `rgb(70.6, 84.4, 122)`
- **Contrast ratio: 6.88:1** (was 4.37:1) — clears the 4.5:1 AA floor with
  margin, since egod's underlying full-opacity color contrast is much higher
  than the previous opacity-.65 composite.

## Scope
Single shared file touched (`portal/public/auth-button.js` + its `dist`
mirror). No per-system code changed. Affects the footer credit link's resting
contrast on all systems that load the script — verified directly only on
egod (the system that originally measured 4.37:1), since that's the only
site with a saved before/after Lighthouse baseline for this specific element.
Protected systems (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) untouched.
