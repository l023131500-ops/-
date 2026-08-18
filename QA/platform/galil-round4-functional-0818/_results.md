# Round-4 functional pass — 24 galilee-connect-hub (more30.com/galil)

Verified live via Playwright against https://more30.com/galil.

## Login
Shared auth pill already reads logged in (customer session, same shared-session
pattern as all prior round-4 systems). No separate login flow for this app.

## Core action
This is a community-portal ("מחוברים") deployment shared with 16 chatzor-connect
via Supabase project `mwljkonwdeuaahsigjdp` (core.projects note: "משתף mwljkonw").
Home page's synagogue list is a real, legitimate empty state — "עדיין לא נרשם
כאן אף בית כנסת" — no gabai has registered a synagogue for this hub yet; same
for /galil/kashrut ("לא נמצאו מוסדות כשרות"). Not a bug: friendly copy, real
`kashrut_establishments`/synagogue queries returning 0 rows, not a crash.

Tested the other real core action instead: the /galil/contact lead form
("צור קשר"), category **"פנייה אחרת"** (other), with clearly-marked test data
(name "בדיקת מערכת - אל תיצור קשר QA", phone 0500000000).

## Bug found (core.issues #240, severity high)
`POST https://mwljkonwdeuaahsigjdp.supabase.co/rest/v1/community_leads` →
**400 Bad Request**:
```json
{"code":"23514","message":"new row for relation \"community_leads\" violates check constraint \"community_leads_lead_type_check\""}
```
Request body sent `lead_type: "other"`, which the DB check constraint does not
allow. Despite the 400, the UI still rendered the **success** screen —
"הפנייה נשלחה בהצלחה! ... הגבאי ייצור איתך קשר בהקדם" — because the submit
handler doesn't check the response status. Every real visitor who picks
"פנייה אחרת" believes their message was sent; it is silently dropped.

Screenshot: `fake-success-other-lead.png` (full page, shows the false-success
state right after the failed POST).

## Source note
The live /galil (and by extension /chatzor, same shared project) deployment is
**not** built from `apps/16-chatzor-connect` in this monorepo — confirmed via
`Get-ChildItem -Recurse | Select-String` (not ripgrep, which skips gitignored
paths per memory) against `apps/16-chatzor-connect/src`: no match for
`lead_type`, `community_leads`, or any of the category labels seen live
(שירותי סת"ם / אזכרות / לימוד לבר מצווה / תרומה / אירוע / שמחה / פנייה אחרת).
`apps/16-chatzor-connect/src/components/InquiryForm.tsx` is a different,
simpler contact form that correctly try/catches the submit and shows an error
toast on failure — it is not what's live at /galil or presumably /chatzor.
The actual deployed source was not located within this step's time-box; next
step should find it (Vercel project backing more30.com/galil, or the
mwljkonwdeuaahsigjdp Supabase project's allowed `lead_type` values) before
fixing.

Other categories (סת"ם/אזכרות/בר מצווה/תרומה/אירוע) were not tested — unknown
whether they hit the same constraint or use already-allowed values.

No code change, no deploy this step — bug logged to core.issues #240 for a
follow-up step. Protected systems untouched (08/09/bkalut-app/bkalot-admin/
zr_*/NEDARIM3873) — mwljkonwdeuaahsigjdp is this app's own shared project,
reached only via its own public contact-form API.
