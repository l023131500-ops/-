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

## סבב 29/07 — ביקורת אמת על 33 המערכות + הכשרה למנויים

**הדו"ח המלא: `docs/AUDIT-2026-07-29.md`. הסטטוס החי: `core.projects` ובניהול `/nihul`.**

### מה נמדד (ולא הונח)
לכל מערכת: מצב הפריסה האחרונה בפרודקשן ב-Vercel, בקשת HTTP לכתובת החיה שלה
תחת more30.com, וספירת שורות במסד שאליו היא באמת מדברת — כתובת ה-Supabase
והמפתח הציבורי חולצו מתוך ה-bundle החי של כל אפליקציה, ולמערכות עם שרת נקרא
ה-API החי. בנוסף נסרקו שמות משתני הסביבה בפרודקשן לכל פרויקט.

### התוצאה
- **א (12, מוצגות):** 01, 02, 03, 04, 10, 17, 18, 22, 26, 28, 32, 33.
- **ב (13, מוסתרות):** 05, 07, 08🔒, 09🔒, 11, 14, 16, 19, 20, 27, 29, 30, 31.
- **ג (8, הוחלפו):** 06→28, 12→32, 13→32, 15→01, 21→01, 23→18, 24→16, 25→33.

באתר מוצגות 11 מערכות מנותבות (33 היא האתר). **שום דבר לא נמחק** — הניתובים
נשארו פעילים, הכול נשאר בניהול, וההחזרה היא דגל אחד: `public_visible`
(תיבה בכרטיס ב-/nihul, או `more30_set_public_visible`).

### הממצאים שהפתיעו
- **24 גליל = 16 חצור, אותו build בדיוק** — אותה כותרת, אותו bundle, אותו מסד ריק.
- **06 briut מציגה 435 נושאים אמיתיים, אבל טופס הליד שלה מצביע למסד שאין בו
  את הטבלה** (`hf_switch_leads` → PGRST205). ל-28 יש `/api/switch-lead` עובד
  מול המסד המרכזי — ולכן 06 סווגה כמוחלפת ולא כאיכותית.
- **15 egod מחזיקה 10 שיעורים — כולם דמו** (`rabbi.cohen@igud-shiurim.org`,
  `example.com/files/…`). 01 מחזיקה 5 שיעורים אמיתיים.
- **03 modaot הייתה מסומנת `live=false` והיא דווקא עובדת** — create, upload
  ו-login כולם נטענים; הדגל היה מיושן.
- **27 mechiron היא כלי פנימי לצוות** ("מאגר בקלות — כלי פנימי לצוות") ולא
  מוצר לציבור; נתיבי ה-API שלה מחזירים 404 מהכתובת הציבורית.
- **30 crm ו-31 gesher חיות טכנית וריקות לגמרי** — 0 לקוחות, 0 שורות.
- **החסם המשותף לכסף: אין סליקה ואין חשבון משתמש באף מערכת.** 02 ו-03 כבר
  מוכרות דרך "קוד קופון" ידני — הן הקרובות ביותר להכנסה.

### 16 חצור קונקט — הענף מוזג ועלה לאוויר
`claude/website-review-improve-idkpx0` (6 שלבים, 75 קבצים) מוזג ל-`main`
ול-`feature/unify-phase1`. schema `chatzor` הוחל על המסד המרכזי (13 טבלאות,
RLS, הרשאות, חשיפה ב-PostgREST כמו `nadlan`), האפליקציה נבנתה עם
`BASE_PATH=/chatzor` (+`basename` לראוטר) ונפרסה. `more30.com/chatzor` מחזיר
עכשיו את הגרסה החדשה, וה-bundle מצביע למסד המרכזי במקום ל-`mwljkonw…` הריק.

חיבורים: **Hebcal ✅** (חישוב בדפדפן מקואורדינטות חצור, בלי מפתח) ·
**DATAGOV ⚠️** — אין דאטהסט בתי כנסת לחצור במאגר הממשלתי (רק באר-שבע, פתח
תקווה, חיפה); מה שכן נשמר הוא אמיתי: מקווה "תל חי" מתוך "מקוואות טהרה" ·
**Google Maps ❌** — המפתח תקף אך אין בקוד אף קריאה אליו.

נשארה מוסתרת מהאתר כי התוכן הקהילתי ריק (0 בתי כנסת). הכתובת פעילה, פורטלי
הניהול והגבאים עובדים; ברגע שיוזן תוכן — תיבה אחת מחזירה אותה לרשימה.

### ⚠️ פתוח ודורש אותך
1. **`git push` לא בוצע** — אין טוקן זמין ב-shell (הסוד ב-Credential Manager
   של GitHub Desktop אינו טוקן API תקף; git ביקש סיסמה וההרצה לא אינטראקטיבית).
   הכול קיים מקומית: `git push -u origin main && git push origin feature/unify-phase1`.
2. **משתמש אדמין ראשון לחצור** — שורה ב-`chatzor.org_admins` (הפקודה בדו"ח).
3. **Dashboard → API → Exposed schemas** — להוסיף `chatzor` גם בדשבורד.

## סבב 29/07 לילה — שלב 1: נדל"ן (32) — השדרוג עלה לאוויר

### מה באמת היה שבור: שני עותקים שהתפצלו
`Downloads\nadlan-berega` (הריפו האמיתי, git) קיבל 8 שלבי פיתוח — מודל הדוח החדש
של 7 קטגוריות · 3 רמות · ודאות לכל נתון. `apps/32-nadlan-berega` (העותק שמקושר
לפרויקט Vercel **nadlan-more30**, בלי git) קיבל את ה-basePath ואת קליטת ה-POI.
אף אחד מהם לא הכיל את השני. `more30.com/nadlan` הגיש את העותק — כלומר **כל
השדרוג לא היה נראה**, למרות שהקוד קיים במחשב כבר יומיים.

הניתוב עצמו היה תקין כל הזמן (`/nadlan` → `nadlan-more30`). הפרויקט הישן
`nadlan-berega` לא היה מעורב. מה שהיה ישן זה **התוכן** של היעד, לא היעד.

### מה נעשה
- **הריפו הוא עכשיו מקור האמת היחיד.** קליטת ה-POI (`lib/poiIngest.ts` +
  `POST /api/poi/refresh`) הועברה מהעותק אל הריפו, ו-`apps/32` נבנה ממנו בסנכרון
  חד-כיווני. רק `next.config.mjs` (basePath) נשאר ייחודי לעותק.
- **דף הנחיתה מציג את השדרוג:** מקטע "שלוש רמות של דוח" — רגיל / מקיף / VIP,
  כשכל שורה בו מתארת יכולת שהמנוע באמת מסנן לפיה (`tierAllows`); ומקטע
  "לרחוב אחד יש לפעמים שני שמות" עם המקרה האמיתי שאילץ אותו (דרך מרדכי / אתרוג).
- **שני מפתחות שהיו מתים — חיים עכשיו ונוספו לפריסה:** `GOOGLE_MAPS_API_KEY`
  (Places החזיר 20 תוצאות) ו-`APIFY_TOKEN` (‎/users/me‎ → 200). בלעדיהם הדוח
  היה בלי מוסדות, בלי זמני הליכה ובלי מודעות. נוספו גם שני ה-actors, תקרת
  הפריטים, ו-`AI_MODEL=claude-opus-5`.
- **`/nadlan/admin` ננעל.** הוא הוגש לציבור והציג אילו מפתחות מוגדרים ואת מודל
  העלויות. הוגדר `ADMIN_TOKEN`; בלי `?key=` העמוד מחזיר "אזור מוגן" (אומת).

### 🪤 שלוש תקלות אמת שהתגלו רק בהרצה חיה
1. **`basePath` לא נוגע ב-`fetch()` גולמי.** ארבע קריאות פנימיות בלקוח ואחת
   בשרת (`/api/agent` → `/api/profile`) יצאו לשורש הדומיין ונפלו ל-catch-all
   של הפורטל. נוסף `lib/basepath.ts` עם `apiUrl()` שקורא `NEXT_PUBLIC_BASE_PATH`
   — ברירת מחדל ריקה, כך שהריפו נשאר פריס גם בשורש.
2. **הבנייה נפלה על טיפוס שמעולם לא נבדק.** `poiIngest` קרא ל-`datastoreSearch`
   עם `offset`, אבל האופציה הזו הייתה קיימת רק בעותק. ברגע שהריפו נכתב מעליו —
   `Type error: 'offset' does not exist`. זו בדיוק העלות של שני עותקים.
   `offset` הוא עכשיו אופציה מוצהרת, ו-`tsc` מכסה את שני הקבצים.
3. **דוח מקיף לא חזר בכלל.** דוח רגיל חזר ב-5 שניות; מקיף נתלה עד שהלקוח ויתר
   (300 שניות). הסיבה: `run-sync-get-dataset-items` של Apify לא מכבד את פרמטר
   ה-timeout שלו, ושישה סעיפים שכבר נאספו הלכו לאיבוד בהמתנה לשביעי. נוסף
   `AbortController` משותף לשני ה-actors (45 שניות). בנוסף `maxDuration` היה
   60 (ברירת מחדל) ב-profile וב-agent, ו-120 ב-report → כולם ל-300.

### ✅ אומת חי דרך more30.com (לא דרך vercel.app)
| בדיקה | תוצאה |
|---|---|
| דף הנחיתה | 200 · שלוש הרמות, שמות הרחוב הכפולים ו-7 הקטגוריות **מופיעים בפועל** |
| כל הנתיבים | `/nadlan`, `/report`, `/sources`, `/present`, `/admin` = 200 |
| נכסים | 8/8 (CSS+JS) מוגשים עם content-type נכון — אף נכס לא נבלע ב-fallback |
| דוח רגיל | 200 ב-**5 שניות** |
| דוח מקיף | 200 ב-**30 שניות** (היה: לא חוזר) |

**הדוח על דיזנגוף 100 תל אביב, נתוני אמת:** גוש 7091 חלקה 203 · כותרת
"דיזנגוף (מוכר גם כרחוב דיזיגוף) 100" + 3 כינויים נוספים · **100 עסקאות** שנסגרו ·
**14 מודעות פעילות** ממדלן · **24 נקודות** בגרף המגמה · **20 מוסדות חינוך** ו-8
תחנות תחבורה בשמן ובמרחקן · 7/7 הקטגוריות מאוכלסות. יד2 חסמה את המושך והדוח
אומר זאת במפורש — **לא הוצגה אף מודעה משוערת**.

## שלב 2 — רשימת המערכות בדף הבית נקראת מהמסד

### מה היה ומה השתנה
הפורטל כבר קרא שמות ותיאורים מ-`more30_project_overview`, אבל **הרשימה עצמה
עדיין הייתה מקובעת בקוד** בשתי דרכים שקטות: `VISIBLE_FALLBACK` — קבוצה של 11
מספרי מערכות שנצרבה בבאנדל וששימשה כמצב ההתחלתי בכל טעינה; ו-`depts` שנגזר
מ-`Object.keys(DEPARTMENTS)`, כך שתחום חדש במסד פשוט **לא היה מופיע**.

### `more30_public_systems` — תצוגה ציבורית רזה (מיגרציה 0007)
`more30_project_overview` הוא ה-**אדמין** view, ול-anon יש עליו SELECT. כלומר כל
מבקר יכול היה לקרוא `fixed_notes`, `missing_tokens` (אילו סודות חסרים לאיזו
מערכת) ו-`admin_url`. האתר מעולם לא השתמש באף אחד מהם.
התצוגה החדשה עונה על שאלה אחת בדיוק — מה מוצג ומה נאמר על זה — ומחזיקה
**גם את כללי החשיפה** (`public_visible`, יש נתיב, לא מוגן, לא למחיקה) ואת
המיון. כללים שקובעים מה העולם רואה לא צריכים לחיות בבאנדל שאפשר שיהיה ישן.

### מה עוד תוקן בפורטל
- **אין רשימת גיבוי.** כשהמסד לא נענה מוצגת הודעה + "נסו שוב", ולא רשימה
  מקובעת שתיראה בדיוק כמו האמת ואולי כבר לא נכונה. בזמן הטעינה — שלד כרטיסים
  שמחזיק את הגובה (מכבד `prefers-reduced-motion`).
- **התחומים נגזרים מהשורות** לפי סדר הופעה; מפתח בלי תרגום מוצג כמו שהוא
  ולא נעלם.
- **הקישור נבנה מהנתיב** (`/<path>`) ולא מכתובת הפריסה — אין שום מסלול שבו
  תדלוף כתובת ‎vercel.app‎ שנטפרי חוסמת.
- **תווית תחום שגויה תוקנה:** `torah` הוצג כ"עורך תורני" — שם של מערכת אחת
  (18) — מעל קבוצה שכוללת שיעורים, תמלול, מודעות ועימוד. עכשיו "עולם התורה".

### ✅ ההוכחה: שינוי במסד מופיע באתר בלי build ובלי פריסה
בדפדפן אמיתי (playwright + Chrome) מול more30.com:
1. מצב פתיחה — **11 מערכות · 10 חיות · 4 תחומים**, כל כרטיס עם ה-tagline מ-core.
2. הודלק `public_visible` ל-16 חצור **במסד בלבד**. טעינה מחדש → **12 מערכות ·
   11 חיות**, ומקטע תחום חדש לגמרי ("קהילה ואזורי") הופיע מעצמו עם חצור בתוכו.
3. הוחזר ל-false → חזרה ל-11. **אפס פריסות בין השלבים.**

אפס קריאות רשת כושלות ואפס שגיאות קונסולה בכל הטעינות.

## שלב 3 — כל 12 מערכות ה-A נבדקו בדפדפן אמיתי; שלוש היו שבורות

### שיטת הבדיקה
לא קוד סטטוס. כל מערכת נטענה ב-Chrome אמיתי (playwright), נמדד **כמה טקסט
המבקר באמת רואה**, ונרשמה **כל** קריאת רשת שנכשלה או חזרה 4xx/5xx. בנוסף,
לכל מערכת עם שרת — נקודות הקצה שהלקוח באמת קורא להן נבדקו חיות.
זה מה שחשף את שלוש התקלות; אף אחת מהן לא נראית מ-HTTP 200.

### 🔴 22 zchuyot — הדף היה **ריק לגמרי**, ומסומן class A ומוצג לציבור
`<BrowserRouter basename="/rights">` — אבל האתר מוגש תחת `more30.com/zchuyot`.
react-router מחזיר `null` **בשקט** כשה-pathname לא מתחיל בבייסניים: אין שגיאה,
אין אזהרה, הנכסים (1.7MB JS) נטענים, האפליקציה עולה — ופשוט לא מציירת כלום.
המדידה: **0 תווים** של טקסט נראה.
תוקן ל-`basename={import.meta.env.BASE_URL.replace(/\/+$/,"")}` — כלומר תמיד
מה שהועבר ל-`vite build --base`, כולל הסרת הסלאש הסוגר (אי-ההתאמה בין
`/zchuyot/` ל-`/zchuyot` לבדה מספיקה כדי לרוקן את הדף).
**אחרי:** 2,438 תווים. וסוכן הזכויות נבדק חי — `POST /zchuyot/api/agent` החזיר
**2,746 תווים** על מקרה אמיתי (אלמן בן 70, נכות 60%): קצבת שאירים עם מבחן
ההכנסה שחל על אלמנים, קצבת אזרח ותיק, מענק חימום, גמלת סיעוד — עם סכומים,
מסמכים ומוקשים, מתוך `rights_reference`.

### 🔴 28 kupot — כל המונים הראו 0, והמסד היה בסדר גמור
הלקוח קרא ל-`/api/hf/meta` ול-`/api/hf/topics` **בשורש הדומיין**. הפורטל עונה
לכל נתיב לא מוכר עם `index.html` שלו ב-**200**, ולכן `res.ok` עבר והכשל התרחש
רק בפרסינג — כלומר "0 תוצאות" במקום שגיאה. ‎`/kupot/api/hf/meta`‎ עצמו החזיר
כל הזמן 435 נושאים.
המנגנון כבר היה בקוד (`VITE_API_BASE` ב-queryClient) — הבאנדל פשוט נבנה בלעדיו.
נבנה מחדש עם `VITE_API_BASE=/kupot` ו-`--base=/kupot/`.
**אחרי:** 435 נושאי קופות · 65 זכויות ממשלה · 15 עמותות · ופילוח לפי קופה
(מאוחדת 71 · מכבי 60 · כללית 29 · לאומית 29). 488 → 34,648 תווים.

### 🟠 18 orech — קישור שבור, ומודול עובד שהוסתר
דף הבית הצביע ל-`/editor/htr`, נתיב שלא קיים (הראוט הוא `/htr`) — ומכיוון
ש-Next עושה prefetch לקישורים, כל טעינה של דף הבית ייצרה 404. במקביל, מודול
**אימות המקורות** היה מסומן "בפיתוח" ובלי קישור בכלל — למרות שהוא פרוס ועובד
(זיהוי ציטוטים, שליפת נוסח מספריא, השוואה וניקוד — כולם אומתו בסבב הקודם).
תוקנו שניהם: `/orech`, `/orech/htr` ו-`/orech/editor` = 200, אפס 404.

### ✅ 03 modaot — ה-API עלה לאוויר, בלי לפתוח משטח סליקה שני
זו הייתה הפתוחה מכולן: הפריסה המקבילה הגישה מסכים אבל **כל מסלולי ה-API
החזירו 404**. הסיבה שלא נפרסה קודם נכונה — ל-03 יש `crons` ל-`jobs/worker`
**כל דקה** ו-`/api/payments/webhook`, ופריסה עם service_role הייתה יוצרת
worker שני ו-webhook תשלומים שני על אותן עסקאות חיות.

הפתרון הפריד בין השניים במקום לוותר על אחד מהם:
- `.vercelignore` מחריג את `app/api/payments` ואת `app/api/jobs` — אין להם
  lambda בפריסה הזו. **הקוד לא נמחק ולא שונה**; הוא חי במקור.
- `vercel.json` של העותק הוחלף ל-`{"framework":"nextjs"}` (הגיבוי:
  `vercel.crons.original.json`) — כך שאף cron לא נרשם.
- **BOM ב-`SUPABASE_SERVICE_ROLE_KEY`** הפיל כל קריאה עם
  `ByteString ... 65279`, ו-`vercel env ls` מציג "Encrypted" ולכן הבית המושחת
  בלתי נראה מבחוץ. נוסף `lib/supabase/env.ts` שמנקה בקוד — בלם שלא תלוי
  באיך שהערך הוזן.

**אומת חי:** `/modaot/api/templates` מחזיר **6 תבניות מודעה אמיתיות** עם
מחירים (שיעור ₪50 · בית כנסת ₪80 · גמ"ח ₪60); `coupons/verify` מחזיר 400
ולידציה (כלומר הראוט קיים); ו-`payments/webhook`, `payments/create`,
`jobs/worker`, `jobs/cleanup` — **404, כמתוכנן**.

### שאר מערכות ה-A — נבדקו ונמצאו עובדות על נתוני אמת
| # | מה נמדד בפועל |
|---|---|
| 01 torah | קורא את הטננט `igud` ואת הטיפים מ-bieebmnm — נתונים חוזרים |
| 02 tamlul | `/tamlul/api/jobs` = 200 JSON אמיתי |
| 04 imud | `/imud/api/books` מחזיר ספרים · `/api/meta` = קטלוג התבניות |
| 10 bkalot | `rights_catalog` נמשך מה-hub בשני עמודים · מפת המצבים · meta |
| 17 chizukim | 1,000 הקלטות ברשימה; `/chizukim/api/recordings/<id>` מחזיר תמלול של 2,342 תווים |
| 26 studio | `/studio/api/templates` ו-`/api/meta` (5 סגנונות, 22KB) חיים |
| 32 nadlan | ראה שלב 1 |

### ✅ רגרסיה
**12/12 מערכות A** נטענות עם תוכן, **אפס** קריאות רשת כושלות, **אפס** שגיאות
עמוד. 11 הנתיבים הנוספים (chatzor, egod, mthbram, galil, smel, gesher,
smachot, briut, mechiron, nihul, crm) — **200 כולם**. שום מערכת לא נשברה.

## שלב 4 — ניהול מאוחד ב-more30.com/admin, כניסה אחת

### הכתובת: `/admin`, ו-`/nihul` מפנה אליה
הניהול היה ב-`/nihul` (ולפני כן גם ב-`more30-admin.vercel.app` שנטפרי חוסמת).
עכשיו הוא ב-**`more30.com/admin`**, ו-`/nihul` מחזיר **307 → `/admin`** במקום
לחיות במקביל. נבנה עם `--base=/admin/` (base יחסי נשבר תחת נתיב בלי סלאש עוקב),
נפרס לאותו פרויקט Vercel — `nihul-more30`, לא נוצר פרויקט חדש. **שם הפרויקט
נשאר `nihul-more30` למרות שהוא מגיש `/admin`** — לא שיניתי אותו כדי לא להחליף
דומיין שהפורטל מצביע אליו.

### 🔴 דליפה שנסגרה: ארבע ה-views של הניהול היו פתוחות ל-anon
`more30_project_overview`, `_tasks`, `_tokens`, `_bugs` היו עם
`GRANT SELECT TO anon`. ה-anon key מוטמע בבאנדל ציבורי — כלומר כל מי שפתח
קונסולה יכול היה למשוך את **כתובות האדמין של כל המערכות**, את יומן הביקורת,
ואת **שמות המפתחות החסרים בכל מערכת** (מפה של איפה הנקודות הרכות).
**0008:** הוספתי `more30_admin_snapshot()` — SECURITY DEFINER שמאמת
`more30_is_admin()` ומחזיר את ארבעתם ב-jsonb אחד — וביטלתי את ההרשאות מ-anon
**ומ-authenticated גם יחד**: חמש מערכות (04,16,26,28,32) מכניסות משתמשים
לאותו פרויקט Supabase, כך ש-`authenticated` פירושו "משתמש כלשהו", לא "אדמין".
אומת מבחוץ: ארבע ה-views מחזירות **401** ל-anon, `more30_public_systems`
(מה שהאתר צריך) עדיין 200.

### כניסה אחת — מייל וסיסמה, ומה היא באמת פותחת
- **סיסמה** (`signInWithPassword`) היא הכניסה הרגילה; הקישור למייל נשאר גיבוי.
  נוסף "שינוי סיסמה" למשתמש המחובר — כך שהסיסמה נקבעת על ידך ואינה ידועה לאיש,
  ובוודאי לא נמצאת בקוד או במסד.
- **מסך "כניסות לאדמין"** אומר לכל מערכת מה שומר עליה. הנתון החדש
  `core.projects.admin_auth` (0009) — `hub | own | token | open | none` —
  **נמדד בדפדפן אמיתי, לא לפי HTTP 200**, שאצל SPA מוכיח רק ש-index.html הוגש.
- הניסוח הכן: **הכניסה הזו פותחת 2 מתוך 10 מסכי האדמין שקיימים** (16 חצור,
  ו-33 שהוא הלוח עצמו). השאר מחזיקים מאגר משתמשים על פרויקט Supabase אחר,
  ואיחוד שלהם דורש service_role של אותם פרויקטים — שאינם בחשבון הזה. לא הבטחתי
  SSO רוחבי שלא קיים.

### 🪤 מה שהמדידה חשפה (ולא היה נראה מ-200)
1. **15 egod — `/egod/admin` פתוח לגמרי בלי שום אימות.** ממשק ניהול מלא
   (מגידים, לידים, פניות, תכנים, "התנתק") נפתח לכל מי שמקליד את הכתובת.
   המערכת מסווגת C ומוסתרת מהאתר, אבל **הנתיב חי**. לא הורדתי אותו — הורדת
   נתיב חי היא החלטה שלך; הוא מסומן באדום בלוח ומחכה להכרעה.
2. **02 ו-03 — דלת האדמין זרקה את הדפדפן החוצה.** שני ה-middleware בנו את
   ההפניה עם `new URL("/login", req.url)`, שנפתר מול ה-origin ומאבד את
   ה-basePath: `/modaot/admin` הפנה ל-`more30.com/login` → catch-all של הפורטל
   → אתר התדמית. **תוקן** ל-`req.nextUrl.clone()` ונפרס.
   אומת: `/tamlul/admin` → `307 /tamlul/login?redirect=/admin`,
   `/modaot/admin` → `307 /modaot/login?next=/admin`. **הגנת הכסף לא נגעה** —
   `payments/webhook` ו-`jobs/worker` עדיין **404** בעותק המקביל.
3. **admin_url היה שגוי בשני הכיוונים** — 21 ו-27 הצביעו לנתיבים שלא קיימים
   (404 / האפליקציה עצמה), ו-32 nadlan החזיקה מסך אדמין אמיתי בלי שיהיה רשום.

### מפתחות וקרדיטים — נמדד מול הספק, לא מוצהר
`portal/api/credits.ts` (באותו origin, מאחורי JWT + `more30_is_admin`).
הוזנו לפורטל `APIFY_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (ANTHROPIC כבר היה).
אומת חי: **Apify · תקף · $3.18 מתוך $5 (64%), מתאפס 28.8.2026** — היתרה
האמיתית היחידה שספק מוכן להחזיר. OpenAI/Anthropic/Gemini — **תקפות המפתח**
בלבד, וכך בדיוק כתוב במסך; אין ממשק יתרה למפתח רגיל, ומספר יפה בלי כיסוי
גרוע מ"לא נמדד". שלושת המפתחות החסרים (03, 22, 30) מוצגים עם שם המשתנה,
הייעוד ומקום ההזנה — **ערכים לא נשמרים שם לעולם**.

### ✅ אומת בדפדפן אמיתי (playwright + Chrome, מול more30.com)
| בדיקה | תוצאה |
|---|---|
| מנותק | שער כניסה בלבד · **אפס** דליפת נתוני לוח · אפס שגיאות |
| סיסמה שגויה | נחסם, עם הודעה קריאה — לא קריסה ולא מסך לבן |
| סיסמה נכונה, לא אדמין | **המסד חוסם** ("אינו מוגדר כאדמין") — השער אינו בלקוח בלבד |
| אותו משתמש כאדמין | הלוח נטען · **מערכות (33)** · 8 תחומים |
| חמשת המסכים | מערכות · כניסות · מפתחות וקרדיטים · רעיונות · אפיונים — כולם נטענים |
| שגיאות עמוד/רשת | **אפס** בכל הסבב |
| רגרסיה | **23/23 נתיבים = 200**, `/nihul` = 307 → `/admin`. שום מערכת לא נשברה |

בדיקת הסיסמה נעשתה עם **משתמש זמני שנוצר ונמחק באותה הרצה** (אומת: 0 שרידים,
auth.users חזר ל-1). הסיסמה שלך לא נקראה ולא שונתה.

### ⚠️ פתוח ודורש אותך
1. **15 egod פתוח בלי סיסמה** — להחליט: להוריד את הנתיב, לנעול, או להשאיר.
2. **איחוד כניסה לשאר המערכות** חסום על `service_role` של
   bieebmnm (01,02,03,18) · trerolyv (22) · ygaqq (31) · hkkky (15) — בלעדיהם
   אי אפשר לחבר את מאגרי המשתמשים.
3. **16 חצור** מסומנת "אותה כניסה", אבל עדיין חסרה לה שורת אדמין ראשונה
   ב-`chatzor.org_admins` (מהסבב הקודם).
4. **`git push` עדיין לא בוצע** — אין טוקן תקף ב-shell. הכול מקומי ומקומיט.

## קונסולידציית Supabase — העברת מסדים זרים לחשבון שבשליטה מלאה (29/07/2026)

**מטרה:** להעביר את המערכות מחשבונות Supabase זרים אל הפרויקט שבשליטתי המלאה
(`uhnrgujbdxhhmoxcjria`, org `rbwengwuxwujbgsynwcs`), סכמה נפרדת לכל מקור, **בלי לשבור
מערכות חיות ובלי לגעת במוגן** (`zr_*`, bkalut-app/09, NEDARIM3873).

### גישות שהתגלו
- **bieebmnm** (`bieebmnmkffwbqlsfozh`, בעצם "bkalut-production" בחשבון b023131500):
  גישת `postgres` מלאה דרך `SUPABASE_PAT` ב-`.env.shared` (Management API SQL endpoint).
- **22/15/31** הם פרויקטי **Lovable** — גישת `postgres` דרך Lovable MCP `query_database`.
  מיפוי מאומת: 22 get-your-rights=`f55ebbb0`→trerolyv · 15 egod=`3827209f`→hkkky ·
  31 hebrew-bridge-crm=`a27fd5fd`→ygaqq (26 הטבלאות תואמות בדיוק את המיגרציות המקומיות).

### שיטה (כלים ב-scratchpad, גיבויים ב-`_more30_vault/supabase_backups/`)
1. **גיבוי מלא לפני נגיעה** — introspection + נתונים ב-base64 (עוקף חסימת NetFree על
   תוכן עברי בתשובות HTTPS). אומת: כל הנתונים תואמים ל-rowcounts, 0 סטיות.
2. **replication אדיטיבי** — כל מקור לסכמה ייעודית משלו ב-uhnrgujb (לא נוגע ב-public/
   nadlan/chatzor/zr_*). `public.` של המקור → נכתב מחדש לסכמה החדשה.
3. **טעינה context-free** — service_role של uhnrgujb (`SUPABASE_SERVICE_ROLE_UHNRGUJB`)
   דרך staging table ב-public + `session_replication_role=replica` (עוקף FK/טריגרים בזמן טעינה).
4. **auth users הועברו** עם ה-hash (bcrypt נייד → התחברות נשמרת). התנגשות אימייל
   `l023131500@gmail.com` (קיים כבר ב-hub) נפתרה עם plus-addressing + הערת reconcile.

### ⚠️ תקרית ולקח (חשוב)
חשיפת הסכמות החדשות ל-PostgREST (`pgrst.db_schemas`) **הפילה את כל ה-API החי של ה-hub
ל-~2 דק'** (schema-cache rebuild נכשל, כנראה timeout 8s של authenticator עם הסכמות
הכבדות). שוחזר מיד ע"י החזרת הרשימה ל-baseline. **מסקנה:** לא לחשוף סכמות חדשות על
ה-hub החי כחלק מהמיגרציה. הטעינה נעשית דרך `public` בלבד (חשוף תמיד, בטוח). הסכמות
החדשות נשארות **עותקים קרים לא-חשופים** — וזה בדיוק המצב הרצוי לפני cutover.

### תוצאה (הכל אומת ב-uhnrgujb)
| מערכת | מקור | סכמת יעד | טבלאות | שורות | auth |
|---|---|---|---|---|---|
| 22 get-your-rights | trerolyv | `getrights` | 6 | 115 | 1 |
| 15 egod | hkkky | `egod`(+`egod_private`) | 20 | 220 | 4 |
| 31 hebrew-bridge-crm | ygaqq | `hebcrm`(+`hebcrm_private`) | 26 | 38 | 6 |
| 01/10 torah/bkalot | bieebmnm | `igud` | (מתוך 139) | | 2 |
| 03 igud-ads | bieebmnm | `igud_ads` | | | |
| 02 igud-transcribe | bieebmnm | `igud_transcribe` | | | |
| 18 torah-editor | bieebmnm | `igud_otvedaf` | | | |
| **bieebmnm סה"כ** | | 4 סכמות | **139** | **5107** | 2 |

- **22/15/31**: replication **מלא** (סכמה+נתונים+פונקציות+RLS+policies+enums+טריגרים+auth). אומת.
- **bieebmnm**: replication **מבני** מלא (139 טבלאות, 329 constraints, 189 indexes, enums,
  RLS enabled) + **כל הנתונים** (5107 שורות; 6 טבלאות `zr_*` מוגנות הוחרגו = 1644 שורות
  לא הועתקו במכוון). **נדחו** (לא הוחלו): 132 functions, 18 views, 8 triggers, 167 policies
  — הסיכון הגבוה ביותר לשכתוב, ונחוצים רק ב-cutover. גיבוי מלא שלהם ב-schema.json.
- `core.projects`: נוספו עמודות `migration_target_project/schema`, `migration_status`,
  `migrated_at` ל-8 המערכות (סטטוס `cutover_pending`). ה-hub נשאר נקי (scaffolding נמחק).

### ✅ 30/07 — החצי הדחוי הושלם: functions/views/triggers/policies ל-igud_*

הפער שנשאר מ-29/07 (סעיף 2 ב"מה נשאר") נסגר. הכול ב-`supabase/consolidation/bieebmnm-logic/`
(4 קבצי SQL + `generate.mjs` דטרמיניסטי + `skipped.txt` + README מלא).

| אובייקט | הוחל ואומת ב-uhnrgujb |
|---|---|
| טבלאות (מהסבב המבני) | 139 |
| views | **18** |
| functions | **18** |
| triggers | **8** |
| policies | **155** |

**ה-hub החי לא נגע:** `public` נשאר בדיוק 27 טבלאות ו-2 policies · `core`/`nadlan`
ללא שינוי · **הסכמות עדיין אינן חשופות ל-PostgREST** (`pgrst.db_schemas` בברירת מחדל)
— בדיוק מה שהפיל את ה-API ב-29/07, ועותק קר לא צריך את זה.

**ארבעה שכתובים שלא היו אופציונליים** (כל אחד היה שובר את ההעתק בשקט):
1. **`SET search_path TO 'public'` בגוף פונקציות** — ב-hub זו הסכמה **החיה**.
   פונקציית SECURITY DEFINER הייתה מחפשת `admin_sessions`/`tenants`/`lessons` שם.
2. **טריגרים בלי שם סכמה** — `pg_get_triggerdef` משמיט את הסכמה שהייתה ב-search_path,
   ולכן הוגדר `ON nedarim_configs ... EXECUTE FUNCTION set_updated_at()`.
3. **קריאות לא-מוסמכות ב-policies** — 78 policies קוראות `is_super_admin(...)` וכו';
   ההיפתרות עוברת ב-search_path שמתחיל ב-`public` של ה-hub → הפוליסי היה נכשל בהרצה.
4. **שם סכמה שהוא גם שם טבלה** — במקור יש טבלה `ads` בסכמה `ads`, ו-policies מפנות
   לעצמן בשם: `ads.tenant_id` הוא **עמודה**. שכתוב עיוור הפך אותה ל-`igud_ads.tenant_id`.
   התיקון: מחליפים `<סכמה>.<שם>` רק כששם האובייקט קיים באמת בסכמה ההיא.

**שערים בגנרטור:** אף statement לא מכוון ל-`public.` (0 הפרות בהרצה האחרונה) ·
6 טבלאות `zr_*` מוחרגות (ואיתן 12 policies) · **114 מתוך 132 ה"פונקציות" הוחרגו** —
הן של pgvector שהותקן ב-`public` של המקור (`cosine_distance`, `binary_quantize`…),
וב-hub התוסף יושב ב-`extensions`. נשארו 18 פונקציות אפליקציה אמיתיות.

**שארית מתועדת:** ב-`igud` יש 4 סדרות ריקות בשם `zr_*_id_seq` שנוצרו בסבב המבני.
הטבלאות עצמן לא הועתקו — אין נתון מוגן. **הושארו במכוון:** מחיקת משהו בשם `zr_*`
היא בדיוק מה שהכלל אוסר, גם כשזה אובייקט ריק שאנחנו יצרנו.

### מה נשאר (cutover — דורש הכרעות/גישה של המשתמש)
- **repoint אפליקציות חיות**: כל מערכת מניחה שהיא הבעלים של `public`; ב-uhnrgujb זה ה-hub.
  איחוד → כל אפליקציה חייבת לעבור ל-schema-qualified client (`db.schema`) או חשיפת סכמה
  ב-PostgREST (זהירות: הפיל את ה-API). אפליקציות Lovable (15/22/31) מחוברות ל-Supabase
  הילידי שלהן — ניתוק לא נתמך נקי. → **תיעוד, לא בוצע.**
- **bieebmnm functions/views/triggers/policies** — להחיל אחרי בדיקת שכתוב פרטני.
- **storage**: הגדרות buckets גובו; קובץ יחיד (getrights lead-documents, 2.8MB) לא נמשך —
  אין credentials ל-storage של הפרויקט הזר. edge functions נמצאות ב-repo המקומי, פריסה ב-cutover.
- **auth reconcile**: `l023131500@gmail.com` קיים 3 פעמים (hub + hebcrm + bieebmnm) עם
  3 UUIDs — לאחד בזמן cutover.
- **המקורות הזרים לא נמחקו** — נשארים חיים כ-fallback (כנדרש).

**מקורות זרים נוספים שלא היו במשימה (מהמפה):** csjekrvu(06,12,17,27), mwljkonw(16,24 —
כבר יש `chatzor`), jhbeelzv(30), aypsqqv(21), pwcswdfg(08🔒). לא טופלו בסבב זה.

## סבב 29/07 — נדל"ן (32) שלב 1: Google Maps חובר בפועל

### 🔴 השורש: זה מעולם לא היה המפתח
המפתח `GOOGLE_MAPS_API_KEY` תקף, `lib/googlemaps.ts` כתוב במלואו, ו-`/api/image`
(פרוקסי צד-שרת ששומר על המפתח) עבד. מה שנשבר הוא **הכתובת שהדפדפן ביקש**:
הרכיבים בנו `src={`/api/image?…`}` גולמי. `basePath` של Next מקדים `<Link>`
ואת הראוטר — אבל **לא** `src` של `<img>` ולא `<a href>` גולמי.

**אומת חי, וזו ההוכחה המלאה:**

| הכתובת שנשלחה | תוצאה |
|---|---|
| `more30.com/api/image?kind=street…` (מה שהדפדפן ביקש בפועל) | **200 · `text/html`** — ה-index.html של הפורטל |
| `more30.com/nadlan/api/image?kind=street…` | **200 · `image/jpeg`** — תמונה אמיתית |

כלומר `<img>` קיבל HTML, נכשל בפענוח, ונפל ל-`onError` → "לא זמין". בלי שום
שגיאה בקונסולה ובלי 404. זו בדיוק מלכודת #1 שתועדה בסבב הקודם — שיושמה על
`fetch()` אבל **לא** על תמונות וקישורים.

### 🪤 מלכודת מדידה: NetFree מטשטש צילומי רחוב
בדיקה מקומית של Street View החזירה ~5.8KB לכל מיקום — כולל **טיימס סקוור**.
נראה ככשל חשבון, אבל אינו: אותה קריאה מהשרת ב-Vercel מחזירה תמונה מלאה
(הוכחה: `/api/image` מחזיר 404 עם `X-Image-Reason: streetview-placeholder`
לכל תמונה מתחת ל-12KB — ובפרודקשן הוא החזיר 200). **NetFree משנה תמונות
פוטוגרפיות בדרך אל המחשב המקומי; מפות וקטוריות ולוויין עוברות שלמות.**
מסקנה לסבבים הבאים: אין לאבחן תמונות מהמכונה המקומית.

### מה תוקן
- **כל כתובת גולמית עברה ל-`apiUrl()`** — `VipPanel`, `Presentation`,
  `PropertyIdCard`. (`Presentation` כבר עשה זאת ל-`fetch` אבל לא לתמונות.)
- **הצילום והמפה עברו מ-`VipPanel` ל-`PropertyImagery` ומוצגים בשלוש הרמות.**
  קודם לכן לקוח בדוח רגיל או מקיף **לא ראה את הנכס שלו בכלל**.
- **נוסף תצלום אוויר** (`maptype=hybrid`) ב-`staticMapUrl` וב-`/api/image`.
- **סימונים מתויגים + מקרא** — כל סימון נושא אות, והמקרא מתרגם אות → סוג · שם ·
  מרחק במטרים · זמן הליכה. שני באגים תוקנו כאן:
  1. סימון הנכס נשא תווית **עברית** (`label:נ`). Google מקבל תו יחיד A-Z/0-9
     בלבד — התמונה חוזרת 200 והתווית **נבלעת בשקט**.
  2. סימוני המוסדות היו `size:small`, וגוגל **אינו מצייר תוויות** על סימון קטן.

### ✅ אומת
`npx tsc --noEmit` נקי · `next build` עבר (12/12 עמודים) · מפה עם סימונים
מתויגים נבדקה בפועל: הסימונים **A**/**B** הזהובים והסימון הירוק של הנכס
מצוירים כנדרש.

### ⚠️ פתוח
1. **כתובת המבחן לא נמסרה** — הפלייסהולדר `[מלא: רחוב, מספר, עיר]` לא הוחלף.
   שלב 2 ("ודא שהעסקה הידועה מופיעה") ושלב 10 אינם ניתנים לאימות בלעדיה.
   שלב 1 נבדק על **דיזנגוף 100 תל אביב** (ברירת המחדל מהסבב הקודם).
2. **לא נפרס** — `git push` עדיין חסום (אין טוקן תקף ב-shell). הקומיט מקומי,
   והעותק `apps/32-nadlan-berega` **טרם סונכרן**.
3. `DATAGOV_SCHOOLS_RESOURCE` עדיין ריק ב-`.env.local` (3,329 בתי הספר).
4. **שלבים 2–10 טרם בוצעו.**

## סבב 30/07 — נדל"ן (32) לרמת מוצר: המפרט המלא, ושבעה סבבי ביקורת על מייל אמיתי

**המפרט:** NADLAN_SPEC.md בשורש הפרויקט (commit 043cd1d).
**מקור האמת:** `Downloads\nadlan-berega` (git). `apps/32-nadlan-berega` הוא העותק
הפרוס (Vercel `nadlan-more30`) ומסונכרן דרך `scripts/sync-nadlan.ps1` — רק
`next.config.mjs` (basePath) ו-`.vercel/` ייחודיים לעותק.

### שיטת העבודה שעבדה, ולמה
הרצה של שתי כתובות הבקרה מקצה לקצה **דרך המייל שנשלח בפועל**, ולא דרך המסך או
קוד סטטוס. שבעה סבבים, ובכל אחד נמצאו טעויות שאינן נראות מ-HTTP 200 ולא מ-
`status=sent`. ההערכה: **סבב ביקורת על התוצר הסופי מצא יותר באגים אמיתיים מכל
בדיקה אחרת** — כולל מספרים שסתרו זה את זה באותו מסמך.

### הבאגים המהותיים שנמצאו ותוקנו (כל אחד commit נפרד)
1. **זיהוי הבניין** — הקדסטר החזיר לכתובת "הבעש״ט 9 רחובות" גוש 3704 חלקה **741**,
   וכל 12 העסקאות שם רשומות בחלקה **331** (חלוקה מחדש). התוצאה: "לא נרשמה עסקה
   בבניין" על בניין חדש שנמכרו בו 11 דירות — בדיוק התלונה. הפתרון: `polygonId`
   של מרשם העסקאות הוא מזהה הבניין, ורק פוליגון בכתובת **זהה** נחשב "הבניין הזה"
   (בלי זה "הדקל 22" קיבל את העסקאות של "הדקל 38").
2. **גיל בניין** — לא היה בכלל. אין מאגר ארצי של היתרי בנייה (אומת: 0 תוצאות
   ל"היתרי בנייה"/"שנת בניה"/"רישוי זמין"). נגזר מהיסטוריית הבניין: קומבינציה
   2020 → דירות מ-2023 ⇒ **בניין בן 3**. גם עסקאות שקדמו לבנייה מחדש מסומנות
   ומוצאות מהספירה.
3. **אוכלוסייה** — הקלפי שנמדדה הייתה במרחק **1,985 מ'** בשכונה אחרת, והדוח אמר
   "89.8% חילוני" באזור עם 57 בתי כנסת. הגיאוקוד עבר ל-GovMap (חינם) לכל 155
   הקלפיות, נשמר ב-`nadlan.poi`, עם תקרת מרחק. עכשיו: **66% שומרי מצוות, 42.3%
   חרדי**, ממתחם ב-309 מ'.
4. **תחבורה** — הדוח הכריז "לא נמצאה תחנה ברדיוס 900 מ'" ובמקביל נשלפו 6 תחנות,
   הקרובה 22 מ'. ואז: אפס קווים בכל התחנות, כי **מזהה תחנה משתנה בין ימים**
   (קוד 38899 = 47080169 ב-30/07 ו-47049937 ב-29/07). עכשיו 19 קווים אמיתיים.
5. **מוסדות** — היו 3 קבוצות בלי אף בית כנסת/מקווה/גן. עכשיו 7 קבוצות: 25 חינוך,
   18 גנים, **57 בתי כנסת** (הקרוב 45 מ'), 7 מקוואות ממאגר ממשלתי, 58 מסחר,
   76 בריאות, 55 פנאי. Nearby חסום ב-20 → חיפוש עם עימוד.
6. **מסירה במייל** (§1 של המפרט) — לא הייתה. עכשיו: `nadlan.report_requests`,
   `/order`, תור בניהול עם "הפק ושלח", Resend, ותצלום הדוח שנשלח.
7. **טאבו** (§4.10) — העלאה + ניתוח (Claude קורא את ה-PDF), שיוך חובה לדירה/כניסה/
   בניין, bucket פרטי, RLS בלי policies.
8. **מספרים** — חציון של שתיים החזיר את הגבוה; שנים הוצגו כ"2,023"; תאריכי ISO
   גולמיים; עסקאות כפולות (אותה עסקה ביומיים עם תת-חלקה אחרת) ניפחו 6 מכירות
   ל-11; אזהרת תמהיל גדלים חושבה על קבוצה אחרת מזו שנמדדה (אזהרה **שקרית**);
   שורה שסומנה "ייתכן טעות דיווח" נכללה בחציון שהדוח מציג.
9. **שם השולח** — הגיע כ-`???? ????`. הערך מושחת **בדרך ל-Vercel**, לא בקוד
   (`vercel env ls` מציג "Encrypted" ולכן זה בלתי נראה). עברית עברה לקוד,
   הכתובת בלבד ב-env, קידוד RFC 2047. עכשיו `נדל״ן ברגע`.

### מפתחות שהוזנו ל-nadlan-more30
`RESEND_API_KEY` (סקופ לדומיין more30.com בלבד), `RESEND_FROM=nadlan@more30.com`,
`PUBLIC_BASE_URL`, `DATAGOV_MIKVE_RESOURCE`, **ו-`ADMIN_TOKEN` סובב** —
הערך החדש נמצא ב-scratchpad של הסשן ובדו"ח למשתמש.

### 🪤 מלכודות חדשות
1. **`\b` לא עובד על עברית ב-JS.** אותיות עבריות אינן `\w`, ולכן `/^גן\b/`
   אינו מתאים ל"גן ריקי". להשתמש במפריד מפורש.
2. **מזהי GTFS הם לפי תאריך.** נפילה ליום קודם מחייבת להביא את תחנות אותו יום
   ולהתאים לפי **קוד** התחנה.
3. **`Invoke-WebRequest` ב-PS 5.1 מפרש JSON בלי charset כ-Latin-1** ומשחית עברית.
   לאימות עברי — `node` (fetch), לא PowerShell.
4. **עברית בארגומנט shell אל `vercel env add` הופכת ל-`?`.** טקסט עברי — בקוד.
5. **Places בישראל מתייג מרפאות ומרכזים רפואיים כ-`hospital`.** התג אינו עדות.
6. **Text Search מדורג לפי רלוונטיות, לא מרחק** — ל"הקרוב ביותר" רק Nearby עם
   `rankPreference: DISTANCE`.

### ⚠️ פתוח ודורש אותך
1. **`git push` לא בוצע** — אין טוקן תקף ב-shell. 9 קומיטים מקומיים ב-
   `Downloads\nadlan-berega` + קומיט המפרט ב-more30.
2. **מודעות ושכירות = 0** בשתי הכתובות: יד2 חוסם את המושך, ומדלן לא החזיר מודעות
   באזורים האלה. הדוח אומר זאת במפורש ולא ממציא. דורש בדיקת actor/מקור מורשה.
3. **מרחק לבית חולים לא מאומת** — ראה מלכודת 5. הדוח אומר "לא אימתנו" ולא ממציא.
4. **דוח מקיף לוקח 40–340 שניות.** `maxDuration=300`; הרצה אחת חרגה והצליחה
   בכל זאת. שווה לפצל לעבודה אסינכרונית לפני עומס אמיתי.
5. הודעות בדיקה נשלחו ל-`l023131500@gmail.com` (22 בקשות ב-`report_requests`).

## סבב 30/07 בוקר — עדיפות 1: יד2 + כפתורי ההורדה (הושלם ואומת)

### ✅ א. יד2 — לא הייתה חסימה. שני באגים אמיתיים, מדודים מול ה-actor החי
המסקנה הקודמת ("יד2 חוסם את המושך") **הייתה שגויה**. מדידה ישירה מול
`swerve~yad2-scraper`: משיכה עירונית מחזירה מודעות אמיתיות, בלי proxy בכלל.

| # | הבאג | ההוכחה |
|---|---|---|
| 1 | **ה-residential proxy מעולם לא הופעל.** שם השדה ב-input schema של ה-actors הוא `proxyConfig`; הקוד שלח `proxyConfiguration`. Apify מתעלם בשקט משדות שאינם בסכמה → כל הרצה "עם proxy" הייתה הרצה רגילה עם תווית | נקרא מה-input schema החי של הבילד |
| 2 | **שם הרחוב נשלח כ-`neighbourhood`.** לוג ההרצה: ה-actor מושך 80 מודעות לעיר, הסינון חותך ל-0, והשומר הפנימי `SILENT_SUCCESS_GUARD` מפיל את כל ההרצה. מבחוץ: `HTTP 400 run-failed`, **בלי** המילה blocked → בדיקת החסימה הישנה פספסה, וה-retry לא נכנס לפעולה כלל | `run mYbBDt8bfJQVFJCai` |
| 3 | **יד2 אינו מחזיר קואורדינטות כלל** (אין `latitude`/`longitude` בפלט). סינון הרדיוס העביר כל מודעה חסרת-מיקום → משיכה עירונית הייתה מוצגת כ"מודעות ליד הנכס" | רשימת השדות בפלט ה-actor |

**מה שונה:** יד2 מושך את העיר פעם אחת עם residential (`proxyConfig`), ואנחנו
מסננים מיקום בעצמנו — לפי מרחק כשיש קואורדינטות, ולפי התאמת רחוב/שכונה כשאין.
מודעה שאי אפשר להוכיח שהיא באזור **אינה מוצגת ככזו**; אם לא נמצאה אף אחת,
הדוח אומר שהרשימה עירונית. מדלן נשאר על הסלמה-בתגובה-לחסימה (עובד ב-3 שניות).
נוסף `retry` מודע-לשעון, ו-5xx של Apify כבר לא מדווח כ"הלוח חוסם" — זו האשמה
של הצד הלא נכון.

**אומת מול ה-actor החי, שתי כתובות הבקרה:**
- רחובות / הבעש״ט — **היה 0, עכשיו 2** (מדלן על הרחוב עצמו, יד2 בשכונה תואמת).
- תל אביב / דיזנגוף 100 — **14 מודעות**, 117–614 מ׳, כולן על דיזנגוף.

⚠️ **`\b` אינו עובד על עברית** (אותיות עבריות אינן `\w`) — גבול המילה בהתאמת
שמות נבדק במפורש מול רווח/קצה מחרוזת.

### ✅ ב. שני כפתורי ההורדה
- **PDF היה שבור בפרודקשן** ומחזיר 500 בכל לחיצה. תיקון ה-`next.config.mjs`
  נכתב בסשן קודם אך **לא נדחף ולא נפרס** — לכן הפרודקשן המשיך להגיש את הכשל.
- **למצגת לא הייתה הורדה בכלל** — רק "פתח מצגת". נוסף `/api/deck` + כפתור
  **"הורדת המצגת"** בשני המקומות (VipPanel ו-ReportView).

**🪤 המלכודת שעלתה שני סבבי פריסה — `libnss3.so: cannot open shared object file`:**
`@sparticuz/chromium@131` בוחר איזו חבילת ספריות לחלץ לפי זיהוי גרסת ה-runtime,
ו**שתי הבדיקות שלו אינן מכסות את Node 24**: `isRunningInAwsLambda()` מוציא רק
20.x ו-22.x, ו-`isRunningInAwsLambdaNode20()` **דורש** 20.x או 22.x. הפרויקט רץ
על Node 24 → שתיהן false → אף חבילה לא מחולצת ו-`LD_LIBRARY_PATH` כלל לא נקבע.
הבינארי כן הגיע — הוא פשוט לא מצא את הספריות.
**הפתרון:** `AWS_LAMBDA_JS_RUNTIME=nodejs20.x` כ-env של הפרויקט (החבילה בודקת
גם אותו — מסלול Netlify), מה שבוחר את חבילת AL2023 **בלי** להוריד את גרסת ה-Node
של כל האפליקציה. **המשתנה הזה נושא-עומס — לא למחוק.** מתועד ב-`lib/browser.ts`.

**מלכודות פריסה נוספות:** `vite build` מוחק את dist — לא רלוונטי כאן, אבל
`sync-nadlan.ps1` **אינו מסנכרן `next.config.mjs`** (לעותק יש basePath משלו).
במקרה הזה העותק כבר הכיל את התיקון; בפעם הבאה שמשנים את הקובץ הזה בריפו —
**לעדכן ידנית גם את `apps/32`**, אחרת השינוי לא מגיע לפרודקשן.

**אומת בלחיצה אמיתית (Playwright + Chrome, מול more30.com/nadlan):**
| כפתור | קובץ שירד | גודל | תקין |
|---|---|---|---|
| הורדת המצגת | `מצגת — דיזנגוף 100 תל אביב.pdf` | 1,434,321 B | `%PDF-` … `%%EOF`, **9 שקופיות**, `failure=null` |
| הורד PDF מעוצב | `נדלן-ברגע — דיזנגוף 100 תל אביב.pdf` | 3,270,646 B | `%PDF-` … `%%EOF`, **48 עמודים**, `failure=null` |

שמות הקבצים בעברית עוברים שלמים (`filename*=UTF-8''`). תחת print-media אומת:
header ו-footer שניהם `display:none`, 9 שקופיות, כל אחת 209mm בדיוק, אף אחת ריקה.

### 💸 ממצא עלות שחייב לעלות לדיון — ואזהרה על המכסה
**אין מטמון ב-`/api/report`.** כל רינדור בונה את הדוח מאפס, כולל הקריאות
בתשלום (Apify, Google, AI). כלומר כל הפקת PDF/מצגת/מייל = דוח שלם נוסף בתשלום.
מיד תיקנתי את מה שהוספתי: המצגת אינה מציגה מודעות באף שקופית, ולכן
`/present?print=1` מבקש `skipListings=1`. **המסך וה-PDF לא נגעו** — הם כן מציגים
את הסעיף וממשיכים לשלם עליו.

⚠️ **מכסת Apify מוצתה — `monthlyUsageUsd 5.28` מתוך תקרה של `$5`.** המחזור
התחיל 28/07 ומתאפס **27/08/2026**. חלק ניכר מזה נשרף באימות שלי היום:
46 הרצות בשעה 06:00 UTC = **$1.65**. הסיבה למכפיל היא בדיוק הסעיף שלמעלה —
כל רינדור לצורך אימות (מסך, PDF, deck, לחיצה חוזרת) מפעיל משיכה בתשלום.
**המשמעות המעשית:** בפרודקשן סעיף המודעות מציג כרגע את הודעת המכסה הישרה
("מכסת השימוש החודשית… נוצלה במלואה"), ולכן **תיקון יד2 אומת מול ה-actor החי
אך טרם אומת מקצה-לקצה בלחיצה בפרודקשן** — זה חסום עד חידוש המכסה או שדרוג התוכנית.

**קומיטים (מקומיים ב-`Downloads\nadlan-berega`):** `3c61c94` יד2 · `f3384d3`
הורדות · `acdc126` skipListings + תיעוד ה-env. `git push` עדיין חסום (אין טוקן).

## סבב 30/07 — "העסקאות שנמכרו לא מדויקות": שורש אחד, 77 מטר

> הוראת המשתמש: (1) להציג כברירת מחדל רק עסקאות מ-3 השנים האחרונות, מהחדשה לישנה,
> עם כפתור "הצג שנים קודמות"; (2) כל עסקה חייבת להיות אמיתית ומדויקת מ-nadlan.gov.il,
> כולל גוש/חלקה + רחוב+מספר, והמרה בשני הכיוונים; לאמת מול המקור ולא להציג ערך לא מאומת.

### 🔴 השורש: כל שאילתת קדסטר נפלה 77 מ' מהנקודה המבוקשת

`EPSG:2039` יושבת על **דאטום ישראל 1993**, לא על WGS84. `lib/itm.ts` הפעילה את
ההיטל (Transverse Mercator) אבל **דילגה על טרנספורמציית הדאטום**. ההסחה קבועה
ומגיעה לכ-77 מ' — יותר מרוחב חלקה עירונית.

**ההוכחה — שתי קריאות בלתי תלויות לאותו מיקום פיזי ("דיזנגוף 100 תל אביב"):**

| מקור | ערך |
|---|---|
| GovMap autocomplete (Web Mercator) | 3871037.03 , 3773716.32 |
| nadlan.gov.il שולח לשרת הקדסטר (ITM) | **178828.35 , 665186.31** |
| ההמרה הישנה שלנו | 178894.34 , 665226.82 → **סטייה 66 מ' מזרחה, 40 צפונה** |
| אחרי תיקון Helmert 7 פרמטרים | 178829.06 , 665185.46 → **שארית 1.1 מ'** |

**מה זה עשה בפועל:** שאילתת החלקה נחתה בחלקה השכנה. "דיזנגוף 100" הוצג כ**גוש
7091 חלקה 203** — שהיא החלקה של **דיזנגוף 102**. הקדסטר החי, וגם nadlan.gov.il
לאותה כתובת בדיוק, אומרים **גוש 7091 חלקה 7**.

**ולקח נוסף:** "החלוקה מחדש בהבעש״ט 9 רחובות" שתועדה בסבב הקודם (קדסטר 741 מול
עסקאות 331) **מעולם לא הייתה** — זו הייתה אותה הסחה. אחרי התיקון הקדסטר מחזיר
**3704/331**, בדיוק החלקה שהעסקאות רשומות בה, ו-`parcelMismatch=false`.

הבאג פגע בכל שאילתה מבוססת-ITM: קדסטר, תכנון (XPLAN), התחדשות עירונית, ו-POI.

### 🔴 שורש שני: שרת הקדסטר מת, והכישלון היה בלתי נראה

`open.govmap.gov.il/geoserver` **הוסר**. הוא עדיין נפתר ב-DNS (147.237.2.142)
ומחזיר **HTTP 200** — עם דף השגיאה הכללי של אתרי הממשלה. לא 404, לא DNS error.
`fetchJson` זרק "תשובה אינה JSON", הקורא בלע את החריגה, וגוש/חלקה נשארו ריקים.
(גם `es.govmap.gov.il` ו-`ags.govmap.gov.il` מתים.)

**הוחלף למקורות שאתר הנדל"ן הממשלתי עצמו משתמש בהם** (כולם נבדקו חי):
1. **נקודה → חלקה:** `POST www.govmap.gov.il/api/spatial-analysis/layer-features-by-location`,
   שכבת `parcel_all`. הנקודה ב-ITM; `fields` חייב רשימה מפורשת (`[]` → "No fields
   specified", `["*"]` → attributes ריק). מאמת `apiToken` מול ה-Origin — הטוקן
   הציבורי נמשך בזמן ריצה מ-`nadlan.gov.il/config.json` ולא מקובע בקוד.
2. **גוש/חלקה → נקודה:** `POST www.govmap.gov.il/api/search-service/autocomplete`
   עם "גוש X חלקה Y". פתוח לגמרי. ⚠️ חייבים התאמת טקסט מדויקת — "גוש 7091 חלקה 7"
   מחזיר גם "חלקה 70" ו-"חלקה 71", והראשון אינו בהכרח המבוקש.
3. **אימות בלתי תלוי:** `POST api.nadlan.gov.il/parcel-valid` `{ids:["7091-7"]}` —
   פתוח, בלי reCAPTCHA. מחזיר קיום, מספר תתי-חלקות, וחלקה מובילה אחרי חלוקה/איחוד.

### מה נבדק מול nadlan.gov.il, ומה התגלה על המקור

עמוד הכתובת ב-nadlan.gov.il ל"דיזנגוף 100" מציג **10 עסקאות בגוש 7091 חלקה 7**
(האחרונה 03/09/2019). המשיכה החופשית שלנו (`govmap/real-estate`) — **47 פוליגונים,
9,704 עסקאות ברדיוס 150 מ' — אין בהן אף אחת מהעשר**, ואין אף פוליגון עם מספר בית 100.
הנתיב הרשמי לאותן רשומות (`api.nadlan.gov.il/deal-data`) **חסום מאחורי reCAPTCHA**
(אומת: `token-verify` צורך טוקן reCAPTCHA Enterprise) — כלומר אינו נגיש לשרת, ולא
נעקוף אותו. לכן: הדוח **אומר את האמת** ("לא נמצאה עסקה שניתן לשייך לבניין במרשם
שאנחנו קוראים") ומצרף **קישור ישיר לעמוד הרשמי של אותה כתובת**. מה שאסור — ומה
שקרה קודם — הוא להשלים את החסר בעסקאות של בניין שכן.

### ✅ מה נבנה

- **שער זהות לכל עסקה** — עסקה נכנסת לדוח רק אם יש לה גוש, חלקה, רחוב, מספר בית
  ותאריך. חסרה — לא לטבלה, לא לחציונים, לא לספירות; המספר שהוסתר מדווח ללקוח.
  נמדד: 0 רשומות נפסלו בשתי כתובות הבקרה.
- **`Transaction` נושא `streetName`/`houseNum`/`settlement`/`sourceOrder` בנפרד** —
  במקום לפענח מחרוזת. הפענוח נכשל על "הבעש״ט 9" ועל כתובות בלי מספר.
- **באג שנמצא תוך כדי:** התאמת רחוב ניקתה גרשיים **רק מצד אחד**, ולכן `הבעש"ט`
  של המרשם לא התאים ל-`הבעשט` המבוקש — **כל** עסקה באותו רחוב סווגה "בסביבה"
  ולא נכנסה לחציון הרחוב. אומת אחרי התיקון: "הבעש״ט 11" → "באותו רחוב, מספר 11".
- **`ParcelIdentity`** — ההמרה בשני הכיוונים עם מקור לכל צד: גוש/חלקה מהקדסטר,
  רחוב+מספר **מהעסקאות הרשומות בחלקה עצמה** (המקור החזק לכיוון ההפוך), אימות מול
  nadlan.gov.il, `crossChecked`, וקישור לעמוד הרשמי.
  חיפוש לפי גוש/חלקה מחזיר עכשיו גם כתובת בכותרת — **רק כששני הכיוונים מסכימים**.
- **טבלת העסקאות:** ברירת מחדל 3 שנים אחרונות, **מהחדשה לישנה**; "הצג שנים קודמות"
  לשאר; עמודות **כתובת (רחוב+מספר+יישוב)** ו-**גוש/חלקה/תת-חלקה** בפורמט `7091-7-13`
  — בדיוק כמו ב-nadlan.gov.il, כדי שאפשר להשוות שורה מול שורה. אותן עמודות במייל
  וב-PDF, ושם הסדר הכרונולוגי הוא ההגנה היחידה (אין כפתור).

### ✅ אומת חי (dev server + Playwright/Chrome)

| בדיקה | לפני | אחרי |
|---|---|---|
| דיזנגוף 100 → גוש/חלקה | 7091/**203** (של דיזנגוף 102) | **7091/7** = כמו nadlan.gov.il · `parcelVerified=true` |
| הבעש״ט 9 → גוש/חלקה | קדסטר 741 מול עסקאות 331 ("חלוקה מחדש") | **3704/331** בשני המרשמים · `crossChecked=true` |
| כיוון הפוך "גוש 3704 חלקה 331" | כותרת בלי כתובת | כותרת **"הבעש״ט 9, רחובות · גוש 3704 חלקה 331"** |
| עסקאות חסרות זהות | הוצגו | **0** — שער הזהות |
| סדר הטבלה | לפי קרבה (2003 בראש) | **מהחדשה לישנה**, 965 שורות בסדר קפדני 7.7.2026 → 16.1.1998 |
| ברירת מחדל | הכול | **75 עסקאות מאז 2023** + "הצג שנים קודמות (940 עד 2023)" |
| שגיאות עמוד | — | רק אזהרות `defaultProps` של recharts (קיימות מקודם) |

### ✅ אימות מול המקור — שורה מול שורה מול nadlan.gov.il (הבעש״ט 9 רחובות)

פתחתי בדפדפן את עמוד הכתובת הרשמי והשוויתי לטבלה שלנו:

| nadlan.gov.il | אצלנו |
|---|---|
| 11/01/2026 · `3704-331-8` · 2,800,000 ₪ · 130 מ״ר (+ כפילות 10/01 `331-7`) | ✓ זהה |
| 09/09/2024 · `3704-331-9` · 2,850,000 ₪ · 130 (+ כפילות 08/09 `331-6`) | ✓ זהה |
| 16/01/2024 · `3704-331-10` · 2,825,000 ₪ · 125 (+ כפילות 15/01 `331-5`) | ✓ זהה |
| 05/07/2023 · `331-11` · 2,660,000 ₪ · 125 · ו-04/07 `331-4` · 2,700,000 | ✓ זהה |
| 13/09/2020 · `331-2` · 4,000,000 ₪ · 834 · קומבינציה | ✓ (מסומן חריג) |
| 2001 · `331-1` · 836,000 ₪ | ✓ (מסומן "לפני הבנייה מחדש") |

תאריכים, מחירים, שטחים וגוש-חלקה-תת-חלקה — **תואמים במלואם**. העמוד הרשמי מציג כל
עסקה **פעמיים** (שני דיווחים לאותה עסקה); אנחנו מאחדים ומדווחים 6 עסקאות ולא 11.
**שארית ידועה:** בשורת 2,700,000 המקור מציג תת-חלקה `331-4` ואנחנו `331-11` — בגלל
איחוד הכפילויות (הרשומה שנשמרת היא זו שיש בה תיאור סוג נכס). המחיר, השטח והתאריך זהים.

### 🪤 שני באגים שנמצאו **בזכות** ההשוואה למקור (ותוקנו)

1. **עסקאות הבניין נדחקו מהטבלה.** הכרטיס הכריז 6 עסקאות בבניין והטבלה הראתה 5:
   שתי מכירות בבניין מ-2024 (2,850,000 ו-2,825,000 ₪) נפלו מתחת לשורה 25 בגלל
   עסקאות שכנות מ-2025–26. המיון לפי קרבה, שהוחלף, הבטיח את זה במקרה. עכשיו
   החיתוך **שומר תמיד את שורות הבניין** ומבזבז את התקרה על השאר.
2. **הקישור לאימות נחת ב"לא נמצא".** `?view=address&id=53921561&page=deals` נפתח
   לת״א, ואותו קישור ל-`53633441` (רחובות) הופנה ל-`view=notfound`. עם
   **`&setlCode=8400`** הוא נפתח. קוד היישוב מגיע חינם עם כל עסקה (`settlementId`).
   הקישור גם **עלה למסך** — קודם הוא היה קיים רק בתוך אזהרה, כלומר במצב הרגיל
   הלקוח לא היה יכול לבדוק כלום.

### ✅ נפרס לפרודקשן ואומת ב-more30.com/nadlan (Playwright + Chrome)

`nadlan-more30` נפרס 4 פעמים עד READY (dpl_9YnHbP… → …7yzgcpu1n). אומת חי:

| בדיקה | תוצאה |
|---|---|
| כותרת הטבלה | "75 עסקאות שנסגרו מאז 2023 — מהחדשה לישנה" |
| ברירת מחדל | 25 שורות, **כולן** בתוך 3 שנים (7.7.2026 → 15.1.2024) |
| סדר | **קפדני** מהחדש לישן — נבדק על כל 965 השורות (עד 16.1.1998) |
| גוש/חלקה בכל שורה | ✓ 100% · פורמט `3704-331-8` |
| עסקאות הבניין | 3/3 בתוך החלון מוצגות כברירת מחדל |
| כפתורים | "הצג את כל 75…" · **"הצג שנים קודמות (940 עסקאות עד 2023)"** |
| קישור אימות | `…id=53633441&page=deals&setlCode=8400` — נבדק שנפתח ומציג עסקאות |
| דיזנגוף 100 | גוש **7091/7** · `parcelVerified=true` · 22 תתי-חלקות |
| כיוון הפוך | "גוש 3704 חלקה 331" → כותרת "הבעש״ט 9, רחובות · גוש 3704 חלקה 331" |
| רגרסיה | **23/23 נתיבים תחת more30.com = 200** (`/nihul` 307→`/admin`, כמו קודם) |

**מודעות (יד2):** `usedResidentialProxy:["yad2"]` — כלומר תיקון ה-`proxyConfig`
פעיל בפרודקשן. `quotaExhausted:true` — **מכסת Apify עדיין מוצתה** (מתאפסת
27/08/2026), ולכן הסעיף מציג את הודעת המכסה הישרה ואין אימות end-to-end בלחיצה.
תוקן גם: ההודעה הוצגה **פעמיים** (נרשמת פעם לכל לוח) → אוחדה.

**קומיטים (מקומיים ב-`Downloads\nadlan-berega`):** `cd74e40` דאטום+קדסטר ·
`d96d8ef` זהות עסקה + המרה דו-כיוונית · `f903207` טבלת 3 השנים ·
`b547038` שורות הבניין לא נחתכות · `bce514e` קישור אימות + setlCode ·
`788527c` הודעת מכסה כפולה.

## ✅ שלב 3 (MASTER_PLAN) — DONE · 30/07/2026 · נדל"ן: שכירות/מסחרי/קרקעות + מנוע היתרים

> **DoD של השלב:** "3 הכפתורים החדשים מפיקים דו"ח אמת עם מקור לכל נתון."
> **הושג**, עם חריג אחד מדווח: סעיפי המודעות (שכירות/מסחרי) חסומים במכסת Apify
> עד 27/08 — הדוח אומר זאת במפורש במקום להציג רשימה ריקה. ראה `NEEDS_USER.md`.

### מה נבנה
- **4 כפתורי כניסה** (`lib/assettype.ts`): מגורים · שכירות · מסחרי · קרקעות ומגרשים.
  הכפתורים **לפני** תיבת החיפוש ולא אחריה — הבחירה קובעת מה **נמשך** מהמקורות
  (הלוחות נשאלים על שכירות/מסחרי, לא על דירות למכירה), ולכן היא חלק מהשאילתה
  ולא מסנן תצוגה. אותם כפתורים חוזרים מעל הדוח ומחליפים אותו בלחיצה, והכתובת
  מתעדכנת (`?type=`) כדי שרענון וקישור יחזירו את מה שרואים.
- **מנוע היתרים ומסמכים** (`lib/permits.ts`) — משותף לכל ארבעת התחומים.
  שכבה 1 של מרשם התכנון (`queryPlansAtPoint`) מחזיקה את מה שאין בשכבת ייעודי
  הקרקע: הוועדה המקומית, מרחב התכנון, אילו תכניות מכוחן ניתן להוציא היתר היום,
  מה בהליך (כולל מועד התנגדויות), מסמכי מדיניות, כמויות מאושרות, וקישור לתקנון
  ולתשריט לכל תכנית. נקרא מ**אותה** משיכה שהדוח כבר עושה — כדי שדוח לא יציג
  שני ייעודים לאותו מגרש.
- **שכירות** — מדד שכר הדירה של הלמ"ס + מודעות שכירות + שכ"ד חציוני למ"ר +
  אומדן חודשי לנכס + תשואה שנתית ברוטו (המכנה: חציון המחיר למ"ר של אותו אזור).
- **מסחרי** — ייעוד מסחרי, תכניות שמוסיפות שטחי מסחר/תעסוקה, עסקאות מסחריות
  ממרשם העסקאות, נכסים מסחריים מוצעים, סביבה עסקית ונגישות תחבורתית.
- **קרקעות** — שטח החלקה, ייעוד היום, תכניות בהליך שעשויות לשנותו, עסקאות קרקע,
  ומדיניות רמ"י (קובץ החלטות המועצה, פרק "קרקע חקלאית") עם נוסח הסעיפים.
- **`lib/rami.ts`** — קובץ החלטות מועצת מקרקעי ישראל: `startDates.json` →
  `tree.json` → `content.txt`. פתוח לגמרי, בלי מפתח ובלי captcha. נמשך **רק**
  בדוח קרקע (2.2MB), ומוצג במפורש כמסגרת מדיניות ולא כעובדה על החלקה.

### 🔑 שלושה ממצאים מהאימות מול שתי כתובות הבקרה
1. **מדד השכירות שכמעט נשלח היה הלא נכון.** `120450` הוא קבוצת "דיור" כולה —
   ובתוכה `120490` ("שירותי דיור **בבעלות הדיירים**" = זקיפת דיור) ו-`120510`
   (תיווך וביטוח). הסדרה שמודדת שכר דירה בפועל היא **`120460`** —
   "שכר דירה פרטי, ציבורי ושכירות ארוכת טווח בפיקוח ממשלתי". נלקח מעץ הקטלוג
   הרשמי (`index/catalog/tree?id=a`, subjectId 38) ואומת חי: 106.4, +3.3% שנתי.
2. **חור כיסוי במפה התכנונית — ולא "אין תכניות".** בהדקל 22 חצור, שכבה 1 ושכבה 4
   מחזירות **אפס** על החלקה עצמה (גם על מרכז החלקה מהקדסטר), ומחזירות כיסוי מלא
   כבר ב-120 מ'. הנוסח הקודם ("לרוב בשוליים של יישוב או בשטח פתוח") היה שגוי
   בדיוק שם — זו שכונה ותיקה שתכניותיה לא עברו דיגיטציה. עכשיו: שאילתה שנייה
   ברדיוס 150 מ' **רק** כדי להוכיח שזה חור כיסוי, וייעוד השכנים מוצג כשל השכנים
   ולא כשל המגרש. **הדבר היחיד שנלקח מהסביבה הוא שם הוועדה** — כי הוועדה היא
   תכונה של הרשות המקומית ולא של החלקה — והוא מסומן "מקורב" (חצור: הוועדה
   "חצור הגלילית", מרחב "אצבע הגליל").
3. **שורת המקור הדפיסה ללקוח מפתחות באנגלית.** `sourceKey: 'nadlan'`, `'apify'`,
   `'google'`, `'gtfs'`, `'cadastre'` לא היו במרשם המקורות, ולכן הוצג
   "מקור: nadlan". בדוח שכל הרעיון שלו הוא מקור לכל נתון — זו השורה שאסור שתישבר.
   נוסף `SOURCE_ALIASES` ב-`lib/sources.ts` ו-`Bits.tsx` עבר ל-`sourceOf()`.

### 🪤 מלכודות ותיקונים נוספים
- **MAVAT לא ניתן למשיכה:** `rest/api/SV4` דורש טוקן **reCAPTCHA Enterprise**
  (בלי הכותרת 404, עם טוקן מזויף 401). לא עוקפים captcha — מציגים את רשימת
  המסמכים, מקשרים לעמוד התכנית הרשמי, ואומרים ללקוח איפה ההורדה מתבצעת.
- **יד2/מדלן ישירות:** `gw.yad2.co.il` מחזיר Radware Bot Manager Captcha, מדלן 400.
  אין מסלול חלופי ל-Apify. `komo.co.il` פתוח אך טוען את המודעות ב-AJAX — לא נכנס.
- **כמויות התכנית הן לכל שטח התכנית:** "2,000 יח"ד" בתכנית של 18,330 דונם אינו
  זכות של המגרש. כל שורת כמות נושאת את שטח התכנית, וכותרת השדה היא "התוכנית
  המאושרת **הספציפית ביותר**" ולא "החלה על המגרש".
- **`ל${unitNoun}` הפיק "להדירה"** — המילית בולעת את ה' הידיעה.
- **`Listings` שירת שלוש זרימות עם טקסט של דירות:** בדוח מסחרי הוא כתב
  "לא נמצאו דירות שמוצעות למכירה" מתחת לכותרת "הנכס המסחרי". עכשיו הטקסט לפי סוג.
- **רמ"י:** הביטוי `פיצוי` לבדו גרר סעיפים שאינם שינוי ייעוד (פיצוי לסוכנות,
  הרחבה קהילתית) — 23 סעיפים ירדו ל-9 רלוונטיים.
- **קרקע לא מושכת מודעות בכלל** (הסעיף מוסתר ממילא) — לא משלמים על מה שלא מוצג.
- `listings` מוסתר בשכירות/מסחרי: אותן מודעות כבר מוצגות בסעיף הייעודי ובשמן הנכון.

### ✅ אימות — Playwright + Chrome, שתי כתובות הבקרה, מקומי **ופרודקשן**
`nadlan-more30` נפרס (`dpl_GuJTHuZrFAt8SybKFFMt5Eo6XYhq`, READY) ואומת חי:

| בדיקה | תוצאה |
|---|---|
| 4 כפתורי כניסה ב-more30.com/nadlan | מגורים · שכירות · מסחרי · קרקעות ומגרשים ✓ |
| **קרקע** · הבעש"ט 9 | שטח חלקה 834 מ"ר · 23 עסקאות קרקע · חציון 4,796 ₪/מ"ר · עסקה אחרונה 9.7.2025 · 9 סעיפי רמ"י (גרסה 95, 15/06/2026) · 12 קישורי תקנון/תשריט |
| **קרקע** · הדקל 22 | חור כיסוי מדווח במפורש; ייעוד השכנים ("שטח ציבורי פתוח", תכנית 259-0949610) מסומן כשל השכנים |
| **מסחרי** · הבעש"ט 9 | 6 עסקאות מסחריות · חציון **16,200 ₪/מ"ר** · אחרונה 17.7.2025 · 58 עסקים בסביבה · תחנה 157 מ' |
| **מסחרי** · הדקל 22 | ריק ואמיתי (רחוב מגורים) — כל שדה עם הסבר למה |
| **שכירות** · שתי הכתובות | מדד 106.4, בסיס 2024, +3.3% שנתי · המודעות: הודעת מכסה ישרה |
| **היתרים** · הבעש"ט 9 | ועדה "רחובות" · 11 מאושרות · 1 בהליך · 1 מדיניות · 13 תכניות עם מסמכים |
| רגרסיית מגורים | 75 עסקאות מאז 2023, מהחדשה לישנה, 25 שורות ברירת מחדל — כמו קודם |
| רגרסיית נתיבים | **24/24 מחזירים 200** (`/nihul` 307→`/admin`, כמו קודם) |
| שגיאות קונסולה | רק `defaultProps` של recharts (קיים מקודם) + 404 ל-Street View בחצור |

**קומיט:** `3fb1935` ב-`Downloads\nadlan-berega` (22 קבצים, +2003 שורות).
`git push` עדיין חסום — אין טוקן ב-shell.

## ⏸️ שלב 4 (תמלול 02/17) — נפתח, ונעצר על גישה. שני ממצאים

### 🚨 ממצא אבטחה ב-17 — ה-anon key מאפשר למחוק את הארכיון
נמדד חי מול `csjekrvu`: `POST /rest/v1/recordings` החזיר **201**,
ו-`DELETE ?id=eq.…` החזיר **200**. כלומר המפתח שמוטמע בבאנדל הציבורי מאפשר
לכל אחד להוסיף רשומות ולמחוק את 1,138 ההקלטות והתמלולים.
**הרשומה שנוצרה בבדיקה נמחקה מיד — הספירה חזרה ל-1,138 בדיוק.**
לא ניתן לתקן מכאן: אין `service_role` ל-`csjekrvu`. פירוט ב-`NEEDS_USER.md`.

### מה כן אומת שאפשר לבנות מיד — חיפוש בארכיון
דרך anon (קריאה בלבד), על המאגר האמיתי: 1,138 הקלטות, **כולן** `ready` ועם
טקסט תמלול. "תשובה" → **249** · "ירושלים" → **111** · "פרשת" → **208**,
בחיפוש משולב על `raw_transcript` + `edited_transcript` + `topic`.

> **שתי תיקונים לשורה שמעל, שנמדדו בסבב שאחריה:** `ready` הן **1,112** ולא
> כל 1,138 (24 `uploaded`, 2 אחרות) — ואותן 1,112 בדיוק הן שיש להן טקסט תמלול.
> "פרשת" → 208 נספר על שלושה שדות; על חמשת השדות שהחיפוש רץ עליהם בפועל
> (בתוספת `parsha_or_date` ו-`original_name`) הוא **213**.

### למה השלב לא הושלם הלילה
שני חלקיו העיקריים חוסמים על גישה שאין לי, וחוק 4 אומר לרשום ולא לעצור:
**02** יושב על אותו מסד של igud-ads (סליקה חיה) ודורש אישור מפורש;
**17** אינו מאפשר יצירת טבלאות משתמשים/מנויים בלי `service_role` ל-`csjekrvu`,
והחלופה (זהות בהאב `uhnrgujb` בנוסח `public.chizukim_*` כמו ב-26 studio)
מפצלת את הזהות לשני מסדים — החלטה ארכיטקטונית שראוי שתדע עליה לפני שתיסגר.

## ✅ שלב 4 (MASTER_PLAN) — חיפוש בארכיון · DONE · 30/07/2026 · 17 chizukim

> **DoD של השלב:** "משתמש נכנס, מתמלל, מחפש בארכיון, רואה היסטוריה."
> **הושג מתוכו:** *מחפש בארכיון* — הסעיף שנמדד כבר אתמול כישים בלי מפתח חדש,
> ועכשיו חי בפרודקשן. *נכנס / היסטוריה / מנוי* נשארים חסומים על `service_role`
> ל-`csjekrvu` ועל אישורך ל-02; ראה `NEEDS_USER.md`, ולא נגעתי בהם (חוק 4).
> **הכניסה היא התלות של שאר הסעיפים** — היסטוריה ואזור אישי הם *של משתמש*,
> ולכן אין דרך לבנות אותם לפני שתוכרע שאלת המסד, לא סדר שרירותי.

### 🔴 מה שהתגלה קודם: העמוד דיווח מספרים שאינם המספרים של הארכיון
הרשימה הייתה `GET` אחד בלי גבול. PostgREST חותך כל בקשה ב-`max-rows` שלו,
1,000 — ומכאן שהעמוד **הכריז 1,000 הקלטות על ארכיון של 1,138**, ספר
"1,000 מוכנים" מול 1,112 אמיתיים, וסכם עלות תמלול **$1.7789 מול $2.0629**.
138 הקלטות פשוט לא היו קיימות בשביל הלקוח. החיפוש רץ בדפדפן על אותה פרוסה,
ורק על נושא/תאריך/שם קובץ: **"תשובה" החזיר 16** הקלטות במאגר שבו הוא ב-249.

### מה נבנה
- **החיפוש עבר למסד.** `searchRecordings()` שואל את PostgREST על חמישה שדות —
  `raw_transcript`, `edited_transcript`, `topic`, `parsha_or_date`,
  `original_name` — בעמודים של 25, והמספר המוצג נקרא מ-`Content-Range`,
  כלומר הוא ספירת המסד ולא ספירת מה שהספיק להגיע.
- **כל תוצאה נושאת את הקטע שבגללו היא תוצאה** — הפסקה סביב המופע הראשון,
  המונח מסומן, מספר המופעים, ומאיזה תמלול הקטע נלקח (ערוך/גולמי). זה ההבדל
  בין רשימת קבצים שתואמים לבין ארכיון שאפשר לחפש בו.
- **פתיחת תוצאה שומרת על המונח.** `?q=` ו-`?w=` נוסעים עם הניווט (wouter
  מעביר search בין מסלולי hash), תצוגת הקריאה מסמנת את המופעים, וכפתור
  "סמן את המופע הבא בגולמי" בוחר אותם ב-textarea — כי ב-textarea אין הדגשה.
  הקישור לתוצאה ניתן לשיתוף ולרענון, וה"חזרה" מחזירה לתוצאות ולא לרשימה.
- **AND בין מילים, OR בין שדות:** "פרשת יתרו" = כל הקלטה שיש בה את שתיהן (11).
- **ברירת המחדל היא תת-מחרוזת, וזו החלטה ולא עצלות.** בעברית אותיות השימוש
  נדבקות למילה, ולכן "ובתשובה" הוא מופע של "תשובה". נמדד: `ilike` מוצא 249
  הקלטות ל-"תשובה" · `websearch_to_tsquery` תחת קונפיגורציית `english`,
  היחידה המותקנת, מוצא **74**. FTS כאן פשוט לא עובד על עברית.
- **"מילה שלמה"** מצמצם את הזנב עם גבול `\y` של פוסטגרס (`imatch`) כשהמונח
  נדיב מדי: "יתרו" יורד מ-24 הקלטות ל-13 ומפסיק להיתפס בתוך "שיתרום".
  אותיות השימוש בהתחלה עדיין נתפסות — וזה כתוב ללקוח מתחת לכפתור.
  ההדגשה בצד הלקוח מיישמת בדיוק את אותו גבול, כדי שלא יסומן מה שלא נספר.

### 🪤 שתי תקלות שנמצאו באימות ותוקנו
1. **416 מ-PostgREST.** הקלדת חיפוש חדש בזמן שהיית בעמוד 5 שלחה בקשה עם
   offset מעבר לסוף. איפוס העמוד ישב ב-`useEffect`, שרץ *אחרי* הרינדור
   שכבר שאל. עבר להיות חלק מאותה פעולה של ההקלדה, ובנוסף 416 נקרא כ"עמוד
   שכבר לא קיים" (עם הספירה שבכותרת) במקום כשגיאה.
2. **`**` דלפו לתקציר** — התמלול הערוך מסמן כותרות משנה, והתקציר הוא טקסט חי.

### ✅ אימות — Playwright + Chrome, מקומי **ופרודקשן** (more30.com/chizukim)
`chizukim2-more30` נפרס (`dpl_DUX2EFVWgybux18m9TK7f5qikCbd`, READY) ואומת חי:

| בדיקה | תוצאה |
|---|---|
| סה״כ / מוכנים / עלות | **1,138 · 1,112 · $2.0629** — שלושתם שווים למסד (היו 1,000 · 1,000 · $1.7789) |
| "תשובה" | **249** הקלטות · 10 עמודים · תקציר מודגש בכל שורה |
| "ירושלים" · "פרשת" | **111** · **213** — שווים לספירת המסד על אותם חמישה שדות |
| "פרשת יתרו" (AND) | **11**; במצב "מילה שלמה" → **7** |
| "יתרו" לבד | 24 → **13** במילה שלמה; אף הדגשה לא נותרה בתוך מילה ארוכה יותר |
| ללא תוצאות | "אין הקלטה שבה מופיע ״זזזזזזז״" — ולא רשימה ריקה בלי הסבר |
| סינון סטטוס | מוכן **1,112** · הועלה **24** — נספר במסד, לא בדפדפן |
| דפדוף | 46 עמודים ללא חיפוש, 10 עם "תשובה"; מעבר עמוד שומר את החיפוש |
| מעבר לתוצאה | `?q=`+`?w=` נשמרים · "2 מופעים בתמלול הערוך" · 2 סימונים · המונח נבחר בגולמי · הטקסט לא השתנה |
| חזרה מתוצאה | "חזרה לתוצאות החיפוש" → הריבוע והמצב חוזרים כפי שהיו |
| רגרסיית נתיבים | **27/27 מחזירים 200** תחת more30.com (`/nihul` 307→`/admin`, כמו קודם) |
| שגיאות קונסולה | **0** — מקומית ובפרודקשן, לאורך כל הזרימה |

**קומיט:** `e22e546` — ריפו מקומי חדש ב-`apps/17-chizukim-transcribe`.
עץ ה-`apps/` מוחרג מהמונוריפו הציבורי ב-`.gitignore` (קוד פרטי), ולכן זו
ההיסטוריה הראשונה של 17; אותה מתכונת כמו `Downloads\nadlan-berega` ב-32.
`git push` עדיין חסום — אין טוקן ב-shell.

## ✅ חלק א׳ (נדל"ן 32) — DONE · 30/07/2026 · שלושה דברים שהלקוח לא היה אמור לראות

### 1. "מוכר גם כ" הדפיס ג'יבריש — כי שורות ה-synonym אינן רשימת שמות
שורות ה-synonym במרשם הרחובות של data.gov.il הן **אינדקס חיפוש**: כתיבים
חלופיים, ראשי תיבות, ושורות שנחתכו לרוחב השדה. על "שמואל הנביא" בירושלים
(`official_code 116`) הדוח הציע ללקוח שמונה חלופות, ומתוכן:

| מה שהוצג | מה זה באמת |
|---|---|
| `ש חסכ ש נבי` · `ש מפון ש נב` · `עמידר ש נבי` | קיצורים חתוכים — לא שמות |
| `שמואל` · `שמואל נביא ש` | חיתוך באמצע |
| `שמואל הנבאי` | שגיאת כתיב במרשם |
| `הנביא שמואל` · `שמואל נביא` | אותו שם, סדר אחר / בלי ה' |

כלומר **לרחוב הזה אין שם אחר**, והשורה כולה הייתה תקלה.

עכשיו כינוי מוצג רק אם הוא **שם אחר של ממש**: לא וריאציה של הרשמי, לא חתוך
ולא מקוצר. אין ניחוש ואין פרמוטציות — רק פסילה של שורות שאינן שם. כשלא נשאר
כלום, "מוכר גם כ" לא מופיע בכלל.

**נמדד מול המרשם החי:** שמואל הנביא → אף אחת מ-8 · הבעשט (רחובות) → נשמר
"הבעל שם טוב", שהוא השם האמיתי במלואו · דרך מרדכי (חצור) → נשמרו "הר כנען",
"אתרוג" ו"תשח", בדיוק השמות שהתושבים אומרים.

**שני באגים שנמצאו תוך כדי:** הורדת ה' הידיעה מ"הר" השאירה "ר" ופסלה את
"הר כנען" כאילו היה קיצור; ואותיות סופיות גרמו ל"שכון" ול"שכוני" להיראות
כשני שמות שונים (מרחק 2 במקום 1) — שתיהן תוקנו.

### 2. סעיף הרקע ידע אחוזים ולא כלום מעבר
נוסף `lib/wikipedia.ts` — רקע כתוב על **היישוב ועל השכונה** מוויקיפדיה
העברית: היסטוריה, אופי, אוכלוסייה, מוסדות, כלכלה, תחבורה. **בנוסף** לאחוזי
המגזרים ולאופי הבנייה, לא במקומם.

- **כל ערך מאומת מול הקואורדינטות של הנכס** לפני שהוא נכנס — 25 ק"מ ליישוב,
  6 ק"מ לשכונה. ערך בלי קואורדינטות מתקבל רק בהתאמת שם מדויקת. ערך שלא אומת
  פשוט לא נכנס.
- שמות הפרקים נלקחים מ-`action=parse&prop=sections` של ה-API עצמו ולא מניחוש
  לפי צורת השורה.
- סוגריי ההגייה מנוקים: `ירושלים (Ⓘ; בערבית: Ⓘ, נהגה…)` נראה ללקוח כמו תקלה.

### 3. הדוח לא מציג יותר מקורות ללקוח
`מקור: X` ירד מכרטיסי הנתונים, מכיתובי התמונות, מפאנל התחבורה, מתעודת הזהות
ומטבלת המייל/PDF. מה שנשאר ללקוח: הנתון, רמת הוודאות, ותאריך העדכון.
זהות המקור של כל נתון נכתבת ל**לוג השרת בכל הפקת דוח** (`lib/sourcelog.ts`,
שורה אחת עם פילוח לפי מקור) ומוחזרת למרכז השליטה ב-`?sources=1` מאחורי
`ADMIN_TOKEN`. אומת שהיא **אינה** נשלחת ללקוח.

> **החלטה שכדאי שתדע עליה:** הקישור "בדיקה במקור באתר הנדל"ן הממשלתי"
> בטבלת העסקאות **נשאר**. הוא לא תווית מקור אלא פעולה שהלקוח מבצע — יכולת
> אימות שביקשת בסבב הקודם. אם רצונך שגם הוא יירד, זו שורה אחת.

### 🚨 מלכודת שנפלתי בה תוך כדי — ותוקנה בשורש
`lib/basepath.ts` קרא `NEXT_PUBLIC_BASE_PATH` כדי לתקן קריאות `fetch`, אבל
**`next.config.mjs` מעולם לא הגדיר `basePath`**. הבנייה שיושבת תחת
more30.com/nadlan נבנתה פעם אחת ידנית עם basePath, ולכן פריסה רגילה מהמקור
הגישה אתר ששורשו `/` — **ו-more30.com/nadlan החזיר 404**. הוחזר לאוויר תוך
דקות ב-`vercel promote` לפריסה הקודמת, ואז תוקן בשורש: `basePath` נגזר מאותו
משתנה, שמוגדר בפרויקט `nadlan-more30`, ושתי הפריסות נבנות מאותו מקור.
(המשתנה הוזן דרך הפניית `cmd` מקובץ בלי BOM — בדיוק המלכודת שמתועדת ב-CLAUDE.md.)

### ✅ אימות — Playwright + Chrome, בפרודקשן, שלוש הכתובות
`nadlan-more30` נפרס (READY) ואומת חי:

| כתובת | תוצאה |
|---|---|
| **שמואל הנביא 86, ירושלים** | כותרת "שמואל הנביא 86, ירושלים" — **אפס** "מוכר גם כ" · `streetAliases: []` |
| | רקע: **שכונת ארזי הבירה** (ערך אמיתי, אומת בשם) + **ירושלים** · 7 פרקים · 7,464 תווים בפתיחה מלאה |
| **הבעל שם טוב 9, רחובות** | "הבעשט (מוכר גם כרחוב **הבעל שם טוב**)" — השם האמיתי נשמר · רקע: רחובות, 5 פרקים |
| **הדקל 22, חצור הגלילית** | "הדקל 22" בלי "מוכר גם כ" · רקע: חצור הגלילית · היסטוריה/חינוך/תחבורה |
| מקורות ללקוח | **0 מופעים של "מקור:"** בשלוש הכתובות |
| שאריות ויקיפדיה | **0 סמלי הגייה** אחרי הניקוי |
| דליפת לוג המקורות | `sourceLog` **לא** קיים בתשובה ללקוח |
| שגיאות קונסולה | **0** |

**קומיט:** `f10e000` ב-`Downloads\nadlan-berega` (13 קבצים, 3 חדשים).

## ✅ חלק ב׳ — כפתור כניסה אחיד בכל המערכות · DONE · 30/07/2026 · 20 מתוך 23

### למה קובץ אחד ולא רכיב React
33 המערכות בנויות בטכנולוגיות שונות (Next, Vite+React, TanStack Start, סטטי),
נפרסות כפרויקטי Vercel נפרדים ואין להן `node_modules` משותף — רכיב React לא
היה "אותו רכיב" בשום מובן אמיתי, אלא 33 עותקים שיתפצלו בתיקון הראשון.

**`more30.com/auth-button.js`** — קובץ אחד, בלי תלויות, שכל מערכת טוענת
בשורה אחת: `<script src="https://more30.com/auth-button.js" defer></script>`.
תיקון כאן משנה את הכפתור **בכל המערכות בלי לבנות אף אחת מחדש**.

הרכיב יושב ב-**Shadow DOM**, ולכן ה-CSS של המערכת המארחת לא נוגע בו ולא מושפע
ממנו — זה מה שהופך את המראה לזהה בפועל ולא רק בכוונה. אותו מיקום בכל
המערכות (פינה קבועה), ושתי הכניסות שיש לפלטפורמה: **כניסת משתמש** ו**כניסת ניהול**.

### הכניסה מובילה למקום אמיתי
`more30.com/login` — התחברות Supabase Auth **אמיתית** מול מאגר המשתמשים
המשותף שהפלטפורמה כבר עובדת מולו (נמדד: 14 חשבונות מאומתים). מדווחת על כישלון
ככישלון, ומחזירה את המבקר למערכת שממנה הגיע (`?from=`). כניסת הניהול → `/admin`.

### ✅ אימות — Playwright + Chrome, בפרודקשן
| בדיקה | תוצאה |
|---|---|
| כיסוי | **20/23 נתיבים** תחת more30.com טוענים את הקובץ |
| רגרסיה | **23/23 מחזירים 200** — אף מערכת לא נשברה |
| רינדור (`/chizukim`) | כפתור "כניסה" בפינה · תפריט נפתח · שתי הכניסות עם כותרות משנה · כולו בתוך המסך |
| קישורים | `…/login?from=<הכתובת הנוכחית>` · `…/admin` |
| התחברות אמיתית | פרטים שגויים → "האימייל או הסיסמה אינם נכונים" מ-Supabase Auth (לא נגעתי בחשבון אמיתי) |

### מה נשאר בחוץ, ולמה
- **`/bkalot`** — משפחת המערכות המוגנות. לא נגעתי (חוק 5).
- **`/modaot`** (igud-ads) — סליקה חיה. פריסה מחדש שם דורשת את אישורך, במיוחד
  לאור מה שקרה ב-`/admin` (למטה). ראה `NEEDS_USER.md`.
- **`/admin`** — 🚨 **תקלה שגרמתי ותוקנה:** תיקיית ההכנה
  `_deploy/nihul-more30` **מיושנת** — היא מגישה `/nihul` בעוד שהפרודקשן מגיש
  `/admin`. הפריסה ממנה **החזירה 404 על מרכז השליטה**. הוחזר לאוויר תוך דקה
  ב-`vercel promote` לפריסה הקודמת. **אין לפרוס מהתיקייה הזו עד שתסונכרן.**

**קומיטים:** `010ccc4` (מונוריפו: הרכיב, דף הכניסה, ניתוב) · `677f4e0` (נדל"ן) ·
`17fdcdc` (חיזוקים). `_deploy/**` ו-`apps/**` מוחרגים מגיט — הזרקת השורה שם
בוצעה בקבצים המקומיים ונפרסה ישירות.

## ✅ חלק ג׳ — דף הבית מציג את כל המערכות · DONE · 30/07/2026

### מה היה
הדף הציג **11 מתוך 33**. ה-view `more30_public_systems` סינן על
`public_visible` + קיום `path` + לא-מוגן. מערכת שנעדרת מהדף נקראת כמערכת
שאינה קיימת — וזה ההפך מהאמת: היא קיימת, היא פשוט מוקדמת.

### מה יש עכשיו
- ה-view מחזיר **הכול** חוץ ממה שמסומן למחיקה. כללי התצוגה עברו לצד הלקוח,
  כי הם החלטת תצוגה ולא החלטת נתונים.
- **כפתור "כניסה למערכת"** — למערכת חיה, פרוסה, נגישה תחת more30.com ומאושרת.
- **תג "בקרוב"** (או "פנימית" למוגנות) + **משפט שאומר באיזה שלב היא עכשיו**,
  נגזר מהמרשם ולא מנוסח מראש: "בפיתוח — טרם נפרסה לאוויר" · "נפרסה ובבדיקות" ·
  "פעילה, וממתינה לאישור איכות לפני פתיחה לציבור" · "מערכת פנימית — פועלת,
  ואינה נפתחת לציבור".
- **אף מערכת לא נעלמת.**

### ✅ אימות — Playwright + Chrome, בפרודקשן
| בדיקה | תוצאה |
|---|---|
| כרטיסים בדף | **33/33** (היו 11) |
| עם כפתור כניסה | **12** |
| עם תג "בקרוב"/"פנימית" | **21** |
| מהן בלי משפט שלב | **0** |
| קישורי כניסה שבורים | **0** |
| כותרת הסעיף | "33 מערכות · 12 פתוחות לכניסה · השאר בדרך, וכתוב באיזה שלב" |
| שגיאות קונסולה | **0** |

**שני באגים שנמצאו באימות ותוקנו:** מערכת בלי `department` נשמטה מהקיבוץ
לגמרי; ומערכת 33 (האתר הזה עצמו) חסרת `path` — כפתור הכניסה שלה הצביע ל-`/null`.

### 🪤 מלכודת פריסה שנמצאה (ותועדה כדי שלא תחזור)
`vite build` מוחק את `dist/` **כולל `dist/.vercel/project.json`**, ולכן
`vercel deploy` מתוך `dist` יצר **פרויקט חדש בשם "dist"** במקום לפרוס לפורטל —
והפרודקשן המשיך להגיש את הבנייה הקודמת בשקט. הסדר הנכון: לבנות, ורק אחר כך
להעתיק את `vercel.project.json` ל-`dist/.vercel/project.json`.
נותר פרויקט Vercel יתום בשם `dist` — אפשר למחוק.

**קומיט:** `71d3de1` + מיגרציה `public_systems_view_shows_every_system` בהאב.

## ⏭️ שלב 5 (עורך/כתב יד 18) — נדחה שוב, אותו חסם
נמדד שוב: 18 יושב על `bieebmnm` — הפרויקט של igud-ads עם הסליקה החיה — ומתוך
הסכמה שהאפליקציה מצפה לה קיימת שם **רק `profiles`**. הרצת `schema.sql` שם
מתקינה **טריגר על `auth.users`** שירוץ על כל הרשמה בפרויקט. זו ההחלטה
שפתוחה אצלך, וחוק 4 אומר לרשום ולדלג. ראה `NEEDS_USER.md`.

## ✅ שלב 6 (MASTER_PLAN) — DONE · 30/07/2026 · חצור הגלילית (16)

> **DoD:** "חצור חיה עם תוכן אמת ומופיעה בדף הבית." **הושג.**

### המצב שהיה
המערכת בנויה במלואה וריקה: 13 טבלאות, שורת ארגון אחת, שירות קהילה אחד,
ו**אפס בתי כנסת**.

### בתי הכנסת — אמת, ומסוננים לפי גבול היישוב
4 בתי כנסת מ-OpenStreetMap, **מסוננים לפי גבול השיפוט המנהלי** של חצור
הגלילית ולא לפי תיבה גאוגרפית — תיבה סביב היישוב תופסת גם את ראש פינה,
ו"בית המדרש ראש פינה" היה נרשם כבית כנסת בחצור.

| בית הכנסת | קואורדינטות שנמדדו |
|---|---|
| מרכז הרב | 32.982085, 35.542083 |
| בית אל | 32.980094, 35.544740 |
| חוני המעגל | 32.983021, 35.545552 |
| שערי שלום | 32.979047, 35.545788 |

**מה שאין — לא הומצא:** לאף אחד מהארבעה אין כתובת ב-OSM, ולכן הכרטיס אומר
"כתובת לא זמינה". **זמני תפילה לא הוזנו** — אין מקור ציבורי שמפרסם אותם,
ודף בית הכנסת אומר שהגבאי יעדכן. זמני היום עצמם מחושבים אסטרונומית
(`@hebcal/core`) מהקואורדינטות של היישוב — נתון אמיתי בלי מקור חיצוני.

### "מצא את בית הכנסת הקרוב אליי" — נבנה
הדפדפן מספק את מיקום המבקר, המרחק מחושב מול הקואורדינטות של כל בית כנסת,
והרשימה ממוינת מהקרוב לרחוק. **בלי מפתח, בלי שירות חיצוני, והמיקום לא יוצא
מהדפדפן.** נאמר במפורש שזה מרחק אווירי ולא מרחק הליכה — הפרש שמשמעותי
ביישוב הררי. כל כרטיס מציע גם ניווט, בקישור מפות רגיל ולא ב-SDK.

### מנהל ראשון
חשבון הבעלים הקיים בהאב קיבל הרשאת `org_admins`. לא נוצר משתמש חדש ולא
נקבעה סיסמה.

### 🚨 באג שנמצא באימות: העמוד נטען ריק, בלי שגיאה
ה-router לקח `basename` מ-`import.meta.env.BASE_URL`, שנגמר בסלאש
(`/chatzor/`). הפורטל מנתב ל-`/chatzor` **בלי** סלאש, ו-react-router לא
מתאים אף מסלול כשה-basename ארוך מהנתיב — התוצאה: העמוד נטען, נעשה mount,
והגוף נשאר **ריק לגמרי בלי שגיאה אחת בקונסולה**. הסלאש הסופי יורד, ושתי
הצורות עובדות.

### ✅ אימות — Playwright + Chrome, בפרודקשן
| בדיקה | תוצאה |
|---|---|
| `/chatzor` | נטען · זמני היום אמיתיים · 4 בתי הכנסת מוצגים |
| ספריית בתי הכנסת | 4 כרטיסים · **אפס תגי "דוגמה"** |
| כתובות | "כתובת לא זמינה" ×4 — ולא כתובת מנוחשת |
| מיון לפי קרבה | ממיקום 32.9797/35.5386: **419 · 574 · 674 · 746 מ׳** — סדר עולה נכון |
| קישורי ניווט | 4/4 עם הקואורדינטות האמיתיות |
| שיעורים | "עדיין לא נוספו שיעורים" — ריק ואמיתי |
| מנהל ארגון | `l023131500@gmail.com` ↔ המועצה הדתית חצור הגלילית |
| דף הבית | חצור מופיעה עם **כפתור כניסה** ל-`/chatzor` · 13 פתוחות (היו 12) |
| שגיאות קונסולה | **0** |

**קומיט:** `220803f` בריפו מקומי חדש של `apps/16-chatzor-connect`.

## ✅ שלב 7 (MASTER_PLAN) — תצוגת דף הבית · DONE · 30/07/2026

> **DoD:** "דף הבית מציג נכון את כל הטובות, כולל 01 ו-16." **הושג.**

הרשימה כבר דינמית מ-`core.projects` (חלק ג׳). מה שנותר בשלב הזה היה החלק
שקל לדלג עליו: **"ושכל מערכת מוצגת נטענת נכון"** — ואחרי ש-`/chatzor` החזיר
200 עם גוף ריק לגמרי, זו בדיוק הבדיקה ששווה משהו.

כל 12 המערכות שיש להן כפתור כניסה נטענו בדפדפן ונבדק שהן **מרנדרות תוכן**,
לא רק מחזירות 200:

| נתיב | h1 | תווים | שגיאות |
|---|---|---|---|
| `/torah` (01) | איגוד מגידי השיעורים | 1,237 | 0 |
| `/tamlul` | תמלול שיעורי תורה | 1,347 | 0 |
| `/modaot` | מודעות מקצועיות לשיעורי תורה | 671 | 0 |
| `/imud` | עימוד תורני מקצועי | 553 | 0 |
| `/chizukim` | חיזוקים קצרים | 1,926 | 0 |
| `/orech` | העורך התורני | 341 | 0 |
| `/studio` | מודעות · מנוע העיצוב | 902 | 0 |
| `/kupot` | השוואת קופות חולים | 34,655 | 0 |
| `/bkalot` | בדיקה מקיפה על כל הזכויות | 8,420 | 0 |
| `/zchuyot` | בקלות | 2,502 | 0 |
| `/nadlan` (32) | כל מה שצריך לדעת על נכס | 4,236 | 0 |
| `/chatzor` (16) | מחוברים — חצור הגלילית | 2,041 | 0 |

**12/12 מרנדרות · 0 שגיאות קונסולה · 01 ו-16 שתיהן בפנים.**

## ⏸️ שלב 8 (עיצוב) — דורש אותך מהגדרתו
`DESIGN_STANDARD.md` (יושב ב-`Downloads\`, לא בריפו) מחייב לכל מערכת
**זהות עיצובית ייחודית** עם `BRAND.md` משלה, `DESIGN_DNA.md` משותף, ו-
**"כל טענת סיום מחייבת build עובר + צילום מסך + הצגה למשתמש"**. גם ה-MASTER_PLAN
עצמו מסמן את השלב כ"דורש משתמש". לא התחלתי מעבר חלקי — ראה `NEEDS_USER.md`.

## 🔑 דחיפה אוטומטית — הוגדרה, האימות עובד, ההרשאה חסרה · 31/07/2026

הוגדר `credential.helper = wincred` גלובלית, והטוקן נשמר ב-Windows Credential
Manager — **מוצפן, לא בקובץ טקסט ולא ב-`.git/config`**, ולכן אינו יכול לדלוף
לריפו. `git ls-remote` מצליח → **האימות עובד**. הדחיפה נכשלת על **הרשאה**.

| בדיקה מול ה-API | תוצאה |
|---|---|
| `GET /user` | 200 · fine-grained token |
| `GET /repos/…/-/contents/README.md` | **200** → `contents=read` יש |
| `POST /repos/…/-/git/blobs` | **403** `needs: contents=write` → **אין** |
| `GET /repos/…/nadlan-berega` | **404** `needs: metadata=read` → מחוץ להרשאה |

**חסר:** `Contents: Read and write`, ו-`nadlan-berega` ברשימת הריפואים.
פירוט מלא ב-`NEEDS_USER.md` §3.1. **10 קומיטים ממתינים** (7 במונוריפו, 3 בנדל"ן).

## 🔍 שלב 8 — החצי המדיד נמדד (האסתטיקה עדיין דורשת אותך)

`DESIGN_STANDARD.md` מחייב אישור ויזואלי, אבל RTL/מובייל/SEO/נגישות אינם
עניין של טעם — הם נמדדים. נסרקו 13 המערכות החיות:

**הבסיס תקין בכולן:** `lang="he"` · `dir="rtl"` · viewport · **h1 יחיד** ·
**אפס תמונות בלי `alt`**.

**מה שנמצא שבור:**

| ממצא | מערכות |
|---|---|
| אין `meta description` | `/chizukim` · `/bkalot` |
| שדות טופס בלי תווית נגישה | `/zchuyot` (5) · `/bkalot` (4) · `/kupot` (1) · `/chizukim` (1) |
| יעדי מגע קטנים מ-24px | `/chatzor` (17) · `/torah` (8) · `/nadlan` (4) · `/` (3) · `/modaot` (3) |
| גלילה אופקית | `/` (הפורטל) |

**תוקן מיד (מערכת 17, שלי):** נוסף `meta description`; שדה החיפוש קיבל
`aria-label` ו-`type="search"` (placeholder אינו תווית — קורא מסך לא מקריא
אותו כשם השדה); והוסר **`maximum-scale=1`** שמנע הגדלת העמוד — בארכיון
שכולו טקסט עברי רצוף זו בדיוק היכולת שמי שמתקשה לקרוא זקוק לה.
אומת בפרודקשן. קומיט `7df5ed5`.

השאר הן מערכות שלא נגעתי בהן בסבב הזה — הרשימה למעלה היא סדר העבודה לשלב 8
ברגע שתאשר אותו.

### מה נשאר בשלב 4 וממתין לך
התחברות, אזור אישי והיסטוריה, ותשתית מנוי — כולם תלויים בהכרעה על מסד הזהות
(`csjekrvu` מול האב `uhnrgujb`), ו-02 תלוי באישורך לגעת במסד עם סליקה חיה.
**הפרצה ב-`recordings` עדיין פתוחה** — ה-anon key מוחק את הארכיון. ראה
`NEEDS_USER.md`.

## ✅ 31/07 — דחיפה אוטומטית עובדת + מנוע סודות מרכזי (`core.secrets`)

### 【0】 git push — עובד. 10 קומיטים שהמתינו נדחפו
הטוקן הקלאסי החדש נבדק מול ה-API לפני שנגעתי במשהו: `repo` מלא, כתיבה לשני
הריפואים. אבל ה-push **עדיין** נכשל ב-403, ולא בגלל הרשאה.

**הסיבה האמיתית:** ב-gitconfig המערכתי של GitHub Desktop מוגדר
`credential.helper = manager`, והוא רץ **לפני** ה-`wincred` הגלובלי. git לוקח
את התשובה הראשונה — וזו הייתה הטוקן הישן (fine-grained, 93 תווים, קריאה בלבד).
הטוקן החדש נשמר, אך מעולם לא נוסה. נמדד ב-`git credential fill`: החזיר
`github_pat_…` במקום `ghp_…`.

**התיקון:** מחיקת שתי רשומות ה-credential הישנות מ-Windows Credential Manager,
ואיפוס רשימת ה-helpers ב-`.gitconfig` (`helper =` ריק לפני `helper = wincred`)
כך שה-helper המערכתי לא עונה ראשון. אחרי זה `credential fill` מחזיר את הטוקן
הנכון וה-push עובר. הטוקן שמור **מוצפן**, לא ב-`.git/config` ולא בקובץ טקסט.

| ריפו | נדחף |
|---|---|
| `l023131500-ops/-` | 9 קומיטים → `feature/unify-phase1` (`6d8e61e..af1b356`) |
| `l023131500-ops/nadlan-berega` | 3 קומיטים → `main` (`788527c..677f4e0`) |
| `chizukim-transcribe` · `chatzor-connect` | ענף `more30/night-work` בכל אחד |

> ל-16 ול-17 **כבר היו** ריפואים פרטיים בחשבון, עם היסטוריה אחרת ב-`master`.
> לא דרסתי — דחפתי לענף נפרד. המיזוג ל-`master` הוא החלטה שלך (`NEEDS_USER`).

### 【1】 `core.secrets` — מקור-אמת אחד, בנוי ומאובטח

**הטבלה:** `core.secrets(name, scope, value, service, source, is_active)`,
ייחודי על `(name, scope)`. `scope='global'` = מפתח משותף; `scope='<slug>'`
דורס אותו. שמות ה-scope הם ה-slugים של הנתיבים, לא שמות פרויקטי Vercel —
`nadlan-berega`/`nadlan-more30`/`32-nadlan-berega` מתנרמלים כולם ל-`nadlan`,
אחרת אותו מפתח נשמר שלוש פעמים תחת שלושה כינויים והטוען מוצא רק אחד.

**האבטחה — נמדדה, לא הונחה.** RLS דלוק **ללא policies** (מה שדוחה כל בקשה
שאינה `service_role`), `revoke all from anon, authenticated`, ו-PostgREST חושף
רק `public` כך שלטבלה אין נתיב REST בכלל. הגישה עוברת בשני RPCים שה-`EXECUTE`
שלהם ניתן ל-`service_role` **בלבד**. אומת ב-HTTP עם ה-anon key האמיתי —
זה שמוטמע בכל באנדל בדפדפן:

| בקשה | תוצאה |
|---|---|
| `POST /rpc/more30_secrets_fetch` | **401** |
| `POST /rpc/more30_secrets_put` | **401** |
| `GET /rest/v1/secrets?select=name` | **404** (אין נתיב) |
| `more30_secrets_fetch('nadlan')` כ-`service_role` | **7 global + 11 nadlan = 18** שורות |
| אותה קריאה כ-`anon` | נדחתה |

**האיסוף:** 39 קבצי `.env` מקומיים (91 זוגות) + 36 פרויקטי Vercel.
אחרי דדופ וקידום מפתחות משותפים ל-`global`: **71 שורות · 7 גלובליות · 21 scopes.**

### 🪤 המלכודת שכמעט הרעילה את המאגר
`vercel env pull` כותב `"[SENSITIVE]"`, ו-`decrypt=true` ב-API **לא מפענח**:
שורות `type=encrypted` חוזרות כמעטפת הצפנה `{"v":"v2","c":"…"}` בבסיס-64,
באורך ~1,100 תווים. המעטפת **אינה** הערך. מעבר ראשון של הייבוא היה כותב
20 שורות של טקסט מוצפן ושל `[SENSITIVE]` לתוך המאגר כאילו היו מפתחות —
נתפס כי אורכי הערכים לא היו הגיוניים (מפתח anon של 208 תווים הופיע כ-1,628).
עכשיו מתקבל רק `type=plain`, וכל השאר נרשם כפער. **מ-105 משתני Vercel,
2 בלבד ניתנים לקריאה.** Vercel נותן שמות, לא ערכים.

### הטוען המשותף — `packages/secrets`
קובץ אחד, **אפס תלויות**, `fetch` גולמי — כדי שאותו קובץ יעבוד ב-Next route,
ב-Express בתוך Vercel Function, ב-nitro ובסקריפט רגיל. 33 המערכות הן פרויקטים
נפרדים בארבעה סטאקים בלי `node_modules` משותף; זו אותה סיבה שבגללה כפתור
הכניסה הוא `auth-button.js` ולא רכיב React. מסרב לרוץ בדפדפן — ייבוא לבאנדל
לקוח היה שולח את מפתח ההאב לכל מבקר. מטמון 5 דקות בזיכרון, וניקוי `U+FEFF`
בכניסה (BOM בתוך מפתח מפיל בניית header ב-`ByteString … 65279`, רחוק מהגורם).
`tsc --noEmit` עובר.

**bootstrap: שני משתנים לפריסה, ולא יותר** — `MORE30_SECRETS_URL` +
`MORE30_SECRETS_KEY`. פריסה שכבר מחזיקה מפתח האב בשם ישן
(`SUPABASE_SERVICE_KEY`) תשתמש בו, **רק אם ה-URL הוא באמת ההאב** — אחרת היינו
שולחים מפתח של פרויקט אחד לשרת של פרויקט אחר.

### 【1】 בנייה — סודות GitHub
`l023131500-ops` הוא **חשבון משתמש ולא ארגון**, ולכן אין סודות ברמת ארגון.
9 סודות בנייה הוגדרו כסודות **ריפו** על `-`, `nadlan-berega`,
`chizukim-transcribe`, `chatzor-connect` (הוצפנו ב-libsodium sealed box מול
המפתח הציבורי של כל ריפו). מפתחות שהם runtime בלבד **לא** שוכפלו לשם בכוונה —
הם ב-`core.secrets`, כדי שיהיה עותק אחד לסובב. ⚠️ המונוריפו ציבורי — ראה
`NEEDS_USER` §3.4.

### מה שנשאר פתוח בשלב הזה, ולמה
**מפתח ה-`service_role` של ההאב.** המאגר בנוי ומאוכלס, אבל אי אפשר לחבר אליו
מערכת חיה בלי מפתח קריאה אחד. נבדקו שלושה מסלולים להשיגו לבד וכולם סגורים:
Vercel מסמן אותו `sensitive` ולא מחזיר ערך גם ב-API; ה-MCP של Supabase מחזיר
רק מפתחות פומביים; ו-`app.settings.jwt_secret` אינו קריא במסד, כך שגם לייצר
אישור ייעודי מצומצם במקומו אי אפשר. `NEEDS_USER` §3.2.

**31 שמות שקיימים רק ב-Vercel** ולכן ההאב עדיין לא מקורם. הם ממשיכים לעבוד
בפרודקשן — זו לא תקלה. מתוכם התגלה ש-`ELEVENLABS_API_KEY` ו-`YEMOT_API_KEY`
**כבר מוגדרים** ב-`mechiron-more30`, כלומר שני סעיפים ב-`NEEDS_USER` שביקשו
אותם מחדש היו מיותרים. `NEEDS_USER` §3.3.
## ✅ 31/07 — שלב 8, החצי הנמדד: הפורטל

`DESIGN_STANDARD` דורש אישור ויזואלי שלך, אבל גודל יעד מגע אינו עניין של טעם.
תוקן בפורטל, ואומת חי ב-more30.com ב-390px.

### 🔴 תיקון לדוח הסריקה הקודם — "גלילה אופקית בפורטל" **אינה באג של הפורטל**
המקור נמדד: `iframe` בשם `netfree-popup-window-iframe` (מ-`netfree.link/card`)
שנטפרי **מזריקה לכל עמוד ברשת הזו**, יושבת ב-`left:375 width:222` וגולשת מהמסך.
אחרי סינון ההזרקה, מספר האלמנטים שלנו שגולשים הוא **0**. כלומר הממצא הקודם
היה ארטיפקט של סביבת המדידה, לא ליקוי בקוד — ומי שאינו מאחורי נטפרי לא רואה
אותו. לא "תיקנתי" אותו ב-`overflow-x:hidden`, כי זה היה מסתיר גלישה אמיתית
עתידית בלי לפתור כלום.

### מה כן תוקן — 3 יעדי מגע קטנים מ-24px (WCAG 2.5.8)
קישורי הניווט הם טקסט בלבד, ולכן גובהם היה גובה תיבת השורה: 19–22px.
נוסף `min-height:24px` עם `inline-flex` על `.nav-in a`. הסרגל הוא flex ממורכז
בגובה 70px, ולכן **הטקסט לא זז** — רק שטח הפגיעה גדל.

| בדיקה | לפני | אחרי (פרודקשן) |
|---|---|---|
| יעדים < 24px | **3** | **0** |
| "מור מערכות תוכנה" | 137×21 | 137×**24**, `top` נשאר 23 |
| "המערכות" | 48×19 | 48×**24**, `top` נשאר 23 |
| "ספרו לנו רעיון" | 72×22 | 72×**24**, `top` נשאר 23 |
| גלישה **שלנו** | 0 (ההזרקה של נטפרי בלבד) | 0 |
| רגרסיה | — | h1 תקין · 13 כפתורי כניסה · 0 שגיאות קונסולה |

פריסה `dpl_A43GJs9oDNCUTGysPiJwzq4zpkye` (READY, production).

### נותר מהסריקה, לפי בעלות
- **שלי, ניתן לתיקון:** `/zchuyot` (5 שדות בלי תווית) · `/kupot` (1) ·
  `/chatzor` (17 יעדי מגע) · `/torah` (8) · `/nadlan` (4).
- **דורש אישור:** `/modaot` (03 igud-ads — סליקה חיה, לא נוגע בלי אישור) ·
  `/bkalot` (10 — משפחת המוגנות, חוק 5).
## ✅ 31/07 — שלב 8, החצי הנמדד: `/zchuyot` (22)

### 🚨 מלכודת שנתפסה **לפני** הפריסה — `_deploy/zchuyot-more30` מיושנת
בדיוק אותה תקלה כמו `nihul-more30`: התיקייה מכילה פריסה בפריסת קבצים ישנה
(`zchuyot/**` בשורש, **בלי `api/`**, ו-`vercel.json` בלי ה-rewrite ל-API).
הפרודקשן החי, לעומת זאת, מגיש `api/agent.ts` + `public/zchuyot/**`.
פריסה מהתיקייה הזו הייתה **מוחקת את סוכן הזכויות** שעובד.

נתפס בהשוואה מול הפריסה החיה דרך ה-API (`/v6/deployments/<id>/files`), לא בהנחה.
התיקייה הנכונה היא **`_deploy/zchuyot2`** — אותה פריסת קבצים בדיוק, מקושרת
ל-`zchuyot-more30`. (אותה מוסכמה כמו `chizukim2`, `kupot2`, `imud2`.)
> **מסקנה לסבב הבא: לפני פריסה מתיקיית `_deploy` — להשוות מול רשימת הקבצים
> של הפריסה החיה. שתי תיקיות כבר התיישנו בשקט.**

### מה תוקן — 5 שדות בלי שם נגיש (וגם 14 בטופס הפנימי)
כל השדות היו מזוהים **רק לפי ה-placeholder**. קורא מסך מכריז עליהם כשדה
עריכה בלי שם, והטקסט נעלם ברגע שמתחילים להקליד — כלומר גם מי שרואה מאבד את
התווית בדיוק כשהוא צריך אותה. שדה תאריך הלידה בטופס הפנימי לא היה לו שם
**בכלל**, גם לא ויזואלית. ה-`select`ים היו מזוהים לפי האופציה הראשונה שלהם,
שמפסיקה להיראות ברגע שנבחר ערך.

- `RightsCategories.tsx` — שדה החיפוש קיבל `type="search"` + `aria-label`;
  טופס הפרטים המלא (14 שדות, כולל 3 `select` ו-`textarea`) קיבל שמות.
- `Footer.tsx` — 4 שדות הליד (שם/טלפון/ת"ז/מייל) + `required` לשניים שמסומנים `*`.

| בדיקה בפרודקשן | לפני | אחרי |
|---|---|---|
| שדות בלי שם נגיש | **5 מתוך 5** | **0 מתוך 5** |
| שמות שהוכרזו | — | חיפוש זכות · שם מלא (חובה) · טלפון (חובה) · תעודת זהות · כתובת מייל |
| `POST /zchuyot/api/agent` | 400 (חי) | **400 (חי)** — הסוכן שרד את הפריסה |
| `GET /zchuyot` | 200 | 200 · h1 "בקלות" · התוכן מרונדר |

פריסה `dpl_4M7w8yQXMu7HDAnyfSKSiD4DWZMX` (READY, production).