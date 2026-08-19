# 14 שמחות פלוס (smachot) — round-4 functional pass

Continuing round-4 (login + core action + real data + deployed 200) in `ROUTES` order after
smel (12, id 886). This app is `apps/14-bsmachot-plus/website`, a hand-written static
business-plan/dashboard site (not one of the shared React/Next apps — see the round-3
dark-recheck note for the same distinction).

## Login

Verified live via Playwright against `https://more30.com/smachot`: home loads 200. The shared
auth pill (bottom-left) already reads **"לקוח"** (customer logged in) — same shared-session
pattern as torah/tamlul/modaot/imud/briut/bkalot/smel.

## Core action

The core interactive feature of this system is the **"אולמות - רשימה" (venues list)** sheet:
a searchable/filterable table of event venues loaded from `apps/14-bsmachot-plus/website/assets/data.json`
via `fetch('./assets/data.json')` (`app.js:382`).

Clicked the "אולמות - רשימה" nav button → table renders **342 real venue rows** across 6
regions / 7 categories, each with real fields (city, region, category, capacity, phone, email,
source link). Typed **"תל אביב"** into the table search box (`searchbox "חיפוש בטבלה"`,
client-side filter driven by `search.oninput` → `drawVenueTable()` at `app.js:232`): the table
correctly filtered down to real Tel-Aviv-area venues — YAM ים (055-2118726), גרקן הכשרה,
אביגדור, ACOSTA, רפאל אירועים, Camilo — all with real phone numbers and category tags, not
placeholders. Confirms the core action round-trips against real data (client-side fetch + filter,
no backend needed for this static system).

No bug found, no code change, no deploy needed — clears the round-4 bar (login + core action +
real data + deployed 200).

Evidence: `smachot-search.png` (filtered table after typing "תל אביב").

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) — this system has
no Supabase backend of its own; only its own static `assets/data.json` was read, client-side.

Next in round-4 ROUTES order: egod (15).
