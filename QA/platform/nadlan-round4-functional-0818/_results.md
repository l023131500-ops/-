# round-4 functional pass — 32 nadlan (נדל"ן ברגע)

Date: 2026-08-18
URL: https://more30.com/nadlan

## What was tested
Public free-report generator (no login gate on the core action — same class as
mechiron/kupot/zchuyot public-facing tools; the shared customer session was not
active this run and the tool worked anyway).

Filled the address form: יישוב=תל אביב, רחוב=דיזנגוף, מספר בית=100 → "הפק דוח".

## Result
Navigated to `/nadlan/report?q=...`, real progress steps shown (מאתרים כתובת →
עסקאות → מוסדות/תחבורה → מרכיבים דוח), resolved in ~7s to a real free report:

- Header: "דיזנגוף 100, תל אביב · גוש 7091 חלקה 7" — real גוש/חלקה resolved from
  the address, not placeholder.
- Honest empty-state copy where the specific building has no recorded sales
  ("לא נרשמו בחלקה הזו עסקאות...", with a direct nadlan.gov.il link to verify),
  distinguishing "no data for this parcel" from "no data at all" — matches the
  product's stated truth-only policy.
- Real street-level comparable data: 290 real עסקאות on דיזנגוף street, median
  ₪59,607/מ"ר, a real transaction-price table (₪17,643–₪70,185 range across
  rows), and a 27-transaction area median of ₪62,620/מ"ר sourced from רשות
  המסים (dated 31.1.2026).
- Real map integration (planmap API call, real lat/lng for the resolved
  address).

Network trace confirmed real backend calls, not client-only stubs:
- GET `/nadlan/api/report?q=...&tier=basic` → 200 OK
- GET `/nadlan/api/planmap?lat=...&lng=...` → 200 OK

## Verdict
Clears the round-4 bar (core action works + real government-sourced data +
deployed 200). No bug found, no code change, no deploy needed this step.

Evidence: nadlan-report.png (viewport screenshot of the rendered report).

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) —
only this app's own public `/nadlan/api/*` endpoints were exercised.

Next in round-4 ROUTES order per `scripts/qa/platform-audit.mjs`: kesef (34).
