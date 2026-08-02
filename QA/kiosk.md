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

## 5. מה לא נבדק ולמה

- **WebSocket חי** — `rewrite` של Vercel אינו מעביר upgrade, ולכן לא ניתן לבדוק
  אותו דרך `more30.com/kiosk`. הקונסולה נופלת ל-polling כל 15 שניות (מתוכנן,
  ראה הקוד). בדיקה אמיתית תתאפשר כשיהיה `kioskfleet.more30.com`.
- **סוכן אנדרואיד אמיתי** — אין מכשיר בהישג יד. הצד השרתי של הרישום נבדק
  (קוד נוצר); צד המכשיר לא.
- **הרצה מקומית של השרת** — `better-sqlite3` דורש שרשרת בנייה נייטיבית שאין
  במכונה הזו (`node-gyp` נכשל). לכן בדיקות היחידה נכתבו כך שאינן מייבאות את
  `db.js`, וכל מה שניתן לייבא באמת (`wspath.js`, `config.js`) מיובא באמת.
