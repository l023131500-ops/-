# 16 chatzor (מחוברים · חצור הגלילית) — round-4 functional pass (2026-08-18)

Continuing round-4 (login + core action + real data + deployed 200) in `ROUTES` order after
egod (15, id 888). System: `apps/16-chatzor-connect`, mounted at `https://more30.com/chatzor` —
a religious-council community portal (synagogues, prayer times, lessons, gemachim, ask-the-rabbi).

## Login
Verified live via Playwright against `https://more30.com/chatzor`: home loads 200, 0 console
errors. The shared auth pill (bottom-left) already reads **"לקוח"** (customer logged in) — same
shared-session pattern as torah/tamlul/modaot/imud/briut/bkalot/smel/smachot/egod.

## Core action
Clicked **"מצא בית כנסת"** (find a synagogue) → navigated to `/chatzor/batei-knesset`, a real
directory of 4 synagogues (בית אל, חוני המעגל, מרכז הרב, שערי שלום) with real coordinates and
"ניווט" (Google Maps directions) links. Drilled into **"לאתר בית הכנסת"** for בית אל →
`/chatzor/k/beit-el`, the synagogue's own live sub-site, rendered correctly (full-page screenshot
attached).

## Network trace
Confirms the round-trip is real, not a stub — all against this app's own tables in the shared
more30 Supabase project:
- `GET .../rest/v1/synagogues?select=*&is_published=eq.true&order=name.asc` → 200 OK
- `GET .../rest/v1/lessons?select=*&is_published=eq.true` → 200 OK
- `GET .../rest/v1/community_services?select=*&is_published=eq.true&order=name.asc` → 200 OK
- `POST .../rpc/more30_join_app` → 200 OK (shared customer-session join call)
- `POST .../rpc/more30_app_access` → 200 OK

Home page also already showed real government-sourced data inline: mikveh hours/address sourced
from data.gov.il ("מאגר מקוואות טהרה", מועצה 85, רשומה 234), and real halachic zmanim computed
for חצור הגלילית's coordinates (32.980, 35.539).

## Verdict
Clears the round-4 bar (login + core action + real data + deployed 200). No bug found, no code
change, no deploy needed.

Evidence: `chatzor-synagogue-beit-el.png` (full-page screenshot of the beit-el synagogue sub-site).

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) — `uhnrgujbdxhhmoxcjria`
is the shared more30 project; only this app's own `synagogues`/`lessons`/`community_services` tables
and the standard shared-session RPCs were read.

Next in round-4 ROUTES order: chizukim (17).
