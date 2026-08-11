# gannenet (#40) — the upload index lost 7 of 8 uploads, and their files with it

`lib/overrides.ts` was moved off a single shared object in the previous step
(`overrides-cas-0811`). `lib/supabase.ts` — the upload store — still held every
uploaded item in one `index.json` array and wrote it read-modify-write. It is
the worse of the two: the loser's **bytes are already in the bucket**, so what
is lost is only the entry naming them, and the file becomes an orphan that
nothing can list, reach or clean up. The bucket was carrying one such orphan
before this step began (`up_msoxh0q3_hx4s.png`, left by `hide-holds-0811`).

## Measured first, against the real bucket

`race.mjs` posts two uploads at once through the real `/api/catalog` route and
reads the catalog back. Four runs, eight uploads (`race-before.txt` — the run's
own log, renamed off `.log` because the repo ignores that extension):

```
run 1..4: A=200 B=200 | in catalog: A=false B=false   <-- every one
lost a save in 4 of 4 runs
```

Every upload answered **200**. Afterwards `index.json` held exactly **one**
entry, `before-r4-B`, and the bucket held **eight** `.png` blobs — 7 orphans.

Reading the object directly explained why it was 1 survivor and not the 4 a
pure race would cost. The authenticated read of `index.json` is fronted by
Supabase's CDN, and the two disagreed at the same instant:

```
GET .../index.json?t=<random>   ->  [{"id":"up_msoyz8ne_3g5a","title":"before-r4-B",...}]
GET .../index.json              ->  []
```

So the un-busted read served a stale empty array: `/api/catalog` showed nothing
after a successful upload, and every read-modify-write started from `[]` and
overwrote the whole list with a single entry. `lib/overrides.ts` documents the
same CDN behaviour and cache-busts its admin read-back; `lib/supabase.ts` never
did, and its comment claimed the opposite ("avoids CDN staleness").

## What ships

One object per upload, `uploads/<id>.json` — the shape already proven for
overrides. Two uploads are two keys and cannot collide, and there is no shared
array to rewrite, so a stale read cannot destroy anything: the read path is now
list-the-prefix plus N fetches, and each object is written once and never
mutated, so a cached copy of it is the correct copy. `readEntries()` folds the
legacy `index.json` array in underneath, per-upload objects authoritative, so a
bucket written by the old code keeps its uploads.

Per-object storage has no insertion order, and the array's order was the
"newest first" the shelf shows. Ids are `up_<base36 ms>_<base36 rand>`, so
creation time is readable off the id itself — no field added, and legacy
entries sort correctly beside new ones.

`uploadItem` no longer swallows the metadata write: the bytes are in the bucket
by then, so a failure returns a Hebrew sentence telling the teacher to send
again rather than reporting a save that left an orphan.

## Verified

Same harness, same bucket, after the change (`race-after.txt`):

```
run 1..4: A=200 B=200 | in catalog: A=true B=true
lost a save in 0 of 4 runs
```

`/api/catalog` then listed **9** items — the 8 concurrent uploads newest-first,
with `before-r4-B` from the legacy `index.json` folded in underneath it, so the
migration path is verified against real data rather than asserted.
`01-shelf-eight-concurrent-uploads.png` is `/shelf?q=after-r`: "מוצגים 8 מתוך 8",
2,986 פריטים · 21 קטגוריות (2,977 drive + 9 uploads), 0 console errors.
`tsc --noEmit` 0 over 665 files.

## Bucket left exactly as found

All 24 probe objects deleted with the service-role key (16 blobs + 8 metadata
objects), `index.json` restored to `[]`, `overrides.json` still `{}`, root back
to `index.json, overrides.json, seed, up_msoxh0q3_hx4s.png`. `/api/drive-catalog`
2,977. The pre-existing orphan is left where it was — it is evidence, and
removing it is a curation decision, not this step's.

Nothing outside `apps/40-gannenet` touched. No protected system
(08/09/`bkalut-app`/`bkalot-admin`/`zr_*`/`NEDARIM3873`) read or written. Test
mode throughout — no send, no charge.
