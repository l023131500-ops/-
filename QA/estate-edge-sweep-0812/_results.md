# Estate-wide edge-function sweep — 12/08/2026

Open line (5) from the previous step: mthbram (21) was audited only because #17 walked
into it. The same `verify_jwt=false` + `SUPABASE_SERVICE_ROLE_KEY` pattern was never
checked anywhere else. This is that check, for every non-archived edge function in the
repo.

## Scope

`apps/*/supabase/functions/*/index.ts`, excluding `apps/_archive/**`. 22 functions in
four apps; 9 of them are mthbram's and were audited on 12/08 (#161, #164, #165), so 13
were new.

| app | project ref |
|---|---|
| 01-torah-platform | bieebmnmkffwbqlsfozh |
| 15-egod | hkkkynyoigzlttpynoeo |
| 22-get-your-rights | trerolyveytzgksawrme |

## Method

One unauthenticated `GET` per function — no `apikey`, no `Authorization`, no body.
The discriminator: the gateway answers `401 UNAUTHORIZED_NO_AUTH_HEADER` before the
function runs when `verify_jwt=true`. **Any other response means the function body
executed with no credential at all.**

A bodiless GET was chosen deliberately: every function here reads `req.json()` early,
so it dies on the empty body *before* any write or outbound send. Nothing was POSTed
to `leads-webhook`, `n8n-notify` or `nedarim-*` — those have side effects and proving
a point is not worth polluting real data (same rule applied to #164).

Raw responses: `_probe-noauth.json`.

## Results

| app | function | HTTP | reached the code? | verdict |
|---|---|---|---|---|
| 01-torah | activate-invite | 404 | — | not deployed |
| 01-torah | admin-users | 405 | **yes** | OK — own gate: token → `auth.getUser` → `user_roles` super_admin/tenant_admin |
| 01-torah | ai-match-teacher | 401 | no | gated by verify_jwt |
| 01-torah | nedarim-admin | 401 | no | gated by verify_jwt |
| 01-torah | nedarim-create-payment | 500 | **yes** | open by design — public donation iframe. NEDARIM3873 is protected; not touched |
| 01-torah | nedarim-webhook | 403 | **yes** | OK — own gate, answered `forbidden` |
| 15-egod | activate-invite | 500 | **yes** | #168 — see below |
| 15-egod | ai-match-teacher | 500 | **yes** | acceptable — AI matching over lesson data, no PII returned |
| 15-egod | **seed-demo-portals** | **200** | **yes** | **#167, critical — did real work for an anonymous caller** |
| 22-zchuyot | leads-api | 401 | **yes** | OK — own gate: `x-api-key` → SHA-256 → `api_keys` |
| 22-zchuyot | leads-webhook | 500 | **yes** | #169 — see below |
| 22-zchuyot | n8n-notify | 500 | **yes** | #169 — see below |
| 22-zchuyot | rights-agent | 500 | **yes** | same class as #165 — unmetered LOVABLE_API_KEY |

**No #161-class finding outside mthbram.** Not one function in these three projects
returns personal data to an unauthenticated reader. `leads-api`, the one endpoint that
does `select(*)` over a lead table, checks a hashed API key first — which is exactly the
gate mthbram's `/api/seekers` was missing. The estate is not uniformly broken; mthbram
was the outlier.

## #167 — seed-demo-portals, critical

`GET https://hkkkynyoigzlttpynoeo.supabase.co/functions/v1/seed-demo-portals` with no
headers at all returned **200** and a body listing three profile IDs. The function runs
on `SUPABASE_SERVICE_ROLE_KEY` and, for any caller:

- `auth.admin.createUser` × 3 with **passwords hardcoded in the source** (`Cohen2026!`,
  `Levi2026!`, `Torah2026!`), `email_confirm: true`;
- writes `profiles` rows with `is_approved: true` — an approved rabbi/synagogue/
  organization portal, no review;
- inserts a fake lead (`דוד ישראלי`, `0541112222`) into the live `leads` table.

### What my own call actually did — measured, not assumed

The three profiles read back over PostgREST with the public anon key:

```
rabbi.cohen@igud-shiurim.org  created_at 2026-05-01T10:16:11Z  updated_at 2026-08-12T07:18:12Z
rabbi.levi@igud-shiurim.org   created_at 2026-05-01T10:16:11Z  updated_at 2026-08-12T07:18:13Z
admin@torathaim.org           created_at 2026-05-01T10:16:11Z  updated_at 2026-08-12T07:18:13Z
```

All three predate the probe by three months, so `createUser` hit the "already exists"
branch and **no account was created**. The code takes the `update` path for existing
profiles, which rewrote the same six field values — that is the `updated_at` bump at
07:18, and it is the only change my probe made. Note the code does **not** reset the
password of an existing user, so no live credential was altered.

The seeded lead: `leads?phone=eq.0541112222` returns `[]` to the anon key. That is
**inconclusive** — it is equally consistent with the row being absent and with RLS
hiding it from an anonymous reader, and I have no service_role read on this project.
I am not claiming either way.

### Why a secret and not `verify_jwt`

Same reasoning as #160/#161: the anon key is a valid JWT shipped to every browser, so
`verify_jwt` alone stops nobody. The gate is `SEED_SECRET` + POST + `x-seed-secret`,
and it **fails closed** — with no `SEED_SECRET` in the environment the function answers
`403 seeding disabled`, which is the correct resting state for a demo seeder pointed at
a live project. `verify_jwt = true` added in `config.toml` as a second layer.

Breaks no caller: `seed-demo-portals` appears nowhere in `apps/15-egod/src` — the only
`functions.invoke` in that app is `activate-invite`, from `src/pages/Invite.tsx`.

## #168 — egod activate-invite, high, recorded not fixed

Runs unauthenticated, and on a valid `{code, email}` pair it creates a confirmed user,
marks the profile `is_approved: true`, and **returns `initial_password` in the response
body**. So the invite code is the entire authentication, it is guessable at whatever
rate the attacker likes, and a hit yields a working credential. It needs a rate limit
and/or code-format hardening — a threshold decision, and the flow is live and in use
(`Invite.tsx`), so I did not change it unilaterally.

## #169 — zchuyot leads-webhook + n8n-notify, normal, recorded not fixed

Both run unauthenticated on service_role. Neither returns lead data to the caller, so
this is not a disclosure:

- `n8n-notify` takes a `lead_id`, reads the full lead (ID number, DOB, health status,
  disability percentage, spouse details) and POSTs it to the URL in
  `site_settings.n8n_webhook_url`. The caller gets back only `{success, status}`. The
  exposure is a forced outbound send and a 404-vs-200 existence oracle on lead UUIDs.
- `leads-webhook` is a DB webhook target, but any caller can POST an arbitrary `record`
  and have it forwarded downstream — fake leads injected straight into the n8n pipeline.

Both are integration endpoints whose callers I cannot enumerate from here, so gating
them risks breaking a live automation. User decision, like #164.

