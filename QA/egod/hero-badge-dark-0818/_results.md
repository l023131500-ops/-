# egod (15) — hero badge dark-mode contrast fix (round-3 a11y recheck, 18/08/2026)

Continues round-3 (`contrast-probe.mjs`, ROUTES order in `scripts/qa/lighthouse-run.mjs`) — next after smachot(14).

## Before (production, dark, both widths)

```
3.82:1 (needs 4.5) — span.text-sm font-medium text-secondary 14px/500 rgb(216, 181, 100) on rgb(77, 84, 109)
   "בסיוע איגוד השיעורים"
```

Same result at 1440 and 390.

## Root cause

`apps/15-egod/src/components/home/HeroSection.tsx:21-24` — hero badge
`bg-secondary/20 border border-secondary/30` composited over the section's
`bg-primary` (dark navy). Text uses `text-secondary`, which in dark mode
resolves to the vetted gold (`42 60% 62%`), but the translucent badge
background blends 20% gold into the navy, lightening the backdrop just
enough to drop the ratio under 4.5:1.

## Fix

Added `dark:text-[hsl(var(--gold-light))]` to the icon and the span,
alongside the existing `text-secondary` (light mode untouched). The
codebase already defines `--gold-light: 42 65% 74%` for dark mode
(`apps/15-egod/src/index.css`), computed to ~4.9:1 against this badge's
actual composited backdrop.

## Verified live (cache-buster `?cb=0818egod`)

- Dark, 1440: `no contrast failures`
- Dark, 390: `no contrast failures`
- Light, 1440: unrelated tool-limitation false positives (gradient
  backgrounds in `Footer.tsx`'s `bg-gradient-navy`, same class of finding
  already documented for torah/modaot/smachot — `contrast-probe.mjs` only
  reads `background-color`, not `background-image`). One genuine,
  pre-existing, unrelated light-mode gap survives on the same badge
  (3.99:1, plain `text-secondary`, not touched by this fix) — deferred.

Deploy: `vercel deploy --prod` (`egod-more30`, `dpl_5xioxkTke1NLuwXzTcbEY8JczCzp`, READY).
