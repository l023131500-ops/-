# The install link — #35 KioskFleet, KIOSK_BUILD §2★א (last line)

11/08/2026. `stub-server.mjs` rewrites only the express glue; the links come
from the real `src/installlink.js`, and the page and the console JS are the real
files out of `server/public/`.

## Unit — `node --test test/installlink.test.mjs`

8/8 pass. Across the suite: **78/79**. The one failure is `routing.test.mjs`,
which imports express — the documented baseline in `apps/35-kioskfleet/STATUS.md`
(it was 70/71 before these eight landed).

## The page, in a real browser

| what was driven | result |
|---|---|
| `GET /kiosk/install/A7K2M9` | 200, 11,157 bytes |
| `GET /kiosk/install` (no code) | 200, same file |
| `GET /install/A7K2M9` (root mount) | 200, same file |
| server address shown at `/kiosk/install/…` | `http://127.0.0.1:4181/kiosk` — the prefix is included |
| server address shown at `/install/…` (root mount) | `http://127.0.0.1:4181` — no phantom prefix |
| code shown | `A7K2M9` |
| `/install/a7k2m9` (lower case) | shows `A7K2M9` |
| no code in the URL | code card hidden, "אין קוד רישום בכתובת הזו" shown, server address still shown |
| steps rendered | 5 |
| error table rows | 7 (header + the 6 messages `routes/agent.js` actually returns) |
| styling at both depths | `.card` border-radius 18px at both — everything is inline, so no href resolves relative to `/install/CODE` |
| console errors | one, `favicon.ico` 404 — the stub serves no favicon |

Screenshot: `01-install-with-code.png`.

## The console

Logged in, `➕ הוספת מכשיר`:

| what was driven | result |
|---|---|
| open codes list | 2 seeded rows, each with a `קישור התקנה` button |
| link on row 1 | `https://kiosk.more30.com/kiosk/install/A7K2M9` |
| creating an enrollment | result block shows the code chip **and** the full link, `dir="ltr"`, plus a copy button |
| link on the new one | `https://kiosk.more30.com/kiosk/install/QA0003` — matches the anchor `href` and the copy button's payload |

**The point of the stub's setup:** it answers on `127.0.0.1:4181` while its
`PUBLIC_URL` says `https://kiosk.more30.com`. That is the production mismatch —
the console is reached through the portal rewrite, so `location.origin` there is
not an address a device can enroll against. Every link rendered above carries
the second, which is what proves the link is computed on the server and not in
the browser.

Screenshots: `02-console-enroll-light.png`, `03-console-enroll-dark.png`.

A layout defect was found and fixed in this run: the row's button label wrapped
to two lines inside the narrow cell, next to a one-line `מחק`. Shortened to
`קישור התקנה` with `white-space:nowrap` — the same class of defect
`clients-console-0811` found when a column of buttons ran off the card's edge.

## Not covered

- The copy buttons are not driven (headless clipboard permission), the same gap
  noted in `access-code-console-0811`. Both have a visible fallback and both
  values are on screen regardless.
- **Not deployed.** `more30.com/kiosk/install/…` is a 404 until the Railway
  service is rebuilt — and that rebuild is not a redeploy of this repo: the
  service builds from `l023131500-ops/zol`, branch `claude/what-do-you-see-gxo5tc`,
  root `kiosk/server`.
