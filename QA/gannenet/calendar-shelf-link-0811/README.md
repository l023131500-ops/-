# gannenet (40) — /calendar → /shelf, the "בהמשך יחובר" line

`GANNENET_BUILD.md` §1ה asks the Hebrew calendar to reach the shelf: "כל שבוע →
פרשה + נושא → החומר המומלץ מהמדף הקיים (חיבור ה-calendar ל-library — זה
ה'בהמשך יחובר' שכבר תוכנן)". Until this step the calendar page ended on that
promise as a literal sentence on screen, and the two pages had no link between
them in either direction.

Run against `next dev` with `APP_BASE_PATH=/gannenet` on 11/08/2026 (28 אב תשפ"ו).

## What the screenshots show

- `01-calendar-week-materials.png` — `/calendar`, full page. The new section
  "החומר לתקופה הזו" carries two cards: **שבת ופרשת שבוע** (פרשת שופטים, 19
  חומרים) and **ראש השנה / תשרי** (ראש חודש אלול, 30 אב, 13/8/2026 — "בעוד
  יומיים", 202 חומרים).
- `02-shelf-filtered-from-calendar.png` — where the second card lands:
  `/shelf?cat=ראש השנה / תשרי`, chip active, "מוצגים 48 מתוך **202**".

## The counts are the shelf's own

Both numbers were read back off `/shelf` after following the link, not computed
a second way:

| category | calendar card | /shelf counter |
|---|---|---|
| שבת ופרשת שבוע | 19 | מוצגים 19 מתוך **19** |
| ראש השנה / תשרי | 202 | מוצגים 48 מתוך **202** |

`shelfCounts()` in `app/calendar/page.tsx` repeats the shelf's merge — drive
catalog first, the in-repo seed overriding it by id — so it cannot drift into a
looser number of its own. A category whose count is 0 is dropped rather than
linked; `סוף שנה / קיץ` has no hebcal date and never appears.

## The mapping was checked on the whole year, not on today

`season-year-walk.txt` is `weekTopics()` run on all 53 weeks of 5787. It reaches
**8 categories** — every holiday category the shelf holds except `סוף שנה / קיץ`,
which has no date on the Hebrew calendar to trigger it — and leaves **2 weeks**
(late Tishrei / early Cheshvan, the gap after סוכות) with no holiday topic. Those
two weeks still show the parasha card.

Regenerate with, from `apps/40-gannenet`:

    node QA/_probe-season.mjs

(Node 24 strips the types from the `lib/season.ts` import natively; that probe
lives beside the app source, which is gitignored.)

## One thing this run found that was not the change

`/shelf?cat=…` appeared to do nothing on the first three attempts. The page was
correct; a **service worker registered under `localhost:3140` from an earlier
session** was serving the previous `shell-gannenet-v3` cache, so the new client
bundle never loaded. Unregistering it and dropping the three caches made the
filter work on hard navigation and on in-app clicks alike. Worth remembering
before believing a gannenet change "did not take" on a dev port that has been
used before — every page of this app is behind `public/sw.js`.

Console: 0 errors on both pages. The two warnings are the pre-existing
`apple-mobile-web-app-capable` deprecation from `app/layout.tsx`.

`npx next build` with `APP_BASE_PATH=/gannenet` passes; `/calendar` builds as ƒ
(dynamic, as it already was) and `/shelf` stays 3.06 kB — the 1.3MB drive catalog
is imported only by the server component and does not reach the client bundle.
