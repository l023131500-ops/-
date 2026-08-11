# QA — the launcher API (KIOSK_BUILD §2★ז) — 11/08/2026

What was built: `server/src/ratelimit.js`, `server/src/launcher.js`,
`server/src/routes/launcher.js`, mounted at `/api/launcher` in `src/index.js`.
This is the **server half** of `/kiosk-launcher/:code`; the page itself is the
next step.

## Unit tests — `npm test`

```
59/60 pass
```

The one failure is `routing.test.mjs`, which imports express and has never been
runnable in this checkout (`server/node_modules` is absent) — unchanged by this
step. 16 of the 59 are new: `ratelimit.test.mjs` (9) and `launcher.test.mjs` (7).

## Over a real socket — `node QA/kiosk/launcher-api-0811/stub-server.mjs`

`routes/launcher.js` imports express and `db.js` imports better-sqlite3, so
neither can be loaded here. The stub rewrites **only the express glue** on
`node:http`; every module that decides anything — `accesscode.js`,
`approvals.js`, `launcher.js`, `ratelimit.js` — is imported from `server/src`,
and the database is `node:sqlite` running the DDL text `src/db.js` runs.

```
access code issued to device 1: 4A8BXY

✔ a real code returns the device profile — status 200
✔ the venue link comes back — https://hall.example.com/
✔ only the approved business is offered — [{"id":1,"name":"אולם הדר","url":"https://hadar.example.com/"}]
✔ no device token in the response bytes
✔ no serial in the response bytes
✔ no client code in the response bytes
✔ the code survives being written down with a dash — status 200
✔ an approved business opens — {"url":"https://hadar.example.com/","client":{"id":1,"name":"אולם הדר"},"allowedHost":"hall.example.com,hadar.example.com","idleReturnSeconds":90}
✔ its host is on the list handed over — hall.example.com,hadar.example.com
✔ a registered but unapproved business is refused — status 404
✔ a wrong code is 404 and says nothing more — {"error":"קוד לא מוכר"}
✔ a malformed code gets the same 404, not a 400 — status 404
✔ the guesser is locked out inside the budget — locked on failure #10
✔ the lockout carries Retry-After — Retry-After: 900
✔ the lockout holds even for the right code — status 429
✔ the lockout is logged — [{"type":"launcher_lockout","detail":"127.0.0.1 — 900s"}]

16/16 passed
```

The access code differs on every run — it is generated. The rest of the output
is deterministic.

## What the numbers mean

Ten failures in ten minutes, then fifteen minutes refused. Against 32⁶ ≈ 1.07e9
codes that is ~24 guesses an hour, so a single caller needs ~5,000 years to
cover one per cent of the space; without the limiter, a script at 50 req/s
covers it in under eight months. Successes clear the counter, so a venue whose
staff open the launcher all morning never accumulates anything.

## Not covered here

- **The page.** `/kiosk-launcher/:code` does not exist yet, so there is no
  screenshot in this folder — nothing to photograph. Next step.
- **`routes/launcher.js` itself.** The handlers are exercised through a rewrite
  of their glue, not through express. Same limitation as every other route in
  this service in this checkout.
- **Not deployed.** Railway still serves the previous build, so `/api/launcher`
  answers 404 in production until it is rebuilt.
