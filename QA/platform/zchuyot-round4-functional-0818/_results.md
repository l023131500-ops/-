# 22 zchuyot (get-your-rights) — round-4 functional pass (18/08)

Live: https://more30.com/zchuyot

## Login
Shared more30 auth pill present, opened it: reads "מחובר כ־לקוח בדיקה"
(logged in as test customer) — same shared-session pattern as every other
system checked this round.

## Core action
This app's core action is the "הסוכן החכם של בקלות" rights-checker chatbot
(פתיחת בודק הזכויות button, bottom-left widget). Ran the "בדיקה מקיפה"
(comprehensive check) flow end to end:
- 5-step wizard (פרטים אישיים → ילדים → תעסוקה והכנסה → בריאות → דיור ומגורים),
  filled with clearly-marked test data (ID 000000000, DOB 1990-01-01, rest
  left at defaults) — all 5 steps advanced correctly.
- Final step gates the results behind a lead-capture form (שם מלא + טלפון).
  Filled with clearly-marked test data (name "בדיקת מערכת - אל תיצור קשר QA",
  phone 0500000000) and submitted via "שלחו לי מידע בחינם".
- Network trace confirmed a real round-trip against this app's own Supabase
  project (trerolyveytzgksawrme, distinct from the shared uhnrgujbdxhhmoxcjria
  auth project which only handled the shared-session join RPC):
  - GET .../rest/v1/leads?select=id&id_number=eq.000000000&limit=1 -> 200
  - GET .../rest/v1/leads?select=id&phone=eq.0500000000&limit=1 -> 200
  - POST .../rest/v1/leads -> 201 Created
- UI showed the real success state: "הפרטים התקבלו" / "מעולה! נשלח לך סיכום
  מקצועי עם כל הזכויות שמצאנו עבורך."

No bug found, no code change, no deploy needed. Clears the round-4 bar
(login + core action + real data + deployed 200).

Evidence: lead-success.png.

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) —
trerolyveytzgksawrme is this app's own project, reached only via its own
public leads API; test lead is clearly marked in its own fields (same
pattern as briut kupot_leads, mthbram seeker_leads etc this round). This
app's Supabase project is not one of the four unreachable by the
management-API PAT per memory, but cleanup was left as-is (marked QA data)
to match the established pattern for test leads this round rather than
risk touching a project outside the read path used here.
