# smel (12) — premium-tier card invisible in dark mode, fixed 18/18

## Finding
Round-3 a11y recheck (continuing from galil 18/08), running
`node scripts/qa/contrast-probe.mjs https://more30.com/smel 1440 dark`:
- `1:1` — the "פרימיום" label rendered `rgb(210, 175, 86)` text on a
  `rgb(210, 175, 86)` background — literally the same color, fully invisible.
- `2.1:1` (needs 4.5) — every other text in the same card (heading, body,
  feature list) on the same background.

Confirmed present at both 1440 and 390 widths. The `span.text-3xl` "1/2/3"
findings (1.08:1) are a large decorative watermark number behind each step
icon, redundant with the step heading — not a real defect, left as-is (same
exception class the probe's own code documents for incidental/decorative
text).

## Root cause
`apps/12-smel-ndln/client/src/index.css`: in `.dark`, `--primary` and
`--accent` are both `43 58% 58%` (identical gold) — intentional for
buttons/badges elsewhere. But the premium-tier card
(`client/src/pages/Home.tsx`, `data-testid="card-tier-premium"`) was built
assuming `--primary` is always the light-mode navy (`218 55% 17%`): its
background is `bg-primary`, body text `text-white`, and the "פרימיום" label
explicitly `text-accent` (gold) for contrast against that navy. In dark mode
the card background flips to the same gold as the label, so the label
disappears and white body text loses most of its contrast against the now-
light card.

## Fix
Same pattern as the galil hero-foreground fix (dedicated non-flipping
token instead of touching the shared semantic variable used elsewhere):
- `index.css`: added `--tier-premium` / `--tier-premium-foreground` in
  `:root` only, set to the old light-mode `--primary` / `--primary-foreground`
  values, not present in `.dark` — so this card's background stays the fixed
  navy in both themes.
- `tailwind.config.ts`: registered the `tier-premium` color token.
- `Home.tsx`: premium card `bg-primary text-white` → `bg-tier-premium
  text-tier-premium-foreground`; `text-white/70` → `text-tier-premium-foreground/70`.
  `text-accent` label unchanged (accent is gold in both themes; only the
  background was the problem).

## Verification
- `vite build` clean; `--tier-premium` present in built CSS.
- Deployed: `_deploy/smel-more30/smel` (robocopy /MIR from `dist/public`),
  `vercel deploy --prod`, `dpl_EWrZhWiJxmrycvAKH3ZkCSq6FRe3`, READY, aliased
  `smel-more30.vercel.app`.
- Live, `https://more30.com/smel` with cache-buster:
  - `contrast-probe.mjs ... dark` (1440): the two premium-card findings are
    gone; only the pre-existing decorative watermark numbers remain.
  - Direct measurement (`_shot.mjs`): label color `rgb(210, 175, 86)`, card
    background `rgb(20, 37, 67)` — visibly distinct now (`smel-dark-tier-after.png`).
  - `contrast-probe.mjs ... light` (1440): zero findings anywhere in the
    premium card — light mode unchanged (as expected, `--tier-premium`
    matches the value `--primary` already had in light mode).

## Not in scope
Light-mode run also flagged several `1.0x:1` hits on the hero heading/badges
(white text over what the probe reads as a plain white background). Same
false-positive class as galil's initial probe run — the probe's backdrop
walker misses gradient/image `background` shorthand. Not screenshot-verified
this step; flagged for a future recheck round, not treated as confirmed.

## Files
- `smel-dark-tier-after.png` — after fix, dark scheme, premium card readable.
- `_shot.mjs` — the verification script (re-runnable).
