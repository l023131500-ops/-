# QA — per-device client picker (#35 KioskFleet, §2★ה console side) — 11/08/2026

`PUT /api/devices/:id/clients` landed on 11/08 with no surface: approving a
client for a device was an HTTP call. This step adds the picker — a
**🆔 מזהי לקוח** button on each device card opening a checkbox list of the
owner's registry.

## How it was run

`server/node_modules` is absent in this checkout, so `src/index.js` (express +
better-sqlite3) cannot start. `stub-server.mjs` here serves the **real**
`server/public/` over node's http module and answers the two routes from an
in-memory store whose rules come from the **real** `src/approvals.js`
(`approvalSelection`, `effectiveHostCsv`, `selectableClients`), called exactly as
`routes/devices.js` calls them. `/api/_qa/state` reads back what was stored and
what `update_config` carried.

Fixtures: two devices — `כניסה ראשית` with `allowed_host=hadar.example.com`, and
`עמדת לובי` with **no** allow-list — and three clients, one of them disabled
(`אולמי נוף`, id 13) and already approved on device 1.

Driven in a real browser (Playwright, `http://127.0.0.1:4174/console`).

## Cases

| # | Case | Result |
|---|---|---|
| 1 | Open on device 1 — the disabled-but-approved client is shown **checked**, labelled `⛔ הלקוח מושבת`, counter reads `1 מתוך 3 מאושרים` | ✅ |
| 2 | Tick `אולם הדר` → save. Stored: `{1,11}, {1,13}` — the disabled approval survives a save it was not touched in | ✅ |
| 3 | Same save pushes `update_config` with `allowedHost = hadar.example.com,pay.example.com` — the client's payment host is added, and the **disabled** client's `nof.example.com` is not | ✅ |
| 4 | Reopen device 1 — 11 and 13 checked, 12 not; counter `2 מתוך 3` | ✅ |
| 5 | Open device 2 — list is **device-scoped**: `0 מתוך 3`, nothing carried over from device 1, and the hint reads `למכשיר הזה לא הוגדרה רשימת דומיינים מותרים… אישור מזהה אינו משנה זאת` instead of device 1's widening hint | ✅ |
| 6 | `סמן הכל` → save on device 2. Toast `נשמר — 3 מזהי לקוח מאושרים למכשיר`; pushed `allowedHost` stays `""` — an unset list is left unset, so approving does not create a lock on a device that had none | ✅ |
| 7 | Device 1's rows are untouched by device 2's save (replace is per-device) | ✅ |
| 8 | `נקה הכל` → save on device 1. Toast `נשמר — לא אושר למכשיר אף מזהה לקוח` (an empty save is legitimate and must not read like a granted approval); rows for device 1 removed; pushed `allowedHost` narrows back to `hadar.example.com` | ✅ |
| 9 | Empty registry (GET stubbed to `{clients:[]}`): no save button at all — a "למסך מזהי לקוח" button that closes the modal and routes to the registry screen | ✅ |
| 10 | Dark mode (`prefers-color-scheme: dark`) — `02-picker-dark.png`; light — `01-picker-light.png` | ✅ |

`node --check` on `public/js/app.js` passes.

## Console errors seen

Three, all artefacts of the stub and none from the picker: `favicon.ico` 404
(not served here) and two failed `ws://…/ws/console` handshakes (the stub has no
websocket; the app retries at 60s).

## Not covered

Not deployed — the Railway service still serves the previous console. The device
side (§2★ה/ו selection screen) still does not call `identify`, so approving here
changes what the device *may* show, not yet what it shows.
