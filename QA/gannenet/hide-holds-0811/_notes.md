# gannenet (40) — the hide that only held for two thirds of the shelf

11/08/2026 · `next dev` :3042 with the real `.env.local` (`APP_BASE_PATH=/gannenet`),
the real `gannenet-shelf` bucket, the real 2,977-file Drive catalog.

## What was wrong

The shelf serves three sources — the 258 in-repo **seed** assets, the 2,977-file
**drive** catalog, and whatever a teacher adds through **/shelf/upload**. The
previous step made `הסתר קובץ` tell the truth about *saving*. It still was not
telling the truth about *hiding*, for two of the three sources.

**1. Seed-backed files came back after being hidden.** Every one of the 258 seed
assets is an in-repo copy of a Drive file and carries that file's id — verified
here: 258 of 258 seed ids appear in `content/drive-catalog.json`. So on `/shelf`
the seed loop was meant to *upgrade* a drive row to the local copy, but it was
written `for (const i of seedItems) map.set(i.id, i)` — unconditional. When the
admin hid one of those 258, `/api/drive-catalog` dropped it correctly and this
loop put it straight back. Reproduced with the override in place and the old
line restored (`03-old-merge-reinstates-hidden.png`): the API answers **2,976**
items without the target, and the page beside it says **2,977 פריטים** and still
shows the card.

**2. Uploaded material could not be curated at all.** `/api/admin/list` was
`driveItems` only, so an upload had no row in the admin screen — nothing to tick.
And `/api/catalog`, unlike `/api/drive-catalog`, never applied the override map,
so even the hide that `/shelf/[id]` already honoured left the card (and its
download button, which links straight at the file) on the shelf.

## What changed

- `app/shelf/page.tsx` — the seed loop merges onto rows the catalog still lists
  and keeps the `hiddenPages` the catalog attached. New `driveOk` state: an
  empty list because the fetch failed and an empty list because everything is
  hidden are opposite things, and only the first may fall back to the seeds. The
  shelf is a PWA and that fallback is the offline path, so it is kept.
- `app/api/catalog/route.ts` — `applyOverrides()` over the uploaded items.
- `app/api/admin/list/route.ts` — uploads included, tagged with `source`, and
  placed **first**: they are the newest rows and the list pages 40 at a time, so
  at the tail of 2,977 nobody would ever reach them. Seed ids need no separate
  pass — they are drive ids, already in the list.
- `app/shelf/admin/page.tsx` — an upload row is marked `· הועלה כאן`.

## Verified (real data, real bucket)

| step | evidence |
|---|---|
| seed-backed file listed before hiding — 5 matches for the query | `01-shelf-before-hide.png` |
| hidden through `/api/admin/override` → shelf drops to 4, total 2,976 | `02-shelf-after-hide.png` |
| same override, old merge line → API 2,976 / page 2,977, card back | `03-old-merge-reinstates-hidden.png` |
| `/api/drive-catalog` aborted → 258 seed items still shown (offline path) | `04-shelf-offline-seed-fallback.png` |
| a real upload through the real form → admin row **first**, `הועלה כאן` | `05-admin-lists-upload.png` |
| ticked and saved in the UI → `נשמר:` and `/api/catalog` 1 → 0 items | `06-admin-hid-upload.png` |

`tsc --noEmit` exit 0.

## Left as found

`overrides.json` back to `{}`, `index.json` back to `[]`, `/api/drive-catalog`
back to 2,977, `/api/catalog` back to 0. The temporary `public/__qa-key.txt`
(used to hand the admin password to the browser without printing it) was deleted.

## Two things this run turned up, both left open on purpose

- **A hidden file can take a cache cycle to disappear for a returning teacher.**
  The service worker holds `catalog-gannenet-v3`, and it served the pre-hide
  2,977-item catalog to a reloaded page here twice before the caches were
  cleared by hand. The route's own `s-maxage=60` is the smaller half of this.
- **`setOverride()` is a read-modify-write with no compare-and-set.** Two saves
  in the same second lost one: clearing the upload's override re-wrote a map
  read before the seed file's override was cleared, and resurrected it. Visible
  in this run's cleanup, which needed a second un-hide.
