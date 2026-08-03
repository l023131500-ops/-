# הוראות התקנה והפעלה — Torah Platform

## 1. סופר־בייס (Supabase)

### יצירת פרויקט
1. כנס ל-https://supabase.com/dashboard
2. צור פרויקט חדש (Region: `Frankfurt (eu-central-1)` או הקרוב ביותר לישראל)
3. שמור את `Project URL`, `anon (public) key`, `service_role key`

### הרצת המיגרציות (יצירת מסד הנתונים)
שיטה א' — דרך Supabase Studio:
1. כנס ל-SQL Editor
2. הרץ את הקבצים לפי הסדר:
   - `supabase/migrations/20260519000001_core_tenants.sql`
   - `supabase/migrations/20260519000002_torah_content.sql`
   - `supabase/migrations/20260519000003_commerce.sql`
   - `supabase/migrations/20260519000004_storage_seed.sql`

שיטה ב' — דרך Supabase CLI:
```bash
npm i -g supabase
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase db push
```

### Edge Functions — פריסה
```bash
supabase functions deploy nedarim-create-payment
supabase functions deploy nedarim-webhook
supabase functions deploy activate-invite
supabase functions deploy ai-match-teacher
```

### הגדרת Secrets ב-Edge Functions
ב-Supabase Studio → Project Settings → Edge Functions → Secrets:
```
NEDARIM_MOSAD_ID=<מספר המוסד שלך מנדרים פלוס>
NEDARIM_API_PASSWORD=<סיסמת API שקיבלת מנדרים פלוס>
LOVABLE_API_KEY=<אופציונלי — לשימוש ב-AI matching>
```

### Webhook — נדרים פלוס
בלוח הבקרה של נדרים פלוס, הגדר את ה-Status URL לכתובת:
```
https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/nedarim-webhook
```

## 2. פרונט-אנד

### התקנה מקומית
```bash
git clone https://github.com/l023131500-ops/torah-platform.git
cd torah-platform
npm install
cp .env.example .env
# ערוך את .env עם פרטי הסופאבייס שלך
npm run dev
```

### משתני סביבה (.env)
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### בנייה לפרודקשן
```bash
npm run build
```
התוצאה ב-`dist/`. ניתן לפרוס ל-Vercel, Netlify, Cloudflare Pages או כל שירות הוסטינג סטטי.

## 3. ניהול ראשוני

### יצירת סופר אדמין
לאחר ההרצה הראשונית והרשמה לאתר עם המייל שלך, הרץ ב-SQL Editor:
```sql
-- מצא את ה-user_id שלך
select id, email from auth.users where email = 'your-email@example.com';

-- הוסף תפקיד super_admin
insert into user_roles (user_id, role)
values ('<user-id-from-above>', 'super_admin');
```
עכשיו תוכל לגשת ל-`/admin`.

### יצירת ארגון חדש
1. כנס ל-`/admin/tenants`
2. לחץ "ארגון חדש"
3. בחר סוג: בית כנסת / מועצה דתית / ארגון / מגיד / רב
4. לחץ צור — תכונות וברנדינג ייווצרו אוטומטית
5. כנס לפרטי הארגון ופעל/כבה תכונות לפי הצורך

### גישה לכל ארגון
- בכתובת ה-URL: `https://yoursite.com/t/<slug-של-הארגון>`
- או בדומיין משנה: `slug.yoursite.com`
- או בדומיין מותאם: `tenants.custom_domain = "your-domain.com"`

## 4. ארכיטקטורה

ראה `docs/architecture.md` למפרט מלא של המערכת.

עיקרי הדברים:
- מולטי-טננט מלא דרך טבלת `tenants`
- RLS על כל הטבלאות עם הגנת `tenant_id`
- White-label: כל ארגון רואה מיתוג שלו בלבד (פונטים, צבעים, לוגו, hero)
- סליקה דרך נדרים פלוס (חד-פעמי / הוראת קבע / מנוי)
- חנות תשמישי קדושה עם עגלה
- AI Matching לשיעורים דרך Lovable Gateway
