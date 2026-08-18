# round-4 functional pass — 27 mechiron (bkalut-price / השוואת מחירים)

Verified live via Playwright against https://more30.com/mechiron (1280x900).

## Login
Shared auth pill reads "לקוח" (customer logged in) — same shared-session pattern as all
prior round-4 systems.

## Homepage is a different feature than the system's name
The `/mechiron` root (`#/`) renders the general "בקלות" rights/eligibility catalog
homepage, not price comparison — clicking the hero CTA "בדיקת זכאות בקליק" lands on
`#/eligibility`, which calls `/mechiron/api/public/rights`, `/mechiron/api/meta`,
`/mechiron/api/public/catalog-settings` — all 404, because this deployment's backend
(`apps/27-bkalut-price/src/api/index.ts`) only implements the `pc/public/*` price-comparison
routes plus `public/chatbot/config`. Result: `#/eligibility` always shows "0 נושאים זמינים".

This is **not a new bug** — it is the exact, already-tracked ambiguity in
**core.issues #94** ("מה לעשות עם #27 — הכתובת מגישה עמוד זכויות, והרישום מוכר השוואת
מחירים"), open, severity normal, no code change made here. Confirmed still open and
still accurately describes production as of this session.

## Core action (price comparison) — the feature core.projects actually names this system for
Navigated directly to `#/price-comparison` (linked from the homepage nav as "השוואת
מחירים"). Real, live data on load:
- "עודכן לאחרונה: 05:09, 18.08.2026" (today), 117,450 מוצרים, 1,213 חנויות, 33 מקורות פעילים.
- 22 real categories, 6 real promotions.

Searched "חלב" (milk) in the product search box and submitted. Network trace:
`GET /mechiron/api/pc/public/catalog?q=%D7%97%D7%9C%D7%91&sort=price` → 200 OK.
Results are real dairy products with real barcodes, real per-branch prices (e.g.
"אלהילאל חטיף חלבה נ..." ₪3.00 at branch 340, ₪3.90 at branches 019/011/336/... etc),
promo badges ("30% הנחה", "נכנס ב-2 יחידות"). Not placeholders. Screenshot:
`search-milk.png`.

No bug found in the core action, no code change, no deploy needed this step — clears
the round-4 bar (login + core action + real data + deployed 200), using the system's
actual named feature (price comparison) rather than the homepage's unrelated rights
widget, which remains correctly tracked as open in core.issues #94.

Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) — only
mechiron's own public `/mechiron/api/pc/public/*` endpoints were exercised.

Next in round-4 ROUTES order per `scripts/qa/platform-audit.mjs`: kupot (28).
