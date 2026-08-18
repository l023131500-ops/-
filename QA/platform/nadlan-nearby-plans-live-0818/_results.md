# nadlan (32) — live verification for §12 "construction near the property" (premium/VIP)

Date: 2026-08-18

## What this step did
Follow-up to `QA/platform/nadlan-nearby-plans-geometry-0818/` (commit 4ca4770),
which locked down the centroid math with hand-built polygons but explicitly
deferred the live network call. This step runs the real, unmodified
`geocodeAddress` + `nearbyConstructionPlans` (no reimplementation) against the
live GovMap/XPLAN services for the four addresses named in
`more30-fixes-and-features.txt` §12 — the "look by eye before release" step
the Street View heading fix (db3f2c1) also needed before it shipped.

Added:
- `scripts/qa/nearby-plans-live.mjs` — geocodes each spec address, then calls
  `nearbyConstructionPlans` with the real coordinates and prints every plan
  returned (number, name, status, distance, area, lat/lng).
- `scripts/qa/_register-ts-loader.mjs` + `scripts/qa/_ts-loader-hooks.mjs` —
  Node 24's native TS stripping still enforces exact-extension ESM
  resolution, which rejects the extensionless relative imports app code
  writes under `moduleResolution: "bundler"` (e.g. `from './http'` in
  `lib/geocode.ts`). This loader retries a failed bare resolution with `.ts`
  appended, so QA scripts can import real app modules instead of
  reimplementing their logic. Reusable by any future QA script with the same
  problem — invoke via `node --import ./scripts/qa/_register-ts-loader.mjs <script>`.

## Verified this step
`node --import ./scripts/qa/_register-ts-loader.mjs scripts/qa/nearby-plans-live.mjs`
→ **4/4 addresses resolved and queried without error, 0 failed.**

All four geocoded to `cityVerified=true` and landed in the correct city/region
by eye (lat/lng sanity-checked, not just "no exception"):
- דורש טוב 17 ירושלים → geocoded to "דורש טוב 14" (nearest numbered entry;
  cityVerified), lat/lng ≈ 31.798,35.211 (correct Jerusalem neighborhood,
  Kiryat Zanz) — 48 nearby plans within 400m.
- שמואל הנביא 86 ירושלים → exact match, lat/lng ≈ 31.793,35.223 (correct,
  Bukharim/Beit Yisrael) — 111 nearby plans within 400m (dense area, as
  expected — Jerusalem old-city-adjacent neighborhoods have heavy plan
  coverage).
- הדקל 22 חצור הגלילית → geocoded to "הדקל 238" (nearest numbered entry;
  cityVerified), lat/lng ≈ 32.984,35.540 (correct, Hatzor HaGlilit) — 9
  nearby plans within 400m.
- הבעל שם טוב 9 רחובות → exact match, lat/lng ≈ 31.895,34.820 (correct,
  Rehovot) — 29 nearby plans within 400m.

All returned distances are ≤ 400m (radius filter working), all areas ≤ 200
dunam (masterplan filter working — no city-wide plan leaked through), no
plan appears twice for the same address (multipart dedup working). Full
output logged in this directory's console capture is reproducible by
re-running the command above.

## Explicitly not done this step (next step)
- No API route, no UI panel, no premium-tier gate, no wiring into
  `buildreport.ts` — this step only proved the data layer is correct against
  live data, same scope boundary as the geometry step before it.
- The 111-plan result for שמואל הנביא is real (dense Jerusalem planning
  activity) but a UI will need pagination/clustering, not a raw list — noted
  for whoever builds the panel next.

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873)
— no writes, read-only calls to public GovMap/XPLAN endpoints only.
