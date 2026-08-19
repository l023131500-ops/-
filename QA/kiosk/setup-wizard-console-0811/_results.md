# QA — the installation wizard's screen (§2★ב), #35 KioskFleet · 2026-08-11

The checklist (`setupsteps.js`) and the ticks (`setupprogress.js` +
`device_setup_steps` + the four `/api/devices/:id/setup` routes) landed in the
two previous steps and nothing rendered either of them: `viewGuide()` was still
four paragraphs with no boxes, and the only way to tick a step was an HTTP call.
This run drives the screen that closes that gap.

**Harness:** `stub-server.mjs` serves the **real** `server/public/` and answers
the four setup routes by calling the same functions `routes/devices.js` calls,
in the same order, over the production DDL on `node:sqlite`. `PUBLIC_URL` is
`https://kiosk.more30.com` while the server answers on `127.0.0.1` — the
production mismatch — so the address the wizard prints is the one a device
really needs. Chromium via `page.emulateMedia({colorScheme})`, i.e. the OS
preference, not a class toggled by hand.

Two devices: **#1** enrolled with code `K7M2QX` (12 steps), **#2** with no
enrollment row at all (13 steps — the checklist opens with `create-code`).

## What was asserted

| # | Assertion | Result |
|---|---|---|
| 1 | `🚀 הפעל` is the first button on every device card | pass |
| 2 | Wizard opens with 12 steps for #1, ids in checklist order | pass |
| 3 | The device's own code (`K7M2QX`) and the real server address (`https://kiosk.more30.com/kiosk`) appear in the steps that need them | pass |
| 4 | The `adb dpm set-device-owner` line is rendered as a copyable command, built from the manifest component | pass |
| 5 | Ticking a box writes exactly one row; count and bar follow (`2 מתוך 12`, 17%) | pass |
| 6 | A tick made **behind the console's back** (the installer at the tablet) appears on the next round-trip — 4/12 after one more tick, not 3/12 | pass |
| 7 | Unticking **deletes** the row, and `nextId` points at the hole (`open-app`), not after the last tick | pass |
| 8 | Switching track rewrites the wording (`no-accounts` → the Google-account text) and **keeps all four ticks**; `setup_track` is stored | pass |
| 9 | The copy button inside the step's `<label>` does **not** toggle the box, and writes no row | pass |
| 10 | Device #2 opens with 13 steps, first is `create-code`, and `enroll-code` says "the code from the console" rather than naming one | pass |
| 11 | An unknown step id is a 400 (`unknown step`) — the wizard puts the box back rather than showing a tick nothing stored | pass |
| 12 | All 12 ticked → 12/12, 100%, completion banner, no `wz-next` | pass |
| 13 | `התחל מחדש` confirms inline, then clears every row (0/12, banner gone, next = `apk`) | pass |
| 14 | Ticks survive a full page reload (3/12 was still 3/12 after `goto`) | pass |

`node --test test/*.test.mjs` → **106/107**, exactly the documented baseline
(`routing.test.mjs` imports express, which is not installed in this checkout).
This step adds no server code, so the count is unchanged by design.

## Contrast, measured from what is actually painted

| Surface | Light | Dark | Needs |
|---|---|---|---|
| step title / command text | 17.75 | 15.13 | 4.5 |
| `אמור להופיע` line | 5.20 | 7.52 | 4.5 |
| progress count text | 5.49 | 7.08 | 4.5 |
| warning box | 6.68 | 9.06 | 4.5 |
| progress bar fill | 4.76 | 3.61 | 3.0 |
| track card border | 3.13 | 3.64 | 3.0 |

The bar fill is `#15803d` and **not** `--accent-2` (`#22c55e`), which measures
2.20:1 against the sunken track — under 1.4.11. The same number is printed as
text beside the bar, so the information does not rest on the colour either way.

**Found and not fixed, so it is not claimed:** the step row's own border is
`--line` (1.29:1 in dark), the console's surface-separator token. It is a
separator between rows and not the control — the control is a real
`<input type=checkbox>`, which the UA draws with its own border — but a row that
is entirely clickable arguably wants a stronger edge. That is the same
console-wide `--line` question the earlier contrast steps deliberately left
alone.

## Defect found in this run and fixed

The first screenshot showed every step as **one paragraph**: `.wz-do`,
`.wz-expect` and `.wz-warn` were `<span>`s and therefore inline, so "what to
do", "what should appear" and the warning ran together — which is precisely
`viewGuide()`, the thing this screen replaces. Fixed with an explicit
`display: block` (and a comment saying why), then re-shot.

## Screenshots

- `01-wizard-light.png` — device #1, 3/12, light
- `02-wizard-dark.png` — the same at `prefers-color-scheme: dark`
- `03-complete.png` — 12/12 with the completion banner
