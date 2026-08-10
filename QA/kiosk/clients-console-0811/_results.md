# QA — client-registry console screen (#35 KioskFleet, §2★ד) — 11/08/2026

The screen that turns the `clients` table added on 11/08 into something a person
can operate: `מזהי לקוח` in the console sidebar.

Driven in a real browser (Playwright, 1280×900) against `stub-server.mjs` in this
directory — node's own http module serving the real `server/public/`, with an
in-memory `/api/clients` whose rules are copied from `src/routes/clients.js` and
which imports the **real** `hosts.js` and `clientcode.js`. `server/node_modules`
is not installed in this checkout, so express + better-sqlite3 cannot be started
here; the stub replaces the transport, not the validation.

## What was exercised

| # | Case | Result |
|---|---|---|
| 1 | Add a client, code typed as `" 12-34 "` | Stored as `1234` — the console and the kiosk keypad reach one row |
| 2 | A domain typed into the allow-list but never "added" | Adopted on save: `pay.example.com,hadar.example.com` — not silently dropped |
| 3 | A pasted `https://pay.example.com/checkout?x=1` | Reached storage as the bare host, via `hostsForUrl` |
| 4 | Add with the code left empty | Server-generated code, shown in the toast (`DS7LZ`) — the person adding the client is the one who must hand it to staff |
| 5 | Add a second client with an existing code | Refused, `המזהה 1234 כבר בשימוש אצל לקוח אחר שלכם`, no row created (2 rows before, 2 after) |
| 6 | The rejected attempt's values | Stay in the form — a failed save must not erase what was typed |
| 7 | Edit: change the site URL to another domain | The old site host was **dropped** from the allow-list and the new one pinned. Moving a client to a new site must not leave the previous one open on the device |
| 8 | Toggle active | `✅ פעיל` → `⛔ מושבת`, button flips to `הפעלה`. The code stays taken, so it cannot be reassigned to a different business |
| 9 | Delete, with confirmation | Row removed, modal closed, list reloaded |
| 10 | Light + dark (`DESIGN_STANDARD §3`) | Both render; screenshots below |

Console errors during the run were only the stub's own: `favicon.ico` 404 and the
WebSocket upgrade the stub does not serve.

## A layout bug found and fixed in the same step

The first draft had six columns and the row ends in three buttons: the table
overflowed its card and cut `מחק` off the edge (`01` in the first capture). The
allow-list now sits under the URL it belongs to instead of in a column of its
own, and the wrapper scrolls rather than clipping. Measured after the fix:
table 901px inside a 901px box, and the last row's delete button is fully inside
its container.

## Screenshots

- `01-registry-light.png` — the screen with three clients, one disabled
- `02-edit-modal.png` — the edit dialog, allow-list editor with the site host pinned
- `03-registry-dark.png` — the same screen in dark mode

## Not covered here

Nothing on the device side: which client codes a given device may show (§2★ה),
`IdentifyDevice` and `/kiosk-launcher/:code` (§2★ז) are still unbuilt, so a code
registered on this screen does not yet resolve on a kiosk. Not deployed to
Railway — the running service still serves the previous console.
