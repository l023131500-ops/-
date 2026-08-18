# 32 נדל"ן — round-3 dark-mode contrast recheck (0818)

Queue position: after studio(26)/mechiron(27)/kupot(28)/crm(29)/gesher(31) per the
"Round-3 ROUTES queue" note in the gesher commit — nadlan next.

## Probe run (before fix)

`contrast-probe.mjs` against `https://more30.com/nadlan`, dark scheme, both widths
(1440/390): ~63 "invisible text" failures, mostly ratio 1.0-1.2:1 inside the
request-form wizard card ("מה בודקים", "איזה דוח", "אילו נתונים לכלול", "פרטי
הנכס", "או חיפוש חופשי" step headings and body copy).

## Two candidate findings, checked separately

1. **Hero h1** ("כל מה שצריך לדעת על נכס — ברגע"): white text on a reported light
   backdrop, identical in light AND dark scheme — the tell for a false positive
   (a real dark-mode regression changes with scheme, this doesn't). Confirmed via
   `getComputedStyle`: the containing `<section class="hero-gradient text-white">`
   has `backgroundColor: transparent` but a real dark navy `background-image`
   gradient (`linear-gradient(135deg, #0d1b3e, #122a5e, #1e3a8a)`) that never
   changes with theme. Same class of tool limitation already documented for
   galil/smel/tamlul/modaot (gradient/shorthand backgrounds `getComputedStyle`
   can't see). **Not a real bug — no fix.**

2. **Wizard card headings** (inside the `bg-white/95` card in `app/page.tsx` that
   wraps `<ReportRequestForm />`): **real bug**. The card is a fixed-white surface
   (intentionally always white, since it floats on the hero's always-dark
   gradient — same design idea as the hero itself, just the light side of it).
   But the headings inside used the `text-navy`/`text-ink`/`text-muted` design
   tokens, which flip to near-white values under `.dark` (correct for the rest of
   the page, which does invert). Since the card's background never inverted,
   dark-mode near-white text landed on a background that stayed white — near
   1:1 contrast confirmed both by the probe and by direct Playwright screenshots.

## Fix

`apps/32-nadlan-berega/app/globals.css`: added a `.card-on-hero` class that pins
`--c-navy`/`--c-ink`/`--c-muted`/`--c-line`/`--c-bgsoft`/`--c-surface` to their
`:root` (light) values, so the tokens can't flip inside this specific
always-white card regardless of `.dark` on an ancestor.

`apps/32-nadlan-berega/app/page.tsx`: added the `card-on-hero` class to the
wrapping div (line 88) around `<ReportRequestForm />`.

Deployed via `vercel deploy --prod` (source deploy, not `--prebuilt` — see memory
prebuilt-deploy-drops-vercel-json) from `apps/32-nadlan-berega`.

## Verified live (after fix, cache-busted)

- `contrast-probe.mjs` dark/1440: down from ~63 failures to 6, all **unrelated**
  to the wizard card (pre-existing findings further down the page — a "|"
  divider and teal/gold brand-accent text in the price-comparison and sources
  sections, ratios 1.5-3.5:1, not part of this fix's scope). Not investigated
  this step — smallest-meaningful-step discipline; flagging as the next item.
- `contrast-probe.mjs` dark/390: same 6 residual findings, width-independent.
- `contrast-probe.mjs` light/1440: unchanged (7 hero false-positive lines,
  identical to before) — confirms the fix is dark-mode-scoped and did not touch
  light mode.
- Playwright screenshot (dark, cache-busted) confirms "מה בודקים"/"איזה דוח"
  headings render dark-navy-on-white, clearly legible. `getComputedStyle`:
  heading `color: rgb(13, 27, 62)`, card `backgroundColor: rgba(255, 255, 255, 0.95)`.

Evidence: `nadlan-light.png`, `nadlan-dark.png`, `nadlan-dark-wizard-closeup.png`,
`nadlan-dark-hero-closeup.png` (before fix), `nadlan-dark-wizard-AFTERFIX.png`,
`nadlan-dark-AFTERFIX.png` (after fix).

Next in round-3 ROUTES queue after nadlan(32): kesef(34), then the 6 residual
findings noted above (unrelated component, separate step).
