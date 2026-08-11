# gannenet (40) — the service worker deleted every other system's cache

`public/sw.js`, `activate`. Measured in a real Chromium against `next dev` :3042
with `APP_BASE_PATH=/gannenet` (the production base path), 2026-08-11.

## 1. What was there

```js
const keys = await caches.keys();
await Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)));
```

Cache Storage is keyed by **origin**, not by service-worker scope. `caches.keys()`
inside this worker returns every cache at `more30.com` — including those written
by the other systems mounted there. `/galil` (#24) is a vite-plugin-pwa build: it
registers `/galil/sw.js` at scope `/galil/` (`_deploy/galil-more30/galil/registerSW.js`)
and Workbox names its precache `workbox-precache-v2-https://more30.com/galil/`.
That name does not end in `gannenet-v3`, so every gannenet activation deleted it.

The same line also tied the three caches to one version string, so bumping it to
drop a stale catalog would have taken `files-*` with it — the cache that
"שמירת התצוגה לאופליין" fills with the teacher's own downloads.

`/gannenet` is not mounted yet (`STATUS.md`: no Vercel project, no portal
rewrite), so nothing has been deleted in production. This fires on the first
activation after the mount.

## 2. Reproduced on the old line

Seed four caches at the origin, unregister, reload so the page re-registers, wait
for `activate`:

| | before | after |
|---|---|---|
| `workbox-precache-v2-http://localhost:3042/galil/` | `"galil shell"` | **gone** |
| `kiosk-static-v1` | `"kiosk"` | **gone** |
| `files-gannenet-v3` | present | kept |
| `shell-gannenet-v3` | present | kept |

`caches.match('/galil/index.html')` → `null`. Galil's PWA would refetch its whole
precache, and go offline-broken until it did.

## 3. After the fix, identical seed and identical sequence

```
keys:        ["files-gannenet-v3", "kiosk-static-v1", "shell-gannenet-v3",
              "workbox-precache-v2-http://localhost:3042/galil/"]
galil:       "galil shell"
kiosk:       "kiosk"
teacherFile: "teacher saved this"
```

and `catalog-gannenet-v3` — this app's own, superseded by `v4` — is gone. Only
names matching `/^(shell|files|catalog)-gannenet-v\d+$/` are ever considered.

## 4. The catalog was stale-while-revalidate

Carried over from `hide-holds-0811`, which left it open: the SW held
`catalog-gannenet-v3` and served a pre-hide catalog to a reloaded page twice
during that run. `staleWhileRevalidate` returns `hit || fetching` — the cached
copy wins whenever there is one, so a file the admin hid stayed on a returning
teacher's shelf for one whole visit. The catalog is the curation surface; a stale
copy may not be preferred over the live one.

Now network-first with a 3 s budget, cache behind it:

| | served to the page | cache afterwards |
|---|---|---|
| online, cache primed `{"items":[{"id":"STALE-PRE-HIDE"}]}` | `{"ready":true,"items":[]}` (live) | `{"ready":true,"items":[]}` |
| offline, cache holds `OFFLINE-COPY` | `OFFLINE-COPY`, in **8 ms** | unchanged |

Offline the fetch rejects immediately, so nothing waits out the 3 s. `/shelf`
reloaded offline still renders from the shell cache and still falls back to the
258 seed items (`driveOk` false) — 97 anchors on the page, screenshot `03`.

A non-ok response from the server (5xx) is now returned as itself rather than
answered from cache: the page reads `r.ok` and falls back to the seeds, which is
better than resurrecting a hidden file.

Online after the change: **2,977 פריטים**, unchanged (screenshot `04`).

## 5. Also

`p("/api/generate")` in the never-cache list is not a route in this app — the
generator posts to `/api/ai-generate`. Harmless today (the handler returns early
on non-GET) but wrong the moment anything there is fetched with GET. Corrected to
the real path.

`tsc --noEmit` exit 0. No storage, override or catalog state was touched: the
test caches live in the throwaway browser profile only.
