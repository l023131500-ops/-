# `install.html` and `kiosk-launcher.html`, read for painted order — 2026-08-11

**179/179.** `node QA/kiosk/rtl-digits-0811/verify.mjs`. Full grid in `_table.md`.

## Why this run

`apps/35-kioskfleet/STATUS.md` item 7 ended on a class, not a defect: *"a correct
string in an RTL paragraph is not a correct line — and computed-value harnesses
are structurally blind to it. Anything mixing a Hebrew label with two digit runs
is the shape to look at next; `install.html` and `kiosk-launcher.html` have never
been read this way."*

Three times the same bug has shipped and a screenshot caught it each time and
nothing else did: `06:00–04:00` in `setupsteps.js`, `4:40:00 ,11.8.2026` on the
device card, and the `(🚀 הפעל).` bracket pair before them. A screenshot only
catches it if a person happens to look at the right line, so this run is a probe
rather than a spot check: it walks **every visible text node** on both pages and
grades the painted order of every adjacent token pair, from a `Range` over the
live node.

## What it grades

| group | when | invariant |
|---|---|---|
| **A** | Hebrew between the two tokens | they are separate bidi runs at the base level, so in an RTL element the later one is painted further **left** |
| **B** | only neutrals between them (`.` `:` `/` `,` `–`) | on these two pages this is always one logical left-to-right value — a time, a date, a host, a `host:port`, a path — so the painted order must **increase** |

Both are sound as stated: group B does not fire on `hall.example.com` reordering
(it doesn't) and group A cannot be tripped by a host, because a host has no
Hebrew in it.

## Result: both pages are clean

**No defect of this class exists on either page.** 172 real token pairs graded
across eight views (light/dark × 390px/1200px × four screens), none out of order.

Group **A matched nothing at all** — no line on either page puts Hebrew between
two tokens. Every multi-token line on both pages is a URL, a host, a `host:port`
or a filename, i.e. group B.

The two lines that looked most likely to be wrong before the run, and are not:

- **`.choice small` on the venue row** (`kiosk-launcher.html:358`) is the one
  address on the page rendered **without** `dir="ltr"`, on the claim that "the
  host-only lines above have no neutral character to reorder around". A host
  *does* carry neutrals, and this run fed it `127.0.0.1:<port>` — a host with a
  **port**, i.e. two digit runs around a colon — inside an RTL element. It
  paints in order (`1 ⟨:⟩ 53369`, dx=+9.8). The colon is a CS between two EN, so
  W4 folds it into the number run before the paragraph direction can reach it.
  The comment is right, for a reason it does not give.
- **`#server` on `install.html`**, `direction: ltr` with `word-break: break-all`
  under a Hebrew heading: in order at both widths, including where the URL wraps.

## Two corrections the run forced

1. **`getBoundingClientRect()` is the wrong read for this.** The first version
   reported `http://127.0.0.1:53339/kiosk` as painted 132px backwards. Both
   pages set `word-break: break-all` on the boxes holding a URL, so a token is
   routinely split across a line break — and the bounding box of a two-line
   range starts at the left edge of the **second** line. The probe now compares
   a token's last `getClientRects()` entry to the next token's first, and skips
   the pair when those sit on different lines. Any harness reading painted
   position out of a `Range` on wrapping text has this bug.
2. **`unicode-bidi: bidi-override` cannot build a negative control here.** It
   overrides to the element's own `direction`, which is `rtl`, so it paints the
   control pair exactly as the correct case does and discriminates nothing —
   measured, not assumed. What works is **U+202D LEFT-TO-RIGHT OVERRIDE in the
   text**: the element still computes `direction: rtl` and the pair paints
   left-to-right.

## The controls

Every row passing is otherwise indistinguishable from a probe that matched
nothing, and group A matched nothing on real content — so it would have been an
assertion that never ran. Three control rows, on all eight views:

- **C(B)** — `עודכן לאחרונה 11.8.2026, 4:40:00`, the device-card defect rebuilt
  in this page's own RTL card. Flagged: `2026 ⟨,␠⟩ 4` at **dx=-90.7**.
- **C(A) positive** — `שלב 3 מתוך 12 הושלם` is emitted as a group A pair and
  paints right-to-left (dx=-61.6).
- **C(A) negative** — the same string behind U+202D goes red (dx=+61.6).

## Scope, and what is left

The probe reads text nodes, so it grades what is **painted as text**. A value
inside an `<input>` (the launcher's six-character code box, `direction: ltr`) is
not reachable by a `Range` and is not covered here.

`console.html` and `index.html` have not been swept this way. The device card's
timestamp was fixed by hand in `device-card-390-0811`; nothing has checked the
rest of the console, and it is the page with the most interpolated numbers in
Hebrew sentences on it — i.e. the only place group A is likely to have real
matches at all.
