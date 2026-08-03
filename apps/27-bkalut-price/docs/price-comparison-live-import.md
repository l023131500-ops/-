# ייבוא מחירים חי — מדריך הפעלה (Price Comparison Live Import)

מסמך זה מסביר בדיוק מה צריך לעשות כדי שמודול השוואת המחירים יתחיל לייבא
נתוני מחירים **אמיתיים** מרשתות בישראל אל Supabase, באופן יומי ואוטומטי.

> חשוב: המודול מבודד לחלוטין. כל הטבלאות בקידומת `pc_*` והנתיבים תחת
> `/api/pc/*`. אין שום נגיעה במאגר הזכויות או ב-CRM הפיננסי. בשלב זה **אין**
> חיבור לאימייל / וואטסאפ / ימות — קודם כל נתונים אמיתיים ופעילים.

---

## 1. סקירה כללית של הזרימה

```
GitHub Actions (פעם ביום)
   └── npm run pc:import           (script/pc-daily-import.ts)
         ├── קורא pc_feed_sources מ-Supabase (פעיל + מאומת בלבד)
         ├── לכל מקור: מריץ "מתאם" (adapter) שמגלה כתובות קבצים ישירות
         ├── מוריד GZ/XML, מחשב hash, מדלג על קבצים שכבר יובאו (dedupe)
         ├── מפענח ומבצע upsert ל-pc_stores / pc_products / pc_prices / pc_promotions
         └── רושם job + logs + ספירות; לעולם לא מוחק טבלה
```

הסקריפט **נכשל בבירור** אם חסרים הסודות `SUPABASE_URL` או
`SUPABASE_SERVICE_ROLE_KEY`, ולא מייבא דמו / נתונים מזויפים בשום מצב.

---

## 2. שלב חובה: הרצת המיגרציה ב-Supabase

הריצו פעם אחת ב-SQL Editor של Supabase את הקובץ:

```
deliverables/supabase_migration_price_comparison.sql
```

הוא יוצר/מעדכן את כל טבלאות `pc_*`, כולל העמודות החדשות
(`adapter`, `direct_file_url`, `discovery_url`, `max_files_per_run`,
`last_error`, `last_success_at`) וטבלת ה-dedupe `pc_import_files`.
הקובץ בטוח להרצה חוזרת (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).

מומלץ גם להריץ את מדיניות ה-RLS:
```
deliverables/supabase_rls_price_comparison_and_community.sql
```

---

## 3. שלב חובה: הגדרת סודות ב-GitHub

ב-GitHub Repository → **Settings → Secrets and variables → Actions → New repository secret**,
הוסיפו שני סודות:

| שם הסוד | ערך |
| --- | --- |
| `SUPABASE_URL` | כתובת הפרויקט, למשל `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | מפתח ה-Service Role (Project Settings → API → service_role). **לא** מפתח ה-anon. |

> מפתח ה-service_role עוקף RLS ולכן מתאים לשרת/סקריפט בלבד — אסור לחשוף אותו בצד לקוח.
> הוא נמצא בשימוש רק בתוך GitHub Actions ולא נשמר בקוד.

### 3.1 סודות אופציונליים למתאם Cerberus (פורטל publishedprices.co.il)

רוב הרשתות הציבוריות בפורטל מתחברות עם **סיסמה ריקה** — מספיק להזין את שם
המשתמש של הרשת (`auth_user`) באדמין, ואין צורך בסוד נוסף.

אם רשת מסוימת דורשת סיסמה, הוסיפו אותה כסוד GitHub (לעולם לא בקוד). שם הסוד
נגזר משם המשתמש: אותיות גדולות, וכל תו שאינו אות/ספרה מוחלף ב-`_`:

| שם המשתמש (`auth_user`) | שם הסוד הנדרש |
| --- | --- |
| `RamiLevi` | `PC_CERBERUS_PASSWORD_RAMILEVI` |
| `osherad` | `PC_CERBERUS_PASSWORD_OSHERAD` |
| `Tiv-Taam` | `PC_CERBERUS_PASSWORD_TIV_TAAM` |

לחלופין אפשר להגדיר סוד יחיד `PC_CERBERUS_PASSWORD` שישמש כברירת מחדל לכל
הרשתות. אם לא הוגדר אף סוד — נעשה שימוש בסיסמה ריקה (התנהגות ברירת המחדל).

> הסיסמאות נקראות אך ורק מ-`process.env` בתוך GitHub Actions; שום סוד
> שהודבק בצ'אט אינו נשמר בקוד.

---

## 4. זריעת מקורות הנתונים (פעם אחת)

כדי לאכלס את `pc_feed_sources` ברשתות המוכרות (שופרסל, רמי לוי, אושר עד,
יוחננוף, ויקטורי, טיב טעם, חצי חינם, מגה/קרפור, סופר פארם, סטופ מרקט):

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run pc:seed-feeds
# בדיקה ללא כתיבה:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run pc:seed-feeds -- --dry-run
```

כל המקורות נזרעים **לא-מאומתים ולא-פעילים**. הם לא ייובאו עד שתפעילו אותם
ידנית באדמין — ורק לאחר שמתאם הצליח לייבא קובץ אמיתי. הסקריפט אידמפוטנטי
(upsert לפי `chain_id`) ולעולם לא מוחק או מכפיל שורות.

> אפשר גם לזרוע אוטומטית: בעת עליית השרת, אם `pc_feed_sources` ריקה,
> נזרעות אותן רשתות (`seedFeedSourcesIfEmpty`).

---

## 5. הרצה ידנית של ה-Workflow

ב-GitHub → **Actions → "Price Comparison — Daily Import" → Run workflow**.
אפשרויות קלט:

- `dry_run` — גילוי + פענוח בלבד, ללא כתיבה ל-Supabase (לבדיקה בטוחה).
- `feed_id` — להריץ מקור בודד לפי מזהה.
- `max_files` — תקרת קבצים למקור בריצה זו.

הרצה אוטומטית: ה-cron מוגדר ל-`17 5 * * *` (UTC), כלומר בוקר ישראל, פעם ביום.

הרצה מקומית (לבדיקה):
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run pc:import          # ייבוא אמיתי
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run pc:import:dry      # ללא כתיבה
npm run pc:import -- --feed=3 --max-files=2
```

---

## 6. הפעלת מקור (כך הופכים מקור ל"חי")

באדמין: **השוואת מחירים → מקורות נתונים וייבוא**:

1. ודאו שלמקור יש **מתאם** (adapter) מתאים, ו-`discovery_url` או
   `direct_file_url`.
2. הריצו "הרצה" על המקור (או `--feed=<id>` בסקריפט) ובדקו ב-logs שהתקבל קובץ
   אמיתי ושהמחירים נכנסו.
3. רק אם הייבוא הצליח — סמנו **"מאומת"** ואז **"פעיל"**. הייבוא היומי מייבא
   אך ורק מקורות שהם גם מאומתים וגם פעילים.

> אתר הלקוח לא יציג טענת "מחירים חיים" כל עוד אין מחירים עם `source=import`
> (כלומר עוד לא בוצע ייבוא אמיתי). המחירים הראשוניים הם דמו לפיתוח בלבד.

---

## 7. מצב המתאמים (Adapters)

| מתאם | רשת לדוגמה | מצב | מה נדרש להפעלה מלאה |
| --- | --- | --- | --- |
| `shufersal` | שופרסל | **גילוי פעיל** | עמוד `https://prices.shufersal.co.il` הוא HTML רגיל (ללא JavaScript). כל שורה כוללת קישור הורדה מלא ל-Azure Blob **כולל טוקן SAS** במחרוזת השאילתה (`?sv=...&sig=...&se=...&sp=r`). המתאם מעתיק את הקישור כפי שהוא (לאחר פענוח `&amp;`) — אסור להסיר את מחרוזת השאילתה, אחרת ה-blob מחזיר 404. המתאם משתמש בנקודת הקצה המסוננת `GET /FileObject/UpdateCategory?catID=<N>&storeId=0&page=<P>` (catID: 1=Prices, 2=PricesFull, 3=Promos, 4=PromosFull, 5=Stores), בוחר קטגוריות לפי `feed_kinds`, ועובר עד 3 עמודים לכל קטגוריה. נופל חזרה לעמוד הראשי אם הנקודה אינה זמינה. הלוג רושם כמה עוגנים נמצאו וכמה קישורים נשמרו. |
| `url` | כל רשת | **פעיל** | הזינו `direct_file_url` ישיר (`.gz`/`.xml`). זו הדרך הוודאית ביותר להפעיל כל רשת. |
| `cerberus` | רמי לוי, אושר עד, יוחננוף, טיב טעם, חצי חינם, מגה/קרפור | **פעיל** | המתאם מבצע את הזרימה הציבורית של `publishedprices.co.il`: `GET /login` (CSRF + cookie) → `POST /login/user` עם `auth_user` של הרשת וסיסמה (ברירת מחדל ריקה — נכון לרוב הרשתות) → `POST /file/json/dir` לרשימת הקבצים → הורדה מ-`/file/d/<name>` עם ה-cookie המאומת. הזינו את `auth_user` באדמין. אם רשת דורשת סיסמה, ראו סעיף 3.1. |
| `nibit` | סופר פארם | **שלד** | מנסה חילוץ קישורים גנרי מעמוד הרשימה; אם נכשל — הדביקו `direct_file_url`. |
| `matrix` | ויקטורי, סטופ מרקט | **שלד** | זהה ל-nibit (laibcatalog). |
| `openisrael` | חיצוני | **אופציונלי** | שימוש בכלי OpenIsraeliSupermarkets לייצוא קובץ/API, ואז הזנת הכתובת ב-`source_url`. ראו סעיף 9. |

---

## 8. בטיחות הנתונים (Safeguards)

- **Dedupe לפי hash**: כל קובץ נרשם ב-`pc_import_files` עם `content_hash` ייחודי;
  קובץ עם תוכן זהה מדולג בריצה הבאה.
- **ללא מחיקה**: הייבוא רק מבצע upsert. אף טבלה לא נמחקת או מתאפסת.
- **Retry/backoff**: הורדה מנסה עד 3 פעמים עם השהיות 1s/2s.
- **תקרת קבצים**: `max_files_per_run` לכל מקור (ברירת מחדל 10), ניתן לעקיפה עם
  `--max-files`.
- **Logs + ספירות**: כל ריצה יוצרת `pc_import_jobs` עם ספירות
  (חנויות/מוצרים/מחירים/מבצעים/שגיאות) ו-`pc_import_logs` מפורטים.
- **כשל כן**: מקור שלא הצליח לייבא מסומן `error` עם `last_error` ברור — לא
  "הצלחה". ה-Workflow נכשל (אדום) רק אם **כל** המקורות נכשלו.

---

## 9. מה עוד נותר לעשות ידנית (לא נכלל בשלב זה)

| נושא | סטטוס | פעולה נדרשת |
| --- | --- | --- |
| **Cerberus / publishedprices** | פעיל | הזינו `auth_user` לכל רשת באדמין. אם רשת דורשת סיסמה, הוסיפו סוד `PC_CERBERUS_PASSWORD_<USER>` (סעיף 3.1). |
| **שופרסל (אם הגילוי לא מצא קישורים)** | תלוי בעמוד | לפתוח את prices.shufersal.co.il, ללחוץ על קובץ, ולהעתיק את כתובת ההורדה הישירה אל `direct_file_url`. |
| **OpenIsraeliSupermarkets** | חיצוני | להתקין ולהריץ את הכלי (Python) בנפרד, לייצא קובץ/להעמיד API, ולהזין כתובת ישירה ב-`source_url` עם `adapter=openisrael`. לוודא רישוי. |
| **WhatsApp / ימות המשיח (Yemot)** | לא מחובר | אינטגרציית ערוצים יוצאים מושבתת בכוונה. תופעל בשלב נפרד דרך הגדרות האוטומציה. |
| **Amazon / Email ingest** | לא מחובר | קליטת מחירים מאימייל/אמזון לא מיושמת בשלב זה. |

---

## 10. פתרון תקלות מהיר

- **"חסרים סודות Supabase"** → הוסיפו `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  (סעיף 3).
- **"אין מקורות פעילים ומאומתים"** → הריצו `npm run pc:seed-feeds`, ואז הפעילו
  מקור באדמין לאחר ייבוא מוצלח (סעיף 6).
- **"לא נמצאו קבצים ישירים"** (שופרסל/nibit/matrix) → הדביקו `direct_file_url`
  ידני; ראו את ההערה המדויקת ב-`pc_import_logs`.
- **"read pc_feed_sources failed"** → ודאו שהרצתם את המיגרציה (סעיף 2) ושמפתח
  ה-service_role תקין.

---

## 11. שני מסלולי נתונים: רשמי מול הצעות ספקים

המערכת מפרידה לחלוטין בין שני סוגי מחירים באמצעות העמודה `source_type`:

- **`official_feed`** — מחירי הרשתות המתפרסמים לפי חוק (קובצי השקיפות). זהו
  המסלול היחיד שמשתתף בהשוואה הרשמית. כל הנתונים הקיימים והייבוא היומי מסומנים כך.
- **`supplier_submitted`** — הצעות מחיר שעסקים מגישים בעצמם. **לעולם** אינן
  מעורבבות בהשוואה הרשמית: ברירת המחדל של כל החיפושים הציבוריים היא
  `track=official`, ומחירי ספקים מוצגים רק כשמבקשים אותם מפורשות
  (`track=supplier` או `track=all`) וגם רק לאחר אישור אדמין.

**זרימת ההגשה והאישור:**

1. כשהאדמין מפעיל "פורטל ספקים/חנויות" בהגדרות, מופיע באתר הציבורי טופס
   "בעל עסק? הגישו הצעת מחיר" (`POST /api/pc/public/submit-price`).
2. ההגשה נשמרת בטבלה `pc_price_submissions` בסטטוס `pending` — אינה נראית לאיש.
3. האדמין בודק בלשונית "הצעות ספקים" (`GET /api/pc/admin/submissions`) ומאשר
   או דוחה. אישור (`/approve`) יוצר/מעדכן חנות ומחיר עם `source_type=supplier_submitted`
   ומסמן את ההגשה כ-`approved`. דחייה (`/reject`) מסירה כל מחיר ספק שנוצר.
4. שדה `trust` (`unverified`/`verified`/`trusted`) זמין לסיווג מהימנות עתידי.

הטבלה `pc_price_submissions` נוספת במיגרציה
(`deliverables/supabase_migration_price_comparison.sql`) ומופעלת עם RLS
deny-by-default — נכתבת/נקראת רק דרך ה-backend (service_role), כמו שאר טבלאות
ה-`pc_*`. אין סודות בטופס ההגשה.
