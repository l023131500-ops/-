# dialog-focus-0811 — the console's dialogs, by keyboard

2026-08-11. `node verify.mjs` → **42/42, exit 0**. Stub is
`../warn-ink-0811/stub-server.mjs`, reused not copied: the real
`server/public/`, canned API only. Both colour schemes.

`node --test test/*.test.mjs` in `apps/35-kioskfleet/server`: **152 tests / 151
pass** — the documented baseline, unchanged. No server code in this step;
`routing.test.mjs` imports express, which is not installed in this checkout.

## What was open

STATUS.md item 7 listed two things under the keyboard heading. `focus-ring-0811`
and `nav-keyboard-0811` closed the fields and the sidebar. This is the other
one: **whether focus is trapped in an open dialog** — never measured.

The console does not use `<dialog>`. `modal()` appends a `.modal-bg` into
`#modal-root`, a sibling of `#app-view`, so the platform gives it nothing: no
top layer, no inertness behind it, no focus move on open, no Escape. The only
close path was the backdrop click, which is a mouse. Every destructive
confirmation in this console is one of these, so a keyboard user could be
reading `לאתחל את המכשיר?` while their focus was still on `♻️ אתחל` underneath
it — and Tab from there walked the card, not the dialog.

## What was measured, per dialog

Three dialogs, chosen for the three shapes `modal()` has to tell apart: a
confirmation whose first control is destructive (`♻️ אתחל`), one that opens to
take values (`✏️ עריכה`), and one with controls but no text field
(`🔑 קוד גישה`).

| | ♻️ אתחל | ✏️ עריכה | 🔑 קוד גישה |
|---|---|---|---|
| focus on open | `div.modal` | `#n` (first field) | `div.modal` |
| controls inside | 2 | 9 | 3 |
| Tab ×24 | 24/24 inside | 24/24 inside | 24/24 inside |
| Shift+Tab off the first | → `ביטול` (last) | → `ביטול` (last) | → `סגירה` (last) |
| Escape | closes | closes | closes |
| focus after close | back on the opener | back on the opener | back on the opener |
| `role` / `aria-modal` / name | dialog / true / its own `<h3>` | ditto | ditto |

Identical in light and dark. The **where** matters as much as the whether: a
confirmation lands on the box and not on `כן, בצע`, because that one is a
reboot or a delete one Space away from somebody who was only tabbing; a dialog
that exists to take a value lands on the field, where focusing types nothing.

24 presses is several laps of the largest dialog here (9 controls). A trap that
holds for one cycle and leaks on the second is the same defect, so the sweep is
not one lap.

## The control

The previous behaviour, rebuilt in the same live page: the same markup appended
to `#modal-root` by hand, without `modal()`. All three "before" rows fail, in
both modes, which is what makes the rows above measurements rather than
assertions —

- focus stays on `♻️ אתחל`, the button underneath the dialog;
- Tab ×6 leaves the dialog on all six presses, landing on `🌙 כבה מסך`,
  `☀️ הדלק מסך` and the rest of the card behind it;
- Escape does nothing.

`02-control-light.png` / `04-control-dark.png` are that state: a confirmation on
screen with the page behind it still taking the keyboard.

## A harness defect, found by a failing run

The first run reported **36/42** — every "focus came home" row red, while its
own value column named the correct button. `where()` describes a focused element
by class (`button.btn «♻️ אתחל»`) and the expectation had been written out by
hand as `.device button «♻️ אתחל»`: two descriptions of the same thing, drifted.
The opener's key is now read off the element **through the same `WHERE`**. Worth
recording because of which direction it fails in — a red harness over a green
fix is what gets a working change reverted.

## Method

Focus is taken **by Tab and never by `el.focus()`**: the subject is a keydown
handler, and a scripted focus does not run it. The dialogs are opened by
**clicking** the card button, because that is what leaves the opener as the
sequential focus navigation starting point — the state `bg.remove()` has to
restore.

## Found and not fixed

- **The page behind an open dialog is not inert.** The trap covers Tab and
  Shift+Tab, which is what a keyboard user does; it does not cover a screen
  reader's virtual cursor or a `find`-and-`Enter`. `aria-modal="true"` is set,
  which is what AT reads, but the real answer is `inert` on `#app-view` and it
  was not added here.
- **Focus order after a route redraw (2.4.3)** is still measured on one screen
  only — `nav-keyboard-0811` swept the sidebar. The console rebuilds `#content`
  with `innerHTML` on every route change, and where focus lands after that is
  unmeasured.
- The dialog box takes focus via `tabindex="-1"`, so `Shift+Tab` from the first
  control wraps to the last rather than passing through the box. That is
  deliberate (`modal()` says so) and is asserted, not left implicit.
