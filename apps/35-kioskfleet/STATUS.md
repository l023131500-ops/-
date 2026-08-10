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

## Next, in order

1. Console screen for the registry (list / add / edit a client), then §2★א's two
   fields — "אתר ראשי" and "קישור שיוצג על המכשיר" — on the device screen.
2. Per-device approval: which client codes this device is allowed to show
   (§2★ה). Nothing else may be reachable from the selection screen.
3. `IdentifyDevice` (§2★ז): `serial_number` **or** `client_id` → profile +
   ready links, device-facing, no dashboard session.
4. `/kiosk-launcher/:code` — 6-character access code → the approved list → open
   the locked kiosk.
5. The "הפעל" wizard with the live checklist (§2★ב).
