# QA — per-device client approval (#35 KioskFleet, §2★ה) — 11/08/2026

§2★ה says the person at the device may return to the selection screen and pick
another client — **only from those approved in management for that device**. The
registry built on 11/08 had no such notion: every client an owner registered was
equally reachable from every one of their devices, so a tablet in one hall was a
directory of every business in the chain.

This step adds the list and the gate. Not the device screen itself (§2★ז) — the
screen reads this.

## What was built

| | |
|---|---|
| `device_clients` | `PRIMARY KEY (device_id, client_id)`, cascade from both sides |
| `src/approvals.js` | the join query + the pure rules, free of express/better-sqlite3 |
| `GET /api/devices/:id/clients` | the owner's clients, each flagged `approved` |
| `PUT /api/devices/:id/clients` | replaces the set in one transaction, then pushes `update_config` |

## Tests — `server/test/approvals.test.mjs`, 7 cases, all green

`server/node_modules` is absent in this checkout, so the storage half is driven
against **`node:sqlite`** with the same DDL text as `src/db.js` — the constraint
and the cascades are the point of the table, so they are asserted against a real
engine rather than assumed.

| # | Case | Result |
|---|---|---|
| 1 | A device with no rows | Offers **nothing** — absence is a "no". The host allow-list's fail-open would be wrong here |
| 2 | Approving the same client twice | Refused by the primary key, not only by the route — two console tabs racing must not list one business twice |
| 3 | Deleting a client, then the device | Both cascade; no orphan row survives to resurrect on a reused id |
| 4 | `PUT` carrying another customer's client id, a non-existent id, a duplicate, a string id | Foreign + unknown dropped, duplicate collapsed, `"1"` accepted as `1` |
| 5 | Code typed as `" 12-34 "` on the keypad | Resolves to the approved client's site |
| 6 | A code that is registered-but-not-approved / approved-but-disabled / never existed | All three return the same `null`. A different answer per case turns the keypad into a probe for which businesses are in the chain |
| 7 | The allow-list pushed to the device | Widened to cover each **active** approved client's hosts, de-duplicated, device host first |

Full suite: `node --test test/approvals.test.mjs test/clientcode.test.mjs
test/hosts.test.mjs` → **20 pass, 0 fail**. `test/routing.test.mjs` cannot run in
this checkout at all — it imports `express`, which is not installed here; that is
pre-existing and unrelated to this step.

## The one thing that could have broken a live device

`hostAllowed()` treats an empty allow-list as "no lock configured" and allows
everything. Merging approved-client hosts into an unset list would therefore
have *created* a lock where there was none and cut a running device off from the
site it is showing right now. `effectiveHostCsv()` returns an unset list
unchanged, and case 7 asserts it: `effectiveHostCsv(null, rows) === null`. A
device with no approvals receives byte-identical config to before this change —
which is every device that exists today.

## Not covered here

- No console screen: approving is an HTTP call until the device screen lands.
- The routes themselves were syntax-checked (`node --check`) but not executed —
  express and better-sqlite3 cannot be loaded here. What they call (`approvals.js`,
  the DDL) is covered above.
- `IdentifyDevice` and `/kiosk-launcher/:code` (§2★ז) still unbuilt, so a typed
  code does not yet resolve on a device.
- Not deployed — Railway still runs the previous build.
