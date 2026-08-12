# 22 מימוש זכויות — «שכחתי סיסמה» ומסך ההשלמה (core.issues #201) · 13/08/2026

## מה היה לפני

`more30.com/zchuyot/admin/login` הציג שדה אימייל, שדה סיסמה וכפתור כניסה — ולא
כלום מעבר לזה. מי ששכח סיסמה לא יכול היה לבקש איפוס בשום מקום במערכת, וגם אילו
היה מקבל קישור, לא היה בו יעד: `App.tsx` לא הכיל שום מסלול איפוס, וכל כתובת שאינה
ברשימה נופלת על ה-catch-all `*` שמציג `NotFound`.

## מה נבנה

| קובץ | מה |
|---|---|
| `src/pages/AuthReset.tsx` | חדש. קורא את הטוקן מהכתובת, ממתין ל-`getSession` (עד 5 שניות), מציג את המייל שהקישור אומת עבורו, שני שדות סיסמה עם «הצג סיסמה», ואז `updateUser` ומעבר ל-`/admin/leads` |
| `src/pages/AdminLogin.tsx` | כפתור «שכחתי סיסמה» מתחת לכפתור הכניסה + `resetPasswordForEmail` |
| `src/App.tsx` | מסלול `/auth/reset` (lazy, מעל ה-catch-all) |

**היעד נבנה מ-`BASE_URL` ולא מ-`origin` לבדו.** זה בדיוק הבאג שנמצא ב-30
(commit `6679a31`): האתר מוגש תחת `/zchuyot`, ו-`origin` לבדו היה שולח את הקישור
ל-`more30.com/auth/reset` — כתובת שאינה קיימת.

## מה נמדד — בנייה והרצה מקומית של החבילה הבנויה

אין אימות בייצור, ולא בבחירה: כל `more30.com` מחזיר **402** מ-12/08 20:58Z בגלל
חשבונית Vercel שלא שולמה (`core.issues #204`). מה שכן נמדד, על החבילה הבנויה:

| בדיקה | תוצאה |
|---|---|
| `npx vite build --base=/zchuyot/` | **exit 0**, 1m 25s. נוצר `dist/assets/AuthReset-Del3j-2t.js` (4.33 kB) |
| `resetPasswordForEmail` בחבילת `AdminLogin` | נמצא |
| `/auth/reset` בחבילת ה-router | נמצא |
| `GET /zchuyot/auth/reset` מול `vite preview` | **200** |
| רינדור אמיתי של המסך בלי טוקן | «הקישור אינו תקף» + הסבר + קישור חזרה למסך הכניסה — ולא 404 (`reset-no-token.png`) |
| לחיצה על «שכחתי סיסמה» עם אימייל | `POST https://trerolyveytzgksawrme.supabase.co/auth/v1/recover?redirect_to=http%3A%2F%2Flocalhost%3A4322%2Fzchuyot%2Fauth%2Freset` → **200** |

השורה האחרונה היא ההוכחה שהיעד נבנה נכון: הנתיב `/zchuyot/` נשמר בכתובת ההפניה.
בייצור אותו קוד ייתן `https://more30.com/zchuyot/auth/reset`.

הכתובת שנשלחה בבדיקה היא `qa-probe-0813@more30.com` — כתובת שאינה רשומה במערכת,
במכוון: Supabase מחזיר 200 בלי לשלוח דבר, ולכן שום מייל לא יצא לאיש.

**שגיאת הקונסולה היחידה בשני המסכים אינה שלהם:**
`https://more30.com/auth-button.js` → **402**. זהו כפתור הכניסה המשותף שנמשך
מהדומיין, והוא נופל בגלל #204.

## מה שנמדד ואינו עבודת קוד — הרשימה של הפרויקט (#206)

`GET /auth/v1/verify?token=<לא-תקף>&type=recovery&redirect_to=<כתובת>` מחזיר 303,
וכתובת ה-`Location` חושפת אם היעד מורשה: מורשה חוזר כפי שהוא, לא-מורשה מוחלף
ב-Site URL.

| `redirect_to` שנשלח | `Location` שחזר |
|---|---|
| `https://example.com/pwned` *(ביקורת שלילית)* | `https://get-your-rights.lovable.app/#error=access_denied…` |
| `https://more30.com/zchuyot/auth/reset` | `https://get-your-rights.lovable.app/#error=access_denied…` |
| `https://more30.com/` | `https://get-your-rights.lovable.app/#error=access_denied…` |
| `https://get-your-rights.lovable.app/auth/reset` *(ביקורת חיובית)* | `https://get-your-rights.lovable.app/auth/reset#error=access_denied…` |

שתי הביקורות הן מה שהופך את זה למדידה ולא לניחוש. המסקנה: `more30.com` אינו
ברשימת ההרשאות, ו-Site URL הוא `https://get-your-rights.lovable.app`.

`GET https://api.supabase.com/v1/projects/trerolyveytzgksawrme/config/auth` עם
ה-PAT שב-`core.secrets` החזיר **403** — הפרויקט אינו בכיסוי, ולכן ה-`PATCH`
שסגר את #198 אינו זמין כאן. רשום ב-`NEEDS_USER.md §0ת`.

## מה לא נעשה, ולמה

- **לא נפרס.** ‏#204 חוסם כל פריסה וכל אימות בייצור.
- **לא נוצר משתמש בדיקה ולא נשלח מייל אמיתי.** הבדיקה השתמשה בכתובת שאינה רשומה.
- **לא נסגר #201.** נותרו 15 egod ו-21 mthbram.

## קבצים

- `reset-no-token.png` — המסך החדש כשאין טוקן בכתובת
- `login-forgot-sent.png` — מסך הכניסה עם «שכחתי סיסמה»
