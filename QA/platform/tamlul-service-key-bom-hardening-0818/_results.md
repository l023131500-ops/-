# Hardening follow-up to core.issues #239 — 2026-08-18

## Context
`cac3db1` (earlier this session-chain) already fixed the *live* BOM corruption
on `tamlul-more30`'s `SUPABASE_SERVICE_ROLE_KEY` by re-setting it through the
raw Vercel REST API instead of `scripts/Set-VercelEnv.ps1` (which that step
found does **not** avoid the BOM bug it was written to avoid). It left the
underlying cause unaddressed at the code level and flagged the script as
"unverified/broken."

## What this step did
Verified live: `POST https://more30.com/tamlul/api/coupons` with a test code
now returns `{"error":"Invalid API key"}` (500) — confirms the ByteString/BOM
crash is still gone, matching cac3db1's finding. This is a genuine Supabase
auth rejection (invalid/stale `SUPABASE_SERVICE_ROLE_KEY` value against
project `bieebmnmkffwbqlsfozh`), a separate, already-tracked blocker — not
touched this step (needs a current key from Supabase Settings → API before
any redeploy).

Added defense-in-depth at the code level so this exact class of bug (a BOM
prepended to an env var by a PowerShell pipe, per memory
`powershell-pipe-adds-bom`) cannot silently reintroduce a production 500 the
next time the key is rotated via `Set-VercelEnv.ps1` or any other pipe-based
path: `apps/02-igud-transcribe/lib/supabase/server.ts` now strips a leading
U+FEFF from `SUPABASE_SERVICE_ROLE_KEY` before using it in
`createSupabaseService()`/`createSupabaseServiceRaw()`. No-op if the value is
already clean (current state).

## Verified
- `next build` locally: compiled clean, 13/13 pages, no errors.
- `vercel deploy --prod` from `apps/02-igud-transcribe` → `tamlul-more30`,
  `dpl_BhfvJvAyaVinXfXxHUvpQBeDxLsM`, READY, aliased to
  `tamlul-more30.vercel.app` / `more30.com/tamlul`.
- Live POST to `https://more30.com/tamlul/api/coupons` with a cache-busting
  query param after deploy: `{"error":"Invalid API key"}`, same as before
  this step (expected — the stored key itself, not its encoding, is now the
  only remaining problem). No regression.

## Still open (core.issues #239, unchanged)
Coupon redemption on `/tamlul` remains down. Next step needs a current
`service_role` key for Supabase project `bieebmnmkffwbqlsfozh` (Settings →
API or Management API), set via the raw-REST-API method (not the ps1 script)
on `tamlul-more30`, and — per cac3db1 — checked independently on
`torah-more30`/`modaot` since `.env.local` for apps 01/02/03 shares a
byte-identical copy of the same key. Separate step: larger than one
20-minute unit (fetch key + verify + set on 3 apps + redeploy + verify each).
