# QA — `/kiosk-launcher/:code`, the page (KIOSK_BUILD §2★ז)

11/08/2026. The launcher's API and its rate limiter landed in `33a3ddd`; this is
the screen that uses them — item 4 of `apps/35-kioskfleet/STATUS.md`'s "Next, in
order".

## How it was run

`server/node_modules` is absent in this checkout, so `src/index.js` and
`routes/launcher.js` cannot be loaded (express, better-sqlite3).
`stub-server.mjs` rewrites **only the express glue** — the two mounts, the status
codes, the `sendFile`. Everything that decides anything is the real module:
`accesscode.js`, `approvals.js`, `launcher.js` and `ratelimit.js` are imported
from `server/src`, the database is `node:sqlite` running the DDL text `db.js`
runs, and the HTML served is `server/public/kiosk-launcher.html` byte for byte.
The browser is a real Chromium (Playwright).

Fixtures: device 1 "לובי ראשי" with clients 1 and 2 approved and client 3
registered-but-not-approved; device 2 "כניסה צפונית" with nothing approved. The
access codes are generated fresh at each boot, so the ones in the transcript
below differ between runs.

Suite: `node --test "test/**/*.test.mjs"` → **59/60**. The one failure is
`routing.test.mjs`, which imports express and cannot load here — pre-existing,
unchanged by this step, and recorded the same way in the previous four rounds.

## Cases

| # | Case | Result |
|---|---|---|
| 1 | the bare page comes up, code field focused, `המשך` disabled | ✔ |
| 2 | a code written down as `a2yr-hc` normalises in the field to `A2YRHC` and enables the button | ✔ |
| 3 | a wrong code → `קוד לא מוכר`, stays on the code step | ✔ |
| 4 | the right code → the selection screen, `מכשיר: לובי ראשי` | ✔ |
| 5 | exactly the approved set is offered — venue + `אולם הדר` + `מסעדת גליל`; `גני שרה` (registered, not approved for this device) is absent | ✔ |
| 6 | nothing the payload must not carry is in the DOM: no `device_token`, no serial, no client codes | ✔ |
| 7 | a typed code is **not** written into the address bar | ✔ |
| 8 | choosing a business navigates the browser to that client's site (`/site/hadar`) | ✔ |
| 9 | `/kiosk-launcher/svd6-vc` — the URL form, lower case and dashed — resolves on load with no typing | ✔ |
| 10 | a device with no approvals shows the venue button plus the explanation, not an empty card | ✔ |
| 11 | `הזנת קוד אחר` returns to the code step, clears the field, and **scrubs the code out of the URL** | ✔ |
| 12 | ten wrong codes → locked out on the tenth, `נסו שוב בעוד 15 דקות`, with the reason on screen | ✔ |
| 13 | during the lockout, typing re-enables nothing and does not wipe the reason; the *right* code is still refused | ✔ |
| 14 | a stale page whose client was un-approved → `מזהה לקוח אינו מאושר למכשיר זה`, no navigation | ✔ |
| 15 | the venue button navigates to the device's own site (`/site/hall`) | ✔ |
| 16 | the same page, same code, served at the **un-prefixed** mount (`/kiosk-launcher/…`, the Railway hostname and dev) resolves identically | ✔ |

## Two defects found in this run and fixed

- **the lockout counted in seconds.** `נסו שוב בעוד 900 שניות`, ticking to 899.
  Nobody reads 900 as a quarter of an hour and nobody watches it; a working rate
  limiter was going to be reported as a dead tablet. It now says minutes above a
  minute and seconds only in the last one.
- **the lockout gave no reason.** A disabled button with a timer on it and
  nothing else is indistinguishable from a fault. The 429's message is now shown,
  and typing no longer wipes it.

## Not covered

- **Nothing is deployed.** The Railway service still runs the previous build, so
  `more30.com/kiosk/kiosk-launcher` is a 404 in production until it is rebuilt.
- The "locked kiosk" of §2★ז is a plain top-level navigation here. Real lockdown
  is Lock Task Mode in the Android agent (`KioskActivity`), which does not call
  `identify` yet — items 3 and 5 of STATUS's list.
- `idleReturnSeconds` comes back from `/open` and the page ignores it; returning
  an idle tablet to the venue's site is the agent's job, not a web page's.

## Files

- `stub-server.mjs` — the harness. `node QA/kiosk/launcher-page-0811/stub-server.mjs`,
  then drive `http://127.0.0.1:4187/kiosk/kiosk-launcher`.
- `01-code-entry.png`, `02-wrong-code.png`, `03-choose.png` (1024×768),
  `04-no-approvals-tablet.png`, `05-lockout.png` (800×1180, tablet portrait).
