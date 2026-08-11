# device card at a phone width — 2026-08-11

`apps/35-kioskfleet/STATUS.md` item 7 ended on this, and stated it as a layout
question rather than a keyboard one: `console.html` is the only one of the three
pages whose layout has ever been driven at a phone width, `.device-grid`'s
`minmax(300px, 1fr)` was shown to fit at 390px, **but the button rows inside a
card had never been measured there** — and `clients-console-0811` had already
found a column of buttons running off a card's edge once.

Harness: `verify.mjs`, a real Chromium at both `colorScheme` values × 390px and
1200px, against `../warn-ink-0811/stub-server.mjs` (reused not copied — it
already serves the real `server/public/`).

**268/268.** Full table in `_table.md`.

## What the width question turned out to be: nothing

The card holds. At 390px the grid column is **322px**, the card's content box is
**320px**, and every one of the thirteen `.btn-sm` buttons in `.actions` sits
inside it on both edges; `document.scrollWidth` equals `innerWidth`, so the page
does not scroll sideways; the `.topbar` — `display: flex` with no `wrap`, an h1
at 26px and two buttons — fits at 322/322 because its button group wraps; and
every button clears WCAG 2.5.8's 24px (33px tall).

The one input the stub could not supply was tested by injection: a **73-character
customer URL** (`hadar.example.com` is 26, and every real one is longer) in the
`<span dir="ltr">` of `.meta`, which is a single unbreakable token with no
`overflow-wrap` on the box. It wraps — Chromium takes a break opportunity after
`/` and `-` — and the span's union box lands exactly on the card's content edge.

Four groups therefore pass by describing correct CSS, which on its own is
indistinguishable from a run that measured nothing. So there is a **control**:
`.actions`'s `flex-wrap: wrap` is the one declaration making thirteen buttons fit
a 284px row, and removing it in the same live page rebuilds exactly the
`clients-console-0811` shape. The spill rows go to **+507.6px** at 390 and
**+397.6px** at 1200, and the card-overflow rows to +490/+380. The check can
fail.

## What the run did find, and it is not a width defect

The 390px screenshot showed the device's last-seen line as

> `4:40:00 ,11.8.2026`

— **the time before the date, and the comma on the wrong side of both.**

`toLocaleString('he-IL')` returns `11.8.2026, 4:40:00`: two digit runs separated
by a comma **and a space**. UAX #9 folds a comma between two numbers into the
number run (W4), but only as a single separator — the space breaks that, so the
two runs stay separate, and two European-number runs inside an RTL paragraph are
ordered right-to-left like any other pair of runs. The time is painted first.

This is the same defect `ota-window-0811` fixed on `04:00–06:00`, and it hid for
the same reason: **the string is correct, the DOM is correct and `innerText` is
correct — only the painted order is wrong.** No harness under items 6 or 7 could
have seen it; all of them read computed values.

Fixed in `public/js/app.js` by wrapping the timestamp in `<span dir="ltr">`. That
is `unicode-bidi: isolate` from the UA stylesheet, i.e. the same LRI…PDI
`ota-window-0811` used, and it is the shape the two lines directly above it in
the same `.meta` block already use for URLs — so this is the block's existing
convention rather than a new one.

Graded by **geometry**, since no computed value can express it: `Range`
rectangles over the two digit runs, asserting the date is painted to the left of
the time (inside an LTR isolate it is). The `before` rows unwrap the isolate in
the same live page and assert the two swap back — `date x=260.9, time x=213.8` at
390px, against `date x=213.8, time x=274.9` after. Both widths, both modes.

The probe walks text nodes for the two digit runs rather than reading the span,
so it reads the fixed shape and the shipped one without knowing which it is
looking at.

## Not fixed, so it is not silently claimed

- **The wrap of a long URL is Chromium's break opportunity after `/`, not a
  declaration.** Nothing in `css/style.css` says `overflow-wrap: anywhere` on
  `.meta`, so a URL with a long unbroken host — no slash, no hyphen — would still
  overflow. The tested one is a real customer shape; a pathological one is not
  covered.
- **The pill is not measured here.** `console-mobile-nav-0811` simulated it; this
  run blocks `more30.com` like every other harness on this machine, so the card's
  layout is graded under the reservation's fallback value.
- **Only two devices.** The grid is single-column at 390px either way, so a
  fleet of twenty changes the page height and nothing else measured here.

## Baseline

`node --test "test/*.test.mjs"` → **151/152**, the documented baseline;
`routing.test.mjs` imports express, which is not installed in this checkout. This
step touches no server code.

Screenshots: `01`–`04`, 390px full-page and 1200px, light and dark.
