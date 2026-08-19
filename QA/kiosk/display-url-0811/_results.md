# §2★א — "אתר ראשי" + "קישור שיוצג על המכשיר" (server half) — 11/08/2026

## Unit suite
`cd apps/35-kioskfleet/server && node --test "test/*.test.mjs"` → **70/71**.

- 9 new cases in `test/displayurl.test.mjs` (empty→NULL, identical-to-home→NULL,
  junk and `javascript:`/`data:` refused, fallback, allow-list widening, unset
  list stays unset, and the `ALTER TABLE` replayed against three pre-existing
  devices).
- 2 new cases in `test/identify.test.mjs` — the device's own link on the
  selection screen, and a typed client code still winning over it.
- `test/devicepayload.test.mjs` — its copy of the `devices` DDL now carries
  `display_url`, so "every devices column is either forwarded or a reviewed
  exclusion" is the test that would have caught the new column being invisible
  in the console.
- The one failure is `test/routing.test.mjs`, unchanged and pre-existing:
  `Cannot find package 'express'` — `server/node_modules` is not in this
  checkout.

## The route, replayed
`node QA/kiosk/display-url-0811/verify.mjs` → **18/18**.

The express glue of `PATCH /devices/:id` is rewritten in the script; the storage
is the production DDL on `node:sqlite` and every decision comes from the real
`displayurl.js` / `approvals.js` / `identify.js`. It asserts the stored column
*and* the `update_config` payload the device is handed, plus that `identify()`
answers the same link the push carried.

Covered: a save that never mentions the field; storing a second link without
moving the lock; `''` clearing it (the case `COALESCE` cannot express, which is
why it is a second statement); both fields submitted with one address collapsing
to NULL; a non-URL and a `javascript:` URL refused with nothing written; and a
device with no allow-list still having none afterwards.

## Not covered here
No console UI yet — the two fields are the next step, so today the second field
is reachable only through the API. The Android agent ignores `config.displayUrl`
and still opens `homeUrl`; it is sent alongside rather than instead of it for
exactly that reason. Not deployed — Railway still runs the previous build.
