# studio (26) — checklist item 4b-iii: leading (lineHeight) control — 19/08/2026

## What was checked before building
`TextLayer.lineHeight` already existed in `shared/layers.ts` and was already
wired into Konva rendering in `CanvasStage.tsx` (`wrapText` line-splitting,
the `useMemo` deps array, and the `<Text lineHeight={layer.lineHeight ?? 1.15}>`
prop) — same pattern as `opacity` (4b-i) and `letterSpacing`/tracking (4b-ii).
Only the UI slider was missing. No schema or render change was needed.

## What was built
One slider added to `Editor.tsx` `TextLayerControls`, directly after the
existing tracking (`letterSpacing`) slider and before "יישור" (align):
label "מרווח שורות" with a `<code>lineHeight</code>` tag matching the
`/design#params` convention, range 0.8–2.5 step 0.05, bound to
`onChange({ lineHeight: v })`, `data-testid="slider-layer-leading"`.

## Build
`tsc --noEmit` — clean. `vite build --base=/studio/` — clean, 2165 modules.

## Deploy
`robocopy dist/public -> _deploy/studio-more30/public/studio` +
`robocopy vercel-adapter -> _deploy/studio-more30` (api/vercel.json/package.json,
unchanged from the last verified adapter copy) -> `vercel deploy --prod`
(`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` env vars, project `prj_t8Y0FxSexdlc6juzQFQHdtt6NZYq`)
-> `dpl_7ZwFzWWdEhWmwcb6MrGsNohf7sav`, READY, aliased `studio-more30.vercel.app`.

## Live verification (Playwright, 1280x900, cache-buster)
- `more30.com/studio` home page: loads clean, 0 console errors, all 4
  template-group filters + gallery unchanged.
- Opened template "שיעור — חסידי מלכותי", selected the headline text layer.
- New slider renders in the correct position (between tracking and align)
  with the correct label + `lineHeight` tag, default value 1.15 shown.
- Set slider to max (2.5) via keyboard (`End`): value updated to 2.5,
  0 console errors.
- To make the spacing change visually provable (the default headline text
  is one line, so lineHeight alone shows no pixel difference), temporarily
  typed a longer string into the same layer's text field to force a 2-line
  wrap (client-side canvas state only, never saved — no "שמור פרויקט" click,
  so nothing persisted to the DB):
  - lineHeight 2.5: 2 lines, wide visible gap between them
    (`studio-leading-wrap-max-0819.png`).
  - lineHeight 0.8 (`Home` key, min): same text re-wraps to 3 tight lines
    with visibly compressed spacing (`studio-leading-wrap-min-0819.png`).
  This confirms the control drives real Konva line-height, not just the
  displayed number.
- 0 console errors across the whole pass.
- All other controls on the same layer (font/weight/size/tracking/align/
  fill/stroke/shadow/opacity) and all other panels (AI background, layers
  list, ad fields, background gradient, category tips) unchanged — zero
  regression.

## Scope note
`kerning`/`blend`/`corner-radius` (the rest of checklist item "4b-iii..vi")
are unchanged this round. `corner-radius` is confirmed already
schema+render-wired (`ImageLayer.cornerRadius`/`DecorationLayer.cornerRadius`,
both read in `CanvasStage.tsx`) — same UI-only pattern, next round.
`kerning`/`blend` still need a new schema field + real Konva wiring — larger,
separate rounds per the established one-feature-at-a-time split.
