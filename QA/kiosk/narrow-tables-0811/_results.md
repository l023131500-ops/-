# narrow-tables-0811 — the two console tables that never got the scroll wrapper

**60/60** in a real Chromium, both `colorScheme` values × 390px and 1200px, six
screenshots. `node --test` in `apps/35-kioskfleet/server`: **151/152**, the
documented baseline, unchanged — this step touches `public/js/app.js` only.

## What it found

Two runs found this defect by walking onto a screen for another reason.
`clients-console-0811` found `loadClients()`'s table dragging the console
sideways at 390px and wrapped it in `overflow-x:auto`; `dialogs-rtl-admin-0811`
found the same shape on `loadUsers()`, on a screen no harness had ever rendered,
and wrapped that one. Neither asked the follow-up, which is a grep and not a
rendering: **`js/app.js` builds four tables and only two of them were wrapped.**

Both of the unwrapped two are defects at 390px, and the numbers are not close:

| screen | table | box | `main` before | `main` after |
|---|---|---|---|---|
| `#e-list` — הוספת מכשיר | 548px | 276px | **605px in 390px** | 390px in 390px |
| `#l-list` — ספריית קישורים | 408px | 276px | **465px in 390px** | 390px in 390px |
| `#c-list` — מזהי לקוח (already fixed) | 679px | 276px | — | 390px in 390px |

`#l-list` is the one worth naming: its URL column is already capped at
`max-width:220px` with an ellipsis, so it looks like a table that was thought
about at a narrow width. It is not enough — four columns still want 408px in a
276px card, and a per-cell cap cannot fix a table whose *sum* does not fit.

`#e-list` is the worse of the two because the `אתר` cell has no cap at all: the
column is as wide as whatever URL the owner pasted, so how far this table drags
the console is a function of customer data.

## Why the criterion is reflow and not "the button is off screen"

`clients-console-0811` recorded two wrong gradings and both are avoided here
rather than rediscovered:

- **"the last button is inside the viewport" fails *with* the fix.** A scroll
  container starts at the RTL origin, so the last column sits off to the left
  until something scrolls to it — correct behaviour, and what the clients table
  has always done.
- **`documentElement.scrollWidth` reads as "there is nothing to scroll" even in
  the broken state.** `main.main` is `overflow: auto` and it absorbs the drag.
  That row is kept in the table as `method`, in both states, so the next harness
  does not spend the time again: it reports `950px vs 390px` either way.

So what is asserted is WCAG 1.4.10 — at 320 CSS px content must not require
scrolling in two dimensions. One table scrolling inside its own box is the
accepted shape and is exactly what the wrapper produces.

## The controls

Three per mode at 390px. The wrapper is **removed from the DOM** — children
moved, not re-created, so the `onclick` bindings survive — because
`dialogs-rtl-admin-0811` recorded that setting `overflow-x: visible` on the
wrapper computes back to `auto` beside an `overflow-y` that is `auto`: it
rebuilds the *fixed* state while claiming to rebuild the shipped one, and passes
for the wrong reason. Each control asserts the wrapper was found, then that
`main` overflows without it (610px, 465px, 736px in 390px).

`#c-list` is in the run as a **positive** control. A harness that reports no
defect on the unwrapped pair and was never shown passing on the pair that
carries the fix proves nothing; this one grades all three tables by the same
rule.

## What is open after it

`#e-list`'s `אתר` column has no `max-width`, so the wrapper's scroll distance
scales with the pasted URL — it is now contained rather than bounded. The
clients table caps its equivalent at 230px and the links table at 220px; whether
`#e-list` should match them is a copy decision, not an accessibility one, and
the reflow criterion is met either way.

Every table `app.js` renders is now wrapped, so this class is closed by
enumeration rather than by the next run happening to land on the screen.
