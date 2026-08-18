# round-4 functional pass — 30 crm (ZchuyotPro CRM / זכויות פרו)

Date: 2026-08-18. Live URL: https://more30.com/crm (own auth system, own Supabase
project `jhbeelzvjvhnkxldqvxx` — not the shared more30-auth pill; not covered by
the SUPABASE_ACCESS_TOKEN Management API PAT, same as egod/mthbram/chatzor/zchuyot).

## Context
`core.projects` note (05/08/2026) flags this system as hidden from the homepage:
"מגיש מסך התחברות בלבד — חי, אך אין מאחוריו מוצר ציבורי" (serves a login screen
only — live, but no public product behind it). That is correct and unchanged:
this is an internal staff CRM (org signup + login), not a public-facing product,
so it stays `public_visible=false`. This pass verifies the product *behind* the
login screen actually works, which is the round-4 bar (login + core action + real
data + deployed 200), independent of home-page visibility.

## Login
Tried org signup first (name/org/email/password, clearly-marked test data,
test@more30.com / More30Test2026 — the standard test-customer credentials).
Signup returned 200 with a "check your email to confirm" toast. Switched to the
login tab and logged in directly with the same credentials anyway (no Resend MCP
available this session to open a confirmation mail) — succeeded immediately
("התחברת בהצלחה") and landed on /crm/dashboard. The account already existed and
was already confirmed from an earlier QA session (QA/crm/real-action-0812,
08/12/2026) — dashboard "פעילות אחרונה" showed the real client that session
created ("בדיקת QA 12/08").

## Core action
Dashboard → "לקוח חדש" → filled a clearly-marked test client (first name
"בדיקת", last name "מערכת QA 18/08 - אל תיצור קשר", phone 0500000000) → "צור
לקוח". Network trace: `POST .../rest/v1/clients?select=id` → 201 Created,
navigated to the real client detail page
(/crm/clients/815e5a98-936a-434a-b620-b7d17885d424), loaded back via a real
`GET .../rest/v1/clients?...&id=eq.815e5a98-...` → 200. Confirms the CRM's core
action (client intake) round-trips against real data, not a stub.

## Result
No bug found, no code change, no deploy needed — clears the round-4 bar (login +
core action + real data + deployed 200). Evidence: crm-client-created.png.

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) —
jhbeelzvjvhnkxldqvxx is this app's own project, reached only via its own public
auth + clients API.

Next in round-4 ROUTES order per scripts/qa/platform-audit.mjs: gesher (31).
