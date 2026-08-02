# QA — מערכת 35 · KioskFleet (`more30.com/kiosk`)

> כל ההרצות בוצעו **דרך `more30.com`** ולא דרך `*.up.railway.app` — אותו מסלול
> שהמשתמשים עוברים בו. הכתובת של Railway חסומה ברשת המקומית (HTTP 418
> מנטפרי), וזו בדיוק הסיבה שהמערכת מנותבת מהדומיין הראשי.
>
> תאריך: 02/08/2026 · דיפלוי Railway: `7096c80`

---

## 1. ניתוב וסטטי — 7/7 עוברות

| בקשה | סטטוס | אורך | מה אומת |
|---|---|---|---|
| `GET /kiosk/api/health` | 200 | 65 | `{"ok":true,…,"basePath":"/kiosk"}` — השרת יודע שהוא תחת קידומת |
| `GET /kiosk/` | 200 | 7,849 | דף הנחיתה |
| `GET /kiosk/console` | 200 | 2,931 | טוען `js/app.js` (יחסי) |
| `GET /kiosk/css/style.css` | 200 | 10,383 | הגיליון נפתר תחת הקידומת |
| `GET /kiosk/js/app.js` | 200 | 28,871 | מכיל `BASE` |
| `GET /kiosk/robots.txt` | 200 | 23 | `Allow` — כי `KIOSK_ENV=production` |
| `GET /kesef` | 200 | 3,356 | עמוד "בקרוב" של הפורטל |

## 2. זרימה מלאה מקצה-לקצה — 5/5 עוברות

```
POST /kiosk/api/auth/login        200   JWT באורך 184
GET  /kiosk/api/auth/me           200   admin · role=admin · deviceLimit=9999
GET  /kiosk/api/devices?all=1     200   devices=0
GET  /kiosk/api/admin/stats       200   users=0 devices=0 online=0 offline=0
POST /kiosk/api/enrollments       200   קוד רישום נוצר: 23KYPV
```

כלומר: אימות JWT, הרשאת מנהל-על, שליפת מכשירים, סטטיסטיקות ויצירת קוד רישום —
**כולם עובדים דרך הפרוקסי**, לא רק דף סטטי.

## 3. בדיקות היחידה של השרת — 4/4 עוברות

`npm test` (node:test) בתוך `kiosk/server`:

```
✔ served under /kiosk
✔ served at the root (direct Railway URL, local dev)
✔ websocket upgrade paths resolve with and without the prefix
✔ BASE_PATH is normalised to a leading-slash, no-trailing-slash form
```

**מה שהבדיקה תפסה ואני לא:** הניסיון הראשון רשם `app.get(base, …)` להפניית
`/kiosk` → `/kiosk/`. תחת הניתוב הלא-קפדני של Express אותו מסלול תופס גם את
`/kiosk/` — כלומר צורת-התיקייה הפנתה לעצמה בלולאה. נמדד `301 → /kiosk/` על
`/kiosk/` עצמו. תוקן בהשוואת `req.path` מדויקת, והמקרה נעול בבדיקה.

## 4. 🔴 קביעות המסד — **נכשלה**

זו הבדיקה החשובה ביותר כאן, והיא לא עוברת.

| שלב | תוצאה |
|---|---|
| נוצר קוד רישום `WN6ZBB` | ✅ |
| `redeploy` מלא | ✅ הצליח |
| הקוד נבדק שוב, 12 ניסיונות על פני 4 דקות | ❌ `enrollments=0` |

הראיה הישירה, משורת הלוג שנוספה בדיוק בשביל זה:

```
db: /app/data/kioskfleet.db — NEW FILE (no data carried over — is a volume mounted at /app/data?)
✔ נוצר מנהל-על ראשוני:  admin
```

`DB_PATH` נפתר **נכון**; פשוט אין Volume מותקן שם, ולכן SQLite פותח קובץ חדש
ו-`ensureSeed` רץ מחדש. נמדד על שלושה דיפלויים נפרדים.

> ⚠️ שים לב שבלי שורת הלוג הזו הכשל **נראה כמו הצלחה**: השרת עולה, ה-healthcheck
> ירוק, וההתחברות עובדת (כי המנהל נוצר מחדש עם אותה סיסמה). זו הסיבה שהיא נוספה.

**החסם:** ה-Volume נוצר (`bfc104b5-…`, 1GB) אבל חיבורו לשירות לא הוחל. קריאה
סמכותית ל-service config מחזירה בלי `volumeMounts` כלל. ראה `INTEGRATION.md` §7.

## 4א. סבב שני — whitelist, מיצוב וזמן אמת

### רשימת הכתובות המותרות — 6/6 בדיקות יחידה + אימות מול ה-API החי

הקלט המלוכלך שנשלח בפועל ל-`POST /kiosk/api/links`:

```
https://pay.example.com/checkout?x=1, PAY.example.com , nonsense, secure.cardcom.co.il:443
```

| | תוצאה |
|---|---|
| **לפני התיקון** | נשמר כלשונו: `https://pay.example.com/checkout?x=1,pay.example.com,nonsense,secure.cardcom.co.il:443,venue.example.com` |
| **אחרי** | `pay.example.com,secure.cardcom.co.il,venue.example.com` ✅ |

> הבאג נתפס **מול ה-API החי ולא מהבדיקות**: הנרמול נוסף למסלול המכשיר, אבל
> ספריית הקישורים היא מסלול כתיבה נוסף. תוקן במשפך המשותף (`hostsForUrl`).

הבדיקות מנסחות את תכונת האבטחה כהתנהגות, לא כניסוח:
- מחרוזת מודבקת גולמית **לא** תואמת שום host — ועם רשימה ריקה זה אומר להתיר הכל.
- `notexample.com` **אינו** עובר רשימה שמכילה `example.com`.
- `example.com.evil.net` אינו עובר.
- תת-דומיין עמוק (`deep.pay.example.com`) כן עובר.

### WebSocket דרך הפרוקסי — נמדד ונדחה

handshake אמיתי מול `wss://more30.com/kiosk/ws/console`:

```
via more30.com path proxy    -> no upgrade — HTTP 404
bad token (control)          -> no upgrade — HTTP 404
```

שני המקרים 404 — כלומר הבקשה לא מגיעה לשרת בכלל, זה לא דחיית טוקן.
**מסקנה: rewrite של Vercel אינו מעביר upgrade.** לכן הסוקט הועבר ל-hostname
ייעודי, ו-`GET /kiosk/api/config` מחזיר בפרודקשן:
`{"wsHost":"kiosk.more30.com","basePath":"/kiosk"}` ✅

עד שה-DNS ייפתר הקונסולה ב-polling — נבדק שהמסלולים ש-polling משתמש בהם
מחזירים 200.

### בדיקות היחידה — 13/13 (היו 4)

```
✔ a pasted URL becomes the host it contains
✔ input that cannot be a host is rejected, not stored as junk
✔ the list de-duplicates and keeps order
✔ normalising actually changes whether a host is allowed
✔ subdomains are covered, lookalikes are not
✔ the device home URL is always part of its own allow-list
✔ every write path normalises, not just the device one
✔ served under /kiosk
✔ the service hostname lands on the app instead of 404
✔ the console is told where to open its socket
✔ served at the root (direct Railway URL, local dev)
✔ websocket upgrade paths resolve with and without the prefix
✔ BASE_PATH is normalised to a leading-slash, no-trailing-slash form
```

### האתר החי אחרי הכתיבה מחדש
`GET https://more30.com/kiosk/` → 200, 9,891 בייט, מכיל "מכשיר שפותח רק מה
שאישרתם". `js/app.js` מכיל `hostListEditor`, ו-`css/style.css` מכיל `.hl-row`.

---

## 4ב. סבב שלישי — איכות ותצוגה

> צילומי מסך: `QA/kiosk/landing-desktop.png` · `landing-mobile.png` ·
> `console-desktop.png` · `console-mobile.png`

### Lighthouse — פרופיל מובייל, מול פרודקשן

| סבב | perf | a11y | bp | seo |
|---|---|---|---|---|
| ראשון | 92 | 91 | 77 | 100 |
| אחרי תיקוני ניגודיות + landmark | 97 | 95 | 73 | 100 |
| **אחרי תיקון ה-CSP והאקסנט** | **95** | **100** | **77** | **100** |

### שלוש תקלות אמיתיות שנמצאו רק במדידה

**1. `--muted` נכשל ב-4.36:1 מול סף 4.5.** זה הצבע של כל תת-הכותרות וכל
פסקאות השלבים והיכולות — משתנה אחד שהוא רוב טקסט הגוף בעמוד. אותר עם
`scripts/qa/contrast-probe.mjs`, לא בניחוש.

**2. גרדיאנט אינו ניתן למדידה ע"י axe.** גם `.cta-band` וגם `.hero`
הוגדרו עם רקע גרדיאנט בלבד. axe אינו יכול לפתור גרדיאנט ולכן נופל לאב
הקדמון המוצק הקרוב — כלומר מדד טקסט לבן מול רקע העמוד הבהיר וקיבל
**1.07:1**. הצהרת `background-color` מוצק מתחת לגרדיאנט נותנת למדידה
משטח אמיתי, בלי שום שינוי ויזואלי.

**3. 🔴 תיקון הפונטים שלי היה שבור — ונתפס רק אחרי שהוספתי בדיקה.**
הוספתי `onload="this.media='all'"` כדי להוריד את גיליון הפונטים מנתיב
הציור. אבל השרת הזה שולח CSP עם `script-src-attr 'none'` (ברירת המחדל של
helmet), שחוסמת מטפלי אירוע inline — **הקוד מעולם לא רץ**, הגיליון נשאר
`media=print`, ו**העמוד הוגש בלי שום גופן רשת**, תוך רישום הפרת CSP
לקונסולה. נתפס ע"י `scripts/qa/console-probe.mjs` שנכתב בדיוק בשביל
`errors-in-console`. הועבר לבלוק `<script>`, שאותה מדיניות כן מתירה.

> זו דוגמה למה "התיקון נראה נכון" אינו מדידה: הציון עלה, הקונסולה שתקה —
> והפונטים פשוט לא נטענו.

**4. האקסנט נתן בדיוק 4.5:1.** לבן על `#2f6bff` יושב על הסף עצמו, ו-axe
מעגל כלפי מטה ומפיל. הוחשך ל-`#2a61e8` — **5.28:1 מחושב**, לא מוערך.

### כניסה אחידה
`scripts/qa/authbutton-overlap.mjs` → `kiosk  390: clear | 1440: clear`.
כדור הכניסה המשותף נטען בשני העמודים ואינו מסתיר פקד.

### קונסולה
`scripts/qa/console-probe.mjs` → *(no console errors, failed requests or 4xx/5xx)*.

---

## 5. מה לא נבדק ולמה

- **WebSocket חי מקצה-לקצה** — הצד שלי מוכן ונבדק (`/api/config` מחזיר את
  ה-host, ה-hub מקבל את שתי צורות הנתיב, יש בדיקות יחידה). מה שלא ניתן לבדוק
  עדיין הוא handshake מוצלח בפועל, כי `kiosk.more30.com` **טרם נפתר ב-DNS** —
  רשומה אחת שממתינה למשתמש (`NEEDS_USER.md` §3).
- **סוכן אנדרואיד אמיתי** — אין מכשיר בהישג יד. הצד השרתי של הרישום נבדק
  (קוד נוצר); צד המכשיר לא.
- **הרצה מקומית של השרת** — `better-sqlite3` דורש שרשרת בנייה נייטיבית שאין
  במכונה הזו (`node-gyp` נכשל). לכן בדיקות היחידה נכתבו כך שאינן מייבאות את
  `db.js`, וכל מה שניתן לייבא באמת (`wspath.js`, `config.js`) מיובא באמת.
