# nadlan (32) — data layer for §12 "construction near the property" (premium/VIP)

Date: 2026-08-18

## What this step did
more30-fixes-and-features.txt / NADLAN_SPEC_V2.md §12 asks for a
premium/VIP panel that places nearby planning/construction activity on the
map at its real location — not just as a list. That needs a representative
point per XPLAN plan polygon, and the wrong way to get one (averaging the
polygon's vertices) silently mislocates a marker for any asymmetric shape,
same failure family as the Street View heading bug fixed 05/08 (db3f2c1) —
geometry logic that reads correctly but was never run outside production.

Added, data layer only:
- `apps/32-nadlan-berega/lib/geometry.ts` — pure area-centroid (shoelace) of
  an ArcGIS ring polygon, no imports (same pattern as `lib/aim.ts`).
- `apps/32-nadlan-berega/lib/nearbyplans.ts` — queries XPLAN layer 1 with
  `returnGeometry=true` in a radius, filters out plans >200 dunam
  (city-wide masterplans, not "what's being built here"), dedupes
  multipart features, returns each plan's centroid in WGS84 + distance.
- `scripts/qa/nearby-plans-geometry.mjs` — imports the real `geometry.ts`
  module and checks it against hand-computed centroids (square, offset
  rectangle, an asymmetric quad where the true centroid is far enough from
  the naive vertex average that a regression can't pass by accident,
  multipart ring selection, three no-geometry refusal cases).

## Verified this step
- `node scripts/qa/nearby-plans-geometry.mjs` → **10/10 pass**.
- `tsc --noEmit` in `apps/32-nadlan-berega` → clean (no new errors).

## Explicitly not done this step (next step)
- No API route, no UI panel, no premium-tier gate, no wiring into
  `buildreport.ts`.
- No live XPLAN radius query against the four spec addresses (דורש טוב 17
  ירושלים · שמואל הנביא 86 ירושלים · הדקל 22 חצור הגלילית · הבעל שם טוב 9
  רחובות) — that needs the network call this step deliberately deferred,
  same "look by eye before release" step the Street View fix needed.

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873)
— no writes, this app's own `lib/` only.
