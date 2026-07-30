# Secrets — one source of truth

Every key the platform uses lives in **`core.secrets`** on the hub project
`uhnrgujbdxhhmoxcjria`. Systems read from it at runtime through
`@more30/secrets`. Nothing is copied by hand into a project again.

## The table

`core.secrets(name, scope, value, service, description, source, is_active)`,
unique on `(name, scope)`.

- `scope = 'global'` — one key used by several systems (`OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`, …). Stored once.
- `scope = '<slug>'` — belongs to one system (`nadlan`, `studio`, `chizukim`, …).
  A scoped row **overrides** a global row of the same name.

Scope names are the topic slugs used everywhere else (`more30.com/<slug>`), not
the Vercel project names. `nadlan-berega`, `nadlan-more30` and `32-nadlan-berega`
all normalise to `nadlan`; otherwise the same key lands three times under three
aliases and the loader finds only one of them.

## How it is protected

| Layer | State |
|---|---|
| RLS on `core.secrets` | **enabled, with zero policies** — which denies every non-`service_role` request |
| Grants | `revoke all … from anon, authenticated` |
| PostgREST | only exposes `public`, so the table has no REST route at all |
| `public.more30_secrets_fetch(text)` | `EXECUTE` granted to `service_role` **only** |
| `public.more30_secrets_put(jsonb)` | `EXECUTE` granted to `service_role` **only** |

Verified over HTTP with the real public anon key — the one embedded in every
browser bundle:

| Request | Result |
|---|---|
| `POST /rpc/more30_secrets_fetch` | **401** |
| `POST /rpc/more30_secrets_put` | **401** |
| `GET /rest/v1/secrets?select=name` | **404** (no route) |

And at the database level, as the role the loader actually authenticates as:
`service_role` sees **7 global + 11 nadlan = 18** rows for scope `nadlan`; the
same call as `anon` is refused.

## Reading secrets from a system

```ts
import { loadSecrets, requireSecret, hydrateEnv } from "@more30/secrets";

const secrets = await loadSecrets({ scope: "nadlan" });   // global + nadlan
const key = await requireSecret("OPENAI_API_KEY", { scope: "nadlan" });
await hydrateEnv({ scope: "studio" });                    // copy into process.env
```

The package has **no dependencies** and uses raw `fetch`, so the same file works
in a Next route, an Express app inside a Vercel Function, a nitro handler, or a
plain script. It refuses to run in a browser: importing it into a client bundle
would ship the hub service-role key to every visitor.

Results are cached in module memory for 5 minutes, so a warm lambda does not
re-fetch on every request.

### Bootstrap — two variables per deployment, and only two

```
MORE30_SECRETS_URL = https://uhnrgujbdxhhmoxcjria.supabase.co
MORE30_SECRETS_KEY = <hub service_role key>
```

A deployment that already carries a hub service-role key under its older name
(`SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`) is reused as-is — but
**only when the URL really is the hub**, so one project's key is never sent to
another project's server.

### `hydrateEnv` and the module-order trap

A module that reads `process.env.X` in a **top-level const** is evaluated before
any handler body runs. This is what produced the live
`not_found_error: model: ﻿claude-opus-5` in system 26: the fix-up ran inside the
handler, far too late. If you use `hydrateEnv`, await it in a module that is
imported **first**, before the modules that read the values.

Values are also stripped of `U+FEFF` on the way in — a BOM inside an API key
makes header construction throw `ByteString … 65279` at the point of use, a long
way from the cause.

## Build time — GitHub Actions

`l023131500-ops` is a user account, not an organisation, so there is no org-level
secret store. The shared build secrets are set as **repository** secrets on
`-`, `nadlan-berega`, `chizukim-transcribe` and `chatzor-connect`:

`ANTHROPIC_API_KEY` · `OPENAI_API_KEY` · `GEMINI_API_KEY` · `RECRAFT_API_KEY` ·
`APIFY_TOKEN` · `GOOGLE_MAPS_API_KEY` · `MORE30_SUPABASE_URL` ·
`MORE30_SUPABASE_ANON_KEY` · `MORE30_SECRETS_URL`

> ⚠️ The monorepo `-` is **public**. GitHub does not pass secrets to workflows
> triggered by pull requests from forks, but anyone who can push a workflow file
> to the repo can read them. See `NEEDS_USER.md`.

Runtime-only keys are deliberately **not** duplicated here — they live in
`core.secrets` and are fetched by the loader, so there is one copy to rotate.

## Where the values came from

| Source | Result |
|---|---|
| 39 local `.env` / `.env.local` files | 91 name/value pairs — the real values |
| Vercel, 36 projects, API with `decrypt=true` | **2** usable values |
| Vercel, the other 103 | unreadable — see below |

After de-duplication and promoting shared keys to `global`: **71 rows,
7 global, 21 scopes.**

### Vercel cannot give values back

`vercel env pull` writes `"[SENSITIVE]"` for anything flagged sensitive, and the
API's `decrypt=true` does **not** decrypt: `type=encrypted` rows come back as the
ciphertext envelope `{"v":"v2","c":"…"}`, base64-encoded and ~1,100 characters
long. That envelope is not the value and must never be stored as one — an early
pass of the import would have written 20 rows of ciphertext and `[SENSITIVE]`
into the store as if they were keys. Only `type=plain` is a real value.

So Vercel yields **names, not values**. 31 names exist only there; they keep
working in production, but the hub is not yet their source of truth. They are
listed in `NEEDS_USER.md`.
