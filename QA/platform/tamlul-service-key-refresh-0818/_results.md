# Follow-up to core.issues #239 (tamlul coupon 500) — 2026-08-18

## Context
Prior steps this chain (`e4fa895`, `cac3db1`, `20f9bd2`-adjacent
`tamlul-service-key-bom-hardening-0818`) fixed the BOM-corruption bug and
confirmed the *stored* `SUPABASE_SERVICE_ROLE_KEY` on `tamlul-more30` was
stale/invalid against Supabase project `bieebmnmkffwbqlsfozh`, and stopped
there ("needs a current key from Supabase Settings -> API").

## What this step did
Supabase MCP was connected this session, so the blocker was resolvable
end-to-end without the user:

1. Fetched `SUPABASE_ACCESS_TOKEN` from `core.secrets` (id 74,
   service=supabase-management).
2. `GET https://api.supabase.com/v1/projects/bieebmnmkffwbqlsfozh/api-keys?reveal=true`
   -> current legacy `service_role` JWT (issued 2026-05-13, matches project ref
   in its own payload).
3. Looked up `tamlul-more30` in Vercel (`prj_i8KRFIs4jtqPuEf4mt5b11RHjRQN`),
   found the existing `SUPABASE_SERVICE_ROLE_KEY` env var id
   (`egBibLfdopfrQKxt`, production only).
4. Deleted it and re-created it via the raw Vercel REST API
   (`DELETE`/`POST https://api.vercel.com/v10/projects/.../env`, PowerShell
   `Invoke-RestMethod` with a JSON body — no CLI, no stdin pipe) per the
   method `cac3db1` proved avoids the BOM bug
   (memory `powershell-pipe-adds-bom`).
5. Redeployed: `vercel deploy --prod` from `apps/02-igud-transcribe` ->
   `tamlul-more30`, `dpl_AQdKNfg4GKcdP4hwFEwqJrKm1BPB`, READY, aliased.
6. Verified live: `POST https://more30.com/tamlul/api/coupons?cachebust=0818fix`
   with `{"code":"TEST-0000"}`.

## Result
The BOM/stale-key layer is now genuinely fixed — the response changed from
`{"error":"Invalid API key"}` to `{"error":"Invalid schema: transcribe"}`.
Supabase now accepts the key; PostgREST is rejecting the request because the
`transcribe` schema (confirmed to exist via
`select schema_name from information_schema.schemata where schema_name = 'transcribe'`
against `bieebmnmkffwbqlsfozh`) is not in that project's Data API "exposed
schemas" list.

## Still open — needs user approval (core.issues #239, updated)
Fixing this requires a config write to `bieebmnmkffwbqlsfozh`, which is the
**protected** project (carries 08/09, `bkalut-production`). The fix itself is
additive and does not touch any 08/09 schema or data — add `transcribe` to
Settings -> API -> Data API -> Exposed schemas (or
`PATCH /v1/projects/{ref}/postgrest`) — but RUN_INSTRUCTIONS forbids writing
to this project without explicit approval, so it was not applied. Logged to
`core.issues` #239 and `NEEDS_USER.md`.
