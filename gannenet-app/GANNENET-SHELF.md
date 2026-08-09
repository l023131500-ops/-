# מדף הגננת — Shelf module (added)

Independent, additive module built on top of the working `gannenet-app` base.
**No existing file or content was modified or deleted.** Everything here is new.

## What was added
- **`content/catalog.json`** — 41 curated, pre-classified materials pulled from the
  Google Drive folder `1j3FpRlwa9hwPUN9-W1UsEbmy5Mseq7Ko` (source: the offline
  archive = the quality-filtered subset). Ordered by the Hebrew pedagogical year.
- **`public/shelf/*`** — the 41 real files (37 PDF, 4 images), served statically for
  view + download. Self-contained; works with zero external dependencies.
- **`app/shelf/page.tsx`** — the shelf: filter by category (ordered), source, type, search.
- **`app/shelf/[id]/page.tsx`** — in-browser viewer (PDF/image) + download.
- **`app/shelf/upload/page.tsx`** + **`app/api/catalog/route.ts`** — "fill content":
  upload a PDF/image that is added to the shelf live.
- **`lib/catalog.ts`**, **`lib/supabase.ts`** — catalog helpers + storage-only store.

## Storage (uploads) — maximum isolation
Uploads use **only a single public Supabase Storage bucket** `gannenet-shelf`
(metadata in one `index.json` inside it). **No database table, no schema, no
migration** — nothing that touches the shared project's Postgres schemas. The
41 seed files live in the repo and are always available even without the bucket.

The anon key is used **server-side only** (in the API route); the browser never
sees it, and uploads are validated (type/size) before hitting storage.

## Environment variables (set in the deploy platform, never in git)
```
SUPABASE_URL=https://uhnrgujbdxhhmoxcjria.supabase.co
SUPABASE_ANON_KEY=<anon key>        # server-side only
ANTHROPIC_API_KEY=<optional>        # enables the live task-page generator
```
If `SUPABASE_*` are unset the app still runs fully with the seed catalog
(view + download); only new uploads are disabled (shown clearly in the UI).

## Run / build
```
cd gannenet-app && npm install && npm run build && npm start
```

## Connecting into the unified monorepo later
This app is intentionally standalone (its own `package.json`, npm lockfile) and is
NOT wired into the pnpm workspace or shared packages — so it cannot affect, and is
not affected by, the live monorepo work. To integrate later: register it in
`core.projects` and (optionally) adopt `@more30/*` shared packages.
