# round-4 functional pass — 04 imud (עימוד תורני, אות ודף)

Date: 2026-08-18. Live URL: https://more30.com/imud

## Login
Shared auth pill already reads customer-logged-in (`לקוח`), same pattern as
torah/tamlul/modaot — existing browser-profile session carried through.

## Core action (typesetting engine)
Home shows "הספרים שלי" (my books) with two real user-created books (not
placeholders): "ניסיון" (ניסיון ראשוני) and "ספר חדש". Opened
`#/editor/5` ("ניסיון"):
- Live layout preview (iframe) renders the actual book content: heading
  "סימן א׳", body text ("דין קריאת שמע וברכותיה..."), a table of contents,
  and a numbered footnote — full Hebrew typesetting engine working end to
  end, not a stub.
- Clicked "שמור" (save): toast "נשמר" appeared, no error. Save round-trips
  cleanly against real data.

## Verdict
Clears the round-4 bar: login works + core action (live typeset + save)
works + real data + deployed 200. No bug found, no code change, no deploy
needed this step.

## Next
Round-4 ROUTES order (per scripts/qa/platform-audit.mjs) continues with
briut (06) after imud (04) — smachot/smel/torah/tamlul/modaot/imud already
covered.
