# QA — per-device activity log (#35 KioskFleet, KIOSK_BUILD.md §9 "יומן אירועים לכל מכשיר") — 24/08/2026

`GET /devices/:id` already returns `events` (last 30, newest first) and
`commands` (last 20, newest first) — the audit-trail fields §9 asks for — but
nothing in the console ever called that endpoint or rendered them; the only
way to see a device's history was a raw HTTP request. This adds the surface:
a **📋 יומן** button on each device card opening a read-only modal with two
tables (recent commands, recent events), Hebrew labels for every type/status,
and a raw-string fallback for anything unmapped.

## How it was run

`server/node_modules` is absent in this checkout, so `src/index.js` (express +
better-sqlite3) cannot start — the same constraint every entry in this log
hits. `stub-server.mjs` serves the real `server/public/` over node's http
module and answers `GET /devices/:id` with fixed rows covering **every**
device-scoped event type and command type the server can actually produce
(grepped from `logEvent()`/`COMMAND_TYPES` call sites — see `run.mjs`'s
header), plus one unmapped type (`weird_future_type`) to prove the fallback.

**New this round — real-browser QA could not run in this sandbox**: `ldd` on
both downloaded Chromium builds (`chromium-1234`, `chromium_headless_shell-1148`)
shows `libatk-1.0.so.0`, `libatk-bridge-2.0.so.0`, `libgbm.so.1`,
`libasound.so.2`, `libX{composite,damage,fixes,randr}` all missing, and there
is no passwordless sudo to install them (`sudo -n true` fails). `run.mjs` is
written and ready — it drives the stub in a real Chromium, light+dark, and
asserts every case in the table below — but it currently fails at
`chromium.launch()` before opening a page. Left in place for a sandbox that
does have the libs (or once `playwright install-deps` is run once with sudo).

**What actually ran**: `node --check public/js/app.js` (passes) and
`coverage-check.mjs` — a DOM-free static check, parsing the *real* source
(not a hand-copied list) to confirm `EVENT_LABELS`/`COMMAND_LABELS`/
`COMMAND_STATUS_LABELS` in `app.js` cover every type/status the server can
actually emit, that every label lookup has a `|| raw` fallback, and that every
interpolated field inside `viewDeviceLog()` is either `esc()`-wrapped, a
`fmtTime()` call, or one of the two pre-built (already-escaped) HTML strings
(`commandsHtml`/`eventsHtml`) or the device's own numeric `id` used in the API
path. All checks pass — see console output below.

## Cases (asserted by `run.mjs`, not yet executed — see above)

| # | Case |
|---|---|
| 1 | Every device card has a 📋 יומן button |
| 2 | Clicking it fetches `GET /devices/:id` and renders a failed `reboot`, a done `screenshot`, and a delivered `update_config` command with correct Hebrew type+status |
| 3 | All 9 device-scoped event types (`command`, `enrolled`, `client_identified`, `screenshot`, `command_ack`, `connected`, `config_update`, `client_approved`, `client_revoked`) render their Hebrew label |
| 4 | An unmapped event type (`weird_future_type`) falls back to the raw string, not blank/`undefined` |
| 5 | No `undefined`/`[object Object]` leaks into the modal |
| 6 | Events render newest-first, matching the server's own `ORDER BY id DESC` — the modal does not re-sort |
| 7 | A device with no history shows the two empty-state messages (`אין עדיין פקודות` / `אין עדיין אירועים`), not a blank table or a stuck spinner |
| 8 | Closing the modal removes it from the DOM |
| 9 | Light and dark (`prefers-color-scheme`) both screenshot cleanly |
| 10 | Zero console/page errors across the whole flow |

## Static verification that did run

```
$ node --check public/js/app.js   → OK
$ node QA/kiosk/device-log-0824/coverage-check.mjs
  ok — EVENT_LABELS covers all 9 device-scoped event types the server can log
  ok — COMMAND_LABELS covers all 11 command types in COMMAND_TYPES
  ok — COMMAND_STATUS_LABELS covers all 4 statuses
  ok — every label lookup has a raw-value fallback (an unmapped type cannot render blank/"undefined")
  interpolations not wrapped in esc()/fmtTime(): ${d.id}, ${commandsHtml}, ${eventsHtml}
    — d.id is this app's own numeric device id (API path only); the other two
      are pre-built strings whose own pieces are esc()-wrapped, confirmed by
      inspection of buildEventsHtml/buildCommandsHtml above them in the diff.
  RESULT: PASS
```

## Not covered

- Real-browser visual confirmation (light/dark screenshots, DOM-order
  assertion, empty-state screenshot) — blocked on missing system libs in this
  sandbox, not on the code; `run.mjs` is ready to run wherever Chromium can
  launch.
- Not deployed — the Railway service still serves the previous console until
  pushed and built.
- No test customer account or real device exists to click 📋 יומן against a
  device with real history in production — the same constraint every entry in
  this log without a real device has hit.
