# Round-4 functional pass — 02 tamlul (2026-08-18)

## Checked
- Home `/tamlul` — 200, real content (product copy, three style tracks, pricing note). Shared auth pill shows "לקוח" (already-logged-in session), matching torah's round-4 login check.
- `/tamlul/login` (admin login) — form renders, Google + email/password.
- `/tamlul/upload` (the core customer action: redeem a coupon code to start a transcription) — form renders, "המשך" is disabled until a code is typed (client validation present).

## Bug found: core action is broken in production
Typed a coupon code (`TEST-0000`, not a real code — none available) and clicked
"המשך". The page rendered a raw error string instead of a coupon-not-found
message:

> TypeError: Cannot convert argument to a ByteString because the character at
> index 0 has a value of 65279 which is greater than 255.

Network: `POST https://more30.com/tamlul/api/coupons` → **500**, body
`{"error":"TypeError: Cannot convert argument to a ByteString because the
character at index 0 has a value of 65279 which is greater than 255."}`.
Request body was clean (`{"code":"TEST-0000"}`).

U+FEFF (65279) is a UTF-8 BOM. `apps/02-igud-transcribe/app/api/coupons/route.ts`
calls `createSupabaseService()` (`apps/02-igud-transcribe/lib/supabase/server.ts`),
which builds a Supabase client from `process.env.SUPABASE_SERVICE_ROLE_KEY` and
puts it straight into the `Authorization`/`apikey` fetch headers. A ByteString
conversion error on the *first* header character means that env var's value
starts with a BOM — the exact failure mode already documented in memory
`powershell-pipe-adds-bom` (`vercel env add` fed through a PowerShell pipe
prepends a BOM to the stored value).

This is not a one-off: the code path is unconditional, so **every** coupon
redemption (i.e. every attempt to start a transcription — the entire paid
product) returns 500 in production. This was not caught by any pre-round-4
sweep because no session tested the core action end-to-end with a submit
click; contrast/perf/Lighthouse probes only load pages, they don't submit
forms.

## Not done this step
Did not touch the Vercel env var or redeploy — re-setting a service-role
secret safely (confirm project ref, get an uncorrupted key, set it without a
BOM, then verify) is its own step per the "smallest meaningful step" rule.
Logged as `core.issues` id — see heartbeat — severity critical, status open,
blocked_on nothing (actionable, not a user-decision blocker).

## Evidence
Playwright network capture: request/response bodies above, captured live
against `https://more30.com/tamlul/upload` on 2026-08-18.
