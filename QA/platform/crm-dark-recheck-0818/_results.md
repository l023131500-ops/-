# 29 crm — round-3 dark-mode contrast recheck (0818)

Queue position: after studio(26)/mechiron(27)/kupot(28) per SYSTEMS_STATUS.md ROUTES order.

## Probe run
`contrast-probe.mjs` against `https://more30.com/crm`, both color schemes (light/dark),
both widths (1440/390): 11 "failures" reported, **identical** across all four
combinations (same text, same reported color/bg, same ratio in light and dark).

## Verdict: false positive — not a real defect

Identical-across-scheme-and-width output was the first tell (a real dark-mode
regression changes with scheme). Root cause confirmed directly:

```
getComputedStyle(h1).color  -> "lab(96.5699 -1.58328 -0.665271)"
getComputedStyle(body).backgroundColor -> "lab(3.73265 -2.14425 -4.02555)"
```

This app's theme (Tailwind/shadcn OKLCH-based tokens) computes to CSS `lab()`
color notation in this Chromium build, not `rgb()`/`rgba()`. `contrast-probe.mjs`'s
`rgb()` parser is a bare regex that pulls the first three numbers out of *any*
color string (`/-?[\d.]+/g`) and treats them as 0-255 RGB channels regardless of
the function name. Fed a `lab()` string, it reads L (0-100 lightness) and a/b
(-100..100 chroma) as if they were R/G/B — producing nonsense like
`rgb(4, -2, -4)` (impossible, negative channels) as the "backdrop", which then
computes a near-1:1 fake ratio against real near-white text.

This is the same class of tool limitation already documented for gradient/shorthand
backgrounds (galil/smel/tamlul/modaot) and `color-mix()` (smachot) — the probe's
color parsing only handles `rgb()`/`rgba()`, and a modern wide-gamut color
function silently produces garbage instead of erroring.

## Real check: Playwright screenshots, both schemes

- `crm-light.png` — clean, fully legible (teal CTA, dark heading, all copy readable).
- `crm-dark.png` — clean, fully legible (near-white text on near-black dark surface,
  teal accent, all copy readable). Verified via direct `getComputedStyle`: h1 lab
  L=96.57 (near-white) on body lab L=3.73 (near-black) — genuinely high contrast,
  the exact opposite of what the probe reported.

No code change, no deploy. crm carries **0 real dark-mode contrast failures**.

Next in ROUTES order after crm(29): gesher, nadlan, kesef.
