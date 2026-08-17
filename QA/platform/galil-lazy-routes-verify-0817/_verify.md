# 24 גליל קונקט — אימות route-level code splitting

הבדיקה: השינוי שכבר היה בעבודה ב-`apps/24-galilee-connect-hub/src/App.tsx`
(lazy() + Suspense על כל ה-routes, כדי לפרק את חבילת ה-981KB היחידה שנמדדה
ב-`QA/platform/galil-perf-trace-0817`) לא היה מאומת מקומית ולא היה ב-commit.

## מה נבדק
- `vite build` מקומי — עבר, 2194 מודולים, כל עמוד עכשיו chunk נפרד
  (Index, GabaiPortal, ContactPage, SynagoguePage, וכו').
- `vite preview --base /galil/` על פורט 4173 + Playwright:
  - `/galil/` — נטען, 0 שגיאות קונסולה.
  - `/galil/synagogues` — נטען עם ה-lazy chunk, 0 שגיאות קונסולה, מוצג תקין
    (0 בתי כנסת כי אין חיבור לנתוני production בסביבה מקומית — לא קשור ל-routing).
  - `/galil/kashrut` — נטען עם ה-lazy chunk, 0 שגיאות קונסולה.

## תוצאה
ה-code splitting עובד כצפוי ולא שובר ניווט. commit + push בוצע.
מדידת Lighthouse על production אחרי הפריסה הבאה תאשר את שיפור ה-TBT/scripting.
