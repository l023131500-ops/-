# `input-rtl-0811` — the painted order *inside* an `<input>`

**20/20.** Full table in `_table.md`. Run: `node QA/kiosk/input-rtl-0811/verify.mjs`.

## What this closes

`apps/35-kioskfleet/STATUS.md` item 7 ended on a limit rather than a defect:

> a `Range` cannot enter an `<input>`, so `#e-url`, `#l-url` and `#c-code` are
> right by declaration (`dir="ltr"`) and not by measurement.

Three runs have now found the same class of bug — `06:00–04:00` in the OTA
window (`ota-window-0811`), `4:40:00 ,11.8.2026` on the device card
(`device-card-390-0811`), and in both the string, the DOM and `innerText` were
correct and only the painted line was wrong. In both the fix was `dir="ltr"` —
the very declaration the inputs were being trusted on, on the one class of
element no probe had been able to look inside.

## The method

A `Range` cannot span an input's value, so the painted position of a character
inside one is unreachable from the DOM. What *is* reachable: the browser paints
the **selection highlight** at the character's real position. So
`setSelectionRange(i, i + 1)` with a `::selection` colour nothing else on the
page uses turns one character into a band of known pixels, and a screenshot says
where it landed. That is the Range rect, obtained the only way this element
allows.

- the marker sets `background` **and** `color` to the same value, so the band is
  the character's box rather than the inked part of a glyph;
- the input has to be **focused**, or Chromium paints the selection grey — and
  grey is a colour the console already uses;
- the match is exact rather than a tolerance: the band is a flat fill, and a
  tolerance wide enough to be safe would start catching the console's accent;
- the grade is **first character left of last character**, not a token sweep.
  Every value here is one logical left-to-right string, so that single
  comparison catches a run that swaps, a trailing neutral that jumps to the far
  end, and a value painted wholly backwards. It is also the only comparison that
  survives not knowing where the browser broke the string — which, inside an
  input, cannot be inspected.

The URLs deliberately end in `/`. A **trailing neutral** takes the paragraph's
direction (UAX #9 rule N2), and that is the shape that throws a character to the
opposite end of the field.

## What it found

`promptUrl()` — the **🔗 החלף אתר** dialog on every device card — declares

```html
<input id="u" value="${esc(d.homeUrl || '')}" />
```

with **no `dir` at all**, so it inherited the page's `rtl`. Measured
`direction: rtl`, and with `https://hadar.example.com/event/12/` in it the
**last** character painted at x=542.0 against the first at x=549.0 — dx **−7.0**
in both modes. The trailing `/` of a pasted URL sits at the wrong end of the
field.

It is the one URL field in the console without the declaration: `#h` in
`editDevice()` is the **same value** — `d.homeUrl` — and has had `dir="ltr"`
since `display-url-console-0811`. Fixed by adding it, one attribute.

That dialog sends `set_url` to a locked tablet, so the field is read by someone
checking an address before they push it to a device in a hall — and a URL whose
last character is painted first is exactly the state in which a wrong address
looks right.

## Rows

| field | shipped `dir` | dx (light / dark) |
|---|---|---|
| `promptUrl #u` | *(none → rtl)* → `ltr` | +240.0 / +240.0 |
| `promptUrl #u` **(before)** | none | −7.0 / −7.0 |
| `editDevice #h` | `ltr` | +240.0 / +240.0 |
| `editDevice #disp` | `ltr` | +240.0 / +240.0 |
| `exitCode #ex-val` | `ltr` | +58.5 / +58.5 |
| `links #l-url` | `ltr` | +240.0 / +240.0 |
| `clients #c-code` | `ltr` | +24.0 / +24.0 |
| `clients #c-url` | `ltr` | +240.0 / +240.0 |
| `enroll #e-url` | `ltr` | +240.0 / +240.0 |
| control — `#h` with `dir` dropped | forced `rtl` | −7.0 / −7.0 |

Eight of those pass by describing a correct declaration, which is
indistinguishable from a probe that measured nothing. Hence **two** negative
rows, both rebuilt in the same live page rather than quoted: the defect's own
"before", and a field that ships correct with its `dir` removed. Both come back
reversed, so the check can fail.

## Screenshots

`01`/`03` — the fixed dialog, the trailing `/` highlighted at the right end of
the value. `02`/`04` — the control, the same measurement with `dir` dropped.

## Left open

- **only the first and last character** are measured. A value whose *middle*
  reorders while its ends do not would pass. Nothing here has that shape — they
  are single L runs with neutrals — but a field that mixes Hebrew with Latin
  would, and none exists in the console today.
- the **login card's** `#login-user` has no `dir` either. It is in the DOM on
  every console page but hidden behind `if (TOKEN) boot()`, so this run could
  not focus it; a username is a single L run with no trailing neutral, so the
  shape that bit `#u` does not apply, but it is unmeasured.
- `promptUrl`'s **label** interpolates a host into a Hebrew sentence
  (`כתובת (חייבת להיות תחת hadar.example.com)`). `console-rtl-0811` swept nine
  views and this dialog was not one of them.
- `type="password"` fields render dots, so `#cp`, `#np` and `#u-pass` have no
  painted order to grade.

## Baseline

151/152 on `node --test "test/*.test.mjs"` — the documented baseline,
`routing.test.mjs` imports express and still cannot run here. Unchanged, because
this step touches no server code.
