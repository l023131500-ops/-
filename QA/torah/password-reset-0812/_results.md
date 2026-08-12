# 01 איגוד השיעורים — איפוס סיסמה מקצה לקצה (core.issues #201, מערכת שנייה מתוך הרשימה)

תאריך: 12/08/2026 · פרויקט Supabase: `bieebmnmkffwbqlsfozh` · פריסה: `torah-more30`, `dpl_EkaanL5DExgA9GsRV8NRLaTLrHZB`, production.

## מה נמדד לפני שנגעתי

`GET /v1/projects/bieebmnmkffwbqlsfozh/config/auth` (PAT) — נקרא ולא הונח:

```
site_url      = https://more30.com
uri_allow_list= https://more30.com/**,https://more30.com,https://tamlul-more30.vercel.app/**
autoconfirm   = False
otp_exp       = 3600
```

כלומר היעד `https://more30.com/torah/auth/reset` נכלל ב-allow list כמות שהוא, ואין
כאן את השאלה הפתוחה שיש ל-30 (#202). מה שהיה חסר הוא קוד: במקור לא הייתה נקודת
כניסה «שכחתי סיסמה» באף מסך, ולא היה מסלול `/auth/reset` — קישור איפוס היה נוחת
על `*` ומקבל את מסך ה-404.

## הסיבוב המלא מול הייצור

1. **נקודת הכניסה.** `https://more30.com/torah/auth/sign-in`, הזנת
   `qa-reset-torah-0812@more30.com`, לחיצה על «שכחתי סיסמה». הבקשה שיצאה בפועל
   (network log):
   `POST .../auth/v1/recover?redirect_to=https%3A%2F%2Fmore30.com%2Ftorah%2Fauth%2Freset%3Fnext%3D%252Fportal` → **200**.
   היעד נושא את הקידומת `/torah` — ולכן אינו נופל לבאג של 30, שהיה `origin` לבדו.
   צילום: `01-signin-forgot-sent.png` (ההודעה הירוקה, שזהה בין כתובת קיימת לשאינה קיימת).
2. **הטוקן.** ראו "מגבלת המייל" למטה — הקישור הופק דרך
   `POST /auth/v1/admin/generate_link` עם אותו `redirect_to` בדיוק שנמדד בשלב 1,
   ולא נקרא מתיבת דואר. הוא טוקן `type=recovery` אמיתי של אותו שרת.
   `_action-link.txt`.
3. **מסך ההשלמה.** פתיחת הקישור נחתה ב-`https://more30.com/torah/auth/reset`,
   והמסך הציג «הקישור אומת עבור qa-reset-torah-0812@more30.com». שורת הכתובת
   נקייה מהטוקן אחרי שנקרא. צילום: `02-reset-verified.png`.
4. **השמירה.** הוזנה סיסמה חדשה + אימות → המסך העביר ל-`/torah/portal`, כלומר
   **לתוך המוצר** ולא למסך תודה (priority §1ג). צילום: `03-landed-in-portal.png`.
5. **מול ה-API, ולא רק מול המסך.**
   `POST /auth/v1/token?grant_type=password`:
   - סיסמה חדשה → **200**, עם `access_token`.
   - סיסמה ישנה → **400** `invalid_credentials`.
6. **ניקוי.** חשבון הבדיקה `qa-reset-torah-0812@more30.com` נמחק, ונבדק שאיננו
   ברשימת המשתמשים.

## מגבלת המייל — ממצא נפרד שנמדד כאן ולא תוקן

ל-`bieebmnmkffwbqlsfozh` **אין SMTP מותאם**: `smtp_host`, `smtp_admin_email`
ו-`smtp_user` ריקים. כלומר מיילי האיפוס של 01 יוצאים דרך שירות המייל המובנה של
Supabase, שמוגבל בקצב ובפועל אינו מוסר לכתובות שאינן של חברי הצוות — הבקשה
בשלב 1 החזירה 200 ולא הופיעה ב-Resend. זו הסיבה שהטוקן בשלב 2 הופק דרך
`generate_link`.

**לא תוקן במכוון.** הפרויקט הזה נקרא `bkalut-production` ונושא את המערכות
המוגנות (08/09, `zr_*`), ו-SMTP הוא הגדרה של הפרויקט כולו — שינוי שלו נוגע גם
בהן. זה שינוי שדורש אישור מפורש, ולכן נרשם כפריט משלו ולא בוצע.

## שתי מלכודות שנדרסו בדרך

- **`index.html` החי אינו תוצר Vite.** `dist/index.html` הוא 5,408 בתים, וזה
  שמוגש בייצור הוא 28,950 — הוא נושא `<script id="prerender-seed">`, canonical,
  preconnect לגופנים ואת `auth-button.js`. העתקה של `dist` על התיקייה הייתה
  מוחקת את כל אלה. במקום זה הוחלפו בו שתי ההפניות בלבד
  (`index-Cg-YfQE5.js` → `index-B2ayyksV.js`, `index-C8bPiKNL.css` → `index-B82GkxsF.css`).
- **הפריסה היא מ-`_deploy/torah-more30`** ולא מתיקיית האפליקציה — שם יושב
  ה-`vercel.json` עם ה-rewrite ל-`/torah/:path*`, שבלעדיו כל `/torah/*` נופל.

## שאריות של סבב קודם שלא נגעתי בהן

בטבלת המשתמשים של 01 יושבים `qa-roundtrip-torah-0812-0x9x@more30.com` ו-
`qa-roundtrip-torah-0812-pnea@more30.com`, שניהם לא-מאומתים ומ-09:xx היום —
חשבונות QA של צעד אחר שלא נמחקו. נרשם, לא נמחק.
