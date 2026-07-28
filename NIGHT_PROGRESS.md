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

## סבב 26/07 — ניתוב שאר המערכות תחת more30.com/<נושא> (קבוצות של 5)
> מטרה: להחיל את ה-recipe (שאומת על nadlan) על כל 32, בקבוצות קטנות, עד שכולן
> מנותבות תחת more30.com בלי דליפת vercel.app (הדפדפן נשאר על more30.com לנטפרי).
> ה-recipe שוחזר ואומת מקצה-לקצה בסשן הזה. **ערוץ אימות:** Invoke-WebRequest ל-more30.com
> עובד (Cloudflare, 200); vercel.app חסום בנטפרי (418) → מאמתים deploy מקביל דרך MCP
> `web_fetch_vercel_url`. **מלכודת BOM חזרה:** vercel.json חייב להיכתב בלי BOM (כלי Write,
> לא Set-Content). npm 11 חוסם postinstall → `npm approve-scripts --allow-scripts-pending`
> + `npm rebuild esbuild @swc/core` אחרי install, אחרת ה-build נופל על בינארי חסר.

### recipe מאומת ל-Vite static (chatzor, torah):
1. `npx vite build --base=/<topic>/` (anon מ-.env/​.env.local מוטמע; service_role לא — אין VITE_ prefix).
2. staging: dist → `_deploy/<proj>/​<topic>/`; vercel.json (framework null, echo no-build,
   rewrites `/<topic>`+`/<topic>/:path*` → `/<topic>/index.html`) — SPA fallback, filesystem קודם.
3. `vercel deploy --prod --yes --name <topic>-more30 --scope l023131500-ops-projects`.
4. portal `dist/vercel.json`: `/<topic>`+`/<topic>/:path*` → `https://<topic>-more30.vercel.app/...`
   (לפני ה-catch-all); redeploy portal (dist, more30-portal) → more30.com.
5. core.projects: live_url=`https://more30.com/<topic>`, is_deployed=true.

### recipe מאומת ל-Next.js (tamlul, modaot; וגם nadlan):
1. `next.config.mjs`: `basePath:'/<topic>'` + `assetPrefix:'/<topic>'` (מקדים Link/router/_next אוטומטית).
2. כל `fetch('/api...')`/`xhr.open` פנימי → קידומת `/<topic>` ידנית (basePath לא נוגע ב-fetch גולמי).
3. deploy דרך MCP `deploy_to_vercel` (framework nextjs, file-tree מקור, לא CLI — באג services).
   env בנייה: רק NEXT_PUBLIC_ anon (service_role/OpenAI לא נדחפים → API inert, זה בסדר לשלד ציבורי).
4-5. אותו portal rewrite + core.projects כמו Vite.
⚠️ PS5.1 `Get-Content -Raw` קורא UTF-8 עברי כ-CP1255 ומשחית — לא לעשות bulk replace על מקור עברי.

### קבוצה 1 (01,02,03,16,17) — ✅ הושלמה ואומתה (26/07)
- ✅ **16 chatzor → more30.com/chatzor** — Vite static (`chatzor-more30`). 200 + assets. פעיל מלא (Supabase ישיר).
- ✅ **01 torah → more30.com/torah** — Vite static (`torah-more30`). 200 + assets. פעיל מלא.
- ✅ **02 tamlul → more30.com/tamlul** — Next.js (`tamlul-more30`). 200, assetPrefix=/tamlul, /tamlul/login=200.
  שלד ציבורי מלא; API/אדמין/תמלול inert (חסר SERVICE_ROLE+OPENAI — env, לא חוסם ניתוב).
- ✅ **03 modaot → more30.com/modaot** — Next.js (`modaot-more30`). 200, /modaot/create=200.
  שלד מלא; API/יצירת מודעות inert (חסר SERVICE_ROLE+OPENAI). favicon לא ממותג-נתיב (קוסמטי).
- ✅ **17 chizukim → more30.com/chizukim** — Vite client static (`chizukim-more30`). 200 + assets.
  צפייה/עריכת תמלולים עובד (Supabase ישיר, hash routing); העלאה/תמלול inert (צריך שרת Express + RunPod token).
- **סה"כ מנותב תחת more30.com: 6/32** (nadlan, torah, tamlul, modaot, chatzor, chizukim).
  portal rewrites: כל 6 + catch-all. אין דליפת vercel.app (הדפדפן על more30.com).

### קבוצה 2 (15,21,22,24,10) — ✅ הושלמה ואומתה (26/07)
- ✅ **15 egod → more30.com/egod** — Vite SPA (`egod-more30`). 200 + JS. Supabase ישיר (hkkky).
- ✅ **21 mthbram → more30.com/mthbram** — Vite SPA (`mthbram-more30`). 200 + JS. Supabase ישיר (aypsq).
- ✅ **22 get-your-rights → more30.com/zchuyot** — Vite SPA (`zchuyot-more30`). 200 + JS. rights-agent(OPENAI) inert.
- ✅ **24 galilee → more30.com/galil** — Vite SPA (`galil-more30`). 200 + JS. ⚠️ תוכן זהה ל-16 chatzor (מועמד מיזוג).
- ✅ **10 bkalot-rights → more30.com/bkalot** — אתר סטטי prebuilt (`bkalot-more30`). 200; data.json 2.8MB מוגש.
  פתרון trailing-slash: הוזרק `<base href="/bkalot/">` ל-index (staging בלבד, המקור לא נגע).
- **סה"כ מנותב תחת more30.com: 11/32.** portal rewrites: 11 נתיבים + catch-all. אין דליפת vercel.app.

### קבוצה 3 (12,28,31,14,06) — ✅ הושלמה ואומתה (26/07)
- ✅ **12 smel-ndln → more30.com/smel** — Vite client (`smel-more30`). 200. פעיל מלא (Supabase ישיר, hash routing).
- ✅ **28 kupot-health-funds → more30.com/kupot** — Vite client (`kupot-more30`). 200. ⚠️ שלד בלבד:
  הלקוח קורא ל-Express `/api/hf/*` (אין Supabase ישיר) + ref placeholder → נתונים inert עד שרת+מפתחות.
- ✅ **31 hebrew-bridge-crm → more30.com/gesher** — **TanStack Start SSR** (`gesher-more30`, nitro Vercel preset,
  Build Output v3). 200 SSR + /gesher/auth. Supabase ygaqq, anon בלבד (service_role = dead code).
- ✅ **14 bsmachot-plus → more30.com/smachot** — אתר סטטי מ-`website/` (`smachot-more30`). 200 + assets.
- ✅ **06 kupot-holim → more30.com/briut** — אתר סטטי מ-`site/` (`briut-more30`). 200. ANTHROPIC key הוחרג (אין דליפה).
- **סה"כ מנותב תחת more30.com: 16/32.**

> ⚠️ **מלכודת trailing-slash ל-SSR (gesher):** nitro/TanStack מחזיר 307 מ-`/gesher` ל-`/gesher/`,
> וה-307 בורח לדפדפן; `/gesher/` (ריק) לא תפס את `:path*` ונפל ל-catch-all של הפורטל.
> **תיקון:** ב-portal rewrite ה-source המדויק `/<topic>` יצביע ישירות ל-`.../<topic>/` (עם סלאש),
> ולהוסיף source `/<topic>/`. חל רק על אפליקציות SSR (Vite static ו-Next לא עושים 307 כאן).

### הבא בתור — נותרו נושאים לניתוב (מתוך 25 topic-routes)
נותבו (16): torah, tamlul, modaot, chizukim, chatzor, egod, mthbram, zchuyot, galil, bkalot,
smel, kupot, gesher, smachot, briut, nadlan.
נותרו (9): **wip env-blocked (שלד ציבורי):** 04 imud, 18 orech (Next), 26 studio, 27 mechiron, 30 crm.
**stubs (כמעט-ריק, אין אפליקציה אמיתית → עמוד מותג "בקרוב" של הפורטל תחת more30.com):** 05 financial, 07 zol, 19 shiurim, 20 igud.
ללא topic (by design): 08,09 מוגנים · 11,13,23,25,29 (stub/merge/origin-פורטל).
</content>
</invoke>

## סבב 26/07 לילה — "עובד חי עם נתונים אמיתיים", לא מעטפת
> מטרה חדשה (הוראת המשתמש): כל מערכת תעבוד **באמת** תחת more30.com/<נושא> — לקוח **וגם**
> שרת/API באותו origin (Vercel Functions), עם כל המפתחות הקיימים מחוברים, ואימות פונקציונלי
> אמיתי (נתונים נטענים / השוואה מחזירה תוצאות / AI עונה). `live=true` ב-core.projects רק
> כשהנתונים באמת עובדים. אין נתוני דמה. אין סודות בקוד.

### מאגר מפתחות שנאסף מהפריסות/העותקים המקומיים (26/07)
| מפתח | מקור | זמין ל |
|---|---|---|
| OPENAI_API_KEY | apps/02,03,17,18,22 (.env.local) | תמלול, rights-agent, עורך |
| ANTHROPIC_API_KEY | apps/06,18,26 + 32 (AI_API_KEY) | studio, נדל"ן, עורך |
| GEMINI_API_KEY | apps/18,26 | studio, עורך |
| RECRAFT_API_KEY | apps/18,26 | studio (תמונות) |
| service_role · bieebmnm | apps/01,02,03,18 | torah/tamlul/modaot/orech |
| service_key · uhnrgujb | apps/32 | nadlan |
| DATAGOV | הוראת המשתמש | נדל"ן/מחירון |
| anon/publishable | לכל מערכת ב-.env שלה | הכול |

**חסר** service_role ל: csjekrvu (06,12,17,27), jhbeelzv (30), trerolyv (22), mwljkonw (16,24),
aypsq (21), hkkky (15), ygaqq (31) — הפרויקטים האלה לא מופיעים ב-Supabase MCP של החשבון.

### ✅ 27 mechiron — השוואת מחירים — **עובד חי עם נתונים אמיתיים**
**more30.com/mechiron · לקוח + API באותו origin.**
- **נתונים אמיתיים מאומתים:** 117,270 מוצרים · 1,213 חנויות · 33 מקורות פעילים ·
  437,964 מבצעים · עדכון אחרון 25/07/2026. `hasRealData=true`, `showSampleData=false`.
- **השוואה מחזירה תוצאות (אומת דרך more30.com):**
  · קוטג תנובה 3% 250 — ₪5.50 עד ₪7.90 על פני ~120 סניפים, חיסכון 30.4%.
  · שמן זית כתית מעולה — חיסכון עד ₪32.00 (68.2%).
  · `/api/pc/public/catalog?q=קוטג&minChains=2` → 445KB תוצאות אמיתיות.
- **ארכיטקטורה:** Vercel Function יחידה `api/index.ts` בפרויקט `mechiron-more30`, שמשתמשת
  ב-`server/pc-supabase-read.ts` של האפליקציה עצמה (הועתק כמו שהוא; רק ייבוא הטיפוסים הופנה
  ל-`pc-types.ts` כדי לא לגרור את better-sqlite3 של price-comparison.ts ל-lambda).
  קריאה-בלבד. מסלולי אדמין לא נפרסו — הם ממילא חסומים בקוד ללא hostname `admin.`.
- **מפתחות:** `SUPABASE_URL` + `SUPABASE_ANON_KEY` (csjekrvu) כ-env של פרויקט Vercel.
  לא חסר כלום לצד הציבורי — נתיב הקריאה של האפליקציה תוכנן מלכתחילה לעבוד עם anon.
- **שני שינויי מקור מינימליים (אדיטיביים, תואמי-אחורה) ב-apps/27:**
  `queryClient.ts` → תומך `VITE_API_BASE`; `App.tsx` → תומך `VITE_PRICE_HOME=1`
  (קודם דף הבית היה השוואת מחירים רק לפי hostname `bkalut-prices.*`).

#### 🪤 מלכודות שנפתרו (חשוב לכל מערכת Vercel-Functions הבאה)
1. **ESM:** `"type": "module"` ב-package.json שובר ייבוא יחסי ללא סיומת
   (`ERR_MODULE_NOT_FOUND` על `./_lib/x`). **להשמיט את type:module** → CJS, עובד.
2. **BOM ב-env:** ערך שנכתב ל-`vercel env add` דרך pipe של PowerShell מקבל BOM,
   ו-supabase-js נופל על `ByteString ... 65279` בבניית ה-header. `vercel env pull`
   מחזיר `"[SECRET]"` ולא עוזר לאבחון. **הפתרון:** ניקוי `\uFEFF` מה-env ב-cold start.
3. **rewrite ל-API תחת נתיב:** `/<topic>/api/(.*)` → `/api/index?__path=$1` (הפונקציה
   מנתבת פנימית לפי `__path`). filesystem קודם ל-rewrites, לכן הנכסים הסטטיים לא נפגעים.

### ✅ 26 studio — סטודיו מודעות AI — **עובד חי, ה-AI עונה**
**more30.com/studio · לקוח + שרת Express מלא באותו origin.**
- **ה-AI עונה (אומת חי דרך more30.com, פלט אמיתי):**
  · `POST /api/ai/copy` → Claude **claude-opus-5** החזיר 2 וריאציות קופי עברי
    ("בס״ד — פותחים מחזור חדש בדף היומי" + subtitle/body/cta לכל אחת).
  · `POST /api/branding/strategy` → אסטרטגיית מותג מלאה 2,637 תווים:
    מיצוב, ייעוד, 5 ערכים, ארכיטיפ ראשי sage + משני caregiver, ממדי Aaker.
  · `POST /api/ai/background` → **Gemini** החזיר JPEG אמיתי (data URL, 28KB).
  · `GET /api/templates` → 4 תבניות מובנות שנזרעו ל-Supabase (אחסון עובד).
  · `GET /api/meta` → 5 סגנונות · 6 פורמטים · 20 קטגוריות · 255 פריסטים.
- **ארכיטקטורה:** כל אפליקציית ה-Express רצה בתוך Vercel Function אחת —
  `registerRoutes()` המקורי הועתק ללא שינוי ומורכב על express בתוך ההנדלר,
  כך שכל מסלול שומר על הנתיב והתשובה המדויקים (`x-powered-by: Express` בתגובה).
- **אחסון:** better-sqlite3 לא שורד serverless → נכתב מימוש Supabase של אותו
  `IStorage` בדיוק (אותם שמות מתודות/שדות/חותמות זמן unix). טבלאות
  `public.studio_users/templates/projects/brands` ב-uhnrgujb, service_role בלבד,
  RLS דלוק ללא policies (anon חסום לגמרי).
- **מפתחות:** ANTHROPIC + GEMINI + RECRAFT (מ-apps/26/.env.local) ו-SUPABASE_URL +
  SERVICE_KEY (מ-apps/32) — כולם env של Vercel, אפס סודות בקוד.
- **שינוי מקור יחיד ב-apps/26:** `queryClient.ts` תומך `VITE_API_BASE` (תואם-אחורה).

#### 🪤 שתי מלכודות חדשות שנפתרו (קריטיות להמשך)
1. **BOM + סדר טעינת מודולים.** `server/ai.ts` קורא `process.env.ANTHROPIC_TEXT_MODEL`
   ב-**top-level const**. ניקוי ה-BOM שהיה בתוך ההנדלר רץ מאוחר מדי (כל ה-imports
   מוערכים קודם), והתוצאה הייתה שגיאה חיה מ-Anthropic:
   `not_found_error: model: ﻿claude-opus-5`. **הפתרון:** מודול `api/_lib/env.ts`
   נפרד שמיובא **ראשון**, לפני ייבוא ה-routes.
2. **Opus 5 חושב כברירת מחדל ו-max_tokens מכסה חשיבה+טקסט יחד.** התקציבים
   המקוריים (1500/2500) כוילו למודל בלי חשיבה וקוטמים את ה-JSON.
   **הפתרון:** `max_tokens: Math.max(maxTokens, 8000)` בעותק הפרוס.
3. **PostgREST חושף רק `public`.** schema ייעודי `studio` נדחה עם
   `Invalid schema: studio` → הטבלאות הועברו ל-`public` עם קידומת `studio_`.

## סיכום הסבב (26/07 לילה) — מצב אמיתי לכל מערכת
> ✅ = לקוח **וגם** שרת חיים תחת more30.com, ונתונים/AI אומתו בפועל.
> ⬜ = מנותב ונטען (200) אך ה-API/AI שלו עדיין לא מחובר — **מעטפת**.

| # | נתיב | מצב | מה אומת / מה חסר |
|---|---|---|---|
| 27 | /mechiron | ✅ **חי** | 117,270 מוצרים · 1,213 חנויות · 33 מקורות · השוואה מחזירה תוצאות אמיתיות |
| 26 | /studio | ✅ **חי** | Claude Opus 5 מחזיר קופי ואסטרטגיה · Gemini מחזיר תמונה · אחסון Supabase |
| 32 | /nadlan | ✅ חי (מקודם) | Next.js מלא על uhnrgujb/nadlan |
| 16,01,15,21,12,24,31 | /chatzor /torah /egod /mthbram /smel /galil /gesher | ✅ נתונים חיים | Supabase ישיר מהלקוח (anon) — נטענים |
| 17 | /chizukim | ⬜ חלקי | צפייה/עריכת תמלולים עובדת; **העלאה+תמלול חסרים** שרת Express + RunPod token |
| 02 | /tamlul | ⬜ מעטפת | חסר SERVICE_ROLE (bieebmnm) + OPENAI ב-tamlul-more30 |
| 03 | /modaot | ⬜ מעטפת | חסר SERVICE_ROLE (bieebmnm) + OPENAI ב-modaot-more30 |
| 22 | /zchuyot | ⬜ חלקי | הלקוח נטען; **rights-agent** = Supabase Edge Function על trerolyv — צריך פריסת edge + OPENAI |
| 28 | /kupot | ⬜ מעטפת | הלקוח קורא ל-Express ‎/api/hf/*‎ שלא נפרס + ref placeholder |
| 10,14,06 | /bkalot /smachot /briut | ✅ סטטי מלא | אתרים סטטיים — אין שרת, זה המצב הנכון |
| 04,18,30 | imud, orech, crm | ⬜ לא נותב | ראה חסרים למטה |
| 05,07,19,20 | financial, zol, shiurim, igud | 🪶 stub | אין אפליקציה אמיתית — עמוד "בקרוב" של הפורטל |
| 08,09 | — | 🔒 מוגן | לא נגעתי |

### מה חסם אותי (מפתחות שלא קיימים באף פריסה/עותק מקומי)
**service_role חסר** לפרויקטי Supabase שאינם בחשבון ה-MCP שלי:
`csjekrvu` (06,12,17,27-כתיבה) · `jhbeelzv` (30) · `trerolyv` (22) ·
`mwljkonw` (16,24) · `aypsq` (21) · `hkkky` (15) · `ygaqq` (31).
לקריאה ציבורית זה לא חסם (anon מספיק) — זה חוסם **כתיבה ואדמין** בלבד.

**מפתחות ייעודיים חסרים:** RunPod (17 תמלול) · ADMIN_TOKEN (28) ·
YEMOT_API_KEY + ELEVENLABS (27 צינטוקים) · GOOGLE OAuth (02).

### לא נגעתי במכוון
02 ו-03 הם מערכות **חיות עם כסף** (igud-ads: סליקת נדרים + webhook תשלומים).
חיבור service_role לעותק מקביל היה נותן לו גישת כתיבה לאותו DB פרודקשן
כולל ‎/api/payments/webhook‎ ו-‎/api/jobs/worker‎ — סיכון לכפילות/הרס בנתוני
הכנסות. זו החלטה שדורשת אישור שלך, לא משהו שמריצים בלילה.

### רגרסיה — אומת 26/07 אחרי כל הפריסות
כל 18 הנתיבים + הפורטל מחזירים 200. שום מערכת חיה לא נשברה.

## סבב 26/07 שחר — DATAGOV לנדל"ן + השלמת מערכות חסומות + אתר תדמית (33)
> הוראת המשתמש: (1) DATAGOV_SCHOOLS_RESOURCE ל-32 ופריסה חיה; (2) להשלים כל מערכת
> שאינה is_deployed או מסומנת "חסום/מעטפת" — לקוח+שרת תחת more30.com/<שם> עם כל
> המפתחות; (3) לבנות את מערכת 33 (אתר תדמית + שאלון חכם → core.spec_submissions →
> ניהול עם "שלח לניתוח AI"); (4) לסמן במדויק מה חסר מפתח.

### 🔑 שלוש תגליות שמשנות את כל ההמשך (חשוב!)
1. **`vercel deploy` עובד ל-Next.js.** מה שהפיל את ה-build בסבב הקודם לא היה ה-CLI
   אלא בלוק `"services"` בתוך `vercel.json` של האפליקציה (הוא כפה "services framework").
   **הפתרון: להחליף את vercel.json ב-`{ "framework": "nextjs" }`** ואז
   `vercel deploy --prod --yes --scope l023131500-ops-projects` נבנה ונפרס תקין.
   → אין יותר צורך ב-MCP deploy_to_vercel ובשליחת עץ קבצים.
2. **`maxDuration = 300` מותר** בחשבון הזה. פונקציה ללא הצהרה נהרגת ב-60 שניות
   ("Vercel Runtime Timeout Error"), מה שהפיל כל קריאת AI ארוכה. להצהיר במפורש.
3. **fast mode לא זמין לארגון** (`rate limit of 0 fast mode input tokens`) — לא להשתמש
   ב-`speed:'fast'`. לקריאות ניסוח: `claude-opus-5` + `thinking:{type:'disabled'}` +
   `output_config:{effort:'low'}` (Claude 5 חושב כברירת מחדל ו-max_tokens מכסה חשיבה+טקסט).

### כלי עזר שנוצר — `scratchpad/Set-VercelEnv.ps1`
עוקף את מלכודת ה-BOM: כותב את הערך לקובץ UTF-8 בלי BOM ומאכיל את ה-CLI דרך
הפניית stdin של cmd.exe, כך שקידוד ה-pipeline של PowerShell לא נוגע בערך.
`& Set-VercelEnv.ps1 -LinkDir <dir מקושר> -Name X -Value Y -Target production`.
(מקשרים תיקייה ריקה לפרויקט עם `vercel link --project <name> --scope ...`.)

### ✅ 32 נדל"ן ברגע — DATAGOV הוזן, המערכת חיה מלאה (נתונים + AI)
**more30.com/nadlan** — התגלה ש-`nadlan-more30` נפרס **בלי אף משתנה סביבה**, כלומר
המטמון, האחסון וה-AI היו מנוטרלים. הוזנו 10 משתנים (Supabase URL/anon/service,
CBS, XPLAN, שני מאגרי DATAGOV, AI_PROVIDER/AI_API_KEY, POI_REFRESH_TOKEN).
- **DATAGOV_SCHOOLS_RESOURCE=99b92311-9675-4351-85cd-9ed5ee69a787** — נכתב
  `lib/poiIngest.ts` (עימוד CKAN, מיפוי E_ORD/N_ORD→ITM, המרה ל-WGS84, upsert)
  ו-`POST /api/poi/refresh` מוגן `POI_REFRESH_TOKEN` (בלי הטוקן המסלול מחזיר 404).
  הופעל **דרך more30.com בפרודקשן** → `fetched=3329 valid=3329 upserted=3329`.
  נטען לקטגוריה **`education_gis`** ולא ל-`school` — כי `school` מחזיקה 28,312
  רשומות של משרד החינוך, ומיזוג היה מנפח את "בתי ספר ברדיוס" בכפל ספירה.
  נוסף אינדקס ייחודי `nadlan.poi(category,ext_id)` → הרצה חוזרת מעדכנת, לא משכפלת.
- **נתונים אמיתיים אומתו חי:** דיזנגוף 100 → גוש 7091/203, 100 עסקאות,
  ציון 55, ובשכבת הסביבה: 50 בתי ספר · 94 תחנות תחבורה · **7 מוסדות השכלה** (החדש).
- **ה-AI עונה:** `claude-opus-5` החזיר דוח 7 חלקים, 2,729 תווים, ב-**38 שניות**,
  עם מספרים מהנתונים בלבד (196 מ"ר, ₪39,435/מ"ר, תב"ע 507-0880112).
- **מלכודות שנפתרו:** (א) כל `fetch('/api/...')` בלקוח וב-agent חסר קידומת `/nadlan`
  → נפל ל-catch-all של הפורטל; (ב) `/api/agent` אסף את הפרופיל שוב בשרת → נוסף
  `POST` שמקבל את הפרופיל מהלקוח; (ג) prompt של 160KB JSON → `digest()` מתומצת;
  (ד) `content[0]` לא בהכרח בלוק טקסט → מחפשים `type==='text'`;
  (ה) ביטול קשיח ב-`AI_TIMEOUT_MS` עם נפילה לסיכום דטרמיניסטי (אין 504 למשתמש).

### ✅ 33 אתר התדמית + מנוע האפיון החכם — חי
**more30.com** (ציבורי) · **more30.com/nihul** (ניהול).

**מה נבנה:**
- **השאלון החכם** (`portal/src/SpecWizard.tsx`) — החליף את ה-wizard הקבוע בן 4 השלבים.
  בוחרים מסלול (רעיון חדש / מערכת קיימת / אוטומציה / אתר ומיתוג / עוד לא בטוח),
  והשאלון נבנה ממנו: לכל מסלול שאלות ליבה אחרות, ושאלות נוספות נפתחות רק כשתשובה
  קודמת הופכת אותן לרלוונטיות (למשל "כמה גיוס צריך" רק למי שאמר שהוא מחפש השקעה;
  "מה בנוי טכנית" רק ממי שהוא אבטיפוס ומעלה). כך אין שדות מיותרים ואין ראיונות חסרים.
- **`core.spec_submissions`** — `answers` ו-`questions` כ-jsonb, כי השאלון דינמי ולא
  ניתן להצמיד לו עמודה לכל שדה. נשמר גם **נוסח השאלה שהוצג בפועל**, אחרת אי אפשר
  לקרוא את התשובות בהקשר. RLS דלוק בלי policies — כל גישה דרך RPC בלבד.
- **RPCs:** `submit_spec` (anon, ל-PostgREST שחושף רק public וכותב ל-core) ·
  `more30_spec_list` / `more30_spec_set_status` / `more30_spec_begin_ai` /
  `more30_spec_save_ai` (אדמין בלבד לפי `more30_is_admin()`).
- **הניהול נפרס תחת more30.com/nihul** (פרויקט `nihul-more30`, Vite `base=/nihul/`).
  זה תיקון מהותי: עד עכשיו הניהול היה זמין רק ב-`more30-admin.vercel.app`
  ש**נטפרי חוסמת** — כלומר בפועל לא היה נגיש. נוסף מסך "אפיונים מהשאלון" שמציג
  שאלה-תשובה לפי הסדר שהוצג, סטטוס, וכפתור **"🤖 שלח לניתוח AI"**.
- **`portal/api/spec-analyze.ts`** — פונקציית הניתוח, באותו origin של הניהול (אין CORS).
  **אבטחה:** אין בה service_role. היא מעבירה את ה-JWT של האדמין ל-PostgREST, וכל
  הגישה ל-core עוברת דרך שני ה-RPC שמאמתים הרשאה. מפתח ה-AI הוא הסוד היחיד שם.
  `begin_ai` נכשל אם ניתוח כבר רץ → לחיצה כפולה לא שולחת פעמיים.
- **הניהול לא נתקע:** הניתוח לוקח ~60 שניות, ולכן הכפתור לא ממתין ל-fetch אלא
  **מתשאל את `ai_status`** במסד עד סיום. גם אם החיבור נופל באמצע — התוצאה מופיעה.

**אומת מקצה-לקצה:** הגשה דרך anon → 200 + id. לחיצת ניתוח → `claude-opus-5` החזיר
חוות דעת של 2,509 תווים ב-60 שניות, `ai_status=done`, `status` עלה אוטומטית ל-`analyzed`.
הניתוח ענייני ומבוסס על התשובות בלבד (הצביע על פער תקציב-לו"ז, עלות SMS שלא תומחרה,
תיקון 13 לחוק הגנת הפרטיות, וחשבון יחידה: 20 מרפאות × ₪300 = ₪6,000 שלא מכסה תחזוקה).
נשארה רשומת בדיקה אחת מסומנת "בדיקת מערכת — שאלון האפיון" כדי שתראה את המסך מאוכלס.

## סבב 26/07 צהריים — סגירת 4 המערכות הפתוחות (22, 17, 18, 30)
> הוראת המשתמש: להשלים 22 zchuyot, 17 chizukim, 18 orech, 30 crm — פריסה חיה עם נתונים
> אמיתיים ואימות שה-AI עונה; ואז אתר התדמית (33) עם השאלון; ולבסוף דו"ח לכל מערכת.
> **מצב פתיחה:** 33 כבר נבנה ואומת בסבב הקודם → אומת מחדש, לא נבנה מחדש.

### ✅ 22 zchuyot — הסוכן עונה (אומת, לא נדרש תיקון)
`api/agent.ts` כבר היה כתוב ופרוס. POST ל-`more30.com/zchuyot/api/agent` החזיר **200 + SSE**
ותשובה עברית מלאה (אלמן בן 70, נכות 60%): קצבת שאירים, גמלת סיעוד, מענק חימום, הנחות
חשמל/מים/ארנונה/תחבורה, שיניים, מכשירי שמיעה — עם סכומים ותנאי זכאות. הפונקציה מחזירה 502
אם `rights_reference` לא נטען, ולכן ה-200 **מוכיח** שהמאגר האמיתי נקרא. `live=true`.

### ✅ 17 chizukim — העלאה ותמלול עובדים באמת
נפרס `chizukim2-more30` (Express מלא + לקוח) תחת more30.com/chizukim.
**מנוע תמלול שני:** טוקן RunPod לא קיים באף פריסה (חיפוש בכל ה-vault העלה ריק), ולכן התמלול
היה מת. נוסף מסלול **OpenAI Whisper** שנכנס לפעולה כשאין טוקן RunPod — אותו חוזה
`{text, segments}`, RunPod נשאר ברירת מחדל כשהטוקן קיים.
**אומת על נתונים אמיתיים** (1,137 הקלטות במאגר): 216.wav → 199 שנ׳, $0.0199;
217.wav → 211 שנ׳, 2,230 תווים. שתיהן `status=ready` עם raw+edited transcript.

### ✅ 18 orech — שלושה באגי API שהחזירו "הצלחה" שקרית
נפרס `orech-more30` (Next.js 14, basePath/assetPrefix=/orech, maxDuration=300).
| מה | הבאג | התיקון |
|---|---|---|
| ניקוד | DICTA `nakdan-5-3` דורש היום apiKey → 400 | מעבר ל-`nakdan-2-0` הפתוח + הפרסר שלו (`options[0][0]`); נתיב מפתח נשמר ל-`DICTA_API_KEY` |
| ציטוטים | Sefaria `find-refs` הפך אסינכרוני (202+`task_id`); הקוד קרא את המעטפת → **0 ציטוטים תמיד** | תשאול `/api/async/{task_id}` + קריאה מ-`result.body.results` |
| אימות | ה-strip שמר ניקוד וטעמים → כל ציטוט לא-מנוקד = "סטייה" | סינון `U+0591–U+05C7` |

אומת חי: ניקוד מחזיר טקסט מנוקד; ציטוטים מזהים **Genesis 1:1, Berakhot 2a, Exodus 20:2**
בטקסט עברי חופשי עם נוסח המקור מ-Sefaria; אימות → `status=match, distance=0`.
נותר לא פעיל: מודול ה-HTR (חסר TRANSKRIBUS/KRAKEN/DICTALM).

### ⬜ 30 crm — נפרס ועובד, אימות תוכן דורש התחברות שלך
נפרס `crm-more30` (TanStack Start SSR, nitro preset=vercel, base=/crm/, prebuilt) —
אותה מתכונת של 31 gesher. `/crm` ו-`/crm/auth` = 200 SSR מלא בעברית.
**באג נכסים אמיתי שתוקן:** nitro פולט נכסים ל-`static/assets` בעוד ה-HTML מפנה ל-`/crm/assets`
→ כל JS/CSS החזיר 404. הנכסים הועברו ל-`static/crm/assets` ו-`config.json` עודכן.
(נבדק ש-31 gesher **אינו** סובל מזה — נכסיו תקינים.)
ה-CRM לא משתמש ב-service_role כלל — anon + Supabase Auth + RLS. `live=false` **במכוון**:
הטבלאות מחזירות 0 שורות ללא התחברות, ולכן אימות רשומות אמיתיות מחייב כניסה עם משתמש שלך.
חסום: `service_role` של jhbeelzv → `/api/public/*` (n8n, ניתוח תלוש) אינרטיים.

### ✅ 33 אתר התדמית + השאלון — אומת מחדש מקצה-לקצה
more30.com = 200; `/nihul` = 200 עם באנדל 389KB; `submit_spec` דרך **anon** החזיר 200+id
(הגשה ציבורית עובדת, הטבלה מוגנת RLS ונכתבת רק דרך SECURITY DEFINER); `/api/spec-analyze`
מחזיר **401** ללא JWT של אדמין → שער ההרשאות עובד; ל-portal מוגדרים ANTHROPIC_API_KEY+AI_MODEL.
רשומת הבדיקה שיצרתי נמחקה כדי לא ללכלך את המסך.

### רגרסיה — 23/23 נתיבים מחזירים 200
torah, tamlul, modaot, chizukim, chatzor, egod, mthbram, zchuyot, galil, bkalot, smel, kupot,
gesher, smachot, briut, nadlan, mechiron, studio, imud, nihul, **orech**, **crm**, והפורטל.
שום מערכת חיה לא נשברה.

### 🪤 מלכודות חדשות (לסבב הבא)
1. **esbuild ESM + תלויות CJS** — `format:"esm"` מפיל את הפונקציה ב-cold start
   (`Dynamic require of "tty" is not supported`). הפתרון: `banner` שמייצר
   `require`/`__dirname`/`__filename` מ-`import.meta.url`.
2. **`dest` ל-קובץ סטטי ב-routes v2 לא נפתר** בפרויקט עם buildCommand מותאם
   (`/dist/public/index.html` → 404). הפתרון: לנתב הכול לפונקציה עם
   `functions.includeFiles: "dist/public/**"` ולתת ל-Express להגיש.
3. **`vite base:"./"` נשבר תחת נתיב בלי סלאש עוקב** — rewrite לא משנה את כתובת הדפדפן,
   ולכן `./assets` נפתר מהשורש. חייבים base **מוחלט** (`/<topic>/`).
4. **nitro + base**: הנכסים נפלטים ל-`static/assets` אך ה-HTML מפנה ל-`/<topic>/assets`
   → להעביר ידנית ל-`static/<topic>/assets` ולעדכן `config.json`.
5. **`functions.runtime: "nodejs20.x"` נדחה** ("Function Runtimes must have a valid version")
   — פשוט להשמיט את `runtime`.
6. **NetFree חוסם POST ל-vercel.app (418)** — אך הבקשה **כן מגיעה** לשרת; רק התשובה נחסמת.
   לאימות: לעבור דרך more30.com, או GET דרך MCP `web_fetch_vercel_url`.

> 🪤 **שתי מלכודות פריסה שעלו כאן ושוות זכירה:**
> 1. **`vite build` מוחק את `dist/`** — ואיתו את `vercel.json` (כל מפת ה-rewrites
>    ל-25 המערכות) ואת `api/`. נוצרו `portal/vercel.dist.json`,
>    `portal/vercel.project.json` ו-`scripts/stage-portal.ps1` שמעתיקים אותם בחזרה.
>    **תמיד לפרוס את הפורטל דרך הסקריפט**, לא ידנית.
> 2. **`vercel deploy` מתוך `portal/dist` בלי `.vercel/project.json` יוצר פרויקט חדש
>    בשם "dist"** — הפריסה מדווחת READY, ו-more30.com בכלל לא מתעדכן. איבדתי על זה
>    שני סבבים. הסקריפט מעתיק את הקישור. (הפרויקט המקרי `dist` נשאר בחשבון — למחוק.)
> 3. **PS 5.1 קורא `.ps1` ללא BOM כ-ANSI** ומשחית עברית עד כדי parse error.
>    קובץ סקריפט עם עברית חייב להישמר UTF-8 **עם** BOM.

## סבב 26/07 ערב — עיצוב חדש לאתר התדמית + מעבר איכות
> הוראת המשתמש: (1) אתר התדמית (33) בעיצוב חדש — שם ראשי ענק "עולם הסטארטאפים",
> מסך פתיחה נקי ויוקרתי, בלי אייקוני AI, שילוב פונטים, כרטיס לכל מערכת עם תיאור
> סריף → שם עברי → "כניסה למערכת"; לשמור על השאלון ולתקן 401 ב-spec-analyze.
> (2) מעבר איכות על כל מערכת פרוסה. (3) הכנת המערכות החסומות למרחק מפתח אחד.

### ✅ 33 אתר התדמית — עוצב מחדש ונפרס (more30.com)
- **קו עיצוב חדש:** נייר בהיר (#fdfdfc) על דיו כהה (#141619), קווי שיער בלבד,
  אפס אייקונים, אפס גרדיאנטים, אפס צללים. ההיררכיה מגודל/משקל/מרווח.
- **שם ראשי ענק:** "עולם הסטארטאפים" ב-Secular One, `clamp(52px, 11.5vw, 168px)`.
- **שילוב פונטים כפי שהתבקש:** Secular One (תצוגה) · Frank Ruhl Libre (תיאורים,
  משקל 300) · Heebo (גוף וממשק).
- **כרטיס מערכת:** תיאור סריף קצר מעל → שם עברי גדול → כפתור "כניסה למערכת"
  ל-`more30.com/<slug>`. השמות והתיאורים נקראים חיים מ-`more30_project_overview`
  (name_he / what_it_does) — שום טקסט לא הומצא בקוד.
- **השאלון נשמר במלואו** (SpecWizard) — הלוגיקה לא נגעה, רק עוצב לאותו קו
  והוסרו ממנו האמוג'ים.
- מערכת שעדיין לא מנותבת מקבלת אותו כרטיס במצב "בהכנה" — אין דליפת vercel.app.

### ✅ שגיאת ה-401 ב-spec-analyze — שני גורמים אמיתיים, שניהם בצד הלקוח
הפונקציה עצמה תקינה (אומת: בקשה עם טוקן מזויף מחזירה 403 מה-RPC, בלי טוקן 401).
1. **`signInWithOtp` נקרא בלי `emailRedirectTo`** → קישור ההתחברות חזר ל-Site URL
   של פרויקט Supabase (‎*.vercel.app‎ שנטפרי חוסמת), הסשן נוצר בכתובת שהאדמין לא
   מגיע אליה, וכל לחיצה על "שלח לניתוח AI" נשלחה בלי JWT שמיש. **תוקן** — הקישור
   חוזר לכתובת שממנה התחברו (more30.com/nihul).
2. **תשובת ה-fetch נזרקה לפח** (`.catch(() => {})`) → דחייה מיידית (401/403/503)
   מעולם לא הוצגה, ומכיוון ש-`ai_status` בכלל לא נקבע ל-running, התשאול לא זיהה
   כלום והמסך נתקע ב"שולח לניתוח…" עד timeout של 3 דקות. **תוקן** — התשובה
   נקראת, השגיאה מוצגת בעברית, והתשאול נעצר.
3. בנוסף: `refreshSession()` לפני השליחה, כדי שטוקן שפג תוקפו לא יהיה מה שנשלח.
- ⚠️ **פעולה שלך (דקה אחת):** Supabase → Authentication → URL Configuration →
  Redirect URLs → להוסיף `https://more30.com/**`. בלי זה Supabase מתעלם מה-
  redirect וחוזר ל-Site URL. (אין רגרסיה בלי זה — פשוט נשאר כמו קודם.)

### 🪤 שתי תקלות שנתפסו תוך כדי — שוות זכירה
1. **build של הפורטל בלי anon = אתר מת בשקט.** בלי `VITE_SUPABASE_URL/ANON_KEY`
   ב-build, `createBrowserClient` זורק, האתר נופל למרשם הסטטי שאין בו `live_url`,
   וכל כרטיס מוצג "בהכנה" והשאלון לא נשלח. זה נפרס פעם אחת בסבב הזה והתגלה רק
   בבדיקת הבאנדל. **נחסם:** `portal/vite.config.ts` מפיל את ה-build בפרודקשן אם
   המשתנים חסרים; הערכים ב-`portal/.env.local` (gitignored) + `.env.example`.
2. **🔒 דליפת סוד שנחסמה לפני push.** לחמש מערכות ב-apps/ יש `.gitignore` משלהן
   עם `!.env.example`, ו-gitignore מקונן **גובר** על הכלל בשורש שאמור לחסום כל
   env של מערכת מוונדרת. כך `apps/27-bkalut-price/.env.example` הפך ל-stageable
   ונכנס לקומיט — והוא מכיל **שני מפתחות אמיתיים**: `YEMOT_API_KEY` ו-
   `ELEVENLABS_API_KEY`. הקומיט בוטל לפני דחיפה, ההיגיון של ה-negation נוטרל
   בכל חמש, והמפתחות הוסרו מהקובץ. אומת ב-`git log -S` ששניהם **מעולם לא נכנסו
   להיסטוריה**. ⚠️ **עדיין מומלץ לסובב את שניהם.**

### מעבר איכות — שיטה ותוצאות
> **איך נבדק (חשוב לדעת מה הבדיקה כן ולא מוכיחה):** אין כאן דפדפן, ולכן לא לחצתי
> כפתורים. במקום זה: (א) כל 22 הנתיבים נמשכו חיים דרך more30.com וכל נכס (JS/CSS)
> שה-HTML מפנה אליו נמשך בנפרד ונבדק שהוא לא חוזר כ-HTML (הסימן ל-SPA-fallback
> שבולע נכס); (ב) לכל מערכת חולצו מהמקור נקודות הקצה שהלקוח באמת קורא להן, והן
> נבדקו חיות; (ג) הרשאות נבדקו בבדיקות **בטוחות** שלא כותבות שורה.

**22/22 נתיבים מחזירים 200, וכל הנכסים נטענים.** אין נכס אחד שנבלע.

| # | ממצא | מצב |
|---|---|---|
| 04 imud | `/api/meta` מחזיר קטלוג תבניות אמיתי · `/api/wizard/infer` מחזיר הסקה אמיתית | ✅ הסיווג "env-blocked" היה **מיושן** |
| 28 kupot | `/api/hf/meta` = 435 נושאי קופות · 65 ממשל · 15 עמותות · `/api/hf/topics` = 515 נושאים | ✅ הסיווג "מעטפת" היה **מיושן** |
| 17 chizukim | `POST /chizukim/api/upload/init` החזיר URL העלאה חתום אמיתי — השרת רץ תחת הנתיב | ✅ תקין |
| 12 smel | הלקוח לא תלוי בשרת כלל: PostgREST ישיר. שאלון פעיל אמיתי; הגשת ליד נבדקה בגוף ריק → 400 not-null (ולא 401), כלומר ההרשאה קיימת והכפתור עובד. **לא נכתבה שורת בדיקה.** | ✅ תקין |
| 26 studio | ה-API בריא. שני עמודים **יתומים** (`generator.tsx`→`/api/config`, `gallery.tsx`→`/api/ads`) קוראים לנתיבים שלא קיימים — אבל לא מיובאים ולא ב-Router → קוד מת, לא כפתור שבור | 🟡 המלצה למחיקה |
| 02 tamlul | המסלולים כן נפרסו (405 על GET = קיימים), אבל `/api/jobs` = **500** — ל-`tamlul-more30` אין **אף** משתנה סביבה | 🔴 חסום env |
| 03 modaot | **כל** מסלולי ה-API = 404 בפריסה המקבילה (4 lambdas בלבד מתוך 40 מסלולים) → יצירת מודעה/פרויקטים/תשלומים לא עובדים בעותק | 🔴 דורש פריסה מחדש + אישור (סליקה) |
| 30 crm | המסכים עולים, `/api/public/*` אינרטיים — ל-`crm-more30` אין אף משתנה סביבה | 🔴 חסר service_role של jhbeelzv |
| 06 briut | `/briut/admin.html` מוגש לציבור ו-`admin.js` מכיל את הסיסמה בטקסט גלוי; **חמור יותר** — anon **יכול לקרוא** את `public.kupot_leads` (אומת 200). הטבלה ריקה, כלומר טרם דלף דבר | 🔴 תיקון RLS דחוף |

> **הערה על ספירת "כפתורים מתים":** ספירה סטטית מראה כפתורים בלי `onClick`, אבל
> באתרים סטטיים (06, 10, 14) החיווט נעשה בקובץ JS נפרד ובריאקט דרך props —
> נבדק ונמצא שאלה **תקינים**. לא דיווחתי אותם כשבורים.

### הכנת המערכות החסומות — "מרחק מפתח אחד"
נקראו משתני הסביבה בפרודקשן של כל פריסה מקבילה. התוצאה המדויקת נכתבה ל-
`core.missing_tokens` ול-`docs/MISSING_TOKENS.md` (נכתב מחדש). בקצרה:
- **מוזן ומאומת:** 17, 18, 22, 26, 27, 28, 32, 33 — אין מה לעשות.
- **ריק לגמרי:** `tamlul-more30`, `modaot-more30`, `crm-more30`.
- **הסטטוס של 32 `DATAGOV_SCHOOLS_RESOURCE` תוקן ל-provided** — הוא הוזן ואומת
  בסבב הקודם אבל נשאר תקוע על missing.

## סבב 27/07 — השלמת מפתחות ללא PAT
> **אין PAT.** נבדק ביסודיות: אין `SUPABASE_ACCESS_TOKEN`, ה-Supabase CLI לא מותקן,
> אין תיקיית הגדרות שלו, ואין מחרוזת `sbp_` בשום מקום. חיבור ה-Supabase שלי הוא MCP
> דרך החשבון, ו-`list_projects` מחזיר **פרויקט אחד**: `uhnrgujb`. bieebmnm, trerolyv,
> jhbeelzv ו-csjekrvu אינם בו. גם `vercel env pull` מהפרויקטים החיים לא עוזר —
> הערכים חוזרים כ-`[REDACTED]` (Sensitive/write-only).
>
> **הדרך שכן עבדה:** קבצי `.env.local` של העותקים המקומיים ב-`apps/`.

### 🔑 מלכודת מדידה שכמעט הובילה לדיווח שגוי
בדיקת תקפות מפתח מול `/rest/v1/` (השורש) מחזירה **401 גם למפתח תקף לגמרי**. בסריקה
ראשונה זה גרם לכל 12 המערכות להיראות כאילו המפתח שלהן מת — כולל מסקנה שגויה
ש-01 torah שבור. **הבדיקה הנכונה:** לשאול טבלה שבוודאות לא קיימת —
`404 / PGRST205` = המפתח התקבל, `401` = המפתח פסול.

**התוצאה האמיתית: כל 12 המערכות עם מפתח מוטמע — תקפות. אין אף רגרסיה.**
(torah, egod, mthbram, chatzor, galil, smel, gesher, chizukim, zchuyot, bkalot,
briut, crm.)

### ✅ 02 tamlul — הוזן, נפרס, ונשאר מפתח אחד בדיוק
הוזנו ל-`tamlul-more30`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(anon של bieebmnm — **נבדק ותקף**), `OPENAI_API_KEY` (**אומת חי**: 200, 123 מודלים).
נוסף `.vercelignore` שמונע העלאת `.env` לפריסה. נפרס מחדש (READY); `/tamlul` ו-
`/tamlul/login` = 200.
**נותר בדיוק אחד:** `/tamlul/api/jobs` עדיין 500, והלוג נותן את הסיבה המדויקת —
`Error: supabaseKey is required` → `SUPABASE_SERVICE_ROLE_KEY`.

### ⚠️ service_role של bieebmnm — העותק המקומי מבוטל
אותו זוג מפתחות מופיע ב-`apps/01,02,03,18`. ה-**anon** תקף; ה-**service_role**
(`sb_secret_Srmojy…`) מחזיר 401 = **סובב/בוטל**. לכן זה לא "חסר מהפריסה" אלא
"צריך מפתח חדש מהדשבורד".

### ⏸️ 03 modaot — הוזן אבל **לא נפרס מחדש** במכוון
אותם שלושה משתנים הוזנו. לא פרסתי כי ל-03 יש `vercel.json` עם **שני crons**
(`jobs/worker` כל דקה, `jobs/cleanup` יומי) והיא מערכת עם סליקה: פריסה מחדש תפתור
את ה-404 של ה-API, אבל תפעיל את ה-crons בעותק המקביל — ועם service_role, שני עותקים
יעבדו במקביל על אותן עסקאות. זה בדיוק "אל תשבור מערכת חיה".

### ❌ 22 trerolyv · 30 jhbeelzv
אין להם service_role באף עותק מקומי (`apps/22/.env.local` = OPENAI בלבד;
`apps/30/.env` = anon/publishable בלבד). חסומים עד שתביא את המפתחות.

### בדיקה חוזרת (27/07, סבב שני) — עדיין אין PAT ואין מפתחות Google
נבדק מחדש ברמת התהליך, ה-User וה-Machine: אין `SUPABASE_ACCESS_TOKEN`, אין
`~/.supabase/access-token`, ה-CLI לא מותקן. מפתחות Google (`*.apps.googleusercontent.com`
או `GOCSPX-…`) **לא נמצאו** — לא בריפו, לא בדיסק, ולא ב-env של `tamlul-more30`
(שמכיל בדיוק את שלושת המשתנים שהזנתי). לא הגיע כלום.

## בדיקת "האם הנתונים באמת נטענים" (27/07)
> שאלנו כל מערכת בטבלה המרכזית שלה, דרך ה-anon **המוטמע בפריסה עצמה**, עם
> `Prefer: count=exact` — כלומר בדיוק מה שהדפדפן של המבקר מקבל.

| מערכת | טבלה | תוצאה |
|---|---|---|
| 15 egod | lessons | ✅ **10 רשומות** — תוכן אמיתי |
| 22 zchuyot | rights_reference | ✅ **104 רשומות** — תוכן אמיתי |
| 16 chatzor | knowledge_base / synagogues / community_leads | ⚠️ **0 / 0 / 0** |
| 24 galil | אותן טבלאות, **אותו פרויקט** (mwljkonw) | ⚠️ **0 / 0 / 0** |
| 21 mthbram | lessons / study_day_events | ⚠️ **0 / 0** (org_portals ו-rabbi_portals = 401, חסומות RLS) |
| 31 gesher | profiles | ⬜ 0 — **תקין ומכוון**: CRM מאחורי Auth+RLS |
| 30 crm | clients | ⬜ 0 — תקין ומכוון, כמו 31 |

**המשמעות:** 16, 24 ו-21 אינן "מעטפת טכנית" — הן עולות והמסד נגיש — אלא **ריקות
מתוכן**. מבקר רואה פורטל בלי שום פריט. הדגל `live=false` שלהן כבר נכון.

**16 ו-24 הן אותה מערכת:** אותו פרויקט Supabase, אותן טבלאות, אותו תוכן (ריק), שתי
פריסות שמתחזקות פעמיים אותו קוד. הצעת מיזוג מפורטת נכתבה ל-`core.projects` (16).
עכשיו, כשאין תוכן, זה הרגע הזול ביותר למזג.

## סבב 27/07 · אתר התדמית — jewel tone + קופי לכל מערכת
> ההוראה: בסיס בצבע חי ועשיר (לא לבן), טיפוגרפיה יוקרתית, כמה פונטים, בלי אייקוני
> AI, וקופי ברמת קופירייטר — משפט הטבה מעל שם כל מערכת, **מבוסס אך ורק** על
> `name_he` ו-`what_it_does`.

### הפלטה
בסיס **כחול מלכותי עמוק** `#0B0D2E` (נוטה לסגול), משטחים `#12153F`/`#1A1E55`,
מקטע המערכות בסגול עמוק `#241B54`. **זהב מרוסן** `#C9A227` לקווי שיער, ל-eyebrow
ולכפתורים; **אזמרגד** `#14B88A` שמור **רק** לסימון "פעילה". מאחורי ה-hero הילה
רדיאלית רכה שנותנת עומק בלי גרדיאנט צעקני. אפס אייקונים — ההיררכיה מצבע, גודל ומרווח.

### ארבעה פונטים, לכל אחד תפקיד אחד
| פונט | תפקיד |
|---|---|
| **Suez One** | הכותרת הענקית "עולם הסטארטאפים" + כותרות מקטעים |
| **Secular One** | שמות המערכות והמספרים |
| **Frank Ruhl Libre** | משפטי ההטבה והפסקאות שנועדו להיקרא |
| **Heebo** | ממשק, כפתורים, שדות |

### הקופי — נשמר ב-core, לא בקוד
נוספה עמודה **`core.projects.tagline`** (מיגרציה `0005_project_tagline.sql`)
ומולאה ל-**25/25** המערכות. הניסוח נגזר אך ורק מהתיאור של אותה מערכת — לא הובטחה
שום יכולת שהתיאור לא תומך בה, ואין קלישאות.

**למה בעמודה ולא בקוד:** השמות והתיאורים כבר נקראים חיים מ-core; קופי בקוד היה יוצר
גרסה שנייה של אותו טקסט שמתפצלת עם הזמן. עכשיו אפשר לנסח מחדש בלי build ובלי פריסה.

דוגמאות: 32 → "כל מה שצריך לדעת על נכס, עוד לפני שנכנסים בדלת." · 04 → "הטקסט נכנס.
הדף יוצא מוכן לדפוס." · 18 → "גם כתב יד ישן הופך לטקסט שאפשר לערוך." · 03 → "מודעה
שנוצרת, מופצת ונגבית — בלי לרדוף אחרי אף אחד."

הכרטיס נקרא עכשיו: **משפט הטבה (זהב) → שם המערכת (גדול) → "כניסה למערכת"**, ולצדו
סימון "● פעילה" באזמרגד כשהמערכת חיה.

> 🪤 `CREATE OR REPLACE VIEW` **לא** יכול להוסיף עמודה באמצע או לשנות שם עמודה
> קיימת — הניסיון נכשל עם `cannot change name of view column`. `tagline` נוסף
> **בסוף** רשימת העמודות של `more30_project_overview`.

**אומת חי:** more30.com מגיש את ה-CSS החדש עם ארבעת הפונטים והפלטה; ה-view ב-anon
מחזיר 25/25 taglines; **23/23 הנתיבים מחזירים 200** — אפס רגרסיות. השאלון נשמר,
כולל תיקון צבע ל-`select option` שאחרת נפתח לבן על רקע כהה.

### באג רינדור שתוקן בגרסה הסופית
ההילה שמאחורי ה-hero הוגדרה `z-index: -1`. מכיוון ש-`.hero` אינו יוצר
stacking context, ערך שלילי הציב אותה **מאחורי הרקע של `body`** — כלומר היא
פשוט לא נראתה. תוקן ל-`z-index: 0` עם התוכן מעליה ב-`1`, ונוסף כיבוד
`prefers-reduced-motion` לאנימציית הכניסה. נפרס ואומת מול ה-CSS החי.

## סקריפטי העברת נתונים — מוכנים להרצה ברגע שיגיע PAT
שני סקריפטים חדשים ב-`scripts/`, שניהם נבדקו שהם parse-clean ושהם נכשלים
בהודעה ברורה כשחסר משהו:

**`Use-SupabasePat.ps1`** — מה שה-PAT *יכול* לעשות:
`-Action ListProjects` (להריץ ראשון — מראה מה הטוקן באמת רואה ואילו refs חסרים) ·
`CreateProject` · `GetKeys` · `SetAuthUrls` (Site URL + `more30.com/**` — החצי
השני של תיקון ה-401) · `LeadsPolicy` (מדפיס את ה-SQL הבטוח, לא דורש טוקן).
הטוקן נקרא מ-`$env:SUPABASE_ACCESS_TOKEN` ולעולם לא מודפס ולא נשמר.

**`Migrate-SupabaseProject.ps1`** — העתקה עם נתונים, לא בנייה מחדש:
1. preflight — מוודא `pg_dump`/`pg_restore`/`psql` (**אינם מותקנים כאן**; הסקריפט
   מדפיס בדיוק מה להתקין, ומזהיר שצריך client ≥ 16 כי השרת הוא Postgres 17).
2. סופר שורות במקור **לפני**.
3. `pg_dump` — קריאה בלבד.
4. `pg_restore` ליעד.
5. **משווה ספירות טבלה-טבלה** ונכשל אם יש פער.

בלמים: מסרב לרוץ אם המקור והיעד הם אותו host; מחרוזות החיבור נקראות מ-env ולא
מארגומנטים (כדי שהסיסמה לא תיכנס להיסטוריית ה-shell); `-DryRun` מפיק גיבוי בלי
לשחזר; והמקור **לעולם לא נכתב**.

⚠️ **PAT לא מספיק להעברת נתונים** — ה-Management API לא מחזיר את סיסמת המסד. צריך
שתי מחרוזות חיבור מ-Settings → Database של כל פרויקט.
⚠️ **מה ש-`pg_dump` לא לוקח:** buckets של Storage ו-Edge Functions. אלה צריכים
העברה נפרדת לפני שמפנים פריסה ליעד.

## סבב 28/07 — ה-PAT הגיע · איחוד ותיקוני אבטחה
### 🔑 התגלית: שניים מהארבעה כבר בחשבון שלך
`GET /v1/projects` עם ה-PAT מחזיר **10 פרויקטים**, וביניהם:

| ref | שם | סטטוס | משמש |
|---|---|---|---|
| `bieebmnmkffwbqlsfozh` | bkalut-production | **ACTIVE** | 01, 02, 03, 18 |
| `csjekrvukbdznetsrodj` | bkalut-production-user-owned | **ACTIVE** | 06, 12, 17, 27 |
| `uhnrgujbdxhhmoxcjria` | l023131500-ops's Project | ACTIVE | HUB |

שניהם ב-org `cuofzfzlqniuqevgrwwk` (לא `rbwengwuxwujbgsynwcs`, אבל **אותו חשבון**).
כלומר **לא נדרשה שום העברה** לשני אלה — רק שליפת מפתחות. `trerolyv` (22) ו-
`jhbeelzv` (30) **אינם ברשימה** → הם באמת בחשבון אחר.

### 🔑 למה ה-service_role המקומי היה מת
לשני הפרויקטים יש **שני דורות של מפתחות**: legacy (JWT) ו-new (`sb_secret_`).
בבדיקה: **ה-legacy תקפים, וה-`sb_secret_` מבוטלים**. העותק המקומי היה מהפורמט
החדש — ומכאן ה-401. הפתרון: להשתמש ב-legacy.

### ✅ 02 tamlul — נסגר במלואו
service_role (legacy) + SUPABASE_URL הוזנו ל-`tamlul-more30`, נפרס מחדש.
**`/tamlul/api/jobs` עבר מ-500 ל-200 עם JSON אמיתי** (`ok:true, processed:0`).

### ✅ 06 briut — חשיפת הלידים נסגרה (חמור יותר ממה שדווח)
ל-`anon` היו **SELECT + UPDATE + DELETE ללא תנאי** על `public.kupot_leads` — לא רק
קריאה אלא גם שינוי ומחיקה, עם מפתח שגלוי בקוד העמוד. שלוש המדיניות הוסרו,
ההרשאות נשללו, ונשארו `INSERT` ל-anon ו-`SELECT` ל-authenticated.
**אומת חי:** קריאה עם anon → 401; הגשה מהטופס → 400 ולידציה בלבד (עובד).
הטבלה הייתה ריקה — לא אבד שום ליד.
⚠️ **תוצאה מכוונת:** `/briut/admin.html` יפסיק לעבוד עד מעבר ל-Supabase Auth.

### ✅ תיקון ה-401 הושלם סופית
`Site URL = https://more30.com` ו-`uri_allow_list = https://more30.com/**`
הוגדרו ב-`uhnrgujb` דרך ה-PAT. זה החלק האחרון שהיה חסר.

### ✅ 18 orech — מפתח מבוטל הוחלף
ל-`orech-more30` היה מוגדר ה-service_role **המבוטל**. הוחלף בתקף.

### ⏸️ 03 modaot — מפתחות הוזנו, פריסה **לא** בוצעה
`vercel.json` של 03 מגדיר cron ל-`/api/jobs/worker` **כל דקה**, והמערכת מחזיקה
`/api/payments/webhook`. פריסה עם service_role הייתה יוצרת משטח סליקה שני עם
כתיבה לאותו DB, וחושפת webhook תשלומים בכתובת ציבורית נוספת. החוק "אל תשבור
מערכת חיה" + ההגנה על NEDARIM3873 גוברים על הוראת הפריסה.

### 🔴 ממצא אבטחה חדש — `admin_sessions` (27), לא תוקן
ב-csjekrvu קיימת `public.admin_sessions` (`token`, `identity`, `role`,
`expires_at`) שבה **anon מחזיק SELECT + UPDATE + DELETE ללא תנאי**, ובה שורה חיה
אחת. כלומר אפשר לקרוא טוקן סשן אדמין פעיל עם המפתח הציבורי. **לא נגעתי** — הידוק
ינתק התחברות של מערכת חיה, וזה מחוץ להוראה (שנגעה לטבלת הלידים).
(`fin_*` נבדקו ותקינים — `bkalut_deny_anon` עם `using=false`.)

## סבב 28/07 (המשך) — המפתחות החיצוניים האחרונים
### ✅ 02 Google OAuth — הוגדר במקום הנכון, ונשארה פעולה אחת בגוגל
**תגלית:** המפתחות **לא** שייכים ל-Vercel. `app/login/page.tsx` קורא
`supabase.auth.signInWithOAuth({provider:'google'})` — כלומר ההגדרה שייכת לספק
Google **ב-Supabase Auth** של bieebmnm. הוזנו שם דרך ה-Management API.

**אומת בשני שלבים:**
1. `/auth/v1/authorize?provider=google` מחזיר **302 ל-accounts.google.com** עם
   ה-client_id הנכון → הספק חי.
2. מעקב אחרי ההפניה עד גוגל → **`redirect_uri_mismatch`**.

⚠️ **ההתחברות עדיין תיכשל** עד שתוסיף בגוגל את כתובת ה-callback:
`https://bieebmnmkffwbqlsfozh.supabase.co/auth/v1/callback`
(זו כתובת של Supabase ולא של האתר — זה נכון: Supabase מקבל את הקוד מגוגל ורק
אז מחזיר למערכת.)

### ✅ 27 — שני המפתחות אומתו חיים, אבל הפיצ׳ר לא פרוס
| מפתח | אימות מול הספק |
|---|---|
| `YEMOT_API_KEY` | `responseStatus=OK` · חשבון "אירוע ברגע" (023130600) · **9,999.8 יחידות** |
| `ELEVENLABS_API_KEY` | tier=**creator** · **24 קולות** · 5,504/241,455 תווים |

**אבל הצינטוקים לא יעבדו עדיין** — ולא בגלל המפתחות: `mechiron-more30` מכיל רק
את `api/index.ts` (קטלוג לקריאה), בעוד שהקוד שמשתמש בהם יושב ב-`server/yemot.ts`,
`server/hf-podcast.ts` ו-`server/routes.ts` — שרת ה-Express המלא, שלא נפרס.
אומת: `/mechiron/api/health` ו-`/mechiron/api/yemot/send` → **404**.
להפעלה צריך לפרוס את שרת ה-Express של 27 (כמו שנעשה ב-26 studio).

### ✅ 18 orech — נפרס מחדש עם המפתח התקף
`/orech/api/citations` מחזיר 200. נוסף `.vercelignore` שמונע העלאת `.env`.

**רגרסיה: 23/23 נתיבים 200.**

## סבב 28/07 (סיום) — בדיקת אמת · לידים לפרויקטים מושהים · שדרוג המודעות
### 🔎 תגלית: שני פרויקטים **מושהים** ששמם תואם מערכות "ריקות"
ברשימת ה-10 של ה-PAT יש שני פרויקטים INACTIVE ששמם קופץ לעין:

| ref | שם | חשד |
|---|---|---|
| `tltfpznyqxpuydgefmnp` | **chatzor-connect** | ייתכן שזה מקור התוכן של **16** (שהיום ריקה על mwljkonw) |
| `svvpuypogqnkgcmtqlgu` | **זכויות פרו** | ייתכן שזה **30** (שהיום על jhbeelzv) |

זה מסביר בצורה טבעית למה 16/24 מחזירות 0 שורות: ייתכן שהתוכן מעולם לא היה
ב-mwljkonw אלא בפרויקט הזה, שהושהה.

**לא שיחזרתי אותם.** פרויקט מושהה הוא offline לגמרי (אין מפתחות, אין SQL, אין
REST — אומת), ו-Restore הוא שינוי מצב בחשבון שלך עם **השלכת עלות/מכסת פרויקטים
פעילים**. זו החלטה כספית שלך. אם תאשר — משחזר, בודק אם יש שם תוכן, ומעביר.

### ✅ בדיקת אמת — `live` עודכן לפי ראיות בלבד
**מחזירות נתוני אמת (live=true):** 01, 02, 04, 12, 15, 17, 18, 22, 26, 27, 28, 32.
**ריקות מתוכן (live=false):** 16, 24, 21 — עולות, המסד נגיש, פשוט אין שורות.
**מאחורי התחברות (live=false, תקין ומכוון):** 30, 31.
**חסומה (live=false):** 03 — ה-API 404 עד פריסה מחדש.

### ⏸️ שדרוג מנוע המודעות (26) — נכתבה תוכנית מפורטת, לא בוצע
נקרא הקוד בפועל: `/api/ai/background` משתמש ב-**Gemini בלבד**; **Recraft מחובר אך
משמש רק לוקטוריזציה של לוגו**. יש כבר תשתית תבניות (`categoryTemplates.ts` ~30,
`presetCatalog.ts`, `layers.ts`) — ו**הטקסט העברי כבר מורכב בקוד מעל הרקע**, לא
נצרב בתמונה. זו נקודת פתיחה טובה, לא התחלה מאפס.

התוכנית המלאה (4 שלבים: מנוע Recraft אדיטיבי · פרומפט מגוון · ספריית לייאאוטים ·
טיפוגרפיה עברית) נכתבה ל-`core.projects` (26 → `fixed_notes`).

**למה לא בוצע:** 26 היא מערכת **חיה שעובדת**. השינוי נוגע בשרת, בפרומפטים
ובספריית התבניות, ומחייב פריסה מחדש ואימות ויזואלי של כל תבנית. התחלה חלקית ללא
סיום ואימות הייתה משאירה מערכת חיה במצב ביניים — בדיוק מה שהחוקים אוסרים.
## סבב 28/07 לילה — נתוני אמת: 10 מיצוי זכויות
### ✅ 10 bkalot — המאגר המרכזי חובר לאתר, ובדרך התגלה באג אמת חמור
**more30.com/bkalot** — `repo.js` היה כתוב אבל **מעולם לא נפרס**: הפריסה החיה הכילה רק
`engine.js` + `app.js` וקראה את `data.json` הסטטי. (הסימן: `/bkalot/repo.js` החזיר
`text/html` — כלומר ה-SPA-fallback בלע אותו, כי הקובץ פשוט לא היה שם.)
נפרס עם ה-anon של ה-hub מוזרק ב-stage-time. אומת חי: `source=hub`, 888 פריטים, ~4.8 שנ׳.

**לפני ההחלפה אומתה זהות מלאה** בין ה-hub ל-`data.json`: 888/888 פריטים, **0 הפרשים**
בכל שדה כולל `links` ו-`emp`, ושלושת הפרופילים החזירו פלט מנוע **זהה בדיוק**.
(ההשוואה הראשונה הראתה 488 "הפרשים" — כולם סדר מפתחות של jsonb בלבד. השוואה
קנונית הוכיחה זהות. **מלכודת:** אל תסיק הפרש מ-`JSON.stringify` על jsonb.)

#### 🔴 באג האמת: מפת מצב→זכויות לא הייתה נושאית
סטודנט בן 24 קיבל כ**"חובה לבדוק"**: *הנחה בארנונה לאזרחים ותיקים*, *פנסיית שאירים
אחרי פטירת עמית*, *תג חניה לנכה*. לוחם מילואים קיבל *נקודות זיכוי להורה גרוש*. מתוך
8 פריטי ה-main של "מילואים" רק **אחד** (תשלום עבור שירות מילואים) היה רלוונטי.

**מה תוקן:** לכל אחת מ-453 הזכויות (לא-קופות) יש פסקת **"קהל יעד"** מקורית שאומרת מי
באמת זכאי. כל 453 סווגו מחדש מול הפסקה הזו — **לא מול השם** — ל-1,405 שיוכים
(`core` → main, `secondary` → more). המפה הישנה נשמרה ב-
`rights.situation_map_backup_20260728`; השינוי תועד כמיגרציה **0006**.
**כיוון שהאתר קורא עכשיו מה-hub, התיקון נכנס לתוקף בלי פריסה** — זו בדיוק הסיבה שחיבור
המאגר היה שווה את זה.

**אומת חי** (repo.js+engine.js נמשכו מ-more30.com והורצו בפועל):
| פרופיל | מה מוחזר עכשיו |
|---|---|
| סטודנט בן 24 | דמי ביטוח לאומי לסטודנטים ללא עבודה · נקודת זיכוי למסיימי תואר · פיקדון ומענק שחרור |
| אלמנה 72, ניצולת שואה | גמלת סיעוד · קצבת אזרח ותיק · קצבת שאירים · השלמת הכנסה · תגמולי ניצולי שואה (115 המלצות) |
| הורה יחיד, 2 ילדים | מזונות מביטוח לאומי · נקודות זיכוי להורה יחיד · הנחת ארנונה להורה יחיד · מענק לימודים |

נוספו ל-`rights.meta` שלושה מפתחות שהיו חסרים והוחלפו בברירות מחדל בקוד:
`form_name`, `form_subtitle`, `referral_note_regular`.

**פער ידוע שנשאר:** המנוע לא מסנן לפי מגדר — השאלון לא שואל מגדר — ולכן פריטי
לידה/היריון יכולים להופיע גם לגבר בן 45. ניתן לגדר לפי `newborn_or_pregnant`
שכן קיים בשאלון; דורש שינוי ב-`engine.js` ופריסה.

## סבב 28/07 ערב — 01 איגוד השיעורים: האתר היה **מת**, לא ריק

> ההוראה: לבנות מחדש באיכות הכי גבוהה, אחד אחרי השני, עם קומיט ודו"ח בין כל אחד —
> (1) איגוד השיעורים 01/15, (2) תמלול חיזוקים 17, (3) המרת כתב יד 18.

### 🔬 שיטת אימות חדשה — דפדפן אמיתי, לא קוד סטטוס
הותקן `playwright-core` + Chrome headless (`scratchpad/render.mjs`, `crawl.mjs`).
**זה מה שחשף את הבאג:** כל הסבבים הקודמים סימנו את `/torah` כ"פעיל מלא" על סמך
HTTP 200 — והדף החזיר 200 עם `<div id="root">` **ריק לגמרי**. מעכשיו: טוענים את
הדף, קוראים את הטקסט שהמבקר רואה, ומקשיבים לכל קריאת `/rest/v1` שנכשלת.

### 🔴 שלושה כשלים עצמאיים, כל אחד לבדו הספיק כדי להרוג את האתר
**1. RLS — `permission denied for function has_tenant_role` (401 על 25 מ-34 טבלאות).**
מיגרציית הרב-דיירות יצרה את `has_tenant_role` ו-`user_in_tenant` כ-SECURITY DEFINER
ונתנה EXECUTE ל-`authenticated` ול-`service_role` — **ולא ל-`anon`**. שתיהן מופיעות
במדיניות של טבלאות התוכן, ומכיוון שמדיניות ה-write הוגדרה `FOR ALL`, ה-USING שלה
נבדק **גם ב-SELECT** — כלומר כל קריאה אנונימית נפלה לפני שהענף הציבורי הספיק להחזיר
true. תוקן במיגרציה `db/apps/01-torah-platform/0008_grant_rls_helpers_to_anon.sql`.
**אחרי:** 36/36 טבלאות נקראות; INSERT אנונימי עדיין נדחה (אומת בפועל).

**2. Router — דף לבן בלי שום שגיאה.** `BrowserRouter` היה בלי `basename`, ותחת
`/torah` שום ראוט לא נתפס. התיקון הראשון (`basename={BASE_URL}`) **לא הספיק**:
`BASE_URL` הוא `/torah/` **עם סלאש**, הכתובת היא `/torah` בלי, ו-react-router
מחזיר `null` בשקט כשה-pathname לא מתחיל בבייסניים המלא — בלי console error בבילד
פרודקשן. `BASE_URL.replace(/\/+$/,"")`.

**3. זיהוי טננט — `more30.com` נחשב "דומיין מותאם".** `resolveTenantFromUrl` לא
הכיר את more30.com, החזיר `__custom_domain__`, החיפוש נכשל, `tenant` נשאר null,
וכל עמוד ציבורי מציג "לא נמצא ארגון" (כל שאילתה מותנית ב-`enabled: !!tenant?.id`).
נוסף more30.com ל-MAIN_HOSTS, ה-path מנוקה מה-base, ו-`loadTenant` נופל בחזרה
לטננט `igud` במקום להחזיר null.

### 🔴 סחיפת סכימה — 151 אי-התאמות ב-49 קבצים
נכתב `scratchpad/audit-queries.mjs`: סורק כל `supabase.from(...)` במקור, אוסף את
שמות העמודות שהשרשרת מזכירה, ומצליב מול `information_schema`. שתי משפחות:
- **קוד legacy** שמדבר עם טבלאות שהמיגרציה מחקה (`rabbi_portals`, `org_portals`,
  `study_day_events`, `teacher_leads`, `contact_messages`, `portal_photos`,
  `teacher_features`, `teacher_invites`…) — אלה טבלאות מהסכימה של **15 egod**.
- **עמודות שהשתנו** בעמודים החיים. תוקנו בסבב הזה:
  | עמוד | היה | בפועל |
  |---|---|---|
  | LessonsDirectory | `is_public`, `teacher_name`, `location`, `time`, `days_of_week[]` | `is_approved`, `rabbi_name`, `city/neighborhood/address`, `time_hhmm`, `day_of_week` (int) |
  | Home / HalachaDaily | `halacha_daily.publish_date` | `date` |
  | Home | `tips.tenant_id` (לא קיים) | טבלה משותפת, בלי סינון דייר |
  | FindLesson | `leads.type` + `leads.details` | `kind` + `raw_data` — **כל הגשת טופס נדחתה בשקט** |
  | Kashrut | `is_active` | `status='active'` |
  | Mikvaot | `order("name")` | `title` |
  | ShopCatalog | `display_order`, `image_url`, `stock_quantity` | `sort_order`, `images[0]`, `stock` |
  | FindLesson/LessonsDirectory | `lesson_topics.display_order`, `name_he` | `sort_order`, `name` |

### ✅ אומת חי דרך more30.com (דפדפן אמיתי)
17 נתיבים ציבוריים נטענים, **אפס קריאות `/rest/v1` שנכשלות**. `/torah/lessons`
מציג את 5 השיעורים האמיתיים עם מגיד, עיר, שכונה, שעה ויום.

### 🔗 דליפת vercel.app נסגרה
שני כרטיסי "מערכות נוספות" בדף הבית הצביעו ל-`igud-ads-rho.vercel.app`
(נטפרי חוסמת → קישור מת לקהל היעד) → `more30.com/tamlul` ו-`more30.com/modaot`.
`PUBLIC_SITE_URL` עבר מ-`torah-platform-xi.vercel.app` ל-`more30.com/torah`.

### ❗ מה שעדיין פתוח ב-01/15 — דורש החלטה שלך
**אין נתוני אמת להציג.** המסד של 01 כמעט ריק: 3 דיירים אמיתיים (איגוד השיעורים,
מועצה דתית גליל, מחוברים) + 2 מסומנים `meta.seed=true`, 5 שיעורים, 22 נושאים,
2 פרופילים. **15 egod** (Lovable, `hkkky…`, חשבון אחר) מחזיק 10 שיעורים —
אבל בבדיקה הם **דמו**: `rabbi.cohen@igud-shiurim.org`, `example.com/files/…`,
סיסמאות `Cohen2026!`. הרשומה האמיתית היחידה שם: הרב יהודה בנישטי / מחוברים חצור.

ב-PAT נראים **שלושה פרויקטים מושהים** ששמם תואם בדיוק את מה שחסר:
`zxckwefnuectxqhtpfib` **"חיבור לשיעורים"** · `eygjmfftosigbmzpndib` **"מחוברים"** ·
`tltfpznyqxpuydgefmnp` **chatzor-connect**. פרויקט מושהה = offline לגמרי.
**לא שיחזרתי** — Restore הוא שינוי מצב בחשבון עם השלכת עלות/מכסה. צריך אישור.

### 🔑 מפתחות שהתקבלו 28/07 — נשמרו, **שניהם לא עובדים עדיין**
נשמרו כמשתני סביבה (User scope) וב-`.env.local` בשורש (gitignored):
- `GOOGLE_MAPS_API_KEY` — המפתח **תקף**, אבל **אף API לא מופעל בפרויקט**:
  Geocoding / Places / Directions / Distance Matrix / Timezone → `REQUEST_DENIED`,
  StaticMap → 403. פעולה שלך ב-Google Cloud Console: להפעיל את ה-APIs.
- `APIFY_TOKEN` — `GET /v2/users/me` → **401**. הערך שהתקבל הוא 35 תווים אחרי
  `apify_api_` (הצפוי 36) וההודעה נחתכה ללא `>` סוגר → **ככל הנראה חסר תו אחרון**.

## סבב 28/07 לילה — 17 תמלול חיזוקים: איכות מקסימלית, נמדדה

### 🔬 המנוע נבחר במדידה, לא לפי מוניטין
נוסף מסלול `POST /api/lab/transcribe/:id` (חסום ב-`LAB_TOKEN`; בלי הטוקן מחזיר 404)
שמריץ כמה מנועים על **אותה הקלטה אמיתית** ומחזיר את הטקסטים זה מול זה.
על `217.wav` מהארכיון:

| מנוע | מה יצא | פיסוק |
|---|---|---|
| `whisper-1` (מה שהיה) | "גאין בן תמוז, תפשין, פבאב · ירי שמיים · השולחן, ברוך ירי שם" | 154 |
| `gpt-4o-transcribe` | "י' זין בתמוז תשעין פבב · יראה שמיים · השולחן ברוך" | **3** |
| **`gpt-transcribe`** ✅ | **"י״ז בתמוז תשפ״ב · ירא שמיים · השולחן ערוך"** | 135 |

רק `gpt-transcribe` קלע לתאריך העברי, לשם **הרב זילברשטיין** ולשם הספר — והוא גם
המהיר. הוא ברירת המחדל; אפשר לעקוף ב-`TRANSCRIBE_MODEL` בלי פריסה.

### ⚖️ מה שלא עבד — ומדווח ככה
בניתי מילון מונחים תורני ל-prompt. **הוא כמעט לא משנה.** מדידה על שתי הקלטות,
עם ובלי: `gpt-transcribe` תיקן בעצמו גם "הסתלפותו"→"הסתלקותו" וגם
"הרב המוס גואטה"→"הרב משה גואטה". השדרוג הוא המודל, לא הרשימה. ההקשר נשאר —
קוצר לצירופים שבאמת נשמעים זהה — ומתועד כניטרלי.

### 📏 קבצים ארוכים — נשברה תקרת ה-25MB
האודיו נחתך על גבולות חוקיים של הפורמט (WAV לפי דגימה + כותרת חדשה לכל קטע;
MP3 לפי גבול פריים), עם חפיפה של 2 שניות, וזנב הטקסט הקודם עובר כהקשר לקטע הבא
כדי שהתפר לא יקטע משפט. החפיפה מנוקה בהתאמת הסיומת הארוכה ביותר.
**ההקלטה היחידה מעל 25MB בארכיון** (44.4MB, `סימן קס''ח סעיף ח'`) הייתה
`status=error` בלי תמלול — ועכשיו מתומללת בשני קטעים.

### ✍️ שלב העריכה — אמיתי, ועם בלם
`basicEdit` פיצל לפסקאות לפי סימני פיסוק שלא היו, ולכן החזיר בלוק אחד (נמדד:
2,228 תווים, **אפס** מעברי פסקה). עכשיו מודל שפה מפסק ומחלק, **ויש שומר**:
התוצאה נמדדת מול המקור במרחק עריכה ברמת מילים ובאורך, ואם חרגה — נזרקת לטובת
החלוקה המכנית. שיעור תורה שנכתב מחדש "יפה" הוא נזק שקשה לזהות. בפועל: 0.6% ו-3.7%.

### 🔍 מה שהאימות חשף — ותוקן
בשיעור על שולחן ערוך המנוע שמע **"סימן קפ״ח"** במקום **"קס״ח"** — הברה אחת,
והתוכן (לחמניות, אובליאש, ברכות מ״ב) הוא חד־משמעית סימן קס״ח. שם הקובץ ידע.
שם ההקלטה נמסר עכשיו לעורך כהקשר, **מוגבל למראי מקום בלבד**. אחרי התיקון:
"בשולחן ערוך, בסימן קס״ח סעיף ח'".

### תוצאה על 217.wav מקצה לקצה
140 סימני פיסוק · 8 פסקאות · הפסוק מצוטט נכון "על נהרות בבל, שם ישבנו גם בכינו"
— מול 4 סימנים ובלוק אחד לפני. בנוסף, ביטחון הקטעים שהמנוע מדווח נשמר ומוחזר,
כדי שאפשר לכוון עורך אנושי למקומות שכדאי לבדוק במקום לקרוא הכול.

## סבב 28/07 לילה — 18 המרת כתב יד: ממודול מת לקריאת כתב יד אמיתי

### מה שהיה: המודול מעולם לא רץ
שני המנועים היחידים שאפשר היה לבחור אינם מוגדרים — Kraken דורש שרת GPU נפרד
ו-Transkribus דורש מנוי — ולכן **כל** בקשה הסתיימה ב-HtrEngineNotConfigured.
מתחת לזה חיכו שלוש תקלות שהיו עוצרות אותו גם עם מנוע מחובר. כולן התגלו רק
בהרצה בפועל של הצינור, לא בקריאת קוד:

| התקלה | הסימן | התיקון |
|---|---|---|
| **schema `otvedaf` בלי הרשאה ל-`service_role`** — ההרשאה ניתנה ל-anon ול-authenticated בלבד, וה-API מתחבר **רק** כ-service_role | `/api/htr/jobs` → 500 `permission denied for schema otvedaf` | מיגרציה `db/apps/18-torah-editor-mvp/0002` |
| **BOM ב-`SUPABASE_SERVICE_ROLE_KEY`** בפרודקשן | 500 `ByteString ... value of 65279`; `vercel env` מציג `[SECRET]` ולכן הבית המושחת בלתי נראה | ניקוי `\uFEFF` ב-`lib/supabase.ts` |
| **`maxDuration = 60`** במסלול העיבוד | שתי קריאות ראייה לוקחות ~2 דקות → `FUNCTION_INVOCATION_TIMEOUT` וה-job נתקע ב-`processing` לנצח | 300 |

### המנוע: שתי קריאות בלתי תלויות, מוצלבות
ההערה בראש `htr-engine.ts` קובעת שמודל גנרטיבי לא יהיה קורא ראשי לעברית רבנית,
והנימוק נכון: מודל שלא הצליח לקרוא מילה **ימציא** מילה סבירה, ובטקסט תורני
התוצאה נראית כשרה לגמרי בלי שום סימן. אבל "בטוח ולא עובד" אינו בטוח.

לכן העיקרון נשמר אחרת: **הדף נקרא פעמיים בשני קוראים בלתי תלויים והקריאות
מוצלבות שורה מול שורה.** הזיה היא המצאה של מודל אחד; שני קוראים שלא ראו זה את
פלטו של זה לא ימציאו את אותה מילה. לכן הסכמה היא **ראיה** ולא הבטחה, ומחלוקת
מוצגת עם שתי הגרסאות לעורך. שני הקוראים מונחים להחזיר `[?]` במקום לנחש,
ו-`[?]` נשמר בפלט.

### אומת על כתב יד אמיתי, מקצה לקצה דרך more30.com
**Wellcome MS A34** — "שמוש תהלים", כתב חצי-קולמוס ספרדי מהמאה ה-16, נחלת הכלל.
העלאה → עיבוד → תוצאה שמורה. נקרא נכון:
`שמוש תהלים` · `אשרי האיש` · `למה רגשו גוים` · `בקראי ענני אלהי צדקי` ·
`למנצח מזמור לדוד` · `יהא רעוא מן קדמך` · `טוב לכתוב הקמע` · `ויתלה בצוארו`.
29 שורות, `status=raw_ready`. הרשומה נשארה מסומנת "בדיקת מערכת" כדי שתראו אותה.

### שתי טעויות שלי שהמדידה תיקנה
1. **ספרתי הימנעות כמחלוקת.** בהרצה הראשונה הקורא השני החזיר `[?]` כמעט על כל
   הדף — ציות שמרני מאוד להוראה "אל תנחש" — וההצלבה דיווחה **1 מתוך 32 שורות
   בהסכמה** וביטחון 0.34, כלומר הכריזה שתעתיק טוב הוא חסר ערך.
   "לא ידעתי לקרוא" אינו "קראתי אחרת". נוסף מצב שלישי: הסכמה / מחלוקת /
   **לא מאומת**.
2. **תווי כיווניות בלתי נראים.** שתי שורות זהות לחלוטין נספרו כמחלוקת (0.30)
   כי אחת הכילה `U+200E` שהעין אינה רואה. הנרמול מסיר אותם.

### מגבלה מדווחת ביושר
כשהקורא הבין-ספקי שותק, האימות נופל לקריאה שנייה **מאותו מודל**. זו ראיה חלשה
יותר — מודלים מאותה משפחה טועים יחד, ובאחת ההרצות שתי הקריאות הסכימו על אותה
מילה שגויה (`אשרי ראיש`). תווית המנוע אומרת זאת במפורש ולא קוראת לזה אימות צולב.
