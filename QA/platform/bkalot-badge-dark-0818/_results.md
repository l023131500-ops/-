# bkalot (10) — round-3 dark-mode contrast recheck — 0818

Continuing the round-3 dark-mode a11y recheck (torah/modaot/tamlul/smel/galil/briut
already done). Next queued POLISH_BACKLOG toggle system: bkalot (10).

## Finding

`node scripts/qa/contrast-probe.mjs https://more30.com/bkalot 1440 dark` found 39
failing elements, all white (`#fff`) text on `var(--teal)`/`var(--teal-d)`
backgrounds: `.btn-primary` (2.46:1), `.how-card .hn` step badges (2.46:1),
`.dl-badge`/`.dl-badge-alt` (2.46:1 / 1.84:1), `.dl-pptx-ico` (1.84:1), footer
copy (1.35:1). Re-ran in light mode on the same page: zero failures in these
elements — theme-independent regression, not present before dark mode was added.

## Root cause

`apps/10-bkalot-rights/style.css`: `--teal`/`--teal-d` are dual-purpose tokens —
used as **text color** (headings, links, stat numbers — correctly lightened in
`:root.dark` for legibility on the dark surface) and as **background color under
fixed white text** (`.btn-primary`, `.dl-badge`, `.how-card .hn`, `.sit-chip`,
`.src-bklot`/`.src-gov`, `.site-footer`, `.pt-card` gradient, `.dl-pptx-ico`).
`:root.dark` lightens `--teal` `#20808D`→`#4FB3C0` and `--teal-d` `#1B474D`→`#7FCBD6`
so the tokens stay readable as *text*, but that same lightening breaks every
place they're used as a *background* under white text (2.46:1 / 1.84:1, needs
4.5:1). Same class of defect already fixed on smel (dark-tier-card) and galil
(hero-foreground) — a shared token flipped for one role and broke a second role.

## Fix

Added two fixed tokens to `:root` only (not redefined in `:root.dark`, so they
never flip): `--teal-solid:#20808D; --teal-d-solid:#1B474D` — the original
light-mode values, which already cleared 4.5:1 with white text (unchanged light
mode). Repointed every background-with-white-text usage to the solid variants:
`.btn-primary`/`.btn-primary:hover`, `.how-card .hn`, `.sit-chip`, `.src-bklot`/
`.src-gov`, `.site-footer`, `.pt-card` gradient stop, `.dl-badge`/`.dl-badge-alt`,
`.dl-pptx-ico`. Text-color usages (headings, links, `.stat .num`, etc.) were left
on `var(--teal)`/`var(--teal-d)` so they keep lightening correctly in dark mode.
`.sit-chip`/`.src-bklot`/`.src-gov` are in the results section (hidden until a
questionnaire is submitted) — not reachable by the probe on initial load, fixed
anyway since it's the same root-cause token and same one-line change.

## Verify

Static site (no build step). Confirmed the on-disk `_deploy/bkalot-more30/bkalot/`
copy was byte-identical to the live site before editing (only a UTF-8 BOM
difference from `git show HEAD:`, not a content divergence — see
[[deploy-copy-can-break-live-sites]]). Copied the edited `style.css` into
`_deploy/bkalot-more30/bkalot/` (hash-verified byte-identical), deployed
`vercel deploy --prod --yes --scope l023131500-ops-projects` from
`_deploy/bkalot-more30` → `dpl_72Ve7ZPKDeGFEHFHyTxeAeV1LEmv`, READY.

Live re-check with a cache-buster:
- `contrast-probe.mjs` dark mode on `/bkalot` — 39 findings → 0.
- `contrast-probe.mjs` light mode — same 3 pre-existing findings as before the
  change (unrelated, see below) — light mode unaffected.
- Playwright screenshot (`bkalot-dark-after.png`) confirms buttons/badges/footer
  stay visually distinct and legible in dark mode.

## Not fixed this step (pre-existing, unrelated)

Light mode probe flags 3 elements in the `.pt-card` "coming soon" price-compare
section (`h2`/`p`/`a.btn-ghost`, ~1.07:1). Confirmed via direct
`getComputedStyle`: `.pt-card` paints `background-color: transparent` +
`background-image: linear-gradient(135deg, rgb(27,71,77) 0%, rgb(20,58,64) 100%)`
— the probe's backdrop-walker only reads `background-color`, so it skips the
gradient and walks up to `<body>` (cream), producing a false low ratio. Same
documented probe limitation already seen on galil/smel/tamlul/modaot. White text
on the real gradient is high contrast. Present identically before this change —
not a regression, not fixed here.

Evidence: `bkalot-dark-after.png` (this folder).
Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873).
