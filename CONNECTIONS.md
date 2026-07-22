# CONNECTIONS.md — more30 connection map

> **Principle:** connect what exists; never break a live connection; never create
> new databases/keys that orphan data; **no secret values in git** (names only).

## Supabase projects (verified — ~10 DISTINCT projects, NOT one)

> ⚠️ Verified in Phase 1 by reading **every** repo's client/.env. The earlier
> "one shared project" assumption is **false**. `core` lives on the ops project
> (`uhnrgujb`) and only **catalogs** the others — it does not connect to them.

| project ref | serves systems | reachable via MCP here? |
|---|---|---|
| `uhnrgujbdxhhmoxcjria` | 32 נדל"ן (schema `nadlan`) + `public` hub + `core` registry | ✅ yes |
| `bieebmnmkffwbqlsfozh` | 01 torah-platform, 02 igud-transcribe, 03 igud-ads, 10 bkalot-rights, 18 torah-editor-mvp | ❌ other account |
| `csjekrvukbdznetsrodj` | 06 kupot-holim, 12 smel-ndln, 17 chizukim-transcribe, 27 bkalut-price | ❌ |
| `mwljkonwdeuaahsigjdp` | 16 chatzor-connect, 24 galilee-connect-hub | ❌ |
| `pwcswdfgorvlpdflzylm` | 08 bkalut-app 🔒 | ❌ |
| `trerolyveytzgksawrme` | 22 get-your-rights | ❌ |
| `jhbeelzvjvhnkxldqvxx` | 30 zchuyotpro-crm | ❌ |
| `hkkkynyoigzlttpynoeo` | 15 egod | ❌ |
| `aypsqqvfohekxxuqsmrw` | 21 mthbram | ❌ |
| `ygaqqnuyfnumezxxmtbh` | 31 hebrew-bridge-crm | ❌ |

> The `core` registry records `supabase_project` + `supabase_schema` per system so
> this is explicit. Only the ops project is manageable from this session.

The hub project (`uhnrgujbdxhhmoxcjria`) details:

| Field | Value |
|---|---|
| Project ref | `uhnrgujbdxhhmoxcjria` |
| Organization | איגוד שיעורים קלואד (`rbwengwuxwujbgsynwcs`) |
| Region | ap-northeast-1 |
| Postgres | 17 |
| Status | ACTIVE_HEALTHY |

**Existing `public` schema tables (verified via API)** — this is the live hub DB,
do not disrupt: `tenants`, `synagogues`, `teachers`, `lessons`, `tenant_ads`,
`teacher_ads`, `portal_messages`, `super_admins`, `platform_admins`,
`prayer_times`, `zmanim_cache`, `community_services`, `national_requests`,
`role_links`, `tenant_payment_settings`, `synagogue_payment_settings`,
`nedarim_donations`, `synagogue_nedarim_donations`,
`platform_subscription_payments`, `startup_intake_submissions`. All have RLS
enabled.

The **`core`** registry is **APPLIED live** on `uhnrgujbdxhhmoxcjria` (additive;
did not touch `public`/`zr_*`/`nadlan`):
- `0001` — `core.projects`, `project_bugs`, `project_tasks`, view `project_overview`.
- `0002` (Phase 1) — new columns (`department`, `is_deployed`, `live_url`,
  `admin_url`, `to_delete`), task `author`, tables `core.missing_tokens` +
  `core.automations`, and **`public.more30_*` views + RPCs** so the admin reads
  live with the **anon key** — **no need to expose the `core` schema**. Writes go
  through `more30_add_task` / `set_task_status` / `set_delete`, gated to a
  signed-in super admin.
- Seeded: **32 projects, 19 missing-token rows, 3 automations, 6 tasks.**
Source: `supabase/migrations/0001…0002` + `supabase/seed/core_projects_seed.sql`.

## Required env var NAMES (names only — values live in the secret store)

| Purpose | Public (browser) | Server-only (never expose/commit) |
|---|---|---|
| Supabase | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` |
| core schema | `CORE_SCHEMA` (=`core`) | — |
| Nedarim Plus | — | `NEDARIM_MOSAD_ID` (=`7016674`), `NEDARIM_API_KEY`, `NEDARIM_WEBHOOK_SECRET` |
| Routing | `BASE_PATH` | — |

> Exact per-app variable names still need confirmation against each repo (see
> "Unverified" below). The Supabase/Nedarim names above are the platform
> convention used by `@more30/db` and `@more30/billing`.

## Status matrix

The full, verified 32-row matrix (department · stage · live · deployed · Supabase
ref · deploy target) now lives in **`apps/README.md`** and, live, in
**`core.project_overview`** (via the `admin/` dashboard). It is no longer
duplicated here to avoid drift. Every `?` from the old table has been resolved by
reading the repos — see the 10-project table above.

Highlights: 32 = **נדל"ן ברגע** (added Phase 1, live on Vercel, `uhnrgujb/nadlan`).
01/03 = live on `bieebmnm` (**not** `uhnrgujb` as previously inferred). 15 egod has
its **own** project `hkkky…` (not shared with 01). Departments: עורך תורני, פיננסי,
נדל"ן, בריאות, זכויות, קהילה, בקלות 🔒, שונות.

### Archive / clean only (do not treat as active, do not delete)
`luxe-balance-hub-81` (+ `-2495305b`, `-18cf8aef`, `-906f08da`, `-8c019fba`),
`luxe-ledger-hub`, `lux-manage`, `bklotm`, `pixel-perfect`.

## 🔒 Protected — never modify
- Repos: `bkalut-app`, `bkalot-admin`
- Schema: `zr_*`
- n8n webhook: `NEDARIM3873`

## Billing — Nedarim Plus
- Mosad (institution) id: **7016674** (not secret).
- Live donation tables already exist in `public`: `nedarim_donations`,
  `synagogue_nedarim_donations`, `tenant_payment_settings`,
  `synagogue_payment_settings`.
- Transport webhook `NEDARIM3873` (n8n) is **protected** — `@more30/billing`
  only shapes payloads, it does not re-point the webhook.

## ❗ Missing / unverified

### Missing token — `igud-transcribe` (#02) — ✅ IDENTIFIED
The missing connection token is **`OPENAI_API_KEY`** (verified by reading the
repo). `lib/openai.ts` throws `"OPENAI_API_KEY חסר ב-ENV"`; transcription runs on
OpenAI **Whisper-1** (verbose_json + timestamps) with GPT-4 literary editing.

**Action:** set `OPENAI_API_KEY` in the deployment secret store (Vercel env), not
in git. The app's full env var names (from its `.env.example`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ADMIN_EMAIL`,
`NEXT_PUBLIC_SITE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
Its Supabase is `bieebmnmkffwbqlsfozh` (its own project). The same OpenAI check
likely applies to `chizukim-transcribe` (#17) — not yet read.

### Unverified (per-app schema, exact env var names, deploy target)
All rows marked `?` above. `igud-transcribe` (#02) is now fully verified (added to
the session and read). The remaining repos still need to be added one at a time to
read their real `.env.example`/config. Nothing here was guessed — `?` means "not
yet read", and `01`/`15` projects are marked "inferred" (from the live hub schema
+ owner statement), not file-verified.

## Migration note — public repo vs private source ⚠️

`l023131500-ops/-` (and `more.30.com`) are **public**; all source systems are
**private**. Vendoring private source into a public repo would expose private
code and risk leaking committed secrets. Therefore `apps/` currently holds
**manifests only** (`"source": "not-vendored"`). Before any real code migration,
decide one of:

1. **Make the monorepo private**, then vendor source into `apps/NN-slug/`.
2. Keep systems as **git submodules / references** (URLs only, no code copied).

This choice is yours — it is the main open decision blocking full consolidation.
