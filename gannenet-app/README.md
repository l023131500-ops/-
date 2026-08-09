# גננת בקליק — אפליקציית הבסיס (Next.js)

מערכת תוכן פדגוגי + AI לגננת בגן החרדי (גיל 1–6). זו נקודת הפתיחה העובדת; ההרחבה למוצר המוגמר מתוארת ב-`CLAUDE-CODE-BUILD-BRIEF.md`.

## הרצה מקומית
```bash
npm install
npm run dev      # http://localhost:3000
```
בנייה לפרודקשן: `npm run build && npm run start`.

## משתני סביבה
צור `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...   # למחולל דפי המשימה בזמן אמת (אופציונלי — בלעדיו מוצגת תצוגת דוגמה)
```

## מבנה
- `app/` — עמודים: בית, מאגר (`library`), מערך (`lesson/[id]`), מחולל AI (`generator`), דפי קשר (`newsletter`), לוח עברי (`calendar`), מחירים (`pricing`).
- `app/api/ai-generate/` — נתיב שרת ל-Claude (System Prompt קשיח מובנה).
- `content/mashlima.json` — 47 מערכי העשרה מלאים (גננת משלימה).
- `content/regular.json` — 5 מפגשי ראש השנה מלאים (גננת רגילה).
- `components/`, `lib/`, `tailwind.config.ts`.

## תאימות נטפרי
כל הנכסים מקומיים, אין CDN חיצוני, פונטי מערכת. רינדור PDF עתידי — בצד שרת בלבד.

## המשך פיתוח
ראה `CLAUDE-CODE-BUILD-BRIEF.md` (נוסח בנייה מלא) ו-`גננת-בקליק-מסמך-אב-מאוחד.md` (מסמך אב). אל תמחק תוכן קיים ב-`content/` — רק הרחב.
