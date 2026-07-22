# טוקנים חסרים — דוח Phase D

לכל טוקן: **מה** · **למה** · **איפה משיגים** · **איפה מדביקים**. אין כאן ערכי סוד —
רק שמות ומיקומים. המקור הרץ: `core.missing_tokens` (Supabase uhnrgujb). המשתמש
משלים את הערכים ב-Variables/Secrets של כל שירות — לעולם לא בגיט.

## ⭐ להתחיל מ-igud-transcribe (02)

| משתנה | למה | להשיג | להדביק |
|---|---|---|---|
| **OPENAI_API_KEY** | מנוע תמלול Whisper/GPT-4 — בלעדיו לא רץ | https://platform.openai.com/api-keys | Vercel → igud-transcribe → Settings → Environment Variables |
| **GOOGLE_CLIENT_ID** | OAuth התחברות | https://console.cloud.google.com/apis/credentials | Vercel → igud-transcribe → Settings → Environment Variables |
| **GOOGLE_CLIENT_SECRET** | OAuth התחברות | https://console.cloud.google.com/apis/credentials | Vercel → igud-transcribe → Settings → Environment Variables |
| **SUPABASE_SERVICE_ROLE_KEY** | פעולות שרת מול bieebmnm | https://supabase.com/dashboard/project/bieebmnmkffwbqlsfozh/settings/api | Vercel → igud-transcribe → Settings → Environment Variables |

## שאר המערכות

| # | מערכת | משתנה | למה | להשיג | להדביק |
|---|---|---|---|---|---|
| 03 | igud-ads | OPENAI_API_KEY | תוכן מודעות | https://platform.openai.com/api-keys | Vercel → igud-ads → Env Vars |
| 01 | torah-platform | NEDARIM_TERMINAL (7016674) | סליקת נדרים פלוס | https://www.matara.pro/nedarim/ | Supabase bieebmnm → Edge Functions → Secrets |
| 01 | torah-platform | SUPABASE_SERVICE_ROLE_KEY | edge functions | .../project/bieebmnmkffwbqlsfozh/settings/api | Supabase bieebmnm → Edge Functions → Secrets |
| 18 | torah-editor-mvp | ANTHROPIC_API_KEY | OCR/טקסט | https://console.anthropic.com/settings/keys | deploy → Env Vars |
| 18 | torah-editor-mvp | KRAKEN_API_KEY | OCR כתב יד | Kraken/eScriptorium | deploy → Env Vars |
| 18 | torah-editor-mvp | TRANSKRIBUS_USER / _PASS | OCR Transkribus | https://readcoop.eu/transkribus/ | deploy → Env Vars |
| 26 | modaot-studio | ANTHROPIC_API_KEY | מודעות AI | https://console.anthropic.com/settings/keys | deploy → Env Vars |
| 26 | modaot-studio | GEMINI_API_KEY | מודעות AI | https://aistudio.google.com/app/apikey | deploy → Env Vars |
| 26 | modaot-studio | RECRAFT_API_KEY | תמונות מודעות | https://www.recraft.ai/ | deploy → Env Vars |
| 28 | kupot-health-funds | ADMIN_TOKEN | גישת אדמין | (מוגדר ע"י המערכת) | Vercel → kupot-health-funds → Env Vars |
| 22 | get-your-rights | OPENAI_API_KEY | rights-agent edge | https://platform.openai.com/api-keys | Supabase trerolyv → Edge Functions → Secrets |
| 32 | נדל"ן ברגע | SUPABASE_SERVICE_KEY | קאשינג | .../project/uhnrgujbdxhhmoxcjria/settings/api | Vercel → nadlan-berega → Env Vars |
| 32 | נדל"ן ברגע | DATAGOV_SCHOOLS_RESOURCE | מאגר בתי ספר | https://data.gov.il/ | Vercel → nadlan-berega → Env Vars |
| 32 | נדל"ן ברגע | AI_API_KEY | סוכן דוח | https://console.anthropic.com/settings/keys | Vercel → nadlan-berega → Env Vars |

## היכן מדביקים — לפי סוג שירות
- **Vercel:** Project → Settings → Environment Variables
- **Railway:** Service → Variables
- **Supabase Edge Functions:** Project → Edge Functions → Secrets
- **Supabase service_role:** Project → Settings → API → `service_role` (סוד! רק ב-Variables)

> חסרים ערכים לא נמצאים בגיט ולא ב-`.env.shared` המקומי — יש להזין ידנית לכל שירות.
