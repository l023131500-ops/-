# `install.html`, measured — #35 KioskFleet, 2026-08-11

`STATUS.md` "Next, in order" item 5. `kiosk-launcher.html` was measured in
`launcher-contrast-0811`; the two pages left unmeasured were `install.html` and
`index.html`. This is the first of the two, and the one that is read by a person
standing at a tablet with the device in their hands: it carries the two values
`EnrollActivity` asks for, and everything else on it is followed as an
instruction.

Run: `node QA/kiosk/install-contrast-0811/verify.mjs`
(exit 1 is the expected outcome — the two "before" rows are supposed to fail).

## How it was measured

The same problem the launcher page had: **nothing on this page is opaque**. Every
card, value box and button is a translucent white — or black, for `.value` — over
two radial gradients over `--navy`, so `button-boundary-0811`'s "walk up to the
first opaque background" lands on `body`'s navy, the darkest thing on the page,
and every ratio comes out flattering.

So the backdrop is **sampled from the pixels Chromium painted** (screenshot with
every glyph made transparent, handed back into the page, drawn to a canvas, read
with `getImageData`), and translucent foregrounds are composited over that
measured pixel. Borders are composited rather than sampled because a 1px border
on a fractional rect is antialiased and picking whichever neighbouring pixel
"looks like the border" is a way to get the answer you wanted.

Both depths are driven — `/kiosk/install/A7K2M9` and `/kiosk/install` — because
they are different screens: the second hides the code block and shows the `.warn`
saying where a code comes from. The stub is
`install-link-0811/stub-server.mjs`, **reused rather than copied**: it already
serves the real `server/public/` and resolves `/install/:code?` at both depths
and both mounts off the real `installlink.js`.

### One difference from the launcher harness, which the guard caught

`check()` throws when a non-opaque colour reaches it, because `lum()` reads three
channels and would grade an alpha value as a colour. On the launcher page only
the placeholder and the borders were translucent. Here the **text** is too —
`.muted` and `table.errors th` are `rgba(255,255,255,.72)`, and that is most of
the prose on the page. The first run died on `#lede` rather than reporting a
flattering 8.6:1. Every foreground now goes through the same `over()` composite
a border does; it is a no-op on an opaque value.

## What was found, and fixed

**`.copy` — the two copy buttons, and the only controls on the page.** `.btn`
fills elsewhere in this fleet are their own boundary; here the button declares a
real `border`, and its fill is `rgba(255,255,255,.12)` over the `.value` box —
**1.2:1**, i.e. no boundary at all. So that one line is the entire thing saying
"this is pressable", and 1.4.11 is about exactly that.

| | before | after | vs |
|---|---|---|---|
| `.copy` border, inside | **2.65:1** ❌ | **3.51:1** ✅ | the button's own fill |
| `.copy` border, outside | 3.87:1 ✅ | 5.13:1 ✅ | the `.value` box |
| `.copy:hover` border | **2.36:1** ❌ | **3.90:1** ✅ | the lightened fill |

`.34` → `.45`, and a `border-color` on `:hover` at `.58`. The hover rule
previously lightened the fill and left the border where it was, so **hovering the
control made its edge fainter** — 2.36:1, below even the resting value. 1.4.11
covers states.

The composite base is the button's **own** fill on both rows: `background-clip`
is `border-box` by default, so a translucent border is painted over its own
element's background, and that same composited colour is what meets the `.value`
box on the other side.

## A correction the run forced, so the claim is not larger than the change

**The defect was one-sided.** The harness's first version demanded the "before"
row fail against the `.value` box too; it did not, and does not — 3.87:1. The
edge was sufficient against the box outside it and vanished against the button's
own fill inside it. That row is kept, graded, and annotated rather than dropped,
because the shape of the bug is part of the result.

## Found and **not** fixed, with the number rather than silence

- **`li::before` — the step-number disc — is 2.01:1 against the card.** Graded
  informational, and the reason is the row above it: the disc is not what carries
  the step number, the white digit on it is, at **5.28:1**. The disc is
  `--accent`, the brand colour every page in this fleet uses identically; moving
  it is the kind of design change `more30-priority.md` §6 asks for, not a
  contrast token. This is the same call `launcher-contrast-0811` made for the
  four `.ico` tints.
- `.card` border 1.52:1, `.value` border 2.04:1, `.expect` border 2.04:1,
  `.warn` border 2.63:1. All separators or message frames, which 1.4.11 exempts.
  `.value` in particular is a **display** box — nothing in it is typed, and it
  deliberately is not an `<input>` — so the control inside it is the button,
  which is the row that was fixed.

## Result

**20/22 graded rows pass.** The two failures are the `.copy` and `.copy:hover`
**before** rows, re-injected into the same DOM in the same run, which is what
proves the check can fail. 5 informational rows.

The page declares `color-scheme: dark` and hardcodes its palette; that claim was
only a comment, so both `colorScheme` values are driven and the four sampled
surfaces are asserted identical. They are.

`node --test` — **152 tests, 151 pass**, the documented baseline, unchanged:
this step touches no server code, and `routing.test.mjs` still imports express,
which is absent from this checkout.

Screenshots: `01-with-code.png`, `02-no-code.png` (both full-page).

## Still unmeasured

`index.html` — the marketing page (`.feature` / `.plan` / `.step`) — is the last
of the three `public/` pages with no pass, and this harness is the one to reuse
for it: same translucent surfaces, same opaque-backdrop problem.
