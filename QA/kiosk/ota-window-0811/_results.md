# QA — system updates never land mid-event (#35 KioskFleet, 11/08)

What was changed: `KioskPolicy` now sets a **windowed** system-update policy
(04:00–06:00 local) when it becomes Device Owner and clears it in `clear()`, and
the installation checklist's `verify-lock` step says so.

## What could be verified here, and what could not

There is **no Android toolchain in this checkout** — `kotlinc`, `gradle`,
`java` and `adb` are all absent — so `KioskPolicy.kt` is **not compiled** by
this run, and no device ran it. That is the same constraint `STATUS.md` records
against the device-side selection screen. What is verified is everything on the
JS side plus the one thing that can actually go wrong silently between the two:
the checklist quoting an hour the policy does not apply.

## Unit — `node --test test/*.test.mjs`, from `apps/35-kioskfleet/server`

`110 pass / 1 fail / 111 total`. The failure is `routing.test.mjs`, which
imports express and cannot run in this checkout — the documented baseline, which
was `106/107` before this step. The four new cases are the whole difference.

| case | what it holds |
|---|---|
| `the OTA window is formatted from the numbers, never quoted` | `formatWindowTime` — `240 → 04:00`, zero-padded, and junk yields `00:00` rather than `NaN:NaN` in a hall's checklist |
| `the window is isolated so RTL prose cannot reverse it` | every occurrence of the range in the step is wrapped U+2066…U+2069, counted rather than spot-checked |
| `the checklist tells the installer updates are deferred, in both tracks` | the sentence exists on both tracks, and only track B carries the "the OEM updater may ignore it" warning |
| `the window the checklist quotes is the window KioskPolicy applies` | reads `KioskPolicy.kt` off disk: both constants, the `createWindowedInstallPolicy` call, the `null` clear, and the import |

The last one is the substitute for a compiler. It was **proved able to fail**:
with `OTA_WINDOW_START_MIN` temporarily moved to `3 * 60`, it fails with
`actual: 180, expected: 240`; restored, it passes. It `t.skip()`s where
`android/` is not alongside `server/`, because the deploy repo
(`l023131500-ops/zol`, root `kiosk/server`) builds the server on its own.

## Browser — the real console against the wizard's QA stub

`QA/kiosk/setup-wizard-console-0811/stub-server.mjs` reused unchanged: it serves
the real `server/public/` and answers the setup routes through the real
`setupsteps.js` / `setupprogress.js` over the production DDL on `node:sqlite`.
Device 1, whose `setup_track` is NULL and therefore resolves to `generic`.

**A defect was found here and fixed.** `01-wizard-verify-lock-generic.png` is
the first version of the change, and it reads **`06:00–04:00`** — a window
running from the evening to the small hours, i.e. the opposite of what the
device does. `04:00–06:00` is a run of directionally-neutral characters inside
a Hebrew sentence, so bidi reorders it on screen while the source string, the
API response and `innerText` all stay correct. `innerText` is why this could not
have been caught by an assertion on the payload — it returns source order.
`windowLabel()` now wraps the range in U+2066 / U+2069;
`02-wizard-verify-lock-after-isolate.png` is the same step afterwards, reading
`04:00–06:00` in both the green "אמור להופיע" line and the amber warning.

Isolates rather than `dir="ltr"` because the value is data — it reaches the
wizard today and could reach a toast or a printed sheet tomorrow, none of which
own the markup around it.

| file | what it shows |
|---|---|
| `01-wizard-verify-lock-generic.png` | **before the fix** — the range rendered reversed |
| `02-wizard-verify-lock-after-isolate.png` | after — step 10, both lines, correct order |

## Not covered

- The policy itself. `setSystemUpdatePolicy` is honoured by the platform update
  client; a track B tablet with an OEM updater of its own may ignore it, which
  is why the generic track's warning says so rather than the checklist claiming
  the update cannot happen.
- Nothing is deployed. The Railway service still runs the previous build.
