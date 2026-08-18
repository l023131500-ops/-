# nadlan (32) — §12 "construction nearby": deployed to production (0818)

Follow-up to 045f2d4 (wire §12 into report+UI+premium gate, fix live radius
bug), which explicitly deferred deployment: "apps/32-nadlan-berega deploys
via the separate nadlan-berega repo/sync script, a separate step from this
monorepo commit."

## Gap found before deploying

`scripts/sync-nadlan.ps1` syncs one direction only, repo → monorepo copy,
and its own header states the repo is the deploy source of truth. Comparing
file hashes showed the radius-bug fix (045f2d4) existed only in the
monorepo copy (`apps/32-nadlan-berega/lib/nearbyplans.ts`) — the separate
repo (`C:\Users\USER\Downloads\nadlan-berega`) still had the pre-fix version
committed as `3fb6611`. `buildreport.ts` and `ReportView.tsx` were already
identical between repo and copy (byte-for-byte hash match), so only
`nearbyplans.ts` needed porting. Deploying straight from the repo without
this check would have shipped the ~4000m bug that 045f2d4 already fixed;
running `sync-nadlan.ps1` afterward (repo → copy) would have silently
reverted the monorepo copy's fix on the next sync.

## What was done

- Ported the exact centroid-distance filter (`if (distanceM > radiusM)
  continue;` + explanatory comment) into the repo's `lib/nearbyplans.ts`.
  Verified file hash now matches the monorepo copy exactly (byte-identical).
- `npx tsc --noEmit` clean, `next build` clean (15/15 routes) in the repo.
- Committed in the repo (`65d37e8`) and pushed to `origin/main`
  (`l023131500-ops/nadlan-berega`).
- Deployed: `vercel deploy --prod` from the repo → `dpl_HneGfCmbk7BAubiwzCjxYdUztwHJ`,
  READY, aliased to `nadlan-more30.vercel.app` (project `nadlan-more30`,
  same project the `/nadlan` mount on more30.com serves from).

## Verified live (through more30.com, with cache-buster)

- `GET https://more30.com/nadlan/api/report?tier=premium&q=דיזנגוף 100 תל אביב&cb=...`
  → 200, `nearbyPlans` = 6 real XPLAN plans, distances **35–265m** — matches
  the dev-verified numbers in 045f2d4's commit message exactly, now
  confirmed live in production (previously up to ~4000m before the fix).
- Same address, `tier=basic` → 200, `nearbyPlans` is `null` — premium gate
  still holds live.

## Not done in this step

- Map placement (each plan's centroid as a marker) — data carries
  `lat`/`lng` per plan, `NearbyPlansPanel` still renders list-only. Next
  step for §12 if picked up again.
