# round-4 functional pass — 28 kupot (Kupot Health Funds, more30.com/kupot)

Date: 2026-08-18

## What was tested
- Live URL: https://more30.com/kupot (hash router, prebuilt Vercel deploy, no shared auth pill requirement — public comparison tool, same pattern as mechiron/zchuyot public core-action systems).
- Home page loads real data: 435 קופות חולים topics, 65 government-rights topics, 15 non-profit topics; "Which fund excels at what" leaderboard (מאוחדת 71, מכבי 60, כללית 29, לאומית 29) is computed from the live 435-row set.
- Search core action: typed "שיניים" in the search box -> live filter to 24 real dental topics (#565–#588), each with a real fund badge (e.g. "מכבי שלי", "טעון השוואה פרטנית").
- Detail drill-in: opened topic #565 (רפואת שיניים משמרת/אורתודנטיה) -> full real per-fund coverage comparison text sourced from actual שב״ן תקנונים (כללית מושלם זהב/פלטינום, מכבי כסף/זהב/שלי, מאוחדת עדיף/שיא, לאומית כסף/זהב), with real percentages, ₪ amounts, and תקופות אכשרה — not placeholder copy.
- Core action (lead capture / "בדיקת מעבר קופה"): clicked "מתעניין/ת במעבר קופה" on topic #565, filled the dialog with clearly-marked test data (name "בדיקת מערכת - אל תיצור קשר QA", phone 0500000000), submitted.
  - Network: `POST https://more30.com/kupot/api/switch-lead` -> `201 Created`.
  - UI: real success toast "פנייתך התקבלה בהצלחה".
  - DB verified directly: `select * from public.hf_switch_leads order by created_at desc limit 1` (Supabase project uhnrgujbdxhhmoxcjria) returns the row (id 2, full_name/phone match, created_at 2026-08-18 05:40:05 UTC) — a real insert, not a fake-success UI.

## Result
No bug found, no code change, no deploy needed. Clears the round-4 bar (core action works + real data + real DB write + deployed 200) via the system's actual named feature (rights/benefit comparison + fund-switch lead capture).

Evidence: this file + lead-success.png.

Note: `csj`/`csj_src`/`csj_src_kupot`/`csj_kupot` schemas also contain similarly-named lead tables — these belong to another organization per RUN_INSTRUCTIONS and were not touched; only `public.hf_switch_leads` (this app's own live table) was read.

Next in round-4 ROUTES order per scripts/qa/platform-audit.mjs: crm (30).
