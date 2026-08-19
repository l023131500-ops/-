# kiosk (35) — round-3 dark-mode contrast recheck — 18/08

Last of the round-3 dark-mode contrast recheck sweep (torah/modaot/tamlul/smel/galil/briut/bkalot done in
prior steps this session). kiosk deploys from a different repo (`l023131500-ops/zol`, branch
`claude/what-do-you-see-gxo5tc`, `kiosk/server` — see memory `kiosk-deploys-from-a-different-repo`), so
this cannot be committed here to ship; fixed via the GitHub Contents API against that repo/branch directly,
same pattern used for the dark-mode toggle in POLISH_BACKLOG.md.

## Finding

`contrast-probe.mjs` against `https://more30.com/kiosk/console` (colorScheme: dark, 1440px):

```
1.75:1 (needs 4.5) — label 13px/600 rgb(51, 69, 95) on rgb(19, 28, 46)   "שם משתמש"
1.75:1 (needs 4.5) — label 13px/600 rgb(51, 69, 95) on rgb(19, 28, 46)   "סיסמה"
3.22:1 (needs 4.5) — a    16px/400  rgb(42, 97, 232) on rgb(19, 28, 46)  "← חזרה לאתר"
```

Confirmed visually before fixing (`kiosk-dark-before.png`) — both field labels and the footer link were
genuinely hard to read on the dark login card. Re-ran in light mode: `no contrast failures` (theme-independent
regression that only manifests in dark mode, same class as the other systems in this sweep).

## Root cause

`kiosk/server/public/css/style.css` (fetched live, 14,548 bytes, matches production byte count from prior
sessions):

- `.field label { ...; color: #33455f; }` — a literal hex color, never redefined under `:root.dark`, so it
  stays fixed while the card background flips to the dark surface (`--card: #131c2e`).
- `a { color: var(--accent); }` — `--accent` (`#2a61e8`) is also used as a *background* under white text
  elsewhere (`.btn-primary`, `.side nav a.active`, `.skip`), so it correctly never flips with the theme. But
  the same token used as plain link-text color on a dark surface (the "חזרה לאתר" link on the login card)
  drops under the 4.5:1 floor once the card goes dark.

## Fix

- `.field label` color: `#33455f` → `var(--muted)` (the token already used for muted text elsewhere in the
  file, and already flips correctly: `#5c6a80` light / `#9aa8bf` dark, ~7:1 on the dark card per the file's
  own documented dark-mode contrast comment).
- Added `:root.dark a { color: #6ea0ff; }` — overrides only the plain-link-text color in dark mode; `--accent`
  itself is untouched so every background usage (`.btn-primary`, `.side nav a.active`, `.skip`, `.plan.featured`
  border, `.step .n::before`) keeps its original color in both themes. Checked `js/app.js` for other `<a>`
  elements first (the only other one is the user-guide link, which also sits on a `--card` surface, so the
  same override helps it consistently).

Computed `#6ea0ff` against the dark card background (`#131c2e`) via the WCAG relative-luminance formula:
~6.6:1, comfortably above the 4.5:1 floor.

## Deploy + verify

Shipped via `PUT /repos/l023131500-ops/zol/contents/kiosk/server/public/css/style.css` on branch
`claude/what-do-you-see-gxo5tc` (commit `3e567bb`), which triggers the Railway build for the `kioskfleet`
service. Live re-check with a cache-buster:

- `contrast-probe.mjs` dark mode on `/kiosk/console`: 3 findings → 0.
- `contrast-probe.mjs` light mode: unchanged (`no contrast failures`, same as before).
- Screenshots: `kiosk-dark-after.png` (labels and footer link both clearly legible now),
  `kiosk-light-after.png` (unaffected).

`apps/35-kioskfleet/server/public/css/style.css` in this monorepo is a different, larger build (61,254 bytes
vs 14,548 live) per the standing memory note — intentionally not touched, since editing it would not affect
production and could be mistaken for the real source later.

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873).
