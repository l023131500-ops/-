# tamlul — auth-pill vs. nav recheck (17/08, after ThemeToggle landed)

`scripts/qa/authbutton-overlap.mjs tamlul chizukim-app` (anti-drift recheck of
the two remaining `⏳ ממתין לפריסה` rows in SYSTEMS_STATUS.md's auth-pill
table) found:

- `chizukim-app` — now **clear** at all 5 widths. No code change needed; the
  row was stale.
- `tamlul` — **new** overlap at 390px: `button"החלף מצב כהה/בהיר" 31x18`,
  `coveredBy: auth-pill`. This is the `ThemeToggle` button added earlier today
  (POLISH_BACKLOG "מצב כהה — פקד ידני חסר", 02 תמלול). It did not exist when
  `.more30-auth-clear` was last verified against this route.

## Root cause (`scripts/qa/authpill-diagnose.mjs /tamlul 390`)

`--more30-auth-inset` was 98px and `.more30-auth-clear` correctly reserved
`padding-inline-end: 98px` on the header's flex container (verified via
`getComputedStyle`). The overlap was **not** a reservation failure — it was a
plain overflow: the header row (logo + 3 nav controls: upload, login,
ThemeToggle) no longer fits in the ~272px content box left at 390px width once
a third button was added, so the nav overflowed *past* the reserved padding
and back under the pill. `nav` rect measured `55..277`, starting well inside
the 98px reserved zone.

## Fix

`apps/02-igud-transcribe/components/SiteHeader.tsx`: header row gained
`flex-wrap` + `gap-y-2`, so at widths too narrow for all three controls the
nav wraps to its own row below the logo instead of overflowing sideways under
the pill. No visual change at ≥834px (single row, unchanged).

## Verification

`local-check.mjs` against `next start` locally (basePath `/tamlul`) before
deploy: 390px → nav wraps to `y 68..130` (below the pill's `y 8..44`), 0 hits.
834–1440px → single row, unchanged position, 0 hits.

Deployed `vercel deploy --prod` from `apps/02-igud-transcribe`
(`tamlul-more30`, `dpl_9vvZDdvybJNVoG5jcFxDfuWyEEqA`). Live recheck:
`authbutton-overlap.mjs tamlul` → `clear @ 390,834,1100,1280,1440`.
