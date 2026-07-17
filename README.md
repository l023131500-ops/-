# more30 — Unified Monorepo

Consolidation of the `l023131500-ops` systems onto **one Supabase API**, with a
central **admin** and a public **portal** (more30). The guiding principle is
**connect what already exists — do not rebuild, do not break live connections.**

## ⛔ Sacred rules

1. **Never break existing connections.** Every system keeps using the **same**
   Supabase project, the **same** schema, and the **same** key names it uses today.
   No new databases or keys that would orphan live data.
2. **No secrets in git.** Only variable *names* live here (see `.env.example` and
   `CONNECTIONS.md`). Real values live in each deployment's secret store.
3. **Protected — do not touch:** `bkalut-app`, `bkalot-admin`, schema `zr_*`,
   n8n webhook `NEDARIM3873`.

## Layout

```
more30/
├─ apps/          # each system, numbered (01..) — registered via app.json manifests
├─ packages/      # shared libraries
│  ├─ config      # basePath + project registry (single source of routing truth)
│  ├─ db          # Supabase client factory (one API)
│  ├─ auth        # single sign-in helpers
│  ├─ ui          # design tokens (visual polish finished later in Lovable)
│  └─ billing     # Nedarim Plus (Mosad 7016674)
├─ admin/         # central admin — reads the core.projects registry
├─ portal/        # more30 portal — lists all systems by category from core
├─ supabase/      # core schema migration + registry seed (NOT auto-applied to live DB)
└─ tooling/
   └─ new-site/   # generator for a new numbered app
```

## One API

There is a **single** Supabase project for the whole account
(`uhnrgujbdxhhmoxcjria`, org "איגוד שיעורים קלואד"). Systems are separated by
**schema**, not by project. A shared `core` schema holds the project registry that
the admin and portal read from. See `CONNECTIONS.md` for the full mapping.

## Status

This is the **skeleton** milestone. See `CONNECTIONS.md` for what is connected,
what is unverified, and what is missing (notably a transcription token in
`igud-transcribe`). Vendoring each system's source into `apps/` is deliberately
**not** done yet — this repo is public and the source systems are private; see
"Migration note" in `CONNECTIONS.md`.
