# apps/

Each system is registered here as `NN-slug/app.json` — a **manifest** describing
its number, category, stage, Supabase project + schema, deploy target, and
routing basePath.

## Why manifests, not vendored source (yet)

This monorepo repo (`l023131500-ops/-`, and the intended `more.30.com`) is
**public**, while every source system is **private**. Copying private source into
a public repo would expose private code and risk leaking any committed secrets.
So for now `apps/` holds **manifests only** (`"source": "not-vendored"`).

Actual code migration happens after the owner decides how to host the monorepo —
see the **Migration note** in `../CONNECTIONS.md`. Options: make the monorepo
private then vendor source, or keep systems as git submodules/references.

Manifests are generated from the registry: `node scripts/gen-app-manifests.mjs`.
The registry itself lives in `packages/config/src/registry.ts`.
