# upload-gone-0811 — המחיקה מגיעה גם למטמון של הגננת

`upload-delete-0811` closed "nothing in this app can delete", and ended on the
line this closes: **a copy already held by a teacher's service worker survives
the delete — nothing server-side can reach it.** Half of that was untrue. The
copy on her disk is unreachable; the copy in her service worker is not, because
this app writes the service worker.

Two things stood in the way.

1. **`/api/upload/[name]` could not say "gone".** Every non-ok upstream became
   `502`, so nothing on the client could tell a deleted file from a broken one —
   and a service worker must never drop a teacher's offline material on a
   maybe.
2. **Files are cache-first in `FILES`, with no expiry and no revalidation.** For
   Drive files and the 258 seed assets that is simply correct: they are
   immutable. An upload is the one shelf source that can be deleted.

## What ships

- `app/api/upload/[name]/route.ts` — a real **404** when Storage says the object
  is gone, `502` kept for actually broken; plus a `HEAD` handler, so the check
  costs no bytes.
- `public/sw.js` — `evictIfGone(req)` behind the response for `/api/upload/`
  only. The teacher still gets her copy on the view that discovers the delete;
  she stops getting it after that.

## Verified — production build (`next build`, `next start :3043`,
`APP_BASE_PATH=/gannenet`), real `gannenet-shelf` bucket

**Route** — `_probes.txt`, `probes.mjs`

| | before delete | after delete |
|---|---|---|
| `GET /api/upload/<id>.jpg` | 200 `image/jpeg` 29,278 B | **404** |
| `HEAD /api/upload/<id>.jpg` | 200, no `Content-Length` | **404** |
| `HEAD …?dl=1` | 200 | **404** |

Guards unchanged and answered identically on both verbs: `index.json`, `seed`,
`up_a_b.tar.gz`, `up_a_b`, `..%2Findex.json` → all **400**, none reaches Storage.

**Service worker** — a real upload, cached, deleted through the real
`/api/admin/delete`, then viewed again:

```
before   ["/gannenet/api/upload/up_msp1tqny_3tm1.jpg",
          "/gannenet/api/upload/up_msp1tqny_3tm1.jpg?dl=1"]
this view 200 29278B      <- cache-first: she still gets her copy
after    []               <- both keys dropped
next view 404             <- and nothing put them back
```

**Offline, the case that must not regress** — same file cached, then the server
stopped: the view is served `200 29278B` from `FILES` and the entry is **still
cached** three seconds later. A rejected check is not "gone".

`/shelf` renders 2,977 items with **0 console errors** — `01-shelf-after.png`.
`tsc --noEmit` 0. Bucket left exactly as found: `index.json`, `overrides/`,
`overrides.json`, `seed/` **258**, `uploads/` **empty**, `/api/catalog` 0 items,
`/api/drive-catalog` **2,977**. Every probe upload was removed through the
product path.

## Three defects the verification itself found

1. **The obvious HEAD hangs.** Reusing the GET upstream and `body.cancel()`-ing
   it returned 400 and 404 fine and, for the one id that had bytes behind it,
   **never returned a byte — not even the status line** (two runs of
   `probes.mjs`, then a raw `http.request` that timed out before the headers).
   The HEAD handler now asks Storage with HEAD, so there is no body to cancel.
   Dropping `Content-Length` from a body-less response was also necessary and
   was *not* sufficient.
2. **Storage's CDN and origin disagreed about whether the file exists.** Seconds
   after the delete, an upstream HEAD said gone and an upstream GET for the same
   URL returned **200 and all 29,278 bytes** — so the route answered 502
   ("broken") for a file that was deleted, and served its bytes. `lib/overrides.ts`
   documents the same CDN and the same remedy: a request header does not
   dislodge it, a distinct URL does. The upstream URL now carries a cache-buster.
3. **The eviction worked and the browser undid it.** With the SW cache correctly
   emptied, the very next view came back **200**: the file's own `max-age=300`
   let the browser's HTTP cache re-serve the deleted bytes, and `cacheFirst` put
   them straight back. The network leg for uploads is now `cache: "no-store"`,
   and the response `max-age` dropped 86400 → 300 for the same reason — a
   day-long browser copy outlives the delete.

## Open

- Deletion still needs `SUPABASE_SERVICE_ROLE_KEY` in the deployed environment
  (`NEEDS_USER.md` §0ר).
- A file already **downloaded to disk** survives, and so does a cached copy in a
  browser that never comes back online. Neither is reachable from anywhere.
- An upload is now fetched past the Supabase CDN on every `FILES` miss. With
  uploads at 0 items and our own `max-age=300` in front, that is the cheap side
  of the trade; if uploaded material ever grows large, this is the line to
  revisit.
