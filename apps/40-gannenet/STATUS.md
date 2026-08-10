# #40 גננת בקליק — mount status

Served under `more30.com/gannenet` per `more30-priority.md` §0. Add-only: no
feature work until the rest of the platform is done.

The source under this directory is gitignored (`/apps/**`); only `app.json` and
this file are committed. So changes to the app are recorded here.

## Where it stands

| | |
|---|---|
| Source | 49 files / 1.9MB, vendored from `l023131500-ops/-` @ `claude/ganenet-full-system-gdrive-fdflfc` (`f489e2c`) |
| Build | Next.js 14.2.35, production build present, `basePath=/gannenet` via `APP_BASE_PATH` |
| Shelf | 258 files / 157MB in the Supabase bucket `gannenet-shelf` under `seed/`, streamed through `/api/shelf/<name>` |
| Secrets | `core.secrets` only — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`. Never in git. |
| Vercel project | **not created yet** |
| Portal rewrite | **not added yet** (`portal/vercel.dist.json`) |
| `public_visible` | `false`, until it is verified live |

## Never full-fetch the source branch

`gannenet-app/` is 307 blobs / **166MB** there, because the 258 shelf PDFs and
images are committed under `public/shelf/`. A full fetch ran 12 minutes without
writing a byte. Use the GitHub tree API plus the per-blob API instead, and check
each blob with `git hash-object` against the API's sha.

`raw.githubusercontent.com` is blocked from this machine by NetFree and does not
fail loudly — a `.jpg` came back `200` carrying an 18KB block page instead of
817KB of image. `api.github.com` is not blocked, so blobs come through the blob
API as base64. NetFree also re-compresses images in transit and returns `418` on
PDF bodies from `supabase.co`; none of that applies to the production server.

## Changes made to the vendored source

- **`public/sw.js`** — `isFile()` matched only `/api/drive/`, so after the shelf
  moved to `/api/shelf/` nothing read the `FILES` cache for shelf files, and
  everything "שמירת התצוגה לאופליין" saved was unreachable. Now matches both;
  `isCatalog()` likewise gained `/api/catalog` alongside `/api/drive-catalog`;
  `VERSION` bumped to `gannenet-v3` to drop the caches built under the old
  routing. Verified offline — evidence in `QA/gannenet/sw-shelf-offline-0811/`.

No other file was modified. The mount itself needs no code edit: `next.config.js`
already reads `APP_BASE_PATH`, and `lib/base.ts` exports `withBase()` for the
fetch calls, hrefs and service worker that Next's `basePath` does not prefix.

## Next

1. Create the `gannenet-more30` Vercel project, deploy with `APP_BASE_PATH=/gannenet`.
2. Add the three `/gannenet` rewrites to `portal/vercel.dist.json`.
3. Verify live, then set `public_visible=true` and show the card on the home page.

Deploys are still refused until the Vercel quota resets — `core.issues` #83.
