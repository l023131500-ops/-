# תמלול מבית איגוד השיעורים

מערכת תמלול ועריכה אוטומטית של שיעורי תורה בעברית, מבוססת Next.js 14 + Supabase + OpenAI.

## תכונות

- 🎙️ **תמלול אוטומטי** של הקלטות שיעורים באמצעות OpenAI Whisper
- ✍️ **עריכה ספרותית** בשלושה סגנונות: ליטאי, חסידי, אידיש (GPT-4o)
- 📄 **3 קבצי DOCX** לכל שיעור: גולמי, ערוך עם הערות שוליים, מקורות
- 🎫 **מערכת קופונים** להגבלת שימוש לפי קוד הזמנה
- 🛡️ **פאנל אדמין** מוגן (אימייל מאושר בלבד)
- 📚 **מילון מונחים** מותאם לכל סגנון לתיקוני עריכה אוטומטיים

## תוכן עניינים

- [סטאק טכנולוגי](#סטאק-טכנולוגי)
- [התקנה](#התקנה)
- [משתני סביבה](#משתני-סביבה)
- [הקמת Supabase](#הקמת-supabase)
- [הרצה מקומית](#הרצה-מקומית)
- [פריסה](#פריסה)
- [ארכיטקטורה](#ארכיטקטורה)

## סטאק טכנולוגי

| רכיב | טכנולוגיה |
| --- | --- |
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Backend | Next.js API Routes (Node runtime) |
| DB / Auth / Storage | Supabase (schema: `transcribe`) |
| AI | OpenAI Whisper-1 + GPT-4o |
| Document generation | `docx` (Microsoft Word DOCX RTL) |

## התקנה

```bash
git clone https://github.com/l023131500-ops/igud-transcribe.git
cd igud-transcribe
npm install
cp .env.example .env.local
# מלא את כל משתני הסביבה ב-.env.local
```

## משתני סביבה

יצירת קובץ `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bieebmnmkffwbqlsfozh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Admin
ADMIN_EMAIL=l023131500@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=l023131500@gmail.com

# Optional
NEXT_PUBLIC_SITE_URL=https://transcribe.igud-shiurim.org
```

## הקמת Supabase

1. **Schema:** הריצי את `supabase/schema.sql` ב-SQL Editor של Supabase. הסקריפט יוצר schema בשם `transcribe` עם 8 טבלאות, RLS, אינדקסים ו-2 buckets לאחסון.

2. **חשיפת ה-schema:** Dashboard → Settings → API → Exposed schemas → הוסיפי `transcribe`.

3. **Storage buckets:** הסקריפט יוצר אוטומטית את `audio` ו-`docs` (פרטיים). אם נכשל, יש ליצור ידנית ב-Storage → New bucket.

4. **Google OAuth (אופציונלי):** Dashboard → Authentication → Providers → Google → הפעלה והגדרת Client ID/Secret.

## הרצה מקומית

```bash
npm run dev
```

הפתחי [http://localhost:3000](http://localhost:3000).

- אתר תדמית: `/`
- העלאה: `/upload`
- כניסת אדמין: `/login`
- פאנל אדמין: `/admin`

## פריסה

### Vercel (מומלץ)

```bash
npm install -g vercel
vercel
```

הוסיפי את כל משתני הסביבה ב-Settings → Environment Variables.

**חשוב:** Vercel חוסם בקשות מעל 4.5MB ב-Hobby. למסלולי העלאה (`/api/uploads`) ועיבוד (`/api/jobs`) — שדרגי ל-Pro או החליפי לאחסון ישיר ל-Supabase Storage מהדפדפן.

### Cron לעיבוד

הוסיפי b-Vercel Cron Jobs (או cron חיצוני) קריאה ל-`GET /api/jobs` כל דקה:

```json
{
  "crons": [{ "path": "/api/jobs", "schedule": "* * * * *" }]
}
```

לחלופין — הפעלה ידנית מתוך פאנל האדמין → דשבורד → "הפעל worker".

## ארכיטקטורה

```
┌─────────────────┐
│   משתמש קצה   │
└────────┬────────┘
         │ 1. הזנת קוד קופון + העלאת קובץ
         ▼
┌─────────────────────────┐
│  /api/coupons (POST)    │ ← אימות קוד
│  /api/uploads (POST)    │ ← העלאה ל-Storage + יצירת job
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   transcribe.jobs       │  ← queue (status='pending')
└────────┬────────────────┘
         │ Worker pull (cron / manual)
         ▼
┌─────────────────────────────────┐
│   /api/jobs (GET / POST)        │
│   1. download audio             │
│   2. Whisper transcribe         │
│   3. Save raw_text              │
│   4. Fetch glossary by style    │
│   5. GPT-4o edit + footnotes    │
│   6. Build 3 DOCX (RTL, David)  │
│   7. Upload to docs bucket      │
│   8. status='done'              │
└─────────────────────────────────┘
```

### קבצי לוגיקה מרכזיים

- `lib/transcribe.ts` — Whisper API (verbose_json עם duration)
- `lib/postprocess.ts` — GPT-4o עם 3 מדריכי סגנון + מילון
- `lib/footnotes.ts` — פרסור `[^N]` markers + extract context
- `lib/docx-generator.ts` — בניית DOCX עם RTL, font "David", הערות שוליים
- `lib/supabase/server.ts` — לקוחות SSR ו-service-role עם schema lock

### אבטחה

- `middleware.ts` חוסם `/admin/*` למי שאינו `ADMIN_EMAIL`
- כל הפעולות בקופונים/אדמין דרך `service_role` (לעולם לא חשוף ללקוח)
- Storage פרטי — קבצי DOCX מסופקים דרך signed URLs קצרי תוקף

## פיתוח עתידי

- [ ] תמיכה ב-chunking לקבצים מעל 24MB (Whisper limit)
- [ ] התראות מייל למשתמש כשהתמלול מוכן
- [ ] גרסה מותאמת למובייל
- [ ] תמיכה ביו"ד-משפיע ופלאש
- [ ] אינטגרציה למערכת האם (torah-platform)

## רישיון

© איגוד השיעורים. כל הזכויות שמורות.

---

**יצירת קשר:** 02-3131600 · a023131600@gmail.com
