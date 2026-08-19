# 12 smel — round-4 functional pass (2026-08-18)

System: SMEL NDLN (`נדל"ן Smel`, `/smel`) — government-data-driven real-estate research report generator.

## Login
Shared auth pill already read "לקוח" (logged in as customer) on load — same shared-session pattern as torah/tamlul/modaot/imud/briut/bkalot.

## Core action
Filled the address search form with a real Tel Aviv address (עיר=תל אביב, רחוב=דיזנגוף, מספר=100) and clicked "חקור נכס". App navigated to `#/report` and rendered a real, non-stub report:

- Investment-viability score: 79/100 ("כדאיות גבוהה")
- Real neighborhood resolved from the address: "הצפון הישן החלק הדרומי", תל אביב-יפו
- Real average neighborhood price: ‏3,135,075 ₪, yield index 3.01, price-trend index 2.96
- Real distances to amenities (מרכז מסחר 800מ׳, בית כנסת 319מ׳, 4 synagogues within 500מ׳, transit 36מ׳, rail 1.7ק״מ, school 332מ׳)
- Footer lists 6 real government/OSM data sources with live links (data.gov.il census/crime/transit/education datasets, OpenStreetMap, nadlan.gov.il)

Network trace confirms the round-trip is real, not a stub:
- `POST https://csjekrvukbdznetsrodj.supabase.co/functions/v1/nadlan-smart-research` → 200 OK (the actual research/report generation)
- `POST .../rpc/more30_join_app` → 200 OK (shared app-join call, same as other systems)

## Verdict
Clears the round-4 bar (login works, core action works, real data, deployed 200). No bug found, no code change, no deploy needed.

Evidence: `smel-report.png` (full-page screenshot of the generated report).

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) — `csjekrvukbdznetsrodj` (bkalut-production-user-owned) was only reached via smel's own public edge function `nadlan-smart-research`, no protected schema read/written.

Next in round-4 ROUTES order: smachot (14).
