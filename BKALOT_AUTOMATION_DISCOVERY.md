# BKALOT_AUTOMATION_DISCOVERY.md — מיפוי אוטומציית בקלות

> **חקירה בלבד. לא נבנה ולא שוכפל דבר, ולא נגעתי במוגן**
> (`bkalut-app`, `bkalot-admin`, `zr_*`, `NEDARIM3873`).
>
> נכתב 03/08/2026. כל מספר כאן נשלף בפועל מהמסד או מהקוד; מה שלא אומת
> מסומן במפורש **"לא ודאי — דורש אימות"**.

---

## 0. תקציר — מה שהחקירה שינתה בהבנה

שלושה דברים שלא היו ברורים לפני, ומשנים את התכנון:

1. **מנוע הצינתוק כבר קיים, עובד, ואינו בבקלות.** הוא יושב ב-
   `apps/27-bkalut-price/server/yemot.ts` — שלושה שלבים מלאים מול ימות
   המשיח, כולל הקראה ב-ElevenLabs עם קאש. זה **לא** צריך להיבנות מחדש.
2. **מאגר הזכויות כבר מרוכז בהאב** — `rights.catalog`, **888 שורות**.
   האתר של בקלות כבר יודע לטעון ממנו חי; פשוט **הגרסה הזו עדיין לא נפרסה**.
3. **סליקת נדרים קיימת פעמיים, בשתי מימושים נפרדים** (torah ו-igud-ads),
   ואף אחד מהם אינו של בקלות. ה-callback של בקלות עצמו — **לא אותר בקוד**.

---

## 1. מפת המערכות

| # | מערכת | תיקייה | פרויקט Supabase | מצב |
|---|---|---|---|---|
| 10 | מימוש זכויות בקלות | `apps/10-bkalot-rights` | `bieebmnm…` (ראה §4) | חי · `/bkalot` |
| 27 | השוואת מחירים בקלות | `apps/27-bkalut-price` | `csjekrvu…` | חי · `/mechiron` |
| 22 | מימוש זכויות (Get Your Rights) | `apps/22-get-your-rights` | `trerolyv…` | חי · `/zchuyot` |
| 06 | לידים קופות חולים | `apps/06-kupot-holim` | `csjekrvu…` | חי · `/briut` |
| 28 | השוואת קופות חולים | `apps/28-kupot-health-funds` | האב | חי · `/kupot` |
| 29 | bkalot-design | `apps/29-bkalot-design` | — | סקריפט העלאה בלבד |
| 🔒 | **bkalut-app · bkalot-admin** | `/var/www/bkalut-app` (PM2/Nginx) | — | **מוגן — לא נגעתי** |

**מה שחשוב להבין על 27:** `apps/27-bkalut-price` הוא **המקור של
`bkalut-app` המוגן**. אותו קוד מוגש בשני מקומות — שרת ה-PM2 המוגן, ופריסת
Vercel נפרדת ב-`mechiron-more30`. כל מה שמתואר כאן לגבי 27 נקרא מהקוד;
**לא נגעתי בשרת המוגן.**

---

## 2. ימות המשיח — קיים ועובד. זה הנכס הגדול ביותר שנמצא

**איפה:** `apps/27-bkalut-price/server/yemot.ts` (7,997 בתים).
**מי מפעיל:** `server/routes.ts:1015` — כשהודעה יוצאת בערוץ `voice`
ו-`YEMOT_API_KEY` מוגדר, היא עוקפת את בדיקת ה-connector ויוצאת ישירות.

**ה-API:** `https://www.call2all.co.il/ym/api`, אימות
`Authorization: Basic <YEMOT_API_KEY>`.

**הזרימה, שלושה שלבים — כולם ממומשים:**

| שלב | מה קורה | קריאה |
|---|---|---|
| 1 · רשימה לבנה | קורא את `/333/WhiteList.ini`, מוסיף את המספר אם אינו שם | `GetTextFile` → `UploadTextFile` |
| 2 · שלוחה 3 | מייצר הקראה ב-ElevenLabs, מעלה כ-`<חודש>.wav` לנתיב `ivr2:3/2/2/Phone/0<מספר>` | `UploadFile` (`convertAudio=1`) |
| 3 · צינתוק | שיחה יוצאת קצרה עם `ttsVoice=Elik_2100` | `SendTTS` |

**ElevenLabs:** `voice_id 9mC4rMlfrKiadcMhOgey`, מודל `eleven_v3`.
**יש קאש** — ה-mp3 נשמר ב-Supabase Storage בבאקט `yemot-audio` לפי
`sha256` של הטקסט, כך שאותו טקסט אינו מחויב פעמיים.

**המפתחות:** `YEMOT_API_KEY` ו-`ELEVENLABS_API_KEY`. **אומת: שניהם
מוגדרים בפרויקט Vercel `mechiron-more30`** (`vercel env ls production`).
הפונקציה מדלגת בחן — בלי מפתח היא מחזירה `SKIPPED` ולא נופלת.

> ⚠️ **הערה על לוגים:** `sendTTS` מדפיס ל-console את אורך המפתח ואת שש
> התווים הראשונים שלו. זה לא דולף את המפתח, אבל זה יותר ממה שצריך.

---

## 3. נדרים פלוס — שני מימושים, ואף אחד מהם אינו של בקלות

### 3.1 igud-ads (03) — המימוש המלא ביותר שנמצא

| | |
|---|---|
| בניית תשלום | `apps/03-igud-ads/app/api/payments/create/route.ts` |
| Callback | `apps/03-igud-ads/app/api/payments/webhook/route.ts` |
| קונפיג | `apps/03-igud-ads/lib/nedarim.ts` |
| iframe | `https://matara.pro/nedarimplus/iframe?language=he` |
| זיהוי הלקוח | **`Param1` = `project_id`**, נקבע ב-create וחוזר ב-callback |
| הגנה | IP מותר יחיד: `18.194.219.73` |

**מה ה-callback עושה, לפי הסדר:** ממזג `_payment` לתוך
`ad_projects.parameters` (מיזוג ולא דריסה) → שורה ב-`ad_payments` →
בהצלחה מנפיק קופון `PAID-XXXXXXXX` ב-`ad_coupons` לפי
`ad_app_settings['payment.coupon_grants_designs']` → התראה ב-
`ad_notifications` → **שולח מייל** דרך `/api/notifications/send-email` →
`audit('payment_received')`.

> 🚨 **ממצא אבטחה שטופל היום:** `lib/nedarim.ts` החזיק את ה-ApiValid
> וה-ApiPassword כערכי ברירת מחדל אחרי `||`, והם **פורסמו לריפו הציבורי**.
> הוסרו והועברו למשתני סביבה. **דורש סיבוב מול נדרים פלוס** — `NEEDS_USER` §0.

### 3.2 torah (01) — Edge Functions
`supabase/functions/nedarim-create-payment` · `nedarim-webhook` ·
`nedarim-admin`. אותו מוסד. ה-admin מקפיד לרשום `_api_password: "[REDACTED]"`
ביומן הביקורת — דפוס נכון ששווה להעתיק.

### 3.3 mthbram (21) — `supabase/functions/nedarim-webhook`

### 3.4 ❗ ה-callback של בקלות עצמה — **לא אותר**
חיפוש על כל `apps/`, `packages/`, `portal/`, `supabase/`, `db/` מצא
`nedarim`/`matara.pro` **רק** ב-01, 03, 21 ובאתרים שיווקיים סטטיים
(05, 11, 19). **לא ודאי — דורש אימות ממך:** ה-callback של בקלות ככל
הנראה חי ב-n8n (`NEDARIM3873` המוגן) או בשרת `bkalut-app`, ובשני המקרים
הוא **מחוץ לריפו הזה**.

---

## 4. מקורות התוכן שנשלח ללקוח

### (א) זכויות לפי מצב אישי — **מרוכז בהאב, וזו הבשורה**

| מקום | שורות (נמדד) |
|---|---|
| `rights.catalog` (האב) | **888** |
| `public.rights_public` (view ציבורי) | 67 |
| `public.rights_meta_public` · `public.rights_situation_map` | תצוגות נלוות |
| `getrights.rights_reference` (של 22) | 104 |

**האתר כבר יודע לקרוא מזה חי:** `apps/10-bkalot-rights/repo.js` טוען את
הקטלוג מה-PostgREST של האב עם עימוד, ובכשל **נופל בחזרה ל-`data.json`**
(2.8MB) — כלומר שכבת שיפור בלי שינוי התנהגות.

> 🔴 **אבל זה לא חי.** `more30.com/bkalot/repo.js` בפרודקשן הוא 3,599 בתים —
> גרסה ישנה **בלי** מנגנון הטעינה מההאב. העותק המוכן לפריסה (4,079 בתים)
> הוא המקור עם `REPLACED_AT_BUILD` שהוחלף במפתח anon. **הפריסה של bkalot
> כבר בתור** (המכסה נגמרה), והיא זו שתפעיל את זה.

### (ב) השוואת מחירים בסופרים — קיימת, ומחוץ להאב
`apps/27-bkalut-price` מול `csjekrvu`. שכבת קריאה חסרת-שרת:
`_deploy/mechiron-more30/api/_lib/pc-supabase-read.ts` — קריאות SELECT
בלבד, עם עימוד (PostgREST חוסם ב-1000 שורות) ובאצ'ים על `product_id`
כדי לא למשוך ~1.23M מחירים.
טבלאות: `pc_prices`, `pc_price_history`, `pc_price_submissions`,
`pc_promotions`. **בהאב הן ריקות (0 שורות)** — הן מראות של `csjekrvu`.

### (ג) השוואת קופות חולים — שתי מערכות
`apps/28-kupot-health-funds` (בהאב, חי ב-`/kupot`) ו-
`apps/06-kupot-holim` (`csjekrvu`, חי ב-`/briut`).
לידים: `csj_kupot.hf_switch_leads`, `public.hf_switch_leads` — **0 שורות**.

---

## 5. שליחת מייל

| מקום | ספק |
|---|---|
| `apps/03-igud-ads/app/api/notifications/send-email/route.ts` | נקרא מה-callback של נדרים |
| `apps/32-nadlan-berega/lib/email.ts` | Resend |
| Edge Function `np-send-signature` (36) | Resend, המפתח נשלף בצד השרת בלבד |

`RESEND_API_KEY` קיים ב-`core.secrets` (אומת בסבב קודם).
**לא נמצאה תבנית מייל מעוצבת משותפת** — כל מערכת בונה HTML משלה.

---

## 6. מה מחובר מול מה שחסר

| | מצב |
|---|---|
| **ימות — צינתוק + שלוחה + רשימה לבנה** | ✅ ממומש מלא, עם קאש. מפתחות מוגדרים |
| **הקראה (ElevenLabs)** | ✅ ממומש, עם קאש ב-Storage |
| **סליקת נדרים + callback + קופון + התראה + מייל** | ✅ ממומש ב-03 מקצה לקצה |
| **מאגר זכויות מרוכז** | ✅ 888 שורות בהאב |
| **טעינה חיה של הקטלוג באתר בקלות** | ⏳ כתוב ומוכן, **לא נפרס** |
| **השוואת מחירים** | ✅ קיימת · ⚠️ מחוץ להאב |
| **השוואת קופות** | ✅ קיימת · ⚠️ מפוצלת בין שתי מערכות |
| **טופס → זיהוי מצב אישי → בחירת זכויות → שליחה** | ❌ **החוליה החסרה** |
| **ה-callback של בקלות עצמה** | ❓ לא אותר בריפו — כנראה n8n/`bkalut-app` |
| **תבנית מייל מעוצבת משותפת** | ❌ אין |
| **CRM / שיתופי פעולה** | 🟡 חלקי — `getrights.leads` (8 שורות), `apps/30` ו-`apps/31` הם CRM-ים אמיתיים אבל של תחומים אחרים |

---

## 7. הצעת ארכיטקטורה — בלי לגעת במוגן

**העיקרון:** מערכת חדשה שהיא **צרכן** של מה שכבר עובד, ולא שכפול שלו.

```
לקוח (טופס / נדרים / שיחה)
        │
        ▼
  [מערכת חדשה בהאב]  schema: bkalot_auto
   · customers · requests · deliveries · consents
        │
        ├─► זכויות:   rights.catalog (האב) — קריאה ישירה
        ├─► מחירים:   pc-supabase-read (csjekrvu) — קריאה בלבד
        ├─► קופות:    hf (28, בהאב)
        │
        ├─► מייל:     Edge Function + Resend (המפתח בצד השרת בלבד)
        └─► קול:      sendYemotVoice() — **מחולץ לחבילה משותפת**
```

**שלוש הכרעות שההצעה נשענת עליהן:**

1. **`sendYemotVoice` צריך לעבור ל-`packages/`** ולא להישכפל. היום הוא
   בתוך 27, שהוא המקור של המערכת המוגנת — כלומר כל שינוי בו נוגע בקוד
   של המוגן. חילוץ לחבילה משותפת מנתק את התלות הזו בלי לגעת בשרת.
2. **ה-callback החדש חייב כתובת נפרדת משלו.** אסור לשנות את
   `NEDARIM3873` הקיים. מוסד אחד יכול להחזיק כמה כתובות callback —
   **לא ודאי, דורש אימות מול נדרים פלוס.**
3. **הסכימה בהאב ולא ב-`csjekrvu`.** ל-`csjekrvu` אין לנו גישת דשבורד
   (`NEEDS_USER` §2), ויש בו פרצת RLS פתוחה. בהאב יש גישה מלאה.

---

## 8. מה דורש אותך

| # | מה | למה |
|---|---|---|
| 1 | **לסובב את אישורי נדרים** (`NEEDS_USER` §0) | פורסמו לריפו ציבורי |
| 2 | **איפה ה-callback של בקלות באמת יושב** | לא אותר בריפו. בלי זה אי אפשר לדעת מה כבר מגיע ולאן |
| 3 | **אישור לפתוח כתובת callback נוספת** מול נדרים פלוס | הקיימת מוגנת ואסור לגעת בה |
| 4 | **גישה ל-`csjekrvu`** | מקור המחירים והקופות; גם פרצת ה-RLS שם עדיין פתוחה |
| 5 | **קובץ האפיון** | לפי הוראתך — לא בונה בלי זה |

## 9. מה שנשאר לא ודאי
- ה-callback הקיים של בקלות — לא אותר. **לא ניחשתי.**
- האם מוסד נדרים תומך בכמה כתובות callback במקביל.
- מבנה השלוחות המלא בימות מעבר לשלוחה 3 — הקוד מגלה רק את מה שהוא כותב אליו.
- `apps/29-bkalot-design` — סקריפט העלאת נכסי עיצוב בלבד; לא מצאתי בו זרימת לקוח.
