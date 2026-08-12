# 30 crm — מדוע קישור איפוס הסיסמה נוחת על דומיין הארגז (core.issues #202)

**נמדד 12/08/2026, ‏20:4xZ. נתוני אמת בלבד — כל ערך כאן הוחזר משרת, לא הוסק.**

## מה נבדק

‏`core.issues #202` נפתח היום בסגירת החצי הראשון (commit `6679a31`): האפליקציה
של 30 שולחת `resetPasswordForEmail` עם
`redirect_to=https://more30.com/crm/reset-password`, השרת עונה 200, והמייל
שהגיע בפועל (Resend, 20:00:57Z, `no-reply@auth.lovable-app.email`) הפנה אל
`https://zchuyot-care-hub.lovable.app/dashboard`. הכרטיס נרשם עם `blocked_on`
**ריק** — כלומר כפריט שאפשר לבצע לבד. הצעד הזה בדק את ההנחה הזאת.

## 1. הפרויקט אינו נגיש ל-PAT — נמדד, לא הונח

`GET https://api.supabase.com/v1/projects` עם `SUPABASE_ACCESS_TOKEN`
מ-`core.secrets` מחזיר 200 ועשרה פרויקטים:

| ref | שם | status |
|---|---|---|
| `rpamomtvqweqqiotgtta` | ניהול תקציב חכם | INACTIVE |
| `eygjmfftosigbmzpndib` | מחוברים | INACTIVE |
| `zxckwefnuectxqhtpfib` | חיבור לשיעורים | INACTIVE |
| `tltfpznyqxpuydgefmnp` | chatzor-connect | INACTIVE |
| `bieebmnmkffwbqlsfozh` | bkalut-production | ACTIVE_HEALTHY |
| `csjekrvukbdznetsrodj` | bkalut-production-user-owned | ACTIVE_HEALTHY |
| `tsnmjjnollodauelnvsz` | b023131500@gmail.com's Project | INACTIVE |
| `svvpuypogqnkgcmtqlgu` | זכויות פרו | INACTIVE |
| `qkszcdkzgfcpfwvskdna` | l023131500-ops's Project | INACTIVE |
| `uhnrgujbdxhhmoxcjria` | l023131500-ops's Project | ACTIVE_HEALTHY |

‏**`jhbeelzvjvhnkxldqvxx` — הפרויקט של 30 — אינו ברשימה.** לכן המסלול שסגר את
‏#198 (‏`PATCH /v1/projects/{ref}/config/auth`) אינו קיים כאן. זה נמדד ולא הוסק
מזיכרון: אחת מעשר השורות נושאת את השם «זכויות פרו», ובלי הבדיקה אפשר היה לחשוב
שהיא הפרויקט הנכון — היא אינה, וגם היא `INACTIVE`.

## 2. סוכן Lovable — קורא את ההגדרות, אינו יכול לכתוב אותן

נשלחה הודעה אחת לפרויקט `bd2a22c4-2430-49f4-921c-f89cb3175fff`
(`zchuyot-care-hub` / ZchuyotPro CRM), מנוסחת כהגדרת-שרת בלבד ועם איסור מפורש
לגעת בקוד. הסוכן חיפש כלי מתאים, מצא ש-`configure_auth` שברשותו חושף רק
`disable_signup` / `auto_confirm_email` / `password_hibp_enabled` /
`rate_limit_email_sent`, והריץ `debug_oauth_server` כדי לקרוא את המצב.

**התשובה, מילה במילה — זהו המצב היום בייצור:**

- **Site URL:** `https://zchuyot-care-hub.lovable.app`
- **Redirect URL allow list:**
  - `https://id-preview*--bd2a22c4-2430-49f4-921c-f89cb3175fff.lovable.app/**`
  - `https://id-preview*--bd2a22c4-2430-49f4-921c-f89cb3175fff.*.lovable.app/**`
  - `https://bd2a22c4-2430-49f4-921c-f89cb3175fff.lovableproject.com/**`
  - `https://preview--zchuyot-care-hub.lovable.app/**`
  - `https://zchuyot-care-hub.lovable.app/**`

חמש השורות הן ברירות המחדל של Lovable. **‏`more30.com` אינו מופיע באף אחת מהן**,
ולכן ההסבר שנרשם ב-#202 אומת מהצד השני: `redirect_to` שאינו ברשימה נזרק בשקט
והמשתמש נשלח ל-Site URL. זו אינה תקלה באפליקציה — האפליקציה שולחת את הכתובת
הנכונה.

הסוכן סיכם: *"I cannot make these backend auth URL changes with the tools
available to me… They must be changed in the project's backend/auth
configuration UI."*

## 3. מה שכן השתנה בפרויקט Lovable, ולא ביקשתי

ההודעה נשאה `cost_credits: 1.1` וייצרה commit `9eedb59` למרות שהסוכן לא נגע
בקוד המוצר. ה-diff נקרא במלואו ומכיל **רק** תחזוקת כלים של הפלטפורמה עצמה:
`package.json` — הצמדת `@lovable.dev/vite-tanstack-config` מ-`^2.3.2` ל-`2.12.0`;
`src/routeTree.gen.ts` — הוספת בלוק `declare module '@tanstack/react-start'`
שנוצר אוטומטית. אין שינוי בלוגיקה, במסד או בסליקה. נרשם כאן כי זה קרה בפרויקט
חי ולא הייתה עליו בקשה.

## מה זה אומר

‏#202 אינו פריט שאפשר לבצע לבד. שני המסלולים היחידים לפרויקט הזה נסגרו במדידה:
ה-PAT אינו רואה אותו, וסוכן Lovable יכול לקרוא את ההגדרה אך לא לשנות אותה.
נותרה פעולה אחת בדשבורד, והיא של המשתמש. הכרטיס עודכן ל-`blocked_on` מלא
והתיעוד נכנס ל-`NEEDS_USER.md` §0ק.

## מה לא נטען

- **לא נשלח מייל איפוס נוסף בצעד הזה.** המדידה של המייל עצמה נעשתה בצעד הקודם
  (‏20:00:57Z ב-Resend) והיא בת פחות משעה; לא היה מה להוסיף בשליחה חוזרת.
- **לא נבדק אם אותה בעיה קיימת ב-15/21/22/31.** ארבע המערכות הנותרות של #201
  יושבות על פרויקטים אחרים ולכל אחת מהן יש רשימת הרשאות משלה. הן לא נמדדו כאן
  ולכן לא נטען עליהן דבר — זה הצעד הבא בקו הזה.
- **לא נבדק אם שינוי ה-Site URL ישבור את הכניסה ב-`zchuyot-care-hub.lovable.app`.**
  היא כן תושפע, וזה כתוב בהמלצה למשתמש.
