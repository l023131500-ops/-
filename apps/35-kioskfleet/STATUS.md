# #35 KioskFleet — build status

Live at `more30.com/kiosk` (beta). The upgrade being built is specified in
`KIOSK_BUILD.md`, and **§2★ overrides everything else in that file**.

The source under this directory is gitignored (`/apps/**`); only `app.json` and
this file are committed. So changes to the app are recorded here.

## Shape of the thing

| | |
|---|---|
| Server | Node 20 + Express + SQLite (`better-sqlite3`), realtime over `ws`, served under `BASE_PATH=/kiosk` |
| Console | static `server/public/` — no build step |
| Agent | Android Device Owner app in `android/` (Lock Task Mode, `BOOT_COMPLETED` re-lock) |
| Hosting | Railway; `more30.com/kiosk` is a portal rewrite, and the socket dials `kiosk.more30.com` directly because a Vercel rewrite answers a WS upgrade with 404 |
| Tests | `npm test` → `server/test/*.test.mjs`, node's own runner |

`server/node_modules` is not present in this checkout, so anything that imports
`better-sqlite3` or `express` cannot be executed here. The test files are written
to that constraint: they import only dependency-free modules (`hosts.js`,
`wspath.js`, `clientcode.js`) and rebuild the express app themselves.

## Changes made

- **client registry (§2★ד)** — the "מזהה לקוח" model had no storage at all: a
  device could be locked to one URL, and the two-tier case the spec is built
  around (our customer registers *their* clients; staff type a client's code and
  that client's brand site comes up) had nowhere to live. Added:
  - `server/src/clientcode.js` — the canonical form of a code. The owner types
    it on a keyboard and staff type it on a keypad, so `1234`, ` 1234 `,
    `#1234` and `12-34` have to be one code; they are. Ambiguous glyphs are
    handled by never *generating* `I O 0 1`, not by folding them, because
    folding would merge two codes the owner sees as distinct.
  - `clients` table — `UNIQUE(owner_id, code)`. Codes are each owner's own
    numbering, so two owners may both use `1`; within one owner the database
    refuses the duplicate, not just the route, because two console tabs racing
    would otherwise leave one code resolving to two sites.
  - `server/src/routes/clients.js` — owner-scoped CRUD at `/api/clients`. Site
    hosts go through the same `hostsForUrl`/`normalizeHostCsv` funnel the device
    allow-list uses; a pasted `https://x.com/page` matches no host on the device
    and must never reach storage as one.

  Verified in `QA/kiosk/clients-registry-0811/` — 6 unit tests, plus the DDL
  executed against `node:sqlite` to prove the constraint and the cascade.

- **registry console screen (§2★ד)** — the table above had no surface, so the
  only way to register a client was an HTTP call. Added `מזהי לקוח` to the
  console sidebar (`public/console.html`, `public/js/app.js`):
  - add / edit / disable / delete, against `/api/clients`. The generated code is
    read back in the toast, because whoever adds the client is the one who has to
    hand that code to the staff standing at the device.
  - the allow-list uses the same `hostListEditor` the device screen uses, so a
    pasted checkout URL becomes a bare host here too. In the edit dialog the
    client's own host is pinned — and when the site URL is changed, the *previous*
    host is dropped rather than left on the list, so moving a client to a new site
    does not quietly leave the old one open on the device.
  - disabling is offered next to deleting: a disabled client keeps its code
    reserved, so the code cannot be handed to a different business and still
    resolve to the site the first one used.

  Verified in `QA/kiosk/clients-console-0811/` — ten cases driven in a real
  browser against a dependency-free stub of `/api/clients` that imports the real
  `hosts.js`/`clientcode.js`, plus light and dark screenshots. A layout bug found
  there (the last column of buttons was cut off the edge of the card) is fixed.

  **Not deployed** — the Railway service still serves the previous console.

- **per-device approval (§2★ה)** — every client an owner registered was reachable
  from every device they own, so a tablet in one hall was a directory of the
  whole chain. §2★ה says the selection screen offers *only* what management
  approved for that device. Added:
  - `device_clients` — `PRIMARY KEY (device_id, client_id)`, cascading from both
    sides. **Absence of a row is a "no"**: a device with no rows offers nothing
    rather than everything, which is the opposite of how the host allow-list
    treats an empty list, and deliberately so.
  - `server/src/approvals.js` — the join plus the rules, kept free of express and
    better-sqlite3 so the tests can run here. `resolveClientCode` gives the same
    `null` for not-approved, disabled and never-registered: any other answer
    makes the keypad a probe for which businesses are in the chain.
  - `GET`/`PUT /api/devices/:id/clients` — owner-scoped, replaces the set in one
    transaction (a half-applied revocation leaves a client reachable on a device
    the owner believes they removed it from), then pushes `update_config`.
  - the allow-list pushed to the device — on heartbeat, on `PATCH`, and on
    approval — is now widened to cover the approved clients' sites, or selecting
    one lands on a blocked page. An **unset** list is left unset: it means "no
    lock configured" to `hostAllowed()`, so merging into it would create a lock
    and cut a live device off from what it is showing. Every device that exists
    today has no approvals and receives byte-identical config.

  Verified in `QA/kiosk/device-approvals-0811/` — 7 cases, the storage half
  against `node:sqlite` with the same DDL text. 20/20 green across the runnable
  suite.

  **Not deployed.** No console screen yet — approving is an HTTP call.

- **IdentifyDevice (§2★ז)** — the registry and the approvals had built everything
  the device screen needs and left none of it reachable *from* the device:
  `resolveClientCode()` sat with nothing calling it, so a code an owner generated
  in the console could be printed and handed to a hall, and the keypad had no
  route to redeem it against. Added:
  - `server/src/identify.js` — profile + active context + ready links, the shape
    §2★ז names. `kioskUrl` is the "אתר ראשי" that locks the device; `displayUrl`
    is what it shows now. They differ only while a code is selected, and nothing
    is stored: idle-return and reboot go back to the venue's own site rather than
    to whichever client was last pulled up.
  - resolution happens **inside** `identify()`, against the rows the caller
    passes. A route that accepted a client id and trusted it would let anyone at
    the keypad open a business the device was never approved for — the exact hole
    §2★ה exists to close.
  - `POST /api/agent/identify` — device-token auth, no dashboard session. POST
    rather than GET because the typed code is a secret staff hold and a query
    string lands in access logs. An optional `serial` narrows but never
    authorises: it is printed on the case. A mismatch is refused (409) so a
    copied token on other hardware is not handed this device's clients.
  - unknown, disabled, and belonging-to-another-device all give one 404, and the
    attempt is logged — a burst of them is the only signal that someone standing
    at the device is guessing codes.

  Verified in `QA/kiosk/identify-0811/` — 7 unit cases against `node:sqlite`
  (27/27 green across the runnable suite) plus six calls over a real socket
  against a dependency-free stub that imports the real `approvals.js` /
  `identify.js`.

  **Not deployed.** The Android agent does not call it yet — `KioskActivity`
  still opens `home_url` only.

- **the approvals picker (§2★ה, console side)** — `PUT /api/devices/:id/clients`
  had no surface, so approving a client for a device was an HTTP call. Added
  **🆔 מזהי לקוח** to each device card (`public/js/app.js`): the owner's registry
  as a checkbox list, `סמן הכל` / `נקה הכל`, a live `n מתוך m מאושרים` counter.
  - a **disabled** client that is already approved is shown *checked*, not
    dropped. The server stores it happily; un-approving it silently here would
    mean re-enabling the client no longer brings it back to this device.
  - the hint under the list depends on the device: with an allow-list it says the
    approved clients' domains are added to it, and with **no** list it says the
    device blocks nothing and approving does not change that. Both are what
    `effectiveHostCsv` actually does, and "האתר חסום" in a hall reads as a broken
    kiosk.
  - an empty registry gets no save button — just a route to the registry screen.
  - saving nothing is a legitimate save and says so (`לא אושר למכשיר אף מזהה
    לקוח`), because absence of a row is a "no" here, not a no-op.

  Verified in `QA/kiosk/device-clients-console-0811/` — 10 cases in a real
  browser against a stub that imports the real `approvals.js`, asserting both the
  stored set and the `update_config` that follows it, plus light/dark
  screenshots.

  **Not deployed.**

- **the device's own access code (§2★ז)** — §2★ז names three things; two existed
  (`identify`, and the launcher page still to come) and the third, "לכל מכשיר קוד
  קצר לשיוך מהיר", had no representation at all. The launcher cannot be built
  without it: the person at the device types a **device** code, on hardware
  holding no device token, and there was no column for it and nothing to resolve
  it against. Added `server/src/accesscode.js` + `devices.access_code`:
  - it is not the "מזהה לקוח" of `clientcode.js`. That one is redeemed *inside*
    an already-authenticated device and only picks which approved business comes
    up; this one identifies the device to an unauthenticated caller. Hence:
    **globally unique** (the launcher has no session to scope by, so two owners
    sharing a code would resolve one to the other's device), **generated, never
    chosen** (32⁶ ≈ 1.07e9; an owner picking would pick 1234), and
    **re-issuable** — it ends up printed on a card beside a tablet, so leaking is
    its normal end state and `POST /devices/:id/access-code` replaces it.
  - the four ambiguous glyphs are excluded from *generation* rather than folded
    on input. No real code can hold `0 1 I O`, so a typed one is honestly "no
    such code"; folding would have to guess whether `1` meant L or I, and a wrong
    guess opens a device that is not the caller's.
  - collisions are resolved by the UNIQUE index, not by a SELECT first — two
    devices enrolling in the same second would both find a code free and both
    store it, leaving the launcher with a code naming two devices.
  - the index is created *after* the `ALTER`, not in the `CREATE TABLE` block:
    SQLite refuses `ADD COLUMN ... UNIQUE`, and an index declared up there names
    a column the existing database file does not have and takes the boot down.

  Verified in `QA/kiosk/device-access-code-0811/` — 8 unit cases (35/36 across
  the suite; `routing.test.mjs` imports express and cannot run here, unchanged),
  plus a replay of the migration against `node:sqlite` proving 3 existing devices
  get unique codes with `home_url`/`allowed_host` untouched and a second boot a
  no-op.

  **Not deployed.** No console UI yet — the code is in the API payload only.

- **the access code, on screen (§2★ז, console side)** — the code was in the
  database and in the API payload and nowhere a person could see it, which makes
  it useless: it exists to be read off this screen by the owner and typed by
  whoever is standing at the device. Added to `public/js/app.js`:
  - the code on the **device card**, in full. Masking it would defeat the one
    thing it is for, and the card is already behind the owner's own session. A
    device that has none — an owner whose server has not restarted since the
    column landed — says `טרם הונפק` rather than showing a blank field, because
    a blank reads as a bug and `—` reads as "no code exists" when one does.
  - a **🔑 קוד גישה** dialog: the code large enough to read across a room, a
    copy button, and re-issue.
  - re-issuing asks first, **inline** rather than in a second modal — the code
    is taped to a wall next to a tablet, so replacing it strands whoever is
    standing there; but a second modal over this one would hide the code being
    replaced. On success the card updates too, so the owner does not read the
    old code off the list a second later.
  - `mapDevice` takes `access_code` and `accessCode` both: the REST payload is
    `publicDevice()`'s camelCase and a `device_update` over the socket is the
    raw row, and the card is rendered from either.

  Verified in `QA/kiosk/access-code-console-0811/` — 10 cases in a real browser
  against a stub whose storage is the real `accesscode.js` on `node:sqlite` with
  the production DDL, plus light/dark screenshots. The copy button is the one
  thing not driven there (headless clipboard permissions); noted in the results.

  **Not deployed.**

## Next, in order

1. Deploy: the registry (API + screen), the approvals (API + picker) and
   `identify` are only on disk and in this file.
2. §2★א's two fields — "אתר ראשי" and "קישור שיוצג על המכשיר" — on the device
   screen, feeding the same registry.
3. The selection screen on the device (§2★ה/ו): `KioskActivity` calls
   `identify`, offers the approved list, and locks onto what is chosen.
4. `/kiosk-launcher/:code` — the access code exists, resolves, and is now
   readable in the console; what is missing is the page that takes it, shows the
   approved list, and opens the locked kiosk. It needs a rate limiter: six
   characters is guessable given unlimited attempts.
5. The "הפעל" wizard with the live checklist (§2★ב).
6. `notifyConsolesOfDevice()` sends the **raw device row** over the console
   socket, which carries `device_token` — the agent's long-lived secret, and the
   one field `publicDevice()` exists to strip. Only the owner and admins receive
   it, so nothing is exposed to a stranger today, but a console XSS or a browser
   extension reading it can impersonate the device. It is a one-line fix in
   `hub.js`; it is listed here rather than folded into a UI step because it is an
   auth change and deserves its own test.
