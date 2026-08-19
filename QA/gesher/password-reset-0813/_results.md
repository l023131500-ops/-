# 31 גשר — איפוס סיסמה (#201), ומה שנמצא בדרך: כל more30.com מחזיר 402

תאריך: 13/08/2026. ענף `fix/nadlan-a11y`.

## 1. מה נמדד לפני שנגעתי בכלום

`core.issues #201` מורה במפורש, בגוף הכרטיס: *"לכל אחת צריך לקרוא את
uri_allow_list שלה קודם"*. הקריאה הזאת בוצעה ראשונה.

**כיסוי ה-PAT — נמדד, לא הונח.** `GET https://api.supabase.com/v1/projects` עם
`SUPABASE_ACCESS_TOKEN` שב-`core.secrets` מחזיר עשרה פרויקטים:

```
rpamomtvqweqqiotgtta  ניהול תקציב חכם                INACTIVE
eygjmfftosigbmzpndib  מחוברים                        INACTIVE
zxckwefnuectxqhtpfib  חיבור לשיעורים                 INACTIVE
tltfpznyqxpuydgefmnp  chatzor-connect                INACTIVE
bieebmnmkffwbqlsfozh  bkalut-production              ACTIVE_HEALTHY
csjekrvukbdznetsrodj  bkalut-production-user-owned   ACTIVE_HEALTHY
tsnmjjnollodauelnvsz  b023131500@gmail.com's Project INACTIVE
svvpuypogqnkgcmtqlgu  זכויות פרו                     INACTIVE
qkszcdkzgfcpfwvskdna  l023131500-ops's Project       INACTIVE
uhnrgujbdxhhmoxcjria  l023131500-ops's Project       ACTIVE_HEALTHY
```

`ygaqqnuyfnumezxxmtbh` (הפרויקט של 31) **אינו** ברשימה — כלומר המסלול שסגר את
‎#198‎ ו-#201/01 אינו קיים כאן, ואי אפשר לקרוא ממנו את ההגדרה ישירות.

**המסלול השני נבדק וכן עבד: סוכן Lovable, קריאה-בלבד.** פרויקט Lovable של 31 זוהה
לא לפי ניחוש שם אלא לפי מזהה שיושב בקוד עצמו — `src/routes/__root.tsx` נושא
`og:image` עם `a27fd5fd-3de2-432b-b267-f05f58afad50`, וזה בדיוק ה-id של
`heb-connect-hub` ברשימת הפרויקטים. הודעה אחת ב-plan mode, מנוסחת כקריאה בלבד ועם
איסור מפורש לגעת בקוד, החזירה את מצב השרת:

| הגדרה | הערך שהשרת מחזיק היום |
|---|---|
| Site URL | `https://heb-connect-hub.lovable.app` |
| Redirect allow list | `https://id-preview*--a27fd5fd-…lovable.app/**`<br>`https://id-preview*--a27fd5fd-….*.lovable.app/**`<br>`https://a27fd5fd-….lovableproject.com/**`<br>`https://preview--heb-connect-hub.lovable.app/**`<br>`https://heb-connect-hub.lovable.app/**` |

חמש שורות, כולן ארגז Lovable, **אין בהן `more30.com`**. זה בדיוק המצב של 30
(#202) — ולכן נפתח #205 והוא נרשם ב-`NEEDS_USER.md §0ש`. הסוכן לא ערך שום קובץ.

**מצב הקוד לפני השינוי:** ל-31 לא הייתה נקודת כניסה «שכחתי סיסמה» באף מסך, ולא
היה מסלול שמקבל את הטוקן. `src/routes/auth.tsx` הכיל התחברות, הרשמה ו-Google
בלבד; `src/lib/authErrors.ts` אף כותב זאת במפורש בתיעוד שלו: *"המסך הזה כולל
התחברות והרשמה בלבד (אין בו מסלול איפוס סיסמה)"*.

## 2. מה נבנה

- **`src/routes/reset-password.tsx`** — המסך שהיה חסר. קורא את הטוקן (גם `?code=`
  וגם hash), מציג את בעל החשבון בשמו, מבקש סיסמה חדשה ואימות שלה, וקורא
  ל-`updateUser`. מנקה את הטוקן משורת הכתובת אחרי שנקרא, כדי שלא יישלח ב-Referer
  ולא יישמר בהיסטוריה. קישור שפג מקבל הודעה שאומרת מה קרה ומה לעשות.

  **שם הקובץ נבחר ולא נפל במקרה:** נקודה בשם קובץ היא קינון אצל TanStack Router,
  ולכן `auth.reset.tsx` היה הופך את `auth.tsx` לתבנית שחייבת `<Outlet/>` — ומכיוון
  שאין בה כזה, המסך היה נטען לכתובת ולא מוצג. לכן `/reset-password` ולא
  `/auth/reset`. זו גם הכתובת שבה משתמשת 30.

- **`src/routes/auth.tsx`** — «שכחתי סיסמה» בלשונית ההתחברות. התשובה זהה בין
  כתובת רשומה לשאינה רשומה, כדי שהטופס לא יהפוך לכלי שבודק אילו כתובות רשומות
  אצלנו; חסימת קצב היא היוצאת מן הכלל, כי היא ההודעה היחידה שמסבירה למה כלום לא
  קרה.

**הבאג של 30 (#201) נמצא כאן בשלושה מקומות, לא באחד.** 31 מוגשת תחת `/gesher`
(`base` ב-`vite.config.ts`, `basepath: "/gesher"` ב-`src/router.tsx`), אבל שלוש
כתובות חזרה נבנו מ-`window.location.origin` לבדו ולכן ויתרו על הקידומת:

| מקום | לפני | אחרי |
|---|---|---|
| `handleSignup` → `emailRedirectTo` | `${origin}/` | `appUrl("")` → `https://more30.com/gesher/` |
| `handleGoogle` → `redirect_uri` | `origin` | `appUrl("")` |
| «שכחתי סיסמה» → `redirectTo` | *(לא היה קיים)* | `appUrl("reset-password")` |

שתי השורות הראשונות הן באג קיים שנמצא אגב העבודה: כל קישור אישור הרשמה של 31, וכל
חזרה מ-Google, הצביעו עד היום ל-`more30.com/` במקום ל-`more30.com/gesher/`.
העוזר `appUrl` בונה מ-`import.meta.env.BASE_URL` ולא מ-origin.

## 3. איך זה נבדק — ומה לא ניתן היה לבדוק, ולמה

**נבדק:** בנייה מלאה של האפליקציה, `vite build` בתוך `apps/31-hebrew-bridge-crm`,
יצאה בהצלחה (exit 0, `built in 3m 45s`). המסלול החדש אכן נקלט — הוא מופיע
ב-`src/routeTree.gen.ts` שנוצר מחדש (`import { Route as ResetPasswordRouteImport }
from './routes/reset-password'`, `path: '/reset-password'`) ויש לו חבילה משלו
בפלט: `.vercel/output/static/assets/reset-password-Bu23D5Jh.js` (4,675 בתים).

**לא נבדק בייצור, ולא בגלל בחירה:** בזמן הבדיקה שלפני הפריסה נמצא ש-**כל**
`more30.com` מחזיר `402 Payment Required` עם גוף ריק — לא רק `/gesher`:

```
https://more30.com/?cb=1          => 402
https://more30.com/gesher/?cb=1   => 402
https://more30.com/crm/?cb=1      => 402
https://more30.com/galil/?cb=1    => 402
```

המקור נמדד ולא נוחש. `GET https://api.vercel.com/v2/teams/team_NLONMgS3DlFsznzcrz0j3OMs`:

```
softBlock       = {"reason":"UNPAID_INVOICE","blockedAt":1786568292853}
billing.plan    = pro
billing.status  = canceled
billing.period  = 11/08 07:00Z → 11/09 07:00Z
```

`blockedAt` הוא **12/08 20:58:12Z**. הפעימה הקודמת סיימה ופרסה בהצלחה ב-20:38Z —
עשרים דקות לפני כן. כלומר כל 38 הפריסות ירדו יחד ברגע אחד, וזה אינו קשור לשום
שינוי קוד. נפתח #204 קריטי ונרשם ב-`NEEDS_USER.md §0ר`.

לכן **לא בוצעה פריסה בצעד הזה, ובמכוון**: פריסה חדשה לא הייתה נראית בשום מקרה, וגם
לא ניתן היה לאמת אותה. הקוד נבנה מקומית ומחכה לפריסה ברגע שהחסימה תיפתח.

## 4. מה נשאר פתוח, במפורש

- **#204** (קריטי, משתמש): תשלום החשבונית ב-Vercel. עד אז אין פריסה ואין אימות
  בייצור לשום מערכת.
- **#205** (משתמש): `uri_allow_list` של `ygaqqnuyfnumezxxmtbh`. עד אז קוד האיפוס
  של 31 שלם אבל הקישור שנשלח במייל ייזרק בשקט על ידי Supabase.
- **#201** נשאר פתוח על **15, 21, 22** בלבד. שלושתן על פרויקטים מחוץ לכיסוי ה-PAT,
  ושלושתן נפרסות דרך Lovable ולא מהריפו הזה — כלומר לכל אחת צריך קודם את אותה
  קריאת `uri_allow_list` שבוצעה כאן.
