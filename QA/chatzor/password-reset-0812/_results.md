# 16 chatzor — איפוס סיסמה מקצה לקצה (core.issues #201, מערכת ראשונה)

נמדד 12/08/2026 מול הייצור (more30.com/chatzor), לא בסביבת פיתוח.

## המצב לפני
- ‏`grep` על העץ של chatzor: אפס מופעים של `resetPasswordForEmail`.
- ‏`/chatzor/auth/reset` החזיר 200 בזכות ה-SPA fallback והציג את עמוד הבית —
  כלומר קישור איפוס נחת על עמוד אמיתי שאינו קורא את הטוקן.
- ‏uri_allow_list של uhnrgujbdxhhmoxcjria נקרא לפני הכתיבה (Management API):
  `https://more30.com/**,https://more30.com`, ו-site_url `https://more30.com`.
  ‏chatzor יושבת על אותו פרויקט, ולכן לא נדרש שינוי בהגדרות Auth.

## הסיבוב שנמדד
1. ‏`/chatzor/admin/login` → הזנת test@more30.com → "שכחתי סיסמה" → הודעת אישור
   ‏(01-forgot-sent.png). המייל הגיע בפועל: Resend 19:39:17Z,
   ‏`redirect_to=https://more30.com/chatzor/auth/reset?next=%2Fadmin`.
2. ‏`/chatzor/gabai/login` → אותו מסלול → `next=%2Fgabai`. כלומר היעד נגזר
   מהמסך שממנו נשלחה הבקשה ולא קבוע.
3. פתיחת הקישור נחתה ב-`/chatzor/auth/reset`, הטוקן נקרא ונוקה משורת הכתובת,
   והמסך הציג "הקישור אומת עבור test@more30.com" (02-reset-verified.png).
4. על חשבון הבדיקה המשותף הוזנה במכוון הסיסמה הקיימת: השרת החזיר שגיאת
   שימוש-חוזר והמסך תרגם אותה נכון ("הסיסמה החדשה זהה לקודמת") — כלומר
   ‏updateUser מגיע לשרת עם סשן חי, בלי לשנות סיסמה של חשבון שמערכות אחרות
   משתמשות בו.
5. מסלול ההצלחה על חשבון חד-פעמי (qa-chatzor-0812@more30.com): הרשמה עם סיסמה
   ‏A, איפוס דרך המייל, הזנת סיסמה B → מעבר אוטומטי ל-`/chatzor/gabai`
   ‏(03-after-reset-gabai.png), כלומר `next` שרד את ניקוי שורת הכתובת.
   מול ה-API: כניסה עם B מחזירה 200 עם access_token, כניסה עם A מחזירה 400.
   החשבון נמחק — auth.users ו-core.app_memberships חזרו לאפס שורות.

## פריסה
‏`_deploy/chatzor-more30` (השיטה של הפרויקט: dist מסונכרן לתוך `chatzor/`,
‏vercel.json מחזיק את ה-rewrite, ואז `vercel deploy --prod`).
דריסה: `dpl` אחרון = chatzor-more30-c5bghtjey, production, READY.

## תקלה שנגרמה ותוקנה באותו צעד — לתיעוד
פריסה ראשונה נעשתה בטעות מתיקיית האפליקציה (`apps/16-chatzor-connect`) ולא
מתיקיית ה-staging. התוצאה: כל נתיבי `/chatzor/*` החזירו 404 בייצור, כי הפלט
הוגש מהשורש ולא מתחת ל-`/chatzor/` ובלי ה-rewrite. הייצור הוחזר תוך דקה
ב-`vercel promote` לפריסה הקודמת (dpl_9ZccgHCYfbTk1wt2hAGf3nrYaAEf), אומת
ב-200 על שלושה נתיבים, ורק אז נבנתה הפריסה הנכונה.

בנוסף: index.html החי אינו התוצר הגולמי של Vite אלא תוצר של
‏`scripts/prerender-spa.mjs` (30KB מול 3KB). סנכרון dist בלבד היה מוריד את
התוכן המוקדם-לצביעה של עמוד הבית; הסקריפט הורץ מחדש לפני הפריסה, ואומת
ב-30,623 בייטים לכל נתיב.
