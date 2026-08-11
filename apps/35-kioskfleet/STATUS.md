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

- **the console socket stopped carrying the agent's secret** —
  `notifyConsolesOfDevice()` fanned out `{ ...device, ...payload }` where
  `device` is a raw `SELECT * FROM devices` row, and that row holds
  `device_token`: the agent's long-lived secret, sufficient on its own at
  `/ws/agent?token=…`, and the one field `publicDevice()` exists to strip. The
  socket path never went through it. Added `server/src/devicepayload.js`:
  - `consoleDevice(device, payload)` — an **allow-list** of the 18 fields a
    console may receive, applied *after* the merge so an override cannot
    reintroduce a stripped field. `hub.js` calls it once per notify, covering
    all seven call sites.
  - allow-list rather than `delete device_token`, because a deny-list is right
    exactly once: the next secret column added to `devices` would ship to every
    open console until someone remembered to extend it, and nothing fails when
    they don't. The test asserts the dropped set is exactly `['device_token']`
    against a real `SELECT *`, so a new column fails it until reviewed.
  - absent keys stay absent instead of becoming `undefined`. The console applies
    updates as `{ ...DEVICES[i], ...mapDevice(m.device) }`, so an `undefined`
    value overwrites a good one — a status frame would have erased the device's
    name off the card.
  - the frame keeps the row's snake_case. `mapDevice()` reads both shapes on
    purpose, and converting here would ride a second change along with an auth
    fix.

  Verified in `QA/kiosk/console-socket-token-0811/` — 8 unit cases against the
  production DDL on `node:sqlite` (43/44 across the suite; `routing.test.mjs`
  imports express and still cannot run here), plus the real console in a browser
  against a stub whose `/ws/console` is a hand-rolled RFC6455 handshake pushing
  a frame built by the real `consoleDevice()` from a row holding a real token.
  The token appears in no frame, nowhere in the DOM, and nowhere in the
  console's in-memory `DEVICES`; the card still updates from the frame.

  **Not deployed.** Until the Railway service is rebuilt, the live console still
  receives the raw row.

- **the launcher's API + its rate limiter (§2★ז)** — every other credential in
  the service is either 40 characters (`device_token`) or only redeemable from
  inside an already-authenticated device (`clientcode.js`). The device access
  code is neither: six characters, typed by an unauthenticated caller over the
  open internet. 1.07e9 codes is a lot to a person and nothing to a script — at
  50 req/s the whole space falls inside eight months, and any one owner's
  handful of devices far sooner. So the limiter landed with the route rather
  than after it. Added:
  - `server/src/ratelimit.js` — a sliding-window failure counter with a lockout,
    ten failures per ten minutes then fifteen minutes refused. **Failures are
    counted and a success clears the bucket**: the person at the tablet types one
    code and never accumulates, so the whole budget is spent on the script.
    **Keyed by caller, not by code** — an attacker varies the code and holds the
    address, so keying by code would count one guess against each of a billion
    buckets and limit nothing. The map is pruned and capped: rotating the source
    address is free on IPv6, and an unbounded map turns the endpoint that
    protects the code into the one that takes the service down.
  - the lockout fires **on** the attempt that spends the budget, not on the next
    one — otherwise every window hands out one free guess, and it arrives as a
    404 rather than a 429. The failures are cleared with the lockout, or the
    caller re-locks the moment it lapses and the first lockout is permanent.
  - `server/src/launcher.js` — an allow-list payload, in the spirit of
    `devicepayload.js` but built for the weaker credential. No `device_token`
    (it would make a card taped to a wall equal to the device), no serial, and
    **no client codes**: a "מזהה לקוח" is a secret the staff hold, so listing
    them would turn one leaked device code into every client code in that hall.
    The businesses are offered by name and the chosen one is opened.
  - `POST /api/launcher/resolve` and `/open` (`server/src/routes/launcher.js`,
    mounted in `index.js`) — the only unauthenticated router here. POST though
    they read nothing: the code is the whole credential and a query string lands
    in access logs, in history, and in the Referer of the next request. Wrong
    length, no such device and not-approved all give one 404.
  - `clientId` is resolved against *this device's* approvals rather than
    trusted, or holding one device's code would open any business in the chain —
    §2★ה's hole, re-opened one layer up.

  Verified in `QA/kiosk/launcher-api-0811/` — 16 new unit cases (59/60 across
  the suite; `routing.test.mjs` imports express and still cannot run here), plus
  16 calls over a real socket against a stub that rewrites only the express glue
  and imports the real `accesscode.js`/`approvals.js`/`launcher.js`/
  `ratelimit.js` over the production DDL on `node:sqlite`.

  **Not deployed**, and no page yet — the launcher screen is the next step.

- **the launcher page (§2★ז)** — the API above had no screen, so the URL the spec
  names resolved to a 404 and the only way to redeem a device code was `curl`.
  Added `server/public/kiosk-launcher.html` and the `/kiosk-launcher/:code?`
  route in `index.js`:
  - **one page, both forms.** `/kiosk-launcher` asks for the code;
    `/kiosk-launcher/A7K2M9` — the printed-card / QR form the spec names —
    prefills it and resolves on load. The route never reads `:code`; the client
    pulls it out of `location.pathname` and POSTs it, because a path parameter
    read server-side is a credential in the access log of every proxy in front
    of the service.
  - **everything is inline** — the one page here where that is true. The
    console's `css/style.css` is document-relative, which is what lets it work
    at `/` and at `/kiosk/` both; this page is served at two *depths*, so the
    same href resolves to `/kiosk/kiosk-launcher/css/style.css` on the form with
    a code in it. An unstyled code box on a tablet in a hall is
    indistinguishable from a broken kiosk, and nothing 404s loudly enough for
    anyone to notice. The shared more30 login pill is left off for the same
    class of reason: the caller is staff holding a code, not a signed-in
    customer, and the pill is fixed over this page's own controls.
  - a typed code is **never written into the URL**, and one that arrived *in* the
    URL is scrubbed out when the person taps `הזנת קוד אחר` — that tap means
    "wrong device", and leaving the code in the address bar puts one hall's
    credential on the next hall's tablet and silently restores it on reload.
  - the chosen business is opened from `/open`'s answer, not from the URL already
    rendered in the list: the id is re-checked there against *this device's*
    approvals, so a page left open across an un-approval cannot still open it.
  - `client_code`s are never rendered — the businesses are offered by name, which
    is the whole reason `launcher.js` leaves them out of the payload.
  - a device with **no** approvals gets the venue button plus a sentence saying
    so. Absence of an approval is a "no", so that state is correct and common;
    an empty card would read as a failed load.

  Verified in `QA/kiosk/launcher-page-0811/` — 16 cases in a real browser
  against a stub that rewrites only the express glue and imports the real
  `accesscode.js` / `approvals.js` / `launcher.js` / `ratelimit.js` over the
  production DDL on `node:sqlite`, driven at **both** mounts (`/kiosk/…` and the
  un-prefixed one). 59/60 across the suite; `routing.test.mjs` still needs
  express. Five screenshots.

  Two defects were found in that run and fixed: the fifteen-minute lockout was
  counting down in seconds (`נסו שוב בעוד 900 שניות`), and it gave no reason at
  all — a dead button with a timer on it, which reads as a fault rather than as
  a rate limiter doing its job.

  **Not deployed.** `more30.com/kiosk/kiosk-launcher` is a 404 until the Railway
  service is rebuilt. The "locked kiosk" here is a plain navigation — the real
  lock is Lock Task Mode in the Android agent, which still does not call
  `identify`.

- **the second of §2★א's two fields (server half)** — §2★א asks for two fields,
  one under the other: "אתר ראשי", the link that is right for the whole fleet and
  the one the device locks onto, and "קישור שיוצג על המכשיר", what *this* device
  shows. There was one column doing both jobs, so they could not differ: pointing
  one tablet at a sub-page meant editing the field that defines what every device
  locks to, and `identify()` had nothing to answer with but `home_url` twice.
  Added `devices.display_url` and `server/src/displayurl.js`:
  - **empty is stored as NULL, not as a copy of `home_url`.** The main site is
    the fleet-wide default, so a device that was never given its own link has to
    move when the owner changes it. A copy looks identical the day it is written
    and pins that device to the old address forever after — drift nobody finds
    until a tablet in a hall is showing last season's page. A display link typed
    identical to the main site collapses to NULL for the same reason, checked
    against the main site as it will be *after* the same save.
  - **it is not a lock.** `kioskUrl` stays `home_url` in every answer; this moves
    only what is on screen, which is what lets idle-return and a reboot go back
    to the venue's own page. A code typed at the keypad still wins over it:
    standing configuration loses to a choice someone just made, and returning to
    the selection screen brings the device's own link back.
  - the pushed allow-list is widened to cover it (`configHostCsv`), or the device
    renders its own blocked page — a broken kiosk, as read in a hall. An **unset**
    list stays unset, the same rule `effectiveHostCsv` follows: seeding it would
    create a lock on a device that had none.
  - only `http(s)` is accepted. The value is loaded in the kiosk webview, so a
    `javascript:` or `data:` URL here is script running in the one browser on the
    device that is supposed to run nothing.
  - `''` is storable, which `COALESCE` cannot express — hence the second UPDATE
    statement. Presence of the key, not truthiness, is what makes it a clear.
  - `display_url` is named in `CONSOLE_DEVICE_FIELDS`, so the console sees it;
    the allow-list test is what would have caught it being invisible.
  - the migration is `NULL` on every existing row, which *is* the correct
    value — it means "show the main site", which is what every device did before
    the column existed.

  Verified in `QA/kiosk/display-url-0811/` — 11 new unit cases (70/71 across the
  suite; `routing.test.mjs` still needs express) plus 18 assertions replaying the
  real `PATCH /devices/:id` against the production DDL on `node:sqlite`, on both
  the stored column and the `update_config` the device is handed.

  **Not deployed**, and no console UI yet: the field is reachable only through
  the API, and the Android agent still opens `homeUrl` — `displayUrl` is sent
  *alongside* it so an older agent keeps working.

- **the two fields, on the device screen (§2★א, console side)** — the column and
  the API landed above and the console still showed one URL field, so the second
  field was reachable only by hand-writing a PATCH. Added to
  `public/js/app.js`:
  - the edit dialog now has **אתר ראשי** and, under it, **קישור שיוצג על
    המכשיר** — the order and the wording §2★א names. The first field's old label
    was `קישור האירוע/אולם (Home URL)`, which described both jobs back when one
    column did both.
  - `displayUrl` is sent on **every** save, empty included. The server reads it
    by presence (`''` is a clear, and `COALESCE` cannot express that), so
    omitting the key when the field is blank would make clearing it impossible.
  - the hint under the field is recomputed from `hl.value()` rather than written
    once, so an owner who edits the domain list in this same dialog is told
    whether the widening still applies. It describes the state **after** the
    save, which is what the owner is about to cause.
  - the card shows `📺 מוצג במכשיר` only when the device has a link of its own.
    `mapDevice` reads `display_url ?? displayUrl ?? null` — `??` and not `||`,
    because "following the main site" and "given its own link" have to stay
    distinguishable on the card. Both URLs are wrapped `dir="ltr"`: they now sit
    after a Hebrew label on the same line, where bidi would otherwise reorder
    them.

  Verified in `QA/kiosk/display-url-console-0811/` — 9 cases in a real browser
  against a stub that rewrites only the express glue and calls the real
  `displayurl.js`/`approvals.js`/`hosts.js` in the order `routes/devices.js`
  calls them, asserting the stored column *and* the `update_config` pushed, plus
  light/dark screenshots.

  **Not deployed.**

- **the inputs in dark mode** — every field in the console was white-on-white at
  **1.03:1**. `.field input, .field select` declared `background: #fbfcfe` and no
  `color`; an input does not inherit `color`, it takes the browser's `fieldtext`,
  and the `<meta name="color-scheme" content="light dark">` in the head licenses
  a dark-preference browser to make that **white**. So the console's own dark
  theme, which never touched the field background, produced white text on a white
  box — including the two password fields, where nothing on screen tells you what
  you typed. Now 15.13:1. In `css/style.css`:
  - four tokens — `--field-bg`, `--field-bg-focus`, `--field-border`, `--sunken` —
    whose **light values are exactly the hard-coded ones they replace**, so the
    light console is byte-identical apart from the one deliberate change below.
    The dark field is *sunken* under the card (`#0d1626` under `#131c2e`), the way
    `#fbfcfe` sits under `#fff` in light.
  - `color: var(--ink)` on the fields. That is the fix; the rest is theming. Its
    one visible effect in light mode is that the text is now `#0b1220` rather than
    the browser's black (18.24:1 vs 18.72:1) — which is the point: the colour is
    ours in both modes instead of the browser's in one.
  - `color-scheme: light` / `dark` on `:root` / `:root.dark`, so what the browser
    paints itself follows the theme: caret, scrollbar, `select` popup, number
    spinners, and the background Chrome forces onto an autofilled field — the last
    of which no ordinary declaration can reach, and which lands on the login form.
  - `.hl-new`, the new-domain box in `hostListEditor`, was outside `.field` and so
    had no styling at all; it now takes the field's appearance but **not** its
    `width: 100%`, because it is a flex child carrying an inline `flex: 1`.
  - `.hl-row` had a hard-coded `#f7f9fc` under `var(--ink)` text — the domain
    allow-list, the product's core control, was light-on-light in dark mode too.

  Verified in `QA/kiosk/dark-inputs-0811/` — a real Chromium with
  `emulateMedia({colorScheme})`, i.e. the OS preference rather than a class
  toggled by hand, against a stub that serves the **real** `server/public/` and
  cans only the API. The 1.03:1 "before" was re-measured in the same run by
  re-injecting the declaration that was replaced. Eight fields measured dark,
  the light values measured back to their pre-change bytes, three screenshots.
  70/71 on `node --test` — the documented baseline, `routing.test.mjs` still
  needs express.

  Found and **not** fixed here, so it is not silently claimed: the field border is
  1.62:1 against the card (WCAG 1.4.11 wants 3:1) — but light mode is ~1.06:1 and
  always was, so raising it is a console-wide design change and its own step.
  Same for `.btn-danger` at 3.3:1. The light chips (`.hl-tag`, `.code-chip`,
  `.pill`, `.alert-*`, `.btn-light`) stay light inside the dark console; they all
  pass contrast, so that is consistency, not accessibility.

  **Not deployed.**

- **non-text contrast (the two things the step above found and left)** — a field
  border at **1.22:1** is not a subtle border, it is no border: what marks
  "you can type here" disappears for anyone on an uncalibrated screen, in
  daylight, or with less than perfect sight. And `.btn-danger` — every delete
  button in the console, plus the `כן, בצע` that confirms rebooting a device —
  was red-on-pink at **3.08:1**, under the 4.5:1 normal text needs. In
  `css/style.css`:
  - `--field-border` is **no longer `--line`**. `--line` separates surfaces (a
    card edge, a table row), so being a faint hint is right for it; a control's
    border is what defines the control, and WCAG 1.4.11 is about that one. The
    value is chosen against **both** surfaces the border touches — the card
    outside it and the field fill inside it — because a border that vanishes on
    one side has vanished. `#858e9e` light (3.30 / 3.22), `#61708f` dark (3.42 /
    3.64). Every other `--line` use is untouched.
  - `--danger-ink` — the dark red already hard-coded in `.alert-error`. Both it
    and `.btn-danger` now read from it so the two cannot drift apart. `--danger`
    stays the brand's destructive colour: it is right as a *surface* and wrong as
    text, which is the whole bug.

  Verified in `QA/kiosk/nontext-contrast-0811/` — a real Chromium at both
  `colorScheme` values against a stub serving the real `server/public/`, every
  number read from `getComputedStyle`. 14/14 assertions pass and the four
  re-injected "before" rows fail, so the check can fail. The previous step's text
  contrast is re-measured in the same run and has not moved. 70/71 on
  `node --test` — the documented baseline.

  A bug in the harness was found and fixed there: the `.btn-danger` "before"
  measurement first reported the *new* colour, i.e. claimed the bug never
  existed. `.btn` carries `transition: .15s` — all properties, `color` included —
  so a computed read in the injection's own tick returns where the transition
  started.

  Found and **not** fixed, so it is not silently claimed: `.btn-light` and
  `.btn-danger` are light fills on a white card (~1.1:1), so the *button's own*
  boundary still fails 1.4.11. That is every button on every screen, not two
  tokens, and is its own step.

  **Not deployed.**

- **the button's own boundary (the last thing the step above left)** — a
  `.btn-light` is `#eef3ff` on a white card and a `.btn-danger` is `#fee2e2` on
  the same: **1.11:1** and **1.22:1**, and 1.04:1 where the button sits on the
  page rather than on a card. That is not a faint button, it is a button with no
  shape — the only thing saying "this is a control you can press" is the text
  inside it, and WCAG 1.4.11 is about the boundary. It is every cancel, every
  edit, every delete in the console. Two tokens in `css/style.css`:
  - `--btn-light-edge` / `--btn-danger-edge`, one value each rather than a
    light/dark pair, because these two fills are the "light chips stay light"
    decision from the previous step: they **do not invert**. So each ring is
    chosen against *every* surface such a button lands on — white card, dark
    card, `--navy`, the page background in both modes, and the button's own fill
    from the inside. Worst case 3.79 (light) and 3.32 (danger).
  - the button's own **ink** could not be reused as the ring, which was the
    obvious move: `#1f4fd8` is 2.57:1 and `#b91c1c` is 2.63:1 against the dark
    card. They were picked against a light fill and only ever sit on one.
  - the ring is `box-shadow: inset`, not `border`. `.btn` declares
    `border: none`, so a real border grows every button by 2px — and `.btn-sm`
    buttons pack into a row inside a device card, which is exactly where
    `QA/kiosk/clients-console-0811` already found a column of buttons running off
    the card's edge. An inset shadow takes no space and follows the button's
    `border-radius` exactly.

  Verified in `QA/kiosk/button-boundary-0811` — a real Chromium at both
  `colorScheme` values against a stub serving the real `server/public/`, with the
  background measured from **the surface actually painted behind each button**
  (walking up the DOM to the first opaque background) rather than assumed from
  the token: these buttons sit on `.modal`, `.device`, `.card` and the page
  itself, and one quoted value would be right for some and wrong for the rest.
  24/26, the two failures being the "before" rows. 70/71 on `node --test` — the
  documented baseline.

  Two corrections the run itself forced, so the claim is not larger than the
  change: **the defect was light-mode only** — the same light fills on a dark
  card were already their own boundary at 13.9:1 / 16.9:1, and the harness's
  first version wrongly demanded the "before" row fail in both modes. And
  `.btn-primary` was first measured on `✏️ עריכה`, which is a `.btn-light`; read
  from the real primary it is 5.28 / 3.22 and genuinely needed nothing.

  Found and **not** fixed: the ring is a `box-shadow`, which Windows
  high-contrast mode does not paint. Every one of these is a real `<button>`, so
  the UA supplies `ButtonBorder` there — sufficient in practice, but not measured
  in this run.

  **Not deployed.**

- **the install link (§2★א, last line)** — §2★א ends by saying that saving
  produces a **קישור התקנה**, and what the console produced was a six-character
  code. `EnrollActivity` asks for **two** things: a server address and the code.
  The console only ever showed the second, and the first is the one nobody can
  guess — `https://kiosk.more30.com/kiosk`, prefix included, typed on a tablet
  keyboard by whoever is holding the device. One wrong character there surfaces
  as `שגיאת רשת`, which reads as a broken server rather than as a typo. Added
  `server/src/installlink.js`, `public/install.html`, and the
  `/install/:code?` route:
  - the link is built **on the server**, from `PUBLIC_URL`. The console is
    served through the portal rewrite, so `location.origin` there is a hostname
    no device can enroll against — building the link in the browser would look
    right in the console and fail on every device.
  - the base path is part of the address, because `/api/agent` is mounted
    *inside* the prefix (`site.use('/api/agent', …)`, inside `app.use(base,
    site)`). An address without it reaches the portal, and the only symptom is
    an enrollment that never completes.
  - the page **resolves nothing**. It reads the code out of its own URL and
    shows it; the only thing entitled to redeem an enrollment code is the device,
    against `/api/agent/enroll`. So `:code` is never read server-side, the same
    as `/kiosk-launcher/:code` — and everything is inline for the same reason
    too, since this page is also served at two depths.
  - the code is in the URL here **on purpose**, which is the opposite of the
    launcher's rule. A link that the installer has to complete by hand is the
    thing this replaces.
  - a code that is not a code yields `null`, not a half-built URL: the console
    then renders no link. `/install/undefined` would load and show an installer
    a wrong code, which is worse than no link.
  - the steps say what the app actually does, and the error table is the six
    strings `routes/agent.js` really returns. **No download is offered** — no
    APK is hosted anywhere, so the page says where the file comes from instead
    of linking to one that does not exist.

  Verified in `QA/kiosk/install-link-0811/` — 8 unit cases (78/79 across the
  suite; `routing.test.mjs` still imports express), plus a real browser against
  a stub answering on `127.0.0.1` while its `PUBLIC_URL` says
  `kiosk.more30.com` — the production mismatch — driven at both mounts and both
  depths. Three screenshots. A wrapped two-line button in the codes table was
  found there and fixed.

  **Not deployed.**

- **the wizard's checklist (§2★ב, content half)** — §2★ב asks for an אשף התקנה
  behind "הפעל" where every step has a tick box and says exactly *what to tap,
  which button to confirm, and what should appear*. What the console has is
  `viewGuide()`: four paragraphs, no boxes, not tied to a device, and it stops
  at enrollment — it never reaches the part that actually locks the tablet.
  Added `server/src/setupsteps.js`, the ordered list plus the arithmetic, with
  the screen left to its own step:
  - **no QR / `afw#setup` route is offered, and a test asserts it isn't.** Both
    provision by having the device download the DPC from a URL, and no APK of
    this agent is hosted anywhere — `install.html` already says the file comes
    by USB or disk-on-key. A wizard step that cannot complete is worse than a
    longer wizard when the reader is standing at a tablet in a hall. So the one
    Device Owner route offered is `adb dpm set-device-owner`, for **both** of
    §2★ו's tracks.
  - the adb line is **built from the manifest's component**, not quoted, and is
    carried as `command` rather than inside the prose so the wizard can render a
    copy button. A retyped `dpm set-device-owner` that names the wrong component
    fails *after* the device has been factory reset for it.
  - the two tracks are one list with a flag, not two lists. They differ in three
    steps — unknown-sources wording, whether an accounts screen has anything on
    it, and the OEM USB driver — and an unknown track resolves to `generic`,
    which is the safe default: it assumes no Play Store and no Google account,
    so it is merely less specific on a GMS device, where the reverse sends
    someone hunting a menu their device does not have.
  - `no-accounts` is a step with a warning rather than a footnote: Android
    refuses Device Owner while an account exists, and it is the one thing in the
    flow that cannot be fixed afterwards without a factory reset.
  - **no code means an extra first step, not a checklist missing one.** The
    wizard opens from the device card, which is exactly where someone lands when
    a code has expired; dropping the step that needs one leaves a list that
    cannot be completed and does not say why. Same reason the server address
    falls back to the real one — `serverAddress()` is `''` when `PUBLIC_URL` is
    unset, and "הקלידו בדיוק: " is an instruction to type nothing.
  - `checklistProgress()` filters ticked ids against the checklist that exists
    **now**. Progress outlives the list it was recorded against (a step added
    here, a track switched half way), and an unrecognised id must not count
    toward `done` or the wizard shows 12/11 and a completed banner over an
    unfinished install. `nextId` is the first *hole*, not the step after the
    last tick.

  Verified in `QA/kiosk/setup-steps-0811/` — 16 unit cases, 94/95 across the
  suite (`routing.test.mjs` imports express and still cannot run here).

  **Not deployed**, and no screen yet: nothing imports this module — the wizard
  UI and the per-device storage of which boxes are ticked are the next two
  steps.

- **which boxes are ticked (§2★ב, storage half)** — the checklist above stores
  nothing on purpose: it is derived from the enrollment the console already
  holds, so it can never disagree with the device. The one thing it cannot
  derive is how far the installer got, and that had nowhere to live. It has to
  be storage rather than page state because §2★ב's flow runs across two people
  and a reboot — the owner in the console, an installer at the tablet, and steps
  between them that include removing every account and `אתחלו את המכשיר`.
  Progress held in the page dies on the reload the checklist itself asks for.
  Added `server/src/setupprogress.js`, `device_setup_steps`,
  `devices.setup_track`, and four routes under `/api/devices/:id/setup`:
  - **presence of a row is a tick; unticking deletes it.** A boolean column
    would keep a row for every box ever *looked at*, and "unticked" and "never
    reached" are the same state to the wizard — there is nothing for a second
    value to mean.
  - **one box per request, not a whole-set `PUT`** — the opposite of
    `PUT /devices/:id/clients`, deliberately. That is one owner sending a
    configuration complete; this is two people ticking a shared list at once, and
    a whole-set save has whichever tab loaded first wipe the other's ticks. The
    failure is progress running *backwards* while someone watches it. Both
    directions are `INSERT OR IGNORE`/`DELETE`: a double tap on a tablet and a
    retry over a hall's wifi must not be errors the wizard has to explain.
  - ids are validated against **every id the checklist can ever produce**,
    computed from `setupChecklist()` over both tracks × with/without a code
    rather than written out — a written list stops covering a step someone adds
    there, and a missing id is a checkbox that does nothing. Not against the
    caller's current view: `create-code` disappears the moment a code exists,
    possibly generated by the other person in another tab, and a tick that was
    legitimate a second earlier must not be refused. `checklistProgress()`
    already does the contextual filtering on the way out — so a tick for a step
    no longer on the list is **kept** (the code can expire and the step comes
    back with its tick intact) and does not count.
  - an unknown id is a **400, not a silent drop**: the wizard renders its own
    list, so a step the server won't store is a checkbox that appears to work and
    loses the tick on the next load.
  - **switching track keeps the ticks.** The tracks are one list with a flag —
    three steps differ in wording, none in existence — so a step done on one is
    done on the other, and clearing would punish the person who discovers half
    way down that the tablet has no Play Store.
  - `setup_track` has **no default**, and NULL resolves to `generic` through
    `resolveTrack`: it assumes neither a Play Store nor a Google account, so it
    is merely less specific on a GMS device, where defaulting to `gms` sends
    someone hunting menus their tablet does not have.
  - `setup_track` was added to `CONSOLE_DEVICE_FIELDS`. That allow-list exists so
    a new `devices` column fails a test until someone decides; the DDL copy and
    the `dropped` assertion in `devicepayload.test.mjs` moved in the same change,
    so the reviewed exclusion set is still exactly `['device_token']`.

  Verified in `QA/kiosk/setup-progress-0811/` — 12 unit cases (106/107 across the
  suite; `routing.test.mjs` imports express and still cannot run here, and 94/95
  before, so the 12 are the whole difference), plus a 13-assertion replay of the
  boot migration against `node:sqlite` on a database shaped like the live volume:
  both existing rows keep every value, the new column is NULL on both, and a
  second boot adds nothing and loses nothing.

  **Not deployed**, and no screen — nothing in `public/` calls these routes yet.

- **the wizard, on screen (§2★ב)** — the checklist and the ticks both existed and
  neither was reachable: the console still offered `viewGuide()`, four paragraphs
  with no boxes, not tied to a device, stopping at enrollment — i.e. never
  reaching the part that locks the tablet. Added `setupWizard()` in
  `public/js/app.js`, the `.wz-*` block in `css/style.css`, and **🚀 הפעל** as the
  *first* button on every device card:
  - first in the row on purpose. On a device that is not installed yet it is the
    only button there that does anything — the rest send commands to an agent
    that is not running.
  - **the list is never rendered from local state.** Every tick round-trips and
    the answer redraws the boxes, the count, the bar and which step is marked
    next. §2★ב's flow is two people at once — the owner in the console and an
    installer beside the tablet — and the failure that matters is progress
    appearing to run backwards while someone watches. A tick made behind the
    console's back shows up on the next box, which the QA drives directly.
  - a failed tick **puts the box back**. A tick that failed but stayed on screen
    is the worst outcome available here: the next person reads the list as "this
    was done" and the install stops at a step nobody returns to.
  - the copy button for the `adb` line lives inside the step's `<label>`, so it
    calls `preventDefault`/`stopPropagation` — otherwise copying the command
    ticks `set-owner`, and those command steps are exactly the ones that must not
    be ticked early.
  - the track radios say the switch keeps the ticks, because the server keeps
    them deliberately and a switch that *might* wipe an hour of work does not get
    used by the person who needs it — whoever has just discovered the tablet in
    their hands has no Play Store.
  - `התחל מחדש` is confirmed **inline** rather than in a second modal, the same
    shape as re-issuing an access code, and is separate from unticking twelve
    boxes one at a time.
  - `.wz-*` colours were chosen against the surface actually behind them in both
    modes; the progress fill is `#15803d` rather than `--accent-2` (`#22c55e` is
    2.20:1 on the sunken track, under 1.4.11), and the same number is printed as
    text beside the bar.

  Verified in `QA/kiosk/setup-wizard-console-0811/` — 14 cases in a real browser
  against a stub that serves the real `public/` and answers the four setup routes
  through the real `setupsteps.js` / `setupprogress.js` over the production DDL
  on `node:sqlite`, at both `colorScheme` values, plus three screenshots and a
  contrast table. 106/107 on `node --test` — the documented baseline, unchanged
  because this step adds no server code.

  A defect found in that run and fixed: the step's parts were `<span>`s and
  therefore inline, so "what to do", "what should appear" and the warning ran
  together into one paragraph — which is exactly `viewGuide()`, the thing this
  screen exists to replace.

  Found and **not** fixed: the step row's border is `--line` (1.29:1 in dark).
  It separates rows rather than being the control — the control is a real
  checkbox with the UA's own border — but a fully clickable row arguably wants a
  stronger edge, and that is the console-wide `--line` question the earlier
  contrast steps left alone on purpose.

  **The wizard is device-scoped, and it has to be:** `/api/devices/:id/setup`
  needs a device row, and an enrollment code exists *before* any device does. So
  it is not opened from the enrollment toast, which keeps the install link; the
  wizard is reached from the card as soon as the device appears.

  **Not deployed.**

- **the sidebar guide stopped being a second set of instructions** — `viewGuide()`
  behind **📖 הוראות הפעלה** held four paragraphs describing the same install the
  wizard describes, and the two disagreed. It called Device Owner `מומלץ`, where
  the wizard's `set-owner` step says in as many words that without it Home and
  Recents still walk out of the app; it stopped at enrollment, so it never
  reached the lock at all; and being tied to no device it could not name the
  enrollment code, the server address or the track — the three things that make
  the wizard's wording usable by someone standing at a tablet. Of the two, the
  one that cannot be kept is the one that cannot know which device it is talking
  about. So the screen no longer instructs:
  - it says the instructions belong to the device, and **opens them**: one row
    per device with a `🚀 אשף התקנה` button calling the same `setupWizard(d)` the
    card's first button calls. That is a real job — the wizard lives behind a
    button on a device card, and the sidebar is where someone looking for
    instructions goes first.
  - the devices are **fetched**, not read off `DEVICES`: this screen can be the
    first one opened in a session, and a cold cache would render as "no devices"
    — the one state here that sends the reader somewhere else entirely.
  - with no devices it says the wizard is device-scoped and cannot open yet, and
    offers `➕ הוספת מכשיר`. The wizard needs a device row and an enrollment code
    exists before any device does, so this is the honest route rather than a
    disabled button.
  - the three "recommended device settings" went with the paragraphs rather than
    being carried over: `KioskActivity` holds a wake lock **and**
    `FLAG_KEEP_SCREEN_ON`, so `מצב שינה → לעולם לא` is advice to do by hand what
    the app already does, and `KioskPolicy` blocks sideloading, safe boot and
    factory reset once Device Owner is on. What is left is the link to
    `docs/user-guide-he.md`, which is background rather than a second checklist.

  Verified in `QA/kiosk/guide-screen-0811/` — 13 cases in a real browser at both
  `colorScheme` values against a stub serving the real `public/` and answering
  the setup routes through the real `setupsteps.js` / `setupprogress.js` over the
  production DDL on `node:sqlite`, including a second stub instance with an empty
  fleet. Both rows were driven, and a tick made from here is asserted as a row
  against **that** device. Four screenshots. 106/107 on `node --test` — the
  documented baseline, unchanged because this step adds no server code.

  Found and fixed in that run: the sentence naming the card's button ended
  `(🚀 הפעל).`, and the bracket pair wrapped across a line with the brackets on
  the wrong sides of it.

  Found and **not** fixed: nothing in the checklist or in `KioskPolicy` addresses
  **system updates**. `setSystemUpdatePolicy` is not called, so a tablet in a hall
  can still reboot into an OTA on its own schedule; the old guide's advice to
  turn auto-updates off was not carried over because a paragraph on this screen
  is not where that belongs — it is either a wizard step or a policy call.

  **Not deployed.** The live console still serves the four paragraphs.

- **system updates stopped being able to reboot a device mid-event** — the user
  restrictions above block what a *person* can do; the update client is the
  system's own, and nothing addressed it. So a locked tablet with nobody
  attending it could start an OTA at 20:30, hold an install screen for minutes
  and reboot — the one way out of the kiosk that the lock does not cover. It was
  the last thing the guide-screen step found and left. `KioskPolicy` now calls
  `setSystemUpdatePolicy`:
  - **windowed, not postponed.** `createPostponeInstallPolicy()` expires after
    30 days and then installs whenever it likes, which moves the reboot rather
    than scheduling it. `createWindowedInstallPolicy(04:00, 06:00)` keeps
    security patches landing, overnight. 04:00 rather than the more usual 02:00
    because an evening event in a hall routinely runs past 01:00.
  - `clear()` sets the policy to `null`. A decommissioned tablet that still
    refuses to update before 04:00 is a restriction outliving the app that set
    it.
  - the window is **two named constants**, mirrored by `OTA_INSTALL_WINDOW` in
    `server/src/setupsteps.js`, and `verify-lock` — the step that already lists
    what Device Owner blocks — now names it. There is no Kotlin toolchain here,
    so the guard against the checklist quoting an hour the device does not
    honour is a test that **reads `KioskPolicy.kt` off disk**: both constants,
    the call, the `null` clear, the import. It skips where `android/` is not
    alongside `server/`, since the deploy repo builds the server on its own.
  - only **track B** is warned that the OEM's own updater may ignore the policy.
    Saying it on both would read as "this might not work" on a GMS device where
    it does; saying it on neither would promise a generic tablet something the
    platform cannot enforce there.

  Verified in `QA/kiosk/ota-window-0811/` — 4 unit cases (110/111 across the
  suite; `routing.test.mjs` imports express and still cannot run here, and
  106/107 before, so the four are the whole difference), the parity test proved
  able to fail by moving the Kotlin constant to `3 * 60`, plus the real console
  in a browser against the wizard step's existing stub.

  A defect was found there and fixed: `04:00–06:00` is directionally-neutral
  text inside a Hebrew sentence, so it rendered **`06:00–04:00`** — a window
  from the evening to the small hours. The source string, the API response and
  `innerText` are all correct, which is why only the screenshot caught it. The
  range is now wrapped U+2066…U+2069 by `windowLabel()`, and a test counts the
  isolates rather than spot-checking one.

  **Not compiled and not run on a device** — there is no Android toolchain in
  this checkout (`kotlinc`, `gradle`, `java`, `adb` all absent), the same
  constraint that blocks the device-side selection screen below. **Not
  deployed.**

- **the way out of the kiosk (§2★ה/§4, server half)** — §4's first tier is
  already on the device: `KioskActivity` counts five taps in the corner and then
  asks for `Prefs.ADMIN_CODE`. That pref has exactly two references in the whole
  Android tree — declared in `Prefs.kt`, read in `showAdminDialog()` — and
  **nothing writes it**. Not `EnrollActivity`, not `AgentClient`'s config
  handler, not the server, which had no such column. So on every device that
  exists the dialog answers `קוד תחזוקה לא הוגדר`, and the one remaining way out
  of a locked tablet is the remote `unlock` command, which needs the network. A
  device in a hall with no internet — the case §0 requires the lock to survive —
  had **no** way out at all. Added `server/src/exitcode.js` and
  `devices.exit_code`:
  - it is pushed as `adminCode` in **all three** places the agent learns config:
    the enrollment response, the heartbeat config and `update_config`. Enrollment
    is the one that matters most — it is the last moment before the device locks,
    and the first heartbeat may come after it.
  - **unset is sent as `''`, not `null`.** The agent puts config values straight
    into `SharedPreferences`, where a missing key and `''` read the same through
    `Prefs.get()`; `null` would arrive as the string `"null"` and become a
    maintenance code nobody set.
  - **the ends are trimmed and the middle is not.** A trailing space is invisible
    in a console field and unenterable on the device's dialog, and on an offline
    tablet there is no second route in to fix it with. An interior space is part
    of a passphrase somebody chose.
  - obvious codes are refused, by **shape** and not only by a list: `abcdef` and
    `987654` are the same idea as `123456` to whoever is guessing, and a deny
    list cannot enumerate them. Reuse of the launcher **access code** is refused
    too — that one is printed on a card taped beside the tablet, so reusing it
    would put the way out of the kiosk on the wall next to the kiosk.
  - `exit_code` is in `CONSOLE_DEVICE_FIELDS` and `publicDevice()`, unlike
    `device_token`. It is the owner's own code on the owner's own screen, and the
    scenario it exists for is an offline tablet where reading it off the console
    and walking over is the only remaining way in; a write-only field would make
    exactly that case unrecoverable. Holding it lets a person out of the kiosk,
    not impersonate the device.
  - **stored recoverable, not hashed**, and reasoned rather than overlooked: the
    check runs on the device with no network, and what the device compares today
    is the plain value. Hashing needs the Kotlin comparison to change first.
  - setting and clearing get their own event rows, **without the value**.

  Verified in `QA/kiosk/exit-code-0811/` — 11 unit cases (121/122 across the
  suite; `routing.test.mjs` imports express and still cannot run here, and
  110/111 before, so the 11 are the whole difference), including the `ALTER
  TABLE` replayed against `node:sqlite` on a two-device database with every other
  column asserted unmoved, and the PATCH round trip against real storage.

  **The device still ignores the field.** `AgentClient.kt` writes three config
  keys into `Prefs` and `adminCode` is not one of them, so the value travels and
  is dropped. That is a two-line Kotlin edit and it waits for item 2 below rather
  than becoming the third unverified Android change. **No console UI** — the
  field is API-only, the same split `display_url` used. **Not deployed.**

- **the maintenance code, on screen (§2★ה/§4, console side)** — the column, the
  validation and the three config pushes landed above and left the field
  reachable only by hand-writing a PATCH. So on every device that exists the
  corner-tap dialog still answers `קוד תחזוקה לא הוגדר`, and the only way out of a
  locked tablet remains the remote `unlock` command, which needs the network.
  Added `exitCodeDialog()` + `exitCodeState()` in `public/js/app.js` and
  **🚪 קוד יציאה** on every device card:
  - **the code is not printed on the card**, unlike the access code two lines
    above it. The two look alike and are opposites: that one is meant to be
    printed and taped beside the tablet, so leaking is its normal end state, while
    this one is the way *out* of the lock — and a console left open on a desk in
    an office would otherwise show the exit code of the whole fleet at once. The
    card carries the state only, `מוגדר` / `לא הוגדר — אין יציאה מקומית`.
  - it is still **readable on demand**: the dialog prefills the real code. That is
    the entire reason it is stored recoverable rather than hashed (see
    `exitcode.js`) — the scenario it exists for is an offline tablet, where reading
    the code off this screen and walking over is the only remaining route in. A
    write-only field would make exactly that case unrecoverable.
  - **emptying the field is a clear, and it lands on a confirmation** rather than
    being a quiet side effect of a blank input. There is no separate "clear"
    button, so both routes to it are one path. The confirmation says what is lost —
    with no network there is no way in short of a factory reset — and cancelling
    puts the code that was in the field back.
  - errors are shown **inline**, not only as a toast. Every one of the five
    messages `routes/devices.js` returns is an instruction for the next attempt
    (`too short`, `a run`, `the access code taped beside it`), and a toast is gone
    by the time the person has re-read what they typed.
  - saving goes through the ordinary `PATCH /devices/:id`, because that is the one
    path that also issues `update_config`. A code stored here and never pushed is
    a code the device does not have.
  - neither card state is **coloured**. There is no `--ok` token, and `--warn` is
    **1.95:1** on the white card — the `טרם הונפק` line directly above already
    carries that defect, and raising it is a `--warn-ink` change across every
    screen, the same shape as the `--danger-ink` step. So the distinction is
    carried by the words, which have to say it anyway, and by weight; both states
    inherit `.meta`'s `--muted`, measured at 5.49:1.

  Verified in `QA/kiosk/exit-code-console-0811/` — 16 cases in a real browser
  against a stub that rewrites only the express glue and calls the real
  `exitcode.js` over the production DDL on `node:sqlite`, asserting the stored
  column **and** the `update_config` that follows it (`adminCode` is `''` on a
  clear, not `null`). Two screenshots. 121/122 on `node --test` — the documented
  baseline, unchanged because this step adds no server logic.

  Two defects found in that run and fixed, both the same one: `4–32 תווים`
  rendered as `32–4 תווים`, and the server's own `…מתו חוזר (1234, 0000)` put its
  brackets on the wrong sides and split across the line wrap. Digit ranges and
  parenthesised digit lists are directionally neutral inside a Hebrew sentence;
  both are now wrapped U+2066…U+2069, the fix `windowLabel()` already carries.
  Only a screenshot catches this class — the source string and `innerText` are
  both correct.

  **The device still ignores the field**, so this does not yet make a locked
  tablet openable: `AgentClient.kt` writes three config keys into `Prefs` and
  `adminCode` is not one of them. That is item 2 below. **Not deployed.**

- **the warning colour (the thing the last three contrast steps kept deferring)**
  — `--warn` (`#f59e0b`) was **2.15:1** on the white card and 2.00:1 on the page,
  against the 4.5:1 normal text needs, and it was used in exactly five places,
  **all of them text**. Three of the five are the paragraphs that sit above an
  irreversible action: re-issuing an access code taped beside a tablet, clearing
  the exit code — which removes the only way into a locked device with no
  network — and resetting the wizard. Those sentences exist to be read before
  someone presses the red button; at 2.15:1 they are decoration. Added
  `--warn-ink` in `css/style.css`, the same split `--danger`/`--danger-ink`
  already uses, and pointed the five at it:
  - `#b45309` in light, chosen against **both** surfaces such text lands on —
    the card and the modal (5.02:1) and the page background (4.68:1) — because
    two of the five are on a card and three are in a dialog.
  - **the defect was light-mode only**, and dark is therefore left alone:
    `--warn-ink` *is* `--warn` there, because the same amber on the dark card is
    already 7.93:1 and darkening it would take a warning down to 3.39:1. This is
    the second time a contrast step here has turned out to be one-mode; the
    harness's first version assumed both and was corrected by the run.
  - **`--warn` itself is untouched.** It has no surface consumers today, but the
    token that names the brand's amber and the token that is legible as text are
    not the same thing, and collapsing them would leave the next person to write
    an amber background reaching for a dark brown.
  - the doc comment on `exitCodeState()` cited this exact defect as a reason its
    two states are uncoloured. They stay uncoloured — there is still no `--ok`,
    and a pair where only the bad half is coloured reads as an error rather than
    a state — but the comment now says the reason that is still true.

  Verified in `QA/kiosk/warn-ink-0811/` — a real Chromium at both `colorScheme`
  values against a stub serving the real `public/`, with the wizard route
  answered through the real `setupsteps.js` in the shape `routes/devices.js`
  builds, since one of the three warnings lives inside the wizard. All five
  sites were driven to the screen and measured, with the background read from
  **the surface actually painted behind each one** rather than assumed from the
  token. 14/16, the two failures being the light "before" rows. Ten screenshots.
  121/122 on `node --test "test/*.test.mjs"` — the documented baseline,
  unchanged because this step adds no server code.

  Found and **not** fixed: `--line` at 1.29:1 in dark is still the open
  console-wide question the earlier contrast steps left alone, and the wizard
  step's clickable rows are the strongest argument for raising it.

  **Not deployed.**

- **the field the device locks onto was the one nobody checked (§2★א)** —
  `display_url`, §2★א's *second* field, has refused non-http(s) since it landed:
  the value is loaded in the kiosk webview, so a `javascript:` URL there is
  script running in the one browser on the device that is supposed to run
  nothing. `home_url`, the **first** field — what the device locks onto, what
  idle-return and a reboot land on, and what the enrollment response hands a
  device that has nothing else yet — was checked *less*. `PATCH /devices/:id`
  stored it raw, with no parse at all; `POST /enrollments` asked only that
  `new URL()` not throw, and `new URL('javascript:alert(1)')` does not. Added
  `normalizeHomeUrl()` to `src/displayurl.js` — the module that is already "the
  two fields of §2★א" — sharing one `checkWebUrl()` with `normalizeDisplayUrl()`:
  - **empty is neither an error nor a clear.** Absent means "leave the main site
    alone" (the PATCH COALESCEs), and a device with no main site was never
    configured rather than having had its lock taken away. That is deliberately
    the opposite of field 2, where empty is a value meaning "follow the main
    site".
  - **the library path is validated too**, and gets its own message. A `links`
    row predates this validation, so "picked from the library" is not "already
    known good" — and the owner did not type that address and cannot edit it from
    the device screen, so naming "the main site" would send them to correct a
    field that is not the problem.
  - host derivation **moved after** the check, and stayed on the manual path
    only: a library link carries its own host set, and deriving one here would
    edit the device's allow-list on a save where the owner picked a link whose
    row has none.
  - the same funnel closed the three other doors onto the webview: `set_url`
    (host-only, so `ftp://` on an allowed domain passed) now checks the scheme
    and sends the **checked** value rather than the raw one; and `POST /links` /
    `PATCH /links/:id`, which are the *source* both device routes copy from —
    the edit validated nothing at all, so it was the one door that could put
    `javascript:` into the library.

  Verified in `QA/kiosk/home-url-0811/` — 19 assertions replaying all three
  routes' own sequence against the production DDL on `node:sqlite`, asserting the
  stored column rather than the validator's return value, plus a "before" row
  showing the old PATCH storing `javascript:` and a section that reads both route
  files off disk to prove the replay matches what they now do. 125/126 on
  `node --test` (122 before; the four new cases are in `displayurl.test.mjs` and
  the one failure is `routing.test.mjs`, which imports express — the documented
  baseline).

  Corrected by the run: the first version also refused a hostless URL, which is
  not a case that exists — http is a WHATWG "special" scheme, so `http:///lobby`
  normalises to host `lobby` and anything parsing as http(s) has a host.

  Existing rows are **not** swept. Rewriting an owner's stored address on a boot
  migration would change what a live device shows without anyone asking; the
  refusal is at the door.

  **Not deployed.**

- **the other half of the selection screen (§2★ה, storage half)** — §2★ה gives
  the person at the device exactly two moves, both bounded by what management
  approved *for that device*: pick another `מזהה לקוח`, and pick another
  **קישור**. §2★ז repeats it — the launcher shows `כל הפריטים המאושרים
  (מזהי-לקוח/קישורים)`. The first half has been built for a while
  (`device_clients` → `approvals.js` → the console picker → the launcher list);
  the second had **nothing**. `links` is an owner-wide library with no
  per-device relation at all, so the only two addresses a device could ever open
  were its own `home_url` and an approved client's site — an owner running four
  halls off one library could not put hall B's link on hall B's tablet without
  editing the main site, which is the field that locks the whole device. Added
  `device_links` and `server/src/linkapprovals.js`:
  - a **separate table**, not a column on `device_clients`. A link is not a
    client: no code to type on a keypad, no `active` flag, and it belongs to the
    owner's own library rather than to a business they serve. Folding them
    together puts a nullable code and a meaningless active column on half the
    rows. Absence of a row is a "no" here too.
  - **nothing resolves a typed string.** That is the whole difference in threat
    model — a client is redeemed by a code a stranger can guess at, and a link is
    chosen off a list the server already decided to show.
  - `selectableLinks()` filters **nothing**, unlike `selectableClients()`. There
    is no `active` column, so the only ways a link leaves the list — deleted from
    the library, un-approved — already remove the row; a filter here would hide
    a link an owner ticked. `allowed_host` is left out of the offer: the hosts go
    to the device, not to whoever is choosing.
  - `approvalSelection()` is **reused, not copied**. It filters ids against an
    owner's own set and knows nothing about clients; a second copy would be the
    same eight lines free to drift from the one under test.
  - `withLinkHosts()` **composes with** `effectiveHostCsv()` rather than
    extending it, and the run measures why: that one filters on
    `Number(r.active) === 1`, so a link row — which has no `active` — is dropped
    from its own widening. Both keep the same two rules: an **unset** list stays
    unset (seeding it would *create* a lock on a device that had none), and the
    host is derived from the link's own address as well as its stored extras, so
    an approved link can never open as the device's blocked page.

  Verified in `QA/kiosk/link-approvals-0811/` — 9 unit cases (134/135 across the
  suite; 125/126 before, so the 9 are the whole difference, and the one failure
  is still `routing.test.mjs`, which imports express) plus an 11-assertion replay
  of the boot against a database shaped like the live volume, with the DDL **read
  out of `src/db.js`** rather than copied, so it cannot pass against a text the
  server does not run.

  Found and **not** fixed, and asserted rather than assumed: the foreign key
  checks that a link exists, **not that it is the owner's** — approving another
  customer's link id succeeds at the database. `approvalSelection()` is the only
  thing standing there, and it is the first call the route must make.

  **Not wired**, the same split `setupprogress.js` and `display_url` used:
  nothing imports the module yet. In order — the two routes and the widened
  `update_config`, then the console picker beside `🆔 מזהי לקוח`, then the
  launcher and `identify()` offering links alongside clients. **Not deployed.**

- **the link approvals, wired (§2★ה, second half)** — the module above sat with
  nothing importing it, so `device_links` was a table no route could write. Added
  `GET`/`PUT /api/devices/:id/links` in `routes/devices.js`, the mirror of the
  clients pair directly above them, and put the pushed allow-list behind one
  function:
  - **`approvalSelection()` is the first call the `PUT` makes**, which is the
    hole the previous step found and asserted rather than fixed: `device_links`'s
    foreign key proves a link *exists* and says nothing about whose it is, so an
    id from another customer is stored happily by the database. The filter is the
    whole authorisation check, and the test asserts on the table rather than on
    the filter's return value.
  - **not merged into the clients routes.** One `PUT` carrying both lists would
    make un-approving every client the price of touching the links, and the two
    are different in kind — a client is redeemed by a code someone types on a
    keypad, a link is chosen off a list the server already decided to show.
  - `deviceConfigHostCsv(db, device)` in `linkapprovals.js` — the device's own
    list, then its approved clients, then its approved links, then whatever it is
    being told to display. That four-part expression was written out at **four**
    call sites (the device `PATCH`, the clients `PUT`, the new links `PUT`, the
    agent's heartbeat), and the device enforces the list locally and offline: a
    push that composes three of the four fails nowhere a developer can see it,
    only as a blocked page on a tablet in a hall, on whichever route was the
    stale copy. The order survives "unset stays unset" — a device with no lock is
    still handed no lock, whatever has been approved for it.
  - the **enrollment** response was handing back the raw `allowed_host` column
    while the heartbeat sent the widened one. Hardware that re-enrols already has
    its approvals, so it was blocked from the clients and links it was approved
    for until the first heartbeat landed. On a first enrollment nothing is
    approved and no display link is set, so the value is byte-identical.
  - the config is read **after** the write, or the push describes the set the
    owner just replaced.

  Verified in `QA/kiosk/link-approval-routes-0811/` — 3 new cases replaying the
  route's own sequence against the production DDL on `node:sqlite`, asserting the
  stored rows and the pushed list (137/138 across the suite; 134/135 before, so
  the three are the whole difference, and the one failure is still
  `routing.test.mjs`, which imports express).

  Not verified: the express glue itself — the mount, `requireAuth`,
  `getOwnedDevice` — the same constraint every prior step has had.

  **No console UI**, so approving a link for a device is still an HTTP call; the
  picker beside `🆔 מזהי לקוח` is the next step, then the launcher and
  `identify()` offering links alongside clients. **Not deployed.**

- **the link picker, on the device card (§2★ה, console side)** — the table and
  its two routes landed above and left approving a link an HTTP call, so the
  second half of the selection screen was still unreachable to the person who
  owns the fleet: the link library is owner-wide, and without this every device
  offered nothing but its own main site and its approved clients. Added
  `linkApprovals()` in `public/js/app.js` and **📚 קישורים מאושרים** on every
  device card, next to `🆔 מזהי לקוח`:
  - **a separate dialog, next to the clients one rather than merged with it.**
    On the device the two are one screen — the person standing there picks a
    מזהה לקוח *or* a קישור — but each `PUT` replaces its whole set, so one modal
    carrying both lists would make un-approving every client the price of
    touching the links. They are also different things to tick: a client is a
    business whose staff type a code on a keypad, a link is an address the
    server has already decided to offer.
  - **no disabled row**, unlike the clients picker, and that is a difference in
    the data rather than a simplification: `links` has no `active` column, so the
    only ways a link leaves this list — deleted from the library, un-ticked here
    — already remove the row. There is no disabled-but-reserved state to grey
    out, because a link has no code to keep reserved.
  - the hint under the list is the same two branches the clients picker has, for
    the same reason: approving widens the device's allowed-domain list, but only
    if it has one, and the server leaves an **unset** list unset rather than
    creating a lock. Saying the wrong one of the two ends as `האתר חסום` on a
    tablet in a hall, which reads as a broken kiosk.
  - the subtitle says in as many words that this is **not** a change of the main
    site — the device stays locked on it and returns to it. `🔗 החלף אתר` sits
    four buttons away and does exactly that, and the two are one careless click
    apart.
  - saving nothing is a legitimate save and says so (`לא אושר למכשיר אף קישור`),
    because absence of a row is a "no" here, not a no-op.
  - an empty library gets no save button — just a route to `ספריית קישורים`.

  Verified in `QA/kiosk/link-approvals-console-0811/` — 17 cases in a real
  browser against a stub that rewrites only the express glue and makes the same
  calls `routes/devices.js` makes, in the same order, over the production DDL
  **read out of `src/db.js`** on `node:sqlite`; both devices driven, the stored
  rows and the pushed `update_config` both asserted, plus light/dark screenshots
  and the empty-library state. 137/138 on `node --test "test/*.test.mjs"` — the
  documented baseline, unchanged, since this step adds no server code.

  **Not deployed.** Still to come on this half: the launcher page and
  `identify()` offering the approved links alongside the approved clients — both
  payloads carry clients only today.

- **both selection payloads now carry the links (§2★ה, the read side)** — the
  table, the two routes and the console picker all landed earlier today, so an
  owner could tick "this tablet may also open the evening menu" and the row was
  written. Nothing could then read it: `identify()` (the device's own screen) and
  `launcherProfile()` (the page a hall code opens) both answered with `clients`
  alone, and an approved link was write-only.
  - `identify()` takes a 4th argument and answers with `profile.links`;
    `launcherProfile()` a 3rd and the same field. Both are last and optional, so
    every existing caller and test keeps working — the widening is a no-op on
    `undefined`, which is what "nothing approved" already meant.
  - **the allow-list was the real defect, not the missing list.** `identify()`
    built it as `configHostCsv(effectiveHostCsv(dev, clients), shown)` — three
    widenings exist and it composed two. `deviceConfigHostCsv()` was introduced
    because that expression was written out at four call sites and a copy that
    drops one fails nowhere a developer can see it; this was the fifth call site
    and was already the stale copy. Both payloads now wrap `withLinkHosts()`, in
    the same order, so a link on the screen is a link the device can actually
    open rather than its own blocked page.
  - **empty still stays empty.** `hostAllowed()` reads an unset list as "no lock
    configured", so seeding it from the approvals would create a lock on a device
    that had none and cut it off from the page it is showing right now. Asserted
    on a second fixture device with no `allowed_host`.
  - **a link is picked, never typed.** `typedCode` resolves against clients only,
    and must: `links` has no code column, and matching on name or id would turn a
    list whose addresses are on the screen into a credential. Typing `1` and
    typing `תפריט הערב` are both `unknown_code`.
  - `POST /api/launcher/open` accepts `linkId` beside `clientId` and **refuses a
    body naming both** — the two lists are separate approvals, and resolving by
    precedence would make which page opens depend on an order nobody stated.
  - `approvedLinkTarget()` now requires the row to carry a `url`. Ids are unique
    per table, so client 1 and link 1 both exist; handed the *clients* list it
    used to find a row by id and read `url` off something storing `site_url`,
    answering with a target that had no address. It only ever fires on a mixed
    list, and now it fires closed. `launcherTarget()` was already safe the other
    way — it requires `active`, which a link row has no column for.

  Verified in `QA/kiosk/selection-links-payload-0811/` — 16 cases replaying all
  three routes' own sequence against the production DDL on `node:sqlite`, with
  the express glue rewritten and every decision taken by the real module, plus
  three cases that read `routes/agent.js` and `routes/launcher.js` off disk so
  the replay cannot drift from them. **146 tests, 145 pass** on
  `node --test "test/*.test.mjs"` — 8 new (4 in `identify.test.mjs`, 4 in
  `launcher.test.mjs`), and the one failure is still `routing.test.mjs`, which
  imports express.

  **Not deployed.** `public/kiosk-launcher.html` still draws one list, so `links`
  arrives in its payload undrawn — that is the next step and it is `public/`
  only.

- **the launcher page draws the links (§2★ה/§2★ז)** — the step above put `links`
  into `/resolve`'s answer and taught `/open` to accept a `linkId`, and the page
  drew clients only: the field arrived on every response and was never rendered,
  so the person standing in the hall could not pick one and half of what §2★ה
  says the selection screen offers was unreachable from the screen that exists to
  offer it. `public/kiosk-launcher.html` only:
  - the approved links follow the businesses on **one** list, because the person
    is making one choice — but the ids are carried in **different attributes**
    (`data-link` / `data-client`). Ids are unique only within a table, so client 1
    and link 1 both exist; a single `data-id` would send whichever the handler
    guessed and the server would resolve it against the wrong approvals. The QA
    fixture approves exactly that pair.
  - **exactly one id is sent**, built from which attribute the button carries
    rather than setting both and leaving one `undefined`. `/open` refuses a body
    naming both rather than resolving by precedence, and `JSON.stringify` drops an
    undefined value — so the other shape would make that refusal depend on a
    serialisation detail.
  - a link row shows **host and path**, not the host. `hostOf()` is right for a
    client — a business is its domain — and wrong here: `links.url` is the
    specific event sub-link, so a library routinely holds several under one host
    and every row would print the same line. The query and fragment are dropped
    (they carry tokens often enough to be careful with on a screen in a hall) and
    the tail is elided rather than wrapped. `dir="ltr"`, because a `/` is
    directionally neutral and inside the RTL card the segments of `host/a/b` can
    be laid out in an order that is not the address.
  - the "nothing approved" sentence now counts **both** lists. A device with links
    and no clients is not an unconfigured device, and saying so under a list of
    links reads as a fault.

  Verified in `QA/kiosk/launcher-page-links-0811/` — 12 cases in a real browser
  against a stub that rewrites only the express glue and imports the real
  `accesscode.js` / `approvals.js` / `linkapprovals.js` / `launcher.js` /
  `ratelimit.js` over the production DDL on `node:sqlite`, driven at **both**
  mounts. Clicking link id 1 lands on the link's address rather than the
  same-numbered client's and logs `launcher_link_opened`; the `/open` body is
  asserted on the wire in both directions. Three screenshots. 146 tests, 145 pass
  — the documented baseline, unchanged, since this step adds no server code.

  Found and fixed in that run: the two-links-under-one-domain collision above,
  and a harness bug inherited from `launcher-page-0811` — its stub read the page
  into a constant at boot, so a stub outliving an edit reports on the previous
  version of the thing under test. The first driven pass here did exactly that.
  This stub reads the file per request.

  **Not deployed.** `more30.com/kiosk/kiosk-launcher` is still a 404 until the
  Railway service is rebuilt.

- **the launcher answers with §2★א's second field too** — `identify()` separates
  `kioskUrl` (the venue's main site: what the device locks to, where idle-return
  and a reboot land) from `displayUrl` (what *this* device shows). The launcher's
  payload carried `kioskUrl` alone, so on a device given its own link the
  `🏠 אתר האולם` button opened something other than what the tablet was showing a
  moment before the code was typed. `server/src/launcher.js` only:
  - `displayUrl` is `deviceDisplayUrl(device)` — never null while the device has
    a main site, because that function falls back to it. So the page opens the
    field unconditionally instead of re-deriving "NULL means follow the main
    site" a second time, in a second language, on a screen in a hall.
  - **withholding it was never the reason it was absent.** This payload is an
    allow-list built for a weak credential, and the test asserting that is the
    reason the field had to be argued rather than added: but the caller is
    already handed the venue's address, the approved businesses' and the approved
    links'. `displayUrl` is one of those or `home_url` itself.
  - **the allow-list was the real defect again.** Three widenings exist and this
    composed two — the same shape found in `identify()` one step earlier, and
    this was the last call site outside `deviceConfigHostCsv()`. A device whose
    own link is on a host nothing else mentions was handed a list that blocks the
    page it is showing right now. Now wrapped in `configHostCsv`, in the same
    order, so **unset stays unset**: each widening only widens, and a device with
    no lock is still handed no lock.
  - `kioskUrl` is untouched and still `home_url`. A display link is not a second
    lock, which is what lets idle-return come back to the venue's own page.
  - `POST /api/launcher/open` takes its `allowedHost` from this same function, so
    it is fixed by the same change rather than by a second copy of the
    expression.

  Verified in `QA/kiosk/launcher-display-url-0811/` — **152 tests, 151 pass** on
  `node --test "test/*.test.mjs"` (146/145 before, so the 6 new cases in
  `launcher.test.mjs` are the whole difference; the failure is still
  `routing.test.mjs`, which imports express), plus an 8/8 before-and-after
  harness. #35's source is gitignored here, so there is no `git show` of the
  previous version to diff: the harness rebuilds the **pre-change expression
  verbatim** from the same modules over the same rows and measures what it was
  missing — no `displayUrl` at all, and an `allowedHost` omitting the device's
  own host while carrying the client's and the link's, which is what makes it the
  third widening rather than a broken fixture. It also asserts the fields this
  step did not touch are unmoved, and that the launcher and `identify()` agree
  on all three context fields for one device.

  `/open` is covered by a test that reads `routes/launcher.js` off disk and
  asserts it still destructures `launcherProfile()` rather than writing a second
  expression — which is exactly how the call sites `deviceConfigHostCsv()` exists
  to unify drifted apart in the first place.

  **Not deployed**, and the page does not draw it yet: `kiosk-launcher.html`
  still labels the venue button from `kioskUrl`. That is the next step and it is
  `public/` only.

- **the launcher page draws the second field (§2★א/§2★ז)** — the step above put
  `displayUrl` into `/resolve`'s answer and the page still labelled and opened one
  button from `kioskUrl`. So on a device given its own link, the person who typed
  a code and wanted out again had no row leading back to the page the tablet was
  showing a moment earlier, and the single button offered — `🏠 אתר האולם` —
  moved it off that page instead. `public/kiosk-launcher.html` only:
  - **two rows whenever the two fields differ, one when they do not.** The server
    sends `displayUrl` as the device's own link *or* the main site
    (`deviceDisplayUrl()` falls back), so inequality is the whole test: a device
    following the main site draws exactly the button it always drew. A stored
    equal copy — impossible to write today, since `normalizeDisplayUrl` collapses
    it, but writable before that rule existed — collapses here too rather than
    printing one address twice under two names.
  - the device's own link comes **first**. It is the state the person arrived
    from, so it is the row they are looking for; the venue's main site stays and
    keeps its own label, because the two have to remain distinguishable — one is
    where "back" goes and the other is what the device is locked to.
  - it is drawn with `shortUrl` and `dir="ltr"`, like a library link and unlike
    the venue: a display link is routinely a sub-page of the venue's own host, so
    `hostOf()` would print the same line under both names and the two rows would
    differ only in their titles.
  - both navigate from the profile rather than from an address written into the
    button, so a later `data-url` cannot swap them — and neither is re-checked by
    `/open`, because neither is an approval: they are the device's own two
    addresses, and the server already sent both to this caller.

  Verified in `QA/kiosk/launcher-display-url-page-0811/` — 13 cases in a real
  Chromium at the production mount against a stub that rewrites only the express
  glue and imports the real `accesscode.js` / `approvals.js` /
  `linkapprovals.js` / `launcher.js` / `ratelimit.js` over the production DDL on
  `node:sqlite`, with three device fixtures (own link / following the main site /
  an equal copy stored). Both rows were clicked and land on **different** pages.
  Three screenshots. 152 tests, 151 pass — the documented baseline, unchanged,
  since this step adds no server code.

  Two things the run changed: the row's icon was 🔙, which renders as a glyph
  with the English word BACK inside it on an otherwise-Hebrew screen — it is now
  📺, the icon the console already prints this field with on the device card; and
  its first tint sat close to the client rows' blue, so the four kinds of row are
  now amber / green / blue / purple.

  **Not deployed.** `more30.com/kiosk/kiosk-launcher` is still a 404 until the
  Railway service is rebuilt.

- **`--line`, measured in one pass** — three contrast steps each split something
  out of `--line` into its own token and each recorded the same leftover: the
  token itself is 1.29:1 in dark and ~1.2:1 in light, and it draws the wizard's
  step rows, the table rules and every card edge. A fourth token guessed at was
  the wrong move, so this step measured every `--line` consumer that renders in
  the console, in both modes, against **the surface actually painted behind it**.
  The consumers split into 1.4.11's two kinds and the split is not close:
  - **one control.** `.wz-step` is a `<label>` wrapping a checkbox with the whole
    row clickable, so its border is a control's boundary and 3:1 applies. It
    measured **1.22:1** light and **1.29:1** dark against the card, and
    **1.16:1 / 1.37:1** against the sunken fill a *ticked* row takes — i.e. the
    row a person has already acted on had the weakest edge of the three.
  - what makes that a mistake rather than a choice is two lines up in the same
    dialog: **`.wz-track label` is the identical shape** — a label wrapping a
    radio, whole row clickable — and was already on `--field-border` at 3.30 /
    3.42. One dialog, two clickable rows, two different borders. So the fix is
    that one declaration and **no new token**: `--field-border` was already
    chosen against both surfaces a control's border touches. Now 3.30 / 3.13
    light, 3.42 / 3.64 dark. `.wz-step.wz-next` still overrides with `--accent`
    and was re-measured (5.28 / 3.22) so this is not claimed to have fixed it.
  - **everything else is a separator, and 1.4.11 exempts separators.** Card edge
    1.14:1 light / 1.42:1 dark; the card's own **fill** against the page is
    1.07 / 1.10. None of them is the only thing marking its boundary — cards
    carry `--shadow` and a fill, `.hl-row` and `.wz-step.wz-ticked` carry
    `--sunken`. Raising `--line` to 3:1 would put a mid-grey rule around every
    card, stat tile and table row on every screen: a redesign of the console, not
    an accessibility fix. **Left, deliberately** — but printed as `ℹ️` rows in the
    run rather than left silent, so the cost is a number for whoever revisits it.

  Verified in `QA/kiosk/line-contrast-0811/` — a real Chromium at both
  `colorScheme` values, every value from `getComputedStyle`, against
  `setup-wizard-console-0811/stub-server.mjs` reused rather than copied (it
  already serves the real `public/` and answers the four setup routes through the
  real `setupsteps.js` / `setupprogress.js` over the production DDL on
  `node:sqlite`). 10/12 graded rows pass; the two failures are the **before**
  rows, which re-inject `--line` onto the same rule in the same DOM and are
  supposed to fail. Two screenshots. 152 tests, 151 pass — the documented
  baseline, unchanged, since this step adds no server code.

  **Not deployed.**

- **the page that renders in the hall, measured** — every contrast pass so far
  opened one dialog in the **console**. `kiosk-launcher.html` had never been
  measured, and it is the one that comes up full-screen on a tablet, read at
  arm's length by someone typing a six-character code off a printed card. It
  also cannot be measured the way the console was: the console's surfaces are
  opaque, so `button-boundary-0811`'s "walk up to the first opaque background"
  finds the real backdrop, while **here nothing is opaque** — every card, row
  and button is a translucent white over two radial gradients over `--navy`, and
  that walk lands on `body`'s navy, the darkest thing on the page. Every ratio
  would have come out flattering. So the backdrop is **sampled from the pixels
  Chromium painted**, and translucent foregrounds are composited over that
  measured pixel. Three real defects, in `public/kiosk-launcher.html` only:
  - **`#code::placeholder` at 2.70:1.** It is the only thing on the screen
    saying the code is six characters long, and it is read *before* anything is
    typed. `.3` → `.55`, i.e. 5.78:1, still far dimmer than the typed value
    (16.27:1) — which is the one job a placeholder's colour has.
  - **`.choice` at 1.83:1.** Every row of the selection screen, and the row *is*
    the control. `.2` → a `--edge` token at `.45`: 3.60:1 against the row's own
    fill, 3.95:1 against the card. `:hover` was `.4` — *below* the new resting
    value, so hovering a row would have made its outline fainter — and is now
    `.62`.
  - **the primary button at 2.51:1.** `.btn` declares `border: none`, so the
    fill **is** the boundary, and this one could not be fixed by moving one
    number: white text needs 4.5:1 from the inside and the card needs 3:1 from
    the outside, and **no solid fill satisfies both** at 17px — the two
    constraints cross at L≈0.185. So the label became WCAG *large text* (19px at
    700, over the 18.66px line, and a better label on a tablet besides) and the
    fill moved to `--accent-btn: #3d74ff`: 3.24:1 against the card, 4.09:1 under
    the label. `--accent` is untouched; the console still uses it.

  Verified in `QA/kiosk/launcher-contrast-0811/` — a real Chromium at both
  `colorScheme` values against `launcher-display-url-page-0811`'s stub reused
  rather than copied. 23/28 graded rows pass; the five failures are the
  **before** rows, re-injected into the same DOM in the same run. Four
  screenshots. 152 tests, 151 pass — the documented baseline, unchanged, since
  this step adds no server code.

  Two harness bugs found and fixed there: **the input is focused on load**, so
  the first read reported the green `:focus` ring as the resting border — which
  is how `.25` survived this whole build unmeasured; and `transition: .15s`
  covers `color`, so a read in the tick after the text-hiding style is removed
  returns a value part way back from transparent (`rgba(255,255,255,0.74)` for
  the button's label). `check()` now **throws** on any non-opaque colour reaching
  it, since `lum()` reads three channels and would have graded it flatteringly.

  Left with numbers rather than silence: the card edge (1.54:1) and the alert
  are separators, which 1.4.11 exempts; the four `.ico` tints (1.37–1.77:1) are
  not the sole carrier of which row is which — each row also has its own emoji
  and a name — and raising them is a design change.

  **Not deployed.**

- **the page the installer reads, measured** — `install.html` was the second of
  the three `public/` pages never put through a contrast pass, and the one held
  in the hand of whoever is setting the tablet up: it carries the two values
  `EnrollActivity` asks for and five numbered steps that are followed literally.
  Same surface problem as the launcher — **nothing on it is opaque** — so the
  same method: the backdrop sampled from the pixels Chromium painted, translucent
  foregrounds composited over that measured pixel, borders composited rather than
  sampled. Both depths driven (`/kiosk/install/A7K2M9` and `/kiosk/install`),
  since they are different screens. One real defect, in `public/install.html`
  only:
  - **the two `.copy` buttons, the only controls on the page.** `.btn` fills
    elsewhere in this fleet are their own boundary; here the button declares a
    real `border`, and its fill is `rgba(255,255,255,.12)` over the `.value`
    box — **1.2:1**, no boundary at all. So that one line is the whole of what
    says "pressable", and it was `.34` → **2.65:1** against the fill inside it.
    Now `.45`, 3.51:1 inside and 5.13:1 against the `.value` box outside.
  - **`:hover` made the same edge fainter.** The hover rule lightened the fill
    and left the border alone: **2.36:1**, below even the resting value.
    Hovering a control must not weaken it, and 1.4.11 covers states, so
    `.copy:hover` now carries a `border-color` of its own at `.58` — 3.90:1.
  - the defect was **one-sided**, and the harness's first version wrongly
    demanded the "before" row fail against the `.value` box too. It did not:
    3.87:1. The edge was sufficient outside and vanished inside. That row is kept
    and annotated rather than dropped — the shape of the bug is part of the
    result.

  A difference from the launcher page that the harness's own guard caught: there,
  only the placeholder and the borders were translucent, and `check()` throws on
  any non-opaque colour reaching `lum()`. Here the **text** is translucent too —
  `.muted` and `table.errors th` are `rgba(255,255,255,.72)`, which is most of
  the prose — so the first run died on `#lede` rather than reporting a flattering
  8.6:1. Every foreground now goes through the same composite a border does.

  Verified in `QA/kiosk/install-contrast-0811/` — a real Chromium at both
  `colorScheme` values against `install-link-0811/stub-server.mjs` reused rather
  than copied (it already serves the real `public/` and resolves `/install/:code?`
  at both depths and both mounts off the real `installlink.js`). 20/22 graded
  rows pass; the two failures are the **before** rows, re-injected into the same
  DOM in the same run. Two full-page screenshots. 152 tests, 151 pass — the
  documented baseline, unchanged, since this step adds no server code.

  Found and **not** fixed, with the number rather than silence: the step-number
  disc (`li::before`) is **2.01:1** against the card. The disc is not what
  carries the step number — the white digit on it is, at 5.28:1 — and the disc is
  `--accent`, the brand colour every page here uses identically, so moving it is
  the design change `more30-priority.md` §6 asks for rather than a contrast
  token. Same call `launcher-contrast-0811` made for the `.ico` tints. The
  `.card` (1.52:1), `.value` (2.04:1), `.expect` (2.04:1) and `.warn` (2.63:1)
  borders are separators and message frames, which 1.4.11 exempts — `.value` in
  particular is a **display** box, deliberately not an `<input>`, so the control
  inside it is the button that was fixed.

  **Not deployed.**

- **the page a stranger lands on, measured** — `index.html` was the last of the
  three `public/` pages never put through a contrast pass, and it is a **third**
  kind of surface: the nav, hero and CTA band are translucent/gradient over
  `--navy` like the launcher, while everything below them is the console's opaque
  tokens out of the same `css/style.css`. And unlike the other two pages this one
  **inverts** — it toggles `:root.dark` from `prefers-color-scheme` in the head —
  so both modes are real screens here and both are graded, where on
  `install.html` the second mode was only asserted identical. Three real defects:
  - **two of the five sections were unreadable in dark mode.** `#features` and
    `#pricing` carried `style="background:#fff"`, hardcoded, while the text on
    them is `--ink` and `--muted`, which do invert: **1.20:1** for the section
    heading and **2.41:1** for the sub-heading. It survived this long precisely
    because in *light* mode the hardcoded white and `--card` are the same colour,
    so nothing looked wrong in the mode anyone was looking at. Now a
    `.section-alt` class on `var(--card)` — `#ffffff` exactly, so the light page
    does not move a byte, and the section-to-card relationship (both `--card`,
    separated by border and shadow) is preserved rather than invented.
  - **the page's main call to action had no boundary.** `.btn` declares
    `border: none`, so a filled button's *fill* is its boundary, and `--accent`
    on the hero navy is **2.93:1**. `--accent` itself could not move: it sits on
    a white card everywhere else in the system (5.29:1 there), and the two
    constraints cross — lightening it far enough to clear 3:1 against the navy
    drops the white label below 4.5:1 (the window is L∈[0.154, 0.183], which is
    why `launcher-contrast-0811` had to make its label large text instead). So a
    ring, in `button-boundary-0811`'s technique: `box-shadow: inset` rather than
    `border`, because `.btn` has none and a real border grows every button by
    2px. 3.42:1 inside, 10.02:1 outside. `.btn-primary` elsewhere is untouched.
  - **`.btn-ghost` is a transparent fill, so its border is the whole control**,
    and at `rgba(255,255,255,.35)` it was **2.84:1** on the nav — where the
    button is `כניסת לקוחות`, the only way in. Light mode only: the strip is
    `rgba(7,26,51,.85)` over the page background, which inverts, so the same
    border reads 3.19:1 in dark. `.45` gives 3.67:1 there and 4.25:1 on the hero.
    The CTA band's ghost overrides the colour to `#fff` inline and is unaffected.

  Verified in `QA/kiosk/index-contrast-0811/` — a real Chromium at both
  `colorScheme` values against `install-link-0811/stub-server.mjs` reused rather
  than copied (it already serves the real `public/`, and `/` is `index.html`
  there exactly as `src/index.js` declares it). 74/79 graded rows pass; the five
  failures are the **before** rows, re-injected into the same DOM in the same
  run, and each is asserted only in the mode its defect was in — claiming
  `#features` in light or the nav border in dark would be claiming a larger bug
  than the one that was there. Two full-page screenshots. 152 tests, 151 pass —
  the documented baseline, unchanged, since this step adds no server code.

  A harness bug found and fixed mid-run: the first version graded `.btn-light`'s
  *fill* as its boundary and reported **1.11:1**, i.e. re-reported the very defect
  `button-boundary-0811` fixed. These buttons carry an inset ring, which is
  nowhere in `borderTopColor`; the harness now reads `boxShadow` and grades the
  ring against both the surface outside and the fill inside.

  Left with numbers rather than silence: `.plan li::before`, the green `✓`, is
  2.28:1 on the white card — it is a list bullet and the text beside it carries
  the information, and it is `--accent-2`, a brand colour. `.feature .ico` is a
  brand-tinted square holding an emoji (1.00:1 against the same fill on the
  light card) and carries nothing on its own. Both are the call
  `launcher-contrast-0811` made for its `.ico` tints and
  `install-contrast-0811` for its step disc.

  **Not deployed.**

## Next, in order

1. Deploy — and it is not a redeploy of this repo. The Railway service
   `kioskfleet` builds from **`l023131500-ops/zol`**, branch
   `claude/what-do-you-see-gxo5tc`, root directory `kiosk/server`; this tree is
   `apps/35-kioskfleet/server`, which is gitignored here and is not that repo.
   So shipping the registry (API + screen), the approvals (API + picker),
   `identify`, the launcher, both of §2★א's fields, the install link and the
   three contrast fixes means syncing the source across first. That is its own
   step, and it is outward-facing on a live beta.
2. The Android half of this tree has now been edited twice without a compiler
   (`setSystemUpdatePolicy` above; `KioskActivity` still to come). Whoever has a
   toolchain should build `android/` once before the next Kotlin change lands on
   top of an unverified one. Waiting on this: `AgentClient.kt` must write the
   `adminCode` it is now sent into `Prefs.ADMIN_CODE` (enrollment + heartbeat +
   `update_config`), or the maintenance code above reaches the device and is
   dropped, and the corner-tap dialog keeps saying `לא הוגדר`. The same file
   should then rate-limit attempts in that dialog — it accepts unlimited guesses
   today, and the check happens offline, so `ratelimit.js` cannot cover it.
3. The selection screen on the device (§2★ה/ו): `KioskActivity` calls
   `identify`, offers the approved list, and locks onto what is chosen. Needs an
   Android toolchain, which this checkout does not have.
4. `--line` is **closed** — measured in one pass above. The one control drawn
   with it (`.wz-step`) is now on `--field-border`; the rest are separators that
   1.4.11 exempts, and their numbers are recorded rather than left as an open
   question. What remains under this heading is a *design* choice, not an
   accessibility one: card edges are 1.14:1 light / 1.42:1 dark, so a card is
   distinguished from the page mostly by its shadow. That is a look, and it is
   the kind of thing `more30-priority.md` §6 asks for — worth revisiting with the
   console's visual identity rather than as a contrast token.
5. All three `public/` pages are **measured** — `kiosk-launcher.html`,
   `install.html` and now `index.html`. **Closed.** What the last one turned up
   and did not close is that a hardcoded colour beside an inverting token is
   invisible in the mode you are looking at: `index.html` shipped two unreadable
   sections for as long as it has had a dark mode. `console.html` and
   `public/js/app.js` write colours inline too, and nothing has looked for them
   — that is item 6's real scope, not just the dialogs.
6. The console's own screens, other than the wizard, have still had no pass:
   `nontext-contrast-0811` onward each opened one dialog. Both modes have to be
   graded there, per the above, and `index-contrast-0811/verify.mjs` is the
   harness to reuse — it is the one that grades both, folds `opacity` into the
   foreground, and reads an inset ring rather than mistaking a fill for a
   boundary.
