# CONNECTIONS.md — more30 connection map

> **Principle:** connect what exists; never break a live connection; never create
> new databases/keys that orphan data; **no secret values in git** (names only).

## Supabase projects (verified — NOT a single project)

> ⚠️ Correction from initial assumption: systems are **not** all on one project.
> - **`uhnrgujbdxhhmoxcjria`** — the shared **hub** project (org "איגוד שיעורים קלואד"),
>   reachable via the connected Supabase API. This is where `core` now lives.
> - **`bieebmnmkffwbqlsfozh`** — **igud-transcribe's own** project (verified by
>   reading the repo). It is in a different account and is **not** reachable via
>   the connected Supabase API here.
>
> The `core` registry (below) records a `supabase_project` per system so this is
> explicit. Only the hub project is manageable from this session.

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

The new **`core`** schema (project registry) has been **APPLIED to the live hub
project** (`uhnrgujbdxhhmoxcjria`): schema `core` + tables `projects`,
`project_bugs`, `project_tasks`, view `project_overview`, RLS, and grants. It is
additive and did not touch `public`/`zr_*`. To read `core` over the Data API, add
`core` to the project's **Exposed Schemas** (Dashboard → API settings).
Source: `supabase/migrations/0001_core_schema.sql` + `supabase/seed/`.

> **⏳ Seed still pending (as of this milestone).** The `core` *schema* (DDL) is
> live, but the *registry rows* are **not seeded yet** — `core.projects` currently
> has **0 rows** (verified via the API). Until
> `supabase/seed/core_projects_seed.sql` is applied, the admin/portal **live
> overlay** shows no rows and both surfaces fall back to the build-time
> `@more30/config` REGISTRY (which always renders). Applying the seed is a
> live-DB write and needs an explicit go-ahead; it is additive/idempotent and
> only writes to `core`. **Next step:** run the seed, then confirm
> `select count(*) from core.projects` = 31.

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

Legend — **Schema/Deploy/Env** `✓`=verified, `?`=needs repo read. All map to
project `uhnrgujbdxhhmoxcjria`.

| # | System | Repo | Category | Stage | Live | Schema | Deploy | Notes |
|---|---|---|---|---|---|---|---|---|
| 01 | Torah Platform (HUB) | torah-platform | hub | live | ✅ | public ✓ | Lovable | + egod; billing via Nedarim |
| 02 | Igud Transcribe | igud-transcribe | transcription | beta | ✅ | **own** `bieebmnmkffwbqlsfozh` ✓ | Vercel ✓ | Next.js14 + Whisper/GPT-4; **missing `OPENAI_API_KEY`** |
| 03 | Igud Ads | igud-ads | advertising | live | ✅ | ? | ? | revenue |
| 04 | Imud Torani | imud-torani | torah | beta | ✅ | ? | Railway | bug: X-Visitor-Id header |
| 05 | Financial Marketing Site | 03-financial-marketing-site | finance | wip | — | ? | ? | |
| 06 | Kupot Holim | kupot-holim | health | wip | — | ? | ? | |
| 07 | Zol | zol | commerce | wip | — | ? | ? | |
| 08 | Bkalut App | bkalut-app | commerce | 🔒 | ✅ | — | — | **PROTECTED — do not touch** |
| 09 | Bkalot Admin | bkalot-admin | commerce | 🔒 | ✅ | — | — | **PROTECTED — do not touch** |
| 10 | Bkalot Rights | bkalot-rights | rights | wip | — | ? | ? | |
| 11 | Bkalut Marketing 2 | bkalut-marketing2 | marketing | wip | — | ? | ? | |
| 12 | Smel Ndln | smel-ndln | other | wip | — | ? | ? | |
| 13 | Property Identity | property-identity | realestate | wip | — | ? | ? | |
| 14 | Bsmachot Plus | bsmachot-plus | events | wip | — | ? | ? | |
| 15 | egod (HUB pair) | egod | hub | live | ✅ | public ✓ | Lovable | shares Supabase with 01 |
| 16 | Chatzor Connect | chatzor-connect | other | wip | — | ? | ? | |
| 17 | Chizukim Transcribe | chizukim-transcribe | transcription | wip | — | ? | ? | verify transcription token |
| 18 | Torah Editor MVP | torah-editor-mvp | torah | wip | — | ? | ? | |
| 19 | Igud Shiurim Portal | igud-shiurim-portal | torah | wip | — | ? | ? | |
| 20 | Igud Portal | igud-portal | torah | wip | — | ? | ? | |
| 21 | Mthbram | mthbram | other | wip | — | ? | ? | |
| 22 | Get Your Rights | get-your-rights | rights | wip | — | ? | ? | |
| 23 | Haorech Torani | haorech-torani | torah | wip | — | ? | ? | |
| 24 | Galilee Connect Hub | galilee-connect-hub | other | wip | — | ? | ? | |
| 25 | Mor1 Main Site | mor1-main-site | marketing | wip | — | ? | ? | |
| 26 | Modaot Studio | modaot-studio | advertising | wip | — | ? | ? | |
| 27 | Bkalut Price | bkalut-price | commerce | wip | — | ? | ? | |
| 28 | Kupot Health Funds | kupot-health-funds | health | wip | — | ? | ? | |
| 29 | Bkalot Design | bkalot-design | marketing | wip | — | ? | ? | |
| 30 | ZchuyotPro CRM | zchuyotpro-crm | crm | wip | — | ? | ? | |
| 31 | Hebrew Bridge CRM | hebrew-bridge-crm | crm | wip | — | ? | ? | |

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
