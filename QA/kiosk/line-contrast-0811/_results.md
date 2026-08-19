# `--line` in one pass — #35 KioskFleet, 2026-08-11

Item 4 of `apps/35-kioskfleet/STATUS.md` "Next, in order", and the only one of
the four runnable in this checkout. Items 1–3 are still blocked: the deploy
builds from a different repo (`l023131500-ops/zol`), and both Android items need
a toolchain (`kotlinc`, `gradle`, `java`, `adb` all absent here).

## What was open, and why it was left open three times

`dark-inputs-0811`, `nontext-contrast-0811` and `button-boundary-0811` each
found something drawn with `--line`, split it into its own token
(`--field-border`, `--btn-light-edge`, `--btn-danger-edge`), and recorded the
same leftover: `--line` itself is **1.29:1 in dark and ~1.2:1 in light**, and it
draws the wizard's step rows, the table rules and every card edge.
`setup-wizard-console-0811` named the step row specifically and left it too. All
four said the same thing — it wants **measuring in one pass** rather than a
fourth token guessed at.

So this run measured every `--line` consumer that renders in the console, in
both colour schemes, against **the surface actually painted behind it** (walking
up the DOM to the first opaque background — these rows sit on `.modal`,
`.device`, `.card` and the page, and one quoted token is right for some and
wrong for the rest).

## What the numbers said

The consumers split cleanly into the two kinds WCAG 1.4.11 distinguishes, and
the split is not close:

**One control.** `.wz-step` is a `<label>` wrapping a `<input type=checkbox>`
with the whole row clickable — its border is the boundary of a control, and
1.4.11 wants 3:1. It measured **1.22:1** (light) and **1.29:1** (dark) against
the card, and **1.16:1 / 1.37:1** against the sunken fill a ticked row takes.

The thing that makes this a mistake rather than a design choice is two lines up
in the same dialog: **`.wz-track label` is the identical shape** — a label
wrapping a radio, the whole row clickable — and it was already on
`--field-border` at 3.30:1 / 3.42:1. One dialog, two clickable rows, two
different borders.

**Everything else is a separator**, and 1.4.11 exempts separators. They were
measured anyway and printed as `ℹ️` rows, so leaving them is a number rather
than an assumption:

| | light | dark |
|---|---|---|
| `.device` border vs the page behind it | 1.14:1 | 1.42:1 |
| `.device` **fill** vs the page behind it | 1.07:1 | 1.10:1 |

None of them is the only thing marking its boundary — cards carry `--shadow` and
their own fill, `.hl-row` and `.wz-step.wz-ticked` carry `--sunken`. Raising
`--line` to 3:1 would put a mid-grey rule around every card, every stat tile and
every table row on every screen, which is a visual redesign of the console and
not an accessibility fix. **Not done, deliberately**, and the numbers above are
here so the next person can see what it would cost.

## The change

`css/style.css`, one declaration: `.wz-step`'s border is `var(--field-border)`
rather than `var(--line)`. No new token — `--field-border` already exists and was
already chosen against both surfaces a control's border touches.
`.wz-step.wz-next` still overrides with `--accent` and was re-measured to confirm
this did not move it.

## Result

`node QA/kiosk/line-contrast-0811/verify.mjs` — a real Chromium at both
`colorScheme` values against `setup-wizard-console-0811/stub-server.mjs` (reused
rather than copied: it already serves the real `server/public/` and answers the
four setup routes through the real `setupsteps.js` / `setupprogress.js` over the
production DDL on `node:sqlite`). Every value read from `getComputedStyle`.

**10/12 graded rows pass; the 2 failures are the "before" rows**, which
re-inject `--line` onto the same rule in the same DOM and are supposed to fail —
that is what makes the improvement measured rather than quoted, and what proves
the check can fail. 6 informational rows. The process exit code is therefore 1,
the same shape `nontext-contrast-0811` has.

| מצב | מה נמדד | יחס | סף | |
|---|---|---|---|---|
| light | `.wz-step` מול הכרטיס | **3.30:1** | 3:1 | ✅ |
| light | `.wz-step` מול מילוי השורה | **3.30:1** | 3:1 | ✅ |
| light | `.wz-step.wz-ticked` מול המילוי השקוע | **3.13:1** | 3:1 | ✅ |
| light | `.wz-step` — **לפני** (`--line` הוזרק מחדש) | **1.22:1** | 3:1 | ❌ |
| light | `.wz-track label` (אותה צורה, רגרסיה) | **3.30:1** | 3:1 | ✅ |
| light | `.wz-step.wz-next` — טבעת `--accent` (רגרסיה) | **5.28:1** | 3:1 | ✅ |
| dark | `.wz-step` מול הכרטיס | **3.42:1** | 3:1 | ✅ |
| dark | `.wz-step` מול מילוי השורה | **3.42:1** | 3:1 | ✅ |
| dark | `.wz-step.wz-ticked` מול המילוי השקוע | **3.64:1** | 3:1 | ✅ |
| dark | `.wz-step` — **לפני** (`--line` הוזרק מחדש) | **1.29:1** | 3:1 | ❌ |
| dark | `.wz-track label` (אותה צורה, רגרסיה) | **3.42:1** | 3:1 | ✅ |
| dark | `.wz-step.wz-next` — טבעת `--accent` (רגרסיה) | **3.22:1** | 3:1 | ✅ |

`node --test "test/*.test.mjs"` → **152 tests, 151 pass** — the documented
baseline, unchanged, because this step adds no server code. The one failure is
still `routing.test.mjs`, which imports express.

Screenshots: `01-wizard-light.png`, `02-wizard-dark.png` — the wizard dialog,
where the step rows now have an edge in both modes and the ticked row keeps its
sunken fill.

## Found and not fixed

- The `--line` separators above. Recorded with numbers rather than left silent.
- The border is a real `border`, so Windows high-contrast mode paints it — unlike
  the `box-shadow` rings `button-boundary-0811` left with the same caveat. Not
  measured here; there is no Windows high-contrast run in this suite.

**Not deployed.** The Railway service still serves the previous console.
