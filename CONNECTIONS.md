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
| `csjekrvukbdznetsrodj` | 06 kupot-holim, 12 smel-ndln, 17 chizukim-transcribe, 27 bkalut-price (+ unlisted `fin_*`/`pc_*`/`hf_*` apps, 36 tables, not mapped to any `core.projects` row) | ✅ yes (verified 19/08/2026 — stale mark, this project *is* reachable via `execute_sql`/`list_tables`; do not re-assume "❌" without re-checking) |
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

## 🚨 Security finding — `csjekrvukbdznetsrodj`: 15 tables with RLS disabled, incl. plaintext-looking credentials (19/08/2026)

Found while re-verifying the "❌ unreachable" mark above (now corrected — the
project *is* reachable). `list_tables` on this project's `public` schema flags
its own `rls_disabled` advisory (critical) for 15 tables, including
`public.tr_users` (`username`, `password`, `minutes_quota`/`minutes_used` — 1
live row) and `public.tr_sessions` (`token`, `user_id`, `expires_at` — 50 live
rows), plus `users`, `clients`, `service_submissions`, `automation_configs`
(14 rows), `delivery_queue`, and six `property_*`/`address_search_*` tables.
**Anyone holding this project's anon key can read or write every row in these
tables today** — that includes session tokens and whatever `tr_users.password`
actually stores.

**Not fixed this round, on purpose:** `tr_users`/`tr_sessions` are not
referenced anywhere in this repo's vendored source (grepped all of `apps/` —
zero hits), meaning whatever reads/writes them is a **non-vendored backend**
this session cannot see. Supabase's own advisory explicitly warns not to
auto-apply `ENABLE ROW LEVEL SECURITY` without matching policies — doing so
blind would silently deny **all** access (anon and authenticated) the moment
it runs, which is exactly the kind of "break a live connection" regression
the sacred rules forbid. This project also serves `06 kupot-holim` and
`12 smel-ndln` (loop-A-owned, outside this session's edit scope) alongside
`17 chizukim-transcribe`/`27 bkalut-price` — another reason not to touch it
unilaterally. Logged as `core.issues #245`, owner=user: needs a
per-table policy decision (who should read/write each table) before RLS can
be turned on safely.

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
