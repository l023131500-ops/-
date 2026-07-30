# NEEDS_USER.md — כל מה שדורש אותך, במכה אחת

> נוצר לפי חוק 4 ב-MASTER_PLAN. **עודכן: 30/07/2026** (סבב שלבים 4–7).
> לכל פריט: מה בדיוק חסר · מאיפה משיגים · לאן זה נכנס.
> מסודר לפי מה שמשחרר הכי הרבה עבודה.

---

## 🔴 1. הכרעה אחת שחוסמת שלושה שלבים — איפה יושבת זהות המשתמשים

**זה הפריט היחיד שחוסם את שלב 4 (התחברות/היסטוריה/מנוי), את שלב 5 (18) ואת
כל תשתית המנויים.** הוא לא דורש מפתח — הוא דורש החלטה.

| מערכת | המסד שלה היום | הבעיה |
|---|---|---|
| 17 chizukim | `csjekrvu` | אין לי `service_role` → אי אפשר ליצור שם טבלאות |
| 02 tamlul + 18 orech | `bieebmnm` | **אותו פרויקט של igud-ads עם הסליקה החיה** |

**שלוש דרכים, בחר אחת:**

- **א. גישה ל-`csjekrvu`** → הכול נבנה במקום אחד.
  *מה צריך:* `service_role key` מ-Supabase Dashboard → Project `csjekrvu` →
  Settings → API → `service_role`.
  *לאן:* Vercel project **`chizukim2-more30`** → Environment Variables →
  `SUPABASE_SERVICE_ROLE_KEY` (Production), וגם
  `apps/17-chizukim-transcribe/.env.local` לפיתוח מקומי.

- **ב. אישור להריץ את הסכמה על `bieebmnm`** (עבור 18).
  *מה צריך:* רק **"כן"** ממך — המפתח כבר קיים מקומית.
  ⚠️ `apps/18-torah-editor-mvp/supabase/schema.sql` מתקין **טריגר על
  `auth.users`** שירוץ על **כל הרשמה בפרויקט, כולל של igud-ads**. לכן לא הרצתי.

- **ג. הזהות בהאב** `uhnrgujbdxhhmoxcjria` (סכמות `public.chizukim_*` /
  `public.editor_*`). *מה צריך:* רק "כן" — יש לי גישה מלאה. החיסרון: הזהות
  מתפצלת משני מסדים.

---

## 🔴 2. פרצת אבטחה פתוחה — ה-anon key מוחק את ארכיון התמלולים

**נמדד חי, לא הערכה.** בפרויקט `csjekrvu`, טבלת `recordings`
(**1,138 הקלטות ותמלולים**) פתוחה לכתיבה עם ה-**anon key** — המפתח שמוטמע
בבאנדל הציבורי וגלוי לכל מי שפותח את הדפדפן:

| פעולה עם anon | תוצאה שנמדדה |
|---|---|
| `POST /rest/v1/recordings` | **201 Created** |
| `DELETE /rest/v1/recordings?id=eq.…` | **200** — נמחק |

*(הרשומה שיצרתי בבדיקה נמחקה מיד; הספירה חזרה ל-1,138 בדיוק.)*

**מה לעשות — 5 דקות בדשבורד של `csjekrvu`:** להפעיל RLS על `recordings`,
להשאיר policy של `SELECT` ל-anon, ולהעביר `INSERT/UPDATE/DELETE` ל-`service_role`.
כדאי להריץ את אותה בדיקה על שאר הטבלאות שם (מערכות 06, 12, 27).
**לא ניתן לתקן מכאן** — אין לי גישה לדשבורד של הפרויקט הזה.

---

## 🟠 3. מפתחות חסרים — מה, מאיפה, ולאן

| # | מערכת | המפתח | מאיפה משיגים | לאן נכנס |
|---|---|---|---|---|
| 1 | **17** chizukim | `RUNPOD_API_KEY` | runpod.io → Settings → API Keys | Vercel `chizukim2-more30` → env `RUNPOD_API_KEY` |
| 2 | **17** chizukim | `SUPABASE_SERVICE_ROLE_KEY` | Supabase `csjekrvu` → Settings → API | Vercel `chizukim2-more30` + `apps/17-.../.env.local` |
| 3 | **28** kupot | `ADMIN_TOKEN` | להמציא מחרוזת אקראית ארוכה | Vercel `kupot-more30` → env `ADMIN_TOKEN` |
| 4 | **27** mechiron | `YEMOT_TOKEN` | ימות המשיח → אזור אישי → API | Vercel `mechiron-more30` |
| 5 | **27** mechiron | `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Key | Vercel `mechiron-more30` |
| 6 | **02** tamlul | Google OAuth `CLIENT_ID` + `CLIENT_SECRET` | console.cloud.google.com → APIs → Credentials → OAuth client | Vercel `tamlul-more30` |
| 7 | **18** orech | `TRANSKRIBUS_USER/PASS` או `KRAKEN_*` | readcoop.eu (Transkribus) / kraken — מודול ה-HTR | Vercel `orech-more30` + `apps/18-.../.env.local` |
| 8 | **32** nadlan | שדרוג תוכנית **Apify** | apify.com → Billing (המכסה מוצתה: **$5.28 מתוך $5**, מתאפסת **27/08/2026**) | אין שינוי קוד — `APIFY_TOKEN` כבר מוגדר |
| 9 | **הכול** | GitHub **Personal Access Token** | github.com → Settings → Developer settings → PAT (scope `repo`) | ה-shell — `git push` חסום, **9 קומיטים יושבים מקומית** |
| 10 | **16** chatzor *(רשות)* | `GOOGLE_MAPS_API_KEY` | console.cloud.google.com → Distance Matrix API | Vercel `chatzor-more30`. **לא חוסם** — בניתי מרחק אווירי מהדפדפן בלי מפתח; המפתח ישדרג למרחק/זמן **הליכה** |

---

## 🟡 4. שלושה נתיבים בלי כפתור הכניסה המשותף (20/23 קיימים)

| נתיב | למה בחוץ | מה צריך ממך |
|---|---|---|
| `/modaot` (03 igud-ads) | סליקה חיה | **אישור** לפרוס מחדש. השינוי הוא שורת `<script>` אחת ב-HTML ולא נוגע במסד |
| `/bkalot` (10) | משפחת המערכות המוגנות | **אישור** — אם זו מערכת הזכויות ולא `bkalut-app`/`bkalot-admin`, אוסיף בדקה |
| `/admin` (nihul) | 🚨 `_deploy/nihul-more30` **מיושנת** — מגישה `/nihul` בעוד הפרודקשן מגיש `/admin`. פריסה משם **החזירה 404 על מרכז השליטה** (הוחזר מיד ב-`vercel promote`) | **המקור האמיתי** של מה שחי היום ב-`nihul-more30`, או אישור לסנכרן את התיקייה מהפרודקשן |

---

## 🟡 5. שלב 8 (עיצוב) — דורש אותך מהגדרתו

`DESIGN_STANDARD.md` (יושב ב-`C:\Users\USER\Downloads\`, **לא בריפו**) מחייב:
זהות עיצובית **ייחודית לכל מערכת** + `BRAND.md` לכל אחת + `DESIGN_DNA.md`
משותף, ו**"כל טענת סיום מחייבת build עובר + צילום מסך + הצגה למשתמש"**.

**מה צריך ממך כדי להתחיל:**
1. **סדר עדיפויות** — על אילו מערכות לעבור קודם (33 זה לא סבב אחד).
2. **בריף מותג** לכל מערכת שנבחרת, או אישור שאנסח הצעה ואתה תאשר.
3. **החלטה איפה יושב התקן** — כדאי להעביר את `DESIGN_STANDARD.md` לריפו
   (`docs/`) כדי שיהיה בגרסאות ולא בתיקיית ההורדות.

**אותו דבר לשלבים 9 ו-10:** 9 (פרסום/מיתוג) דורש בחירת סגנון + אולי מפתחות
Ideogram/Flux; 10 (סליקה) דורש פרטי מוסד נדרים פלוס — **ואל תצפה שאבצע חיוב
אמיתי בלי אישור מפורש**.

---

## 🟢 6. פריטים קטנים

- **פרויקט Vercel יתום בשם `dist`** — נוצר כש-`vite build` מחק את
  `dist/.vercel/project.json` ופריסה משם יצרה פרויקט חדש. אפשר למחוק.
- **`DESIGN_STANDARD.md` ו-`MASTER_PLAN.md` יושבים ב-`Downloads\`** ולא בריפו.
- **חצור (16):** אין מקור ציבורי לזמני תפילה — הם ייכנסו רק כשגבאי יזין
  אותם באזור הניהול. גם כתובות בתי הכנסת חסרות ב-OSM (מוצג "לא זמין").
  אם יש לך עלון/קבוצה/איש קשר ביישוב — זה ימלא את שני הסעיפים.

---

## ℹ️ 7. דברים שנבדקו ואין עליהם מה לעשות (לא באג)

- **יד2 / מדלן ישירות:** `gw.yad2.co.il` מחזיר Radware Bot Manager Captcha,
  מדלן 400. **אין מסלול חלופי** מלבד ה-actors בתשלום. החלטה עסקית על עלות.
- **MAVAT (תקנון/תשריט):** `rest/api/SV4` דורש טוקן **reCAPTCHA Enterprise**
  שנוצר בדפדפן. לא עוקפים captcha. הדוח מקשר לעמוד הרשמי ואומר איפה ההורדה.
  *אם תרצה את ה-PDF בתוך הדוח* — צריך ספק מורשה או הסכמה מול מינהל התכנון.
- **חורי כיסוי במפה התכנונית** (נמדד בהדקל 22, חצור): שכבות התכנון מחזירות
  אפס על החלקה וכיסוי מלא ב-120 מ'. הדוח מבחין בין "אין תוכנית" ל"אין תוכנית
  **מקוונת**". אם זה תרחיש נפוץ אצל לקוחות — שווה לשקול חיבור ל-GIS העירוני.
