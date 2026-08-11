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

- **`lib/catalog.ts`** — `CATEGORY_ORDER` named 11 categories; the shelf holds 21.
  It is read twice: `/shelf` orders its category chips by it ("מסודרים לפי סדר
  השנה"), and `/shelf/upload` *is* it — the category dropdown is
  `CATEGORY_ORDER.map()`. So 937 of 2,977 files (31.5%) sat in ten rank-tied
  categories ordered by the date of each one's oldest file — `ספירת העומר /
  ל"ג בעומר`, a holiday belonging between פסח and שבועות, came 14th, after
  `דפי צביעה` — and a teacher adding material could not file it under any of
  those ten, including `כללי`, which holds 679 files. The list now carries all
  21 in year order, and `sortItems`/`orderedCategories` tie-break equal ranks by
  name so a category arriving later from the Drive catalog still groups together.
  Evidence in `QA/gannenet/shelf-category-order-0811/`.

- **`lib/season.ts` (new) + `app/calendar/page.tsx` + `app/shelf/page.tsx`** —
  §1ה of `GANNENET_BUILD.md` asks the calendar to reach the shelf; the calendar
  page instead ended on the sentence "בהמשך יחובר לנושאים המומלצים לכל שבוע",
  and neither page linked to the other. `season.ts` maps a hebcal `basename()`
  — stable English, unlike the Hebrew string the page renders — to a shelf
  category, and `weekTopics()` returns the dates in the next 45 days that have
  material behind them, one entry per category. `/calendar` now shows those, and
  the week's parasha, as cards carrying the real count and linking to
  `/shelf?cat=…`; `/shelf` reads `cat` and `q` off the URL on mount, which it
  never did. The counts repeat the shelf's own merge (drive, then seed by id) so
  they cannot drift: 19 and 202 on the cards, "מוצגים … מתוך 19 / 202" on the
  shelf. A category with no material is dropped rather than linked. Walked over
  all 53 weeks of 5787 it reaches 8 categories — every holiday category the
  shelf holds except `סוף שנה / קיץ`, which no date triggers. Evidence in
  `QA/gannenet/calendar-shelf-link-0811/`.

- **`lib/season.ts` + `app/calendar/page.tsx`** — "מועדים בחודש זה" built its
  list by scanning the whole Hebrew year, filtering to the current month and
  cutting it at `.slice(0, 8)`. Three months hold more than eight dates and they
  are the three a gan plans hardest for: תשרי (16) lost שמיני עצרת, כסלו (11)
  stopped at the sixth candle, ניסן (14) lost פסח ז׳ and יום השואה. Worse,
  standing in Elul the list showed ערב ראש השנה **twice** — the year scan for
  year Y opens with 29 Elul of Y−1, whose month is also Elul — and since the
  list printed bare names with no date, the two lines were identical a year
  apart. The new `monthEvents()` bounds the query by the Gregorian dates of day
  1 and the last day of that Hebrew month, so nothing needs cutting and the
  previous year cannot leak in, and each line now carries the day in gematriya
  and the civil date, mutes what has passed, marks today, and links to the shelf
  category where there is material. Across 5786 and 5787 that is 183 dates
  listed against 149 real ones before. Evidence in
  `QA/gannenet/calendar-month-dates-0811/`.

- **`app/api/ai-generate/route.ts` + `app/generator/page.tsx`** — the מחולל
  asked for `claude-3-5-sonnet-latest`, which is retired, so every generation
  came back `404 not_found_error`; the feature had never produced a page. It
  read as silent rather than broken because the page did `setRes(await
  r.json())` — an error body is valid JSON, so the result card rendered with an
  undefined title and no reason on screen. Model → `claude-opus-5` with
  `max_tokens` 1500 → 16000 (thinking is on by default there and `max_tokens`
  bounds thinking + text together). The route now passes the upstream status
  through and maps 429/401/5xx to an actionable sentence, strips a ```` ```json ````
  fence before parsing (the old bare `JSON.parse` dumped the raw reply into
  `instructions`), and coerces `contentElements`/`designHints` to arrays — the
  page `.map()`s both, and a string would have passed the `?.length` guard and
  crashed the render. The page checks `r.ok`/`data.error` and moved
  `setLoading(false)` into `finally`. Evidence in
  `QA/gannenet/generator-dead-model-0811/`.

- **`app/api/ai-generate/route.ts`** — the same generation took ~72 s, longer
  than any serverless function limit it would be deployed behind. The previous
  entry recorded that `effort` and streaming "both need an SDK newer than the
  vendored 0.27.3"; that is true of the *types* only — the SDK serialises the
  params object as-is, so an untyped field still goes on the wire. Proven rather
  than assumed: a deliberately invalid `output_config.effort` comes back **400
  `Input should be 'low', 'medium', 'high', 'xhigh' or 'max'`**, so the API
  received it. The request is now built as a plain object carrying
  `output_config: {effort: "low"}` and cast to
  `MessageCreateParamsNonStreaming` at the call, plus `export const maxDuration
  = 60`. Five runs: 37.1 / 59.1 / 32.7 / 33.1 / 57.3 s — every one returns, none
  is cut off. The spread is the finding: **time tracks the size of the answer
  almost linearly** (1349 ch → 32.7 s, 2209 ch → 57.3 s). What the route pays
  for is writing ~2 KB of menuqad Hebrew, not reasoning — adding
  `thinking: {type:"disabled"}` on top ran the same three topics in 41.2 / 37.3
  / 32.8 s, inside the noise, so thinking stays on rather than take the
  documented XML-tag-leak risk for nothing. Evidence in
  `QA/gannenet/generator-effort-0811/`. **Open:** a long answer still lands at
  ~57 s against the 60 s ceiling. The remaining lever is the size of the page —
  the system prompt bounds neither `contentElements`/`designHints` (the model
  picked 6–7) nor `instructions` (376–572 chars) — and that is a product
  decision, so it is in `NEEDS_USER.md`.

- **`lib/overrides.ts` + `app/api/admin/override/route.ts` + `app/shelf/admin/page.tsx`**
  — `setOverride()` threw away the boolean `writeOverrides()` returns, the route
  answered `{ok:true}` unconditionally, and the page printed `נשמר: <title>` on
  it. So a write that never happened was reported as a save, and the reachable
  case is the ordinary one: with `SUPABASE_*` unset `writeOverrides` returns
  `false` on its first line and the admin was still told the file was hidden.
  The same lie ran the other way through the UI — the `הסתר קובץ` checkbox wrote
  into `rows`, the state that mirrors storage, so a row dimmed to `opacity:.6`
  *before* anything was sent and stayed that way when the save failed.
  `setOverride` now returns `{ok, reason}`, the route maps that to **503**
  (unconfigured) / **502** (write failed) with a Hebrew sentence and only says
  `ok` after the object lands, and the page keeps pending edits in
  `hiddenDrafts` beside the existing `drafts`, marks a row `· לא נשמר` while it
  differs from storage, and shows the route's own message. It narrows with
  `"reason" in res` rather than `!res.ok`: `tsconfig.json` sets `strict:false`,
  which switches discriminated-union narrowing off — `/api/catalog` tests
  `"error" in result` for the same reason. Verified both ways on `next dev`
  :3042 with the real key: unconfigured → 503 and no `נשמר:` on screen;
  configured → 200, `overrides.json` carries the entry and `/api/drive-catalog`
  drops to 2,976 of 2,977 items. Both test overrides were reverted through the
  same UI — `overrides.json` is back to `{}`. Evidence in
  `QA/gannenet/admin-save-truth-0811/`. **Open:** the admin list is `driveItems`
  only, so material added through `/shelf/upload` still cannot be hidden or
  trimmed there.

- **`app/shelf/page.tsx` + `app/api/catalog/route.ts` + `app/api/admin/list/route.ts`
  + `app/shelf/admin/page.tsx`** — the line above ended on the admin list being
  `driveItems` only. Following it found that the hide held for one of the shelf's
  three sources. All 258 seed assets are in-repo copies of Drive files and carry
  those files' ids (258/258 verified against `content/drive-catalog.json`), so the
  seed loop on `/shelf` is meant to *upgrade* a drive row to the local copy — but
  it was written `for (const i of seedItems) map.set(i.id, i)`, unconditional, so
  hiding one of those 258 dropped it from `/api/drive-catalog` and this loop put
  it straight back. Reproduced with the override in place and the old line
  restored: API **2,976** without the file, page beside it **2,977** with the card.
  Uploaded material could not be curated at all — no row in the admin list to
  tick, and `/api/catalog` never applied the override map, so the hide
  `/shelf/[id]` already honoured left the card and its download button on the
  shelf. The seed loop now merges onto rows the catalog still lists and keeps the
  `hiddenPages` it attached; a new `driveOk` flag separates "nothing is left"
  from "the catalog never answered", because the second is the PWA's offline path
  and must still show the 258. `/api/catalog` applies overrides;
  `/api/admin/list` includes uploads, tagged `source` and placed **first** (the
  list pages 40 at a time — nobody reaches the tail of 2,977); an upload row reads
  `· הועלה כאן`. Verified on `next dev` :3042 against the real bucket both ways,
  including the aborted-catalog offline path (258 shown) and a real upload through
  the real form (`/api/catalog` 1 → 0 after the tick). `tsc --noEmit` 0; storage
  and both catalog counts left as found. Evidence in
  `QA/gannenet/hide-holds-0811/`. **Open:** the service worker holds
  `catalog-gannenet-v3` and served a pre-hide catalog to a reloaded page twice in
  this run, so a hide can lag for a returning teacher; and `setOverride()` is a
  read-modify-write with no compare-and-set — two saves in the same second lost
  one during this run's own cleanup.

- **`public/sw.js`** — the line above ended on the service worker serving a
  pre-hide catalog to a returning teacher. Following it into `activate()` found
  something larger sitting beside it: `keys.filter(k => !k.endsWith(VERSION))`
  deleted **every** cache the filter did not recognise, and Cache Storage is
  keyed by *origin*, not by service-worker scope. Under `more30.com` this app
  shares that origin with every other system mounted there — `/galil` (#24) is a
  vite-plugin-pwa build whose Workbox precache is named
  `workbox-precache-v2-https://more30.com/galil/` — so every gannenet activation
  would have wiped them. Reproduced with the old line restored: four caches
  seeded at the origin, reload, and galil's and a stubbed kiosk cache are both
  gone (`caches.match('/galil/index.html')` → `null`). Nothing was lost in
  production because `/gannenet` is not mounted yet; this fires on the first
  activation after it is. The cleanup now only considers names this app itself
  created, `/^(shell|files|catalog)-gannenet-v\d+$/`, and each cache carries its
  own version so one can be dropped without taking the others — `FILES` is the
  teacher's own "שמירת התצוגה לאופליין" downloads and must survive every bump.
  With that separation the catalog cache could be bumped to `v4` and its strategy
  changed from stale-while-revalidate (`hit || fetching` — the stale copy always
  wins) to network-first with a 3 s budget, which is the other half of the open
  line: the curation surface may not answer from a pre-hide copy. Measured both
  ways: online, a primed `STALE-PRE-HIDE` body is ignored and the live one served
  and re-cached; offline, the cached copy comes back in 8 ms and `/shelf` still
  falls back to the 258 seeds. Online count unchanged at **2,977**. Also
  corrected `p("/api/generate")` in the never-cache list to the route that
  exists, `/api/ai-generate`. `tsc --noEmit` 0. Evidence in
  `QA/gannenet/sw-origin-scope-0811/`. **Open:** `setOverride()` is still a
  read-modify-write with no compare-and-set.

- **`lib/overrides.ts` + `app/api/admin/override/route.ts`** — closes that line.
  The whole override map lived in one `overrides.json`, so every save was a
  read-modify-write of shared state and two admins saving **different** files at
  once lost one of the two. Measured before touching anything, two concurrent
  saves against the real bucket: **a save was lost in 4 of 4 runs**, and both
  calls returned `ok`.

  Storage offers no compare-and-set, and rather than assume that, both
  candidates were probed against the real bucket. `If-Match` is *accepted and
  ignored* on upload — a deliberately bogus ETag still returned 200 and still
  overwrote. A lock object is unusable: create-if-absent on an existing key is a
  real atomic **409 `KeyAlreadyExists`**, but DELETE with the anon key is
  **403 `AccessDenied`**, so a lock could be taken and never released.

  Write-then-verify was the obvious remaining fix and it was implemented, tested
  and **thrown away**: re-reading after the write and retrying still lost a save
  in 4 of 4 runs, because "it landed" is only true at the instant of the check —
  one writer verified its own entry, returned `ok`, and a concurrent write
  clobbered it a moment later. It is recorded here because it looks correct.

  What ships removes the shared write instead of guarding it: **one object per
  file**, `overrides/<fileId>.json`. Two files are two keys and cannot collide;
  two saves of the same file are last-writer-wins on one field, which is what a
  human expects. Same race, same harness: **0 of 4 lost**. Clearing an override
  writes `{}` rather than deleting, since the anon key cannot delete, and
  readers treat an empty entry as absent — so cleared override objects
  accumulate, one per file ever curated, harmlessly. `readOverrides()` folds the
  legacy `overrides.json` in underneath the per-file objects, which stay
  authoritative, so a bucket written by the old code keeps its curation; it was
  `{}` here, so nothing needed migrating.

  Verified end to end on `next dev` :3042 with `APP_BASE_PATH=/gannenet` against
  the real bucket: hide through the real admin route → 200 and
  `/api/drive-catalog` 2,977 → **2,976** without that file; unhide → 200,
  `{"override":{}}`, back to **2,977** with it; `/api/admin/list` 2,977 rows;
  a wrong `x-admin-key` still 401. `/shelf` renders 2,977 items / 21 categories
  with no console errors — the screenshot, since `readOverrides()` is now a list
  plus N fetches and that page is what it could have broken. `tsc --noEmit` 0
  (665 files — this app's tsconfig really does compile, unlike the repo root's).
  The bucket was left exactly as found: all three probe objects deleted, root
  back to `index.json, overrides.json, seed, up_msoxh0q3_hx4s.png`, and
  `overrides.json` still `{}`. Evidence and the reusable race harness in
  `QA/gannenet/overrides-cas-0811/`.

  One note for whoever reads storage from this machine: NetFree rewrites the
  upstream status of a Supabase error to **400** and carries the real one in the
  body (`{"statusCode":"409",...}`). Every probe above reads the body, not the
  status. It is a property of this network, not of production.

- **`lib/supabase.ts`** — the upload store still held every uploaded item in one
  `index.json` array and wrote it read-modify-write, the shape the entry above
  moved overrides off. It is the worse of the two: the loser's **bytes are
  already in the bucket**, so what is lost is the entry naming them and the file
  becomes an orphan nothing can list, reach or clean up — the bucket was already
  carrying one, `up_msoxh0q3_hx4s.png`, left by `hide-holds-0811`. Measured
  first, two uploads at once through the real route against the real bucket:
  eight uploads, all answering **200**, and **one** entry survived, beside eight
  blobs. Reading the object directly explained why it was one and not the four a
  pure race would cost — the authenticated read is fronted by Supabase's CDN and
  the two disagreed at the same instant, `?t=<random>` returning the real array
  and the plain URL `[]`. So `/api/catalog` showed nothing after a successful
  upload and every read-modify-write started from a stale empty array and
  overwrote the whole list. `lib/overrides.ts` documents that CDN behaviour and
  busts its admin read-back; this file never did, and its comment claimed the
  opposite ("avoids CDN staleness"). Now **one object per upload**,
  `uploads/<id>.json`: two uploads are two keys, there is no shared array to
  rewrite, and each object is written once and never mutated, so a cached copy
  of it is the correct copy. `readEntries()` folds the legacy `index.json` in
  underneath, per-upload objects authoritative. Per-object storage has no
  insertion order and the array's order *was* the shelf's "newest first" — ids
  are `up_<base36 ms>_<base36 rand>`, so creation time comes off the id, no
  field added and legacy entries sort beside new ones. `uploadItem` no longer
  swallows the metadata write: the bytes are in the bucket by then, so a failure
  says so instead of leaving an orphan. Same harness after: **0 of 4 lost**, and
  `/api/catalog` listed 9 — the 8 concurrent uploads plus the legacy entry
  folded in, so the migration is verified against real data. `/shelf` 2,986
  items / 21 categories, 0 console errors; `tsc --noEmit` 0. Bucket left exactly
  as found: 24 probe objects deleted with the service-role key, `index.json`
  back to `[]`, `/api/drive-catalog` 2,977. Evidence in
  `QA/gannenet/upload-index-race-0811/`.

No other file was modified. The mount itself needs no code edit: `next.config.js`
already reads `APP_BASE_PATH`, and `lib/base.ts` exports `withBase()` for the
fetch calls, hrefs and service worker that Next's `basePath` does not prefix.

## Next

1. Create the `gannenet-more30` Vercel project, deploy with `APP_BASE_PATH=/gannenet`.
2. Add the three `/gannenet` rewrites to `portal/vercel.dist.json`.
3. Verify live, then set `public_visible=true` and show the card on the home page.

Deploys are still refused until the Vercel quota resets — `core.issues` #83.
