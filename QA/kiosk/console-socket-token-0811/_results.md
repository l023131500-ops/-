# `device_update` no longer carries the agent's token — #35 KioskFleet, 11/08/2026

**What was wrong.** `notifyConsolesOfDevice()` in `server/src/hub.js` sent
`{ ...device, ...payload }` where `device` is a raw `SELECT * FROM devices` row.
That row's `device_token` is the agent's long-lived secret and the whole of its
authentication — `/ws/agent?token=<device_token>` accepts it on its own. It is
the one field `publicDevice()` in `routes/devices.js` exists to strip, and the
socket path bypassed it. Four call sites were affected (`hub.js` ×3 on
connect/disconnect/status, `routes/agent.js` ×2, `routes/devices.js` ×2).

Only the owner and every admin are on the receiving end, so no stranger ever saw
it. The exposure is a console XSS or a browser extension reading socket frames:
either can lift the token and impersonate the device.

**The fix.** `server/src/devicepayload.js` — `consoleDevice(device, payload)`,
an **allow-list** of the 18 fields the console may receive. `hub.js` calls it
once per notify. Kept dependency-free (`hub.js` imports `ws`, `db.js`,
`config.js`, none of which load in this checkout) so the rule is testable here.

Allow-list rather than `delete device_token`: a deny-list is correct exactly
once — the next secret column added to `devices` would ship to every open
console until someone remembered to extend it, and nothing fails when they
don't. `devicepayload.test.mjs` asserts the dropped set is exactly
`['device_token']` against a real `SELECT *`, so adding a column fails the test
until someone decides about it.

The frame stays the row's snake_case. `mapDevice()` in `public/js/app.js` reads
both shapes on purpose (REST is camelCase, the socket is the row); converting
here would be a second change riding along with an auth fix.

## Unit — `server/test/devicepayload.test.mjs`

8 cases, all green. The row under test is not hand-written: the `devices` DDL
from `src/db.js` runs against `node:sqlite` and a real `SELECT *` row is passed
in, so the column set tested is the one the server has.

| case | asserts |
|---|---|
| the agent secret does not reach the console | no `device_token` key, and the value appears nowhere in the JSON |
| every devices column is either forwarded or a reviewed exclusion | dropped set is exactly `['device_token']` — fails when a column is added |
| everything the console renders survives | all 14 fields `mapDevice()` reads |
| the payload overrides the row | `{ online: 1, last_seen }` from the connect path wins |
| the payload cannot put the secret back | filtering runs after the merge |
| a field the row does not carry stays absent, not undefined | see below |
| a missing row is an empty object, not a throw | the close handler races a delete |
| the allow-list is frozen | imported per notify; a mutation would widen it process-wide |

The absent-not-undefined case is a real bug avoided, not a formality: the
console applies updates as `{ ...DEVICES[i], ...mapDevice(m.device) }`, so a key
present with value `undefined` blanks a good value the REST load had put there.
A status frame would have erased the device's name off the card.

**Full suite: 43/44.** The one failure is `routing.test.mjs`, which imports
express — the pre-existing constraint documented in `apps/35-kioskfleet/STATUS.md`
(`server/node_modules` is absent here). It was 35/36 before this step; the 8 new
tests are the difference.

## Browser — `stub-server.mjs`

The real `server/public/` served over node's http module, with `/ws/console` a
hand-rolled RFC6455 handshake plus a server→client text frame. The frame it
pushes is built by the **real** `consoleDevice()` from a real row holding a real
token (`dt-live-6b21f0e4c7a9`), so the assertions are against bytes on a socket,
not a return value.

The REST load and the socket update deliberately disagree, so an assertion can
tell which one the card is showing: REST says `online: 0`, `battery: 41`,
`last_seen 00:00`; the socket says `online: 1`, `battery: 93`, `09:30`.

| checked | result |
|---|---|
| card reflects the socket update | `מחובר`, `93%`, `11.8.2026, 12:30:00` — all from the frame |
| name survives the update | `כניסה ראשית` still rendered, not blanked by the merge |
| access code survives | `K7M4XZ` still on the card |
| token in any socket frame | **no** — 2 frames received (`hello`, `device_update`), neither contains it |
| `device_token` key in the frame | **no** |
| token anywhere in the DOM | **no** (`outerHTML` search) |
| token in the console's in-memory `DEVICES` | **no** |

Screenshot: `01-card-after-socket-update.png`.

The socket bytes, verbatim from an independent `WebSocket` opened in the page:

```json
{"id":1,"name":"כניסה ראשית","serial":"QA-0001","online":1,"status":"kiosk",
 "home_url":"https://hadar.example.com/event/1","allowed_host":"hadar.example.com",
 "idle_return_seconds":60,"last_seen":"2026-08-11 09:30:00","access_code":"K7M4XZ",
 "battery":93,"model":"Lenovo TB-X306","app_version":"1.4.0","ip":"10.0.0.4",
 "owner_id":7,"android_ver":"11","created_at":"2026-08-01 09:00:00"}
```

## Notes

- **Not deployed.** The Railway service still runs the previous build, along with
  the registry, the approvals, `identify` and the access code from earlier steps.
  Until it is, the live console still receives the raw row.
- The login pill overlaps `הוספת מכשיר` in the screenshot. That is the known
  shared `auth-button.js` overlap, it is present on this stub because it serves
  `public/` without the portal's `--more30-auth-inset`, and it is unrelated to
  this change. Not touched here.
- No schema change. No migration. The database was read-only this step apart
  from the `core.run_progress` heartbeat.
