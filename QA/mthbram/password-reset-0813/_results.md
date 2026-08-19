# 21 mthbram — איפוס סיסמה (core.issues #201)

תאריך: 13/08/2026. פרויקט Supabase: `aypsqqvfohekxxuqsmrw`. בסיס הגשה: `/mthbram/`.

## 0. uri_allow_list נקרא לפני שנכתבה שורה — כפי ש-#201 מורה

הפרויקט אינו אחד מעשרת הרפים שה-PAT מכסה, ולכן נמדד ישירות מהשרת: `GET /auth/v1/verify`
עם טוקן לא-תקף מחזיר 303, וכתובת ה-Location מגלה אם היעד מורשה — יעד מורשה חוזר כפי שהוא,
יעד שאינו מורשה מוחלף ב-Site URL. שתי ביקורות, ולא הנחה אחת:

| redirect_to שנשלח | Location שחזר | מסקנה |
|---|---|---|
| `https://mthbram.lovable.app/auth/reset` (ביקורת חיובית) | `https://mthbram.lovable.app/auth/reset#error=...` | הבדיקה מבחינה |
| `https://example.com/x` (ביקורת שלילית) | `https://mthbram.lovable.app#error=...` | הוחלף — לא מורשה |
| `https://more30.com/mthbram/auth/reset` | `https://mthbram.lovable.app#error=...` | **more30.com אינו ברשימה** |
| `https://more30.com/mthbram/**` | `https://mthbram.lovable.app#error=...` | גם התבנית אינה שם |

כלומר Site URL הוא ארגז Lovable, ו-more30.com חסר מרשימת ההרשאות — בדיוק המצב של #202 (30),
‏#205 (31) ו-#206 (22). זו הגדרת דשבורד ולא עבודת קוד, ולכן נרשמה ככרטיס נפרד ולא נבלעה כאן.

## 1. מה נבנה

- `src/pages/AuthReset.tsx` — המסך שקורא את הטוקן מהכתובת, ממתין ל-`detectSessionInUrl`,
  מנקה את הטוקן משורת הכתובת, מציג את בעל החשבון בשמו, וקורא ל-`updateUser` עם אימות סיסמה.
- `src/App.tsx` — מסלול `/auth/reset` **מעל** ה-`*`, אחרת הקישור מהמייל נוחת על NotFound.
- `src/pages/AdminLogin.tsx` — נקודת כניסה «שכחתי סיסמה». היעד נבנה מ-`import.meta.env.BASE_URL`
  ולא מ-`origin` לבדו — זה בדיוק הבאג של 30 crm, שהיה שולח את הקישור ל-more30.com/auth/reset.

## 2. מה נמדד על החבילה הבנויה (vite preview, port 4321)

| בדיקה | תוצאה | ראיה |
|---|---|---|
| `npm run build` | exit 0, `index-DO5Yp880.js` | — |
| `/mthbram/auth/reset` בלי טוקן | 200, ומרנדר «הקישור אינו תקף» ולא NotFound | `01-reset-no-token.png` |
| «שכחתי סיסמה» עם שם משתמש (בלי @) | נעצר עם הודעה בתוך הטופס, בלי בקשת רשת | `02-username-not-email.png` |
| «שכחתי סיסמה» עם כתובת מייל | `POST /auth/v1/recover?redirect_to=…%2Fmthbram%2Fauth%2Freset` → **200** | `03-reset-sent.png` |

הנתיב `/mthbram/` נשמר בבקשה — זו הנקודה שנשברה ב-30. ב-preview ה-origin הוא localhost;
בייצור אותו קוד מרכיב `https://more30.com/mthbram/auth/reset`.

הכתובת שנבדקה (`qa-probe-0813@more30.com`) אינה רשומה בפרויקט, ולכן שום מייל לא יצא.
‏Supabase מחזיר 200 בשני המקרים, ולכן גם ההודעה במסך אינה מאשרת ואינה מכחישה שהחשבון קיים.

## 3. שני דברים שנמדדו אגב כך

- **הודעות toast של המסך הזה אינן מגיעות למסך.** אחרי לחיצה אין אף `[data-sonner-toast]`
  ב-DOM ואין שגיאת קונסולה. לכן המשוב של «שכחתי סיסמה» נכתב **בתוך הטופס** ולא כ-toast בלבד —
  אחרת הלחיצה נראית למשתמש כלחיצה שלא קרה בה כלום. יתר המסך (שגיאות התחברות) עדיין נשען
  על toast, וזה פריט קיים שלא נגעתי בו בצעד הזה.
- **more30.com/auth-button.js מחזיר 402** גם בבדיקה המקומית — #204 עדיין חי.

## 4. מה לא נעשה, ולמה

לא נפרס ולא אומת בייצור, ולא בבחירה: כל more30.com מחזיר 402 Payment Required מ-12/08 20:58Z
בגלל חשבונית Vercel שלא שולמה (#204) — נמדד שוב בתחילת הצעד על `/`, `/gesher/` ו-`auth-button.js`.
אין שום אימות בייצור אפשרי עד שהחשבונית תשולם.
