# nadlan (32) — §12 map markers: deployed to production

Direct continuation of `QA/platform/nadlan-nearby-plans-map-markers-0818/_results.md`,
which added gold plan markers to `InteractiveMap.tsx` and verified them
against `next dev` only, deferring the production deploy.

## מה נעשה
- השוואת hash בין הריפו הנפרד (`C:\Users\USER\Downloads\nadlan-berega`, מקור
  האמת לפריסה) לעותק במונו-רפו (`apps/32-nadlan-berega`) הראתה ש-
  `InteractiveMap.tsx`/`PropertyImagery.tsx` שונים — הריפו עדיין לא נשא את
  תוספת ה-markers (אותה מלכודת שנמצאה בפריסת §12 הקודמת: `sync-nadlan.ps1`
  חד-כיווני מהריפו לעותק, לא הפוך).
- הועתקו שני הקבצים מהעותק לריפו. `tsc --noEmit` נקי, `next build` נקי
  (15/15 routes). קומיט `0e1c9fa` בריפו, נדחף ל-`origin/main`.
- `vercel deploy --prod --yes --scope l023131500-ops-projects` מהריפו →
  `dpl_EHNyuAAMfbFm8cEqBMDHcUCMcpeY`, READY, aliased ל-`nadlan-more30.vercel.app`
  (אותו פרויקט ש-`more30.com/nadlan` מוגש ממנו).

## אימות חי (Playwright, cache-buster, לא ה-URL החשוף)
- `more30.com/nadlan/report?tier=premium&q=דיזנגוף 100 תל אביב&cachebust=0818b`:
  **6 ריבועים זהובים** על המפה — תואם בדיוק למספר שנמדד ב-`next dev` ובפריסת
  הפרודקשן הקודמת של §12 (`4953066`). מפת Leaflet נטענת תקין, 0 שגיאות קונסול.
- אותה כתובת ב-`tier=basic&cachebust=0818c`: **0 ריבועים זהובים** — שער
  הפרימיום נשמר חי בפרודקשן. המפה עצמה (סיכת נכס + נקודות עניין) ממשיכה
  לעבוד בשני המצבים.
- צילום מסך: `live-premium-map.png`.

## מסקנה
§12 "תוכניות בנייה בסביבה" סגור מקצה לקצה: נתון → API → panel טקסטואלי →
marker על המפה → פרוס וחי בפרודקשן, שער פרימיום נבדק. תוספת בלבד, שום
פיצ'ר קיים לא נגע.
