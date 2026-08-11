# QA — the launcher page draws the links (KIOSK_BUILD §2★ה/§2★ז)

Date: 2026-08-11 · `apps/35-kioskfleet/server/public/kiosk-launcher.html`

`selection-links-payload-0811` put `links` into `/resolve`'s answer and taught
`/open` to accept a `linkId`. The page still drew clients only, so the field
arrived on every response and was never rendered: the person in the hall could
not pick one, and half of what §2★ה says the selection screen offers was
unreachable from the screen that exists to offer it.

## Harness

`stub-server.mjs` — express and better-sqlite3 cannot be loaded in this checkout,
so only the express glue is rewritten (the two mounts, the status codes, the
`sendFile`). Everything that decides anything is the real module:
`accesscode.js`, `approvals.js`, `linkapprovals.js`, `launcher.js` and
`ratelimit.js` are imported from `server/src`; the database is `node:sqlite`
running the DDL text `src/db.js` runs; the HTML served is
`server/public/kiosk-launcher.html` byte for byte. `/open`'s both-and-neither
refusal is mirrored, because that is the branch the page's "send exactly one id"
rule exists for and a stub that forgives would not test it.

Fixtures: **device 1** — two approved clients, two approved links, plus one of
each registered and *not* approved for it. **Device 2** — nothing approved.
**Device 3** — links and no clients.

Link id 1 is deliberately approved alongside **client id 1**: ids are unique only
within a table, so this is the state in which a single `data-id` attribute sends
the wrong one and the server resolves it against the wrong set of approvals.

## What was driven

| # | Case | Result |
|---|---|---|
| 1 | Device 1, prefixed mount `/kiosk/kiosk-launcher/<code>` — rows drawn | venue + 2 clients + 2 links, in that order |
| 2 | The un-approved client (id 3) and link (id 3) | absent from the payload and from the DOM |
| 3 | Link rows are visually distinct | `.choice.link`, 🔗, `rgba(168,85,247,.32)` vs the clients' `rgba(42,97,232,.35)` |
| 4 | Click link **id 1** — the id that collides with a client | landed on `/site/menu`, not `/site/hadar` |
| 5 | …and the event it logged | `launcher_link_opened` · `1 — תפריט הערב`, not the client event |
| 6 | The `/open` body on a **link** click | `{code, linkId}` — `keys` is exactly `["code","linkId"]` |
| 7 | The `/open` body on a **client** click | `{code, clientId}` — no `linkId` key, so the 400 never fires |
| 8 | Client click still works | landed on `/site/hadar` |
| 9 | Device 3 (links, no clients), **un-prefixed** mount | link drawn, empty sentence hidden |
| 10 | …the same state under the previous rule | `clients.length > 0` → sentence **shown** under a list of links |
| 11 | Device 2 (nothing approved) | venue button alone + `למכשיר זה לא אושרו מזהי לקוח ולא קישורים…` |
| 12 | Link address rendering | `127.0.0.1:4188/site/board` / `…/site/menu`, `dir="ltr"` |

Case 10 is the "can this check fail" pass: the old toggle counted clients alone,
so device 3 — a configured device — was reported as unconfigured. Both mounts
were driven (case 1 prefixed, case 9 un-prefixed), which is the arithmetic the
page does on its own path.

Screenshots: `01-choose-clients-and-links.png`, `02-no-approvals.png`,
`03-links-only-device.png`.

`node --test "test/*.test.mjs"` → **146 tests, 145 pass** — the documented
baseline, unchanged, since this step adds no server code. The one failure is
still `routing.test.mjs`, which imports express.

## Found and fixed during the run

- **Two links under one domain rendered as the same line.** The rows used
  `hostOf()`, which is right for a client — a business *is* its domain — and
  wrong for a link: `links.url` is "the specific event sub-link", so an owner's
  library routinely holds several under one host. Added `shortUrl()` (host +
  path, query and fragment dropped, tail elided at 46 chars) for link rows only.
  The fixtures are two links on one origin, so the screenshot shows the
  difference.
- **The path needed `dir="ltr"`.** A `/` is directionally neutral, so inside the
  RTL card the segments of `host/a/b` can be laid out in an order that is not the
  address. The host-only lines have no neutral character to reorder around and
  are left alone.
- **The harness was serving stale bytes.** `launcher-page-0811`'s stub read the
  page into a constant at boot, so a stub outliving an edit reports on the
  previous version of the thing under test with nothing on screen to say so —
  which is exactly what the first driven pass here did. This stub reads the file
  per request.

## Not covered

- The express glue itself (the mount, `express.static`, the `/kiosk-launcher/:code?`
  route) — the standing constraint of every step in this app.
- The clipboard, the lockout and the wrong-code paths: unchanged by this step and
  already driven in `launcher-page-0811`.
