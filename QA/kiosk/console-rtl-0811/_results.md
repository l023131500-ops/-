# console.html, read for painted order — 2026-08-11

`node QA/kiosk/console-rtl-0811/verify.mjs` → **585/585**, six screenshots.
526 real token pairs across nine views × two colour schemes × 390px and 1200px,
plus 24 control rows and 36 census rows.

## What this run was

`STATUS.md` item 7 ended on scope, not on a defect: `install.html` and
`kiosk-launcher.html` had been swept for painted order and `console.html` had
not — "it is the page with the most numbers interpolated into Hebrew sentences,
so it is the only place the Hebrew-between-tokens group is likely to have real
matches at all. On these two pages it matched nothing."

That prediction is now a measurement, and it was right: **group A has 56 real
matches here** against zero on the other two pages. Almost all of them are the
setup wizard — `1 מתוך 12 שלבים`, `2. פתחו את KioskFleet`,
`8. הפעילו ניפוי באגים ב-USB`, `KioskFleet ל־Device Owner` — which is the
console's densest mixing of Hebrew instructions with Latin product names, and
exactly the material this bug class lives in.

## The finding: the page is clean, the classifier was not

No line on any of the nine views is painted out of order. What the run did find
is that `rtl-digits-0811`'s **two groups do not survive the move to this page**,
and both corrections came out of one line — the device card's

```
🔋 84% · 📱 Lenovo TB-X306F · v1.4.0
```

1. **A bullet is not proof of one value.** That run's group B was "separated only
   by neutrals ⇒ one logical left-to-right value ⇒ must increase". Here `84` and
   `Lenovo` are separated only by neutrals and are two different **fields**, so
   RTL order is correct and the old rule reported a defect that is not one
   (`dx=-168.1`, four times over). Fixed by grading a **field mark** — `·`, `•`,
   `|`, emoji — as a separator. Deliberately **not** `–` or `/`: `06:00–04:00` is
   the OTA defect and a dash there separates nothing.

2. **A bullet is not proof of two, either.** With the field mark in, `TB-X306F ·
   v1.4.0` — the *same bullet on the same line* — then failed (`dx=+45.0`), and
   the page is right and the harness was wrong again. Both sides are strong **L**,
   and N1 hands neutrals between two L to L, so they are **one run** whatever
   stands between them; only a bare digit run (EN, which N1 treats as R) makes a
   bullet decide anything.

So the split is the bidi algorithm's own, not a guess about semantics:

| group | condition | expected painting | matched |
|---|---|---|---|
| A | Hebrew between the tokens | paragraph direction (RTL ⇒ decreasing) | 56 |
| B | a bare digit run on one side **and** a field mark between | paragraph direction | 4 |
| C | everything else, including every L…L pair | increasing (one run) | 466 |

Both shipped defects stay in C, which is what the controls assert.

## The controls

Every graded row passes, so without these the run is indistinguishable from a
probe that walked an empty page. Four per mode/width combination:

- **control (C)** — `עודכן לאחרונה 11.8.2026, 4:40:00` rebuilt in the console's
  own RTL card: `2026 ⟨,␠⟩ 4` comes back at `dx=-90.7` and is flagged. The check
  can fail, and it fails on exactly the shape that shipped.
- **control (B)** — `סטטוס: 12 · 4 שלבים`: the same two digit runs with a bullet
  between them move to B and pass at `dx=-20.9`.
- **control (C, L…L)** — `דגם: Lenovo TB-X306F · v1.4.0`: the same bullet between
  two Latin tokens stays in C and increases (`X306F ⟨␠·␠⟩ v1 dx=+55.4`). This is
  the row the real device card failed before correction 2.
- **control (A)**, positive and negative — a Hebrew-separated pair is emitted as
  A and paints right-to-left; behind U+202D it paints the other way and is
  flagged. (A CSS `unicode-bidi: bidi-override` cannot build this control — it
  overrides to the element's own `direction`, which is `rtl`.)

## Method notes carried from and added to `rtl-digits-0811`

- `getClientRects()`, not `getBoundingClientRect()`, and skip pairs whose rects
  are on different lines — carried over, and still load-bearing here.
- **The probe now takes a root selector.** The console opens dialogs as
  `.modal-bg` siblings of `#app-view`, so a body-wide walk with a dialog open
  re-grades the whole screen behind it and the census stops meaning anything.
  The wizard, the approvals picker and the access-code dialog are each graded
  against their own `.modal`.
- Below 801px the sidebar is a disclosure (`console-mobile-nav-0811`), so every
  navigation at 390px goes through `#side-toggle` first.

## What this leaves open

- **`<input>` values are still unreachable** — a `Range` cannot enter one, which
  is the same limit `rtl-digits-0811` recorded. `#e-url`, `#l-url` and `#c-code`
  all carry `dir="ltr"` explicitly, so the shape is right by declaration, but it
  is a reading and not a measurement.
- The `settings` screen graded **0 pairs**: it is two password fields and a
  button, and nothing on it carries two tokens on one line. Recorded rather than
  hidden — the control rows for that combination run there, so the view is not
  silently skipped.
- Nothing here is deployed. The Railway service still builds from the other repo.
