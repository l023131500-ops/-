# galil (24) — hero heading invisible in dark mode, fixed 18/08

## Finding
`node scripts/qa/contrast-probe.mjs https://more30.com/galil 1440 dark`
flagged many elements; most are false positives from the probe's backdrop
walker (it reads `background-color` only, not the gradient/shorthand
`background` this app's body actually uses). One held up under a direct
screenshot (`galil-dark-emulated.png`, before): the hero h1 "מחוברים —
יהדות וקהילה" rendered near-black on the hero's dark backdrop — genuinely
unreadable, not a probe artifact.

## Root cause
`apps/24-galilee-connect-hub/src/components/HeroSection.tsx` paints its own
background as a hardcoded-always-dark gradient (not the theme-aware
`--gradient-hero` token), but used `text-primary-foreground` for its text.
That token exists to invert per theme so text on `--primary`-colored
buttons stays readable. In `.dark`, `--primary-foreground` flips to
`205 55% 8%` (near-black — correct for text on the brighter dark-mode
primary button, wrong for text on a background that never changes).

## Fix
- `src/index.css`: new `--hero-foreground: 210 50% 98%` in `:root` only
  (not overridden in `.dark`, so it never flips — matches the always-dark
  hero backdrop).
- `tailwind.config.ts`: registered `hero-foreground` color token.
- `src/components/HeroSection.tsx`: swapped all four `primary-foreground`
  usages (h1, subtitle paragraph, particle dots, scroll chevron) to
  `hero-foreground`.

## Verification
- `vite build` clean; `--hero-foreground` present in built CSS
  (`dist/assets/index-CvkIn0dX.css`).
- Deployed: `_deploy/galil-more30/galil` (robocopy /MIR from `dist`),
  `vercel deploy --prod`, `dpl_CbVd3qi84RP13tJKCc56XUvj2BTi`, READY,
  aliased `galil-more30.vercel.app`.
- Live, `https://more30.com/galil` with cache-buster, Playwright:
  - dark scheme: h1 color `rgb(247, 250, 252)` (was near-black) —
    `galil-dark-after-fix.png` shows the heading clearly white and
    readable.
  - light scheme: h1 color `rgb(247, 250, 252)` — unchanged from before
    the fix (same number `--primary-foreground` already had in light
    mode), so the light-mode look is untouched.

## Files
- `galil-dark-emulated.png` — before, dark scheme, hero heading unreadable.
- `galil-dark-after-fix.png` — after, dark scheme, hero heading white.
- `_shot.mjs` — the verification script (re-runnable).
