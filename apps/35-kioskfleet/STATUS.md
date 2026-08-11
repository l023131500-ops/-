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

- **the red that stands on its own (`--danger-text`)** — `index-contrast-0811`
  closed the three `public/` pages and left one thing open: **a hard-coded colour
  beside an inverting token is invisible in the mode you are not looking at**,
  and it named `console.html` / `js/app.js` as never having been searched for
  them. A sweep of every colour literal in those two files returns **four**
  hits — the rest is tokenised — and three of them are red or amber text sitting
  on a surface that *does* invert:
  - `.hl-err`, the error under the domain allow-list, `#b91c1c` on the dark card:
    **2.63:1**. The guide screen's load error, `var(--danger-ink)` on the same
    card: the same 2.63:1. `.hl-empty`, the "no domains — the device can open
    **anything**" warning, `#b45309` on `#2e2510`: **3.01:1**.
  - two of the three were written **inline**, and that is what hid them: an
    inline `color` beats every stylesheet rule — including `:root.dark .hl-empty`
    sitting one line below, which already replaced that box's *background* and
    could never reach the text above it. Both are back in `css/style.css`.
  - **`--danger-ink` does not move.** It was chosen against the pink `#fee2e2`
    fill, which does not invert, so it is right there in both modes
    (`.btn-danger`, `.alert-error`). What is added is a third split —
    `--danger-text`, the red that sits directly on the surface and therefore
    inverts with it: `#b91c1c` light, `#f87171` dark. Exactly the shape of
    `--danger`/`--danger-ink` and `--warn`/`--warn-ink`.
  - `--danger` itself was **not** taken as the dark value, though that is the
    move `--warn-ink: --warn` made: `#ef4444` is **4.53:1** on the dark card —
    passing with no margin at all, and a future change to the card tone drops it
    under.
  - the two literals left alone, with their numbers rather than silence: the
    `toast` backgrounds are an opaque overlay that is not supposed to invert
    (white on them is 18.7:1 and 6.47:1), and `#user-quota` sits on `--navy`, a
    brand colour verified as surface-only, at 6.72:1.

  Verified in `QA/kiosk/danger-text-0811/` — a real Chromium at both
  `colorScheme` values against `warn-ink-0811/stub-server.mjs` reused rather than
  copied. The first two sites are driven from the **links screen**, the one place
  in the console where `hostListEditor` mounts with no locked host and so renders
  the empty-list warning by itself; the error is driven by a duplicate rather
  than an invalid domain, which is a deterministic route into `fail()` and does
  not depend on what `normalizeHost` rejects; the third is driven by faulting
  `/api/devices` at the network, since it is painted only from `viewGuide`'s
  catch. 11/14 rows pass, the three failures being the **before** rows, each
  asserted **dark-only** — in light the old colour and the new token are the same
  value on purpose, so the light console does not move a byte, and demanding they
  fail there would claim a bug that never existed. Three token assertions per
  mode (that `--danger-text` resolves, that it *differs* from `--danger-ink` in
  dark, and that `--danger-ink` has not moved) plus a `.btn-danger` regression row
  are the other half of that claim. Six screenshots. 152 tests, 151 pass — the
  documented baseline, unchanged, since this step adds no server code.

  Found and **not** fixed: `.toast` declares `background: var(--ink); color:#fff`,
  which in dark mode is white on near-white. It never happens because `toast()`
  always writes an inline background, so the rule is dead — a trap rather than a
  bug, and removing dead declarations belongs to a pass over `css/style.css`
  itself, not to this one.

  **Not deployed.**

- **the label on every field (`--label-ink`)** — `danger-text-0811` closed the
  hard-coded-colour-beside-an-inverting-token class in `console.html` and
  `js/app.js`, and named those as the two files it swept. `css/style.css` itself
  had never been swept for it, and the one literal there sitting on a surface
  that **does** invert is `.field label`: `#33455f`, written between `--field-bg`
  and `--ink`, which is **1.75:1** on the dark card. That is every form label in
  the console — 33 `.field` blocks in `app.js` and two in `console.html` — and
  the two in `console.html` are **`שם משתמש` and `סיסמה` on the login screen**,
  the first thing that opens, where the label is the only thing saying which box
  is which and the password box's own text is masked.
  - a third token in the shape of `--danger`/`--danger-ink`/`--danger-text`:
    `--label-ink`, `#33455f` light and `#c3cfe3` dark. The **light value is
    exactly the one it replaces**, so the light console does not move a byte, and
    the harness enforces that directly rather than leaving it as a claim.
  - the dark value was chosen to **hold the ratio**, not merely to clear the
    threshold. In light the label is 9.73:1, sitting between the ink (18.7:1) and
    the muted text (5.49:1); `#c3cfe3` is 10.83:1 against a dark ink of 14.23:1
    and muted of 7.08:1. A value that only passed 4.5:1 would flatten the label
    and the `--muted` hint printed under it into one block of text — and the
    device edit dialog has exactly that pair under both of §2★א's fields, where
    the labels are the only thing distinguishing the link that locks from the
    link that shows. The harness asserts the two colours differ and grades the
    hint in the same pass.
  - `--label-ink` is asserted to be neither `--ink` nor `--muted` in either
    mode. Collapsing onto either is the failure this token exists to avoid, and
    it is the kind of thing a later "simplify the palette" edit would do.

  Verified in `QA/kiosk/label-ink-0811/` — a real Chromium at both `colorScheme`
  values against `warn-ink-0811/stub-server.mjs`, reused rather than copied. The
  background is read from **the surface actually painted** behind each label
  rather than assumed from the token: these labels sit on `.auth-card`, `.card`
  and `.modal`, and one quoted value would be right for some and wrong for the
  rest. The login screen is driven on its own page with no `kf_token`, since the
  token is read once at load. 13/16 rows pass; the three failures are the
  **before** rows, re-injected into the same DOM in the same run and each
  asserted **dark-only**. Six screenshots. 152 tests, 151 pass — the documented
  baseline, unchanged, since this step adds no server code.

  A harness bug found and fixed mid-run: the "is the label distinguishable from
  the hint under it" check first selected `.field:has(#h) + .field label` as a
  fallback — another *label*, so it compared the token against itself and
  reported a defect that was not there. It now selects the hint `<div>` and fails
  loudly if that selector ever stops matching, rather than silently skipping.

  Found and **not** fixed, with numbers rather than silence: `.pill.off`
  (`#64748b` on `#f1f5f9`) is **4.38:1** at 12px/600 — under 4.5:1 and not large
  text. It is not this class: it is a light chip that deliberately does not
  invert, so it fails equally in both modes, and fixing it properly touches
  `.pill.on`, `.alert-ok`, `.hl-tag` and `.code-chip` together. `.dot.off` is
  1.55:1 on the light card, and is a status dot beside a `.pill` that says the
  same thing in words — 1.4.11 exempts it as duplicated information.

  **Not deployed.**

- **the light chips (`--chip-*`)** — the three steps before this one all chased
  the same defect: a hard-coded colour beside a token that inverts, i.e.
  something unreadable in the mode you are *not* looking at. The five light chips
  are the opposite shape and were left for exactly that reason. `.pill.on`,
  `.pill.off`, `.alert-ok`, `.hl-tag` and `.code-chip` are light fills that
  **deliberately do not invert** — `#f1f5f9` sits on the dark card unchanged — so
  their ratio is identical in both modes and they fail, or pass, equally
  everywhere. One decision, five rules, and one of them was under: `.pill.off` is
  `#64748b` on `#f1f5f9` at **4.34:1**, which is the **מנותק** chip — the word
  that says a tablet in another room has stopped answering, at 12px/600, which is
  not large text. Six tokens in `css/style.css`:
  - `--chip-off-ink` is the only value that moved: `#56637a`, one shade darker
    and visually near-identical, **5.54:1**. The other four are tokenised
    **without moving**, and their numbers are recorded rather than left silent —
    `#15803d` on `#dcfce7` is 4.57:1 and `#2a61e8` on `#eef3ff` is 4.76:1. Both
    pass on thin margins, which is precisely what a token stops from being worn
    away.
  - the ink of a chip is chosen against **its own fill**, so it must not ride
    `--accent`. `.hl-tag` and `.code-chip` read `var(--accent)` on a fill that
    stays `#eef3ff` — and `more30-priority.md` §6 asks for a different palette per
    system, so that token *will* move and would have taken both chips with it,
    onto a background that does not follow. Same split as `--danger` /
    `--danger-ink`. The harness forces `--accent: #ff0000` on the live DOM and
    asserts `.hl-tag` does not move.
  - `.code-chip` is **declared** at 20px/700 — large text, 3:1 — and `app.js`
    renders the same class at 14px on the device card and 15px in both code
    tables. So the class lands on both sides of 1.4.3's line and the value is
    chosen for the stricter threshold. The harness computes the threshold from
    the rule rather than quoting a constant.

  Verified in `QA/kiosk/chip-ink-0811/` — a real Chromium at both `colorScheme`
  values against `warn-ink-0811/stub-server.mjs`, reused rather than copied, with
  the background read from the surface actually painted behind each chip. 14/16
  rows pass; the two failures are the **before** rows, re-injected into the same
  DOM in the same run and asserted to fail in **both** modes — which is the
  class's defining property, and the opposite of what the previous step's harness
  demanded. The six tokens are also asserted byte-identical across the two modes
  (a light chip that inverts is a second, unmeasured design) and the measured
  `.pill.off` ratio is asserted equal in both. Six screenshots. 152 tests, 151
  pass — the documented baseline, unchanged, since this step adds no server code.

  Two routes were added to the shared stub, **additively**: `.alert-ok` is
  painted in exactly one place in the console — the answer to a successful
  `POST /api/enrollments` — and was unreachable without them.

  Found and **not** fixed, with numbers: the chip's **own boundary** is ~1.10:1
  on a white card for all three fills. 1.4.11 covers controls and graphical
  objects; a chip is a status label whose whole content is the word inside it, so
  it is exempt — unlike `.btn-light`/`.btn-danger`, which are controls and got a
  ring in `button-boundary-0811`.

  **Not deployed.**

- **the first two screens graded as screens (`.serial`)** — every step from
  `nontext-contrast-0811` onward opened whichever one dialog it happened to
  touch, so the console's own screens had never been read. **ספריית קישורים** and
  **מזהי לקוח** are the pair that share a shape — a "X חדש" card over a table of
  the existing ones — so they are one pass, in both modes, 46/48 with the two
  failures being the injected control rows.
  - what it found is not a contrast failure, it is the opposite. `.serial` is
    declared `.device .serial`, and `loadClients()` renders that same class
    **inside a cell of the client table** — the client's internal note. The rule
    does not apply there at all, so the note came out `--ink` at 14px: the same
    colour and the same size as the client's name directly above it. The field
    whose own label says `לא מוצגת על המכשיר` read as a second line of the name
    that *is* shown. 18.72:1 and wrong.
  - the base rule is promoted to the global level (`--muted`, 12px) and the
    **monospace stays scoped to `.device`**: there the content is a serial number
    and reads as one, and in the client table it is Hebrew prose. So the fix is
    two rules rather than one, and the device card does not move — which is
    asserted in the run rather than claimed, by reading `.device .serial` back in
    both modes.
  - the note is now 5.49:1 light / 7.08:1 dark, and the harness also asserts it
    is distinguishable from the name above it — the same shape as
    `label-ink-0811`'s label-vs-hint check, and the only reason this defect was
    caught at all, since both colours passed 1.4.3 on their own.

  Verified in `QA/kiosk/screens-links-clients-0811/` — a real Chromium at both
  `colorScheme` values against `warn-ink-0811/stub-server.mjs`, reused rather
  than copied, with the background read from the surface actually painted and
  every ancestor `opacity` folded into the foreground's alpha. One client is
  given a note through `page.route` rather than by editing the shared fixture:
  `.serial` renders only for a client that has one, and four other harnesses
  import that stub. Four screenshots. 152 tests, 151 pass — the documented
  baseline, unchanged, since this step adds no server code.

  Two harness defects were found mid-run and fixed, so the table is not larger
  than what it measured: `.field label` was selected unscoped, and `console.html`
  carries a **hidden login card** with one of its own — the first run graded the
  login screen and reported it as this one (`שם משתמש` in the links row). And the
  injected control row was one value for both modes: `#b9c3d4` fails on a white
  card and **passes at 9.58:1** on a near-black one, so the dark half of the
  table could not have failed. Both are scoped/per-mode now.

  Found and **not** fixed: the shared more30 login pill sits over the top-left
  corner of both screens. Nothing is actually obscured here — the headings are
  right-aligned — but it is the same layer already fixed on the other sites and
  not on this console.

  **Not deployed.**

- **2026-08-11 — the box you tick was the browser's blue, not ours.**
  `screens-approvals-code-0811`. The last two screens of item 6's
  screen-by-screen pass: the approvals picker (both halves — 🆔 מזהי לקוח and
  📚 קישורים מאושרים) and the 🔑 קוד גישה dialog including its inline
  confirmation. Both colour schemes.

  **No ratio was under threshold.** 54 text and button rows across the three
  dialogs pass in both modes; the narrowest is the access code itself at
  4.76:1 (threshold 3:1 at 30px/700), then `--warn-ink` at 5.02:1 and the
  client's code at 5.11:1 on its `--bg` fill.

  What the pass found is the **control**. The picker is entirely checkboxes —
  everything graded above is text *describing* them — and a checkbox has no
  `border-color` and no `background-color` to read, because the UA draws it.
  So it had never been measured, here or in any earlier run. Measured by pixel
  sampling, and the answer is not a failing ratio but the **hue**: the console
  declared no `accent-color`, so the ticked box — the only control in the
  console that carries state — was painted `#0075ff`, Chromium's default blue,
  a colour that appears nowhere else in the system.

  Fix is a third token in the shape of `--danger-text` / `--label-ink`:
  `--accent-control`, with `accent-color: var(--accent-control)` on `:root`.
  Not `--accent` itself, for a measured reason — Chromium *lightens its own*
  blue in dark scheme (`#0075ff` → `#99c8ff`) and a fixed `accent-color` does
  not invert, so `#2a61e8` alone would have taken the control boundary from
  9.78:1 down to 3.23:1. Passing, but a regression. `#2a61e8` light (identical
  to `--accent`, and the light value does not move), `#7ea6ff` dark.

  | mode | ticked box | before | after |
  |---|---|---|---|
  | light | vs `#ffffff` | `#0075ff` 4.21:1 | `#2a61e8` **5.28:1** |
  | dark | vs `--card` | `#99c8ff` 9.78:1 | `#7ea6ff` **7.12:1** |

  The unticked box is a UA grey in both modes and does not move (4.54:1 /
  4.61:1). Both rows clear 1.4.11's 3:1 before *and* after — the "before" row
  is recorded rather than required to fail, because what it shows is precisely
  what a ratio cannot say.

  Harness: `screens-links-clients-0811/verify.mjs` reused, plus `sampleBox()`
  — every pixel Chromium painted inside the element's box, caller takes the
  extreme. `launcher-contrast-0811` warned that picking "whichever pixel looks
  like the border" is a way to get the answer you wanted; the extreme is a
  one-sided test, an upper bound on the boundary, so it can miss a failure but
  cannot invent one. Selectors are scoped to `.modal-bg` (the device grid
  stays mounted under an open dialog, so an unscoped `.card p` grades a device
  card), and that run's hierarchy check is carried forward as a check rather
  than a note — three picker rows verified distinct from the name above them.

  `/api/devices/:id/links` added to the shared stub, additively:
  `linkApprovals()` returns on the first `api()` rejection, so without it the
  📚 dialog never opens. `LINKS` itself was not grown — four other harnesses
  grade the links *screen* off it by `nth-child` — and
  `screens-links-clients-0811` was re-run after the change: 46/48, the
  documented baseline, unchanged.

  58/60 rows, exit 0; the two failures are the per-mode injected control rows.
  Eight screenshots. 152 tests / 151 pass — the documented baseline, unchanged
  (no server code in this step; `routing.test.mjs` needs express).

  **Not deployed.**

- **2026-08-11 — the token was measured on one surface and applied to every
  surface.** `wizard-controls-0811`. No CSS changed here: this is the
  re-measurement the run above wrote down for itself. `accent-color:
  var(--accent-control)` is declared on `:root`, i.e. globally, and was graded
  on exactly one screen — the approvals picker, where the checkbox sits on the
  modal's `--card`. The wizard is the other place the browser draws a control
  and its controls are **not** on `--card`: `.wz-step.wz-ticked` is `--sunken`,
  and so is `#wz-track label`, the two §2★ו track radios, which no run had ever
  measured. `--sunken` is *below* `--card` in dark (`#0d1626` vs `#131c2e`) and
  below white in light, so the two modes were not one question.

  **The token holds, and by more in dark than where it was chosen.**

  | control | mode | vs | ratio | on `--card` |
  |---|---|---|---|---|
  | checkbox, ticked | light | `#f7f9fc` | **5.01:1** | 5.28:1 |
  | checkbox, ticked | dark | `#0d1626` | **7.57:1** | 7.12:1 |
  | radio, selected | light / dark | `--sunken` | **5.01 / 7.57:1** | never measured |
  | radio, unselected | light | `#f7f9fc` | 3.64:1 | — |

  Both accented controls are asserted to be the right hue and are
  (`rgb(42, 97, 232)` / `rgb(126, 166, 255)`). The unselected radio at 3.64:1 is
  the narrowest control on the screen — a UA grey the console does not set,
  clearing 1.4.11, and the number to watch if `--sunken` is ever lightened.

  What the run **caught** is in the harness, and it is worth carrying forward.
  The first pass read the ticked checkbox as `rgb(0, 0, 0)`: 19.91:1 light,
  **1.16:1 dark**, which reads exactly like a dark-mode failure and is not a
  colour at all. The ticked step is the 7th of 12 and its box was below the
  fold; `getImageData` outside the canvas returns *transparent black* rather
  than raising, and that becomes `rgb(0, 0, 0)` once alpha is dropped — one
  non-measurement scoring 19.91 on a light surface and 1.16 on a dark one. The
  approvals run could not hit this (every control it graded was in a dialog
  shorter than the window) and would have been the next to. `sampleBox()` now
  scrolls into view, refuses a box still outside the viewport, and throws on any
  pixel with alpha ≠ 255.

  The wizard's **text** was graded in the same pass, which item 6's sweep had
  not covered: 14 rows per mode, narrowest `.wz-complete` at 4.57:1 (the
  `--chip-ok-ink` pair `chip-ink-0811` recorded at exactly that number).
  `#wz-complete` only renders when every step is ticked, so it is unhidden for
  the measurement and re-hidden — it is the one line saying the device is locked
  and how to get out. Three hierarchy checks pass.

  38/40 rows, exit 0; the two failures are the per-mode injected control rows.
  Two screenshots. 152 tests / 151 pass — the documented baseline, unchanged.

  **Not deployed** (nothing to deploy — no source changed).

- **2026-08-11 — the link colour was a brand token, and brand tokens do not
  invert.** `screens-enrol-settings-0811`. The last two screens item 6 names —
  **הוספת מכשיר** and **הגדרות** — in both colour schemes.

  **Both screens are clean.** No ratio on either is under threshold in either
  mode; the narrowest is `.alert-ok` at 4.57:1, the `--chip-ok-ink` pair
  `chip-ink-0811` recorded at exactly that number. That includes two things no
  earlier run had measured: the **placeholders** (5.34:1 light / 7.52:1 dark),
  which in three of the four fields are the only statement of the format the
  field wants, and the open-enrollment-codes table.

  What failed is a **global declaration** these screens merely exposed:
  `a { color: var(--accent) }`, and `--accent` is a brand colour that does
  **not** invert — **3.22:1** on the dark card. The `--label-ink` pattern
  exactly. Three such links exist in the console and all three are measured:

  | link | surface | dark, before | dark, after |
  |---|---|---|---|
  | the guide link, מסך הוראות הפעלה | `--card` | **3.22:1** ❌ | **7.12:1** |
  | `← חזרה לאתר`, the login card | `--card` | 3.22:1 ❌ | **7.12:1** |
  | **the install link**, inside `.alert-ok` here | `--chip-ok-bg` | 4.81:1 ✅ | **6.04:1** |

  Light mode does not move (5.28:1 before and after) — the defect was dark-only.

  **Two tokens, not one, and the third row is why.** `.alert-ok` is one of the
  light chips: its fill stays light on a dark card, so the one link that was
  already fine is the one sitting on a surface that does not invert — and a
  lightened ink on it is **2.18:1**. A single inverting token would have fixed
  two links and broken the third, which is also the one that matters most: the
  install link is what gets sent to whoever is holding the tablet.
  - `--link-ink` inverts. `#2a61e8` light (identical to `--accent`), `#7ea6ff`
    dark — the same value already chosen for `--accent-control`, deliberately,
    so the dark console keeps one blue.
  - `--chip-link-ink` does **not**, like the rest of the chip family. `#1f4fd8`
    rather than `--chip-accent-ink` (`#2a61e8`) for a measured reason: `.alert`
    is two families, and on `.alert-error`'s pink that value is **4.33:1** — a
    link added to an error alert would have failed silently. The chosen value is
    6.03:1 on `#dcfce7` and 5.43:1 on `#fee2e2`.

  `index.html` is unaffected — every `<a>` there is a `.btn`, a `.nav-links a`,
  the `.skip` link or `color:inherit`. Checked in the file rather than assumed.

  A harness correction the run forced: the field border on הגדרות was first
  measured after `page.fill`, which leaves the last field **focused**, and
  `.field input:focus` swaps the border to `--accent`. That number was the focus
  ring recorded as the resting border. Both are rows now — 3.30/3.42 at rest,
  5.28/3.22 focused.

  77/80, exit 0; the three failures are the two injected control rows and the
  dark "before" row, i.e. the defect, measured here rather than quoted. Six
  screenshots. 152 tests / 151 pass — the documented baseline, unchanged (no
  server code in this step).

  Found and **not** fixed, so it is not silently claimed: `a { text-decoration:
  none }` means those three links are distinguished from surrounding text by
  **colour alone** — WCAG 1.4.1, which no contrast ratio can answer. `:visited`
  was not measured either.

  **Not deployed.**

- **2026-08-11 — the links were distinguished by colour alone.**
  `link-underline-0811`. The one thing the run above wrote down as open rather
  than closed, and the only defect on these screens that no ratio can answer:
  `a { text-decoration: none }` meant the three in-text links differed from the
  text around them in **colour and nothing else**. The paragraph holding the
  guide link is `--muted` at 16px/400 and the link was 16px/400 too — measured
  in this run, so the claim is not "no underline" but "no difference except
  hue". Anyone who does not separate `--link-ink` from the ink beside it does
  not see that there is a link there at all.

  One rule in `css/style.css`:
  `p a:not(.btn), .alert a:not(.btn), li a:not(.btn) { text-decoration:
  underline; text-underline-offset: .2em }`.
  - **the global default stays `none`**, deliberately. Flipping it is the
    obvious move and it is wrong here: it draws a line under all seven sidebar
    items, under every `.btn` in the console and under five `.btn`s on the
    marketing page — a worse screen than the one this fixes. The three in-text
    links that exist all sit inside a `p` or inside `.alert`, and all three are
    measured rather than assumed.
  - `:not(.btn)` is kept even so, because a button *inside* running text is a
    shape that exists: `.plan a.btn` sits after `<ul><li>` on the marketing
    page. That row is graded.
  - navigation is **not** underlined and that is the same standard, not an
    exemption taken quietly: 1.4.1 is about telling a link apart from the text
    around it, and `.nav-links` / `.side nav` / `.skip` are not in text.
  - `text-underline-offset` rather than the default, for the descenders of the
    Hebrew face and for the install link, which is `word-break: break-all` and
    wraps mid-URL.

  Verified in `QA/kiosk/link-underline-0811/` — the property graded is
  `text-decoration-line`, which no earlier run measured, in both colour schemes
  against `warn-ink-0811`'s stub (unchanged: it serves the real `public/` and
  already answers the two `/api/enrollments` routes that paint `.alert-ok`).
  **Both halves are asserted** — a line where one belongs and no line where one
  does not — because an underline on every `<a>` is its own defect. 22/24, exit
  0; the two failures are the per-mode injected control rows, i.e. the replaced
  declaration re-measured here rather than quoted. Eight screenshots. 152 tests
  / 151 pass — the documented baseline, unchanged (no server code in this step).

  The decoration colour follows `color` in all eleven rows, so the previous
  step's two tokens survive into the line itself: `--link-ink` inverts
  (`rgb(42,97,232)` / `rgb(126,166,255)`) and `--chip-link-ink` does not
  (`rgb(31,79,216)` in both modes), which is why the install link's underline is
  the same blue in dark as in light.

  Found and **not** fixed: `:visited` is still unmeasured anywhere.
  `getComputedStyle` lies about it on purpose, so a real number needs pixel
  sampling on a genuinely visited link. What can be said from the file is that
  `a { color: var(--link-ink) }` is an author rule and overrides the UA's
  `:visited`, so the browser's purple never reaches the screen — a reading, not
  a measurement, and it stays open as one.

  **Not deployed.**

- **`:visited` measured — the reading above is now a measurement, and the
  console is unchanged by it.** 2026-08-11, `visited-link-0811`. The last open
  item under item 6 below, and the only property in this console that nine
  screen-by-screen runs could not see: `getComputedStyle` returns the
  **unvisited** style no matter what is painted, by design and as a privacy
  guarantee. So every link in the console has been graded without any run
  measuring what a person who has already clicked one actually sees.

  What is compared is the **rendered PNG of the link element**, byte for byte,
  in three states — `U` on a fresh profile before the href has ever been opened,
  `V` after genuinely following that link and coming back, `M` again with
  `a:visited { color: #ff00ff }` injected. `V === U` is the finding. `M !== V`
  is the control, and it is the half that makes the finding mean anything: it
  proves the link really was in the visited state when `U` and `V` were
  compared, where otherwise `V === U` is equally consistent with *nothing was
  ever recorded in history*. The grade is on the hash of the whole element and
  not on one pixel because the guide link opens with `📄` — its extremal pixel
  is black in light and white in dark, i.e. the emoji rather than the ink. That
  is reported as measured, with a note, not filtered out.

  **12/12, exit 0. Six control rows, six detected the visited state.** All three
  in-text links paint identically after being visited, in both modes. The
  install link is the same hash in *both* schemes — it sits on `.alert-ok`, a
  light fill that does not invert, which is exactly what `--chip-link-ink` was
  split off to do in `screens-enrol-settings-0811`; that is now one row measured
  twice rather than a claim. Printed alongside, while the control is painting
  the link magenta: `getComputedStyle` still says `rgb(42, 97, 232)` /
  `rgb(126, 166, 255)` / `rgb(31, 79, 216)` — the lie, recorded in-run.

  **The side finding is worth the run on its own.** `_probe.mjs`, kept in the
  run directory, tried five configurations: a self-link, `newContext()`,
  `launchPersistentContext`, the same with
  `--disable-features=PartitionVisitedLinkDatabase`, and headed on a real
  profile. **Only the headed one paints `:visited` at all.** A headless
  accessibility suite cannot see this property, so any future check of it has to
  be written headed — which is why this one is.

  Two harness corrections, both found by a failing run rather than reasoned
  about. (1) `warn-ink-0811/stub-server.mjs` never served `/docs`, which
  `src/index.js` mounts beside `public/`; invisible to a run that reads a link's
  colour and fatal to one that must *follow* it, because Chromium does not
  record an error page in history — the guide link's two controls failed on
  exactly that. Added additively, with `.md` as `text/plain` rather than
  `octet-stream`, since a download is not a navigation and is not recorded.
  `link-underline-0811` re-run after the change: 22/24, the documented baseline,
  unchanged. (2) `U` was the only sample taken on a cold profile with an empty
  font cache, and all three dark rows failed for that and not for `:visited`;
  the console is loaded twice before the `U` pass now and `shot()` waits on
  `document.fonts.ready`. A `diff()` was added at the same time — a hash
  mismatch alone cannot tell *`:visited` repainted this* from *these are not the
  same two screenshots*, and those are opposite findings.

  152 tests / 151 pass — the documented baseline, unchanged (no server code in
  this step; `routing.test.mjs` needs express).

  **Not deployed.**

- **every field in the console suppressed the browser's focus ring, and what
  replaced it was invisible in dark mode.** 2026-08-11, `focus-ring-0811`. Every
  contrast run here so far graded the console *at rest* — what a colour is when
  nothing is focused — and not one of them pressed Tab. The two rules that decide
  what a keyboard user sees both opened with `outline: none`
  (`.field input:focus, .field select:focus, .field textarea:focus` and
  `.hl-new:focus`), and what stood in for the ring was a border-colour swap to
  `--accent`. Measured, that swap is **1.60:1** in light and **1.06:1** in dark —
  the second of those is not a faint indicator, it is no indicator: someone
  navigating the console by keyboard in dark mode could not tell which field they
  were in, on every screen including the login form. WCAG 2.4.7 is Level A.
  - `--focus-ring`, and it is **not one value**. Light is `--accent` itself
    (5.28:1 measured on the white card). Dark is `--accent-control` — the
    lightened blue already chosen for controls in dark by
    `screens-approvals-code-0811` — at 7.12:1, because `--accent` against the
    *paler* dark border `#61708f` is the 1.06:1 that is the bug.
  - `outline`, not `border`: a border grows the field by 2px on every focus, and
    an outline follows `border-radius`, costs no layout, and **is painted in
    Windows high-contrast mode**, where the `box-shadow` ring
    `button-boundary-0811` gave the buttons is not.
  - the border-colour swap is **kept**. It is a second cue and not the one
    carrying the indicator; removing it would change the console's look further
    than an accessibility fix needs to.
  - `.modal` and `.main` both declare `overflow: auto`, so a ring at
    `outline-offset: 2px` is a clipping risk — checked rather than assumed: both
    carry ≥28px of padding, so 4px of ring is nowhere near an edge.

  Verified in `QA/kiosk/focus-ring-0811/` — six controls (text, `select`,
  `number`, `password`, `.hl-new`, and the login field) across four screens in
  both colour schemes, against `warn-ink-0811`'s stub, which serves the real
  `public/`. **24/24, exit 0.** Twelve screenshots of the focused state.
  152 tests / 151 pass — the documented baseline, unchanged (no server code).

  Three things about the method, because this is the first run here that grades a
  *state change* rather than a resting colour. The clip is in page coordinates
  and expanded by 8px, not `elementHandle.screenshot()` — that one crops to the
  border box, which is exactly where an `outline` is not. The surface under the
  ring is read from the pixel actually painted in the unfocused shot rather than
  from the token, because with an offset the ring lands on whatever is behind the
  control. And the grade is the **best** of three cues (ring, border swap, fill
  swap) rather than the ring alone, so a control cannot pass on a ring while the
  credit belongs to the border, or fail while a visible fill change is on screen.

  The twelve control rows re-inject `outline: none` and are required to come out
  **under** 3:1; all twelve do. They are what makes this measurable at all: a
  pixel diff was **not** enough here, because the border and fill did move a
  little before the fix, so "did anything change" passed in both states and
  measured nothing. Each control row records that in as many words.

  Found and **not** fixed: the selector is `:focus` and not `:focus-visible`, so
  the ring shows for a mouse click too — correct for text fields, and stated
  rather than left implicit. And the console's other focusable things (buttons,
  links, checkboxes, the sidebar) declare no focus style at all and so fall back
  to the UA ring. That is probably sufficient, but it is a reading and not a
  measurement, and **focus order itself (2.4.3) has never been checked**.

  **Not deployed.**

- **the whole navigation was unreachable by keyboard.** 2026-08-11,
  `nav-keyboard-0811`. Item 7 named this as the first thing to measure under the
  keyboard heading, and what it had was a *reading* off the markup: `<nav
  id="menu">` held seven `<a data-view=…>` with no `href`, and logout was an
  `<a class="btn">` with no `href` either. An `<a>` without `href` is not a link
  and is not focusable, so **every one of the console's seven screens, plus
  logging out, was mouse-only** — WCAG 2.1.1, Level A. It is not a contrast
  question: no colour value makes an element that is not in the tab sequence
  reachable.
  - they are `<button type="button">` now. `<a href>` is not the fix — these
    swap a view inside the page and change no URL, so `button` is the correct
    semantics, and it is also the element the platform gives `Enter`, `Space`
    and a place in the tab order without a line of code. `.side nav a` became
    `.side nav button` plus an `appearance/background/border/font/width/
    text-align` reset; every other declaration is byte-identical, so the look
    does not move. `closest('a[data-view]')` became `closest('[data-view]')`.
  - **`--focus-ring-navy`, one value with no dark partner** — the same decision
    as `--btn-light-edge`. The sidebar is `--navy` (`#071a33`) in *both* modes,
    so a ring that inverts with the theme is painted right once and on the wrong
    colour once. The light `--focus-ring` (`#2a61e8`) measures **3.30:1** there:
    over 3:1 by a hair, and on the active item it is nearly the fill colour
    itself. Measured after: **7.29:1**, in both modes.
  - `:focus-visible`, not `:focus`. On a text field a ring after a mouse click
    is right — the caret is already there; on a nav button it is noise.

  Verified in `QA/kiosk/nav-keyboard-0811/` — **50/50, exit 0**, both colour
  schemes, against `warn-ink-0811`'s stub. The tab sweep finds all seven targets
  at stops #1–#7 of 37 and in DOM order (2.4.3); `Enter` and `Space` both route;
  the ring is graded on the pixel actually painted behind it. Focus is taken
  **by Tab and never by `el.focus()`** — the rule under test is
  `:focus-visible`, which a scripted focus does not always match.

  **The control is the previous markup, re-injected into the live page**: same
  classes, same text, same order, `<button>` back to `<a>` with no `href`. All
  eight are then absent from the sweep *and* refuse an explicit `focus()` — the
  sweep alone cannot tell "not in the order" from "not focusable", and
  `tabindex="-1"` is the difference. 30 other stops survive, so the control did
  not remove more than it meant to.

  Three harness defects, each found by a failing run rather than reasoned about,
  and each of a kind worth carrying into the next keyboard step. (1) **The tab
  order is a ring** — a fixed press count reports the early stops a second time,
  and that is what made the control rows first claim the old markup was
  reachable; what they had found was the new markup's second lap. (2) **An index
  into the recorded array is not a number of key presses** — a stop whose key is
  null is dropped from it, so `indexOf + 1` landed every ring measurement on the
  *next* nav item. Tab now presses **until** the target is focused. (3)
  **`blur()` does not move the sequential focus navigation starting point**; a
  click leaves it on the element clicked, so `devices` was reached after 38
  presses instead of one.

  Four earlier harnesses select `.side nav a[data-view=…]`
  (`focus-ring-0811`, `link-underline-0811`, `screens-enrol-settings-0811`,
  `visited-link-0811`); they were moved to `.side nav [data-view=…]` in the same
  commit so they stay runnable.

  152 tests / 151 pass — the documented baseline, unchanged (no server code in
  this step; `routing.test.mjs` needs express).

  **Not deployed.**

- **a dialog could be on screen while the keyboard was still on the page behind
  it.** 2026-08-11, `dialog-focus-0811`. The console does not use `<dialog>`:
  `modal()` appends a `.modal-bg` into `#modal-root`, a sibling of `#app-view`,
  so the platform gives it nothing — no top layer, no focus move on open, no
  Escape, and Tab walks the card underneath. The only way out was the backdrop
  click, which is a mouse. Every destructive confirmation here is one of these,
  so someone reading `לאתחל את המכשיר?` had their focus on `♻️ אתחל` beneath it.
  In `public/js/app.js`, on `modal()` itself rather than at forty call sites:
  - **focus goes to the box, not to the first control.** The first control is
    `כן, בצע` in every confirmation here, and landing there puts a reboot or a
    delete one Space away from somebody who was only tabbing. A dialog that
    opens to *take* a value is the opposite case and gets its field, where
    focusing types nothing.
  - the focusable set is **recomputed on every press**, never cached: the wizard
    redraws its own list after each tick, and `offsetParent` drops what is
    hidden — the exit-code dialog and the wizard both toggle `.hidden` sections
    in place.
  - the handler is on `document` in **capture**, so a field inside the dialog
    that swallows the key (the domain editor's `Enter` is one) cannot take
    Escape or Tab first; and only `#modal-root.lastElementChild` acts, or two
    open dialogs would both `preventDefault` and fight over where focus lands.
  - the teardown is on **`bg.remove`**, the one method every close path in the
    file already calls, so the listener cannot outlive a dialog nobody can see —
    and `closeModals()` is `.remove()` per child rather than `innerHTML = ''`
    for the same reason. Focus returns to the opener **only if it is still
    connected**: a save reloads the device list, and `focus()` on a detached
    node silently sends focus to `<body>`, i.e. back to the top of a long
    column of cards.
  - the `<h3>` every dialog opens with becomes its accessible name
    (`aria-labelledby`), beside `role="dialog"` / `aria-modal="true"`.

  Verified in `QA/kiosk/dialog-focus-0811/` — **42/42, exit 0**, both colour
  schemes, against `warn-ink-0811`'s stub. Three dialogs for the three shapes
  `modal()` tells apart (destructive confirmation, value-taking, controls but no
  field): focus lands where intended, Tab ×24 — several laps of the largest —
  stays inside, Shift+Tab off the first control wraps to the last, Escape
  closes, focus comes home. Focus is taken **by Tab and never by `el.focus()`**,
  since the subject is a keydown handler that a scripted focus does not run.

  **The control is the previous behaviour rebuilt in the same live page**: the
  same markup appended to `#modal-root` by hand, without `modal()`. All three
  "before" rows fail in both modes — focus stays on the button underneath, all
  six Tab presses land on the card behind, Escape does nothing.

  A harness defect, found by a failing run and worth the line because of which
  direction it failed in: the first run was 36/42 with every "focus came home"
  row red while its own value column named the correct button. The expectation
  had been written out by hand alongside the `WHERE` that produces it, and the
  two descriptions drifted. A red harness over a green fix is what gets a
  working change reverted.

  Found and **not** fixed: the page behind an open dialog is not `inert`. The
  trap covers Tab and Shift+Tab, which is what a keyboard user does, and
  `aria-modal="true"` is what AT reads — but neither makes the cards behind it
  actually unreachable. Closed by the entry below.

  152 tests / 151 pass — the documented baseline, unchanged (no server code in
  this step; `routing.test.mjs` needs express).

  **Not deployed.**

- **the page behind an open dialog was still there.** 2026-08-11,
  `dialog-inert-0811`. The line the entry above left open. `aria-modal="true"`
  is a promise to AT, not a fact about the DOM: measured, the device card's own
  buttons were still in the browser's accessibility tree behind
  `לאתחל את המכשיר?`, and still took a scripted `focus()` — which is what a
  screen reader's virtual cursor and a Ctrl+F → Enter both end in, neither of
  them ever pressing Tab. `public/js/app.js` now sets `inert` on `#login-view`
  and `#app-view` from `syncInert()`, called by `modal()` after the append and
  by `bg.remove` / `closeModals()` after the removal. Three decisions in it:
  - **driven off `#modal-root.children.length`, not a boolean.** A flag set on
    open and cleared on close un-inerts the page when a dialog opened *on top
    of* another one closes, while the first is still on screen.
  - **`#toast-root` is deliberately left out.** It is the live region that
    announces what a dialog's save did, and `inert` removes a subtree from the
    accessibility tree — it would silence the message the dialog produced.
  - **`syncInert()` runs before `opener.focus()`** in `bg.remove`. `focus()`
    inside an inert subtree is a no-op that does not throw: the wrong order
    would silently drop focus to `<body>` and reintroduce the defect the entry
    above fixed. Asserted as a pair.

  Verified in `QA/kiosk/dialog-inert-0811/` — **28/28, exit 0**, both colour
  schemes. The accessibility rows are read through the browser's real tree
  (`page.accessibility.snapshot()`), not a selector query, which would answer
  "still there" for both states and measure nothing. `dialog-focus-0811` re-run
  against the changed `modal()`: **42/42**, unchanged — it owns the Tab trap and
  the return of focus to the opener, the two things this step could have broken.

  **The control is the previous behaviour produced in the same live page**: the
  attribute taken off by hand with the dialog still open and the backdrop still
  on screen. Both rows flip back in both modes — the button returns to the
  accessibility tree, and `focus()` on it takes, leaving a control underneath an
  open confirmation focused.

  Found and not fixed: `inert` has **no fallback** here. Every current browser
  ships it and the console is an internal tool, but there is no polyfill and no
  feature test, so a browser without it keeps the old behaviour silently.

  152 tests / 151 pass — the documented baseline, unchanged (no server code in
  this step; `routing.test.mjs` needs express).

  **Not deployed.**

- **a screen change left nobody focused.** 2026-08-11, `screen-focus-0811`. The
  last thing open under item 7's keyboard heading. `route()` replaces the whole
  of `#content`, and the control that asked for the change is often *inside* it
  — `➕ הוספת מכשיר` on the devices screen, `🚀 אשף התקנה` on the guide screen.
  Removing the node that holds focus drops focus to `<body>`: after the screen
  change nothing is focused, so a screen reader announces nothing and there is
  no position to press Shift+Tab back from. `public/js/app.js` gains
  `focusNewScreen()` and `route(view, fromUser)`:
  - **focus goes to the new screen's `<h1>`, not to its first control.** The
    first control is `רענון` on one screen and a submit on another, and landing
    on a control puts it one Space away — the same rule `modal()` follows. A
    heading also names the screen, which is what a route change otherwise
    leaves unannounced.
  - **`fromUser` is what tells a screen change from the boot render.** At login
    nothing holds focus yet, and dragging it to a heading there would push the
    page past the login pill and the sidebar before anyone pressed a key. The
    five in-page routers (`#add`, the two `#go` buttons, the guide's per-device
    button, the sidebar) pass it; `route('devices')` at boot does not.
  - it is a **MutationObserver**, not a call in each view function: three of the
    seven `await` before they mount (`viewEnroll` loads the link library first),
    so `route()` cannot find the heading synchronously — and a per-view call is
    seven places to forget on the eighth screen.
  - **`childList` without `subtree`.** Every in-screen redraw — `renderDevices()`,
    the links table, the codes box — replaces the children of a box *inside*
    `#content`, and pulling focus back up to the heading on every list refresh
    would fight the person using the screen. Only a whole-screen mount is a
    direct-child change. That is the row `subtree: true` fails.
  - `.topbar h1:focus-visible` and not `:focus`: a heading is not a control, so
    a mouse user gets no ring and a keyboard user does — the browser matches
    `:focus-visible` on a programmatic focus by how the last input arrived.

  Verified in `QA/kiosk/screen-focus-0811/` — **32/32, exit 0**, both colour
  schemes, against `warn-ink-0811`'s stub. Six screens activated by `Enter` on
  a nav button all land on their own `<h1>`; the ring is 4.93:1 light / 7.83:1
  dark on the surface actually painted behind it; a mouse click focuses the
  heading with `outline: none`; and `renderDevices()` leaves focus on `רענון`.

  **The control is the previous behaviour in the same live page**: `route(view)`
  without the flag is byte-for-byte the shipped path. Focus falls to `<body>` in
  both modes.

  A correction the run forced, and the reason the control row is worth its line:
  the harness first asserted that the next Tab restarts at the top of the
  document, and failed. **It does not, in Chromium** — removing the focused node
  leaves the *sequential focus navigation starting point* where that node was,
  so a forward Tab continues into the new screen anyway. That row is now a
  recorded measurement rather than a claim, and what is fixed here is the cost
  that was really there: `activeElement` is `<body>`.

  Re-run against the change: `nav-keyboard-0811` **50/50**, `dialog-focus-0811`
  **42/42**, `dialog-inert-0811` **28/28** — all unchanged. 152 tests / 151 pass,
  the documented baseline (no server code in this step).

  **Not deployed.**

- **every other control in the console had no focus ring** — five runs closed
  the keyboard heading's other halves and between them gave an explicit
  `:focus-visible` to exactly three things: `.field input`, `.side nav button`,
  `.topbar h1`. Everything else fell back to the UA ring — every ✏️ עריכה,
  every 🗑️, every save button in every dialog, the guide's in-text link, the
  wizard's twelve checkboxes. That is not the same as "fine":
  - `outline-style: auto` **is not a colour you can read**. `getComputedStyle`
    returns the style; the ring Chromium paints for `auto` is its own two-tone
    construction. So every harness under items 6 and 7 — all of which graded
    colours off computed style — was structurally unable to see this one, which
    is exactly why it survived to be the last thing left.
  - the UA ring follows **`color-scheme`**, which this console sets on `:root`.
    Its colour is therefore the browser's answer to a question `--focus-ring`
    already answers, and nothing makes the two agree.
  - the fix is one rule, scoped to `#content` and `.modal`:
    `outline: 2px solid var(--focus-ring); outline-offset: 2px`. `outline` and
    not `box-shadow` — `.btn`'s existing edge (`--btn-light-edge`) is already an
    inset shadow and a second one overwrites it, `outline` takes no space in the
    packed `.btn-sm` row inside a device card, and it is the one thing painted in
    Windows high-contrast mode. `--focus-ring` and not `--focus-ring-navy`
    because the ring lands *outside* the control, on the card or the page —
    surfaces that invert, unlike the sidebar.
  - the scope stops at the console **on purpose**: `.btn` also exists on the
    marketing page, where `.btn-ghost` sits on a navy bar. That is the case
    `--focus-ring-navy` was created for and it is its own measurement.

  Verified in `QA/kiosk/content-focus-0811/` — five controls × both
  `colorScheme` values in a real Chromium against the stub that serves the real
  `public/`, each reached by **Tab** so `:focus-visible` matches the way it does
  for a person. 40/40, with ten control rows (`outline: revert`, i.e. the
  shipped UA `auto`) confirming there was a defect to fix. 152 tests / 151 pass
  — the documented baseline, unchanged; no server code here.

  Two corrections the run forced: the first version failed all six button rows
  reporting `solid 0px`, because `.btn` carries `transition: .15s` on **all**
  properties and a computed read in the tick focus lands returns where the
  transition started — `button-boundary-0811` paid for the same thing on
  `color`. And the surface probe started at the control itself, so it returned
  the button's own fill and graded the ring against the thing it is drawn
  outside of.

  Found and **not** fixed, so it is not silently claimed: the pixel sample is a
  max over an 8px band, so a dark neighbouring element can satisfy the 3:1 in
  place of the ring — it did on two rows. The strong claim rests on the computed
  `solid 2px` in `--focus-ring`'s value; a harness that wants to grade the ring
  alone has to sample only the band at the ring's own offset and width.

  **Not deployed.**

- **the marketing page's focus ring (the scope line the step above left)** — the
  `#content` / `.modal` rule stops at the console on purpose, so every control on
  `index.html` still had no `:focus-visible` rule: the skip link, the four nav
  links, כניסת לקוחות, both hero calls to action, the three pricing buttons, the
  closing band's button and the footer link. That is the page `more30.com/kiosk`
  opens — the first thing in this system a keyboard user meets. Three rules in
  `css/style.css` plus one token:
  - **three rings, not one.** The ring sits at `outline-offset: 2px` *outside*
    the control and is therefore graded against what is behind it, and this page
    has three kinds of surface: navy that does not invert (nav bar, hero, footer,
    and the skip link which opens over the nav) → `--focus-ring-navy`; the
    pricing card, which is `--card` and does invert → `--focus-ring`, the same as
    the console; and the closing band, a fixed brand gradient →
    `--focus-ring-band`.
  - `--focus-ring-band` is the one new token and it was not avoidable:
    `--focus-ring-navy` on the `--accent`→`#6d4bff` gradient is **2.88:1** at the
    blue end and **2.14:1** at the purple one, i.e. the ring chosen against the
    navy falls under 3:1 on precisely the page's last call to action. White is
    6.87 / 5.12, and is already the colour that button is outlined in.
  - `.nav` is `rgba(7,26,51,.85)` over a page background that inverts, so the
    surface had to be **composited** rather than read — every console surface
    graded so far was opaque. Measured 4.77:1 light, 7.45:1 dark.

  Verified in `QA/kiosk/landing-focus-0811/` — a real Chromium at both
  `colorScheme` values against the `warn-ink-0811` stub (it already serves the
  real `public/` and answers `/` with `index.html`), 90/90, with 18 control rows
  confirming the UA `auto` that was there before. Six screenshots.

  What the run turned up that was not known: **in dark mode the UA ring was
  invisible on the navy.** Chromium paints `auto` dark when `color-scheme` is
  dark, so the "before" rows measure **1.07:1** for the nav's `.btn-ghost` and
  **1.22:1** for the hero's — so on those two controls this is not only the
  "unowned, unmeasurable value" argument of `content-focus-0811`, it is no focus
  indicator at all. The same controls in light mode were white at 15.5:1, which
  is why a single-mode run would have seen nothing.

  Two harness corrections the run forced, both recorded in `_results.md`: the
  ring is now identified **by its own colour** rather than as the strongest pixel
  in the band — the skip link opens at `inset-inline-start: 0`, which in RTL is
  the top *right* corner where the white `◈ KioskFleet` wordmark sits, so the
  strongest pixel within 5px was a letter of the brand at 11.40:1 and the row
  would have passed with no ring painted at all. And the harness's `rgb()` reads
  decimal runs, so it parsed the `#7ea6ff` token as `[7, 6]` and every
  ratio-against-a-token came out `NaN`.

  Found and **not** fixed: below 901px `.nav-links` is `display: none` with no
  hamburger behind it, so on a phone those five controls are not merely
  unreachable by keyboard — they do not exist. That is a navigation question,
  not a focus one, and its own step.

  **Not deployed.**

- **the marketing page had no mobile navigation (the step above's last line)** —
  below 901px `.nav-links` was `display: none` and there was nothing behind it,
  so the four nav links and כניסת לקוחות were absent from the layout, from the
  tab order and from the accessibility tree. Not a focus question and not a
  contrast one: on a phone those five controls did not exist, on the page
  `more30.com/kiosk` opens, and one of the five is the only route from it into
  the customer console. Added `#nav-toggle` + the panel in `public/index.html`,
  `public/css/style.css` and an inline script:
  - the toggle carries **no colour of its own**. It is `.btn .btn-ghost
    .btn-sm` — the control כניסת לקוחות already uses on this same bar, whose
    `.45` border was measured there at 3.67:1. A new control with a new value
    would have been another colour decision on a composited surface, and this
    step does not need one.
  - the open state is `data-open` on the element and the rule that paints it
    lives **inside** the `max-width: 900px` block. Above 901px `.nav-links` has
    to be its horizontal row again even if the attribute is still set, so an
    open panel that survives a resize cannot break the wide layout — and the
    script clears it on the crossing anyway, because `aria-expanded="true"`
    would otherwise describe a control nobody can see and would come back down
    with the next resize.
  - `display: none` and not opacity or zero height: a closed panel leaves the
    tab order, not only the eye. Otherwise it is five tab stops on controls
    that are not on screen.
  - Escape closes **and hands focus back to the toggle**. Without the return,
    focus sits on a link that has just become `display: none`, i.e. on
    `<body>` — the state `screen-focus-0811` fixed elsewhere.
  - `aria-expanded` and the painted state are written by one function on
    purpose, so they cannot disagree; the QA reads them separately so that it
    could see them disagree.
  - **the `min-width: 901px` bound on the login pill's reservation is gone.**
    That bound rested on there being nothing at the inline-end below it, which
    was true only because `.nav-links` was hidden there — and the toggle now
    sits in exactly that corner. The pill is fixed at every width
    (`auth-button.js` only moves it to 10px/8px under 480px), so the
    reservation belongs at every width; below 1180px the gutter term clamps to
    0 and the value is the inset itself, so the wide layout does not move.

  Verified in `QA/kiosk/mobile-nav-0811/` — 38/38 in a real Chromium at both
  `colorScheme` values and both widths, against the `warn-ink-0811` stub, with
  four "before" rows rebuilding the shipped state in the same live page. The
  pill is **simulated** at the geometry `auth-button.js` writes before its own
  measurement (96×36, `--more30-auth-inset: 118px`), because the real script is
  blocked from this machine; the control row puts the old `20px` back and
  asserts `elementFromPoint` returns the pill. Eight screenshots. 151/152 on
  `node --test` — the documented baseline, unchanged because this step touches
  no server code.

  Found in that run and fixed: the toggle was **33px**, which clears WCAG
  2.5.8's 24px but not the 44px the panel's own items got — and it is the only
  control through which they are reached. `min-height: 44px`, inside the mobile
  block only, so `.btn-sm` elsewhere does not move.

  Three harness corrections the run forced, all recorded in `_results.md`:
  `blur()` does **not** send the next Tab back to the top of the document
  (`screen-focus-0811`'s fact, from the other direction — the first sweep here
  opened two thirds down the page and reported a three-stop ring with the nav
  in none of it; focusing `<body>` is what moves the starting point). Five
  `tabTo()` calls are **not** five positions — each resumes where the last
  stopped, so the order came out `1, 1, 1, 1, 1`, and order is a property of
  the sequence, so one sweep is recorded instead. And within that sweep the
  fallback key has to carry the element's position in the document, or the two
  `.btn-light` buttons in the pricing table share a key and a break in the
  middle of the ring is reported as a complete one.

  Found and **not** fixed: the panel is not a focus trap, and that is the
  decision rather than an omission — it is a disclosure, not a dialog, so Tab
  from its last item continues into the page.

  **Not deployed.**

- **the console had no mobile navigation either (the scope line above)** — below
  801px the whole of `.side` was `display: none` with nothing behind it, so on a
  phone the seven view buttons, the signed-in name, the device quota **and
  התנתקות** were absent from the layout, from the tab order and from the
  accessibility tree. Whoever signed in on a phone landed on המכשירים שלי and
  could not change screen or sign out at all. That is the same defect the
  marketing page had one step earlier, and it is worse here because what went
  missing includes the way *out* of the session. Added `.side-head` +
  `#side-toggle` + `#side-panel` in `public/console.html`, the `max-width: 800px`
  block in `public/css/style.css`, and an inline script:
  - the toggle carries **no colour of its own** — `.btn .btn-ghost .btn-sm`, the
    control התנתקות already uses on this same `--navy`. A new control with a new
    value would be another colour decision, and this step does not need one. It
    does need its own `:focus-visible` rule: `.side nav button` and
    `.side .userbox .btn` each name their element, so without it the one control
    through which the whole navigation is reached on a phone falls back to the
    UA ring — 1.07:1 in dark mode, as `landing-focus-0811` measured on navy.
    Measured 7.29:1 here.
  - the open state is `data-open` on the panel and the rule that paints it lives
    **inside** the media query, so an open panel that survives a resize cannot
    break the 250px column; the script clears the ARIA on the crossing anyway.
    `display: none` and not opacity: a closed panel leaves the tab order, not
    only the eye.
  - **choosing a screen closes the panel and does not touch focus.** This is the
    console's own case and the marketing page had nothing like it: `route()`
    already moves focus to the new screen's `<h1>` (`focusNewScreen()`), so
    returning focus to the toggle here — which is exactly what Escape must do —
    would fight it. The listener sits on `#side-panel`, an *ancestor* of
    `#menu`, so it runs after `app.js`'s own handler on the way up and the
    button is still in the DOM when that reads `dataset.view`.
  - the script is a **second inline block, not `js/app.js`**: this is the page
    shell, and it has to work when `app.js` fails its first call — otherwise the
    one control that gets you out of that state (התנתקות) is behind a panel
    nobody can open.
  - `.side-head` reserves room for the shared more30 login pill. The console
    reserved none anywhere, and that was survivable only because nothing sat at
    the inline-end; the toggle now sits exactly in the RTL top-left corner the
    pill is fixed to. There is no centred container here, so there is no gutter
    to subtract — only `.side`'s own 16px, with a 12px floor.

  Verified in `QA/kiosk/console-mobile-nav-0811/` — 70/70 in a real Chromium at
  both `colorScheme` values and both widths, against the `warn-ink-0811` stub,
  with eight "before" rows rebuilding the shipped state in the same live page.
  The pill is **simulated** at the geometry `auth-button.js` writes before its
  own measurement (96×36, `--more30-auth-inset: 118px`), because the real script
  is blocked from this machine; the control row removes the reservation and gets
  `elementFromPoint → qa-pill`. Eight screenshots.

  Two harness corrections the run forced: a flex item's `display` is
  **blockified**, so the toggle's declared `inline-flex` reads back as `flex` and
  the first version of that row failed correct CSS. And `screenshot`'s `clip` is
  in page coordinates while the Tab sweeps scroll — the open-panel shot first
  came back showing the bottom of the panel and none of the navigation it exists
  to show.

  Found and **not** fixed: the panel is not a focus trap, the same decision as on
  the marketing page — it is a disclosure, not a dialog.

  **Not deployed.**

- **the device card at 390px, and the timestamp it read backwards** — the step
  above left this as a layout line: `console.html` is the only one of the three
  pages ever driven at a phone width, `.device-grid`'s `minmax(300px, 1fr)` was
  shown to fit, but the thirteen `.btn-sm` buttons inside a card had never been
  measured there, and `clients-console-0811` had already found a column of
  buttons running off a card's edge once. Measured, and **the width question is
  nothing**: the column is 322px, the card's content box 320px, every button sits
  inside it on both edges, `scrollWidth` equals `innerWidth`, the `.topbar`'s
  no-wrap flex fits because its button group wraps, and every button clears
  2.5.8's 24px. A **73-character** customer URL injected into `.meta` — the one
  input the stub could not supply — wraps and stays in the card.
  - four groups therefore pass by describing correct CSS, which is
    indistinguishable from a run that measured nothing, so there is a **control**:
    `.actions`'s `flex-wrap: wrap` is the one declaration making thirteen buttons
    fit a 284px row, and removing it in the same live page rebuilds exactly the
    `clients-console-0811` shape — spill goes to **+507.6px** at 390 and +397.6px
    at 1200. The check can fail.
  - what the run **did** find is not a width defect and no harness under items 6
    or 7 could have seen it. The 390px screenshot showed the last-seen line as
    `4:40:00 ,11.8.2026` — **the time before the date**.
    `toLocaleString('he-IL')` returns two digit runs separated by a comma *and a
    space*; UAX #9 folds a comma between two numbers into the number run, but
    only as a single separator, so the space breaks that and two
    European-number runs inside an RTL paragraph are ordered right-to-left like
    any other pair. Same defect as `ota-window-0811`'s `06:00–04:00`, hidden for
    the same reason: the string, the DOM and `innerText` are all correct and only
    the painted order is wrong.
  - fixed with `<span dir="ltr">`, which is `unicode-bidi: isolate` from the UA
    stylesheet — the same LRI…PDI, and the shape the two lines directly above it
    in the same `.meta` block already use for URLs, so it is the block's existing
    convention rather than a new one.
  - graded by **geometry**, since no computed value can express it: `Range`
    rectangles over the two digit runs. The `before` rows unwrap the isolate in
    the same live page and assert the two swap back (`date x=260.9, time x=213.8`
    against `date x=213.8, time x=274.9` after), at both widths in both modes.
    The probe walks text nodes rather than reading the span, so it reads the
    fixed shape and the shipped one without knowing which it is looking at.

  Verified in `QA/kiosk/device-card-390-0811/` — 268/268 in a real Chromium at
  both `colorScheme` values × 390px and 1200px, against the `warn-ink-0811` stub.
  Four screenshots. 151/152 on `node --test` — the documented baseline, unchanged
  because this step touches no server code.

  Found and **not** fixed: the long URL wraps on **Chromium's** break opportunity
  after `/` and `-`, not on a declaration — nothing sets `overflow-wrap` on
  `.meta`, so a long unbroken host would still overflow. And the login pill is
  simulated here as everywhere else on this machine.

  **Not deployed.**

- **the one URL field that was never told which way to read** — the sweep above
  ended on a limit, not a defect: a `Range` cannot enter an `<input>`, so the
  console's URL fields were "right by declaration (`dir="ltr"`) and not by
  measurement". That declaration has been the **fix** three times now
  (`06:00–04:00`, `4:40:00 ,11.8.2026`, and the two before them), so trusting it
  on the one class of element no probe could look inside was the weakest thing
  left. Measured, and one field does not have it: `promptUrl()` — the
  **🔗 החלף אתר** dialog on every device card — declares `<input id="u" …/>`
  with **no `dir` at all** and so inherits the page's `rtl`. With
  `https://hadar.example.com/event/12/` in it the **last** character painted
  7px *left* of the first: the trailing `/` of a pasted URL sat at the wrong end
  of the field. `#h` in `editDevice()` holds the **same value** — `d.homeUrl` —
  and has had `dir="ltr"` since `display-url-console-0811`. One attribute.
  - the field feeds `set_url` to a locked tablet, so it is read by someone
    checking an address before pushing it to a device in a hall — which is
    exactly the state in which a wrong address looks right.
  - **the measurement is the selection highlight.** A `Range` cannot span an
    input's value, so a character's painted position is unreachable from the
    DOM; the browser paints the *selection* at that position, so
    `setSelectionRange(i, i+1)` under a `::selection` colour nothing else uses
    turns one character into a band of known pixels and a screenshot says where
    it landed. The marker sets `background` **and** `color` to one value, so the
    band is the character's box rather than the inked part of a glyph, and the
    input has to be focused or Chromium paints the selection grey — a colour the
    console already uses.
  - graded as **first character left of last**, not as a token sweep. Every
    value here is one logical left-to-right string, so the single comparison
    catches a run that swaps, a trailing neutral that jumps to the far end, and a
    value painted wholly backwards — and it is the only comparison that survives
    not knowing where the browser broke the string, which inside an input cannot
    be inspected. The URLs end in `/` on purpose: a trailing neutral takes the
    paragraph's direction (N2), which is the shape that moves a character to the
    opposite end.

  Verified in `QA/kiosk/input-rtl-0811/` — 20/20 in a real Chromium in both
  modes across nine fields in three dialogs and three screens, with **two**
  negative rows rebuilt in the same live page: the defect's own "before", and a
  field that ships correct with its `dir` removed. Both come back at −7.0, so
  eight rows that pass by describing a correct declaration are not
  indistinguishable from a probe that measured nothing. Four screenshots.
  151/152 on `node --test` — the documented baseline, unchanged because this
  step touches no server code.

  Found and **not** fixed: only the first and last character are measured, so a
  value whose *middle* reorders while its ends do not would pass — nothing in the
  console has that shape today. `#login-user` has no `dir` either and could not
  be focused here (the login card is behind `if (TOKEN) boot()`); a username is a
  single L run with no trailing neutral, so the shape that bit `#u` does not
  apply, but it is unmeasured. And `promptUrl`'s **label** interpolates a host
  into a Hebrew sentence — `console-rtl-0811` swept nine views and this dialog
  was not one of them.

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
   `public/js/app.js` write colours inline too. **That half is now closed** —
   `danger-text-0811` swept every colour literal in both files; four exist, three
   were the same defect and are fixed. What is left under item 6 is the console's
   own screens, not its inline colours.
6. The console's own screens, other than the wizard, have still had no pass:
   `nontext-contrast-0811` onward each opened one dialog. Both modes have to be
   graded there, per the above, and `index-contrast-0811/verify.mjs` is the
   harness to reuse — it is the one that grades both, folds `opacity` into the
   foreground, and reads an inset ring rather than mistaking a fill for a
   boundary. **`css/style.css`'s own literals are now swept** — `label-ink-0811`
   found the one that sat on an inverting surface (`.field label`, 1.75:1 dark,
   every label in the console) and fixed it. What that sweep left is the **light
   chips**, which fail equally in both modes and so are a different question:
   `.pill.off` is 4.38:1 at 12px/600, and `.pill.on` / `.alert-ok` / `.hl-tag` /
   `.code-chip` are the same decision and have to move together. That is the
   next thing under this heading, ahead of the screen-by-screen pass.
   **The light chips are now closed** — `chip-ink-0811` moved all five together
   as one token family; `.pill.off` was the one under 4.5:1 and the other four
   are tokenised without moving, with their margins recorded. What is left under
   this heading is the screen-by-screen pass itself, and **two of its four
   screens are now done**: `screens-links-clients-0811` graded ספריית קישורים and
   מזהי לקוח in both modes and fixed `.serial`, which was rendering the client's
   internal note identically to the client's name. The remaining two are the
   **approvals picker** and the **access-code dialog**, plus the enrol and
   settings screens, which no step has named yet. Reuse
   `screens-links-clients-0811/verify.mjs` rather than `index-contrast-0811`'s —
   it is that harness plus the two corrections that run turned up: selectors
   scoped to `#content` (an unscoped `.field label` grades the hidden login
   card), and a per-mode control value (one grey cannot fail on both a white
   card and a near-black one). Note that what it caught was **not** a ratio
   under threshold — both colours passed — but a secondary text that had become
   indistinguishable from the primary above it, so that comparison is worth
   carrying into the remaining screens.
   **The approvals picker and the access-code dialog are now done too** —
   `screens-approvals-code-0811`, 54 text rows, no ratio under threshold. What
   it turned up is a *different* kind of gap and worth carrying forward: the
   checkbox is drawn by the UA, so `getComputedStyle` cannot see it and no run
   before this one had measured a control the browser paints. Pixel sampling
   (`sampleBox()`) is now in the harness for that. What is left under this
   heading is the **enrol screen** and the **settings screen**, which no step
   has named yet — and, given the above, the wizard's own checkbox and radio
   are now on `--accent-control` without having been re-measured there.
   **The wizard is now re-measured and closed** — `wizard-controls-0811`, both
   controls on `--sunken` in both modes, plus the wizard's text, which had never
   been graded either. Nothing under threshold. What is left under this heading
   is the **enrol screen** and the **settings screen**. Reuse
   `wizard-controls-0811/verify.mjs` and not the approvals one: it is that
   harness plus the off-canvas guard, and the enrol screen is the other one
   taller than the window.
   **Item 6 is now CLOSED.** `screens-enrol-settings-0811` graded the last two
   screens in both modes; neither had a ratio under threshold, and what the pass
   turned up was a *global* declaration they exposed — `a { color:
   var(--accent) }` at 3.22:1 on the dark card, fixed as `--link-ink` /
   `--chip-link-ink`. Every console screen has now been graded. Two things are
   recorded as open rather than closed, and neither is a contrast question:
   links are distinguished by **colour alone** (WCAG 1.4.1), and `:visited` has
   not been measured anywhere. **The first of those is now closed** —
   `link-underline-0811` underlined the three in-text links (and asserted the
   line does *not* reach navigation or buttons, which flipping the global
   default would have done). **`:visited` is now closed too** —
   `visited-link-0811` compared the rendered PNG of each link before and after
   genuinely visiting it, with an injected `a:visited` rule as the control that
   proves the visited state was live; all three are byte-identical in both
   modes, so the reading STATUS.md had been carrying is now a measurement and
   the answer did not change. Nothing is open under this heading. What that run
   leaves for whoever writes the next one is a constraint, not a defect: of five
   Chromium configurations only a **headed** profile paints `:visited` at all,
   so a headless suite cannot check this and a future check has to be written
   the same way. The
   screen-by-screen sweep found four real
   defects across seven screens (`.serial`, the UA checkbox hue, `.pill.off`,
   and this one), all of them the same shape — a fixed value beside a surface
   that moves.
7. **Keyboard**, which item 6 never covered: every run under it graded the
   console *at rest*, and none pressed Tab. `focus-ring-0811` opened this and
   closed its first half — the focus indicator on the fields, which was 1.06:1
   in dark mode, i.e. absent. What is open under this heading:
   - **focus order (WCAG 2.4.3)** has never been checked on any screen. The
     console builds `#content` with `innerHTML` on every route change and opens
     dialogs as `.modal-bg` siblings, so both the tab sequence after a redraw and
     whether focus is trapped in an open dialog are unmeasured.
   - **the sidebar is now closed.** `nav-keyboard-0811` measured what the
     reading below had guessed and the guess was right: the seven nav items and
     logout were `<a>` with no `href`, i.e. the whole navigation was mouse-only
     (2.1.1, Level A). They are `<button>` now, graded reachable at stops #1–#7
     in DOM order, activating on both `Enter` and `Space`, with a 7.29:1 ring on
     the navy. What that run leaves for the next one is a method, not a defect:
     the tab order is a **ring**, so a sweep must stop when it wraps, and an
     index into the recorded stops is not a number of key presses.
   - **the dialogs are now closed.** `dialog-focus-0811` measured the second of
     the two: a `.modal-bg` is a sibling of `#app-view`, so nothing moved focus
     into it, Tab walked the card behind it and Escape did nothing — a
     destructive confirmation on screen with the keyboard still on the button
     underneath. `modal()` now moves focus, traps Tab in both directions,
     closes on Escape and returns focus to the opener; graded on three dialogs
     in both modes, with the previous shape rebuilt in the same page as the
     control. `dialog-inert-0811` then closed what it left: the page behind is
     `inert` while a dialog is open, so the cards underneath are out of the
     accessibility tree and out of reach of `focus()`, not only of Tab. What
     remains here is a dependency, not a defect — `inert` has no fallback, so a
     browser without it keeps the old behaviour silently.
   - **the screen redraw is now closed.** `screen-focus-0811` measured what was
     left of 2.4.3: `route()` replaces the whole of `#content`, and the control
     that asked for the change is usually inside it, so after a screen change
     **nobody was focused** — `activeElement` was `<body>`, nothing announced,
     nothing to Shift+Tab back from. Focus now moves to the new screen's
     `<h1>`; graded on six screens in both modes, with an in-screen redraw
     asserted *not* to steal it. What that run leaves for the next one is a
     browser fact worth carrying: removing the focused node does **not** reset
     the sequential focus navigation starting point in Chromium, so a forward
     Tab keeps working and only the focus itself is lost — a harness that
     grades this by counting Tab stops measures nothing.
   - **the controls inside `#content` are now closed.** They declared no focus
     style and fell back to the UA ring — read, not measured, until
     `content-focus-0811` pressed Tab on them. Between them the five runs above
     had given an explicit ring to exactly three things (`.field input`,
     `.side nav button`, `.topbar h1`); every ✏️ עריכה, every 🗑️, every save
     button in every dialog, the guide's link and the wizard's twelve
     checkboxes had no `:focus-visible` rule at all. Now one rule, scoped to
     `#content` and `.modal`: `outline: 2px solid var(--focus-ring)` at
     `offset: 2px` — `outline` and not `box-shadow` because the button's
     existing edge (`--btn-light-edge`) is already an inset shadow and the two
     overwrite each other, and `--focus-ring` and not `--focus-ring-navy`
     because the ring sits *outside* the control, on a surface that inverts.
     Graded on five controls × both modes, 40/40, with ten control rows
     confirming the UA `auto` that was there before.
     What that run leaves for the next one is a measurement fact and a scope
     line. The fact: `outline-style: auto` **cannot be read as a colour** —
     `getComputedStyle` returns the style and Chromium paints its own two-tone
     ring, so every harness under items 6 and 7 that graded a colour was
     structurally unable to see this defect; pixel sampling is the only route,
     and a max-over-band sample can be satisfied by a neighbouring dark pixel
     rather than by the ring (it was, on two rows). The scope: the rule stops
     at the console. `index.html`'s `.btn-ghost` sits on a navy bar — the exact
     case `--focus-ring-navy` exists for — and the marketing page's focus has
     never been measured. That is the next thing under this heading.
   - **the marketing page is now closed too.** `landing-focus-0811` measured all
     nine of its controls in both modes and gave them three rings, one per
     surface (`--focus-ring-band` is the new token, for the closing band's
     gradient). It also found what the reading above did not predict: the UA
     ring was **1.07:1** on the nav's `.btn-ghost` in dark mode, i.e. absent
     rather than merely unowned. The max-over-band hazard the run above recorded
     arrived here for real and the harness now identifies the ring by its own
     colour.
     Nothing is open under this heading. What is left for whoever writes the
     next step is not a focus question: below 901px `.nav-links` is
     `display: none` with no hamburger behind it, so on a phone the four nav
     links and כניסת לקוחות do not exist at all — the marketing page has no
     mobile navigation.
     **That is now done too** — `mobile-nav-0811` gave the page a toggle and a
     panel, 38/38 in both modes at both widths. Two things it leaves for
     whoever writes the next step, and neither is a keyboard question. The
     first is a **scope** line, the same shape as the one this heading opened
     with: `console.html` has its own navigation, `.side`, and it is
     `display: none` below 800px with nothing behind it either — so the
     customer console has no mobile navigation for exactly the reason the
     marketing page did not, and nobody has measured what that leaves reachable
     on a phone. The second is that the login pill's reservation is now
     unconditional on this page, which makes `scripts/qa/authbutton-overlap.mjs`
     worth re-running against production after the deploy rather than trusting
     the simulated pill this run used.
     **The first of those is now closed** — `console-mobile-nav-0811` gave the
     console the same toggle and panel, 70/70 in both modes at both widths. What
     it measured is that the console's version was the worse of the two: what
     `display: none` was hiding included **התנתקות**, so a phone user could not
     leave the session either. The second is now *two* pages rather than one:
     `.side-head` reserves for the pill as well, on a page that reserved nowhere,
     and both reservations rest on the same simulated geometry until that script
     runs against production.
     Nothing is open under this heading. What the console run leaves for whoever
     writes the next step is not a keyboard question: `console.html` is the only
     one of the three pages whose layout has ever been driven at a phone width,
     and what the shots show below the sidebar is the device grid at 390px —
     `.device-grid`'s `minmax(300px, 1fr)` fits, but the button rows inside a
     card have never been measured there, and `clients-console-0811` already
     found a column of buttons running off a card's edge once.
     **That is now measured and closed** — `device-card-390-0811`, 268/268: the
     card holds at 390px on every edge, and the run's control shows the check
     would have caught it if it did not. What it turned up instead is worth
     carrying, because it is the third time the same class of bug has appeared:
     the device's last-seen line was painted `4:40:00 ,11.8.2026`, the time
     before the date, so **a correct string in an RTL paragraph is not a correct
     line** — and computed-value harnesses are structurally blind to it. Only the
     screenshot caught the OTA window, and only the screenshot caught this one.
     Anything mixing a Hebrew label with two digit runs is the shape to look at
     next; `install.html` and `kiosk-launcher.html` have never been read this way.
     **Those two are now read, and both are clean** — `rtl-digits-0811`, 179/179,
     172 real token pairs across eight views. It is a probe rather than a spot
     check: it walks every visible text node and grades the painted order of
     every adjacent token pair from a `Range`, in two groups — Hebrew between the
     tokens (separate bidi runs, so RTL order) and neutrals only (one logical
     left-to-right value, so increasing). Nothing is out of order, including the
     one address rendered **without** `dir="ltr"` (`.choice small` on the venue
     row) when fed a host **with a port**: the colon is a CS between two EN, so
     W4 folds it into the number run before the paragraph direction reaches it.
     Three things that run leaves for whoever writes the next one. Two are method
     and cost the next harness real time if rediscovered: **`getBoundingClientRect()`
     is the wrong read** — both pages set `word-break: break-all`, a token split
     across a line break has a bounding box starting at the left edge of the
     *second* line, and this harness's first version reported the server URL as
     painted 132px backwards because of it; compare last-rect to first-rect and
     skip pairs on different lines. And **`unicode-bidi: bidi-override` cannot
     build a negative control** — it overrides to the element's own `direction`,
     which is `rtl`, so it paints the control exactly as the correct case does;
     U+202D in the text is what works. The third is scope: a `Range` cannot reach
     an `<input>`'s value, and **`console.html` has never been swept this way** —
     it is the page with the most numbers interpolated into Hebrew sentences, so
     it is the only place the Hebrew-between-tokens group is likely to have real
     matches at all. On these two pages it matched nothing.
     **The console is now swept too, and it is clean** — `console-rtl-0811`,
     585/585, 526 real pairs across nine views (six screens, three dialogs) in
     both modes at both widths. The prediction held: **group A has 56 matches
     here** against zero on the other two pages, nearly all of them in the setup
     wizard, which is where Hebrew instructions and Latin product names mix most
     densely. What the run corrects is the *harness*, twice, and both times off
     one line — the device card's `🔋 84% · 📱 Lenovo TB-X306F · v1.4.0`. A
     bullet is not proof of one value: `84` and `Lenovo` are two **fields**, RTL
     order is correct there, and the old two-group rule reported a defect that is
     not one. A bullet is not proof of two either: `TB-X306F · v1.4.0`, the same
     bullet on the same line, is **one run**, because both sides are strong L and
     N1 hands neutrals between two L to L — only a bare digit run (EN, which N1
     treats as R) lets a field mark decide anything. The groups are now the
     algorithm's own split rather than a guess about semantics, with `–` and `/`
     deliberately outside the field-mark set so `06:00–04:00` stays gradable.
     Both shipped defects stay in the group that must increase, and three control
     rows per combination assert it — including one that rebuilds
     `TB-X306F · v1.4.0` and would have caught the second correction. What is
     open after it is the same limit, now on the page where it bites: a `Range`
     cannot enter an `<input>`, so `#e-url`, `#l-url` and `#c-code` are right by
     declaration (`dir="ltr"`) and not by measurement.
     **That is now measured too, and it was not only a limit** —
     `input-rtl-0811` reads a character's painted position out of the
     **selection highlight**, which is the one thing the browser paints at that
     position, and found the one URL field in the console with no `dir` at all:
     `promptUrl()`'s `#u`, inheriting the page's `rtl`, painting the trailing `/`
     of a pasted URL 7px left of the value's first character. Nine fields graded
     in both modes, 20/20, with the shipped shape rebuilt in the same live page
     as the negative row. What is open after it is narrower than what it closed:
     only the **first and last** character are compared, so a value whose middle
     reorders would pass (nothing in the console has that shape); `#login-user`
     is behind `if (TOKEN) boot()` and could not be focused; and `promptUrl`'s
     own **label** interpolates a host into a Hebrew sentence, which is
     `console-rtl-0811`'s sweep on a tenth view rather than an input question.
