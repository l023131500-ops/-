# QA/platform — מדידה רוחבית של כל המערכות החיות

> נמדד 2026-08-02 00:16 → 2026-08-02 03:17 מול הפרודקשן ב-`more30.com`.
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
| `/` | 33 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅¹ | ✅ | 84/100/77/100 |  |
| `/login` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 98/100/77/63 |  |
| `/me` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 100/100/77/63 |  |
| `/subscribe` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 98/100/77/63 |  |
| `/torah` | 01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 34/93/77/100 |  |
| `/tamlul` | 02 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ❌ | ✅ | 88/98/77/91 |  |
| `/modaot` | 03 | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ❌ | ❌ | 89/100/77/91 |  |
| `/imud` | 04 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 77/96/77/100 |  |
| `/briut` | 06 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 97/91/77/91 |  |
| `/bkalot` | 10 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ 2 | ✅ | ✅ | ❌ | ✅ | 80/93/77/82 |  |
| `/smel` | 12 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 88/92/77/100 |  |
| `/smachot` | 14 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ✅ | ✅ | 86/100/77/91 |  |
| `/egod` | 15 | ✅ | ✅ | ✅ | ✅ | ❌ 36 | ❌ 21 | ✅ | ✅ | ❌ | ✅ | 56/83/77/91 |  |
| `/chatzor` | 16 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 87/100/77/100 |  |
| `/chatzor/` | 16 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 57/100/77/100 |  |
| `/chizukim` | 17 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 89/100/77/100 |  |
| `/chizukim/` | 17 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 82/100/77/100 |  |
| `/orech` | 18 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 97/100/77/100 |  |
| `/mthbram` | 21 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ❌ 1 | ❌ | ✅ | 69/98/73/91 |  |
| `/zchuyot` | 22 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 3 | ✅ | ✅ | ❌ | ✅ | 38/90/77/92 |  |
| `/galil` | 24 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ✅ | ❌ 1 | ❌ | ✅ | 78/84/73/92 |  |
| `/studio` | 26 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 65/90/77/100 |  |
| `/mechiron` | 27 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ❌ | ✅ | 44/96/73/91 |  |
| `/kupot` | 28 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 41/90/77/100 |  |
| `/crm` | 30 | ✅ | ✅ | ❌ 0 | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ❌ | ✅ | 97/97/73/91 |  |
| `/gesher` | 31 | ✅ | ✅ | ❌ 0 | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ❌ | ✅ | 94/97/73/91 |  |
| `/nadlan` | 32 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 75/95/77/91 |  |

> ¹ **כהה מלכתחילה.** העמוד אינו משתנה בין המצבים מפני שהוא כבר כהה, והוא
> מצהיר על כך ב-`color-scheme` כדי שגם פקדי הדפדפן יירנדרו כהים. זה עומד
> ב-`DESIGN_STANDARD` §3, שדורש שלא יהיה הבזק לבן — לא שיהיו שתי ערכות.

---

## פירוט לפי נתיב

### `/` — אתר התדמית (מערכת 33)

כותרת: **עולם הסטארטאפים · מור מערכות תוכנה** · h1: "עולם הסטארטאפים" · טקסט מרונדר: 4267 תווים · 24 אלמנטים אינטראקטיביים · טעינה 4706ms

- Lighthouse מתחת ל-90: perf 84 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.3 s) · largest-contentful-paint (4.1 s) · interactive (5.4 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (2.6 s) · unminified-javascript (Est savings of 2 KiB) · unused-javascript (Est savings of 69 KiB) · inspector-issues

צילומים: `home-desktop.png` · `home-mobile.png` · `home-dark.png`

### `/login` — כניסה אחידה (מערכת --)

כותרת: **כניסה · מור מערכות תוכנה** · h1: "כניסה למערכות" · טקסט מרונדר: 332 תווים · 8 אלמנטים אינטראקטיביים · טעינה 5357ms

- אין את כפתור הכניסה האחיד (`auth-button.js`)
- Lighthouse מתחת ל-90: perf 98 · a11y 100 · bp 77 · seo 63
  - נכשלו: max-potential-fid (140 ms) · interactive (4.1 s) · third-party-cookies (2 cookies found) · unminified-javascript (Est savings of 3 KiB) · unused-javascript (Est savings of 26 KiB) · inspector-issues · is-crawlable · cache-insight (Est savings of 1,079 KiB)

צילומים: `login-desktop.png` · `login-mobile.png` · `login-dark.png`

### `/me` — אזור אישי (מערכת --)

כותרת: **האזור האישי · מור מערכות תוכנה** · h1: "האזור האישי" · טקסט מרונדר: 95 תווים · 3 אלמנטים אינטראקטיביים · טעינה 4524ms

- אין את כפתור הכניסה האחיד (`auth-button.js`)
- Lighthouse מתחת ל-90: perf 100 · a11y 100 · bp 77 · seo 63
  - נכשלו: interactive (3.9 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (5.7 s) · bootup-time (3.9 s) · unused-javascript (Est savings of 27 KiB) · inspector-issues · is-crawlable · cache-insight (Est savings of 1,086 KiB)

צילומים: `me-desktop.png` · `me-mobile.png` · `me-dark.png`

### `/subscribe` — מסלולים (מערכת --)

כותרת: **מסלולים · מור מערכות תוכנה** · h1: "מסלולים · מור מערכות תוכנה" · טקסט מרונדר: 650 תווים · 6 אלמנטים אינטראקטיביים · טעינה 5427ms

- Lighthouse מתחת ל-90: perf 98 · a11y 100 · bp 77 · seo 63
  - נכשלו: interactive (4.1 s) · third-party-cookies (2 cookies found) · unminified-javascript (Est savings of 2 KiB) · unused-javascript (Est savings of 27 KiB) · inspector-issues · is-crawlable · cache-insight (Est savings of 53 KiB) · document-latency-insight (Est savings of 8 KiB)

צילומים: `subscribe-desktop.png` · `subscribe-mobile.png` · `subscribe-dark.png`

### `/torah` — פלטפורמת איגוד השיעורים (מערכת 01)

כותרת: **איגוד מגידי השיעורים** · h1: "איגוד מגידי השיעורים" · טקסט מרונדר: 1237 תווים · 30 אלמנטים אינטראקטיביים · טעינה 5373ms

- חסר: `canonical` · `og:url`
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(255, 255, 255)` גם ב-`prefers-color-scheme: dark` (בהירות 1)
- Lighthouse מתחת ל-90: perf 34 · a11y 93 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (5.4 s) · largest-contentful-paint (12.5 s) · speed-index (7.4 s) · total-blocking-time (810 ms) · max-potential-fid (330 ms) · cumulative-layout-shift (0.131) · interactive (12.5 s) · third-party-cookies (2 cookies found)

צילומים: `torah-desktop.png` · `torah-mobile.png` · `torah-dark.png`

### `/tamlul` — תמלול איגוד (מערכת 02)

כותרת: **תמלול מבית איגוד השיעורים** · h1: "תמלול שיעורי תורהבמקצועיות אמיתית" · טקסט מרונדר: 1347 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4449ms

- חסר: `canonical` · `og:url`
- 2 יעדי מגע מתחת ל-24px: a 158×17 "a023131600@gmail.com"
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(251, 250, 246)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9553)
- Lighthouse מתחת ל-90: perf 88 · a11y 98 · bp 77 · seo 91
  - נכשלו: first-contentful-paint (1.9 s) · largest-contentful-paint (2.8 s) · total-blocking-time (310 ms) · max-potential-fid (300 ms) · interactive (4.8 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (3.0 s) · heading-order

צילומים: `tamlul-desktop.png` · `tamlul-mobile.png` · `tamlul-dark.png`

### `/modaot` — מודעות איגוד (מערכת 03)

כותרת: **יוצר מודעות לשיעורי תורה — מבית איגוד השיעורים** · h1: "מודעות מקצועיות לשיעורי תורהביצירת בינה מלאכותית" · טקסט מרונדר: 671 תווים · 7 אלמנטים אינטראקטיביים · טעינה 4492ms

- חסר: `canonical` · `og:url`
- 4 יעדי מגע מתחת ל-24px: a 59×20 "צור מודעה" · a 72×20 "תמלול שיעור" · a 54×20 "התחברות"
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(248, 245, 236)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9132)
- אין את כפתור הכניסה האחיד (`auth-button.js`)
- Lighthouse מתחת ל-90: perf 89 · a11y 100 · bp 77 · seo 91
  - נכשלו: first-contentful-paint (1.9 s) · largest-contentful-paint (2.7 s) · total-blocking-time (300 ms) · max-potential-fid (260 ms) · interactive (4.9 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (2.7 s) · unused-javascript (Est savings of 49 KiB)

צילומים: `modaot-desktop.png` · `modaot-mobile.png` · `modaot-dark.png`

### `/imud` — עימוד תורני (מערכת 04)

כותרת: **אות ודף — מנוע עימוד תורני** · h1: "עימוד תורני מקצועי — בלי גרפיקאי, בלי InDesign" · טקסט מרונדר: 587 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4521ms

- חסר: `canonical` · `og:url`
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(250, 248, 245)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9405)
- Lighthouse מתחת ל-90: perf 77 · a11y 96 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.6 s) · largest-contentful-paint (4.1 s) · speed-index (3.6 s) · max-potential-fid (200 ms) · interactive (5.5 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (6.6 s) · bootup-time (4.4 s)

צילומים: `imud-desktop.png` · `imud-mobile.png` · `imud-dark.png`

### `/briut` — לידים קופות חולים (מערכת 06)

כותרת: **בקלות — השוואת קופות חולים והמלצות מעבר** · h1: "לאיזו קופת חולים כדאי לעבור?" · טקסט מרונדר: 4873 תווים · 61 אלמנטים אינטראקטיביים · טעינה 4466ms

- חסר: `canonical` · `og:url`
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(246, 248, 249)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9357)
- Lighthouse מתחת ל-90: perf 97 · a11y 91 · bp 77 · seo 91
  - נכשלו: third-party-cookies (2 cookies found) · mainthread-work-breakdown (2.7 s) · aria-required-children · color-contrast · label-content-name-mismatch · unminified-javascript (Est savings of 2 KiB) · inspector-issues · robots-txt (43 errors found)

צילומים: `briut-desktop.png` · `briut-mobile.png` · `briut-dark.png`

### `/bkalot` — מימוש זכויות בקלות (מערכת 10)

כותרת: **בדיקה מקיפה על כל הזכויות וההטבות שניתן לקבל** · h1: "בדיקה מקיפה על כל הזכויותוההטבות שניתן לקבל" · טקסט מרונדר: 3065 תווים · 45 אלמנטים אינטראקטיביים · טעינה 4507ms

- אין `meta description`
- חסר: `canonical` · `og:url`
- 2 פקדים בלי שם נגיש: select .fund-select
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(247, 246, 242)` גם ב-`prefers-color-scheme: dark` (בהירות 0.921)
- Lighthouse מתחת ל-90: perf 80 · a11y 93 · bp 77 · seo 82
  - נכשלו: first-contentful-paint (2.0 s) · total-blocking-time (680 ms) · max-potential-fid (380 ms) · interactive (5.1 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (11.1 s) · bootup-time (4.4 s) · select-name

צילומים: `bkalot-desktop.png` · `bkalot-mobile.png` · `bkalot-dark.png`

### `/smel` — נדל"ן Smel (מערכת 12)

כותרת: **SMEL NDLN — מחקר נדל"ן חכם** · h1: "כל מה שצריך לדעת על הנכס לפני שקונים" · טקסט מרונדר: 1166 תווים · 9 אלמנטים אינטראקטיביים · טעינה 4314ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 88 · a11y 92 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.6 s) · largest-contentful-paint (3.1 s) · max-potential-fid (190 ms) · third-party-cookies (2 cookies found) · color-contrast · link-name · unminified-javascript (Est savings of 2 KiB) · unused-css-rules (Est savings of 10 KiB)

צילומים: `smel-desktop.png` · `smel-mobile.png` · `smel-dark.png`

### `/smachot` — שמחות פלוס (מערכת 14)

כותרת: **שמחות פלוס — תוכנית עסקית** · h1: "מבוא" · טקסט מרונדר: 1448 תווים · 19 אלמנטים אינטראקטיביים · טעינה 4490ms

- חסר: `canonical` · `og:url`
- 2 יעדי מגע מתחת ל-24px: a 232×20 "מאגר GitHub"
- Lighthouse מתחת ל-90: perf 86 · a11y 100 · bp 77 · seo 91
  - נכשלו: largest-contentful-paint (3.7 s) · max-potential-fid (210 ms) · third-party-cookies (2 cookies found) · unminified-javascript (Est savings of 2 KiB) · inspector-issues · robots-txt (43 errors found) · cache-insight (Est savings of 1,226 KiB) · document-latency-insight (Est savings of 3 KiB)

צילומים: `smachot-desktop.png` · `smachot-mobile.png` · `smachot-dark.png`

### `/egod` — איגוד (מערכת 15)

כותרת: **איגוד השיעורים – פורטל מגידי השיעורים** · h1: "כל הכלים למגיד השיעורתחת קורת גג אחת" · טקסט מרונדר: 2459 תווים · 32 אלמנטים אינטראקטיביים · טעינה 4707ms

- חסר: `canonical` · `og:url`
- 36 יעדי מגע מתחת ל-24px: button 6×6 "" · a 358×20 "דף הבית" · a 358×20 "מצא שיעור" · a 358×20 "הקם שיעור" · a 358×20 "אודות" · a 358×20 "הצטרף לאיגוד" · a 358×20 "הפעלת פורטל חדש" · a 358×20 "כניסה לפורטל"
- 21 פקדים בלי שם נגיש: button .w-10 h-10 rounded-full bg-card border bo · button .h-1.5 rounded-full transition-all w-6 bg · button .h-1.5 rounded-full transition-all w-1.5  · button .md:hidden text-primary-foreground p-2
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(245, 246, 250)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9223)
- Lighthouse מתחת ל-90: perf 56 · a11y 83 · bp 77 · seo 91
  - נכשלו: first-contentful-paint (3.5 s) · largest-contentful-paint (5.1 s) · speed-index (3.5 s) · total-blocking-time (720 ms) · max-potential-fid (320 ms) · interactive (6.3 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (3.8 s)

צילומים: `egod-desktop.png` · `egod-mobile.png` · `egod-dark.png`

### `/chatzor` — חצור קונקט — תדמית (מערכת 16)

כותרת: **חצור קונקט · מור מערכות תוכנה** · h1: "חצור קונקט" · טקסט מרונדר: 927 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4238ms

- Lighthouse מתחת ל-90: perf 87 · a11y 100 · bp 77 · seo 100
  - נכשלו: largest-contentful-paint (3.3 s) · cumulative-layout-shift (0.146) · third-party-cookies (1 cookie found) · layout-shifts (3 layout shifts found) · unminified-javascript (Est savings of 2 KiB) · inspector-issues · cache-insight (Est savings of 43 KiB) · cls-culprits-insight

צילומים: `chatzor-desktop.png` · `chatzor-mobile.png` · `chatzor-dark.png`

### `/chatzor/` — חצור קונקט — המערכת (מערכת 16)

כותרת: **מחוברים · חצור הגלילית** · h1: "מחוברים — כל התורה והקהילה של חצור הגלילית במקום אחד" · טקסט מרונדר: 2086 תווים · 29 אלמנטים אינטראקטיביים · טעינה 4495ms

- Lighthouse מתחת ל-90: perf 57 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.8 s) · largest-contentful-paint (5.0 s) · speed-index (3.8 s) · total-blocking-time (640 ms) · max-potential-fid (340 ms) · interactive (5.6 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (4.5 s)

צילומים: `chatzor-app-desktop.png` · `chatzor-app-mobile.png` · `chatzor-app-dark.png`

### `/chizukim` — תמלול חיזוקים — תדמית (מערכת 17)

כותרת: **תמלול חיזוקים · מור מערכות תוכנה** · h1: "תמלול חיזוקים" · טקסט מרונדר: 920 תווים · 8 אלמנטים אינטראקטיביים · טעינה 3967ms

- Lighthouse מתחת ל-90: perf 89 · a11y 100 · bp 77 · seo 100
  - נכשלו: largest-contentful-paint (2.9 s) · cumulative-layout-shift (0.146) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (5.8 s) · bootup-time (3.9 s) · layout-shifts (2 layout shifts found) · unminified-javascript (Est savings of 2 KiB) · inspector-issues

צילומים: `chizukim-desktop.png` · `chizukim-mobile.png` · `chizukim-dark.png`

### `/chizukim/` — תמלול חיזוקים — המערכת (מערכת 17)

כותרת: **מערכת תמלול — חיזוקים קצרים** · h1: "חיזוקים קצרים" · טקסט מרונדר: 1926 תווים · 35 אלמנטים אינטראקטיביים · טעינה 5365ms

- Lighthouse מתחת ל-90: perf 82 · a11y 100 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.0 s) · largest-contentful-paint (3.2 s) · total-blocking-time (270 ms) · max-potential-fid (200 ms) · interactive (5.6 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (2.4 s) · unminified-javascript (Est savings of 2 KiB)

צילומים: `chizukim-app-desktop.png` · `chizukim-app-mobile.png` · `chizukim-app-dark.png`

### `/orech` — עורך תורני (מערכת 18)

כותרת: **העורך התורני** · h1: "העורך התורני" · טקסט מרונדר: 479 תווים · 3 אלמנטים אינטראקטיביים · טעינה 4309ms

- Lighthouse מתחת ל-90: perf 97 · a11y 100 · bp 77 · seo 100
  - נכשלו: max-potential-fid (210 ms) · third-party-cookies (2 cookies found) · unminified-javascript (Est savings of 2 KiB) · unused-javascript (Est savings of 69 KiB) · inspector-issues · cache-insight (Est savings of 1,226 KiB) · document-latency-insight (Est savings of 6 KiB) · font-display-insight (Est savings of 340 ms)

צילומים: `orech-desktop.png` · `orech-mobile.png` · `orech-dark.png`

### `/mthbram` — Mthbram (מערכת 21)

כותרת: **איגוד השיעורים - שיעורי תורה, חברותות והרצאות** · h1: "404" · טקסט מרונדר: 41 תווים · 1 אלמנטים אינטראקטיביים · טעינה 4781ms

- חסר: `canonical` · `og:url`
- 2 יעדי מגע מתחת ל-24px: a 92×18 "Return to Home"
- 1 שגיאות קונסולה: 404 Error: User attempted to access non-existent route: /mthbram
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(9, 26, 32)` גם ב-`prefers-color-scheme: dark` (בהירות 0.009)
- Lighthouse מתחת ל-90: perf 69 · a11y 98 · bp 73 · seo 91
  - נכשלו: first-contentful-paint (4.8 s) · largest-contentful-paint (4.9 s) · speed-index (4.8 s) · errors-in-console · interactive (6.0 s) · third-party-cookies (2 cookies found) · valid-source-maps · landmark-one-main

צילומים: `mthbram-desktop.png` · `mthbram-mobile.png` · `mthbram-dark.png`

### `/zchuyot` — מימוש זכויות (מערכת 22)

כותרת: **בקלות — מיצוי זכויות, מענקים והטבות | הזכות שלך, האחריות שלנו** · h1: "בקלות" · טקסט מרונדר: 2502 תווים · 31 אלמנטים אינטראקטיביים · טעינה 4791ms

- 3 פקדים בלי שם נגיש: button .fixed bottom-6 left-6 z-50 w-16 h-16 rou · button .md:hidden text-primary-foreground
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(249, 251, 249)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9597)
- Lighthouse מתחת ל-90: perf 38 · a11y 90 · bp 77 · seo 92
  - נכשלו: first-contentful-paint (5.0 s) · largest-contentful-paint (6.9 s) · speed-index (5.0 s) · total-blocking-time (1,550 ms) · max-potential-fid (540 ms) · interactive (8.1 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (8.1 s)

צילומים: `zchuyot-desktop.png` · `zchuyot-mobile.png` · `zchuyot-dark.png`

### `/galil` — גליל קונקט (מערכת 24)

כותרת: **מחוברים — בתי כנסת חצור הגלילית** · h1: "404" · טקסט מרונדר: 123 תווים · 11 אלמנטים אינטראקטיביים · טעינה 4706ms

- חסר: `canonical` · `og:url`
- 1 פקדים בלי שם נגיש: button .md:hidden w-9 h-9 rounded-xl flex items-
- 1 שגיאות קונסולה: 404 Error: User attempted to access non-existent route: /galil
- אין מצב כהה — הרקע האפקטיבי נשאר `transparent` גם ב-`prefers-color-scheme: dark`
- Lighthouse מתחת ל-90: perf 78 · a11y 84 · bp 73 · seo 92
  - נכשלו: first-contentful-paint (3.2 s) · largest-contentful-paint (3.3 s) · total-blocking-time (350 ms) · max-potential-fid (250 ms) · errors-in-console · interactive (5.1 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (2.1 s)

צילומים: `galil-desktop.png` · `galil-mobile.png` · `galil-dark.png`

### `/studio` — סטודיו מודעות (מערכת 26)

כותרת: **מודעות AI — יצירת מודעות מעוצבות לקהילה** · h1: "מודעות · מנוע העיצוב החרדי" · טקסט מרונדר: 762 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4517ms

- חסר: `canonical` · `og:url`
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(250, 248, 245)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9405)
- Lighthouse מתחת ל-90: perf 65 · a11y 90 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (3.8 s) · largest-contentful-paint (5.3 s) · speed-index (3.8 s) · total-blocking-time (300 ms) · max-potential-fid (210 ms) · interactive (5.3 s) · third-party-cookies (2 cookies found) · valid-source-maps

צילומים: `studio-desktop.png` · `studio-mobile.png` · `studio-dark.png`

### `/mechiron` — השוואת מחירים (מערכת 27)

כותרת: **מאגר בקלות — כלי פנימי לצוות** · h1: "השוואת מחירים — חוסכים בקלות" · טקסט מרונדר: 305 תווים · 9 אלמנטים אינטראקטיביים · טעינה 4561ms

- חסר: `canonical` · `og:url`
- 1 שגיאות קונסולה: Failed to load resource: the server responded with a status of 404 (Not Found)
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(248, 246, 242)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9228)
- Lighthouse מתחת ל-90: perf 44 · a11y 96 · bp 73 · seo 91
  - נכשלו: first-contentful-paint (4.5 s) · largest-contentful-paint (4.9 s) · speed-index (4.5 s) · total-blocking-time (700 ms) · max-potential-fid (470 ms) · cumulative-layout-shift (0.201) · errors-in-console · interactive (8.2 s)

צילומים: `mechiron-desktop.png` · `mechiron-mobile.png` · `mechiron-dark.png`

### `/kupot` — השוואת קופות חולים (מערכת 28)

כותרת: **השוואת קופות חולים | מבית בקלות** · h1: "השוואת קופות חולים" · טקסט מרונדר: 34655 תווים · 460 אלמנטים אינטראקטיביים · טעינה 4291ms

- חסר: `canonical` · `og:url`
- Lighthouse מתחת ל-90: perf 41 · a11y 90 · bp 77 · seo 100
  - נכשלו: first-contentful-paint (2.9 s) · largest-contentful-paint (3.2 s) · total-blocking-time (4,350 ms) · max-potential-fid (2,300 ms) · cumulative-layout-shift (0.332) · interactive (9.8 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (10.1 s)

צילומים: `kupot-desktop.png` · `kupot-mobile.png` · `kupot-dark.png`

### `/crm` — CRM זכויות (מערכת 30)

כותרת: **זכויות פרו | ZchuyotPro** · h1: — · טקסט מרונדר: 0 תווים · 0 אלמנטים אינטראקטיביים · טעינה 5419ms

- 0 תגי `h1` (צריך בדיוק אחד)
- חסר: `canonical` · `og:url`
- 1 שגיאות קונסולה: Failed to load resource: the server responded with a status of 404 (Not Found)
- אין מצב כהה — הרקע האפקטיבי נשאר `transparent` גם ב-`prefers-color-scheme: dark`
- Lighthouse מתחת ל-90: perf 97 · a11y 97 · bp 73 · seo 91
  - נכשלו: first-contentful-paint (1.8 s) · errors-in-console · third-party-cookies (2 cookies found) · landmark-one-main · unminified-javascript (Est savings of 2 KiB) · inspector-issues · robots-txt (43 errors found) · cache-insight (Est savings of 43 KiB)

צילומים: `crm-desktop.png` · `crm-mobile.png` · `crm-dark.png`

### `/gesher` — גשר עברית CRM (מערכת 31)

כותרת: **מערכת CRM שותפים** · h1: — · טקסט מרונדר: 0 תווים · 0 אלמנטים אינטראקטיביים · טעינה 5209ms

- 0 תגי `h1` (צריך בדיוק אחד)
- חסר: `canonical` · `og:url`
- 1 שגיאות קונסולה: Failed to load resource: the server responded with a status of 404 (Not Found)
- אין מצב כהה — הרקע האפקטיבי נשאר `transparent` גם ב-`prefers-color-scheme: dark`
- Lighthouse מתחת ל-90: perf 94 · a11y 97 · bp 73 · seo 91
  - נכשלו: first-contentful-paint (1.8 s) · largest-contentful-paint (2.9 s) · errors-in-console · third-party-cookies (2 cookies found) · landmark-one-main · unminified-javascript (Est savings of 2 KiB) · inspector-issues · robots-txt (43 errors found)

צילומים: `gesher-desktop.png` · `gesher-mobile.png` · `gesher-dark.png`

### `/nadlan` — נדל"ן ברגע (מערכת 32)

כותרת: **נדל"ן ברגע — תעודת זהות דיגיטלית לכל נכס** · h1: "כל מה שצריך לדעת על נכס — ברגע" · טקסט מרונדר: 6441 תווים · 42 אלמנטים אינטראקטיביים · טעינה 4737ms

- חסר: `canonical` · `og:url`
- אין מצב כהה — הרקע האפקטיבי נשאר `rgb(246, 248, 252)` גם ב-`prefers-color-scheme: dark` (בהירות 0.9376)
- Lighthouse מתחת ל-90: perf 75 · a11y 95 · bp 77 · seo 91
  - נכשלו: first-contentful-paint (2.3 s) · largest-contentful-paint (2.9 s) · total-blocking-time (650 ms) · max-potential-fid (540 ms) · interactive (3.9 s) · third-party-cookies (2 cookies found) · mainthread-work-breakdown (4.1 s) · color-contrast

צילומים: `nadlan-desktop.png` · `nadlan-mobile.png` · `nadlan-dark.png`

