# QA — the link picker on the device card (#35 KioskFleet, §2★ה console side)

**11/08/2026.** `linkApprovals()` in `server/public/js/app.js` + `📚 קישורים
מאושרים` on every device card. Driven in a real Chromium against
`stub-server.mjs`, which rewrites **only the express glue**: it serves the real
`server/public/` and answers `GET`/`PUT /api/devices/:id/links` with the same
calls `routes/devices.js` makes, in the same order, against `node:sqlite`
holding the production DDL **read out of `src/db.js`** rather than copied.

Two devices on purpose — device 1 has `allowed_host = 'hadar.example.com'`,
device 2 has none — because the modal's hint and the pushed allow-list both
differ between them, and "unset stays unset" is the rule most easily broken here.

## What was asserted

| # | case | result |
|---|---|---|
| 1 | the button is on the card, next to `🆔 מזהי לקוח` | `… 🆔 מזהי לקוח \| 📚 קישורים מאושרים \| 🔑 קוד גישה …` |
| 2 | the library is listed in the owner's reading order | הדר, נוף, שרה (`COLLATE NOCASE`) |
| 3 | the already-approved link opens **checked** | link 21 checked, 22/23 not |
| 4 | the counter | `1 מתוך 3 מאושרים` |
| 5 | the hint on a device **with** a domain list | `הדומיינים של הקישורים שתאשרו יתווספו…` |
| 6 | ticking a second link updates the counter | `2 מתוך 3 מאושרים` |
| 7 | saving stores exactly the ticked set | `device_links` = (1,21), (1,22) |
| 8 | the toast names the count | `נשמר — 2 קישורים מאושרים למכשיר` |
| 9 | the pushed allow-list is **widened** to cover them | `hadar.example.com,sarah.example.com,pay.example.com` |
| 10 | the hint on a device with **no** domain list | `…אינו חוסם כתובות. אישור קישור אינו משנה זאת.` |
| 11 | `סמן הכל` / `נקה הכל` | `3 מתוך 3` → `0 מתוך 3` |
| 12 | saving nothing is a save, and says so | `נשמר — לא אושר למכשיר אף קישור` |
| 13 | an **unset** list stays unset after approving | device 2's pushed `allowedHost` = `''` |
| 14 | device 2's save leaves device 1's rows alone | `device_links` still (1,21), (1,22) |
| 15 | re-opening reads the **server's** set, not the page's | הדר ✓ נוף ✗ שרה ✓ |
| 16 | an empty library offers no checkboxes and a route out | `ספריית הקישורים ריקה…` → `לספריית הקישורים` |
| 17 | that button actually routes | `#content h1` = `ספריית קישורים` |

Case 9 is the one that matters most: `pay.example.com` is in link 22's stored
`allowed_host` and `sarah.example.com` is derived from its URL, so both halves of
`withLinkHosts()` are covered — a link approved onto a device whose host never
arrives opens as the device's own blocked page, which reads in a hall as a
broken kiosk.

Case 13 is the one that is easiest to get wrong in the other direction: seeding
the empty list would *create* a lock on a device that had none.

## Screenshots

| file | |
|---|---|
| `01-picker-light.png` | the picker, light |
| `02-picker-dark.png` | the picker, dark, re-read from the server after a save |
| `03-empty-library.png` | the empty-library state |

Dark was measured as well as photographed: the URL line is `#9aa8bf` on the
modal's `#131c2e` — **7.1:1**. It uses `--muted` on `--card`, both of which the
earlier contrast steps already set, so this screen introduces no new colour.

## Not covered

- The express glue itself — the mount, `requireAuth`, `getOwnedDevice`. Same
  constraint every step in this app has had: `server/node_modules` is absent, so
  `src/index.js` cannot be loaded here.
- An admin opening another owner's device. The route reads `device.owner_id`
  rather than the caller's, and the stub has one user.
- `137/138` on `node --test "test/*.test.mjs"` — the documented baseline,
  unchanged, because this step adds no server code. The one failure is
  `routing.test.mjs`, which imports express.
