# QA/platform — מדידה רוחבית של כל המערכות החיות

> נמדד 2026-08-02 00:16 → 2026-08-07 00:17 מול הפרודקשן ב-`more30.com`.
> נוצר על ידי `scripts/qa/platform-audit.mjs` + `scripts/qa/lighthouse-run.mjs` → `scripts/qa/report.mjs`.
> כל שורה כאן היא מדידה בדפדפן אמיתי, לא הערכה. הסטנדרט: `DESIGN_STANDARD.md`.
>
> 🚧 **Best Practices תקוע על 77 בכל 27 הנתיבים — וזה לא אנחנו.** המדידה רצה
> מאחורי מסנן נטפרי, שמזריק לכל עמוד ‎iframe‎ אל `netfree.link/card` ומציב
> עוגיית צד-שלישי (`side-card-settings`). Lighthouse סופר אותה תחת
> `third-party-cookies` ו-`inspector-issues`, ואי אפשר להסירה מהצד שלנו.
> הציון האמיתי יימדד רק מרשת לא מסוננת. פירוט: `BLOCKED.md`.

| נתיב | # | 200 | RTL | h1 | תיאור | מגע≥24 | שמות | ללא גלישה | ללא שגיאות | כהה | כניסה | LH p/a/b/s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 33 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅¹ | ✅ | 86/100/77/100 |  |
| `/login` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 99/100/77/63 |  |
| `/me` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 99/100/77/63 |  |
| `/subscribe` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96/100/77/63 |  |
| `/torah` | 01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 52/100/77/100 |  |
| `/tamlul` | 02 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 97/98/77/100 |  |
| `/modaot` | 03 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 95/100/77/100 |  |
| `/imud` | 04 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 67/96/77/100 |  |
| `/briut` | 06 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 98/91/77/100 |  |
| `/bkalot` | 10 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 85/93/77/91 |  |
| `/smel` | 12 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 84/92/77/100 |  |
| `/smachot` | 14 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 83/100/77/100 |  |
| `/egod` | 15 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 50/83/77/100 |  |
| `/chatzor` | 16 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 87/100/77/100 |  |
| `/chatzor/` | 16 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 54/100/77/100 |  |
| `/chizukim` | 17 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 95/100/77/100 |  |
| `/chizukim/` | 17 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 82/100/77/100 |  |
| `/orech` | 18 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 98/100/77/100 |  |
| `/mthbram` | 21 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 66/98/73/100 |  |
| `/zchuyot` | 22 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 46/100/77/100 |  |
| `/galil` | 24 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 71/84/73/100 |  |
| `/studio` | 26 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅¹ | ✅ | 80/100/77/100 |  |
| `/mechiron` | 27 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ✅ | ✅ | 44/96/73/100 |  |
| `/kupot` | 28 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 72/100/77/100 |  |
| `/crm` | 30 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 93/97/73/100 |  |
| `/gesher` | 31 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 96/97/73/100 |  |
| `/nadlan` | 32 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 74/95/77/100 |  |
| `/kesef` | 34 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅¹ | ✅ | 98/100/77/100 |  |
| `/kiosk/` | 35 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ✅ | ✅ | 95/100/77/100 |  |
| `/tivuch` | 36 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅¹ | ✅ | · |  |

> ¹ **כהה מלכתחילה.** העמוד אינו משתנה בין המצבים מפני שהוא כבר כהה, והוא
> מצהיר על כך ב-`color-scheme` כדי שגם פקדי הדפדפן יירנדרו כהים. זה עומד
> ב-`DESIGN_STANDARD` §3, שדורש שלא יהיה הבזק לבן — לא שיהיו שתי ערכות.

---

## פירוט לפי נתיב

### `/` — אתר התדמית (מערכת 33)

כותרת: **עולם הסטארטאפים** · h1: "עולם הסטארטאפים" · טקסט מרונדר: 3295 תווים · 33 אלמנטים אינטראקטיביים · טעינה 15629ms

- Lighthouse מתחת ל-90: perf 86 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.3 s) · largest-contentful-paint (3.6 s) · interactive (5.3 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (3.6 s) · unminified-javascript (Est savings of 2 KiB) · unused-javascript (Est savings of 69 KiB) · inspector-issues

צילומים: `home-desktop.png` · `home-mobile.png` · `home-dark.png`

### `/login` — כניסה אחידה (מערכת --)

כותרת: **כניסה · עולם הסטארטאפים** · h1: "כניסה למערכות" · טקסט מרונדר: 331 תווים · 8 אלמנטים אינטראקטיביים · טעינה 10423ms

- אין את כפתור הכניסה האחיד (`auth-button.js`)
- Lighthouse מתחת ל-90: perf 99 · a11y 100 · bp 77 · seo 63
  - נכשלו: max-potential-fid (160 ms) · interactive (4.2 s) · third-party-cookies (2 cookies found) · unminified-javascript (Est savings of 3 KiB) · unused-javascript (Est savings of 26 KiB) · inspector-issues · is-crawlable · cache-insight (Est savings of 1,086 KiB)

צילומים: `login-desktop.png` · `login-mobile.png` · `login-dark.png`

### `/me` — אזור אישי (מערכת --)

כותרת: **האזור האישי · עולם הסטארטאפים** · h1: "האזור האישי" · טקסט מרונדר: 94 תווים · 3 אלמנטים אינטראקטיביים · טעינה 13797ms

- אין את כפתור הכניסה האחיד (`auth-button.js`)
- Lighthouse מתחת ל-90: perf 99 · a11y 100 · bp 77 · seo 63
  - נכשלו: interactive (3.9 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (5.7 s) · bootup-time (3.9 s) · unused-javascript (Est savings of 27 KiB) · inspector-issues · is-crawlable · cache-insight (Est savings of 53 KiB)

צילומים: `me-desktop.png` · `me-mobile.png` · `me-dark.png`

### `/subscribe` — מסלולים (מערכת --)

כותרת: **מסלולים · עולם הסטארטאפים** · h1: "מסלולים · עולם הסטארטאפים" · טקסט מרונדר: 662 תווים · 7 אלמנטים אינטראקטיביים · טעינה 9215ms

- Lighthouse מתחת ל-90: perf 96 · a11y 100 · bp 77 · seo 63
  - נכשלו: max-potential-fid (190 ms) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.3 s) · bootup-time (4.0 s) · unminified-javascript (Est savings of 2 KiB) · unused-javascript (Est savings of 27 KiB) · inspector-issues · is-crawlable

צילומים: `subscribe-desktop.png` · `subscribe-mobile.png` · `subscribe-dark.png`

### `/torah` — פלטפורמת איגוד השיעורים (מערכת 01)

כותרת: **איגוד מגידי השיעורים** · h1: "איגוד מגידי השיעורים" · טקסט מרונדר: 1262 תווים · 31 אלמנטים אינטראקטיביים · טעינה 10419ms

- Lighthouse מתחת ל-90: perf 52 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.0 s) · largest-contentful-paint (10.3 s) · speed-index (6.3 s) · total-blocking-time (470 ms) · max-potential-fid (260 ms) · interactive (10.3 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (3.2 s)

צילומים: `torah-desktop.png` · `torah-mobile.png` · `torah-dark.png`

### `/tamlul` — תמלול איגוד (מערכת 02)

כותרת: **תמלול מבית איגוד השיעורים** · h1: "תמלול שיעורי תורהבמקצועיות אמיתית" · טקסט מרונדר: 1372 תווים · 9 אלמנטים אינטראקטיביים · טעינה 8935ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 97 · a11y 98 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (1.9 s) · max-potential-fid (180 ms) · interactive (4.4 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (7.1 s) · bootup-time (4.5 s) · heading-order · unminified-javascript (Est savings of 2 KiB)

צילומים: `tamlul-desktop.png` · `tamlul-mobile.png` · `tamlul-dark.png`

### `/modaot` — מודעות איגוד (מערכת 03)

כותרת: **יוצר מודעות לשיעורי תורה — מבית איגוד השיעורים** · h1: "מודעות מקצועיות לשיעורי תורהביצירת בינה מלאכותית" · טקסט מרונדר: 696 תווים · 8 אלמנטים אינטראקטיביים · טעינה 12288ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 95 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (1.9 s) · max-potential-fid (210 ms) · interactive (4.6 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (7.2 s) · bootup-time (4.6 s) · unused-javascript (Est savings of 49 KiB) · inspector-issues

צילומים: `modaot-desktop.png` · `modaot-mobile.png` · `modaot-dark.png`

### `/imud` — עימוד תורני (מערכת 04)

כותרת: **אות ודף — מנוע עימוד תורני** · h1: "עימוד תורני מקצועי — בלי גרפיקאי, בלי InDesign" · טקסט מרונדר: 612 תווים · 9 אלמנטים אינטראקטיביים · טעינה 10083ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 67 · a11y 96 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (4.0 s) · largest-contentful-paint (4.7 s) · speed-index (4.0 s) · total-blocking-time (310 ms) · max-potential-fid (220 ms) · interactive (5.7 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.9 s)

צילומים: `imud-desktop.png` · `imud-mobile.png` · `imud-dark.png`

### `/briut` — לידים קופות חולים (מערכת 06)

כותרת: **בקלות — השוואת קופות חולים והמלצות מעבר** · h1: "לאיזו קופת חולים כדאי לעבור?" · טקסט מרונדר: 4899 תווים · 62 אלמנטים אינטראקטיביים · טעינה 9255ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 98 · a11y 91 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (1.8 s) · max-potential-fid (170 ms) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.9 s) · bootup-time (4.0 s) · aria-required-children · color-contrast · label-content-name-mismatch

צילומים: `briut-desktop.png` · `briut-mobile.png` · `briut-dark.png`

### `/bkalot` — מימוש זכויות בקלות (מערכת 10)

כותרת: **בדיקה מקיפה על כל הזכויות וההטבות שניתן לקבל** · h1: "בדיקה מקיפה על כל הזכויותוההטבות שניתן לקבל" · טקסט מרונדר: 8446 תווים · 60 אלמנטים אינטראקטיביים · טעינה 12252ms

- אין `meta description`
- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 85 · a11y 93 · bp 77 · seo 91
  - נכשלו: first-contentful-paint (2.1 s) · total-blocking-time (480 ms) · max-potential-fid (340 ms) · interactive (5.0 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (10.2 s) · bootup-time (4.4 s) · select-name

צילומים: `bkalot-desktop.png` · `bkalot-mobile.png` · `bkalot-dark.png`

### `/smel` — נדל"ן Smel (מערכת 12)

כותרת: **SMEL NDLN — מחקר נדל"ן חכם** · h1: "כל מה שצריך לדעת על הנכס לפני שקונים" · טקסט מרונדר: 1208 תווים · 10 אלמנטים אינטראקטיביים · טעינה 10520ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 84 · a11y 92 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.8 s) · largest-contentful-paint (3.4 s) · max-potential-fid (180 ms) · interactive (3.8 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.4 s) · bootup-time (4.1 s) · color-contrast

צילומים: `smel-desktop.png` · `smel-mobile.png` · `smel-dark.png`

### `/smachot` — שמחות פלוס (מערכת 14)

כותרת: **שמחות פלוס — תוכנית עסקית** · h1: "מבוא" · טקסט מרונדר: 1473 תווים · 20 אלמנטים אינטראקטיביים · טעינה 11521ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 83 · a11y 100 · bp 77 · seo 100
  - נכשלו: largest-contentful-paint (3.8 s) · total-blocking-time (260 ms) · max-potential-fid (350 ms) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.9 s) · bootup-time (4.0 s) · unminified-javascript (Est savings of 2 KiB) · inspector-issues

צילומים: `smachot-desktop.png` · `smachot-mobile.png` · `smachot-dark.png`

### `/egod` — איגוד (מערכת 15)

כותרת: **איגוד השיעורים — פורטל מגידי השיעורים** · h1: "לשיעור שלך מגיעדף משלו" · טקסט מרונדר: 2426 תווים · 33 אלמנטים אינטראקטיביים · טעינה 9459ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 50 · a11y 83 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.9 s) · largest-contentful-paint (5.4 s) · speed-index (4.1 s) · total-blocking-time (930 ms) · max-potential-fid (410 ms) · interactive (7.6 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (8.3 s)

צילומים: `egod-desktop.png` · `egod-mobile.png` · `egod-dark.png`

### `/chatzor` — חצור קונקט — תדמית (מערכת 16)

כותרת: **מחוברים · חצור הגלילית** · h1: "מחוברים — כל התורה והקהילה של חצור הגלילית במקום אחד" · טקסט מרונדר: 2101 תווים · 30 אלמנטים אינטראקטיביים · טעינה 9549ms

- Lighthouse מתחת ל-90: perf 87 · a11y 100 · bp 77 · seo 100
  - נכשלו: largest-contentful-paint (3.2 s) · cumulative-layout-shift (0.146) · interactive (3.8 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (5.8 s) · bootup-time (3.9 s) · layout-shifts (2 layout shifts found) · unminified-javascript (Est savings of 2 KiB)

צילומים: `chatzor-desktop.png` · `chatzor-mobile.png` · `chatzor-dark.png`

### `/chatzor/` — חצור קונקט — המערכת (מערכת 16)

כותרת: **מחוברים · חצור הגלילית** · h1: "מחוברים — כל התורה והקהילה של חצור הגלילית במקום אחד" · טקסט מרונדר: 2101 תווים · 30 אלמנטים אינטראקטיביים · טעינה 11220ms

- Lighthouse מתחת ל-90: perf 54 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.5 s) · largest-contentful-paint (4.7 s) · speed-index (3.6 s) · total-blocking-time (1,000 ms) · max-potential-fid (330 ms) · interactive (5.7 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (5.3 s)

צילומים: `chatzor-app-desktop.png` · `chatzor-app-mobile.png` · `chatzor-app-dark.png`

### `/chizukim` — תמלול חיזוקים — תדמית (מערכת 17)

כותרת: **מערכת תמלול — חיזוקים קצרים** · h1: "חיזוקים קצרים" · טקסט מרונדר: 1951 תווים · 36 אלמנטים אינטראקטיביים · טעינה 10275ms

- Lighthouse מתחת ל-90: perf 95 · a11y 100 · bp 77 · seo 100
  - נכשלו: largest-contentful-paint (3.0 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (5.8 s) · bootup-time (3.9 s) · unminified-javascript (Est savings of 2 KiB) · inspector-issues · cache-insight (Est savings of 1,075 KiB) · document-latency-insight (Est savings of 10 KiB)

צילומים: `chizukim-desktop.png` · `chizukim-mobile.png` · `chizukim-dark.png`

### `/chizukim/` — תמלול חיזוקים — המערכת (מערכת 17)

כותרת: **מערכת תמלול — חיזוקים קצרים** · h1: "חיזוקים קצרים" · טקסט מרונדר: 1951 תווים · 36 אלמנטים אינטראקטיביים · טעינה 9133ms

- Lighthouse מתחת ל-90: perf 82 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.8 s) · largest-contentful-paint (3.0 s) · total-blocking-time (320 ms) · max-potential-fid (310 ms) · server-response-time (Root document took 880 ms) · interactive (5.1 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.8 s)

צילומים: `chizukim-app-desktop.png` · `chizukim-app-mobile.png` · `chizukim-app-dark.png`

### `/orech` — עורך תורני (מערכת 18)

כותרת: **העורך התורני** · h1: "העורך התורני" · טקסט מרונדר: 504 תווים · 4 אלמנטים אינטראקטיביים · טעינה 9061ms

- Lighthouse מתחת ל-90: perf 98 · a11y 100 · bp 77 · seo 100
  - נכשלו: max-potential-fid (170 ms) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.3 s) · bootup-time (4.4 s) · unminified-javascript (Est savings of 2 KiB) · unused-javascript (Est savings of 69 KiB) · inspector-issues · cache-insight (Est savings of 43 KiB)

צילומים: `orech-desktop.png` · `orech-mobile.png` · `orech-dark.png`

### `/mthbram` — Mthbram (מערכת 21)

כותרת: **איגוד השיעורים — שיעורי תורה, חברותות והרצאות** · h1: "מתחברים — מאגר שיעורי התורה" · טקסט מרונדר: 941 תווים · 19 אלמנטים אינטראקטיביים · טעינה 9544ms

- חסר: `canonical` · `og:url`
- הטבלה למעלה עדיין מסמנת ❌ בעמודת "כהה", וזו מדידת הייצור הנוכחי — לא מסקנה על
  העיצוב. העמוד כהה מלכתחילה: הרקע האפקטיבי `rgb(9, 26, 32)` (בהירות 0.009) בשני
  המצבים, ולכן `prefers-color-scheme: dark` אינו משנה בו דבר. מה שחסר הוא ההצהרה
  עצמה — `index.html` נושא `<meta name="color-scheme" content="dark">`, אבל meta
  הוא ברירת מחדל שאינה נראית ב-`getComputedStyle(documentElement).colorScheme`,
  והייצור מחזיר שם `"normal"`. ענף ה-dark-by-design של `platform-audit` דורש את
  המאפיין המחושב, ולכן זהו הנתיב היחיד מ-30 שנספר "בלי מצב כהה" (core.issues #82).
  `color-scheme: dark` נוסף ל-`html` ב-`apps/21-mthbram/src/index.css`; הבנייה
  המשוחזרת נמדדה ב-`scripts/qa/color-scheme-probe.mjs` ומחזירה `"dark"` עם
  dark-by-design=YES, וה-JS זהה בייט-לבייט לזה שבייצור — כלומר השינוי הוא ה-CSS
  בלבד. הפריסה נעצרה במכסת Vercel היומית (100 פריסות ליום); העמודה תתעדכן אחרי
  שהיא תעבור. צילומים: `colorscheme-0807/mthbram-built-local.png` מול
  `colorscheme-0807/mthbram-production.png`.
- Lighthouse מתחת ל-90: perf 66 · a11y 98 · bp 73 · seo 100
  - נכשלו: first-contentful-paint (4.7 s) · largest-contentful-paint (5.0 s) · speed-index (4.7 s) · total-blocking-time (240 ms) · max-potential-fid (160 ms) · errors-in-console · interactive (6.0 s) · third-party-cookies (2 cookies found)

צילומים: `mthbram-desktop.png` · `mthbram-mobile.png` · `mthbram-dark.png`

### `/zchuyot` — מימוש זכויות (מערכת 22)

כותרת: **בקלות — מיצוי זכויות, מענקים והטבות | הזכות שלך, האחריות שלנו** · h1: "בקלות" · טקסט מרונדר: 2511 תווים · 32 אלמנטים אינטראקטיביים · טעינה 9421ms

- Lighthouse מתחת ל-90: perf 46 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.8 s) · largest-contentful-paint (5.8 s) · speed-index (4.0 s) · total-blocking-time (1,100 ms) · max-potential-fid (500 ms) · interactive (5.8 s) · third-party-cookies (1 cookie found) · mainthread-work-breakdown (7.2 s)

צילומים: `zchuyot-desktop.png` · `zchuyot-mobile.png` · `zchuyot-dark.png`

### `/galil` — גליל קונקט (מערכת 24)

כותרת: **מחוברים — בתי כנסת חצור הגלילית** · h1: "מחוברים — יהדות וקהילה" · טקסט מרונדר: 1680 תווים · 31 אלמנטים אינטראקטיביים · טעינה 14609ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 71 · a11y 84 · bp 73 · seo 100
  - נכשלו: first-contentful-paint (3.4 s) · largest-contentful-paint (3.5 s) · speed-index (3.8 s) · total-blocking-time (490 ms) · max-potential-fid (370 ms) · errors-in-console · interactive (6.0 s) · third-party-cookies (2 cookies found)

צילומים: `galil-desktop.png` · `galil-mobile.png` · `galil-dark.png`

### `/studio` — סטודיו מודעות (מערכת 26)

כותרת: **מודעות AI — יצירת מודעות מעוצבות לקהילה** · h1: "מודעות · מנוע העיצוב החרדי" · טקסט מרונדר: 927 תווים · 9 אלמנטים אינטראקטיביים · טעינה 10632ms

- Lighthouse מתחת ל-90: perf 80 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.1 s) · largest-contentful-paint (3.8 s) · speed-index (3.8 s) · max-potential-fid (270 ms) · interactive (5.1 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (2.6 s) · valid-source-maps

צילומים: `studio-desktop.png` · `studio-mobile.png` · `studio-dark.png`

### `/mechiron` — השוואת מחירים (מערכת 27)

כותרת: **מאגר בקלות — כלי פנימי לצוות** · h1: "בקלות — הזכויות וההטבות שמגיעות לכם, בלי בירוקרטיה" · טקסט מרונדר: 3040 תווים · 25 אלמנטים אינטראקטיביים · טעינה 14851ms

- חסר: `canonical` · `og:url`
- 2 יעדי מגע מתחת ל-24px: a 130×17 "תנאי שימוש ומדיניות פרטיות"
- Lighthouse מתחת ל-90: perf 44 · a11y 96 · bp 73 · seo 100
  - נכשלו: first-contentful-paint (5.2 s) · largest-contentful-paint (5.3 s) · speed-index (5.2 s) · total-blocking-time (680 ms) · max-potential-fid (530 ms) · cumulative-layout-shift (0.16) · errors-in-console · interactive (8.9 s)

צילומים: `mechiron-desktop.png` · `mechiron-mobile.png` · `mechiron-dark.png`

### `/kupot` — השוואת קופות חולים (מערכת 28)

כותרת: **השוואת קופות חולים | מבית בקלות** · h1: "השוואת קופות חולים" · טקסט מרונדר: 3164 תווים · 51 אלמנטים אינטראקטיביים · טעינה 10932ms

- Lighthouse מתחת ל-90: perf 72 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.3 s) · largest-contentful-paint (3.4 s) · speed-index (3.8 s) · total-blocking-time (480 ms) · max-potential-fid (380 ms) · interactive (5.8 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (2.9 s)

צילומים: `kupot-desktop.png` · `kupot-mobile.png` · `kupot-dark.png`

### `/crm` — CRM זכויות (מערכת 30)

כותרת: **כניסה למערכת | זכויות פרו** · h1: "זכויות פרו" · טקסט מרונדר: 162 תווים · 7 אלמנטים אינטראקטיביים · טעינה 10571ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 93 · a11y 97 · bp 73 · seo 100
  - נכשלו: first-contentful-paint (1.8 s) · largest-contentful-paint (2.9 s) · errors-in-console · server-response-time (Root document took 950 ms) · third-party-cookies (2 cookies found) · landmark-one-main · unminified-javascript (Est savings of 2 KiB) · inspector-issues

צילומים: `crm-desktop.png` · `crm-mobile.png` · `crm-dark.png`

### `/gesher` — גשר עברית CRM (מערכת 31)

כותרת: **התחברות — מערכת CRM שותפים** · h1: "מערכת CRM שותפים" · טקסט מרונדר: 132 תווים · 7 אלמנטים אינטראקטיביים · טעינה 9728ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 96 · a11y 97 · bp 73 · seo 100
  - נכשלו: first-contentful-paint (1.9 s) · errors-in-console · server-response-time (Root document took 1,090 ms) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (5.2 s) · bootup-time (3.9 s) · landmark-one-main · unminified-javascript (Est savings of 2 KiB)

צילומים: `gesher-desktop.png` · `gesher-mobile.png` · `gesher-dark.png`

### `/nadlan` — נדל"ן ברגע (מערכת 32)

כותרת: **נדל"ן ברגע — תעודת זהות דיגיטלית לכל נכס** · h1: "כל מה שצריך לדעת על נכס — ברגע" · טקסט מרונדר: 6464 תווים · 43 אלמנטים אינטראקטיביים · טעינה 9907ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 74 · a11y 95 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.3 s) · largest-contentful-paint (2.6 s) · total-blocking-time (840 ms) · max-potential-fid (380 ms) · interactive (4.0 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (9.6 s) · bootup-time (4.5 s)

צילומים: `nadlan-desktop.png` · `nadlan-mobile.png` · `nadlan-dark.png`

### `/kesef` — כסף — שקיפות תקציבית (מערכת 34)

כותרת: **כסף — שקיפות תקציבית לרשויות מקומיות · עולם הסטארטאפים** · h1: "הכסף הציבורישמגיע לרשות שלך" · טקסט מרונדר: 2427 תווים · 12 אלמנטים אינטראקטיביים · טעינה 8949ms

- Lighthouse מתחת ל-90: perf 98 · a11y 100 · bp 77 · seo 100
  - נכשלו: max-potential-fid (270 ms) · third-party-cookies (1 cookie found) · mainthread-work-breakdown (2.1 s) · unminified-javascript (Est savings of 2 KiB) · inspector-issues · cache-insight (Est savings of 43 KiB) · document-latency-insight (Est savings of 11 KiB) · modern-http-insight

צילומים: `kesef-desktop.png` · `kesef-mobile.png` · `kesef-dark.png`

### `/kiosk/` — KioskFleet (מערכת 35)

כותרת: **KioskFleet — נעילת מכשיר לקישורים מאושרים בלבד** · h1: "מכשיר שפותחרק מה שאישרתם" · טקסט מרונדר: 2599 תווים · 14 אלמנטים אינטראקטיביים · טעינה 9097ms

- חסר: `canonical` · `og:url`
- 2 יעדי מגע מתחת ל-24px: a 94×19 "more30.com"
- Lighthouse מתחת ל-90: perf 95 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.3 s) · third-party-cookies (2 cookies found) · unminified-javascript (Est savings of 2 KiB) · inspector-issues · cache-insight (Est savings of 43 KiB) · document-latency-insight (Est savings of 7 KiB) · forced-reflow-insight · network-dependency-tree-insight

צילומים: `kiosk-desktop.png` · `kiosk-mobile.png` · `kiosk-dark.png`

### `/tivuch` — נדל"ן פרו — ניהול למתווכים (מערכת 36)

כותרת: **נדל״ן פרו — מערכת ניהול למתווכים ויועצי נדל״ן · עולם הסטארטאפים** · h1: "כל העסק של המתווךממסך אחד" · טקסט מרונדר: 2836 תווים · 12 אלמנטים אינטראקטיביים · טעינה 8869ms

- ✅ עובר את כל הבדיקות האוטומטיות.

צילומים: `tivuch-desktop.png` · `tivuch-mobile.png` · `tivuch-dark.png`

