# NIGHT_PROGRESS.md — משימת הלילה (מונו-רפו more30)

> קובץ מעקב חי. מתעדכן כל הזמן. אם הקונטקסט מתמלא → `/clear` → קרא קובץ זה
> והמשך מ־"הבא בתור" בלי לאבד כלום. עודכן לאחרונה: 24/07/2026.

## חוקים קדושים (לא לשבור לעולם)
- אל תמחק שום דבר. אל תיגע במוגנים (08 bkalut-app, 09 bkalot-admin, schema `zr_*`, webhook NEDARIM3873).
- אל תחליף פריסה חיה. פריסות חדשות = **מקבילות** תחת more30.com.
- אין סודות בגיט. עבוד על **עותקים** מקומיים (apps/NN — gitignored), לא על המקור.

## סביבה מאומתת (24/07)
- node v24.18, npm 11.16. **pnpm רק דרך npx/corepack** (packageManager=pnpm@9.15.9).
- git: `C:\Users\USER\AppData\Local\GitHubDesktop\app-3.6.3\resources\app\git\cmd\git.exe`.
- Vercel CLI: `C:\Users\USER\AppData\Roaming\npm\vercel.ps1` ✅ זמין.
- Supabase hub: `uhnrgujbdxhhmoxcjria` (schema core = מרשם 32 מערכות).
- ריפו: `l023131500-ops/-` (ציבורי → apps/ = manifests בלבד; קוד מקור gitignored).

## מצב ההתחלה (מה שכבר בוצע בסשנים קודמים — מאומת)
- ✅ שלד מונו-רפו, packages (config/db/auth/ui/billing), pnpm workspace.
- ✅ core schema חי (0001–0003): projects, tasks, bugs, missing_tokens, automations, intake RPCs.
- ✅ **32 מערכות ב-core.projects** עם department + what_it_does + functions (מיפוי הושלם).
- ✅ קוד מקור של כל 32 יובא מקומית ל-apps/NN (gitignored). ספירות קבצים תואמות apps/README.
- ✅ admin dashboard (קורא core דרך more30_* views/RPCs עם anon key).
- ✅ portal (MOR1 style, RTL, hero+services+systems grid+intake form).
- ⚠️ `fixed_notes`/`changed_notes` **ריקים לכל 32** ← הדו"ח לכל מערכת עדיין לא מולא.
- ⚠️ פריסות חיות קיימות: 01,02,03,16,17,28,32. שאר ה-wip לא פרוסים.

## תוכנית הלילה (5 רגליים)
1. **ייבוא ומיפוי** — ✅ הושלם (מקור + manifests + תיאורים ב-core).
2. **תיקון build בעותק** — לכל מערכת בת-בנייה: npm/pnpm install + build על העותק המקומי,
   לתקן שגיאות נפוצות (TS/config/deps), לתעד ב-fixed_notes. ⏳ בתהליך.
3. **פריסה מקבילה תחת more30.com** — למערכות שנבנות ולא חסומות בטוקן: הכנה לפריסה
   (vercel config) + מיפוי תת-דומיינים. פריסת DNS בפועל דורשת את המשתמש (Cloudflare). ⏳.
4. **עיצוב הפורטל** — שדרוג ויזואלי של portal/. ⏳.
5. **עדכון הדו"ח לכל מערכת** — למלא fixed_notes + changed_notes ב-core.projects לכל 32. ⏳.

## סיווג המערכות (לפי היתכנות בנייה)
- 🔒 **מוגן — manifest בלבד, לא לגעת:** 08, 09.
- ✅ **חי/פרוס — לא להחליף, רק לתעד:** 01, 02, 03, 15, 16, 17, 28, 32.
- 🏗️ **wip מהותי (build-fix מועמד):** 04, 06, 10, 12, 13, 14, 18, 21, 22, 24, 26, 27, 30, 31.
- 🪶 **stub/כמעט-ריק (רק לתעד, לא לבנות):** 05, 07, 11, 19, 20, 23, 25, 29.

## לוג התקדמות (append-only)
- 24/07 00:00 — התחלה מחדש אחרי שגיאת API. בדקתי core.projects, מונו-רפו, git, סביבה.
  יצרתי קובץ מעקב זה. אין אובדן — כל Phase 1 שמור ודחוף.

## הבא בתור (התחל מכאן אחרי /clear)
1. עיצוב הפורטל (portal/src/App.tsx) + אימות build.
2. build-fix לקבוצת ה-wip המהותיות (batch, subagents), תיעוד fixed_notes.
3. מילוי fixed_notes/changed_notes לכל 32 ב-core.projects.
4. מיפוי תת-דומיינים more30.com + הכנת vercel config לפריסה מקבילה.
5. commit ל-git; לאסוף שאלות פתוחות למשתמש לסוף.

## שאלות פתוחות למשתמש (איסוף לסוף — אל תעצור בגללן)
- (ימולא תוך כדי עבודה)
</content>
</invoke>
