# which-field / stale-mark at mobile viewport (390x844) — 17/08/2026

**Gap closed:** 3cff166 (which-field-deploy-0817) and 9699a3d (case-hit-row) both
recorded `⚠️ לא נמדד ב-390x844` for the "which field is marked invalid" behavior on
the public intake form. invalid-visible-deploy-0817 (56bac47) measured mobile for
the *color* rule but not together with the stale-mark-clearing fix from
stale-mark-0817/stale-mark-deploy-0817 (76bbac4/8ef394c). This step measures both
together, on the live production form, at 390x844 — the one combination not yet
covered.

**Read-only claim, verified not assumed:** both codes used here (`phone_invalid`,
`full_name_required`) are `return`s in 0058 that sit above the `insert into
bkalot_auto.contacts` — confirmed by the same citation used in every prior UI
measurement of this family (76bbac4, 3cff166). No row was written; the flow was
never given a value that passes validation.

Real browser (Playwright), viewport forced to 390x844 before any navigation
(playwright-blank-screenshot-until-resize), against `https://more30.com/bkalot-studio/`
with a fresh `?cachebust=` per run so no cached HTML was measured.

## Scenario A — phone_invalid (first run, `?cachebust=mobile0817b`)
full_name="בדיקת מובייל 390", phone="123", consent checked, kind=info (default).
Submit → visible text "מספר הטלפון אינו תקין. הטלפון הוא מפתח הזהות שלכם אצלנו —
נדרש מספר ישראלי (למשל 0501234567)." — word-for-word MESSAGES.phone_invalid.

Read from the live DOM after the response (not the CSS source):
| | value |
|---|---|
| `phone.getAttribute('aria-invalid')` | `"true"` |
| `getComputedStyle(phone).borderColor` | `rgb(155, 28, 28)` — same red measured on desktop in 8ef394c |
| `document.activeElement.id` | `"phone"` |
| `phone.offsetParent !== null` | `true` (visible, not display:none) |
| `document.documentElement.scrollWidth` vs `clientWidth` | `375` / `375` — zero horizontal overflow |

Screenshot: `mobile-phone-invalid-marked-390.png` (35,907 bytes, MD5 7892710964FC378961D145A681F1E851).

## Scenario B — stale mark clears, new field marks (second run, `?cachebust=mobile0817a`)
Same page load. Step 1 repeated phone_invalid exactly as scenario A (evaluate()
confirmed identical aria-invalid/border before continuing — not re-screenshotted,
same as scenario A above). Step 2: phone corrected to `0500000000` (valid),
full_name cleared to empty, submit again → visible text "צריך שם מלא." — word for
word MESSAGES.full_name_required.

| | phone (stale) | full_name (new) |
|---|---|---|
| `aria-invalid` | `null` | `"true"` |
| `getComputedStyle(...).borderColor` | `rgb(220, 218, 209)` — back to `--line`, not red | `rgb(155, 28, 28)` |
| `phone.value` | `"0500000000"` (the corrected value, untouched) | — |
| `document.activeElement.id` | — | `"full_name"` |
| scrollWidth / clientWidth | `375` / `375` | zero horizontal overflow |

This is exactly scenario B from stale-mark-0817 (76bbac4) — phone fixed, next
failure on an unrelated field — now reproduced at 390x844: the previous submit's
red mark on phone did **not** survive into this response, and only full_name is
marked. Screenshot: `mobile-fullname-marked-phone-cleared-390.png` (28,942 bytes,
MD5 1020D9FCB2941765B640B6C150ACD935).

**Console:** captured for the full session (`all:true`), 0 messages total — zero
errors, zero warnings, on either run.

**Test mode, measured not declared:** both codes are pre-insert returns (above),
no field here writes to `outbound_queue`/`delivery_log`, and no admin session was
opened — this measurement never touched `bkalot-clone-admin` or any
`service_role` path. `git status` on `apps/08-bkalut-app`, `apps/09-bkalot-admin`
and `supabase/` returned zero lines before this step.

**Closes:** the 390x844 gap named in 3cff166 and 9699a3d for the which-field/
stale-mark pair. Does not close: consent-checkbox color coverage (still
speculative — no path marks it today, per 56bac47/76bbac4/8ef394c), or the
SYSTEMS_STATUS.md documentation backlog for 14/08→17/08 (noted separately,
too large for one step).
