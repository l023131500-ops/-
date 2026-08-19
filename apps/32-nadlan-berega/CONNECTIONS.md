# CONNECTIONS.md — מפת חיבורים, מור מערכות תוכנה (עולם more30.com)

> **שלב 0 — מיפוי בלבד.** נוצר ע"י קריאה בלבד מ-GitHub API (‎`.env.example`‎ / קוד / עץ הקבצים)
> בתאריך 22/07/2026. **לא בוצע שום שינוי, מחיקה או מיזוג.** אין כאן ערכי סוד — שמות משתנים בלבד.
> מקורות: repos של `l023131500-ops`. ערכים שלא נראו בקוד מסומנים `?`.

## מקרא
- 🔒 **מוגן — אסור לגעת:** `bkalut-app`, `bkalot-admin`, schema `zr_*`, webhook `NEDARIM3873`.
- 📦 **ארכיון — לא למחוק, לא לפתח:** `luxe-balance-hub-81*`, `luxe-ledger-hub`, `lux-manage`, `bklotm`, `pixel-perfect`.
- 🟢 חי (מאומת) · 🟡 קוד מלא, סטטוס פריסה לא ודאי · ⚪ stub/שלד (≤ ~17 קבצים) · ❔ לא ידוע.
- **מספור פרובי­זורי** — לא אותר "המספור המאושר 01–15" בשום קובץ במחשב. יש לאשר/לתקן.

## טבלת חיבורים

| # | מערכת | repo | Supabase (project ref) | שמות מפתחות נדרשים | סליקה | פריסה | סטטוס | מה חסר |
|---|---|---|---|---|---|---|---|---|
| 01 | נדל"ן ברגע | `nadlan-berega` | `uhnrgujbdxhhmoxcjria` · schema `nadlan` | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, CBS_HOUSING_INDEX_ID, XPLAN_BASE, DATAGOV_TRANSPORT_RESOURCE, DATAGOV_SCHOOLS_RESOURCE, AI_API_KEY | — | Vercel 🟢 | 🟢 חי | SUPABASE_SERVICE_KEY ריק (אין קאשינג); DATAGOV_SCHOOLS_RESOURCE, AI_API_KEY ריקים |
| 02 | בקלות — זכאות/הטבות 🔒 | `bkalut-app` | `pwcswdfgorvlpdflzylm` | VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, INBOUND_WEBHOOK_SECRET, BKALUT_ADMIN_EMAIL/PASSWORD/PHONE, PORT, NODE_ENV | ❔ | ❔ | 🟡 | 🔒 מוגן — קריאה בלבד. אין גישת Supabase (חשבון/פרויקט אחר) |
| 03 | בקלות — מחירים | `bkalut-price` | `csjekrvukbdznetsrodj` | זהה ל-02 (VITE_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, INBOUND_WEBHOOK_SECRET, BKALUT_ADMIN_*) | ❔ | ❔ | 🟡 | אין גישת Supabase לפרויקט זה |
| 04 | זכויות — Get Your Rights | `get-your-rights` | `trerolyveytzgksawrme` | VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY | — | ❔ | 🟡 | edge: leads-api, leads-webhook, n8n-notify, rights-agent → דורשות OPENAI/n8n (מפתח לא נראה). אין גישת Supabase |
| 05 | זכויות — CRM | `zchuyotpro-crm` | `jhbeelzvjvhnkxldqvxx` | VITE_SUPABASE_URL/PROJECT_ID/PUBLISHABLE_KEY + SUPABASE_URL/PROJECT_ID/PUBLISHABLE_KEY | — | ❔ | 🟡 | אין גישת Supabase לפרויקט זה |
| 06 | איגוד שיעורים (אפליקציה) | `torah-platform` | `bieebmnmkffwbqlsfozh` (משותף לאיגוד) | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SITE_URL | **נדרים+** (edge: nedarim-webhook / nedarim-create-payment / nedarim-admin) | Vercel 🟢 | 🟡 | סודות נדרים (מסוף 7016674 / webhook סוד) לא נראים — למלא ב-Variables. אין גישת Supabase |
| 06b | איגוד — פורטל/לנדינג ⚪ | `igud-shiurim-portal` (6) · `igud-portal` (7) | ❔ (stub) | — | — | ❔ | ⚪ שלד | קוד כמעט ריק — לברר אם נזנח לטובת torah-platform |
| 07 | איגוד — מודעות | `igud-ads` | `bieebmnmkffwbqlsfozh` | NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ADMIN_EMAIL, NEXT_PUBLIC_SITE_URL | **נדרים+** (`lib/nedarim.ts`) | Vercel 🟢 (×3?) | 🟡 | OPENAI_API_KEY + סוד נדרים לא נראים. 3 פרויקטי igud-ads ב-Vercel — לברר קנוני |
| 08 | איגוד — תמלול | `igud-transcribe` | `bieebmnmkffwbqlsfozh` | NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, **OPENAI_API_KEY**, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_SITE_URL, ADMIN_EMAIL | — | ❔ | 🟡 | **חסר: OPENAI_API_KEY** (מנוע התמלול) + **Google OAuth** (CLIENT_ID/SECRET להתחברות) + SERVICE_ROLE_KEY. פירוט למטה |
| 09 | חיזוקים — תמלול | `chizukim-transcribe` | `?` (85 קבצים; ref לא נמצא) | ❔ (אין ‎.env.example‎) | — | Vercel 🟢 | 🟡 | אין ‎.env.example‎ — לזהות מפתחות מהקוד. ref Supabase לא נמצא |
| 10 | עורך תורני (OCR) | `torah-editor-mvp` | `bieebmnmkffwbqlsfozh` | NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, KRAKEN_API_KEY/ENDPOINT, DICTALM_ENDPOINT, TRANSKRIBUS_USER/PASS/MODEL_DEFAULT | — | ❔ | 🟡 | מפתחות OCR (Kraken/Transkribus/DictaLM) + ANTHROPIC לא נראים |
| 11 | עימוד/הגהה תורנית | `imud-torani` | `?` (92 קבצים) | ❔ | — | ❔ | 🟡 | ref+מפתחות לא נמצאו — לבדיקה ידנית |
| 12 | מודעות — סטודיו AI | `modaot-studio` | ללא Supabase (132 קבצים) | ANTHROPIC_API_KEY, GEMINI_API_KEY, RECRAFT_API_KEY | — | ❔ | 🟡 | 3 מפתחות AI — לא נראים |
| 13 | קופות חולים | `kupot-health-funds` | `?` (env: SUPABASE_URL/ANON_KEY) | SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_TOKEN | — | Vercel 🟢 | 🟡 | ref Supabase לא נמצא בקוד (placeholder ב-env). ADMIN_TOKEN ריק |
| 14 | חצור / גליל קונקט | `chatzor-connect` + `galilee-connect-hub` | `mwljkonwdeuaahsigjdp` (משותף לשניהם) | VITE_SUPABASE_URL/PROJECT_ID/PUBLISHABLE_KEY | — | Vercel (chatzor) | 🟡 | אין גישת Supabase. לברר יחס בין שני ה-repos |
| 15 | שמחות פלוס | `bsmachot-plus` | `?` (36 קבצים) | ❔ | ❔ נדרים? | ❔ | 🟡 | ref+מפתחות לא נמצאו |
| — | פורטל more30.com ⚪ | `mor1-main-site` (3 קבצים) | — | — | — | Cloudflare ❔ | ⚪ שלד | **הקוד החי של more30.com אינו כאן** (3 קבצים בלבד). origin לא מזוהה |

### מערכות משניות / לא ממופות בשלב זה
- ⚪ שלדים: `bkalot-rights` (35), `bkalot-design`, `kupot-holim` (17), `zol` (2), `haorech-torani` (1), `bkalut-marketing2`, `03-financial-marketing-site`, `hebrew-bridge-crm`, `bsmachot-plus`.
- 📦 ארכיון (לא לגעת): `luxe-balance-hub-81` + 4 עותקים, `luxe-ledger-hub`, `lux-manage`, `bklotm`, `pixel-perfect`.
- ❔ לא מזוהים: `mthbram`, `egod`, `more.30.com` (ריק), `bsmachot-plus`.

## מפת פרויקטי Supabase (7 נפרדים — לא מאוחד!)
| project ref | משמש את | נגיש ל-MCP שלי? |
|---|---|---|
| `uhnrgujbdxhhmoxcjria` | נדל"ן (schema `nadlan`) | ✅ כן (Tokyo) |
| `bieebmnmkffwbqlsfozh` | **איגוד — משותף:** torah-platform, igud-ads, igud-transcribe, torah-editor-mvp | ❌ לא (חשבון אחר) |
| `mwljkonwdeuaahsigjdp` | **משותף:** chatzor-connect, galilee-connect-hub | ❌ לא |
| `pwcswdfgorvlpdflzylm` | bkalut-app 🔒 | ❌ לא |
| `csjekrvukbdznetsrodj` | bkalut-price | ❌ לא |
| `trerolyveytzgksawrme` | get-your-rights | ❌ לא |
| `jhbeelzvjvhnkxldqvxx` | zchuyotpro-crm | ❌ לא |

## סליקה — נדרים פלוס (מסוף 7016674, webhook NEDARIM3873 🔒)
- **מימוש ייחוס מלא:** `torah-platform` — edge functions `nedarim-webhook`, `nedarim-create-payment`, `nedarim-admin` (+ מסך `NedarimManagement.tsx`).
- **מימוש נוסף:** `igud-ads` — `lib/nedarim.ts`.
- הסודות עצמם (מזהה מסוף, סוד ה-webhook) **אינם בקוד** — יושבים ב-Variables של הפריסה/Supabase. יש לוודא מילוי, לא נראים לי.

## פערי חיבור לדיווח (מה חסר / חוסם)
1. **Supabase מפוצל ל-7 פרויקטים בלפחות 3 חשבונות.** רק `uhnrgujb` (נדל"ן) נגיש לי דרך MCP. לשאר — **אין לי service key ואין גישת סכימה**. איחוד לאזור-אישי משותף דורש החלטה: לאחד לפרויקט אחד, או להשאיר מפוצל ולחבר Auth חוצה-פרויקטים.
2. **`igud-transcribe` — הטוקנים החסרים (כפי שביקשת לדייק):**
   - **`OPENAI_API_KEY`** — מנוע התמלול. בלעדיו התמלול לא רץ. ← זה הטוקן הקריטי החסר.
   - **`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`** — OAuth להתחברות משתמשים.
   - **`SUPABASE_SERVICE_ROLE_KEY`** — פעולות שרת מול `bieebmnm`.
   - כל השלושה הם סודות שלא קיימים בקוד ולא ב-`.env.shared` המקומי — צריך להזין ידנית.
3. **Cloudflare** — אין טוקן שמור. חיבור תת-דומיינים (`nadlan.more30.com` וכו') חסום עד לגישה.
4. **origin של more30.com לא מזוהה** — `mor1-main-site` הוא שלד (3 קבצים). האתר החי מוגש מ-Cloudflare מול origin לא ידוע (לא Vercel). יש לאתר לפני נגיעה כלשהי.
5. **`.env.shared` מכיל רק מפתחות נדל"ן** (+ Railway/Vercel tokens). אין בו מפתחות של 14 המערכות האחרות.
6. **מפתחות AI/OCR חסרים** רוחבית: ANTHROPIC/OPENAI/GEMINI/RECRAFT/KRAKEN/TRANSKRIBUS/DICTALM — לא נראים באף מקום נגיש לי.

## מה שנשמר בקפדנות (לא נגעתי)
- 🔒 `bkalut-app`, `bkalot-admin`, schema `zr_*`, webhook `NEDARIM3873` — קריאה בלבד.
- 📦 `luxe-balance-hub-81*`, `luxe-ledger-hub`, `lux-manage`, `bklotm`, `pixel-perfect` — לא נסרקו לעומק, לא נגעתי.
- אף `main` של אף מערכת חיה לא שונה. לא בוצע commit/push/מחיקה/מיזוג.
