# 31 gesher — /gesher/client/consents: מסך "בקרוב" הפך למסך אמיתי

תאריך: 12/08/2026 · נמדד בדפדפן מול **more30.com** (לא preview) עם משתמש הבדיקה
הרשמי של §1ב, `test@more30.com`.

## מה היה

`src/routes/_authenticated/client/consents.tsx` היה שש שורות: `PlaceholderPage`
עם כותרת "ניהול שיתוף מידע" ותיאור "קבע אילו שותפים רשאים לצפות בפרטיך" — ותו לא.
הפריט השלישי בתפריט הצדי של האזור האישי, על מערכת חיה, הוביל למסך ריק.

זו הייתה השורה הפתוחה (1) בפעימה הקודמת (run_progress #472).

## למה זה לא היה חסר-נתונים

הטבלה קיימת מהמיגרציה הראשונה ומעולם לא נכתב אליה דבר מהאפליקציה:

```sql
CREATE TABLE public.client_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  partner_category text NOT NULL,
  is_granted boolean NOT NULL DEFAULT false,
  ...
  UNIQUE (client_id, partner_category)
);
CREATE POLICY "Clients manage own consents" ON public.client_consents
  FOR ALL TO authenticated
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
```

בניגוד ל-`client_profiles` (שעליה נשבר #173 — שם יש policy ל-SELECT בלבד), כאן
ה-policy היא `FOR ALL` עם `WITH CHECK`, כלומר הלקוח באמת רשאי לכתוב את השורה של
עצמו. `client_profiles.id` הוא `profiles.id` שהוא `auth.uid()`, ולכן
`client_id = userId` הוא הערך הנכון.

**קטלוג הקטגוריות אינו רשימה בקוד.** הוא נקרא מ-`public.visibility_rules`, שכל
משתמש מאומת רשאי לקרוא (`FOR SELECT USING (true)`), ושם גם `allowed_schema_fields`
— בדיוק השדות שהאדמין סימן במסך שלו. המסך מציג ללקוח את מה שבאמת ייחשף.

## מה נבנה

- `src/lib/client.functions.ts` — `getClientConsents` (visibility_rules ⋈
  client_consents של המשתמש) ו-`setClientConsent` (upsert על
  `client_id,partner_category`).
- `src/lib/partner-categories.ts` — מפת תוויות משותפת. `VisibilityRulesGrid`
  של האדמין החזיקה עותק משלה; היא מייבאת עכשיו את המשותף.
- `src/components/client/ConsentsList.tsx` — מתג לכל קטגוריה, תגיות השדות
  שייחשפו, וחותמת `updated_at` מהמסד.
- `src/routes/_authenticated/client/consents.tsx` — מסך אמיתי במקום ה-placeholder.

**הלקח מ-#173 הוחל כאן מראש:** ל-`setClientConsent` יש `.select()` ובדיקת
אפס-שורות מפורשת. כתיבה ש-RLS יסנן לא תוכל לדווח `ok: true`. בנוסף, קטגוריה
שאינה שורה ב-`visibility_rules` נדחית לפני הכתיבה.

## מה נצעד בפועל

| # | פעולה | תוצאה |
|---|---|---|
| 1 | טעינת `/gesher/client/consents` | שלוש הקטגוריות האמיתיות מהמסד, שלושתן כבויות |
| 2 | הפעלת "עורכי דין" | טוסט "השיתוף עם עורכי דין הופעל", חותמת `עודכן ב־12 באוג׳ 2026, 14:31` |
| 3 | **רענון מלא** (`goto`, לא ניווט לקוח) | המתג עדיין דלוק, החותמת עדיין שם — INSERT באמת נשמר |
| 4 | כיבוי "עורכי דין" | טוסט ביטול |
| 5 | **רענון מלא** | `aria-checked=false` בשלושת המתגים — גם ה-UPDATE נשמר |

שני נתיבי הכתיבה נצעדו, לא רק אחד. שלב 3 הוא בדיוק השלב שנשבר ב-#173.

הנתונים אמיתיים ולא הומצאו: "יועצים פיננסיים" ו"עורכי דין" מציגות שדות שהאדמין
כבר סימן, ו"סוכני פנסיה" מציגה במפורש שלא הוגדרו לה שדות — היא נשארה
`'[]'::jsonb` מהזריעה.

## מה לא נמדד

- `public.client_consents` לא נשאלה ישירות. פרויקט `ygaqqnuyfnumezxxmtbh` אינו
  נגיש מכאן ב-MCP ואין `SUPABASE_ACCESS_TOKEN` — הראיה היא הדפדפן, וחותמת
  ה-`updated_at` שחוזרת מהמסד ולא מהלקוח.
- צד האדמין לא נפתח כדי לראות את ההסכמה מהצד השני.
- אכיפה: `visibility_rules` + `client_consents` הן כרגע הצהרה. לא נבדק אם קוד
  כלשהו באמת מסנן לפיהן את מה ששותף רואה. זו שאלה נפרדת וגדולה יותר.

## קבצים

- `01-before-all-off.png` — שלוש קטגוריות, הכל כבוי
- `02-granted-with-toast.png` — אחרי הפעלה, עם הטוסט והחותמת
- `03-after-full-reload-still-granted.png` — אחרי רענון מלא
- `04-revoked-after-reload.png` — אחרי ביטול ורענון מלא
- `_results.json`
