# 22 zchuyot — rights-agent: unmetered LOVABLE_API_KEY, capped per caller IP

Project `trerolyveytzgksawrme` (Lovable project `f55ebbb0-3948-41e9-87c7-7d4a80674b05`).
Same class as #165 on mthbram; named in `QA/estate-edge-sweep-0812/_results.md` as the one
remaining unmetered AI spender in the estate.

All times UTC, 12/08/2026.

## Before — measured, not assumed

`POST https://trerolyveytzgksawrme.supabase.co/functions/v1/rights-agent`, body
`{"messages":[{"role":"user","content":"hi"}]}`, **no `apikey` and no `Authorization`
header at all**:

```
STATUS: 200   LEN: 3026
data: {"id":"chatcmpl-g5l8ap-YBdOLmNAP0babQQ","object":"chat.completion.chunk",
       "model":"google/gemini-3-flash-preview","choices":[{"delta":{"role":"assistant",...
```

A real streamed completion, billed to `LOVABLE_API_KEY`, for a caller with no credential.
`verify_jwt = false` in `supabase/config.toml`, and the function has no gate of its own.

## The fix

Same shape as #165, deliberately: a per-caller-IP cap, not an account gate. zchuyot's
public rights advisor is the system's front door — gating it behind login would delete a
live public feature — so the cap is 20 requests/hour per IP, checked **before** the
gateway call, so a blocked request costs nothing.

Storage applied directly to the live project (it is a satellite; the Supabase PAT here
cannot see it): `public.ai_rate_limits` + `ai_rate_limit_hit(text, timestamptz, integer)`,
an atomic upsert so two concurrent requests cannot read the same count. Committed as
`apps/22-get-your-rights/supabase/migrations/20260812170000_ai_rate_limits.sql` for the
record.

Fail open on a counter error, logged — a counter outage must not take a live public
advisor down. Same decision as #165.

Grants, measured over PostgREST with the anon key the site actually ships:

```
POST /rest/v1/rpc/ai_rate_limit_hit  ->  401 {"code":"42501",
    "message":"permission denied for function ai_rate_limit_hit"}
GET  /rest/v1/ai_rate_limits         ->  200 []        (RLS on, no policies)
GET  /rest/v1/rights_reference       ->  Content-Range 0-0/104   (same DB, right project)
```

Deployed through Lovable — the only deploy path for this project — commit `7244d8ce`,
0.6 credits.

## After — against production

| time | call | result |
|---|---|---|
| 16:17 | unauthenticated POST | **200**, 3414 bytes, real answer |
| — | counter read | row `rights-agent:195.60.235.224`, **hits 2**, window 16:00 — written by production itself, not by the test |
| — | counter set to 20 (the cap) | |
| 16:29 | unauthenticated POST | **429**, `Retry-After: 3600`, `{"error":"יותר מדי בקשות מהכתובת הזו. נסו שוב בעוד שעה."}` |
| 16:35 | unauthenticated POST | **429**, same |
| — | counter reset to 0 | 22 hits → 0 (the two blocked probes still counted) |
| 16:36 | unauthenticated POST | **200**, 3648 bytes, real streamed answer — the visitor still gets the product |

## What was not measured, and what this does not claim

- I did not walk call-by-call to the cap: that would spend 20 real AI calls against a
  system prompt that carries all 104 `rights_reference` rows. The counter arithmetic was
  proven on mthbram against the same function (`hits` 1,2,3 vs `p_limit=2` → `allowed`
  flips to false); here the 429 branch was proven end-to-end against production instead.
- The cap is per address, not per identity. Callers behind one NAT share a bucket, and a
  caller with many addresses can still spread out. This protects the wallet from the
  cheap attack; it is not an identity check.
- `query_database` over MCP timed out (300s, no response) on every statement that returns
  rows, four times running — the DDL batch, which returns none, went through instantly.
  The counter reads and writes above were run through the Lovable agent instead. Its data
  reset was recorded by that agent as a migration file in the Lovable repo
  (commit `19ed57ed`) — a data-only `UPDATE ... SET hits = 0`, no schema change.

## Test mode

No charge, no message sent, no account created. The only writes were counter rows in
`public.ai_rate_limits`, reset to 0 afterwards. Protected systems (08, 09, bkalut-app,
bkalot-admin, zr_*, NEDARIM3873) untouched; `csj`/`csj_src`/`igud` not used.
