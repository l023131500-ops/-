# gannenet /calendar — "מועדים בחודש זה" got dates, and stopped being cut at eight

Run 2026-08-11, 28 אב 5786. Production build (`APP_BASE_PATH=/gannenet`,
`next start -p 3410`), Chromium via Playwright.

## What was wrong

`app/calendar/page.tsx` built the month list by scanning the whole Hebrew year
and filtering to the current month, then `.slice(0, 8)`:

```ts
const events = HebrewCalendar.calendar({ year: now.getFullYear(), isHebrewYear: true, il: true, locale: "he" });
holidays = events.filter((e) => e.getDate().getMonth() === m).slice(0, 8).map((e) => e.render("he"));
```

Two defects, both measured before the change:

**1. Three of the thirteen months were truncated — and they are the three a gan
plans hardest for.** Counts per Hebrew month, 5786 and 5787:

| month | dates | cut by `slice(0,8)` |
|---|---|---|
| ניסן | 14 | פֶּסַח ד׳–ז׳ (chol hamoed **and the last yom tov**), יוֹם הַשּׁוֹאָה, ר״ח אייר |
| תשרי | 16 | סוּכּוֹת ב׳–ז׳ (הוֹשַׁעְנָא רַבָּה), **שְׁמִינִי עֲצֶרֶת**, ר״ח חשוון |
| כסלו | 11 | חַג הַבָּנוֹת, **חֲנוּכָּה: ז׳ נֵרוֹת**, ר״ח טבת |
| אדר ב׳ (5787) | 8 | — (at the cap, nothing cut) |

Standing in Tishrei the page did not name שמיני עצרת; standing in Kislev it
stopped at the sixth candle.

**2. Standing in Elul it listed ערב ראש השנה twice.** The year scan for year Y
opens with 29 Elul of year **Y−1**, whose `getMonth()` is also 6:

```
29 Elul 5785 | Rosh Hashana | עֶרֶב רֹאשׁ הַשָּׁנָה | Mon Sep 22 2025
 1 Elul 5786 | Rosh Hashana LaBehemot
 1 Elul 5786 | Rosh Chodesh Elul
23 Elul 5786 | Leil Selichot
29 Elul 5786 | Rosh Hashana | עֶרֶב רֹאשׁ הַשָּׁנָה | Fri Sep 11 2026
```

Rendered as bare names, the two lines were identical — a year apart and
indistinguishable, because the list showed no date.

**3. No date on any line at all.** "מועדים בחודש זה" named what falls in the
month and never said when, so nothing in it could be planned against.

## The change

`lib/season.ts` gains `monthEvents(today)`, bounded by the Gregorian dates of
day 1 and the last day of *that* Hebrew month (`first.daysInMonth()`) instead of
filtering a year scan, so no cap is needed and the previous year cannot leak in.
Each entry carries the day in gematriya, the civil date, `inDays`, and the shelf
category from the existing `EVENT_CATEGORY` map. The page renders every date,
mutes the ones already past, marks `inDays === 0` "היום", and links the ones the
shelf has material for.

`HebrewCalendar` is no longer imported by the page.

## Verified

- **Every month of 5786 and 5787 walked**: 183 dates now listed where the old
  code reached 151, two of which were the wrong-year duplicate — so 149 real
  dates became 183, and Elul returns 4 rather than 5. Full output, month by
  month with every line the page now prints, in `year-walk.txt`.
- **On screen** (`01-month-list-desktop.png`): all 7 dates of אב, א׳ ד׳ ח׳ ט׳
  י״א ט״ו ל׳, each with its civil date. Six are past and muted; ל׳
  (ר״ח אלול, 13/8/2026) is upcoming and dark.
- **Painted order is RTL**: in the first row the day sits rightmost (right edge
  873), the name at 821, the date at 716.
- **Contrast**, every colour in the list against the white card: past text
  4.91:1, upcoming name 13.66:1, day/link blue 8.55:1. All pass AA at their
  rendered size.
- **390px** (`02-month-list-390.png`): rows wrap, `scrollWidth == clientWidth`,
  no sideways drag.
- **A link was followed, not read**: the שבת חזון row opens
  `/gannenet/shelf?cat=תשעה באב / בין המצרים`, and the shelf answers
  "מוצגים 48 מתוך 57" with that chip active.
- `next build` with `APP_BASE_PATH=/gannenet` passes; `/shelf` still 3.06 kB, so
  the 1.3MB drive catalog is still out of the client bundle. Zero console errors.

## Not verified

No date falls on 28 אב, so the "היום" chip did not render today. Its markup and
colours are the `.chip` already on the parasha card above it; only the
`inDays === 0` branch is untested on screen.

## Trap, again

The filter looked stale until a service worker from an earlier session on this
port was unregistered and `shell-gannenet-v3` deleted. Every page of this app is
behind `public/sw.js`. Unregister before believing anything.
