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

No other file was modified. The mount itself needs no code edit: `next.config.js`
already reads `APP_BASE_PATH`, and `lib/base.ts` exports `withBase()` for the
fetch calls, hrefs and service worker that Next's `basePath` does not prefix.

## Next

1. Create the `gannenet-more30` Vercel project, deploy with `APP_BASE_PATH=/gannenet`.
2. Add the three `/gannenet` rewrites to `portal/vercel.dist.json`.
3. Verify live, then set `public_visible=true` and show the card on the home page.

Deploys are still refused until the Vercel quota resets — `core.issues` #83.
