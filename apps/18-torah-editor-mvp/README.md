# העורך התורני — מסמך מימוש ובנייה

מאגר זה מכיל את **מסמך המימוש והבנייה** של מערכת *העורך התורני* — עוזר AI לעריכה, הגהה, ניקוד ואימות מקורות בספרים תורניים, יחד עם מסמכי המחקר והמפרט המלאים.

## תוכן

| קובץ | תיאור |
|------|-------|
| `העורך_התורני_מסמך_מימוש.docx` | מסמך המימוש והבנייה — תעדוף, חיבורים, עלויות API, ארכיטקטורה, והוראת בנייה לקלוד |
| `העורך_התורני_מחקר_ומפרט.docx` | המפרט המקורי + מחקר מעמיק + טבלאות |
| `research_torah_editor.md` | קובץ המחקר המאוחד — Sefaria / DICTA / Otzaria, מודלי NLP, ארכיטקטורת RAG, ~65 מקורות |
| `research_hebrew_fonts.md` | מחקר גופנים עבריים — 40+ גופנים, התאמות לסוגי ספרים |

## עקרונות-על

1. **אפס הזיות** — כל מקור נשלף ממאגר אמין (Sefaria/DICTA) דרך tool-use, לעולם לא מזיכרון המודל.
2. **הטקסט קדוש** — שום טקסט של ספר לא משתנה ללא אישור אנושי מפורש.
3. **תאימות NetFree** — פריסה על Vercel עם דומיין אמיתי, ללא פרוקסי, ללא iframe.
4. **קודם היכולות, מנויים אחר-כך** — בונים את כל היכולות תחילה; שכבות המנוי נבנות מעל תשתית עובדת.

## סטאק

Next.js 14 (App Router, TypeScript) · Supabase (Postgres + pgvector + Auth + RLS) · Vercel · Sefaria API · DICTA · Anthropic Claude · Google Gemini

## שבע הפונקציות

1. זיהוי ציטוטים (Sefaria Linker)
2. אימות מקורות (Sefaria Texts API v3)
3. ניקוד רבני (DICTA Nakdan)
4. הגהה וראשי-תיבות (DICTA Expander)
5. נרמול פורמט מראי-מקום
6. המלצת כותרות (LLM — פרימיום)
7. בקרת-אדם / עורך דו-תצוגה (Review-and-Approve)


---

## מצב מימוש (עודכן אוטומטית)

החל מהקומיטים האחרונים בענף `master`, הפרויקט כולל שלד Next.js 14 (App Router, TypeScript) עם חיבורים אמיתיים לשירותים חיצוניים - לא מוקאפ:

- **זיהוי ציטוטים** - `app/api/citations/route.ts` מול Sefaria Linker API (`find-refs`).
- **אימות מקורות** - `app/api/verify/route.ts` מול Sefaria Texts API v3, כולל השוואת exact/fuzzy (Levenshtein) מול הטקסט החי.
- **ניקוד רבני** - `app/api/nikud/route.ts` מול DICTA Nakdan API (genre=rabbinic כברירת מחדל).
- **זיהוי משתמשים אמיתי** - Supabase Auth (מג'יק לינק/OTP) עם `@supabase/ssr`, middleware לרענון session, וסכימת `supabase/schema.sql` עם RLS על כל הטבלאות (`profiles`, `documents`, `citations`, `edits`).
- **ממשק עורך** - `app/editor/page.tsx`: טקסט חופשי, זיהוי ציטוטים, אימות מול המקור, והצעת ניקוד עם אישור ידני לפני קבלה (לפי עקרון "ביקורת ואישור אנושי" מהמחקר).

שים לב: קיים גם מודול נפרד `app/htr` + `supabase/migrations/0001_htr_jobs.sql` (מודול HTR - העלאה/עיבוד/אישור), שמקורו בעבודה קודמת ולא נגעתי בו כדי לא לפגוע בקיים. יש לבחון בהמשך אם לאחד בין הממשקים.

### הרצה מקומית

1. `npm install`
2. העתק `.env.example` ל-`.env.local` ומלא את הערכים (Supabase, Anthropic).
3. הרץ את `supabase/schema.sql` בפרויקט ה-Supabase שלך.
4. `npm run dev`
