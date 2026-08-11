# `kiosk-launcher.html`, measured — 2026-08-11

`STATUS.md` "Next, in order" item 5. Every contrast pass in this build so far
(`dark-inputs-0811` → `line-contrast-0811`) opened one dialog in the **console**.
This page had never been measured, and it is the one that renders full-screen on
a tablet in a hall — read at arm's length by someone typing a six-character code
off a printed card.

Run: `node QA/kiosk/launcher-contrast-0811/verify.mjs` → **23/28 graded rows
pass, 8 informational**. The five failures are the re-injected **"before"** rows
and are supposed to fail. `node --test "test/*.test.mjs"` in
`apps/35-kioskfleet/server`: **152 tests, 151 pass** — the documented baseline,
unchanged, since this step touches no server code (`routing.test.mjs` imports
express, which is absent in this checkout).

## How it was measured, and why not the way the console was

`button-boundary-0811` walked up the DOM to the first **opaque** background. On
this page nothing is opaque: every card, row and button is a translucent white
over two radial gradients over `--navy`. That walk lands on `body`'s
`background-color` and reports the navy — the darkest thing on the page — so
every ratio would come out flattering and the light-tinted top-right corner
would never be looked at.

So the backdrop is **sampled from the pixels Chromium actually painted**: a
screenshot is taken with every glyph made transparent, handed back into the page
as an image, drawn to a canvas and read with `getImageData`. That carries the
gradient and the whole alpha stack. Translucent **foregrounds** (the placeholder,
every border) are then composited over that measured pixel with `over()` — exact
arithmetic on a measured value rather than a second assumption on top of the
first. Borders are composited rather than sampled because a 1px border on a
fractional rect is antialiased, and picking whichever of three neighbouring
pixels "looks like the border" is a way to get the answer you wanted.

A border composites over its **own** element's fill, not over the card:
`background-clip` is `border-box`, so the element's background is painted under
its border, and the same composited colour is what meets the card on the other
side.

## What was wrong

| מה נמדד | קדמת | רקע | יחס | סף | | הערה |
|---|---|---|---|---|---|---|
| כרטיס — `h1` "פתיחת קיוסק" | `rgb(255, 255, 255)` | `rgb(24, 46, 72)` | **13.79:1** | 3:1 | ✅ |  |
| כרטיס — `.sub` משפט ההסבר | `rgb(185, 200, 226)` | `rgb(24, 45, 72)` | **8.24:1** | 4.5:1 | ✅ |  |
| כרטיס — `label` "קוד גישה" | `rgb(255, 255, 255)` | `rgb(24, 46, 73)` | **13.76:1** | 4.5:1 | ✅ |  |
| `#code` — הטקסט שמוקלד | `rgb(255, 255, 255)` | `rgb(16, 33, 53)` | **16.27:1** | 3:1 | ✅ |  |
| `.brand` — שם המוצר | `rgb(255, 255, 255)` | `rgb(12, 40, 68)` | **14.97:1** | 3:1 | ✅ |  |
| `.foot` — השורה מתחת לכרטיס | `rgb(143, 162, 192)` | `rgb(11, 36, 67)` | **6.01:1** | 4.5:1 | ✅ |  |
| `#code::placeholder` — "XXXXXX" | `rgb(147, 155, 164)` | `rgb(16, 33, 53)` | **5.78:1** | 4.5:1 | ✅ |  |
| `#code` — מסגרת מול המילוי (פקד) | `rgb(124, 133, 144)` | `rgb(16, 33, 53)` | **4.35:1** | 3:1 | ✅ |  |
| `#code` — מסגרת מול הכרטיס (פקד) | `rgb(124, 133, 144)` | `rgb(23, 50, 72)` | **3.54:1** | 3:1 | ✅ |  |
| `#step-code` — מסגרת הכרטיס מול הרקע | `rgb(45, 67, 93)` | `rgb(11, 36, 67)` | **1.54:1** | — | ℹ️ | מפריד בין משטחים — 1.4.11 פוטר |
| `#code:focus` — טבעת המיקוד מול המילוי | `rgb(34, 197, 94)` | `rgb(17, 34, 53)` | **7.07:1** | 3:1 | ✅ |  |
| `#code:focus` — טבעת המיקוד מול הכרטיס | `rgb(34, 197, 94)` | `rgb(23, 50, 72)` | **5.81:1** | 3:1 | ✅ |  |
| `#code-submit` — "המשך" (טקסט) | `rgb(255, 255, 255)` | `rgb(61, 116, 255)` | **4.09:1** | 3:1 | ✅ |  |
| `#code-submit` — מילוי הכפתור מול הכרטיס (גבול הפקד) | `rgb(61, 116, 255)` | `rgb(23, 50, 72)` | **3.24:1** | 3:1 | ✅ |  |
| `#code::placeholder` — **לפני** (הוזרק מחדש) | `rgb(88, 100, 114)` | `rgb(16, 33, 53)` | **2.70:1** | 4.5:1 | ❌ |  |
| `#code` — מסגרת **לפני** (הוזרקה מחדש) | `rgb(76, 89, 104)` | `rgb(16, 33, 53)` | **2.27:1** | 3:1 | ❌ |  |
| `#code-submit` — מילוי **לפני** מול הכרטיס | `rgb(42, 97, 232)` | `rgb(23, 50, 72)` | **2.51:1** | 3:1 | ❌ |  |
| `#code-submit` — הטקסט **לפני** ב-17px | `rgb(255, 255, 255)` | `rgb(42, 97, 232)` | **5.28:1** | 4.5:1 | ✅ | עבר גם לפני — 17px נספר כטקסט רגיל |
| `.alert` — טקסט השגיאה | `rgb(255, 217, 217)` | `rgb(58, 49, 72)` | **9.45:1** | 4.5:1 | ✅ |  |
| `.alert` — מסגרת מול המילוי | `rgb(139, 58, 70)` | `rgb(58, 49, 72)` | **1.63:1** | — | ℹ️ | מסגרת של הודעה, לא של פקד |
| `.alert` — המילוי מול הכרטיס | `rgb(58, 49, 72)` | `rgb(23, 50, 72)` | **1.08:1** | — | ℹ️ | הטקסט הוא הנשא, לא הצבע |
| `.choice b` — שם היעד | `rgb(255, 255, 255)` | `rgb(41, 61, 87)` | **11.06:1** | 4.5:1 | ✅ |  |
| `.choice small` — הכתובת מתחת לשם | `rgb(185, 200, 226)` | `rgb(41, 60, 85)` | **6.64:1** | 4.5:1 | ✅ |  |
| `.devicename` — "מכשיר: …" | `rgb(185, 200, 226)` | `rgb(25, 51, 79)` | **7.63:1** | 4.5:1 | ✅ |  |
| `.btn-link` — "הזנת קוד אחר" | `rgb(185, 200, 226)` | `rgb(25, 48, 79)` | **7.88:1** | 4.5:1 | ✅ |  |
| `.choice` — מסגרת מול מילוי השורה (פקד) | `rgb(137, 148, 162)` | `rgb(41, 61, 85)` | **3.60:1** | 3:1 | ✅ |  |
| `.choice` — מסגרת מול הכרטיס (פקד) | `rgb(137, 148, 162)` | `rgb(25, 57, 75)` | **3.95:1** | 3:1 | ✅ |  |
| `.choice` — מילוי השורה מול הכרטיס | `rgb(41, 61, 85)` | `rgb(25, 57, 75)` | **1.10:1** | — | ℹ️ | המסגרת היא גבול הפקד, לא המילוי |
| `.choice.shown .ico` — גוון הסוג מול מילוי השורה | `rgb(111, 94, 61)` | `rgb(41, 61, 85)` | **1.77:1** | — | ℹ️ | הסמל נושא את ההבחנה, לא הגוון |
| `.choice.venue .ico` | `rgb(39, 103, 88)` | `rgb(41, 61, 85)` | **1.67:1** | — | ℹ️ | כנ"ל |
| `.choice` (לקוח) `.ico` | `rgb(52, 84, 147)` | `rgb(41, 61, 85)` | **1.50:1** | — | ℹ️ | כנ"ל |
| `.choice.link .ico` | `rgb(82, 69, 141)` | `rgb(41, 61, 85)` | **1.37:1** | — | ℹ️ | כנ"ל |
| `.empty` — "לא אושרו מזהי לקוח ולא קישורים" | `rgb(185, 200, 226)` | `rgb(25, 47, 75)` | **8.02:1** | 4.5:1 | ✅ |  |
| `.choice` — מסגרת **לפני** מול המילוי | `rgb(84, 100, 119)` | `rgb(41, 61, 85)` | **1.83:1** | 3:1 | ❌ |  |
| `.choice` — מסגרת **לפני** מול הכרטיס | `rgb(84, 100, 119)` | `rgb(25, 57, 75)` | **2.01:1** | 3:1 | ❌ |  |
| הדף כהה בשני מצבי המערכת | `rgb(23, 50, 72)` | `rgb(23, 50, 72)` | **זהה** | זהה | ✅ | משטחים נדגמו בשתי הרצות |

Three real defects, one design constraint that made the third interesting:

1. **`#code::placeholder` — 2.70:1.** `rgba(255,255,255,.3)` over the input's
   `rgba(0,0,0,.28)`. It is the only thing on the screen saying the code is six
   characters long, and it is read *before* anything is typed. Now `.55` →
   5.78:1, still far dimmer than the typed value (`#fff`, 16.27:1), which is the
   one job a placeholder's colour has.
2. **`.choice` — 1.83:1 / 2.01:1.** Every row of the selection screen: the
   businesses and links a person picks between in a hall. `rgba(255,255,255,.2)`
   is not a faint edge, it is no edge — and the row *is* the control. Now `.45`
   → 3.60:1 against the row's own fill and 3.95:1 against the card.
3. **`#code-submit` — 2.51:1.** `.btn` declares `border: none`, so the fill **is**
   the boundary. This one could not be fixed by moving one number: white text
   needs 4.5:1 from the inside and the card needs 3:1 from the outside, and
   **no solid fill satisfies both** at 17px (the two constraints cross at
   L≈0.185). So the label became WCAG *large text* — 19px at weight 700, over
   the 18.66px line, which is also just a better label on a tablet — and the
   fill moved to `#3d74ff`: **3.24:1** against the card, **4.09:1** under the
   label. `--accent` itself is untouched; the console still uses it.

Also changed: `.choice:hover` was `rgba(255,255,255,.4)`, i.e. *below* the new
resting `.45`, so hovering a row would have made its outline fainter. Now `.62`.
`.btn-ghost` (unused today) moved onto the same token so it cannot be added later
at the old value.

## Left, deliberately, with numbers rather than silence

- **The card edge, 1.54:1**, and the alert's fill and border. 1.4.11 exempts
  separators, and none of these is the only thing marking its boundary — the
  card carries a fill and a blur, the alert carries its text.
- **The four `.ico` tints, 1.37–1.77:1.** They are what tells the four kinds of
  row apart, which sounds like 1.4.1 — but each row also carries a distinct
  **emoji** and a name, so colour is not the sole carrier. Raising the tints to
  3:1 would put four saturated blocks on a dark card and is a design change.
- The **disabled** submit (`opacity: .45`, the state before six characters are
  typed) is not graded: 1.4.3 and 1.4.11 both exempt inactive controls.

## Two harness bugs found here, both fixed in this run

- **The input is focused on load**, so the first read reported the green
  `:focus` ring as the resting border — and the resting border, the state the
  field is in the moment anyone taps anything else, would never have been
  measured at all. That is how it stayed at `.25` through this whole build. The
  harness now blurs first and measures both states.
- **`transition: .15s` on `.btn` / `.choice` covers `color` too**, so removing
  the text-hiding style and reading in the same tick returns a value part way
  back from transparent: `#code-submit`'s label first read as
  `rgba(255, 255, 255, 0.74)`. The same class of bug `button-boundary-0811`
  documented. There is now a settle wait, and `check()` **throws** on any
  non-opaque colour reaching it — `lum()` reads three channels, so a translucent
  value would otherwise have been graded as opaque, flatteringly and silently.

## Screenshots

| | |
|---|---|
| `04-empty-form.png` | the form as it is read — placeholder visible |
| `01-code-screen.png` | a refused code: the alert, the focus ring, the button |
| `02-selection-screen.png` | all four row kinds, with edges |
| `03-nothing-approved.png` | the "no approvals" state, which is correct and common |
