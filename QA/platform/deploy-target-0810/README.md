# deploy_target — 10/08/2026

`core.projects.deploy_target` and `registry.ts` both claimed where each system
is hosted. Nobody had measured it, and issue #156 said so in as many words.

Run: `node scripts/qa/deploy-target-from-routing.mjs` → `_results.json`.

## The method that was tried first, and is wrong

Fetch `more30.com/<mount>/` and read the platform signature off the response.
Every one of the 24 mounts answers `server: Vercel` with an `x-vercel-id` —
including `/kiosk/`, whose origin is `kioskfleet-production.up.railway.app`. A
Vercel rewrite proxies the upstream, so the client only ever sees the portal's
own edge. Same answer for every input, and confidently wrong about the single
Railway row. It is kept in `_results.json` under `method_rejected` and in each
row's `address.server`, so re-deriving it is not necessary to reject it again.

Reading the upstream host directly is not available either: NetFree answers
`*.vercel.app` and `*.up.railway.app` with 418 from this machine, so that probe
measures the filter.

## The method used

`portal/vercel.dist.json` is the deployed routing artifact, and it names the
origin host per mount. `more30.com/<mount>/` returning that system — rather
than the portal's home page, which is fingerprinted and reported as
`portal-fallback` — is the proof the route is in force. Row 33 is the one
exception: it *is* the portal, so its own headers are unrelayed and are used.

A row with no rewrite (`no-rewrite`) or no `path` (`not-mounted`) gets no
verdict. 08 and 09 are protected and never fetched.

## Result

25 of 36 rows settled. 15 database rows and 13 registry rows disagreed with the
origin that serves them; two were not blank but wrong — 04 said `railway` and
15 said `lovable`, and both are served from `*-more30.vercel.app`. Fixed in
migrations 0055 and 0056 and in `packages/config/src/registry.ts`; a re-run
reports `db_wrong: 0, registry_wrong: 0`.

`registry-vs-projects.mjs` went from 9 disagreements to 6, and all six that
remain are `stage` — the half of #156 that needs a definition of `live` vs
`beta`, not a measurement.
