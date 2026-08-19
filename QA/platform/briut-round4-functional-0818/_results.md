# 06 briut — round-4 functional pass (2026-08-18)

System: לידים קופות חולים (health-fund comparison + lead capture), live at https://more30.com/briut.

## Checked
- Home loads 200, real content: "מבוסס על נתוני בקלות · 435 נושאי הטבה", full comparison table across כללית/מכבי/מאוחדת/לאומית with 435 real benefit-topic rows (not placeholders), category filter tabs, search box.
- Auth pill (shared more30 pattern): already reads "לקוח" (customer), opened it and confirmed "מחובר כ־לקוח בדיקה" (logged in as test customer) with the standard menu (האזור האישי / שדרוג לפרימיום / יציאה) — same shared-session pattern as torah/tamlul/modaot/imud.
- Core action: lead-capture dialog ("מעוניינים במעבר קופה"). Filled with clearly-marked test data (name "בדיקת מערכת - אל תיצור קשר QA", phone 0500000000, email test@more30.com, קופה נוכחית=כללית -> יעד=מכבי) and submitted.
  - Network: `POST https://csjekrvukbdznetsrodj.supabase.co/rest/v1/kupot_leads` -> `201 Created`.
  - UI: success state rendered — "הפנייה נשלחה בהצלחה" / "תודה! צוות בקלות יחזור אליכם בהקדם."
  - Confirms the core action round-trips against real data (not a stub).

## Result
No bug found, no code change, no deploy needed. System clears the round-4 bar (login works + core action works + real data + deployed 200).

## Next
Round-4 ROUTES order continues after briut (06): bkalot (10).
