# KIOSK_BUILD.md §9 "תזמון" — business-hours screen scheduling — 24/08/2026

## What changed (on `l023131500-ops/zol`, `claude/what-do-you-see-gxo5tc`, `f3ca982`)

- `server/src/schedule.js` (new): pure, DB-free helpers —
  `parseTimeToMinutes`, `validateScheduleWindow`, `isWithinOpenWindow`,
  `desiredScreenState`, `minutesSinceMidnight`.
- `server/src/db.js`: four new `devices` columns — `schedule_enabled`,
  `schedule_open_time`, `schedule_close_time`, `schedule_last_state`.
- `server/src/routes/devices.js`: `PATCH /devices/:id` accepts
  `scheduleEnabled`/`scheduleOpenTime`/`scheduleCloseTime`, validates via
  `schedule.js` when enabling, resets `schedule_last_state` to `NULL` on any
  schedule write, and `publicDevice()` exposes the three owner-facing fields.
- `server/src/devicepayload.js`: `CONSOLE_DEVICE_FIELDS` gains the three
  owner-facing fields; `schedule_last_state` deliberately excluded.
- `server/src/index.js`: new `setInterval` (60s) enforcing the schedule —
  issues `screen_on`/`screen_off` on a state transition, deduped via
  `schedule_last_state`.
- `server/public/js/app.js`: device-edit modal gets a checkbox + two
  `<input type=time>` fields; fleet card shows the configured hours.
- `server/test/schedule.test.mjs` (new, 13 tests), `server/test/
  devicepayload.test.mjs` (+2 tests).

## Verification performed here

1. `node --check` on every touched file — clean.
2. `node --test test/` — 47/49 pass. The 2 failures
   (`routing.test.mjs`, `seedadmin.test.mjs`) are the pre-existing
   `express`/`node:sqlite`-not-installed gap this sandbox has hit on every
   prior round in `STATUS.md` — unrelated to this change.
3. `node QA/kiosk/schedule-0824/coverage-check.mjs` — 25/25 static checks
   pass (DB migration ↔ route ↔ enforcement loop ↔ console UI all agree).
4. `more30.com/kiosk/api/health` polled 3× after the `git push` to `zol` —
   `200` throughout, no build-in-flight blip.

## Not verified here (sandbox constraints, same as every prior round)

- **No real browser.** Both downloaded Chromium builds are missing system
  libs (`libatk-1.0.so.0`, `libgbm.so.1`, `libasound.so.2`, etc.) and there
  is no `sudo` to install them — the same gap `device-log-0824`,
  `client-switch-android-0824`, and others already hit. The checkbox/
  time-input UI was reviewed by hand against the existing zoom-slider
  pattern it copies, not clicked through in a browser.
- **No real device or full day's clock.** Nothing here ran the 60s interval
  against a live agent across an actual open→close→open transition to watch
  the screen physically turn off and back on. The enforcement loop's logic
  is unit-tested in isolation (`schedule.test.mjs`) and statically confirmed
  to be wired correctly (`coverage-check.mjs`), but the end-to-end
  screen-off-at-close behavior on hardware is unverified, the same
  constraint every fix in this log without a real device has hit.
