# השוואת קופות חולים — מבית בקלות

אתר עצמאי להשוואת זכויות והטבות בקופות החולים בישראל, לצד זכויות ממשלה וסיוע מעמותות. כולל סינון לפי נושא/קופה/קטגוריה, יועץ חכם (AI) המבוסס אך ורק על מידע ציבורי בסיסי, וטופס פנייה למעבר קופה.

## ארכיטקטורה

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui (RTL, עברית)
- **Backend:** Express (Node.js)
- **מסד נתונים:** SQLite מקומי (better-sqlite3 + Drizzle ORM) + Supabase (סכמת `kupot`) כמאגר עצמאי
- **יועץ חכם:** Anthropic Claude — מגובה אך ורק על מידע ציבורי, ללא חשיפת סכומים/שיעורים מדויקים

## מבנה נתונים (Supabase — סכמת `kupot`)

- `hf_topics` — נושאי זכויות והטבות (515 רשומות: 435 קופות, 65 ממשלה, 15 עמותות). קריאה ציבורית בלבד (RLS).
- `hf_switch_leads` — פניות "מעבר קופה". הכנסה בלבד (insert-only) — אין קריאה ציבורית של פניות.

## הרצה מקומית

```bash
npm install
cp .env.example .env   # מלאו SUPABASE_URL ו-SUPABASE_ANON_KEY
npm run dev
```

## בנייה

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## API

| נתיב | תיאור |
| --- | --- |
| `GET /api/hf/meta` | כותרת, ספירות, קטגוריות, קופות |
| `GET /api/hf/topics` | רשימת נושאים (סינון לפי query) |
| `GET /api/hf/topics/:id` | נושא בודד |
| `POST /api/switch-lead` | שליחת פנייה למעבר קופה (נשמרת ל-Supabase) |
| `GET /api/switch-leads` | רשימת פניות (לניהול) |
| `POST /api/agent` | שאלה ליועץ החכם על נושא |

## מדיניות מידע

חשיפה ציבורית של מידע בסיסי בלבד — קהל יעד, טווח כללי, ושמות קופות/מסלולים. סכומים מדויקים, שיעורי החזר וזמני המתנה מדויקים אינם מוצגים בציבור.

## סביבה (`.env`)

```
SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```
