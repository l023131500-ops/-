# Torah Platform · מערכת תורנית מאוחדת

> מערכת-על מאוחדת לאיגוד השיעורים, מועצות דתיות, ארגונים, בתי כנסת ומגידי שיעור.
> בנויה ארכיטקטורת **Multi-Tenant** עם **White-Label** מלא: כל גוף רואה את "האתר שלו" עם דומיין/צבעים/לוגו משלו, אבל הכל יושב על אותו קוד ואותו מסד נתונים.

## 🎯 מי המשתמשים?

| סוג טננט | מי? | דוגמה |
|---|---|---|
| `super_admin` | איגוד השיעורים – המרכז | egod.lovable.app/admin |
| `religious_council` | מועצה דתית | מועצה דתית גליל |
| `organization` | ארגון תורני | ארגון מחוברים |
| `synagogue` | בית כנסת | ביכ"נ "נר ישראל" |
| `maggid` | מגיד שיעור עצמאי | הרב יהודה בנישתי |
| `rabbi` | רב / מורה הוראה | הרב כהן |

## 🏗️ Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions + Realtime)
- **AI:** Lovable AI Gateway (Gemini 2.5 Flash) – להתאמת שיעורים
- **תשלומים:** Nedarim Plus (תרומות + מנויים + חנות תשמישי קדושה)
- **תאריך עברי + זמנים:** @hebcal/core

## 📁 מבנה

```
torah-platform/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui
│   │   ├── branding/        # BrandingProvider + dynamic theme
│   │   ├── layout/          # Navbar, Footer, Sidebar
│   │   ├── public/          # Landing pages, Hero, Tickers
│   │   ├── portal/          # ה-Portal של כל טננט
│   │   ├── admin/           # Super Admin + Tenant Admin
│   │   ├── shop/            # חנות תשמישי קדושה
│   │   ├── checkout/        # Nedarim Plus integration
│   │   ├── forum/           # פורומים נושאיים
│   │   └── calendar/        # לוח הספק לימודי + זמני תפילה
│   ├── pages/
│   │   ├── public/          # / , /find-lesson, /shop, etc.
│   │   ├── portal/          # /portal/*  (פר טננט)
│   │   ├── admin/           # /admin/*   (Super Admin + Tenant Admin)
│   │   └── shop/            # /shop/*    (קטלוג, מוצר, עגלה, צ'קאאוט)
│   ├── hooks/               # useAuth, useTenantBranding, useCart…
│   ├── lib/                 # tenant.ts, site.ts, nedarim.ts, hebcal.ts
│   └── integrations/supabase/
├── supabase/
│   ├── migrations/          # סדר זמני מלא
│   └── functions/
│       ├── activate-invite/
│       ├── ai-match-teacher/
│       ├── nedarim-webhook/        # IPN של נדרים פלוס
│       ├── nedarim-create-payment/ # יצירת תשלום
│       ├── shop-checkout/
│       └── notify-participants/
└── docs/                    # אפיון, מסמכי טננטים, מדריך פריסה
```

## ⚙️ משתני סביבה

`.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Supabase Edge Function Secrets:
```
NEDARIM_MOSAD_ID=...        # ה-Mosad ID שלך מנדרים פלוס
NEDARIM_API_PASSWORD=...    # סיסמת API של נדרים פלוס
LOVABLE_API_KEY=...         # ל-Gemini
```

## 🚀 הפעלה

```bash
bun install
bun run dev
```

## 📜 רישיון
פרטי – איגוד השיעורים בלבד.

---
*v1.0 · מאי 2026 · l023131500-ops*
