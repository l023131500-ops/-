# QA — the maintenance code that gets a person out of the kiosk (§2★ה / §4)

Date: 2026-08-11. Scope: server half only. Nothing deployed, no Kotlin compiled.

## The defect this step is against

`KioskActivity.kt` already implements §4's first tier: five taps in the corner
(`CORNER_TAPS_REQUIRED = 5`) open a maintenance dialog, and the dialog asks for
`Prefs.ADMIN_CODE`.

`admin-code-references.txt` in this directory is every reference to that pref in
the Android tree:

    Prefs.kt:16:        const val ADMIN_CODE   = "admin_code"   // declared
    KioskActivity.kt:246: val code = Prefs.get(this, Prefs.ADMIN_CODE)   // read

Two references. **Nothing writes it** — not `EnrollActivity` (which writes
`SERVER_URL`, `DEVICE_TOKEN`, `HOME_URL`, `ALLOWED_HOST`, `IDLE_RETURN`,
`DEVICE_NAME`, `LAST_URL`), not `AgentClient`'s config handler (which writes
`HOME_URL`, `ALLOWED_HOST`, `IDLE_RETURN`), not the server, which had no such
column and sent no such field.

So on every device that exists, `code.isEmpty()` is true, the dialog answers
`קוד תחזוקה לא הוגדר. השתמשו בפקודת פתיחה מרחוק.`, and §2★ה's staged way out is
a dead end. What remains is the remote `unlock` command — which needs the
network. A tablet in a hall with no internet, the case §0 requires the lock to
survive, has **no** way out at all.

## What was added (server half)

- `server/src/exitcode.js` — `normalizeExitCode()`, `configExitCode()`, bounds.
- `devices.exit_code`, NULL on every existing row (which *is* the current
  behaviour, not a gap).
- `PATCH /api/devices/:id` reads `exitCode` **by presence**: `''` clears.
- Pushed to the device as `adminCode` — the key its own dialog already reads — in
  all three places the agent learns config: the enrollment response, the
  heartbeat config, and `update_config`.
- `exit_code` added to `CONSOLE_DEVICE_FIELDS` and `publicDevice()` deliberately;
  see the note in `devicepayload.js`.

## Runs

| | |
|---|---|
| `node --test "test/**/*.test.mjs"` | **121 pass / 1 fail** — full output in `node-test.txt` |
| the one failure | `test/routing.test.mjs` — `Cannot find package 'express'`, the documented baseline in this checkout (was 110/111 before this step, so the 11 new cases are the whole difference) |
| `test/exitcode.test.mjs` alone | 11 pass / 0 fail |
| syntax check | the five edited files copied to `.mjs` and `node --check`ed: all ok |

The 11 cases cover: empty clears; the value is kept as typed; ends trimmed and
the middle not; both length bounds; control characters refused; the obvious codes
refused by list *and* runs/repeats refused by shape (`abcdef`, `987654`,
`7777777`); reuse of the printed launcher access code refused, case-insensitively;
unset pushed as `''` rather than `null`; the `ALTER TABLE` replayed against
`node:sqlite` on a two-device database with every other column asserted unmoved
and a second boot proved a no-op; and the PATCH round trip (set / untouched by an
unrelated save / a refused value never reaching storage / cleared).

## Not done here, and not claimed

- **The device still ignores it.** `AgentClient.kt` writes three config keys into
  `Prefs` and `adminCode` is not one of them, so until that changes the field
  travels to the device and is dropped. That is a Kotlin edit, and STATUS item 2
  already says the Android tree has been edited twice without a compiler — this
  one waits for whoever has the toolchain rather than becoming the third.
- **No console UI.** The field is reachable through the API only; the screen is
  its own step, the same split the `display_url` work used.
- **Stored recoverable, not hashed.** Reasoned in the header of `exitcode.js`:
  the check must run offline on the device, and what the device compares today is
  the plain value. A hash needs the Android side to change first.
- **No rate limit on the device dialog.** `showAdminDialog()` accepts unlimited
  attempts. `ratelimit.js` exists for the launcher, but this attempt happens on
  the device with no network involved, so the counter has to live there too.
