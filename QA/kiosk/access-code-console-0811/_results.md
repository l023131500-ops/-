# QA — device access code in the console (#35 KioskFleet, §2★ז)

Harness: `stub-server.mjs` (node http + `node:sqlite`, serving the real
`server/public/`). The code path is the real `accesscode.js` against the real
DDL — same `devices.access_code` column and the same non-partial
`idx_devices_access_code` UNIQUE index `db.js` creates — so a re-issue here
allocates exactly as production does. Driven in a real Chromium (Playwright).

Three devices: two backfilled at boot (as `index.js` does), and one inserted
*after* the backfill to stand for an owner who has not restarted the server
since the column landed.

| # | Case | Expected | Result |
|---|---|---|---|
| 1 | Card, device with a code | code shown in full on the card | ✅ `GB7HL8`, `SYYLFW` |
| 2 | Card, device without one | says so rather than showing a blank | ✅ `קוד גישה: טרם הונפק` |
| 3 | `🔑 קוד גישה` dialog | device name + S/N + the code, large | ✅ screenshot 01 |
| 4 | Re-issue → confirm step | action row hidden, warning shown | ✅ screenshot 02 |
| 5 | Cancel the confirmation | actions back, code still on screen | ✅ `GB7HL8` unchanged |
| 6 | Confirm the re-issue | new code in the dialog *and* on the card | ✅ `GB7HL8` → `PCG6ND`, both |
| 7 | …what was stored | the new code, and only on that device | ✅ device 1 replaced; 2 untouched |
| 8 | …what the stored codes are | canonical (`normalizeAccessCode(c) === c`) | ✅ all rows |
| 9 | Dialog on the un-issued device | `—`, and re-issue gives it a first code | ✅ `—` → `PUC8HZ`, card follows |
| 10 | Dark mode | modal + chip legible on the dark card | ✅ screenshot 03 |

Screenshots: `01-dialog-light.png`, `02-reissue-confirm.png`, `03-dialog-dark.png`.

## Not covered here

- **The copy button was not driven in the browser.** `navigator.clipboard.readText()`
  hangs in this headless Chromium waiting on a permission prompt, and the click
  that preceded it went in without a toast coming back, so neither the clipboard
  path nor the `execCommand` fallback has a browser result — only the code
  itself and its no-code guard (`אין עדיין קוד להעתקה`) were reviewed. The code
  is on screen either way, which is what the owner actually reads out, so this
  is a convenience button rather than the feature. Worth driving with clipboard
  permissions granted next time this file is touched.
- Console errors during the run were the harness's own: no `favicon.ico`, and
  `/ws/console` 404s because the stub has no WebSocket server. Nothing from
  `app.js` itself.
- Not deployed — Railway still serves the previous console.
