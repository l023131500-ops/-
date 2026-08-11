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

## Next, in order

1. Deploy — and it is not a redeploy of this repo. The Railway service
   `kioskfleet` builds from **`l023131500-ops/zol`**, branch
   `claude/what-do-you-see-gxo5tc`, root directory `kiosk/server`; this tree is
   `apps/35-kioskfleet/server`, which is gitignored here and is not that repo.
   So shipping the registry (API + screen), the approvals (API + picker),
   `identify`, the launcher, both of §2★א's fields, the install link and the
   three contrast fixes means syncing the source across first. That is its own
   step, and it is outward-facing on a live beta.
2. `viewGuide()` — the four paragraphs under "הוראות הפעלה" in the sidebar are
   now the *second* description of the same install, and they still stop at
   enrollment. Either point that screen at the wizard or delete it; two
   instructions that disagree is worse than one that is short.
3. The selection screen on the device (§2★ה/ו): `KioskActivity` calls
   `identify`, offers the approved list, and locks onto what is chosen. Needs an
   Android toolchain, which this checkout does not have.
