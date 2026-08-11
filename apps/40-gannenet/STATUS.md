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

No other file was modified. The mount itself needs no code edit: `next.config.js`
already reads `APP_BASE_PATH`, and `lib/base.ts` exports `withBase()` for the
fetch calls, hrefs and service worker that Next's `basePath` does not prefix.

## Next

1. Create the `gannenet-more30` Vercel project, deploy with `APP_BASE_PATH=/gannenet`.
2. Add the three `/gannenet` rewrites to `portal/vercel.dist.json`.
3. Verify live, then set `public_visible=true` and show the card on the home page.

Deploys are still refused until the Vercel quota resets — `core.issues` #83.
