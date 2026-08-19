# kiosk (35) — the device's own access code (§2★ז, third bullet)

11/08. Storage + resolution only. The `/kiosk-launcher/:code` screen that
redeems the code is the next step; this is what it will resolve against.

## What was missing

§2★ז names three things. Two of them exist: `IdentifyDevice` (`src/identify.js`,
verified 11/08) and the launcher page. The third — *"לכל מכשיר/לקוח קוד קצר
לשיוך מהיר"* — had no representation at all, and the launcher cannot be built
without it: the person standing at the device types **a device code**, on
hardware that holds no device token yet, and there was no column for that code
to be stored in and nothing to resolve it against.

It is deliberately **not** the "מזהה לקוח" of `clientcode.js`. A client code is
redeemed *inside* a device that has already authenticated, and only picks which
approved business comes up. An access code identifies the device itself to an
unauthenticated caller. That difference is what forces the three properties
below.

## What was added

- `server/src/accesscode.js` — normalise / generate / issue / resolve /
  backfill. Free of `express` and `better-sqlite3` (like `approvals.js` and
  `identify.js`), so the tests in this checkout can load it.
- `devices.access_code` + `idx_devices_access_code` (UNIQUE) + a boot backfill,
  in `src/db.js`.
- issued at enrollment (`routes/agent.js`), returned in `publicDevice`
  (`routes/devices.js`), and re-issuable via `POST /devices/:id/access-code`.

Three decisions worth stating, all of them consequences of "an unauthenticated
caller types this":

1. **Globally unique, not per owner.** The launcher is handed a code and nothing
   else — no session, no owner — so two owners sharing `A7K2M9` would make one
   of them resolve to the other's device. The client code can be per-owner
   exactly because it is only resolved inside an authenticated device.
2. **Generated, never chosen.** 32⁶ ≈ 1.07e9 codes. An owner allowed to pick
   would pick `1234`.
3. **Re-issuable.** The code ends up printed on a card next to a tablet in a
   hall, so it leaks. Replacing it is a button, and the old code dies the moment
   the new one is stored.

## Verification

`node --test test/accesscode.test.mjs` → **8/8 pass** (`node-test.txt`).
Full suite: **35/36**. The one failure is `routing.test.mjs`, which imports
`express` directly and cannot run in this checkout — pre-existing and untouched
here; every test that *can* run is green.

| # | Case | Result |
|---|---|---|
| 1 | `A7K2M9`, ` a7k2m9 `, `A7K2-M9`, `A7K2 M9` are one code | pass |
| 2 | wrong length, empty, null, Hebrew, and the four ambiguous glyphs (`0 1 I O`) are refused before the database | pass |
| 3 | 500 generated codes: right length, alphabet-clean, and each survives its own input path unchanged | pass |
| 4 | an issued code resolves to its device — including lower-cased and hyphenated | pass |
| 5 | a forced collision is retried, not stored: one code never names two devices | pass |
| 6 | re-issuing kills the previous code immediately | pass |
| 7 | the backfill covers every existing device, and a second boot re-rolls nothing | pass |
| 8 | a code resolves across owners — there is no owner to scope by | pass |

**Migration** (`migration-sim.mjs` → `migration-check.txt`): `src/db.js` cannot
be imported here (better-sqlite3 absent), so a *pre-migration* devices table was
rebuilt on `node:sqlite` and db.js's three statements replayed in db.js's order.
The order is the load-bearing part — SQLite refuses `ADD COLUMN ... UNIQUE`, so
the index is separate, and leaving it in the `CREATE TABLE` block at the top of
db.js would have named a column the existing file lacks and taken the whole boot
down before the ALTER ran. Result: 3 devices migrated, 3 unique codes issued,
`home_url` / `allowed_host` / `serial` unchanged on all three, second boot a
no-op, and a duplicate refused by the engine.

## Not covered here

- No console UI yet — the code is in the API payload, not on the device card.
- The `/kiosk-launcher/:code` page itself.
- Rate limiting on the launcher route: a six-character code is guessable given
  unlimited attempts, so the route that redeems it needs a limiter. It does not
  exist yet, so there is nothing to limit — it belongs with the route.

**Not deployed.** The Railway service still serves the previous build.
