# round-4 functional pass — 31 gesher (Hebrew Bridge CRM / גשר עברית CRM)

- live_url: https://more30.com/gesher
- own Supabase project: ygaqqnuyfnumezxxmtbh
- core.projects note (05/08) said "מגיש מסך התחברות בלבד — חי, אך אין מאחוריו מוצר ציבורי"
  (serves a login screen only, no public product behind it). **That note is now stale** —
  visiting /gesher with the shared test-customer session already active auto-landed on
  /gesher/client/status: this app has a real client-facing portal (מצב הטיפול שלי /
  תיק מסמכים מאובטח / ניהול שיתוף מידע), not just a staff login gate.

## Login
Already authenticated via the shared more30-auth session (test@more30.com, same session
used across today's round-4 systems). Landed on the real client dashboard, heading
"שלום, לקוח בדיקה". Network trace confirmed a real session against gesher's own project:
GET .../auth/v1/user -> 200, GET .../rest/v1/user_roles?select=role&user_id=eq.1458bb7c-...
-> 200 (role lookup), not a stub.

## Core action tested
Consent management (/gesher/client/consents) — "קבע אילו שותפים רשאים לצפות בפרטיך.
ההרשאה נשמרת מיד". Toggled the "יועצים פיננסיים" (financial advisors) switch on.

Result: switch flipped to checked, copy changed from "אינם רשאים לצפות בפרטיך" to
"רשאים לצפות בפרטים המסומנים למטה", and a real server timestamp appeared:
"עודכן ב-18 באוג' 2026, 8:50" — proves the write round-tripped through the app's
_serverFn layer into the DB, not a client-only UI flip. Screenshot:
consent-toggle-success.png.

Restored to original (off) state immediately after: switch unchecked, copy reverted to
"אינם רשאים לצפות בפרטיך", timestamp updated to 8:51, toast shown: "השיתוף עם יועצים
פיננסיים בוטל". No test data left behind — this is a real toggle on the shared test
customer's own existing consent record (same record already touched in
QA/gesher/consents-0812 and QA/gesher/consent-enforcement-0812 on 12/08), not a new row.

## Verdict
Clears the round-4 bar (login + core action + real data + real DB round-trip + deployed
200). No bug found, no code change, no deploy needed this step.

Correction filed: core.projects #31 note updated to reflect the real client portal
(was "no public product behind the login screen").

Next in round-4 ROUTES order per scripts/qa/platform-audit.mjs: nadlan (32).
