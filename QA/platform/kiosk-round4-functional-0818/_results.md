# Round-4 functional pass — 35 KioskFleet (more30.com/kiosk)

Date: 2026-08-18

## Scope
Round-4 functional pass per `scripts/qa/platform-audit.mjs` ROUTES order.
34 kesef was skipped this round (already thoroughly documented as blocked —
`apps/34-kesef` has no source in this repo, `app.json` marked
`source: "not-vendored"`, live URL is a static brochure page only — see
NEEDS_USER.md and core.projects #34 note). Next system after kesef in ROUTES
order is 35 kiosk.

## What was tested
Live at `https://more30.com/kiosk/console` (not `.html` — see memory
`kiosk-deploys-from-a-different-repo`, the `.html` URL breaks API routing).

1. **Login**: `admin` / `More30Admin2026` → `POST /kiosk/api/auth/login` → 200,
   landed on "המכשירים שלי" (My Devices) console, admin role shown
   ("מנהל מערכת · מנהל-על").
2. **Core action**: device-enrollment code generation (הוספת מכשיר →
   יצירת קוד רישום). Filled name "בדיקת מערכת QA 18/08 - אל תמחק בלי בדיקה",
   selected library link "אולמות אירועים", submitted.
   - Network trace: `POST https://more30.com/kiosk/api/enrollments` → 200 OK.
   - Real 6-character registration code returned: `FJD33D`, resolved to a
     real library-linked URL (`https://giftkal.com/kiosk-launcher/EF81F4`).
   - Code appeared in the "קודי רישום פתוחים" (open enrollment codes) table
     alongside a pre-existing code (`YJ3KWW`, "כניסה לבדיקה") left over from
     an earlier QA session — confirms the list is real persisted state, not
     a stub.
   - Cleaned up: clicked "מחק" (delete) on the `FJD33D` row immediately after
     confirming the trace — left the console in the same state as found
     (only the pre-existing `YJ3KWW` row remains).

## Result
Clears the round-4 bar: login works, core action (device enrollment) works
end-to-end against real backend state, deployed and live (200).
No bug found, no code change, no deploy needed this step.

Evidence: `kiosk-enrollment-created.png` (console after enrollment,
before delete).

## Next in ROUTES order
36 tivuch (nadlan-pro, more30.com/tivuch).
