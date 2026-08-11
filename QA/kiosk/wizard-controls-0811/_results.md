# `wizard-controls-0811` — the wizard's own checkbox and radio, re-measured

2026-08-11. Closes the obligation `screens-approvals-code-0811` wrote down for
itself: that run put `accent-color: var(--accent-control)` on `:root` — a
**global** declaration — and measured it on one screen, the approvals picker,
where the checkbox sits on the modal's `--card`.

The wizard is the other place in the console the browser draws a control, and
its controls sit on a different surface:

| | surface | light | dark |
|---|---|---|---|
| `.wz-step` (unticked) | `--card` | `#ffffff` | `#131c2e` |
| `.wz-step.wz-ticked` | `--sunken` | `#f7f9fc` | `#0d1626` |
| `#wz-track label` (the §2★ו radios) | `--sunken` | `#f7f9fc` | `#0d1626` |

`--sunken` sits *below* `--card` in dark and *below* white in light, so the two
modes are not one question, and the track radios had never been measured in any
run at all.

## The answer: the token holds, and it holds by more in dark

**No ratio is under threshold.** 38 rows pass in both modes; the two failures
are the injected sanity rows. Exit 0.

| control | mode | vs | ratio | on `--card` (approvals run) |
|---|---|---|---|---|
| checkbox, ticked | light | `#f7f9fc` | **5.01:1** | 5.28:1 |
| checkbox, ticked | dark | `#0d1626` | **7.57:1** | 7.12:1 |
| radio, selected | light | `#f7f9fc` | **5.01:1** | — never measured |
| radio, selected | dark | `#0d1626` | **7.57:1** | — never measured |
| checkbox, unticked | light | `#ffffff` | 8.19:1 | 4.54:1 |
| checkbox, unticked | dark | `#131c2e` | 7.50:1 | 4.61:1 |
| radio, unselected | light | `#f7f9fc` | 3.64:1 | — |
| radio, unselected | dark | `#0d1626` | 4.40:1 | — |

Both accented controls are the right hue in both modes — `rgb(42, 97, 232)`
light, `rgb(126, 166, 255)` dark — asserted, not eyeballed. The unselected radio
at **3.64:1** light is the narrowest control on the screen; it is a UA grey the
console does not set and it clears 1.4.11, but it is the number to watch if
`--sunken` is ever lightened.

The "before" rows are recorded rather than required to fail, same as the
approvals run: Chromium's own blue passes here too (3.99:1 light, 10.40:1 dark).
What the fix changed on this screen is that the two controls now match the rest
of the console instead of being the browser's blue — which is not a thing a
ratio can say.

## What the run actually caught was in the harness

The first pass reported the ticked checkbox as `rgb(0, 0, 0)`: **19.91:1** in
light and **1.16:1** in dark. That reads like a genuine dark-mode failure and it
is not a colour at all. The ticked step in the stub is `no-accounts`, the 7th of
12, so its box is below the fold — and `getImageData` outside the canvas returns
*transparent black* rather than raising, which becomes `rgb(0, 0, 0)` the moment
alpha is dropped. The same non-measurement scores 19.91 on a light surface and
1.16 on a dark one, so the mode split was noise.

`sampleBox()` now scrolls the element into view, refuses the read if the box is
still outside the viewport, and throws if any sampled pixel comes back with
alpha ≠ 255. The approvals run did not need this — every control it graded was
in a dialog shorter than the window — and would have been the next harness to
hit it.

## Also graded

The wizard's text, which item 6's screen-by-screen sweep never covered: 14 rows
per mode — the heading, `.wz-sub`, both track labels and their hints, the step
counter, `.wz-title` / `.wz-do` / `.wz-expect` / `.wz-warn`, the `.wz-cmd` code
box, and the three buttons. Narrowest is `.wz-complete` at **4.57:1** (the
`--chip-ok-ink` pair, which `chip-ink-0811` tokenised at exactly that number and
recorded rather than moved). Three hierarchy checks pass — `.wz-do` differs from
`.wz-title` in size, `.wz-expect` from `.wz-do` in colour, the track hint from
the track name in both.

`#wz-complete` renders only when every step is ticked, so it is unhidden for the
measurement and re-hidden after — noted on its row, since it is the one line in
the dialog that says the device is now locked and how to get out.

## How

`node verify.mjs` from this directory — real Chromium at both `colorScheme`
values against `../warn-ink-0811/stub-server.mjs`, reused rather than copied
(real `public/`, real `setupsteps.js` behind `/api/devices/:id/setup`). Output in
`_run.txt`. Two screenshots. Harness is `screens-approvals-code-0811/verify.mjs`
plus the `sampleBox()` correction above.

`node --test "test/*.test.mjs"` → **152 tests, 151 pass** — the documented
baseline, unchanged; this step adds no server code and `routing.test.mjs` imports
express, which is not installed in this checkout.

**Not deployed** — the Railway service `kioskfleet` builds from
`l023131500-ops/zol`, not this tree. No CSS changed in this step; it is a
measurement of a change already made.
