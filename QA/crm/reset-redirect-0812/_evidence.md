# 30 crm — הקישורים שנשלחו במייל ויתרו על ‎/crm‎ (12/08)

## מה נמדד לפני שנגעתי (ייצור, בלי דפדפן)

| כתובת | לפני |
|---|---|
| `https://more30.com/reset-password` | **404** — היעד ש-`resetPasswordForEmail` שלח אליו |
| `https://more30.com/crm/reset-password` | 200, מסך «איפוס סיסמה · זכויות פרו» |
| `https://more30.com/dashboard` | **404** — היעד ש-`signUp` שלח אליו |
| `https://more30.com/crm/dashboard` | 200 |

‏`/crm/assets/auth-BYKK1sBH.js` (החבילה שהייתה חיה) הכילה
`resetPasswordForEmail`, `reset-password` ו-«שכחתי סיסמה» — כלומר שני חצאי
האיפוס כבר היו בנויים ב-30 ופרוסים, בניגוד למה ש-core.issues #201 טען. מה
שהיה שבור הוא היעד: הראוטר של 30 חסר `basepath` (בניגוד ל-31 שיש לו
`basepath: "/gesher"`), ולכן `window.location.origin` לבדו הפיל כל קישור
שנשלח במייל אל שורש more30.com, שם אין את המסכים האלה.

## התיקון

`src/routes/auth.tsx` — עוזר אחד, `appUrl()`, שנשען על
`import.meta.env.BASE_URL` (אותו `/crm/` שהבנייה כבר משתמשת בו לנכסים,
ולכן מקור אמת אחד). שני הקוראים: `resetPasswordForEmail` ו-`signUp`.
בחבילה הבנויה זה מתקמפל ל-``const P=a=>`${window.location.origin}/crm/${a}` ``.

## איך זה נמדד אחרי — מול הייצור

1. `vercel deploy --prod` (מהמקור, לא `--prebuilt`) → `dpl_HENgfaJQYVucUQtMQb8Pg21J2KkE`,
   READY, alias `crm-more30.vercel.app`.
2. `https://more30.com/crm/assets/auth-B8tQ0GYy.js` — החבילה החדשה מכילה
   ``${window.location.origin}/crm/${a}``.
3. בדפדפן ב-`https://more30.com/crm/auth`: «שכחתי סיסמה» → `test@more30.com` →
   «שלח קישור איפוס». הבקשה שיצאה בפועל (`01-reset-requested.png`, לוג הרשת):
   `POST https://jhbeelzvjvhnkxldqvxx.supabase.co/auth/v1/recover?redirect_to=https%3A%2F%2Fmore30.com%2Fcrm%2Freset-password` → **200**.
   לפני התיקון אותה בקשה נשאה `redirect_to=https://more30.com/reset-password` — כתובת 404.

## מה עדיין שבור, ולמה זה לא נסגר כאן

המייל הגיע (Resend, 20:00:57Z, `no-reply@auth.lovable-app.email`), ופתיחת
הקישור נחתה על **`https://zchuyot-care-hub.lovable.app/dashboard`** —
לא על `/crm/reset-password` (`02-link-lands-on-lovable-sandbox.png`).

זו התנהגות מוגדרת של Supabase: `redirect_to` שאינו ב-`uri_allow_list` נזרק
בשקט והמשתמש נשלח ל-`site_url`. כלומר לפרויקט `jhbeelzvjvhnkxldqvxx`
ה-`site_url` הוא עדיין דומיין הארגז של Lovable, וה-allow list אינו מכיל את
more30.com — בדיוק המחלקה ש-#198 תיקן ל-`csjekrvukbdznetsrodj`.

הפרויקט הזה **אינו** אחד מעשרת הרפים שה-PAT מכסה, ולכן
`PATCH /v1/projects/{ref}/config/auth` אינו זמין מכאן; הנתיב הסביר הוא
Lovable. נרשם ככרטיס נפרד ולא נבלע כאן.

התיקון בצעד הזה הוא תנאי הכרחי ולא מספיק: הכתובת שנשלחת נכונה עכשיו, ולכן
ברגע שה-allow list ייפתח הזרימה עובדת בלי נגיעה נוספת בקוד.

לא הוזנה סיסמה חדשה — `test@more30.com` משותף למערכות אחרות.
