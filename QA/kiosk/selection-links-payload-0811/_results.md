# §2★ה — the selection screen's second list reaches the device

`node QA/kiosk/selection-links-payload-0811/verify.mjs` → **16/16**
`cd apps/35-kioskfleet/server && node --test "test/*.test.mjs"` → **145/146**
(146 tests, up from 138: 4 new in `identify.test.mjs`, 4 in `launcher.test.mjs`.
The one failure is `routing.test.mjs`, the documented baseline — it imports
express, which is not installed in this checkout.)

## What was wrong

§2★ה gives the person at the device two things to choose from: another
"מזהה לקוח", and another **קישור**. The link half landed this morning — the
`device_links` table, `linkapprovals.js`, the console picker — so an owner could
tick "this tablet may also open the evening menu", and the row was written.

Nothing could then read it. `identify()` (the device's own screen) and
`launcherProfile()` (the browser page a hall code opens) both answered with
`clients` alone. An approved link was write-only.

Worse than absent: `identify()`'s `allowedHost` was built by
`configHostCsv(effectiveHostCsv(device, clients), shown)` — three widenings
existed and it composed two of them. `deviceConfigHostCsv()` had been introduced
precisely because that expression was being written out at four call sites and a
copy that dropped one widening fails nowhere a developer can see it. This was
the fifth call site, and it was already the stale copy.

## What changed

| file | change |
| --- | --- |
| `src/identify.js` | 4th argument `approvedLinkRows`; `profile.links`; `withLinkHosts()` in the allow-list |
| `src/launcher.js` | 3rd argument `approvedLinkRows`; `profile.links`; same widening |
| `src/linkapprovals.js` | `approvedLinkTarget()` now requires the row to carry a `url` |
| `src/routes/agent.js` | `POST /identify` passes `approvedLinksForDevice(db, device.id)` |
| `src/routes/launcher.js` | `/resolve` passes the links; `/open` accepts `linkId` |

Both new arguments are last and optional, so the existing tests call the old
shape and still pass — the widening is a no-op on `undefined`, which is what
"nothing approved" already meant.

## Decisions

**A link is picked, never typed.** `typedCode` still resolves against clients
only, and it must: `links` has no code column, and inventing a match on name or
id would turn a list that is deliberately open (its addresses are on the screen)
into a credential. Asserted directly — typing `1` and typing `תפריט הערב` are
both `unknown_code`.

**Both payloads widen the allow-list, and only widen.** The device enforces its
list locally and offline, so a link offered on the selection screen whose host
never arrived renders the device's own blocked page — in a hall that reads as a
broken kiosk rather than as a policy. The empty case is still left exactly alone:
`hostAllowed()` treats an unset list as "no lock configured", so seeding it here
would create a lock on a device that had none and cut it off from the page it is
showing right now. Device 2 in the fixture exists for that assertion.

**`/open` refuses a body naming both ids** rather than picking one. The two
lists are separate approvals; resolving by precedence would make which page
opens depend on an order nobody stated. Neither is the same 400 — the page has a
bug either way, and 404 would say "not approved", which is a different and wrong
answer.

**`approvedLinkTarget()` now requires `row.url`.** Ids are unique per table, so
client 1 and link 1 both exist; handed the *clients* list it used to find a row
by id and read `url` off something that stores `site_url`, returning a target
with no address — a lock onto `undefined`. It only ever fires on a mixed list,
and now it fires closed. `launcherTarget()` was already safe the other way: it
requires `active`, and a link row has no such column.

**The launcher's withholding did not need to change.** `selectableLinks()`
already answers with name and address only. A client's `code` is withheld
because staff type it on the device's keypad; a link's address *is* what is
being offered, and there is no second secret behind it.

## Verification

`verify.mjs` replays all three routes' own sequence — express is rewritten, every
decision is taken by the real module — against the production DDL on
`node:sqlite`, with two devices (one locked, one with no `allowed_host`), an
active client, a disabled client, an approved link, an un-approved link of the
same owner, and a link belonging to someone else. The last three cases read
`routes/agent.js` and `routes/launcher.js` off disk and assert the calls this
replay claims are in them, so it cannot drift from the routes it stands in for.

## Not done here

The launcher page (`public/kiosk-launcher.html`) still renders one list, so
`links` arrives in its payload and is not drawn yet — that is the next step, and
it is `public/` only. `KioskActivity` needs an Android toolchain this checkout
does not have.

**Not deployed.** The Railway service builds from `l023131500-ops/zol`, not from
this tree — see the standing note in `apps/35-kioskfleet/STATUS.md`.
