# Follow-up to round-4 tamlul finding (core.issues #239) — 2026-08-18

## What this step did
Continuation of `8618198` ("round-4 functional pass: 02 tamlul - core action
(coupon redemption) broken in production" — `/tamlul/api/coupons` 500,
`SUPABASE_SERVICE_ROLE_KEY` BOM-corrupted).

1. Re-set `SUPABASE_SERVICE_ROLE_KEY` on Vercel project `tamlul-more30`
   (`prj_i8KRFIs4jtqPuEf4mt5b11RHjRQN`) twice via `scripts/Set-VercelEnv.ps1`,
   redeployed both times (`dpl_8BEgLgHb...`, `dpl_GHZ7PW32...`) — **the
   ByteString/BOM TypeError persisted unchanged** after both attempts, even
   with a 30s wait between set and redeploy to rule out propagation lag.
2. Bypassed the CLI script entirely and set the var via raw REST API
   (`DELETE /v9/.../env/{id}` then `POST /v10/.../env` with a UTF-8 byte
   body, no PowerShell pipe or CLI stdin redirection involved at all) —
   redeployed (`dpl_2dCEQwMxGN...`). **The ByteString TypeError is gone.**
   The error changed to a clean `{"error":"Invalid API key"}` — a real
   Supabase auth rejection, not an encoding crash.
3. Confirmed independently of Vercel: called
   `https://bieebmnmkffwbqlsfozh.supabase.co/rest/v1/` directly with the same
   key value (an `sb_secret_...` key, read from
   `apps/02-igud-transcribe/.env.local` — value redacted here, see git-ignored
   `.env.local` if you need it again; byte-identical copies also in
   `apps/01-torah-platform/.env.local` and `apps/03-igud-ads/.env.local`) →
   **401**. The key itself is invalid against this Supabase project, not a
   Vercel/env-propagation artifact.

## Two separate findings, not one
- **BOM corruption: fixed.** `scripts/Set-VercelEnv.ps1` did NOT actually
  avoid the BOM bug it was written to avoid — same value, same target,
  only variable changed was CLI-script-vs-raw-REST-API, and only the REST
  API path produced a BOM-free header. The script should be treated as
  unverified/broken until someone re-derives why (candidate: the npm-shim
  `vercel.ps1` wrapping the real CLI may reintroduce a console-encoding
  step the raw REST call skips entirely). Recommend using the REST API
  pattern from memory `powershell-pipe-adds-bom` directly for future
  Vercel env fixes instead of this script.
- **New, separate bug: the cached `SUPABASE_SERVICE_ROLE_KEY` in
  `.env.local` (shared by 01/02/03) is stale/invalid.** 401 direct against
  Supabase rules out anything Vercel-side. Getting a current key requires
  the Supabase Management API / dashboard for project `bieebmnmkffwbqlsfozh`
  — the Supabase MCP was not connected this session (no `execute_sql` tool
  available after repeated `ToolSearch` retries), so the correct key
  could not be retrieved or verified this step. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  in the same files was not tested and may or may not still be valid.

## Current state
- Vercel `tamlul-more30` production now holds a **BOM-free but functionally
  invalid** `SUPABASE_SERVICE_ROLE_KEY`. Coupon redemption is still broken
  (different error), so the core action remains down. This is not a
  regression — the previous state was also fully broken — but it means the
  fix is incomplete.
- Next step (needs Supabase MCP or manual dashboard access): fetch the
  current, valid `service_role` key for project `bieebmnmkffwbqlsfozh` from
  Supabase Settings → API, set it via the REST-API method above (not the
  ps1 script) on all three apps that share it (torah/tamlul/modaot — check
  each independently, they may not all be broken the same way), redeploy,
  and verify a real coupon-flow submission end-to-end.

## Evidence
- Direct Supabase REST call with the cached key → HTTP 401 (captured above).
- `more30.com/tamlul/api/coupons` POST before this step: ByteString
  TypeError. After REST-API env fix + redeploy: `{"error":"Invalid API key"}`.
