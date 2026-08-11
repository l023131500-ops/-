# gannenet (40) — uploaded material was the one source served off our domain

**Fix:** new `app/api/upload/[name]/route.ts`; `lib/supabase.ts` `entryToItem()` now
returns `/api/upload/<object>` instead of the bucket's public `supabase.co` URL;
`public/sw.js` `isFile()` and `/shelf`'s offline prefetch cover the new prefix.

## The bug

`download-disposition-0811` ended on this line: of the three shelf sources, two
(Drive → `/api/drive/[id]`, seed → `/api/shelf/[name]`) are streamed through our
own origin and one was not. `entryToItem()` handed the browser
`https://<ref>.supabase.co/storage/v1/object/public/gannenet-shelf/<file>`, and
everything the other two get from being same-origin, an upload did not have:

| | seed / Drive | upload (before) |
|---|---|---|
| "הורדת הקובץ" downloads | yes (`?dl=1` → `Content-Disposition: attachment`) | **no** — no header to set, and `download=` is ignored cross-origin |
| PDF viewer can read it | yes | **no** — `PdfViewer` reads with `fetch()` |
| service worker sees it | yes | **no** — `url.origin !== location.origin` returns early |
| "שמירת התצוגה לאופליין" | yes | **no** — the list is filtered to `file.startsWith("/")` |
| served under more30.com | yes | **no** — off-domain, against priority §0 |

## The fix

`/api/upload/[name]` is the same shape as `/api/shelf/[name]`, minus the `seed/`
prefix (uploads sit at the bucket root) and with a name pattern that admits only
what `uploadItem()` writes: `^up_[a-z0-9]+_[a-z0-9]+\.[a-z0-9]{1,8}$`. The
extension is the one part of that object name that comes from the user
(`file.name.split(".").pop()`), so `uploadItem()` now replaces anything that is
not a plain short extension with `jpg`/`pdf` — which makes the route's pattern
total: every object the app writes is reachable through it.

## Verified

Production build (`next build` ✓ 65 pages incl. `ƒ /api/upload/[name]`,
`next start -p 3043`, `APP_BASE_PATH=/gannenet`), against the real
`gannenet-shelf` bucket. `tsc --noEmit` 0. `probe.mjs` / `probe.out.txt`:

- a **real** seed file read back through `/api/shelf/…` → uploaded through the
  real `POST /api/catalog` → `item.file = /api/upload/up_msp02sp4_cr56.jpg`
  (same-origin), and `GET /api/catalog` lists the same URL;
- `GET /api/upload/up_msp02sp4_cr56.jpg` → **200 image/jpeg `inline`**,
  with `?dl=1` → **200 `attachment`**;
- the item page renders it (`upload-item-same-origin.png`) — 0 console errors;
- name pattern, probed against the orphan object already in the bucket
  (`up_msoxh0q3_hx4s.png`, left by the upload race two steps ago): plain name →
  200 `inline`, `?dl=1` → `attachment`; `index.json` → 400,
  `up_msoxh0q3_hx4s.exe.png` → 400, `up_x_y.png/../index.json` → 400,
  `../index.json` → 404 (normalised by Next before it reaches us).

Two things this machine cannot show, both environment and not code — the same
NetFree interception documented in `download-disposition-0811`:

1. **Byte equality on read-back.** The seed `.jpg` is 46,672 B in the bucket and
   arrived as 9,743 B; the upload stored exactly what we sent (Storage reports
   `up_msp02sp4_cr56.jpg` = **9,743 B**, so our route + the upload path are
   lossless), and reading it back gave 8,406 B. NetFree recompresses images in
   transit, and the screenshot shows its placeholder ("כעת התמונה נשלחה לנטפרי
   לבדיקה") in place of the picture. Sizes are equal at every hop we control.
2. **A PDF upload.** The first run used a seed `.pdf` and got 502 on the read
   (NetFree answers 418 to PDF bodies from `supabase.co`), so the file it stored
   is a 14-byte error page — `up_msp01lno_a1kw.pdf`. The `.jpg` run exercises the
   identical code path.

**Cleanup.** Both QA uploads (`up_msp01lno_a1kw`, `up_msp02sp4_cr56`) were hidden
through the real admin override (`hide.out.txt`) — the catalog is back to 0 items, so
neither reaches a teacher's shelf. The anon key cannot DELETE from Storage
(`QA/gannenet/overrides-cas-0811/`), so hiding is the only cleanup available; the
blobs stay in the bucket alongside the earlier orphan.
