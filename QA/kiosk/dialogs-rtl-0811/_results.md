# kiosk (35) — the six device dialogs, read for painted order

`node QA/kiosk/dialogs-rtl-0811/verify.mjs` → **170/170**, real Chromium,
`colorScheme` light and dark × 390px and 1200px, against
`QA/kiosk/warn-ink-0811/stub-server.mjs` (which serves the real
`apps/35-kioskfleet/server/public/`). Six screenshots.

**No defect.** 112 token pairs across eight dialog views, every one painted in
the order it reads in.

## Why this scope and not the one that was written down

`input-rtl-0811` closed on a single sentence: *"`promptUrl`'s own label
interpolates a host into a Hebrew sentence, which is `console-rtl-0811`'s sweep
on a tenth view."* A tenth view is the smallest honest step and it is also the
wrong one. The devices screen opens **eleven** dialogs. `console-rtl-0811`
opened three — the wizard, 🆔 מזהי לקוח, 🔑 קוד גישה. The other six cost one
click each and are the same mechanism, so stopping at the one the last commit
happened to name would have left five views unread for no reason.

The six: 🔗 החלף אתר, ✏️ עריכה, 🚪 קוד יציאה, 📚 קישורים מאושרים, ♻️ אתחל, 🗑️.
Two of them have a second text branch that depends on the device having no
allowed host (`promptUrl`'s label falls back to `הדומיין המורשה`;
`linkApprovals`' hint says the opposite thing), so device 2 is driven on those
as well — eight views in total, per mode per width.

## What was measured

The probe is `console-rtl-0811`'s, unchanged: it walks every visible text node,
takes a `Range` over each `[A-Za-z0-9]+` token, and grades the painted order of
every adjacent pair on the same visual line. The classifier's three groups and
both of that run's corrections come with it — a bullet separates only when one
side is a bare digit run, and `–` / `/` are not field marks.

Only the driver is new. A dialog is graded against **its own `.modal`**, because
`.modal-bg` is a sibling of `#app-view` and a body-wide walk with a dialog open
re-grades the whole screen behind it.

Four lines were worth opening these dialogs for, and all four are correct:

| line | shape | result |
|---|---|---|
| `כתובת (חייבת להיות תחת hadar.example.com)` | the sentence `input-rtl-0811` named | `dir=rtl`, host increases left-to-right inside an RTL paragraph |
| `מכשיר: כניסה ראשית · S/N SN-QA-0001` | a bullet with **Latin on both sides** | stays in group C, `S ⟨/⟩ N` at `dx=+14.7` — the case that forced the classifier's second correction |
| `⁦4–32⁩ תווים … ⁦(1234, 0000)⁩` | `1234, 0000` — the OTA/date-time shape | `dx=+31.8`. The two explicit isolates (U+2066/U+2069) hold; nothing else in the console uses them |
| `1 מתוך 1 מאושרים` | group A | `dx=−43.1` |

`♻️ אתחל` and `🗑️` interpolate a Hebrew device name into Hebrew prose and carry
**no gradable pair at all** — census 0, recorded as a result rather than passed
over. `promptUrl` on device 2 is the same: its label's only Latin token is gone
with the fallback.

## The controls, and the one assertion this run had to change

Six control rows per combination, appended to a live `.modal` so they are read on
the same RTL card every row above was:

- the known-bad `11.8.2026, 4:40:00` is flagged as C (`dx < 0`) — the check can fail
- `S/N` in group C and increasing — otherwise the exit-code row proves nothing
- a bullet between two **bare digit runs** produces a B pair and leaves C
- `1 מתוך 2` as A, and the same string under U+202D flagged — group A can fail

The first version asserted `A > 0 && B > 0 && C > 0` across the dialogs, copied
from `console-rtl-0811`, and it **failed**: `A 12 · B 0 · C 100`. That is a
correct measurement, not a defect. Group B needs a bare digit run beside a field
mark, which is the device *card*'s `🔋 84% · 📱 Lenovo` and appears in no dialog.
So the assertion is now `A > 0 && C > 0` with B's zero recorded — and group B is
proven live by the control row instead of being quietly switched off.

## Scope

- **No source change.** Nothing under `apps/35-kioskfleet/` is touched; this run
  had nothing to fix. `node --test` is therefore unrun and unchanged.
- **Not deployed** — the Railway service still serves the previous console, as
  it has since `clients-console-0811`.
- Protected systems (08 / 09 / `bkalut-app` / `bkalot-admin` / `zr_*` /
  `NEDARIM3873`) untouched. No migration. Test mode.

## What this leaves open

- Three dialogs on **other** screens have still never been walked:
  `clientModal`, `confirmDeleteClient` (מזהי לקוח) and `userModal` / `resetPw` /
  `delUser` (הגדרות → משתמשים). The admin ones need a `role: admin` stub user;
  `warn-ink-0811`'s is `owner`.
- The `<input>` limit stands where `input-rtl-0811` left it: a `Range` cannot
  reach a value, so `#u`, `#h`, `#disp`, `#idle` and `#ex-val` are graded by
  declaration here, not by measurement. All five carry `dir="ltr"`.
- **The heartbeat for this step was not written to `core.run_progress`.** The
  Supabase MCP server is not connected in this session, and the anon key in
  `portal/.env.local` cannot reach it — PostgREST answers `406` for the `core`
  schema on both `run_progress` and `projects`, i.e. the schema is not exposed.
  The row is written out as `_heartbeat.sql` for whoever has the connection.
