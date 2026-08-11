# gannenet (#40) — "שמירה" in /shelf/admin reported success without saving

## The defect

`lib/overrides.ts::setOverride()` called `writeOverrides(map)` and **discarded the
boolean it returns**, then returned the map. `app/api/admin/override/route.ts`
answered `{ok:true}` unconditionally, and `app/shelf/admin/page.tsx` printed
`נשמר: <title>` on `res.ok`.

So every write failure was reported to the admin as a save. The reachable case is
not exotic: with `SUPABASE_URL`/`SUPABASE_ANON_KEY` unset, `overridesReady` is
`false`, `writeOverrides` returns `false` on its first line, and the route still
said ok — the same shape as the generator bug in `generator-dead-model-0811`,
where a broken feature read as a working one.

Second half of the same lie: the `הסתר קובץ` checkbox wrote straight into `rows`,
the state that is supposed to mirror storage. Ticking it dimmed the row to
`opacity: .6` and turned the label red *before* anything was sent, and a failed
save left that pretend-hidden row on screen.

## The fix

- `setOverride` returns `{ok:true, map}` or `{ok:false, reason:"unconfigured"|"write"}`.
- The route maps those to **503** / **502** with a Hebrew sentence naming what to
  do, and only says `ok` after the object reached storage.
- The route narrows with `"reason" in res`, not `!res.ok` — `tsconfig.json` has
  `strict:false`, which switches discriminated-union narrowing off (`tsc --noEmit`
  fails on `res.reason` otherwise). `/api/catalog` already tests `"error" in result`
  for the same reason.
- The page keeps pending edits in `hiddenDrafts` next to the existing `drafts`;
  `rows` now only ever holds what storage holds. A row whose pending state differs
  from storage is marked `· לא נשמר`, and the failure message from the route is
  shown instead of the generic "שמירה נכשלה.".

## Verified — `next dev` on :3042, real key from `.env.local`

`tsc --noEmit -p tsconfig.json` → exit 0.

**Storage unconfigured** (`.env.development.local` with empty `SUPABASE_*`, deleted
after the run — it takes precedence over `.env.local` per key):

```
POST /gannenet/api/admin/override  {"fileId":"1FAKEIDdoesnotexist_test","hidden":true,"hiddenPages":[2]}
→ 503 {"error":"אחסון הענן אינו מוגדר, ולכן אי אפשר לשמור שינויי ניהול. יש להגדיר SUPABASE_URL ו-SUPABASE_ANON_KEY."}
```

In the browser (`01-save-failed-unconfigured.png`): ticking הסתר קובץ adds
`· לא נשמר` and leaves the row at `opacity: 1`; pressing שמירה shows that Hebrew
sentence, shows **no** `נשמר:`, and keeps the mark. Before this commit the same
click printed `נשמר:` and dimmed the row.

**Real storage** (`02-save-ok-real-storage.png`):

```
POST … {"hidden":true,"hiddenPages":[3,1,3]} → 200 {"ok":true,"override":{"hidden":true,"hiddenPages":[1,3]}}
GET  storage/v1/object/gannenet-shelf/overrides.json
     → {"1FAKEIDdoesnotexist_test":{"hidden":true,"hiddenPages":[1,3]}}
```

and through the UI on a real row: after שמירה the mark clears, the row drops to
`opacity: .6`, and storage holds
`{"1xBLOKC5Yje5p6E9xl-YOGNYw57g2Ro1Y":{"hidden":true}}` while
`/api/drive-catalog` returns **2,976** items instead of 2,977 — the hide is live.

## Left as it was found

Both test overrides were reverted through the same UI/route. `overrides.json` is
back to `{}` and `/api/drive-catalog` back to **2,977** items; no drive file is
hidden. Note when re-testing: reading storage immediately after clicking שמירה can
catch the previous value — the first revert check read the stale entry a moment
before the write landed.

The admin list is `driveItems` only, so material added through `/shelf/upload`
still cannot be hidden or trimmed here. Untouched — that is a scope question for
the admin screen, not this bug.
