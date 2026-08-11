# QA — the maintenance code, on screen (§2★ה/§4, console side) · #35 KioskFleet

`server/node_modules` is absent here, so `src/index.js` cannot run. `stub-server.mjs`
serves the **real** `server/public/` and answers `PATCH /devices/:id` through the
real `exitcode.js` (`normalizeExitCode`, `configExitCode`) over the production
`devices` DDL on `node:sqlite`, in the order `routes/devices.js` calls them. It
also records the `update_config` a real PATCH would issue, so the assertions cover
**what the device is handed**, not only what was stored — a code saved and never
pushed is a code the device does not have, which is the whole failure this step
ends.

Driven in a real Chromium (Playwright) at `http://127.0.0.1:4183/console`.

## Cases

| # | What | Result |
|---|---|---|
| 1 | Card, device with a code | `🚪 קוד יציאה: מוגדר` |
| 2 | Card, device without one | `לא הוגדר — אין יציאה מקומית`, bold |
| 3 | **The code is not printed on the card** — `card.innerText.includes('keter7291')` | `false` on both cards |
| 4 | `🚪 קוד יציאה` present on every card, after `🔑 קוד גישה` | 12 buttons, in order |
| 5 | `1234` | refused: `קל מדי לניחוש`, dialog stays open, no row |
| 6 | `987654` (a run, not on the deny list) | same refusal — shape, not a list |
| 7 | `abc` | `קצר מדי — לפחות 4 תווים` |
| 8 | `b3xq47` vs access code `B3XQ47` | `זהה לקוד הגישה של המכשיר` — case-insensitive |
| 9 | Empty save on a device with no code | `לא הוזן קוד.`, no confirmation offered |
| 10 | `' shesh-mishmar9 '` saved | stored `shesh-mishmar9` (ends trimmed), card → `מוגדר` |
| 11 | …and the push | `update_config.adminCode === 'shesh-mishmar9'` |
| 12 | Dialog on a device that has a code | field prefilled `keter7291` — readable on demand |
| 13 | Empty save on a device that has one | inline confirm, action row hidden, no write |
| 14 | Cancelling that confirm | buttons back, **field restored to the code** |
| 15 | Confirming it | `exit_code` → `NULL`, card → `לא הוגדר` |
| 16 | …and the push | `adminCode === ''` — the empty string, **not** `null` |

16/16. `node --test 'test/*.test.mjs'` → **121/122**, the documented baseline
(`routing.test.mjs` imports express and still cannot run here). This step adds no
server logic, so the count is unchanged by design.

## Contrast (read from `getComputedStyle`, background walked to the first opaque ancestor)

| Element | Light | Dark |
|---|---|---|
| Card state line (`.meta`, `--muted`) | 5.49 | 7.08 |
| `.alert-error` in the dialog | — | 5.30 |
| Field text | 18.24 | 15.13 |

Dark was produced by adding `.dark` to `:root` — the console's own theme class —
rather than by `emulateMedia`, so unlike `dark-inputs-0811` this run does **not**
cover what the browser paints from `color-scheme`. It is a screenshot pair, not a
re-run of that step's measurements.

## Defects found here and fixed

1. **`4–32 תווים` rendered as `32–4 תווים`.** A digit range is directionally
   neutral inside a Hebrew sentence. Only the screenshot catches this — the source
   string and `innerText` are both correct. Wrapped U+2066…U+2069, the same fix
   `windowLabel()` carries.
2. **The same defect in the server's own error string**, `…מתו חוזר (1234, 0000)`:
   a parenthesised digit list, and being last on the line it also split across the
   wrap with the brackets on the wrong sides. Isolated in `routes/devices.js` and
   in the dialog's hint. No test asserted the string, so nothing else moved.

## Not covered

- The device end. `AgentClient.kt` still does not write `adminCode` into
  `Prefs.ADMIN_CODE`, so a code set here travels and is dropped — item 2 of
  STATUS's "Next, in order", waiting on an Android toolchain.
- The socket path. `device_update` carries `exit_code` (it is in
  `CONSOLE_DEVICE_FIELDS`) and `mapDevice` reads both shapes, but this harness has
  no `/ws/console`; only the REST shape was driven.
