# INTEGRATION.md — שילוב kesef ו-kiosk לפלטפורמת more30

> נכתב לפי `INTEGRATION_MORE30.md`. מתעד **מה שולב, מה השתנה, ומה נשאר פתוח**.
> תאריך: 02/08/2026 · ענף: `feature/integrate-kesef-kiosk`

---

## תקציר בשורה אחת לכל מערכת

| מערכת | מצב אחרי הסבב | כתובת |
|---|---|---|
| **35 · kiosk** (KioskFleet) | ✅ **עובדת מקצה-לקצה תחת הדומיין הראשי** — ניתוב, קונסולה, API, סיסמת אדמין הוחלפה. 🔴 **חוץ מקביעות המסד**: ה-Volume נוצר אך לא ניתן לחבר אותו דרך ה-API — ראה §7 | `more30.com/kiosk` |
| **34 · kesef** | 🟠 **המסד חי, האפליקציה לא אותרה.** רשומה בפלטפורמה ומוצגת בדף הבית כ"בקרוב" | `more30.com/kesef` (עמוד "בקרוב") |

> 🔴 **הפריט האחד שלא הושלם:** ה-SQLite של kiosk **עדיין נמחק בכל דיפלוי**.
> ה-Volume `kioskfleet-data` (1GB) נוצר, אבל חיבורו לשירות לא נכנס לתוקף בשום
> מסלול שזמין לי. **פעולה אחת שלך בדשבורד סוגרת את זה** — §7.

---

## 1. איתור המקורות — מה נמצא ומה לא

הוראת המסמך הייתה לאתר את שני הריפואים לבד. `gh` אינו מותקן במכונה; `git`
כן (מגיע עם GitHub Desktop, ב-`%LOCALAPPDATA%\GitHubDesktop\app-3.6.3\...`)
והטוקן פעיל ב-Credential Manager.

**kiosk — נמצא.** לא בחיפוש בגיטהאב אלא **מהתצורה של Railway עצמה**: השירות
`kioskfleet` מצביע ל-`l023131500-ops/zol`, ענף `claude/what-do-you-see-gxo5tc`,
שורש `kiosk/server`. כלומר הקוד יושב בריפו של מערכת 07 (`zol`) ולא בריפו משלו.
אומת ב-`git ls-remote` + clone.

**kesef — לא נמצא.** נבדקו: כל חמשת הענפים של המונו-רפו (`packages/` מכיל
auth · billing · config · db · ui — אין `kesef-*`), שלושת הענפים של `zol`,
`git ls-remote` על תשעה שמות ריפו סבירים (`kesef`, `kesef-app`,
`kesef-platform`, `kesef-transparency`, `shkifut`, `budget-transparency`,
`kesef-il`, `more30-kesef`, `transparency`) — כולם 404, וחיפוש בכל
`C:\Users\USER` בעומק 4. **הקוד אינו על המכונה ואינו בשום ריפו נגיש.**

מה כן קיים ל-kesef: **הסכימה חיה במסד** (ראה §3).

---

## 2. kiosk — מה שולב בפועל

### הבעיה שהייתה צריכה פתרון
נטפרי חוסמת `*.up.railway.app` (נמדד: HTTP 418). כלומר הכתובת שבה המערכת חיה
אינה נגישה לקהל שלה. הפתרון בפלטפורמה הוא ניתוב-נתיב מהדומיין הראשי — אבל
השרת פלט **קישורים מוחלטים מהשורש** (`/css/style.css`, `/console`, `/api`,
`/ws/console`), וכל אחד מהם היה מצביע ל-more30.com במקום לאפליקציה.

### ההכרעה: השרת מחזיק את הקידומת, לא הפרוקסי
פרוקסי שמקלף את הקידומת היה משאיר את כל הקישורים שבורים. לכן `BASE_PATH` נכנס
לשרת עצמו, וכל שאר המערכות בפלטפורמה כבר עובדות ככה (`/nadlan`, `/torah`…).
ברירת המחדל ריקה — ולכן ה-URL הישיר של Railway ופיתוח מקומי לא השתנו.

### קבצים ששונו — בריפו `l023131500-ops/zol`, ענף `claude/what-do-you-see-gxo5tc`
קומיט `a8867d1`.

| קובץ | מה השתנה |
|---|---|
| `kiosk/server/src/config.js` | `basePath` (מנורמל) + `env` לשליטה על אינדוקס |
| `kiosk/server/src/index.js` | כל המסלולים, הסטטי, ה-docs ו-robots.txt עברו ל-router שמותקן תחת הקידומת. `/api/health` נשאר **גם** בשורש |
| `kiosk/server/src/hub.js` | ה-upgrade של ה-WebSocket מקבל את שתי הצורות |
| `kiosk/server/src/wspath.js` | **חדש** — לוגיקת הנתיב, מופרדת כדי שתהיה בת-בדיקה |
| `kiosk/server/public/index.html` | קישורים יחסיים + כפתור הכניסה המשותף |
| `kiosk/server/public/console.html` | אותו דבר |
| `kiosk/server/public/js/app.js` | `BASE` נגזר מ-`location.pathname`; נפילה ל-polling |
| `kiosk/server/test/routing.test.mjs` | **חדש** — 4 בדיקות |
| `kiosk/server/package.json` | `npm test` |
| `kiosk/server/.env.example` | `BASE_PATH`, `KIOSK_ENV` |

### באג שנתפס בבדיקה ולא בסקירה
הניסיון הראשון רשם `app.get(base, …)` להפניית `/kiosk` ל-`/kiosk/`. תחת
הניתוב הלא-קפדני של Express אותו מסלול תופס **גם** את `/kiosk/`, כלומר
הפניה אינסופית של צורת-התיקייה לעצמה. הבדיקה תפסה את זה מיד; התיקון משווה
`req.path` במדויק. הבדיקה נשארה בריפו בדיוק בשביל המקרה הזה.

### שני דברים שהקידומת לא פותרת — ומה נעשה איתם
1. **WebSocket אינו עובר ב-rewrite של Vercel.** קונסולה שמפסיקה להתעדכן בשקט
   גרועה מקונסולה איטית, ולכן סוקט שלא נפתח מפיל את הקונסולה ל-**polling כל
   15 שניות** במקום להתחבר מחדש כל 3 שניות למסלול מת. הקונסולה עובדת מלא;
   העדכון החי הוא מה שמתעכב. הפתרון האמיתי הוא `kioskfleet.more30.com` — ראה
   NEEDS_USER.
2. **סוכנים שנרשמו לפני השינוי** מחייגים `/ws/agent` על המקור. ה-hub מקבל את
   שתי הצורות; דחייה של הצורה החשופה הייתה מנתקת צי שלם בחיבור הבא.

### תשתית Railway
| מה | לפני | אחרי |
|---|---|---|
| Volume | **אין** — כל דיפלוי מחק את המסד | 🔴 `kioskfleet-data` (1GB) **נוצר אך לא מחובר** — §7 |
| `DB_PATH` | `./data/kioskfleet.db` (בקונטיינר בלבד) | `/app/data/kioskfleet.db` |
| `BASE_PATH` | — | `/kiosk` |
| `PUBLIC_URL` | ריק | `https://more30.com` |
| `KIOSK_ENV` | — | `production` |
| `SEED_ADMIN_PASSWORD` | ברירת מחדל | **הוחלף** |

> `PUBLIC_URL` הוא ה-origin בלבד ולא `…/kiosk` — הוא משמש כבסיס לפרסינג של
> `req.url` ובשורות הלוג, ונתיב בתוכו היה מכפיל את הקידומת.

### קבצים ששונו במונו-רפו
| קובץ | מה |
|---|---|
| `portal/vercel.dist.json` | שלושה rewrites ל-`/kiosk` |
| `packages/config/src/registry.ts` | רשומות 34 ו-35 + `TOPIC_ROUTES` |
| `apps/35-kioskfleet/app.json` | מניפסט חדש |
| `apps/34-kesef/app.json` | מניפסט חדש |
| `supabase/migrations/0007_register_kesef_and_kiosk.sql` | שתי שורות ב-`core.projects` |
| `.env.example` | שמות המשתנים של שתי המערכות |

---

## 3. kesef — מה קיים, ומה חסר

### מה שכבר חי במסד (לא נבנה בסבב הזה — נמצא קיים)
בפרויקט ההאב `uhnrgujbdxhhmoxcjria` קיימת סכימת **`kesef` עם 36 טבלאות**,
RLS מופעל על **כולן**, ושבע מיגרציות שהוחלו ב-02/08/2026:

```
kesef_0001_init · kesef_0002_public_read_rls · kesef_0003_move_to_kesef_schema
kesef_0004_alert_response_guard · kesef_0005_alert_visibility
kesef_0006_fix_muni_respond_policy · kesef_0007_official_contact_source
```

הטבלאות כוללות `authority`, `source_document`, `fact_financial`,
`metric_value`, `grant_call`, `tabar`, `tender`, `council_decision`,
`peer_group`, `alert`, `review_queue` ועוד. **הקווים האדומים מהמפרט אכיפים
במסד**: 11 עמודות `source_document_id` מוגדרות `NOT NULL`.

הנתונים: `data_source` מכיל 12 שורות; כל שאר הטבלאות **ריקות** (0 רשויות,
0 מסמכי מקור, 0 עובדות). כלומר הסכימה הותקנה אבל טעינת הפיילוט לא רצה.

> ⚠️ **הסכימה הזו אינה בריפו.** שבע המיגרציות הוחלו ישירות למסד ואין להן קובץ
> ב-`supabase/migrations/`. זו התפצלות אמיתית בין הריפו למסד, והיא מתועדת כאן
> ולא נסגרה — לשחזר DDL של 36 טבלאות מהמסד וליצור ממנו "מיגרציה" היה מייצר
> קובץ שלא באמת רץ מעולם.

### מה נעשה בסבב הזה
- kesef נרשמה כמערכת **34** במרשם (`registry.ts`, `core.projects`, מניפסט).
- הנתיב `/kesef` שמור ב-`TOPIC_ROUTES`.
- דף הבית מציג אותה עם התיאור המלא ותגית **"בקרוב"** — כי `is_deployed=false`.
  זו התנהגות נכונה ולא פשרה: כפתור כניסה לעמוד שאינו קיים גרוע מהודעת שלב.

### מה חסר כדי לסיים
ראה `NEEDS_USER.md` §א ו-§ב.

---

## 4. מה אומת בפועל

### kiosk — מקצה לקצה דרך `more30.com` (לא דרך railway.app)
```
GET  /kiosk/api/health      200   {"ok":true,…,"basePath":"/kiosk"}
GET  /kiosk/                200   דף הנחיתה, קישורים יחסיים
GET  /kiosk/console         200   טוען js/app.js
GET  /kiosk/css/style.css   200
GET  /kiosk/js/app.js       200
GET  /kiosk/robots.txt      200   Allow (production)
POST /kiosk/api/auth/login  200   JWT, 184 תווים
GET  /kiosk/api/auth/me     200   admin · role=admin
GET  /kiosk/api/devices     200
GET  /kiosk/api/admin/stats 200
POST /kiosk/api/enrollments 200   קוד רישום נוצר
```

### קביעות המסד — הבדיקה שהוכיחה שה-Volume **לא** עובד
נוצר קוד רישום (`WN6ZBB`), בוצע redeploy מלא, והקוד נבדק שוב — **נעלם**.
הבדיקה חזרה שלוש פעמים עם אותה תוצאה. לכן נוספה שורת לוג שאומרת את זה
במפורש בכל עלייה (קומיט `7096c80`), והיא מדווחת:

```
db: /app/data/kioskfleet.db — NEW FILE (no data carried over — is a volume mounted at /app/data?)
```

כלומר `DB_PATH` נפתר נכון, אבל אין Volume מותקן שם. **זו הראיה, לא הערכה.**
ה-Volume קיים (`bfc104b5-…`, 1GB, `mountedOn: kioskfleet`) — אבל קריאה
סמכותית ל-service config מחזירה **בלי `volumeMounts` בכלל**, כלומר החיבור
נשאר staged ולא הוחל. ראה §7.

### הבדיקות
- **kiosk:** `npm test` — 4 עוברות (חוזה ההתקנה תחת קידומת, בשורש, נתיבי
  WebSocket, נרמול `BASE_PATH`).
- **המונו-רפו:** ראה §6.

### המסד — ספירת טבלאות לפני ואחרי
נספרו כל הסכימות לפני המיגרציה ואחריה. **כל 23 הסכימות זהות במספר הטבלאות**
(`igud` 118, `csj` 67, `kesef` 36, `public` 30, `core` 11, `nadlan` 13 …).
המיגרציה היא DML בלבד — שתי שורות ב-`core.projects` — ולא יוצרת שום יחס.

---

## 5. מה לא נגעתי בו

- `bkalut-app` (08), `bkalot-admin` (09), סכימות `zr_*`, webhook `NEDARIM3873`.
- שום סכימה של אפליקציה קיימת. `kesef` היא סכימה נפרדת; kiosk אינו במסד כלל.
- שום חבילה משותפת לא שינתה חתימה. `packages/config` **קיבל שתי רשומות** ולא
  שינוי בקוד קיים.
- `portal/public/auth-button.js` — לא נגעתי (יש בקשה פתוחה עליו ב-NEEDS_USER
  שקדמה לסבב הזה). kiosk **טוען** אותו, לא משנה אותו.
- `portal/src/App.tsx` — לא נגעתי. שתי המערכות מופיעות בדף הבית כי הרשימה
  נקראת מהמסד, לא מקוד.

---

## 6. תוצאות ההרצות — ראה `QA/kiosk.md`

---

## 7. מה נשאר פתוח

### 🔴 1. חיבור ה-Volume ל-kiosk — פעולה אחת בדשבורד, ובלעדיה המסד נמחק בכל דיפלוי
זה **הפריט היחיד מהמפרט שלא הצלחתי לסגור**, והוא לא "כמעט": כרגע כל דיפלוי
של kiosk מוחק את כל המכשירים, הלקוחות וקודי הרישום.

**מה נעשה:** ה-Volume `kioskfleet-data` בגודל 1GB **נוצר**, ובתצוגה אחת של
ה-API הוא נראה מחובר ל-`/app/data`. **מה שלא עבד:** קריאה סמכותית ל-service
config מחזירה בלי `volumeMounts`, והקונטיינר מדווח קובץ חדש בכל עלייה. שלושה
מסלולים נוסו ונכשלו: הכלי שמייצר את ה-Volume (נשאר staged), commit של
ה-staged changes (רץ, אבל ה-mount לא נכלל בו), ו-`update-service` (אינו
תומך ב-volume mounts כלל). ה-CLI של Railway מותקן אך **אינו מחובר**
(`Unauthorized`), וההתחברות אליו אינטראקטיבית.

**מה שצריך ממך — דקה בדשבורד:**
Railway → project `kioskfleet` → service `kioskfleet` → environment
`production` → Settings → Volumes → לחבר את `kioskfleet-data` ל-`/app/data`
→ Deploy.

**איך תדע שזה עבד, בלי לנחש:** בלוג העלייה הבא תופיע השורה
`db: /app/data/kioskfleet.db — existing file (data persisted)` במקום
`NEW FILE`. אם היא עדיין אומרת `NEW FILE` — החיבור לא נכנס.

*לחלופין:* `railway login` בטרמינל שלך, ואז אחבר את זה בעצמי.

### 🟠 2. kesef — קוד המקור
ראה §1. בלי הריפו אין מה לפרוס, ולכן `more30.com/kesef` מציג "בקרוב".
**מה שצריך ממך:** לאן נדחף הקוד? (שם ריפו/ארגון/ענף, או ZIP).
משם: `apps/34-kesef` + `KESEF_*` env + פרויקט Vercel + `is_deployed=true`.

### 🟠 3. `kesef` אינה ב-Exposed schemas
נמדד: `GET /rest/v1/data_source` עם `Accept-Profile: kesef` מחזיר **406**.
כלומר גם כשהאפליקציה תגיע, היא לא תוכל לקרוא מהסכימה עם ה-anon key.
**מה שצריך ממך:** Supabase → `uhnrgujbdxhhmoxcjria` → Settings → API →
Exposed schemas → להוסיף `kesef`. (המפרט אוסר לעקוף — ולכן לא עקפתי.)

### 🟡 4. WebSocket ל-kiosk — עדכון חי בקונסולה
rewrite של Vercel אינו מעביר upgrade ל-WebSocket, ולכן הקונסולה עובדת
ב-polling כל 15 שניות. הפתרון: `kioskfleet.more30.com` **כבר רשום ב-Railway
כדומיין מותאם**, אבל ה-DNS לא נפתר (נמדד: `could not be resolved`).
**מה שצריך ממך:** Cloudflare → DNS של more30.com → CNAME
`kioskfleet` → היעד ש-Railway נותן. **אל תיגע ברשומת ה-root.**

### 🟡 5. שלוש טבלאות ב-kesef עם RLS מופעל ובלי שום policy
`agent_log`, `moi_code_map`, `report_cache` — RLS דלוק, אפס policies, כלומר
סגורות לחלוטין לכל תפקיד מלבד `service_role`. יכול להיות מכוון (טבלאות
שרת בלבד) ויכול להיות פער. **לא נגעתי** — זו סכימה שלא אני כתבתי.

### 🟡 6. שבע מיגרציות kesef אינן בריפו
ראה §3. הריפו והמסד מפוצלים בנקודה הזו.

### 🟡 7. הסיסמה הראשונית של kiosk עברה בערוץ הזה
`admin` / הסיסמה שנוצרה. היא מוצגת גם בלוג של Railway. **כדאי להחליף אותה**
במסך "הגדרות" בקונסולה אחרי הכניסה הראשונה.
