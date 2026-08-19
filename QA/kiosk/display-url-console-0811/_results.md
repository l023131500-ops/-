# §2★א's two fields, on the device screen — QA (2026-08-11)

Harness: `stub-server.mjs` (node's own http, no express/better-sqlite3 — they are
not installed in this checkout). It serves the **real** `server/public/` and
answers `PATCH /devices/:id` with the **real** `normalizeDisplayUrl` /
`deviceDisplayUrl` / `configHostCsv` / `effectiveHostCsv` / `normalizeHostCsv`,
called in the same order `routes/devices.js` calls them. Driven in a real
browser (Chromium).

Fixtures — device 1 `כניסה ראשית`: `home_url=https://hadar.example.com/`,
`allowed_host=hadar.example.com`, no display link. Device 2 `עמדת לובי`: no
allow-list, and a display link already set.

| # | case | result |
|---|---|---|
| 1 | edit dialog prefills, device with no display link | labels are `אתר ראשי` then `קישור שיוצג על המכשיר`, in that order, one under the other; the second is empty with placeholder `ריק = מציג את האתר הראשי` ✅ |
| 2 | hint, device whose save will carry a domain list | `…הדומיין שלו מתווסף אוטומטית לרשימת הדומיינים הנשלחת למכשיר, כדי שלא ייחסם` ✅ |
| 3 | save `https://promo.example.com/hadar` | stored `display_url` = it; **`home_url` unchanged**; **stored `allowed_host` unchanged** (`hadar.example.com`); the pushed `update_config` is `{homeUrl: hadar…, displayUrl: promo…, allowedHost: "hadar.example.com,promo.example.com"}` — widened only in what is pushed ✅ |
| 3b | the card after saving | two lines: `🌐 אתר ראשי: …` and `📺 מוצג במכשיר: …` ✅ |
| 4 | device 2's dialog prefills its own link | `https://lobby.example.com/promo/summer` ✅ |
| 5 | clearing the field | hint flips to `ריק — המכשיר מציג את האתר הראשי…`; stored `display_url` = **NULL** (not a copy); pushed `displayUrl` falls back to `home_url`; the card drops the `📺` line ✅ |
| 6 | typed identical to the main site | collapses to NULL — the device keeps following the main site instead of being pinned to today's copy of it ✅ |
| 7 | `javascript:alert(1)` | 400 → toast `הקישור שיוצג על המכשיר חייב להתחיל ב-http:// או ב-https://`; **modal stays open with the typed value**, nothing stored, no `update_config` pushed ✅ |
| 8 | `lobby.example.com/promo` (no scheme) | toast `הקישור שיוצג על המכשיר אינו כתובת תקינה`; nothing stored, nothing pushed ✅ |
| 9 | reopening after a save | the stored link is prefilled, so a second save of an unrelated field does not clear it ✅ |

Screenshots: `01-edit-two-fields-light.png` (the two fields with their hints),
`02-cards-light.png` (one card with a display link, one without),
`03-edit-two-fields-dark.png`.

## Note on case 2 vs case 4

Device 2 has **no** stored allow-list, yet its hint said the domain *is* widened.
That is correct, not a miss: `hostListEditor` pins the home host, so this
dialog's save submits `allowedHost=lobby.example.com` and the device does have a
list by the time the display link takes effect. The hint reads `hl.value()` live,
so it describes the state **after** this save, and it flips to the "no domain
lock" wording when the list is genuinely empty (a device enrolled without a home
URL). It is recomputed on input and after a click in the host editor, so an owner
who changes the list in this same dialog is not left with stale advice.

## Pre-existing defect found here, deliberately not fixed in this step

In dark mode **every** input in the console is white text on a white field —
`#n` (the name field, untouched by this change) computes
`background rgb(251,252,254)` / `color rgb(255,255,255)`, ≈1.03:1, and so does
every other one. It is console-wide and predates this change; the new field is
neither better nor worse than its neighbours. Fixing it means touching
`css/style.css` for the whole console, which is its own step — filed at the top
of "Next, in order" in `apps/35-kioskfleet/STATUS.md`.
