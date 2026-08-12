# 01 איגוד השיעורים — סריקת שמונה פונקציות הקצה שלא היה להן מקור בריפו (12/08)

הפעימה הקודמת (#192) השאירה קו פתוח מפורש: הרשימה הפרוסה בפרויקט
`bieebmnmkffwbqlsfozh` מחזיקה 15 slugs ולא שש, ולתשע מהן אין מקור בתיקיית 01 —
`api`, `chat`, `search-lessons`, `create-admin`, `ivr-agent`, `ivr-menu`,
`ivr-search`, `ivr-submit` (ועוד `zr-loader`/`zr-admin-api`, מוגנות, לא נגעתי בהן
ולא שלחתי אליהן אף בקשה). הן נושאות בדיוק את השמות שהיו החורים ב-21 מתחברים.

## איך נקרא מה שאין לו מקור

`GET /v1/projects/<ref>/functions/<slug>/body` מחזיר חבילת ESZIP2.3 ולא טקסט.
המקור המקורי יושב בתוכה בשלמותו: מ-`import ` הראשון ועד ה-sourcemap
(`{"version":3`) זהו index.ts המתומלל. הבתים הגולמיים והחילוץ שמורים תחת `src/`.
זו הדרך לקרוא קוד פרוס שאין לו מקור מקומי, בלי CLI ובלי גישה ל-Lovable.

## מה נמצא — שמונה, אחת מהן חיה ופתוחה

| slug | verify_jwt | מריצה על | מה היא עושה בפועל | מסקנה |
|---|---|---|---|---|
| `create-admin` | true | service_role | createUser, ו**אם המייל כבר קיים — דורסת לו את הסיסמה** | 🔴 **החור. נסגר בצעד הזה.** |
| `api` | false | service_role | `/lessons` `/search` `/stats` — קריאה בלבד מ-`lessons` עם `is_approved=true` | ✅ קטלוג ציבורי, אין לידים ואין כתיבה |
| `chat` | false | service_role | צ׳אט OpenAI | ⚠️ אין `OPENAI_API_KEY` בפרויקט → 500 לפני כל קריאה |
| `search-lessons` | false | service_role | סוכן OpenAI מעל המאגר | ⚠️ אותו דבר — בדיקת env קודמת לקריאות המסד |
| `ivr-menu` | false | service_role | מחזירה `ivr_menu_config.menu_tree` | ✅ תפריט טלפוני ציבורי |
| `ivr-agent` | false | service_role | חיפוש מילות מפתח ב-`lessons` המאושרים + שורת לוג | ⚠️ כתיבה לא-מאומתת ל-`ivr_submissions` |
| `ivr-search` | false | service_role | סינון `lessons` מאושרים + שורת לוג | ⚠️ אותו דבר |
| `ivr-submit` | false | service_role | מכניסה `ivr_submissions`, ובבקשה מתאימה גם `seeker_leads`/`teacher_leads` | ⚠️ כתיבת לידים לא-מאומתת |

`create-admin` היא היחידה שבה הקורא מקבל יותר ממה שהמוצר הציבורי נותן ממילא.

## החור: `create-admin` — השתלטות על כל חשבון בפרויקט לפי מייל

`verify_jwt=true` נראה כמו שער ואינו: מפתח ה-anon הוא JWT תקין שנשלח לכל דפדפן
בכל טעינת דף. אין לפונקציה שום בדיקה משלה. מי שמחזיק את המפתח הציבורי שולח
`{email, password}` של חשבון קיים ומקבל את הסיסמה שלו מוחלפת. הפרויקט הזה נושא
את 01 וגם את tamlul/orech/modaot/bkalot, כלומר זה לא חשבון אחד.

**לפני** (נמדד לפני שנגעתי בכלום):

```
no-key/no-body       401  1486ms  {"code":"UNAUTHORIZED_NO_AUTH_HEADER"}
anon-key/no-body     400   757ms  {"error":"Email and password required"}   ← ההנדלר רץ
anon-key/empty-json  400   474ms  {"error":"Email and password required"}
```

ה-400 הוא הראיה: זו הודעת הוולידציה של הפונקציה עצמה, כלומר הבקשה נכנסה לגוף
ההנדלר. **לא הודגמה ההשתלטות עצמה** — היא הייתה דורסת סיסמה של אדם אמיתי.

**התיקון** — אותה תבנית של #160, בקובץ `apps/01-torah-platform/supabase/functions/create-admin/index.ts`
(שנוצר עכשיו; קודם לכן לא היה מקור מקומי בכלל): שער `ADMIN_BOOTSTRAP_SECRET`
שנכשל-סגור, לפני `req.json()` ולפני כל קריאה ל-`auth.admin`. הסוד הושאר במכוון
לא-מוגדר: אין באפליקציה שום מסך שקורא לנתיב (חיפוש `create-admin` בכל
`apps/01-torah-platform` מחוץ ל-node_modules/dist לא החזיר אף התאמה), ולכן מושבת
הוא מצב המנוחה הנכון.

**אחרי** (גרסה 2, `verify_jwt` נשמר true):

```
no-key/no-body         401  1226ms  {"code":"UNAUTHORIZED_NO_AUTH_HEADER"}
anon-key/no-body       503   756ms  {"error":"Admin bootstrap is disabled"}
anon-key/with-creds    503   238ms  {"error":"Admin bootstrap is disabled"}
anon-key/wrong-secret  503   279ms  {"error":"Admin bootstrap is disabled"}
OPTIONS                200          allow-headers כולל x-admin-bootstrap-secret
```

238ms מול 757ms — הסירוב חוזר לפני שנוגעים במסד. בקשת `with-creds` נשלחה על
כתובת `.invalid.test` וממילא נעצרה בשער, ולכן לא נוצר משתמש ולא שונתה סיסמה.

## מה לא נמדד, ונאמר במפורש

- **ענף הסוד הנכון** (503 → 404 → 400/200) לא נבדק: `ADMIN_BOOTSTRAP_SECRET`
  אינו מוגדר, וכל עוד הוא חסר 503 קודם לכל השאר. ה-503 עצמו הוא ההוכחה שהוא
  חסר. לא הגדרתי אותו במכוון — משתנה סביבה בפרויקט הזה חל גם על `zr-*` המוגנות,
  ואין שום צורך תפעולי בנתיב.
- **ארבע ה-`ivr-*` לא נבדקו מול הייצור.** כל אחת מהן כותבת שורה אמיתית לטבלה
  חיה (`ivr_submissions`, ובמקרה של `ivr-submit` גם ליד), ומדידה שלהן היא זיהום
  נתונים. הן נקראו במקור בלבד.
- `chat` ו-`search-lessons` נבדקו בגוף `{}` בלבד. שתיהן נעצרות בבדיקת ה-env
  שקודמת גם לקריאות המסד וגם ל-OpenAI, ולכן לא הוצאה שום קריאת AI ולא נקרא שום
  נתון.

## מלכודת רדומה שנרשמת כאן כדי שלא תופתע

`chat` ו-`search-lessons` סגורות היום רק מפני ש-`OPENAI_API_KEY` אינו מוגדר
בפרויקט. ברגע שמישהו יגדיר אותו — שתיהן הופכות למוציאות קרדיט בלי שום תקרה
ובלי בדיקת קורא, בדיוק המחלקה של #165/#190. גרוע מזה: `search-lessons` שולפת
`synagogue_portals` ו-`org_portals` כולל `public_token` ו-`contact_phone`, ותוחבת
אותם לתוך ה-system prompt — כלומר תשובת AI שהוסטה יכולה להחזיר אותם. **אל
תגדיר `OPENAI_API_KEY` על `bieebmnmkffwbqlsfozh` לפני שתקרת הקצב של #190 מועתקת
לשתיהן ו-`public_token` מוסר מה-select.**
