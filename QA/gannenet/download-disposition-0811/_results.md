# gannenet (40) — "הורדת הקובץ" did not download

## The defect

`/api/shelf/[name]` and `/api/drive/[id]` both stream a file through our own
origin and both answer `Content-Disposition: inline` unless the request carries
`?dl=1`. Only drive items ever carried it:

```
// app/shelf/[id]/page.tsx (before)
// Drive-streamed files force attachment via ?dl=1; local assets download directly.
function downloadUrl(item: ShelfItem) {
  return item.source === "drive" ? `${withBase(item.file)}?dl=1` : withBase(item.file);
}
```

The comment was true once. The seed assets used to be static files under
`public/shelf/`; they now live in the `gannenet-shelf` bucket and are served
through `/api/shelf/<name>` — all 258 of them (`content/catalog.json`: 258/258
`file` values start with `/api/shelf/`, 234 pdf + 24 image). `public/sw.js`'s
`isFile()` carried the same stale assumption after that move and was fixed for
the same reason (`sw-shelf-offline-0811`); this was the second site.

So for every seed file the "הורדת הקובץ" button's href was **byte-identical** to
the "פתיחה בכרטיסייה חדשה" button beside it. Clicking it opened the PDF in the
tab instead of saving it. Same bug on the `/shelf` grid's "הורדה" button
(`app/shelf/page.tsx`, the same ternary inline).

## Before — measured on `next dev` :3042, `APP_BASE_PATH=/gannenet`

The route does support both dispositions; nothing was asking for the second one:

```
GET /gannenet/api/shelf/16QLfhd7...916_.jpg        -> 200  disposition=inline
GET /gannenet/api/shelf/16QLfhd7...916_.jpg?dl=1   -> 200  disposition=attachment
```

Rendered hrefs on `/gannenet/shelf/<seed id>` — the two buttons, identical:

```
ITEM 1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f
  api href: /gannenet/api/shelf/1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f.pdf
  api href: /gannenet/api/shelf/1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f.pdf
```

## The fix

One `downloadUrl(file)` in `lib/base.ts`, keyed on the **URL** rather than on
`source`, so it stays right for whatever a later source streams through `/api/`:

```ts
export function downloadUrl(file: string): string {
  const url = withBase(file);
  if (!file.startsWith("/api/")) return url; // off-origin or a static asset
  return url + (url.includes("?") ? "&" : "?") + "dl=1";
}
```

Used by `app/shelf/[id]/page.tsx` (both call sites) and `app/shelf/page.tsx`.
The predicate is applied to the raw `file`, not to `withBase(file)`, because the
prefixed form is `/gannenet/api/...` and would not match.

## After — production build, `next start` :3043

`next build` ✓ 65 pages, `tsc --noEmit` 0.

Item page, in the browser, both buttons fetched:

```
הורדת הקובץ            /gannenet/api/shelf/16QLfhd7...916_.jpg?dl=1
                       200  disposition=attachment  29,278 B
פתיחה בכרטיסייה חדשה   /gannenet/api/shelf/16QLfhd7...916_.jpg
                       200  disposition=inline
```

`/shelf` grid, client-side after hydration, `?cat=חנוכה` (dev) and unfiltered
(prod) — every download button, both sources:

```
dev  /shelf?cat=חנוכה : 48 buttons = 13 seed + 35 drive, 48/48 carry dl=1, 0 off-origin
prod /shelf           : 48 buttons =  2 seed + 46 drive, 48/48 carry dl=1, 0 off-origin
```

No regression: `מוצגים 48 מתוך 2,977`, `21 קטגוריות`, unchanged. Drive items are
untouched (`/api/drive/<id>?dl=1` on download, bare on open, as before).
Screenshot `after-prod-item.png`.

## Two things this run had to rule out

**A hydration warning that was not the change.** On `next dev` React logged
`Prop href did not match. Server: ...pdf?dl=1  Client: ...pdf` — the client
missing the `dl=1` the server had, i.e. the *old* code on the client. The client
DOM was nevertheless correct (13/13 seed hrefs with `dl=1`), which is HMR
replacing the module after hydration. The production build, where both sides are
compiled from the same source, logs **0 console errors** on `/shelf` and on the
item page. It was the stale dev chunk.

**PDFs 502 on this machine.** `GET /api/shelf/<any>.pdf` returns 502 here
because the upstream is NetFree-blocked:

```
https://<proj>.supabase.co/storage/v1/object/public/gannenet-shelf/seed/<id>.pdf
  -> 418 Error in NetFree
https://<proj>.supabase.co/storage/v1/object/public/gannenet-shelf/seed/<id>.jpg
  -> 200 29,278 B
```

A property of this network, not of production or of the route (`.jpg` proves the
same code path end to end, and the route is type-agnostic). Recorded in
`STATUS.md` already for image bodies.

## Open — uploaded material still cannot be downloaded

`lib/supabase.ts`'s `entryToItem()` sets `file: publicUrl(storage_path)`, an
absolute `https://<proj>.supabase.co/...` URL, so an uploaded file is the one
source **not** streamed through our own origin. Probed against the real bucket:

```
GET https://<proj>.supabase.co/storage/v1/object/public/gannenet-shelf/up_msoxh0q3_hx4s.png
  200  Access-Control-Allow-Origin: *
       Cache-Control: no-cache, no-store, must-revalidate
       (no Content-Disposition)
```

Consequences, none of which `downloadUrl` can fix from the client side:

1. **No download.** No `Content-Disposition`, and a `download` attribute is
   ignored by browsers on a cross-origin href — so there is no way to make that
   button save the file while the URL points off-origin.
2. **Never cached, never offline.** `no-store` upstream; `sw.js`'s `isFile()`
   matches only `/api/drive/` and `/api/shelf/`; and `/shelf`'s prefetch filters
   `file.startsWith("/")`, so uploads are excluded from
   "שמירת התצוגה לאופליין" entirely.
3. **Off-domain.** §0 is "under more30.com, no external hosts", and
   `/api/shelf/[name]`'s own comment says streaming exists to avoid exactly
   this. NetFree — this app's audience — 418s PDF bodies from `supabase.co`.

The fix is a route that streams an upload through our origin
(`/api/shelf/u/<id>`, resolving `uploads/<id>.json` for the real
`storage_path`/mime so no arbitrary bucket object is reachable) and
`entryToItem()` returning that path instead of `publicUrl()`. Then `downloadUrl`
already handles it, the SW already caches it, and the prefetch already includes
it. Next step.

## Also open, smaller

Both routes send a bare `attachment` with **no filename**, so a saved file lands
as `1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f.pdf` — a Drive id, not the Hebrew title.
Needs a `filename*=UTF-8''…` from the item title; the route does not know the
title today.
