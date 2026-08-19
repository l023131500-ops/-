# dialog-inert-0811 — the page behind an open dialog

2026-08-11. `node verify.mjs` → **28/28, exit 0**. Stub is
`../warn-ink-0811/stub-server.mjs`, reused not copied: the real
`server/public/`, canned API only. Both colour schemes.

`node --test test/*.test.mjs` in `apps/35-kioskfleet/server`: **152 tests / 151
pass** — the documented baseline, unchanged. No server code in this step;
`routing.test.mjs` imports express, which is not installed in this checkout.

`QA/kiosk/dialog-focus-0811/verify.mjs` re-run against the changed `modal()`:
**42/42, exit 0**, unchanged. That suite owns the Tab trap and the return of
focus to the opener, and both are things this step could plausibly have broken.

## What was open

`dialog-focus-0811` closed the Tab trap and wrote one thing down under "found
and not fixed": **the page behind an open dialog is not inert.** The trap
covers Tab and Shift+Tab, which is what a keyboard user presses. It covers
nothing else. A screen reader's virtual cursor walks the whole document without
ever pressing Tab, and so does Ctrl+F → Enter. `aria-modal="true"` was already
set, and that is a promise to AT rather than a fact about the DOM: measured
here, the device card's own buttons were still in the browser's accessibility
tree behind `לאתחל את המכשיר?`, and still took a scripted `focus()`.

## The change

`public/js/app.js`, `syncInert()` — `inert` on `#login-view` and `#app-view`,
called from `modal()` after the append and from `bg.remove` / `closeModals()`
after the removal.

Three decisions in it, each of which is a row below:

- **driven off `#modal-root.children.length`, not a boolean.** A flag set on
  open and cleared on close un-inerts the whole page when a dialog opened *on
  top of* another one closes — while the first is still on screen.
- **`#toast-root` is deliberately not in the list.** It is the live region that
  announces what a dialog's save did; `inert` removes a subtree from the
  accessibility tree, so putting it in would silence exactly the message the
  dialog exists to produce.
- **`syncInert()` runs before `opener.focus()`** in `bg.remove`. `focus()` on
  an element inside an inert subtree is a no-op — it does not throw, it just
  drops focus to `<body>`, which is the defect `dialog-focus-0811` fixed. The
  wrong order here would have silently reintroduced it.

## What was measured

| | light | dark |
|---|---|---|
| no dialog — `inert` absent | app=false · login=false | same |
| dialog open — `inert` present | app=true · login=true | same |
| `#toast-root` | not inert | same |
| `«🌙 כבה מסך»` in the a11y tree, dialog open | gone | gone |
| the dialog itself in the a11y tree | present | present |
| `focus()` on a button behind | did not take — stayed on `div.modal` | same |
| two dialogs open | 2 open · inert | same |
| top one closed, first still open | 1 open · **still inert** | same |
| all closed — `inert` gone | app=false · login=false · 0 open | same |
| focus after close | `♻️ אתחל` — the opener | same |
| `«🌙 כבה מסך»` back in the a11y tree | present | present |

The accessibility rows are read through `page.accessibility.snapshot()`, i.e.
the browser's real tree, not a selector query. What an ignored node looks like
is the browser's call, and a query over the DOM would answer "still there" for
both states and measure nothing.

## The control

The previous behaviour, produced in the same live page rather than asserted:
the attribute is taken off by hand **with the dialog still open and the backdrop
still on screen**, and the two rows flip back — `«🌙 כבה מסך»` returns to the
accessibility tree, and `focus()` on it takes, leaving a button underneath an
open confirmation focused. Four control rows across the two modes, all four
red-side, which is what makes the rows above measurements.

The baseline row is the other half of the same guard: `«🌙 כבה מסך»` is asserted
present in the tree *before* the dialog opens. Without it, a typo in the button
label would read as a pass.

## Found and not fixed

- **`inert` has no fallback here.** Chromium/Firefox/Safari all ship it, and the
  console is an internal tool, but a browser without it silently keeps the old
  behaviour — there is no polyfill and no feature test in this change.
- **Focus order after a route redraw (2.4.3)** is still measured on one screen
  only. `#content` is rebuilt with `innerHTML` on every route change and where
  focus lands after that is unmeasured. Unchanged by this step; still the next
  thing under the keyboard heading.
- Buttons, links and checkboxes **inside `#content`** still declare no focus
  style and fall back to the UA ring. Read, not measured.
