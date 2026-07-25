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
- 24/07 00:40 — ✅ **רגל 4 (עיצוב פורטל) הושלמה ונדחפה** (commit 4570bd6):
  redesign מלא ל-portal (hero + stat band + dept accents + sticky nav + fonts),
  ותיקון build ב-`packages/db` (process→globalThis, cast schema) ← שחרר את build
  הפורטל+admin. portal build ✓ (108KB gz), admin build ✓. 
- 24/07 00:45 — מתחיל רגל 2 (build-fix). מריץ subagents במקביל על עותקים מקומיים.

## סטטוס build-fix לפי מערכת (מתעדכן תוך כדי)
| # | מערכת | install | build | fixed | deploy-ready |
|---|---|---|---|---|---|
| portal | more30 portal | ✓ | ✓ | db process/schema | ✓ (vercel) |
| admin | more30 admin | ✓ | ✓ | (נהנה מתיקון db) | ✓ (vercel) |
| 31 | hebrew-bridge-crm | ✓ | ✓ | ללא תיקון קוד (TanStack Start) | ✓ |
| 21,22,24,30 | batch1 | ⏳ | ⏳ | subagents רצים | ⏳ |
| 26,27,14,06 | batch2 | ⏳ | ⏳ | subagents רצים | ⏳ |
| 04,10,12,13,18 | batch3 | — | — | ממתין | — |

## מצב Vercel (מאומת 24/07, team l023131500-ops-projects)
פרויקטים קיימים: **more30-portal** (more30-portal.vercel.app), **more30-admin**
(more30-admin.vercel.app), nadlan-berega, torah-platform, igud-ads(+v2/jcx6),
chizukim-transcribe, kupot-health-funds, bkalot. אף אחד לא מחובר ל-more30.com
(live:false) → פריסה מקבילה קיימת, חיבור DNS = פעולת משתמש. ראה docs/DEPLOYMENT.md.

## core.projects — דו"ח לכל מערכת
מולאו 19/32 fixed_notes+changed_notes: מוגנים(08,09), stubs(05,07,11,19,20,23,25,29),
חיים(01,02,03,15,16,17,28,32), ו-31. נותרו 13 build-fix (ממתין ל-subagents).

## סטטוס סופי (24/07 ~02:40) — כל 5 הרגליים סגורות
1. ✅ **ייבוא ומיפוי** — הושלם (מקור + manifests + תיאורים).
2. ✅ **build-fix** — 13/13 wip נבדקו: 11 נבנים (2 static, אחת אין פרויקט בר-בנייה).
   תיקונים אמיתיים: 18 (SWC), 26 (approve-scripts), packages/db (portal/admin).
3. ✅ **דו"ח לכל מערכת** — **32/32** fixed_notes+changed_notes ב-core.projects.
4. ✅ **פריסה** — מפת תת-דומיינים + runbook (docs/DEPLOYMENT.md). הפורטל נפרס מחדש
   לפרודקשן (READY). חיבור DNS ל-more30.com = פעולת משתמש (לא הרסני, לא בוצע).
5. ✅ **עיצוב הפורטל** — redesign מלא, חי.

### מה שנשאר למשתמש (לא בוצע כי דורש החלטה/סוד/פעולה ידנית)
- חיבור CNAME ב-Cloudflare לכל תת-דומיין (ראה docs/DEPLOYMENT.md).
- הזנת env אמיתי בפלטפורמות למערכות env-blocked: 04, 26, 27, 30 (+טוקנים חסרים).
- החלטת אירוח (ריפו פרטי / submodules) לפני וונדור קוד לגיט.
- סיבוב מפתחות חשופים ב-.env.local של 06 ו-18.
- החלטה על מיזוג 12+13 ל-32 (נדל"ן).

## שאלות/דגלים פתוחים למשתמש (איסוף לסוף — אל תעצור בגללן)
- ⚠️ **אבטחה — מפתחות אמיתיים בקבצי .env.local מקומיים (gitignored, לא דלפו לגיט,
  אך מומלץ לסובב):**
  · `apps/06-kupot-holim/.env.local` — `ANTHROPIC_API_KEY` חשוף בהקשר צד-לקוח.
  · `apps/18-torah-editor-mvp/.env.local` — `service_role` + OpenAI/Anthropic/Gemini/Recraft.
  להעביר קריאות AI לצד שרת; לעולם לא לחשוף service_role בבנדל לקוח.
- **החלטת אירוח (מ-CONNECTIONS):** להפוך את הריפו לפרטי ולוונדר קוד, או submodules?
  עד שתוכרע — apps/ נשאר manifests בלבד בגיט (הקוד מקומי/gitignored).
- **מיזוג נדל"ן:** 12-smel-ndln + 13-property-identity הם variants של נדל"ן —
  לשקול מיזוג ל-32 nadlan-berega במקום פריסה נפרדת.
- **חיבור DNS more30.com:** דורש הוספת CNAME ב-Cloudflare לכל תת-דומיין (פעולת משתמש,
  לא בוצע — נוגע בזון החי). ראה docs/DEPLOYMENT.md.
- **טוקנים חסרים** להפעלה מלאה: ראה docs/MISSING_TOKENS.md (OPENAI/ANTHROPIC/GOOGLE/וכו').

## עדכון תיעוד build (append)
- 24/07 01:20 — נבנו בהצלחה (batch1+2): 31 bridge-crm, 22 get-your-rights,
  21 mthbram (Vite/React), 14 bsmachot + 06 kupot-holim (static, no build).
- 24/07 02:10 — ✅ **הפורטל נפרס מחדש לפרודקשן** (deploy READY, dpl_98AJ...):
  more30-portal.vercel.app מציג עכשיו את העיצוב החדש, נבנה עם anon key ציבורי
  (uhnrgujb) מוטמע → טופס ה-intake פעיל. פריסה סטטית prebuilt דרך Vercel CLI
  (vercel.json outputDirectory=. לעקוף Output-Dir=dist). לא נגע ב-more30.com.
- 24/07 02:20 — build תוצאות נוספות: 24 galilee, 30 zchuyot-crm (TanStack, צריך
  SERVICE_ROLE), 10 bkalot-rights (static), 12 smel-ndln + 04 imud (Vite+Express),
  27 bkalut-price (צריך env מלא), 13 property-identity (אין פרויקט בר-בנייה).
  core.projects: **30/32 מולא**. נותרו 18, 26 (רצים).

## סבב 25-26/07 — ניתוב נתיבים תחת more30.com/<נושא> + פורטל Figma-grade
> החלטה מרכזית: **מעבר מתת-דומיינים לנתיבים** (more30.com/nadlan במקום nadlan.more30.com).
> הסיבה: נטפרי חוסם vercel.app; נתיבים תחת more30.com **לא דורשים שינוי DNS** כי הפורטל
> כבר מגיש את more30.com — rewrites ב-vercel.json של הפורטל מנתבים הכול. זה פותח את כל
> החסימה בלי לגעת ב-Cloudflare. **מגבלה טכנית ידועה:** proxy נקי לכל מערכת מחייב build עם
> base-path תואם (Next.js basePath / Vite base) כדי שהנכסים (assets/_next) ייפתרו תחת הנתיב;
> אין קיצור דרך לאירוח רב-אפליקציות בנתיבים.
>
> בוצע ואומת:
> - ✅ `packages/config`: מפת `TOPIC_ROUTES` (25 נושאים) + `topicPath()/publicUrl()/bySlugTopic()`;
>   `basePath.ts` עבר לנושא במקום מספר.
> - ✅ `core.projects.path` (עמודה חדשה) מאוכלס ל-25 מערכות; `more30_project_overview` כולל path (anon).
> - ✅ **פורטל עוצב מחדש ברמת סטודיו** (`portal/src/App.tsx` + `styles.css`): hero עם gradient-mesh
>   ואנימציה, stat-band, כרטיסי מערכת עם מסגרת "דפדפן" (more30.com/<נושא>), תיאור אנושי אמיתי
>   מ-core, סטטוס, "כניסה למערכת"; **אשף רב-שלבי** 4 שלבים עם פס התקדמות, המשך/חזור, בחירת
>   שירותים, ואנימציית כוכבים + מסך תודה בסיום → `submit_startup_idea`. עמוד "בקרוב" ממותג
>   לכל נושא שעדיין לא מחובר (אין דליפת vercel.app).
> - ✅ **הפורטל נפרס לפרודקשן** (dpl_DRFxHwn8, state=READY) — more30.com מציג את העיצוב החדש.
>   (ה-CLI דיווח "fetch failed" אך ה-build הושלם בצד השרת — אומת דרך Vercel API.)
>
> **✅ nadlan חי תחת more30.com/nadlan (26/07):** נפרס עותק base-path (`basePath:'/nadlan'`)
> כפרויקט Vercel מקביל **nadlan-more30** (Next.js, 3 lambdas, READY, ציבורי). הפורטל מ-proxy
> את `/nadlan/*` אליו דרך rewrites — הדפדפן נשאר על more30.com. אומת: /nadlan מחזיר 200 עם כל
> הנכסים והקישורים תחת /nadlan (assetPrefix=/nadlan). core.projects #32 live_url=more30.com/nadlan.
>
> **מלכודת פריסה קריטית שהתגלתה ונפתרה (חשוב לסבב הבא):** ה-Vercel CLI 56.4 בסביבה הזו כופה
> "services framework" ו**מפיל build של Next.js** — 5 קבצי lib (agent/geocode/cadastre/nadlan/cbs)
> "לא נמצאים" למרות שהם קיימים ומועלים. זה באג של מודל ה-services (הקבצים מועלים אך לא מקושרים
> ל-build FS). **הפתרון שעבד:** MCP `deploy_to_vercel` עם `framework:nextjs` (file-tree, לא CLI).
> → **לכל מערכת Next.js/Vite נוספת: לפרוס דרך deploy_to_vercel (framework מפורש), לא דרך vercel CLI.**
>
> **recipe לניתוב מערכת תחת more30.com/<topic> (מאומת על nadlan):**
> 1. build עם base-path = הנתיב: Next.js `basePath:'/<topic>'`; Vite `base:'/<topic>/'`.
> 2. כל `fetch()` פנימי בקוד → קידומת `/<topic>` (basePath מקדים Link/router/assets אך לא fetch).
> 3. deploy דרך MCP deploy_to_vercel (framework מפורש) → פרויקט מקביל (לא נוגע בחי).
> 4. portal `dist/vercel.json` rewrites: `/<topic>` + `/<topic>/:path*` → `https://<proj>.vercel.app/<topic>/...`
>    (לפני ה-catch-all ל-index.html). redeploy portal.
> 5. core.projects.live_url = `https://more30.com/<topic>` (הפורטל מציג "כניסה" רק כשה-URL הוא more30.com).
>
> שאר 24 המערכות: אותו recipe. חלקן env-blocked (צריך מפתחות) — ראה MISSING_TOKENS. מסומנות
> "בהכנה" בפורטל (עמוד בקרוב תחת more30.com, אין דליפת vercel.app).

## תוצאות build — סיכום (13 מערכות wip)
| # | slug | build | deploy-ready | הערה |
|---|---|---|---|---|
| 04 | imud-torani | ✓ | env-blocked | Vite+Express; SUPABASE_URL/ANON בזמן ריצה |
| 06 | kupot-holim | ✓ (static) | ✓ | ⚠️ .env.local חושף ANTHROPIC key |
| 10 | bkalot-rights | ✓ (static) | ✓ | data.json 2.8MB |
| 12 | smel-ndln | ✓ | ✓ | Vite+Express; למזג ל-32 |
| 13 | property-identity | ✗ | ✗ | אין package.json (Deno edge בלבד); למזג ל-32 |
| 14 | bsmachot-plus | ✓ (static) | ✓ | פריסה מקורית rsync/SSH |
| 18 | torah-editor-mvp | ✓ | ✓ | Next.js14; תוקן בינארי SWC פגום |
| 21 | mthbram | ✓ | ✓ | Vite+shadcn |
| 22 | get-your-rights | ✓ | ✓ | Vite; edge rights-agent צריך OPENAI |
| 24 | galilee-connect-hub | ✓ | ✓ | Vite+shadcn |
| 26 | modaot-studio | ✓ | env-blocked | Vite+Express; תוקן approve-scripts (npm11) |
| 27 | bkalut-price | ✓ | env-blocked | Express+Vite; צריך env מלא |
| 30 | zchuyotpro-crm | ✓ | env-blocked | TanStack; SERVICE_ROLE בזמן ריצה |
| 31 | hebrew-bridge-crm | ✓ | ✓ | TanStack Start |
</content>
</invoke>
