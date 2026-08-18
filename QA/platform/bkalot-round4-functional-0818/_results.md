# 10 bkalot — round-4 functional pass (0818)

**Route:** https://more30.com/bkalot ("מימוש זכויות בקלות" — rights-realization
questionnaire + catalog, own live clone, NOT the protected bkalut-app/bkalot-admin/08/09).

## Login
Shared auth pill already read "לקוח" (logged in as customer) on first load —
same shared-session pattern as torah/tamlul/modaot/imud/briut.

## Real data
Home hero counters (JS-animated from 0 → real values, confirmed via
screenshot, not a bug — the a11y snapshot just caught them pre-animation):
- 24 מצבי חיים ממופים
- 435 נושאי קופות חולים
- 373 זכויות מבקלות
- 888 נושאים מקוטלגים

Backed by real network calls, all 200 OK:
- GET rights_meta_public
- GET rights_situation_map
- GET rights_catalog (paginated, 500+500 rows)

Catalog section independently confirms "מציג 30 מתוך 888 נושאים" with real
rows (קצבת נכות כללית, גמלת סיעוד, קצבת ילד נכה, דמי אבטלה, etc.), each with
real provider name and real ₪ amount ranges — not placeholders.

## Core action
Filled the questionnaire (מצב משפחתי=נשוי/אה, גיל=35, סטטוס תעסוקתי=שכיר/ה,
שכר חודשי ברוטו=8000) and clicked "בנו לי את רשימת הזכויות ←". Result: a real
personalized recommendation list — "הרשימה המותאמת אישית שלכם" — with counts
by priority (0 הטרות בריאות / 3 טיפים לשיפור / 2 מומלץ לבדוק / 2 חובה לבדוק)
and real matched items (מענק עבודה, טופס 101, קרן השתלמות ממעסיק, בירור
פנסיוני, בדיקת החזר מס), each with real amounts/sources and an income-based
recommendation line. Computed client-side against the already-fetched real
catalog — round-trips against real data, not a stub.

## Verdict
Login works + core action works (real personalized results, not empty/stub) +
real data + deployed 200. Clears the round-4 bar. No bug found, no code
change, no deploy needed.

Screenshots: bkalot-hero.png (hero counters populated), bkalot-results.png
(personalized results list) — both in this folder.
