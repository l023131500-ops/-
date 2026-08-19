# יוצר מודעות AI — איגוד השיעורים (igud-ads)

מערכת SaaS פעילה ליצירת מודעות מקצועיות לשיעורי תורה, גמ"ח, בית כנסת ואירועים — בעברית מלאה, באמצעות בינה מלאכותית.

## ארכיטקטורה

```
Next.js 14 (App Router, TS, Tailwind, RTL)
        │
        ├── Public (/)
        │   ├── דף בית
        │   ├── /create  (אשף 5 שלבי: קופון → מסלול → פרמטרים → AI → בחירה)
        │   └── /result/[id]  (הורדת PNG / WhatsApp / PDF)
        │
        ├── /admin (אדמין — middleware allowlist)
        │   ├── דשבורד KPI + הרצת Worker
        │   ├── ניהול קופונים
        │   ├── רשימת פרויקטים + הצגת ווריאציות
        │   ├── ניהול תבניות
        │   └── הגדרות מערכת
        │
        └── /api
            ├── /coupons/verify           (בדיקת קופון)
            ├── /projects (POST), /projects/[id] (GET)
            ├── /generations/[id]/select  (בחירת ווריאציה)
            ├── /jobs/worker  (cron, כל דקה)
            ├── /jobs/cleanup (cron יומי)
            ├── /payments/create + /payments/webhook  (Nedarim Plus)
            ├── /admin/{stats,coupons,projects,templates,settings}
            └── /auth/callback

Supabase
        ├── schema "ads" (7 טבלאות + RLS + audit log)
        └── Storage: ad-sources (20MB), ad-outputs (50MB)

OpenAI
        ├── gpt-image-1   (יצירת רקע גרפי)
        └── gpt-4o vision (ניתוח מודעה קיימת לשכפול)
```

## פייפליין יצירה

1. **משתמש** מזין קוד קופון בטופס `/create`.
2. **שרת** מאמת `ad_coupons` (פעיל, לא פג תוקף, יש מכסה).
3. **משתמש** בוחר מסלול: מודעה חדשה / שכפול מודעה קיימת.
4. **משתמש** ממלא פרמטרים: שם רב, שיעור, יום, שעה, מקום, פלטת צבעים, פרטי קשר.
5. **API** יוצר `ad_projects` + `ad_jobs` עם `status=pending`, ומפעיל worker.
6. **Worker** (`/api/jobs/worker`):
   - אם clone — מנתח עם GPT-4o vision להוצאת פלטה + מבנה.
   - בונה prompt לכל וריאציה (3) → `gpt-image-1` יוצר רקע 1024×1536.
   - `sharp` מטמיע טקסט עברית מושלם (David font, RTL) בשכבת SVG.
   - יוצא 3 קבצים לכל וריאציה: `main.png`, `whatsapp.png` (1080×1080), `poster.pdf` (A4).
   - מעלה ל-`ad-outputs` בנתיב `{project_id}/v{n}/...`.
   - מסמן `ad_projects.status='ready'`.
7. **משתמש** רואה 3 ווריאציות, בוחר אחת — `selected_generation_id` נשמר.
8. **מודעה מוכנה** ב-`/result/[id]` עם 3 קישורי הורדה.

## משתני סביבה

```env
NEXT_PUBLIC_SUPABASE_URL=https://bieebmnmkffwbqlsfozh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service-role>
OPENAI_API_KEY=<key>
ADMIN_EMAIL=l023131500@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=l023131500@gmail.com
NEXT_PUBLIC_SITE_URL=https://ads.igud-shiurim.org

# Nedarim Plus (אם רוצים מסלול תשלום במקום קופון):
NEDARIM_MOSAD_ID=7016674
NEDARIM_API_VALID=LU/Aw5hcm1
NEDARIM_API_PASSWORD=nc334
```

## פריסה ל-Vercel

1. ‏Push ל-GitHub.
2. ב-Vercel: Import → הוספת ENV → Deploy.
3. ‏`vercel.json` מכיל cron אוטומטי — `/api/jobs/worker` כל דקה, `/api/jobs/cleanup` יומי.
4. ב-Supabase: Settings → API → Exposed schemas → הוסף `ads`.
5. ‏Authentication → Providers → הפעל Google.
6. ‏Authentication → URL Configuration → הוסף את ה-callback של Vercel: `https://<your-domain>/auth/callback`.

## אינטגרציות עם המערכת הראשית

- **torah-platform** — דף הבית כולל קישור ל-`ads.igud-shiurim.org`.
- **transcribe** — קישור הדדי.
- **Nedarim Plus** — אותם credentials (Mosad 7016674) של torah-platform.

## איך לבדוק

הקופון `IGUD-ADS-DEMO` (5 שימושים) מוזרק אוטומטית בטעינת הסכמה.

```
http://localhost:3000/create
→ הזן: IGUD-ADS-DEMO
→ מסלול: מודעה חדשה
→ פרטים: רב X, שיעור Y, יום A, שעה B, מקום C
→ צור 3 ווריאציות
→ בחר → הורד PNG/PDF/WhatsApp
```

## רישיון

מבית **איגוד השיעורים**.
פרטי קשר: 02-3131600 · a023131600@gmail.com
