# 01 torah-platform — city + time-of-day filters on /torah/lessons (2026-08-19)

## What was built
`apps/01-torah-platform/src/pages/public/LessonsDirectory.tsx`: closes audit_gaps
item 4 for #01 ("חיפוש/סינון לפי עיר-יום-שעה") — day-of-week filtering already
existed, city and time-of-day did not.

- New city `<Select>`, options = distinct real `city` values from published
  lessons (separate lightweight query, not fabricated), filtered server-side
  (`qb.eq("city", city)`), same pattern as the existing topic/day filters.
- New time-of-day `<Select>` (בוקר/צהריים/ערב/לילה), bucketed from the real
  `time_hhmm` column client-side (`timeBucketOf()`), applied the same way the
  existing `savedOnly` client-side filter already is.
- Purely additive: no existing state, query, button, or route touched. Search
  box, topic filter, day filter, saved-only toggle, lesson cards, and the
  lesson-detail link-through are all unchanged code paths.

## Verified live (Playwright, https://more30.com/torah/lessons?cachebust=filters0819)
- Page loads, 5 real lessons render (unfiltered baseline). 0 console errors
  (checked error level).
- Opened the city dropdown: options were exactly the 3 real cities in the data
  (בני ברק, ירושלים, תל אביב) — not a fabricated list.
- Selected ירושלים -> list narrowed to the 3 real Jerusalem lessons (08:00,
  21:00, 19:00), the 2 non-Jerusalem lessons dropped. 0 console errors.
- With ירושלים still selected, opened the time filter and picked "ערב
  (17:00–21:00)" -> narrowed to exactly the one real 19:00 Jerusalem lesson;
  the 08:00 lesson (morning) and the 21:00 lesson (falls in the "night"
  bucket, hour >= 21) both correctly dropped. 0 console errors.
- Existing controls (topic/day selects, search box, saved-only toggle, lesson
  card links) all still present and rendered normally on the same page load.

## Build / deploy
`tsc --noEmit`: pre-existing unrelated errors elsewhere in the app (Checkout,
ProductDetail, PrayerTimes, etc. — none in LessonsDirectory.tsx, confirmed by
grep). `vite build`: clean, 58s. Deployed via the documented recipe:
`robocopy apps/01-torah-platform/dist -> _deploy/torah-more30/torah /MIR` (also
purged several stale hashed JS chunks left over from prior deploys) then
`node scripts/prerender-all.mjs torah` (re-bakes the seeded landing HTML — not
the /lessons route itself, which is client-rendered) then
`vercel deploy --prod --yes --scope l023131500-ops-projects` from
`_deploy/torah-more30` -> `dpl_3Bwsfm2xZxi1xWpT2Uo3vAN5XDFd`, aliased
`torah-more30.vercel.app`.

No protected system touched. No DB/API/migration change (both new filters
reuse existing `lessons` columns). Real data only throughout.
