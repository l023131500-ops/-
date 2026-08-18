# round-4 functional pass — 03 modaot (יוצר מודעות איגוד)

Date: 2026-08-18
Live target: https://more30.com/modaot (Playwright, viewport 1440x900)

## Checks

1. **Home loads** — `/modaot` returns 200, real content ("יוצר מודעות לשיעורי תורה"),
   nav links to create/transcribe/login all present.
2. **Auth pill** — shared auth-button already reads "לקוח" (customer logged in),
   same shared-session pattern as torah/tamlul.
3. **Core action** — this app's core action is coupon-gated ad creation
   (`/modaot/create` → POST `/modaot/api/coupons/verify`). Typed a
   non-existent code (`TEST-0000`, no real coupon available): request returned
   a clean `400 Bad Request`, and the UI rendered the expected Hebrew message
   "קוד הקופון לא נמצא או לא פעיל" (coupon not found/inactive) — **not** a raw
   500/crash. This is the correct negative-path behavior, unlike the BOM-key
   500 found on tamlul (core.issues #239) — 03's Supabase service key for this
   flow is healthy.
4. **Admin login** — `/modaot/login` renders the admin-only login form
   (Google + email/password) correctly.

## Result

Clears the round-4 bar cleanly. No bug found, no code change, no deploy.

## Noted, not investigated further

"← חזרה לבית" on `/modaot/create` links to `/` (portal home) instead of
`/modaot` (this app's own home) — a minor nav inconsistency, not a functional
break. Left for a future pass.

## Next

Round-4 ROUTES order continues at system 04 (imud-torani / imud).
