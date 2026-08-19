
# דוח סריקה מקיף - Torah Connect / איגוד השיעורים

הבנייה עוברת בהצלחה (build OK), אך יש בעיות רבות. מסודר לפי חומרה. **לא בוצעו שינויים** - זו רק רשימה להחלטה.

---

## 🔴 קריטי (Security / Data Integrity)

### 1. RLS פתוח לחלוטין - כל הטבלאות
מדובר בבעיה המסוכנת ביותר. **52 מדיניויות RLS מסוג `USING (true)` / `WITH CHECK (true)`** על כמעט כל הטבלאות (lessons, contact_messages, rabbi_portals, org_portals, synagogue_portals, prayer_times, portal_messages, portal_photos, teacher_leads, seeker_leads, nedarim_submissions, ivr_submissions, bulk_upload_sessions, org_rabbis, study_day_events, study_day_sessions, synagogue_full_access_requests).

משמעות מעשית: **כל אדם עם ה-anon key (החשוף ב-.env)** יכול:
- לקרוא את כל פרטי הקשר של כל הרבנים והפונים (טלפון, אימייל)
- לעדכן/למחוק כל שיעור, פורטל, הודעה
- לגנוב את ה-`access_token` של כל פורטל רבני/ארגוני/בית כנסת → כניסה מלאה לפורטלים של אחרים
- לקרוא/לשנות תרומות ב-nedarim_submissions

### 2. Admin whitelist על צד לקוח בלבד
`AdminLogin.tsx` מכיל `ADMIN_WHITELIST = ["a023131600@gmail.com"]` - בדיקה בצד לקוח. כל משתמש מאומת יכול לגשת ל-`/admin` כי `ProtectedRoute` בודק רק `!!session`, לא תפקיד. אין טבלת `user_roles` כלל.

### 3. Access tokens של פורטלים חשופים בקריאה ציבורית
מדיניות `Anyone can read rabbi_portals` (וכן org, synagogue) מחזירה גם את שדה ה-token → כל אחד יכול לרשום את כל הפורטלים.

### 4. Storage buckets ציבוריים עם listing
שני buckets (`lesson-logos`, `portal-assets`) מאפשרים סריקת כל הקבצים ב-bucket.

### 5. Leaked-password protection כבוי בסופאבייס Auth.

---

## 🟠 בינוני (פונקציונליות / באגים)

### 6. Edge Function `chat` משתמש במודל שאינו קיים
`model: "google/gemini-3-flash-preview"` - שם דגם לא תקף בגייטוויי. `search-lessons` משתמש נכון ב-`gemini-2.5-flash`. הצ׳אטבוט של השאלון כנראה נכשל בשקט.

### 7. דפים לא מקושרים ב-Router
`Questionnaire.tsx`, `SeekerDashboard.tsx`, `TeacherDashboard.tsx` קיימים אך לא מופיעים ב-`App.tsx` → קוד מת / פיצ׳ר חצי-מוגמר.

### 8. Bundle גדול מדי
`index.js` = 1.6MB (gzip 470KB), `agud-logo.png` = 1.36MB (לא ממוזער, נטען בכל דף). אין code splitting.

### 9. `og:image` ב-index.html מקושר לתמונת preview של Lovable
זה יישבר עם publish/domain אמיתי (`id-preview--...lovable.app`).

### 10. חוסר עקביות בשמות מסלולים
`/teachers` (TeachersLanding) לצד `/request-lesson` ו-`/find-lesson` - אין דף `/seekers` המקביל, אך יש קומפוננטה `SeekerForm`. נראה כמו רפקטור לא-שלם.

### 11. הרשאות פורטל דרך URL token
כל פורטל (rabbi/org/synagogue) מזוהה רק לפי token ב-URL - ללא expiry, ללא rotation, ללא rate limiting. בשילוב עם RLS פתוח (#3) → סיכון מלא.

### 12. `contact_messages`, `teacher_leads`, `seeker_leads`
ניתנים למחיקה/עדכון ע״י כל anon. לידים נמחקים בקלות (מכוון/בזדון).

---

## 🟡 קל (איכות קוד / UX)

### 13. 22 קבצים עם `console.log/error/warn` בפרודקשן
כולל `AdminDashboard`, `AIChatBot`, edge functions - זליגת מידע ורעש.

### 14. `.env` מכיל את ה-publishable key (תקין אך יש לוודא שאינו secret key).

### 15. `caniuse-lite` ישן ב-13 חודשים - `npx update-browserslist-db@latest`.

### 16. `browserslist` old data - אזהרת build.

### 17. חוסר טיפול בשגיאות רשת ב-fetch של הגייטוויי
אין retry על 5xx (מזכיר constraint על NetFree - חשוב פה).

### 18. `LessonDirectory`/`FindLesson` - כפילות אפשרית
שני עמודים דומים לחיפוש שיעורים - צריך לבדוק אם אחד מיושן.

### 19. `Install.tsx` - עמוד PWA install נפרד
אבל אין `serviceWorker.register` בקוד → ה-manifest קיים אך PWA לא פעיל בפועל.

### 20. `og:image` דורש עדכון גם ב-shul / rabbi / org public pages (אין meta דינמי).

### 21. מוני `count` על lessons - שאילתת `SELECT city` ו-`SELECT subject` ב-`/api/cities` וב-`/api/subjects` מחזירות את **כל** השורות בלי pagination - יאט עם צמיחה.

### 22. שגיאה טיפוגרפית ב-CORS headers - מוזכר `x-supabase-client-platform-version` פעמיים בקבצים שונים אבל תקין.

---

## סיכום מספרי

| חומרה | מספר בעיות |
|---|---|
| קריטי | 5 |
| בינוני | 7 |
| קל | 10 |

---

## המלצה לסדר תיקון

1. **מיידי**: הקמת מערכת תפקידים (`user_roles` + `has_role`) והחלפת כל ה-`USING(true)` במדיניות מבוססת תפקיד/token עם `security definer function`. תיקון #1, #2, #3 יחד.
2. **מיידי**: החלפת מודל AI ב-`chat/index.ts` ל-`google/gemini-2.5-flash` (או `claude-sonnet-4-5` אם רצית להעביר לקלוד כפי שדיברנו).
3. **בהמשך**: ניקוי דפים לא-מקושרים, code splitting, storage bucket policies, PWA / og:image דינמי.

---

**איזה מהבעיות אתה רוצה שנתקן קודם?** מומלץ מאוד להתחיל מ-#1+#2+#3 (RLS + Admin roles + Portal tokens) כמקשה אחת - זה שיפוץ אבטחה יסודי אך מוגדר היטב.
