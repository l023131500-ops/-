# dialogs-rtl-admin-0811 — the last three dialog sets, and the screen behind them

`node QA/kiosk/dialogs-rtl-admin-0811/verify.mjs` → **115/115**.
`node --test "server/test/*.test.mjs"` → **151/152**, the documented baseline
(`routing.test.mjs` imports express, which is not installed here). This step
touches no server code.

## What was open, and what it turned into

`dialogs-rtl-0811` closed the six device dialogs and named exactly what it had
not reached: `clientModal`, `confirmDeleteClient`, and the הגדרות → משתמשים
set, "which needs a `role: admin` stub user". Those six views are now walked.

They are also, on their own, a thin result — and that is the measurement rather
than a shortfall. **22 token pairs across six views**, twenty of them in one
dialog:

| view | pairs / combination | why |
|---|---|---|
| `client-edit` | 5 | the pinned host chip `hostListEditor` builds (`hadar.example.com`) |
| `admin-screen` | 1 at 1200px, 0 at 390px | `hadar-halls` — at 390 it wraps at the hyphen, so the pair is two lines and skipped |
| `client-delete` | 0 | one Hebrew sentence, one token (`1234`) |
| `user-edit`, `user-new` | 0 | five labelled fields whose values are all inside `<input>`, where a Range cannot go |
| `reset-password` | 0 | a Hebrew label over an `<input>` |
| `delete-user` | 0 | Hebrew prose |

**No painted-order defect exists in any of them.** Four of the six could not
have one: there is nothing on screen for the bidi algorithm to reorder.

Because of that, this harness does not prove a dialog opened by requiring it to
carry pairs — the way `dialogs-rtl-0811` legitimately could, with six dialogs
full of hosts and codes. A zero census and a selector that missed are the same
output here, so every view carries an explicit **`opened`** row read from the
DOM, and the census is reported beside it rather than standing in for it.

## The real finding: the admin screen had never been rendered

`viewAdmin()` opens with `if (ME.role !== 'admin') return route('devices')`, and
the shared stub's user is an owner. So ניהול-על has been **redirected away from,
not skipped**, in every harness since the screen existed — STATUS.md item 6's
"every console screen has now been graded" is true of the seven screens an owner
can reach, and this is the eighth.

Rendering it turned up a layout defect no painted-order probe would have seen:
seven columns ending in three buttons, in a card 276px wide at 390px. The table
wants 455px. `loadClients()` has wrapped its six-column table in an
`overflow-x:auto` div since `clients-console-0811` found this exact shape; this
table never got the wrapper.

Fixed by wrapping it the same way. Measured at 390px:

| | shipped | fixed |
|---|---|---|
| `main` (the console's own scroller) | 512px in 390px | **390px in 390px** |
| `#users` table | 455px, unwrapped | 455px inside a 276px scroll container |
| 🗑️ מחק, as painted | x = −99 | x = 70 |

## Two wrong gradings, recorded because each overclaims

1. **"the button is inside the viewport"** fails *with* the fix. A scroll
   container starts at the RTL origin, so the last column sits off to the left
   until something scrolls to it. That is correct, and it is what the clients
   table has always done.

2. **"the button is unreachable"** — the first reading of `x = −99`, and it is
   false. `documentElement.scrollWidth` stays at the window width, which reads
   as "there is nothing to scroll", but `main.main` is `overflow: auto` and is
   what absorbs the drag (`scrollLeft: −99`). The row *can* be reached — by
   dragging the whole console sideways.

   So the defect is **reflow (WCAG 1.4.10)**: at 320 CSS px, content must not
   require scrolling in two dimensions. One table scrolling inside its own box
   is the accepted shape, and it is what the wrapper produces.

A third correction is in the control rather than the claim: the negative row
first set `overflow-x: visible` on the wrapper, which computes back to `auto`
beside an `overflow-y` that is `auto` — it rebuilt the *fixed* state while
claiming to rebuild the shipped one, and passed for the wrong reason. The
wrapper is now removed from the DOM (moved, not re-created, so `loadUsers()`'s
`onclick` bindings survive for the dialogs opened after it).

## Stub

`warn-ink-0811/stub-server.mjs` grew an opt-in `admin` argv flag plus
`/api/admin/stats` and `/api/admin/users`. **Off by default** — an eighth
sidebar item would move the tab stops `nav-keyboard-0811` records by index. Both
sides are exercised: the client dialogs run against an owner, the rest against
an admin, and a row asserts `ME.role === 'admin'` unhides `#menu-admin`.
`viewAdmin()` awaits `/admin/stats` *before* calling `loadUsers()`, so without
that route the users table hangs on `טוען…` and none of its dialogs open — the
same shape that left `#e-list` hanging before `chip-ink-0811` added
`/enrollments`.

## Open, not claimed

- The admin screen has been graded for **painted order and reflow only**. Its
  **contrast** is ungraded — item 6's screen-by-screen sweep never rendered it,
  so the one screen that sweep believed it had covered in full is the one it
  never saw. `screens-enrol-settings-0811/verify.mjs` is the harness.
- `client-edit`'s five pairs are all one host chip. The client dialogs' own
  contrast is covered (`screens-links-clients-0811` graded the screen behind
  them), but the two **dialogs** were not open during that run.
- The screenshots are `light`/`dark` at 1200px, plus the admin screen at 390px
  where the defect is. `client-delete` and the three admin confirmations carry
  no gradable text, so their shots are of the fix, not of a measurement.
