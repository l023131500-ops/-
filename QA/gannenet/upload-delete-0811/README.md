# upload-delete-0811 — מחיקה לצמיתות של חומר שהועלה

Uploaded material could be **hidden** and never **removed**: `lib/overrides.ts`
drops it from every shelf, and the blob stays in `gannenet-shelf` for ever. There
was no code path in this app that deleted anything at all, because the anon key
cannot DELETE from Storage (403 `AccessDenied` — probed in
`../overrides-cas-0811/`). So the bucket only grew, a file a teacher uploaded by
mistake stayed retrievable to anyone holding its URL, and the orphans earlier
failures left had no way out except a hand-run script.

`POST /api/admin/delete` (ADMIN_PASSWORD, same guard as `/api/admin/override`) +
`deleteUpload()` on the service-role key + a `מחיקה לצמיתות` button on upload
rows in `/shelf/admin`.

## What was verified

Production build (`next build` → 66 routes, `next start` :3043,
`APP_BASE_PATH=/gannenet`), real `gannenet-shelf` bucket.

**Guards** — `_probes.txt`

| request | answer |
|---|---|
| no `x-admin-key` | 401 |
| wrong key | 401 |
| Drive id `1AbCdEfGhIjKlMnOpQrS` | 400 "רק חומר שהועלה כאן" |
| `up_a_b/../index` | 400 |
| `index.json` | 400 |
| `seed` | 400 |
| `up_zzzzzzzz_zzzz` (well-formed, absent) | 404 |
| body that is not JSON | 400 |

The id pattern is `^up_[a-z0-9]+_[a-z0-9]+$` — deliberately narrower than
`/api/admin/override`'s. No Drive id and no seed id can be spelled that way, so
"the shelf's 2,977 catalogued files are unreachable from the one destructive
route" is a property of the route, not of its caller.

**Round trip** — `_roundtrip.txt`, `roundtrip.mjs`. A real seed asset
(`16QLfhd7…jpg`, 29,278 B) read back out of the bucket through our own origin,
uploaded through the real `POST /api/catalog`, then deleted:

- upload → `up_msp0pyli_gyq8`, listed by `/api/catalog`, bytes serve 200
  `image/jpeg`, blob present at the bucket root
- delete → `200 {"removed":["up_msp0pyli_gyq8.jpg","uploads/up_msp0pyli_gyq8.json"]}`
- after → catalog 0 items, blob gone, `uploads/` empty, retry answers **404
  "כבר אינו קיים"** (idempotent)

(Re-running `roundtrip.mjs` rewrites `_roundtrip.txt`, which carries hand-written
notes under the log — copy it aside first.)

**Through the real UI** — `01-admin-delete-button.png`, `02-after-delete.png`.
Logged into `/shelf/admin` with the real password: the uploaded row carries
`מחיקה לצמיתות` and every Drive row does not; the button asks first
("לא ניתן לשחזר"), and on confirm the row disappears and the count goes
2,978 → 2,977. 0 console errors.

**Cleanup, through the product path rather than a script** — the first run of
this harness removed what earlier steps had left: `up_msp02sp4_cr56` and
`up_msp01lno_a1kw` (entry + blob), and `up_msoxh0q3_hx4s.png`, the upload-race
orphan that had a blob and **no entry at all** — the case only the
by-object-name lookup reaches. Bucket now: `index.json`, `overrides.json`,
`seed/` **258 files untouched**, `uploads/` empty, `/api/catalog` 0 items.

## Two defects the verification itself found, both fixed here

1. **The retry was a permanent 502.** Deleting an object that is already gone
   arrives as HTTP **400** with the 404 in the body (the status rewriting this
   whole project sees on Supabase), so `res.status === 404` never matched and
   `deleteUpload()` reported "הסרת הרישום נכשלה — הריצו מחיקה שוב" on a delete
   that had nothing left to do. The read that decided the entry still existed was
   a stale CDN copy, too; that path now takes the same cache-buster
   `lib/overrides.ts` uses.
2. **`/api/upload/[name]` kept serving deleted bytes.** Next caches `fetch()` in a
   route handler by default: measured immediately after the object was removed,
   Storage answered "gone" and the route still returned **200 and the full body**.
   `cache: "no-store"` on the upstream fetch. The response `Cache-Control` was
   `s-maxage=86400` on the premise "written once, never rewritten" — true until
   this step; the shared cache now revalidates every 5 minutes.

`tsc --noEmit` 0.

## Open

- Deletion needs `SUPABASE_SERVICE_ROLE_KEY` in the deployed environment. It is in
  `.env.local` (gitignored) and in `core.secrets`; it must be set on the Vercel
  project when `/gannenet` is finally deployed, or the button answers 503 with
  exactly that sentence. Recorded in `NEEDS_USER.md` §0ר.
- A copy already downloaded to a teacher's browser or held by her service worker
  survives the delete. Nothing server-side can reach it.
