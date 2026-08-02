# QA/platform — מדידה רוחבית של כל המערכות החיות

> נמדד 2026-08-02 00:16 → 2026-08-02 00:25 מול הפרודקשן ב-`more30.com`.
> נוצר על ידי `scripts/qa/platform-audit.mjs` + `scripts/qa/lighthouse-run.mjs` → `scripts/qa/report.mjs`.
> כל שורה כאן היא מדידה בדפדפן אמיתי, לא הערכה. הסטנדרט: `DESIGN_STANDARD.md`.

| נתיב | # | 200 | RTL | h1 | תיאור | מגע≥24 | שמות | ללא גלישה | ללא שגיאות | כהה | כניסה | LH p/a/b/s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 33 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | · |  |
| `/login` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ❌ | ❌ | · |  |
| `/me` | -- | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | · |  |
| `/subscribe` | -- | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | · |  |
| `/torah` | 01 | ✅ | ✅ | ✅ | ✅ | ❌ 16 | ❌ 3 | ✅ | ✅ | ❌ | ✅ | · |  |
| `/tamlul` | 02 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ❌ | ✅ | · |  |
| `/modaot` | 03 | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ | ❌ | ❌ | · |  |
| `/imud` | 04 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ❌ | ✅ | · |  |
| `/briut` | 06 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | · |  |
| `/bkalot` | 10 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ 2 | ✅ | ✅ | ❌ | ✅ | · |  |
| `/smel` | 12 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | · |  |
| `/smachot` | 14 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ✅ | ✅ | · |  |
| `/egod` | 15 | ✅ | ✅ | ✅ | ✅ | ❌ 36 | ❌ 21 | ✅ | ✅ | ❌ | ✅ | · |  |
| `/chatzor` | 16 | ✅ | ✅ | ❌ 2 | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ✅ | ✅ | · |  |
| `/chatzor/` | 16 | ✅ | ✅ | ✅ | ✅ | ❌ 34 | ✅ | ✅ | ✅ | ✅ | ✅ | · |  |
| `/chizukim` | 17 | ✅ | ✅ | ❌ 2 | ✅ | ❌ 2 | ✅ | ✅ | ✅ | ✅ | ✅ | · |  |
| `/chizukim/` | 17 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | · |  |
| `/orech` | 18 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | · |  |
| `/mthbram` | 21 | ✅ | ✅ | ✅ | ✅ | ❌ 2 | ✅ | ✅ | ❌ 1 | ❌ | ✅ | · |  |
| `/zchuyot` | 22 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 3 | ✅ | ✅ | ❌ | ✅ | · |  |
| `/galil` | 24 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ✅ | ❌ 1 | ❌ | ✅ | · |  |
| `/studio` | 26 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | · |  |
| `/mechiron` | 27 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ❌ | ✅ | · |  |
| `/kupot` | 28 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | · |  |
| `/crm` | 30 | ✅ | ✅ | ❌ 0 | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ❌ | ✅ | · |  |
| `/gesher` | 31 | ✅ | ✅ | ❌ 0 | ✅ | ✅ | ✅ | ✅ | ❌ 1 | ❌ | ✅ | · |  |
| `/nadlan` | 32 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | · |  |

---

## פירוט לפי נתיב

### `/` — אתר התדמית (מערכת 33)

כותרת: **עולם הסטארטאפים · מור מערכות תוכנה** · h1: "עולם הסטארטאפים" · טקסט מרונדר: 4267 תווים · 24 אלמנטים אינטראקטיביים · טעינה 4793ms

- גלישה אופקית במובייל: 469px בתוך 390px
- אין מצב כהה — הרקע נשאר `rgb(11, 13, 46)` גם ב-`prefers-color-scheme: dark`

צילומים: `home-desktop.png` · `home-mobile.png` · `home-dark.png`

### `/login` — כניסה אחידה (מערכת --)

כותרת: **כניסה · מור מערכות תוכנה** · h1: "כניסה למערכות" · טקסט מרונדר: 332 תווים · 8 אלמנטים אינטראקטיביים · טעינה 5152ms

- 1 שגיאות קונסולה: Failed to load resource: net::ERR_QUIC_PROTOCOL_ERROR.QUIC_PACKET_WRITE_ERROR
- אין מצב כהה — הרקע נשאר `rgba(0, 0, 0, 0)` גם ב-`prefers-color-scheme: dark`
- אין את כפתור הכניסה האחיד (`auth-button.js`)

צילומים: `login-desktop.png` · `login-mobile.png` · `login-dark.png`

### `/me` — אזור אישי (מערכת --)

כותרת: **האזור האישי · מור מערכות תוכנה** · h1: "האזור האישי" · טקסט מרונדר: 95 תווים · 3 אלמנטים אינטראקטיביים · טעינה 4479ms

- 2 תגי `h1` (צריך בדיוק אחד)
- אין את כפתור הכניסה האחיד (`auth-button.js`)

צילומים: `me-desktop.png` · `me-mobile.png` · `me-dark.png`

### `/subscribe` — מסלולים (מערכת --)

כותרת: **מסלולים · מור מערכות תוכנה** · h1: "מסלולים · מור מערכות תוכנה" · טקסט מרונדר: 650 תווים · 6 אלמנטים אינטראקטיביים · טעינה 6653ms

- ✅ עובר את כל הבדיקות האוטומטיות.

צילומים: `subscribe-desktop.png` · `subscribe-mobile.png` · `subscribe-dark.png`

### `/torah` — פלטפורמת איגוד השיעורים (מערכת 01)

כותרת: **איגוד מגידי השיעורים** · h1: "איגוד מגידי השיעורים" · טקסט מרונדר: 1237 תווים · 30 אלמנטים אינטראקטיביים · טעינה 5104ms

- `viewport` חוסם זום: `width=device-width, initial-scale=1.0, maximum-scale=5.0`
- 16 יעדי מגע מתחת ל-24px: a 29×17 "ראשי" · a 78×17 "מאגר שיעורים" · a 87×17 "תשמישי קדושה" · a 38×17 "תרומה" · a 32×17 "אודות" · a 48×17 "צור קשר" · a 85×17 "מדיניות פרטיות" · a 83×17 "הצהרת נגישות"
- 3 פקדים בלי שם נגיש: a .inline-flex items-center justify-center  · button .inline-flex items-center justify-center 
- אין מצב כהה — הרקע נשאר `rgb(255, 255, 255)` גם ב-`prefers-color-scheme: dark`

צילומים: `torah-desktop.png` · `torah-mobile.png` · `torah-dark.png`

### `/tamlul` — תמלול איגוד (מערכת 02)

כותרת: **תמלול מבית איגוד השיעורים** · h1: "תמלול שיעורי תורהבמקצועיות אמיתית" · טקסט מרונדר: 1347 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4807ms

- 2 יעדי מגע מתחת ל-24px: a 158×17 "a023131600@gmail.com"
- אין מצב כהה — הרקע נשאר `rgb(251, 250, 246)` גם ב-`prefers-color-scheme: dark`

צילומים: `tamlul-desktop.png` · `tamlul-mobile.png` · `tamlul-dark.png`

### `/modaot` — מודעות איגוד (מערכת 03)

כותרת: **יוצר מודעות לשיעורי תורה — מבית איגוד השיעורים** · h1: "מודעות מקצועיות לשיעורי תורהביצירת בינה מלאכותית" · טקסט מרונדר: 671 תווים · 7 אלמנטים אינטראקטיביים · טעינה 4875ms

- 4 יעדי מגע מתחת ל-24px: a 59×20 "צור מודעה" · a 72×20 "תמלול שיעור" · a 54×20 "התחברות"
- אין מצב כהה — הרקע נשאר `rgb(248, 245, 236)` גם ב-`prefers-color-scheme: dark`
- אין את כפתור הכניסה האחיד (`auth-button.js`)

צילומים: `modaot-desktop.png` · `modaot-mobile.png` · `modaot-dark.png`

### `/imud` — עימוד תורני (מערכת 04)

כותרת: **אות ודף — מנוע עימוד תורני** · h1: "עימוד תורני מקצועי — בלי גרפיקאי, בלי InDesign" · טקסט מרונדר: 598 תווים · 13 אלמנטים אינטראקטיביים · טעינה 4725ms

- `viewport` חוסם זום: `width=device-width, initial-scale=1.0, maximum-scale=1`
- 4 פקדים בלי שם נגיש: button .inline-flex items-center justify-center 
- אין מצב כהה — הרקע נשאר `rgb(250, 248, 245)` גם ב-`prefers-color-scheme: dark`

צילומים: `imud-desktop.png` · `imud-mobile.png` · `imud-dark.png`

### `/briut` — לידים קופות חולים (מערכת 06)

כותרת: **בקלות — השוואת קופות חולים והמלצות מעבר** · h1: "לאיזו קופת חולים כדאי לעבור?" · טקסט מרונדר: 4873 תווים · 61 אלמנטים אינטראקטיביים · טעינה 4855ms

- אין מצב כהה — הרקע נשאר `rgb(246, 248, 249)` גם ב-`prefers-color-scheme: dark`

צילומים: `briut-desktop.png` · `briut-mobile.png` · `briut-dark.png`

### `/bkalot` — מימוש זכויות בקלות (מערכת 10)

כותרת: **בדיקה מקיפה על כל הזכויות וההטבות שניתן לקבל** · h1: "בדיקה מקיפה על כל הזכויותוההטבות שניתן לקבל" · טקסט מרונדר: 3065 תווים · 45 אלמנטים אינטראקטיביים · טעינה 5084ms

- אין `meta description`
- 2 פקדים בלי שם נגיש: select .fund-select
- אין מצב כהה — הרקע נשאר `rgb(247, 246, 242)` גם ב-`prefers-color-scheme: dark`

צילומים: `bkalot-desktop.png` · `bkalot-mobile.png` · `bkalot-dark.png`

### `/smel` — נדל"ן Smel (מערכת 12)

כותרת: **SMEL NDLN — מחקר נדל"ן חכם** · h1: "כל מה שצריך לדעת על הנכס לפני שקונים" · טקסט מרונדר: 1166 תווים · 9 אלמנטים אינטראקטיביים · טעינה 4587ms

- `viewport` חוסם זום: `width=device-width, initial-scale=1.0, maximum-scale=1`

צילומים: `smel-desktop.png` · `smel-mobile.png` · `smel-dark.png`

### `/smachot` — שמחות פלוס (מערכת 14)

כותרת: **שמחות פלוס — תוכנית עסקית** · h1: "מבוא" · טקסט מרונדר: 1448 תווים · 19 אלמנטים אינטראקטיביים · טעינה 4513ms

- 2 יעדי מגע מתחת ל-24px: a 232×20 "מאגר GitHub"

צילומים: `smachot-desktop.png` · `smachot-mobile.png` · `smachot-dark.png`

### `/egod` — איגוד (מערכת 15)

כותרת: **איגוד השיעורים – פורטל מגידי השיעורים** · h1: "כל הכלים למגיד השיעורתחת קורת גג אחת" · טקסט מרונדר: 2459 תווים · 32 אלמנטים אינטראקטיביים · טעינה 4913ms

- 36 יעדי מגע מתחת ל-24px: button 6×6 "" · a 358×20 "דף הבית" · a 358×20 "מצא שיעור" · a 358×20 "הקם שיעור" · a 358×20 "אודות" · a 358×20 "הצטרף לאיגוד" · a 358×20 "הפעלת פורטל חדש" · a 358×20 "כניסה לפורטל"
- 21 פקדים בלי שם נגיש: button .w-10 h-10 rounded-full bg-card border bo · button .h-1.5 rounded-full transition-all w-6 bg · button .h-1.5 rounded-full transition-all w-1.5  · button .md:hidden text-primary-foreground p-2
- אין מצב כהה — הרקע נשאר `rgb(245, 246, 250)` גם ב-`prefers-color-scheme: dark`

צילומים: `egod-desktop.png` · `egod-mobile.png` · `egod-dark.png`

### `/chatzor` — חצור קונקט — תדמית (מערכת 16)

כותרת: **חצור קונקט · מור מערכות תוכנה** · h1: "חצור קונקט" · טקסט מרונדר: 927 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4216ms

- 2 תגי `h1` (צריך בדיוק אחד)
- 2 יעדי מגע מתחת ל-24px: a 97×19 "מור מערכות תוכנה"

צילומים: `chatzor-desktop.png` · `chatzor-mobile.png` · `chatzor-dark.png`

### `/chatzor/` — חצור קונקט — המערכת (מערכת 16)

כותרת: **מחוברים · חצור הגלילית** · h1: "מחוברים — כל התורה והקהילה של חצור הגלילית במקום אחד" · טקסט מרונדר: 2077 תווים · 29 אלמנטים אינטראקטיביים · טעינה 5364ms

- 34 יעדי מגע מתחת ל-24px: a 1×1 "דלג לתוכן" · a 114×20 "לאתר בית הכנסת" · a 43×20 "ניווט" · a 103×20 "לכל בתי הכנסת" · a 149×20 "לכל הגמ״חים והשירותים" · a 49×18 "בתי כנסת" · a 47×18 "זמני היום" · a 66×18 "שאל את הרב"

צילומים: `chatzor-app-desktop.png` · `chatzor-app-mobile.png` · `chatzor-app-dark.png`

### `/chizukim` — תמלול חיזוקים — תדמית (מערכת 17)

כותרת: **תמלול חיזוקים · מור מערכות תוכנה** · h1: "תמלול חיזוקים" · טקסט מרונדר: 920 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4261ms

- 2 תגי `h1` (צריך בדיוק אחד)
- 2 יעדי מגע מתחת ל-24px: a 97×19 "מור מערכות תוכנה"

צילומים: `chizukim-desktop.png` · `chizukim-mobile.png` · `chizukim-dark.png`

### `/chizukim/` — תמלול חיזוקים — המערכת (מערכת 17)

כותרת: **מערכת תמלול — חיזוקים קצרים** · h1: "חיזוקים קצרים" · טקסט מרונדר: 1926 תווים · 35 אלמנטים אינטראקטיביים · טעינה 5387ms

- אין מצב כהה — הרקע נשאר `rgb(248, 246, 242)` גם ב-`prefers-color-scheme: dark`

צילומים: `chizukim-app-desktop.png` · `chizukim-app-mobile.png` · `chizukim-app-dark.png`

### `/orech` — עורך תורני (מערכת 18)

כותרת: **העורך התורני** · h1: "העורך התורני" · טקסט מרונדר: 479 תווים · 3 אלמנטים אינטראקטיביים · טעינה 4581ms

- אין מצב כהה — הרקע נשאר `rgb(250, 247, 240)` גם ב-`prefers-color-scheme: dark`

צילומים: `orech-desktop.png` · `orech-mobile.png` · `orech-dark.png`

### `/mthbram` — Mthbram (מערכת 21)

כותרת: **איגוד השיעורים - שיעורי תורה, חברותות והרצאות** · h1: "404" · טקסט מרונדר: 41 תווים · 1 אלמנטים אינטראקטיביים · טעינה 5297ms

- 2 יעדי מגע מתחת ל-24px: a 92×18 "Return to Home"
- 1 שגיאות קונסולה: 404 Error: User attempted to access non-existent route: /mthbram
- אין מצב כהה — הרקע נשאר `rgb(9, 26, 32)` גם ב-`prefers-color-scheme: dark`

צילומים: `mthbram-desktop.png` · `mthbram-mobile.png` · `mthbram-dark.png`

### `/zchuyot` — מימוש זכויות (מערכת 22)

כותרת: **בקלות — מיצוי זכויות, מענקים והטבות | הזכות שלך, האחריות שלנו** · h1: "בקלות" · טקסט מרונדר: 2502 תווים · 31 אלמנטים אינטראקטיביים · טעינה 5281ms

- 3 פקדים בלי שם נגיש: button .fixed bottom-6 left-6 z-50 w-16 h-16 rou · button .md:hidden text-primary-foreground
- אין מצב כהה — הרקע נשאר `rgb(249, 251, 249)` גם ב-`prefers-color-scheme: dark`

צילומים: `zchuyot-desktop.png` · `zchuyot-mobile.png` · `zchuyot-dark.png`

### `/galil` — גליל קונקט (מערכת 24)

כותרת: **מחוברים — בתי כנסת חצור הגלילית** · h1: "404" · טקסט מרונדר: 123 תווים · 11 אלמנטים אינטראקטיביים · טעינה 5246ms

- `viewport` חוסם זום: `width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes`
- 1 פקדים בלי שם נגיש: button .md:hidden w-9 h-9 rounded-xl flex items-
- 1 שגיאות קונסולה: 404 Error: User attempted to access non-existent route: /galil
- אין מצב כהה — הרקע נשאר `rgba(0, 0, 0, 0)` גם ב-`prefers-color-scheme: dark`

צילומים: `galil-desktop.png` · `galil-mobile.png` · `galil-dark.png`

### `/studio` — סטודיו מודעות (מערכת 26)

כותרת: **מודעות AI — יצירת מודעות מעוצבות לקהילה** · h1: "מודעות · מנוע העיצוב החרדי" · טקסט מרונדר: 902 תווים · 8 אלמנטים אינטראקטיביים · טעינה 4640ms

- `viewport` חוסם זום: `width=device-width, initial-scale=1.0, maximum-scale=1`
- גלישה אופקית במובייל: 507px בתוך 390px
- אין מצב כהה — הרקע נשאר `rgb(250, 248, 245)` גם ב-`prefers-color-scheme: dark`

צילומים: `studio-desktop.png` · `studio-mobile.png` · `studio-dark.png`

### `/mechiron` — השוואת מחירים (מערכת 27)

כותרת: **מאגר בקלות — כלי פנימי לצוות** · h1: "השוואת מחירים — חוסכים בקלות" · טקסט מרונדר: 305 תווים · 9 אלמנטים אינטראקטיביים · טעינה 5055ms

- 1 שגיאות קונסולה: Failed to load resource: the server responded with a status of 404 (Not Found)
- אין מצב כהה — הרקע נשאר `rgb(248, 246, 242)` גם ב-`prefers-color-scheme: dark`

צילומים: `mechiron-desktop.png` · `mechiron-mobile.png` · `mechiron-dark.png`

### `/kupot` — השוואת קופות חולים (מערכת 28)

כותרת: **השוואת קופות חולים | מבית בקלות** · h1: "השוואת קופות חולים" · טקסט מרונדר: 34655 תווים · 460 אלמנטים אינטראקטיביים · טעינה 4443ms

- `viewport` חוסם זום: `width=device-width, initial-scale=1.0, maximum-scale=1`

צילומים: `kupot-desktop.png` · `kupot-mobile.png` · `kupot-dark.png`

### `/crm` — CRM זכויות (מערכת 30)

כותרת: **זכויות פרו | ZchuyotPro** · h1: — · טקסט מרונדר: 0 תווים · 0 אלמנטים אינטראקטיביים · טעינה 5344ms

- 0 תגי `h1` (צריך בדיוק אחד)
- 1 שגיאות קונסולה: Failed to load resource: the server responded with a status of 404 (Not Found)
- אין מצב כהה — הרקע נשאר `rgba(0, 0, 0, 0)` גם ב-`prefers-color-scheme: dark`

צילומים: `crm-desktop.png` · `crm-mobile.png` · `crm-dark.png`

### `/gesher` — גשר עברית CRM (מערכת 31)

כותרת: **מערכת CRM שותפים** · h1: — · טקסט מרונדר: 0 תווים · 0 אלמנטים אינטראקטיביים · טעינה 5058ms

- 0 תגי `h1` (צריך בדיוק אחד)
- 1 שגיאות קונסולה: Failed to load resource: the server responded with a status of 404 (Not Found)
- אין מצב כהה — הרקע נשאר `rgba(0, 0, 0, 0)` גם ב-`prefers-color-scheme: dark`

צילומים: `gesher-desktop.png` · `gesher-mobile.png` · `gesher-dark.png`

### `/nadlan` — נדל"ן ברגע (מערכת 32)

כותרת: **נדל"ן ברגע — תעודת זהות דיגיטלית לכל נכס** · h1: "כל מה שצריך לדעת על נכס — ברגע" · טקסט מרונדר: 6441 תווים · 42 אלמנטים אינטראקטיביים · טעינה 4870ms

- אין מצב כהה — הרקע נשאר `rgb(246, 248, 252)` גם ב-`prefers-color-scheme: dark`

צילומים: `nadlan-desktop.png` · `nadlan-mobile.png` · `nadlan-dark.png`

