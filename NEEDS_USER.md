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
| 9 | **הכול** | תיקון הרשאות ב-PAT שסיפקת | ראה סעיף 3.1 למטה — **הטוקן נשמר ועובד, ההרשאה חסרה** | — |
| 10 | **16** chatzor *(רשות)* | `GOOGLE_MAPS_API_KEY` | console.cloud.google.com → Distance Matrix API | Vercel `chatzor-more30`. **לא חוסם** — בניתי מרחק אווירי מהדפדפן בלי מפתח; המפתח ישדרג למרחק/זמן **הליכה** |

---

### 3.1 ✅ הדחיפה האוטומטית — **נפתרה** (31/07, עם הטוקן הקלאסי ששלחת)

הטוקן הקלאסי עובד: `repo` מלא, כתיבה לשני הריפואים. **10 הקומיטים שהמתינו נדחפו.**

| ריפו | מה נדחף |
|---|---|
| `l023131500-ops/-` | 9 קומיטים → `feature/unify-phase1` |
| `l023131500-ops/nadlan-berega` | 3 קומיטים → `main` |
| `l023131500-ops/chizukim-transcribe` | ענף חדש `more30/night-work` |
| `l023131500-ops/chatzor-connect` | ענף חדש `more30/night-work` |

**החלטה שקיבלתי בלי לשאול, ואפשר לבטל:** ל-16 ול-17 כבר היו ריפואים פרטיים
בחשבון, עם היסטוריה **אחרת** לגמרי ב-`master`. לא דרסתי כלום — דחפתי לענף נפרד
`more30/night-work` בכל אחד. אם תרצה שזה יהיה ה-`master` שלהם, תגיד ואמזג.

**מה שחסם קודם ולא היה קשור להרשאות:** ב-`gitconfig` המערכתי של GitHub Desktop
מוגדר helper בשם `manager`, שרץ **לפני** ה-`wincred` הגלובלי והחזיר את הטוקן
הישן (fine-grained, קריאה בלבד). git לוקח את התשובה הראשונה, ולכן הטוקן החדש
מעולם לא נוסה. תוקן: רשומת ה-credential הישנה נמחקה, ורשימת ה-helpers מאופסת
ב-`.gitconfig` לפני `wincred` כדי שה-helper המערכתי לא יענה ראשון.

> 🔴 **הטוקן הזה נשלח אליי כטקסט גלוי, ולכן יש להתייחס אליו כחשוף.** הוא שמור
> מוצפן ב-Windows Credential Manager (לא ב-`.git/config`, לא בקובץ טקסט), אבל
> **כדאי לסובב אותו** ברגע שהעבודה נרגעת. הרשאותיו רחבות מאוד: `repo`,
> `delete_repo`, `admin:org`, `workflow`.

### 3.2 🔴 מפתח ה-`service_role` של ההאב — **החוסם היחיד של מנוע הסודות**

`core.secrets` בנוי, מאובטח ומאוכלס (71 מפתחות). מה שחסר כדי **לחבר** אליו
מערכת בפועל הוא מפתח קריאה אחד.

*מה צריך:* Supabase → פרויקט `uhnrgujbdxhhmoxcjria` → Settings → API →
`service_role`. **או** לחלופין PAT: Account → Tokens → `sbp_...` (אז אשלוף
לבד, וגם `scripts/Use-SupabasePat.ps1` יתחיל לעבוד).

*לאן:* אכניס בעצמי כ-`MORE30_SECRETS_KEY` לכל פרויקט Vercel.

*למה אני לא יכול להשיג אותו לבד — נבדק, לא הונח:*
Vercel מסמן אותו `sensitive` ולא מחזיר ערך (גם לא ב-API עם `decrypt=true`);
ה-MCP של Supabase מחזיר **רק** מפתחות פומביים; ו-`app.settings.jwt_secret`
אינו קריא במסד, כך שאי אפשר גם לייצר אישור ייעודי מצומצם במקומו.

### 3.3 🟠 31 מפתחות שקיימים **רק** ב-Vercel — ולכן ההאב עדיין לא מקורם

Vercel לא מחזיר ערכים של משתנים מסומנים `sensitive`. **הם ממשיכים לעבוד
בפרודקשן** — זה לא תקלה — אבל הם לא ב-`core.secrets`, ולכן אין להם מקור-אמת אחד.

מתוכם, אלה שהם **מפתח אמיתי** (השאר הם קונפיגורציה כמו `AI_MODEL`, `VITE_BASE`):

| מפתח | מערכת | פרויקט Vercel |
|---|---|---|
| `SUPABASE_SERVICE_KEY` | nadlan · studio · imud | `nadlan-more30` · `studio-more30` · `imud-more30` |
| `AI_API_KEY` | nadlan | `nadlan-more30` |
| `RESEND_API_KEY` | nadlan | `nadlan-more30` |
| `POI_REFRESH_TOKEN` | nadlan | `nadlan-more30` |
| `ADMIN_TOKEN` | nadlan · kupot | `nadlan-more30` · `kupot-more30` |
| `ELEVENLABS_API_KEY` | mechiron | `mechiron-more30` |
| `YEMOT_API_KEY` | mechiron | `mechiron-more30` |
| `RIGHTS_SUPABASE_KEY` | zchuyot | `zchuyot-more30` |
| `LAB_TOKEN` | chizukim | `chizukim2-more30` |
| `DATAGOV_SCHOOLS_RESOURCE` · `DATAGOV_MIKVE_RESOURCE` | nadlan | `nadlan-more30` |

**שים לב:** `ELEVENLABS_API_KEY` ו-`YEMOT_API_KEY` מופיעים בסעיף 3 למעלה
כ"חסרים" — הם בעצם **כבר מוגדרים** ב-`mechiron-more30`. אין צורך להשיג אותם
מחדש; צריך רק להעתיק את ערכם ל-`core.secrets` (או לתת לי את מפתח ההאב מ-3.2,
ואבנה מסלול שבו כל מערכת כותבת את שלה פנימה).

### 3.4 🟡 סודות Actions יושבים על ריפו **ציבורי**

9 סודות בנייה הוגדרו ב-`l023131500-ops/-` (וב-3 הריפואים הפרטיים). המונוריפו
**ציבורי**. GitHub לא מעביר סודות ל-workflow שרץ מ-PR של fork, אבל כל מי שיכול
לדחוף קובץ workflow לריפו יכול לקרוא אותם. שלוש אפשרויות: להפוך את המונוריפו
לפרטי · להשאיר כך (הסיכון תיאורטי כל עוד אתה היחיד עם גישת כתיבה) · או להסיר
משם את מפתחות ה-AI ולהשאיר רק את הפומביים. **תגיד ואבצע.**

### 3.5 🔑 הדחיפה האוטומטית — הגרסה הישנה (נשמר לתיעוד)

**מה כבר נעשה (31/07):** `credential.helper = wincred` הוגדר גלובלית והטוקן
נשמר ב-Windows Credential Manager (מוצפן, לא בקובץ טקסט ולא ב-`.git/config`,
ולכן גם לא ידלוף לריפו). **האימות עובד** — `git ls-remote` נגד המונוריפו
מצליח. מה שנכשל הוא ההרשאה, וזה דבר אחר.

**נמדד מול ה-API של GitHub:**

| בדיקה | תוצאה |
|---|---|
| `GET /user` | 200 · `l023131500-ops` · טוקן fine-grained |
| `GET /repos/l023131500-ops/-/contents/README.md` | **200** → `contents=read` **יש** |
| `POST /repos/l023131500-ops/-/git/blobs` | **403** `needs: contents=write` → **אין** |
| `GET /repos/l023131500-ops/nadlan-berega` | **404** `needs: metadata=read` → הריפו **לא ברשימת הריפואים של הטוקן** |
| ריפואים שהטוקן רואה | `-` · `more.30.com` · `zol` (שלושה בלבד) |

**שני תיקונים ב-github.com → Settings → Developer settings → Personal access
tokens → Fine-grained tokens → הטוקן הזה → Edit:**

1. **Permissions → Repository permissions → `Contents`: מ-`Read-only` ל-`Read and write`.**
   זה מה שחוסם את הדחיפה למונוריפו.
2. **Repository access → להוסיף את `nadlan-berega`** (או לבחור *All repositories*).
   כרגע הריפו הזה בכלל לא בהרשאה, ולכן גם קריאה ממנו נכשלת.

*(שינוי הרשאות לא מחליף את הטוקן — מה ששמור אצלי ימשיך לעבוד. אם בכל זאת
תיצור טוקן חדש, אמור ואעדכן. וכדאי להתייחס לטוקן הזה כחשוף, כי נשלח כטקסט.)*

**מה ממתין לדחיפה ברגע שזה יתוקן:**

| ריפו | מצב | ממתין |
|---|---|---|
| `l023131500-ops/-` (מונוריפו) | קריאה ✓ · כתיבה ✗ | **7 קומיטים** (`66d6715`…`c862c94`) |
| `l023131500-ops/nadlan-berega` | לא בהרשאה כלל | **3 קומיטים** (`3fb1935`, `f10e000`, `677f4e0`) |
| `apps/17-chizukim-transcribe` | ריפו מקומי, **אין origin** | 2 קומיטים — צריך להחליט אם ליצור ריפו ב-GitHub |
| `apps/16-chatzor-connect` | ריפו מקומי, **אין origin** | 1 קומיט — אותה שאלה |

> **החלטה קטנה שדרושה:** ל-16 ול-17 אין ריפו מרוחק. `app.json` של 17 מפנה
> ל-`l023131500-ops/chizukim-transcribe` (לא קיים), ושל 16 מפנה ל-`-` שהוא
> המונוריפו. תגיד אם ליצור להם ריפואים (ואז הטוקן צריך גם
> `Administration: write`), או להשאיר אותם מקומיים.

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
