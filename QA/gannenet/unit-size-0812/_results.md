# gannenet (40) — "מפגש N מתוך 5" was fixed at 5 for units that are not 5 long

12/08/2026 · apps/40-gannenet · production build, `next start -p 3046`, APP_BASE_PATH=/gannenet

## The defect

`app/lesson/[id]/page.tsx` printed the unit position of every רגילה lesson as
`מפגש {r.day} מתוך 5`. Counted off `content/regular.json` (119 רגילה lessons):

| unit | lessons |
|---|---|
| ראש השנה, יום כיפור, סוכות, חנוכה, ט״ו בשבט, פורים, פסח, ל״ג בעומר, שבועות, שבת, תפילה, מידות טובות, האבות הקדושים | 5 each (65) |
| פרשות השבוע — בְּרֵאשִׁית | 12 |
| פרשות השבוע — שְׁמוֹת | 11 |
| פרשות השבוע — וַיִּקְרָא | 10 |
| פרשות השבוע — בְּמִדְבַּר | 10 |
| פרשות השבוע — דְּבָרִים | 11 |

So 54 of the 119 carried a false total, and 34 of those were self-contradictory
on their face — "מפגש 12 מתוך 5" — against the lesson's own meta line one row
below it ("ספר בראשית · פרשה י״ב"). `day` runs 1..N per unit in the data.

## The fix

`lib/content.ts` gains `unitSizeOf(topic)`, a count built once from
`regularLessons`. The page prints the total only when it is at least `day`, so a
future package with a gap prints "מפגש 12" rather than a made-up total.
`app/page.tsx`'s library card said "(5 מפגשים לנושא)" — the same claim, same
counter-example — and now describes both shapes.

## Verification

- `npx tsc --noEmit` → 0.
- `npm run build` → 194 pages, 180 `/lesson/[id]` paths, `/lesson/[id]` 183 B
  route JS (unchanged); every other route byte-identical.
- All 180 prerendered `.next/server/app/lesson/*.html` parsed: 119 carry a unit
  line, 61 (משלימה) carry none, and in all 119 the claimed total equals the
  number of pages actually in that unit — see the table above, both columns
  match.
- Browser, 0 console errors on all three pages (one pre-existing
  `apple-mobile-web-app-capable` deprecation warning):
  - `lesson-parasha-12-of-12.png` — פרשת ויחי: "פרשות השבוע — בְּרֵאשִׁית · מפגש 12 מתוך 12"
    over "ספר בראשית · פרשה י״ב". Was "מפגש 12 מתוך 5".
  - `lesson-holiday-2-of-5-unchanged.png` — חנוכה מפגש 2: "חנוכה · מפגש 2 מתוך 5"
    over "חודש כסלו · יום ב׳ מתוך 5". Unchanged, as it should be.
  - `home-library-card-copy.png` — the card copy, and the 180+ counter beside it.

## Open

Deploys still blocked on core.issues #83 (no Vercel project for gannenet).
