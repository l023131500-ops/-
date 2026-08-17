# csjekrvu (`csjekrvukbdznetsrodj`) — `public.recordings` anon-write hole — recheck 17/08/2026

## What this checks
NEEDS_USER.md §2 ("🔴 2. פרצת אבטחה פתוחה — ה-anon key מוחק את ארכיון התמלולים")
was last measured live 12/08/2026 (five days ago) and says the fix cannot be
applied from here because the Supabase PAT "doesn't see" this project — a
different Supabase account than the hub (`uhnrgujbdxhhmoxcjria`).

That premise contradicts evidence recorded *elsewhere in the same file, same
day* (12/08): `SUPABASE_ACCESS_TOKEN` (core.secrets, scope=global) was used via
the Management API to flip `mailer_autoconfirm` on this exact project ref
(`csjekrvukbdznetsrodj`) and to deploy `geo.ts` (v1→v2, #158) to it — both
confirmed working. See memory `supabase-pat-covers-ten-projects` (16/08): the
PAT reaches ten project refs including this one; only four *other* satellite
projects (21/15/lux-manage/31) are genuinely unreachable and need Lovable.

## Method (read-only / zero-row-match — no data touched)
Used the public `anon` key already embedded in the client bundle
(`apps/06-kupot-holim/site/supabase-config.js`, `role=anon`, same key as every
prior measurement of this issue). All write probes filtered on an
id that cannot exist (`00000000-0000-0000-0000-000000000000`), so a "success"
status proves the grant/RLS state without touching any of the 1,138 real rows.

```
GET    /rest/v1/recordings?select=id&limit=1        -> 206  Content-Range: 0-0/1138
DELETE /rest/v1/recordings?id=eq.<impossible-uuid>   -> 204  (grant allowed it; 0 rows matched)
PATCH  /rest/v1/recordings?id=eq.<impossible-uuid>   -> 400  PGRST204 "title column not found"
                                                          (schema error, not an RLS/permission error —
                                                           inconclusive on PATCH specifically, but the
                                                           DELETE result alone confirms RLS is still off)
```

## Result
**Still open.** Row count unchanged at exactly 1,138 (matches the 12/08 and
02/08 measurements — no drift, no accidental writes from any of these
checks). The `anon` key still holds an unrestricted `DELETE` grant with RLS
either disabled or policy-less on `public.recordings`.

## What's actually still blocking the fix
Not "wrong Supabase account" — the PAT *can* reach this project via the
Management API (`POST /v1/projects/csjekrvukbdznetsrodj/database/query`),
proven by the 12/08 auth-config and function-deploy calls above. The real
blocker is narrower: reading `SUPABASE_ACCESS_TOKEN` out of `core.secrets`
itself requires the Supabase MCP connection to the hub project, and that MCP
was not connected in this session (confirmed: no `mcp__supabase__*` tool was
offered). The fix SQL is already written and reviewed at
`db/apps/17-chizukim-transcribe/0001_close_public_write_on_recordings.sql`
(step 1 — enable RLS + read-only policy + revoke write from anon — needs no
further decision, is additive/reversible, and touches only this table).

**Next session with the Supabase MCP connected:** read the PAT from
`core.secrets`, `POST` the step-1 SQL from that file to
`/v1/projects/csjekrvukbdznetsrodj/database/query`, then re-run this same
DELETE/PATCH probe — DELETE should flip from 204 to 401/403 and the GET count
should stay at 1,138.

No code change, no deploy, no protected system touched. Evidence only.
