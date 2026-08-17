# 01 torah — agud-logo.png → .webp (17/08/2026)

**מקור:** `QA/torah.md` §המלצות #2 — "`agud-logo.png` — 1.33MB לוגו. המרה ל-WebP
ברוחב שבו הוא באמת מוצג תוריד אותו בכ-95%."

**מדידה מקדימה:** הקובץ משמש בשני עמודים בלבד, שניהם `lazy()` ב-`App.tsx`
(`/study-days/:token` → `StudyDayUpload.tsx`, `/shul/:accessToken` →
`SynagoguePortal.tsx`) — לא בדף הבית ולא בחבילת הכניסה. לכן זה לא ישנה את
ציוני ה-Lighthouse של `/torah` (שנמדדו על העמוד הראשי), אבל זה משקל אמיתי
שכל מבקר בשני העמודים האלה מוריד לחינם: התמונה מוצגת ב-`h-10`/`h-16` (40–64px
גובה) בלבד.

**המרה.** `sharp` (מותקן ב-`apps/03-igud-ads/node_modules`), resize לגובה
200px (יחס 1536×1024 → 300×200, כ-3× מעל הגודל המוצג המרבי לרשתית), `webp`
quality 85:

| | לפני | אחרי | שינוי |
|---|---|---|---|
| `agud-logo.png` → `.webp` | 1,356,654 bytes | 9,274 bytes | **-99.3%** |

**קוד.** שני ה-imports (`StudyDayUpload.tsx:11`, `SynagoguePortal.tsx:17`)
עודכנו מ-`@/assets/agud-logo.png` ל-`@/assets/agud-logo.webp`. הקובץ הישן
נמחק מ-`src/assets/`.

**בנייה + פריסה.** `vite build` עבר נקי. `robocopy dist → _deploy/torah-more30/torah /MIR`
ניקה את כל ה-hash-ים הישנים (כולל `agud-logo-U-1tcD4d.png` הישן). `vercel deploy
--prod` מ-`_deploy/torah-more30` → `dpl_JATB6xtpawMfS2bBnccQC3CM3Zw9`, READY,
aliased ל-`torah-more30.vercel.app`.

**אימות בייצור.**
`https://more30.com/torah/assets/agud-logo-Dt7iSwWH.webp` → `200`,
`Content-Type: image/webp`. Playwright מול
`https://more30.com/torah/study-days/qa-verify-token`: הלוגו מצויר נכון
בפינה השמאלית-עליונה (ראה `studydayupload-logo-live.png`), 0 שגיאות קונסולה
מלבד ה-418 הידוע של NetFree על `favicon.svg` (חסימת סביבה, לא קשור).
