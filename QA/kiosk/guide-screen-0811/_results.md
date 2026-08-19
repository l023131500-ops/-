# QA — the sidebar guide became a route into the wizard (#35, §2★ב)

**11/08/2026** · `apps/35-kioskfleet/server/public/js/app.js` — `viewGuide()`

The screen behind **📖 הוראות הפעלה** held four paragraphs of install instructions
of its own. Since `setupWizard()` landed it was the *second* description of the
same install, and the two disagreed: it called Device Owner `מומלץ` where the
wizard treats it as the step without which nothing is locked, it stopped at
enrollment, and it could not know any device's enrollment code or server
address. It now says where the instructions are and opens them.

Driven in a real Chromium (Playwright) against
`QA/kiosk/guide-screen-0811/stub-server.mjs` — the wizard harness plus two things
this screen needs: an empty-fleet mode (`KF_QA_EMPTY=1`) and `/docs`, mounted
from the real `apps/35-kioskfleet/docs` exactly where `index.js` mounts it. The
stub serves the **real** `server/public/` and answers the setup routes through
the real `setupsteps.js` / `setupprogress.js` over the production DDL on
`node:sqlite`.

## Cases

| # | What | Result |
|---|---|---|
| 1 | The four stale paragraphs are gone — `שלב אחר שלב`, `הורידו והתקינו את האפליקציה`, `הזינו קוד רישום`, `נעילת מצב קיוסק (מומלץ)`, `מצב שינה`, `עדכוני מערכת` | none present in `#content` |
| 2 | The screen still answers "where are the instructions" | h1 `הוראות הפעלה`, sidebar item stays `active` |
| 3 | Every device is offered | 2 rows, `כניסה ראשית / QA-0001` and `עמדת לובי (טרם הותקנה) / QA-0002` |
| 4 | The button opens the wizard **for the device on that row** | row 2 → `מכשיר: עמדת לובי … S/N QA-0002` |
| 5 | …with that device's own checklist, not a generic one | 13 steps opening at `1. צרו קוד רישום למכשיר` (no enrollment row), track `gms` |
| 6 | A tick from here is a real tick on the right device | `#wz-count` → `1 מתוך 13`, `device_setup_steps` = `(2, create-code)` |
| 7 | The other row opens the other device | row 1 → `S/N QA-0001`, **12** steps, track `generic` |
| 8 | Closing leaves no modal behind, and opening the second does not stack | `.modal` count 1 then 0 |
| 9 | Empty fleet: no rows, and it says why the wizard cannot open | `אין עדיין מכשירים, והאשף שייך למכשיר …` + one button |
| 10 | …and that button lands on enrollment | active view `enroll`, h1 `הוספת מכשיר` |
| 11 | The `/devices` call failing does not leave `טוען…` on screen | server's message rendered, `rgb(185,28,28)` = `--danger-ink` |
| 12 | The one link it still carries is not a 404 | `GET /docs/user-guide-he.md` → 200; href is `${BASE}/docs/…`, so it is `/kiosk/docs/…` under the portal mount, where `site.use('/docs')` sits inside `base` |
| 13 | Dark mode | rows are `--sunken` / `--line`, both themed; no light-on-light |

`node --test` from `apps/35-kioskfleet/server`: **106 / 107** — the documented
baseline (`test/routing.test.mjs` imports express, which is not installed in this
checkout). Unchanged, as it should be: this step adds no server code.

## Screenshots

- `01-guide-light.png` — the screen, light
- `02-guide-dark.png` — the same at `emulateMedia({colorScheme:'dark'})`, i.e. the
  OS preference rather than a class toggled by hand
- `03-guide-empty.png` — no devices
- `04-guide-error.png` — `/api/devices` refused

## Found and fixed in this run

The sentence pointing at the card's button ended `… (🚀 הפעל).` — an LTR emoji
inside a bracket pair inside Hebrew. The pair wrapped across a line and the two
brackets landed on the wrong sides of it. Rewritten without brackets.

## Not covered

- The **prefixed mount**. The stub serves the console at `/console` only, so
  `BASE` is `''` here and the `/kiosk/` form of every link is reasoned about
  rather than driven. The href construction is unchanged by this step.
- The screen is not deployed: the Railway service builds from another repo
  (`l023131500-ops/zol`), so the live console still shows the four paragraphs.
