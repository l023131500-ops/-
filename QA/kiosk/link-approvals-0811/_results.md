# QA — per-device link approval (KIOSK_BUILD §2★ה, second half), storage half

11/08/2026. Kiosk #35, `apps/35-kioskfleet/server`.

## What was missing

§2★ה gives the person standing at the device exactly two moves from the
selection screen, both bounded by what management approved **for that device**:
pick another `מזהה לקוח`, and pick another **קישור**. §2★ז repeats it in the
launcher's words — the screen shows `כל הפריטים המאושרים (מזהי-לקוח/קישורים)`.

The first half has been built for a while (`device_clients`, `approvals.js`,
the console picker, the launcher list). The second had **nothing**: `links` is
an owner-wide library with no per-device relation at all, so the only two
addresses a device could ever open were its own `home_url` and an approved
client's site. An owner running four halls off one library could not put hall
B's link on hall B's tablet without editing the main site — which is the field
that locks the whole device.

## What landed

- `device_links` in `src/db.js` — `PRIMARY KEY (device_id, link_id)`, cascading
  from both sides, plus `idx_device_links_link` for the reverse lookup.
  Absence of a row is a "no", the same as `device_clients`.
- `src/linkapprovals.js` — `approvedLinksForDevice`, `selectableLinks`,
  `approvedLinkTarget`, `withLinkHosts`.

A separate table rather than a column on `device_clients`, because a link is
not a client: no code to type on a keypad, no `active` flag, and it belongs to
the owner's library rather than to a business they serve. Folding them together
would put a nullable code and a meaningless active column on half the rows.

`approvalSelection()` from `approvals.js` is **reused, not copied** — it filters
ids against an owner's own set and knows nothing about clients. A second copy
would be the same eight lines free to drift from the one under test.

`withLinkHosts()` composes with `effectiveHostCsv()` instead of extending it,
and the reason is measured in the run: `effectiveHostCsv` filters rows on
`Number(r.active) === 1`, and a link row has no `active`, so feeding links
through it silently drops every one of them (asserted). Both follow the same
two rules — an unset list stays unset (seeding it would *create* a lock on a
device that had none), and a link's host is derived from its own address as
well as its stored extras, so choosing an approved link can never land on the
device's blocked page.

## How it was verified

**`server/test/linkapprovals.test.mjs` — 9 cases**, the storage half against
`node:sqlite` with a copy of the DDL: the PK, both cascades, name ordering,
the owner filter, the offer payload's exact keys, id resolution against *this
device's* rows, host widening, and the two widenings composing.

```
134/135  node --test "test/*.test.mjs"      (125/126 before — the 9 are the whole difference)
```

The one failure is `routing.test.mjs`, which imports express: `server/node_modules`
is not present in this checkout. That is the documented baseline, unchanged.

**`run.mjs` — 11 assertions**, the boot migration replayed against a database
shaped like the live Railway volume. The DDL is **read out of `src/db.js`**
rather than copied, so this cannot pass against a text the server does not run:

```
11/11 assertions passed        (_results.json)
```

- the "before" database is the same extracted text with the new block stripped,
  and the strip is asserted to have actually removed something
- two devices, two links, one client and one existing approval all survive the
  boot byte-identical
- duplicate refused by the PK; deleting a link clears it off every device;
  deleting a device clears its approvals
- a second boot adds nothing and loses nothing

## Found and **not** fixed, so it is not silently claimed

- **The foreign key does not enforce ownership**, and the run asserts that
  rather than assuming it: approving another customer's link id succeeds at the
  database. The only thing standing there is `approvalSelection()` in the route
  — which does not exist yet. It is the first thing the wiring step must call.

## Not wired, and not deployed

Nothing imports `linkapprovals.js` yet — this is the storage half, the same
split `setupprogress.js` and `display_url` used. Still to come, in order:

1. `GET`/`PUT /api/devices/:id/links` in `routes/devices.js`, with the
   `update_config` push widened through `withLinkHosts()`.
2. the console picker on the device card, beside `🆔 מזהי לקוח`.
3. the launcher page and `identify()` offering the approved links alongside the
   approved clients — which is the point of the whole chain.

**Not deployed.** The Railway service builds from another repo (`l023131500-ops/zol`),
so nothing here is live until that sync happens — item 1 of `STATUS.md`'s
"Next, in order".
