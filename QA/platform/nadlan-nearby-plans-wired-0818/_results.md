# nadlan (32) — §12 "construction nearby": wired to report + UI + premium gate (0818)

Follow-up to 4ca4770 (data layer) and 3803d83 (live verification), both of
which explicitly deferred "no API route/UI/premium gate yet". This step does
that wiring, which was already staged uncommitted in the working tree at
session start (`apps/32-nadlan-berega/lib/buildreport.ts`,
`components/report/ReportView.tsx`, `components/report/NearbyPlansPanel.tsx`
had already been written; only `lib/nearbyplans.ts`'s call site was staged,
the panel file itself was already committed in an earlier session).

## What was verified

- `npx tsc --noEmit` clean on `apps/32-nadlan-berega`.
- `npm run build` — compiles, all 15 routes generate, no new warnings.
- Live `next dev` + `GET /api/report?q=דיזנגוף 100 תל אביב&tier=premium`:
  `nearbyPlans` field populated with real XPLAN layer-1 plans (plan numbers,
  names, status, area, distance, lat/lng).
- `tier=basic` on the same address: `nearbyPlans` is `null` — the premium
  gate (`tierMayUsePaidSources`) works, matching the imagery gate's pattern
  (source not queried at all on free tier, not just hidden in the UI).

## Bug found and fixed before commit

The panel text promises "רדיוס 400 מ'" and `nearbyConstructionPlans` defaults
`radiusM=400`, but the live Dizengoff 100 report initially returned entries
up to **~4000m** from the property. Root cause: XPLAN's `distance`/`units`
query params correctly restrict results to plans whose **geometry**
intersects a 400m buffer around the point, but a plan's own area centroid
(what we display "X מ' מהנכס" for) can sit far outside that buffer when the
polygon is elongated (e.g. a citywide-adjacent masterplan whose shape happens
to clip the search circle at one corner) — even after the existing >200
dunam filter, since a large-area filter doesn't bound eccentric shape.

Fix in `lib/nearbyplans.ts`: skip any feature whose computed centroid
distance exceeds `radiusM`, in addition to the existing area filter. Re-ran
the same live query after the fix — Dizengoff 100/premium now returns 6
plans, all 35–265m away (previously up to ~4000m). `tsc --noEmit` re-checked
clean after the fix.

## Not done in this step

- Not yet deployed — `apps/32-nadlan-berega` deploys via the separate
  `nadlan-berega` repo (`scripts/sync-nadlan.ps1` + `vercel deploy --prod`),
  a separate operation from this monorepo commit. Next step.
- Map placement (showing each plan's centroid as a marker) — the data now
  carries `lat`/`lng` per plan, but `NearbyPlansPanel` only renders a list,
  no map integration yet.
