# IdentifyDevice — KIOSK_BUILD §2★ז (11/08)

`POST /api/agent/identify` — the route the device screen calls: profile + active
context + ready links in one answer, and the redemption of a "מזהה לקוח" typed
on the keypad.

## What was verified

**Unit — 7 cases, `server/test/identify.test.mjs`.** The storage half runs
against `node:sqlite` with the same DDL text as `src/db.js`, so the join is
exercised rather than assumed:

- no code typed → selection screen: `kioskUrl == displayUrl`, `client: null`,
  and only *active* approved clients in the list;
- a typed code moves `displayUrl` to that client's site and leaves `kioskUrl`
  alone — idle-return and reboot go back to the venue, not to the last client;
- the returned `allowedHost` is wide enough to open what the same answer just
  pointed at, and still withholds a disabled client's host;
- a registered-but-unapproved code (`DS7LZ`), a disabled one (`99`), a typo
  (`NOPE`) and punctuation (`####`) all give the identical refusal;
- a device with zero approvals identifies fine and offers nothing — and its
  `allowedHost` comes back byte-identical to its own;
- the same code resolves to nothing on another owner's device in the same db;
- `serialMatches` accepts an omitted or differently-cased serial, refuses
  another device's.

Suite: **27/27 green** of the runnable tests. `test/routing.test.mjs` fails to
*load* here (`ERR_MODULE_NOT_FOUND: express`) — pre-existing, unrelated, and the
same in this checkout before the change.

**HTTP contract — `stub-server.mjs` (output in `http-contract.txt`).** express
cannot be loaded in this checkout, so the route file cannot be started; the stub
restates its four guards and imports the *real* `approvals.js` / `identify.js`.
Six calls over a real socket:

| status | case | result |
|---|---|---|
| 401 | no token | `device token invalid` |
| 401 | bad token | `device token invalid` |
| 200 | selection screen | home + one selectable client |
| 200 | code typed `" 12-34 "` | display moves to `hadar.example.com` |
| 404 | unapproved code `DS7LZ` | `מזהה לקוח לא מוכר במכשיר זה` |
| 409 | serial mismatch | `המכשיר אינו תואם לרישום` |

## Not covered

- The Android agent does not call this yet — `KioskActivity` still opens
  `home_url` only. The selection screen on the device is the next step.
- **Not deployed.** The Railway service still runs the previous build.
