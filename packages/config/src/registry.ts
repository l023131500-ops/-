import type { ProjectEntry } from "./types.js";

/**
 * The more30 project registry — build-time source of truth for routing.
 * The RUNTIME source of truth for admin/portal is `core.projects` in Supabase
 * (project uhnrgujbdxhhmoxcjria). Keep this file in sync with
 * supabase/seed/core_projects_seed.sql.
 *
 * ⚠️ CORRECTION (Phase 1, verified by reading every repo): systems are NOT on one
 * shared Supabase project. There are ~10 DISTINCT projects. `supabaseProject` below
 * is the VERIFIED ref from each repo's client/.env; null = no ref found (stub, or
 * env-placeholder only). The `core` registry lives on uhnrgujb but does NOT connect
 * to the other projects — it only catalogs them. See CONNECTIONS.md.
 *
 * Supabase clusters: uhnrgujb=nadlan(ops) · bieebmnm=igud(01,02,03,10,18) ·
 * csjekrvu=bkalut/kupot cluster(06,12,17,27) · mwljkonw=chatzor/galilee(16,24) ·
 * pwcswdfg=bkalut-app(08) · trerolyv=get-your-rights(22) · jhbeelzv=zchuyotpro(30) ·
 * hkkky=egod(15) · aypsq=mthbram(21) · ygaqq=hebrew-bridge(31).
 *
 * ⚠️ `live` / `isDeployed` here are DERIVED, not authoritative. Nothing keeps this
 * file in sync with `core.projects`, and on 10/08/2026 every row was compared
 * against production for the first time (scripts/qa/registry-vs-projects.mjs):
 * fifteen rows here claimed `live:false` for a mount that answers 200 with its
 * own bundle, and not one database row was wrong. They are corrected below.
 * Read deployment state from `core.projects`; this file exists for routing.
 *
 * How one stale line cost a round: QA/platform/HARDCODED_STATS.md quoted 21's
 * `live:false`, concluded there was no production to measure against, and
 * dropped seven candidates (#155). No runtime code reads these two flags — only
 * `number`/`slug` (basePath.ts) — which is exactly why they rotted unnoticed.
 */
export const REGISTRY: ProjectEntry[] = [
  { number: "01", slug: "torah-platform", repo: "torah-platform", name: "Torah Platform (HUB)", department: "torah", category: "hub", stage: "live", live: true, isDeployed: true, supabaseProject: "bieebmnmkffwbqlsfozh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "HUB לאיגוד. סליקת נדרים פלוס (edge nedarim-*). על bieebmnm — לא uhnrgujb." },
  { number: "02", slug: "igud-transcribe", repo: "igud-transcribe", name: "Igud Transcribe", department: "torah", category: "transcription", stage: "beta", live: true, isDeployed: true, supabaseProject: "bieebmnmkffwbqlsfozh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "OpenAI Whisper/GPT-4. חסר OPENAI_API_KEY + Google OAuth + SERVICE_ROLE." },
  { number: "03", slug: "igud-ads", repo: "igud-ads", name: "Igud Ads", department: "torah", category: "advertising", stage: "live", live: true, isDeployed: true, supabaseProject: "bieebmnmkffwbqlsfozh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "מערכת הכנסות. נדרים lib/nedarim.ts. חסר OPENAI_API_KEY." },
  { number: "04", slug: "imud-torani", repo: "imud-torani", name: "Imud Torani", department: "torah", category: "torah", stage: "beta", live: true, isDeployed: true, supabaseProject: null, supabaseSchema: null, deployTarget: "vercel", protected: false, note: "עימוד. באג ידוע: X-Visitor-Id header. ref Supabase לא נמצא — לאמת. פרוס (more30.com/imud עונה 200 עם החבילה שלו), אבל הפריסה החיה סטטית בלבד — אין פונקציית API, וכל שמירה נכשלת (#153)." },
  { number: "05", slug: "financial-marketing-site", repo: "03-financial-marketing-site", name: "Financial Marketing Site", department: "finance", category: "finance", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שלד שיווקי פיננסי (7 קבצים)." },
  { number: "06", slug: "kupot-holim", repo: "kupot-holim", name: "Kupot Holim", department: "health", category: "health", stage: "wip", live: true, isDeployed: true, supabaseProject: "csjekrvukbdznetsrodj", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "משתף csjekrvu עם bkalut-price/chizukim/smel." },
  { number: "07", slug: "zol", repo: "zol", name: "Zol", department: "misc", category: "commerce", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שלד (2 קבצים)." },
  { number: "08", slug: "bkalut-app", repo: "bkalut-app", name: "Bkalut App", department: "bkalut", category: "commerce", stage: "protected", live: true, isDeployed: true, supabaseProject: "pwcswdfgorvlpdflzylm", supabaseSchema: "public", deployTarget: "unknown", protected: true, note: "🔒 מוגן — לא לייבא/לגעת. Supabase pwcswdfg." },
  { number: "09", slug: "bkalot-admin", repo: "bkalot-admin", name: "Bkalot Admin", department: "bkalut", category: "commerce", stage: "protected", live: true, isDeployed: true, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: true, note: "🔒 מוגן. schema zr_* + webhook NEDARIM3873." },
  { number: "10", slug: "bkalot-rights", repo: "bkalot-rights", name: "Bkalot Rights", department: "rights", category: "rights", stage: "wip", live: true, isDeployed: true, supabaseProject: "bieebmnmkffwbqlsfozh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "משתף bieebmnm (igud)." },
  { number: "11", slug: "bkalut-marketing2", repo: "bkalut-marketing2", name: "Bkalut Marketing 2", department: "bkalut", category: "marketing", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שלד שיווקי (6 קבצים)." },
  { number: "12", slug: "smel-ndln", repo: "smel-ndln", name: "Smel Ndln", department: "realestate", category: "realestate", stage: "wip", live: true, isDeployed: true, supabaseProject: "csjekrvukbdznetsrodj", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "נדל\"ן variant. משתף csjekrvu. לשקול מיזוג עם 32." },
  { number: "13", slug: "property-identity", repo: "property-identity", name: "Property Identity", department: "realestate", category: "realestate", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "נדל\"ן variant. לשקול מיזוג עם 32-nadlan-berega." },
  { number: "14", slug: "bsmachot-plus", repo: "bsmachot-plus", name: "Bsmachot Plus", department: "misc", category: "events", stage: "wip", live: true, isDeployed: true, supabaseProject: null, supabaseSchema: null, deployTarget: "vercel", protected: false, note: "אירועים/שמחות (36 קבצים)." },
  { number: "15", slug: "egod", repo: "egod", name: "egod", department: "torah", category: "hub", stage: "live", live: true, isDeployed: true, supabaseProject: "hkkkynyoigzlttpynoeo", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "נולד ב-Lovable. Supabase משלו (hkkky) — לא משותף עם torah-platform." },
  { number: "16", slug: "chatzor-connect", repo: "chatzor-connect", name: "Chatzor Connect", department: "community", category: "other", stage: "wip", live: true, isDeployed: true, supabaseProject: "mwljkonwdeuaahsigjdp", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "קהילתי. משתף mwljkonw עם galilee." },
  { number: "17", slug: "chizukim-transcribe", repo: "chizukim-transcribe", name: "Chizukim Transcribe", department: "torah", category: "transcription", stage: "live", live: true, isDeployed: true, supabaseProject: "csjekrvukbdznetsrodj", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "תמלול. משתף csjekrvu. לאמת מפתח תמלול." },
  { number: "18", slug: "torah-editor-mvp", repo: "torah-editor-mvp", name: "Torah Editor MVP", department: "torah", category: "torah", stage: "live", live: true, isDeployed: true, supabaseProject: "bieebmnmkffwbqlsfozh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "OCR: Kraken/Transkribus/DictaLM/Anthropic. משתף bieebmnm." },
  { number: "19", slug: "igud-shiurim-portal", repo: "igud-shiurim-portal", name: "Igud Shiurim Portal", department: "torah", category: "torah", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שלד פורטל (6 קבצים)." },
  { number: "20", slug: "igud-portal", repo: "igud-portal", name: "Igud Portal", department: "torah", category: "torah", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שלד פורטל (7 קבצים)." },
  { number: "21", slug: "mthbram", repo: "mthbram", name: "Mthbram", department: "misc", category: "other", stage: "wip", live: true, isDeployed: true, supabaseProject: "aypsqqvfohekxxuqsmrw", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "Supabase משלו (aypsq). 204 קבצים. חי תחת more30.com/mthbram — אומת 10/08/2026 (200, index-y-Q5UqSS.js); stage=wip תואם עכשיו את core.projects (מדד 20/08/2026)." },
  { number: "22", slug: "get-your-rights", repo: "get-your-rights", name: "Get Your Rights", department: "rights", category: "rights", stage: "live", live: true, isDeployed: true, supabaseProject: "trerolyveytzgksawrme", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "edge: leads-api/leads-webhook/n8n-notify/rights-agent. Supabase משלו (trerolyv)." },
  { number: "23", slug: "haorech-torani", repo: "haorech-torani", name: "Haorech Torani", department: "torah", category: "torah", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שלד (קובץ אחד)." },
  { number: "24", slug: "galilee-connect-hub", repo: "galilee-connect-hub", name: "Galilee Connect Hub", department: "community", category: "other", stage: "wip", live: true, isDeployed: true, supabaseProject: "mwljkonwdeuaahsigjdp", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "קהילתי. משתף mwljkonw עם chatzor." },
  { number: "25", slug: "mor1-main-site", repo: "mor1-main-site", name: "Mor1 Main Site", department: "misc", category: "marketing", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "ריפו ריק (0 קבצים). origin החי של more30.com לא מזוהה." },
  { number: "26", slug: "modaot-studio", repo: "modaot-studio", name: "Modaot Studio", department: "torah", category: "advertising", stage: "wip", live: true, isDeployed: true, supabaseProject: null, supabaseSchema: null, deployTarget: "vercel", protected: false, note: "סטודיו AI: Anthropic/Gemini/Recraft. ללא Supabase." },
  { number: "27", slug: "bkalut-price", repo: "bkalut-price", name: "Bkalut Price", department: "bkalut", category: "commerce", stage: "wip", live: true, isDeployed: true, supabaseProject: "csjekrvukbdznetsrodj", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "משתף csjekrvu. 255 קבצים." },
  { number: "28", slug: "kupot-health-funds", repo: "kupot-health-funds", name: "Kupot Health Funds", department: "health", category: "health", stage: "wip", live: true, isDeployed: true, supabaseProject: null, supabaseSchema: null, deployTarget: "vercel", protected: false, note: "env SUPABASE_URL/ANON + ADMIN_TOKEN. ref placeholder." },
  { number: "29", slug: "bkalot-design", repo: "bkalot-design", name: "Bkalot Design", department: "bkalut", category: "marketing", stage: "wip", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שלד עיצוב (7 קבצים)." },
  { number: "30", slug: "zchuyotpro-crm", repo: "zchuyotpro-crm", name: "ZchuyotPro CRM", department: "rights", category: "crm", stage: "wip", live: true, isDeployed: true, supabaseProject: "jhbeelzvjvhnkxldqvxx", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "CRM זכויות. Supabase משלו (jhbeelzv)." },
  { number: "31", slug: "hebrew-bridge-crm", repo: "hebrew-bridge-crm", name: "Hebrew Bridge CRM", department: "community", category: "crm", stage: "wip", live: true, isDeployed: true, supabaseProject: "ygaqqnuyfnumezxxmtbh", supabaseSchema: "public", deployTarget: "vercel", protected: false, note: "Supabase משלו (ygaqq). 155 קבצים." },
  { number: "32", slug: "nadlan-berega", repo: "nadlan-berega", name: "נדל\"ן ברגע", department: "realestate", category: "realestate", stage: "live", live: true, isDeployed: true, supabaseProject: "uhnrgujbdxhhmoxcjria", supabaseSchema: "nadlan", deployTarget: "vercel", liveUrl: "https://nadlan-berega.vercel.app", protected: false, note: "המערכת הראשונה שהושקה. 7 שכבות אמת. schema nadlan על ה-ops." },
  { number: "34", slug: "kesef", repo: "UNKNOWN", name: "כסף — שקיפות תקציבית", department: "community", category: "finance", stage: "wip", live: true, isDeployed: true, supabaseProject: "uhnrgujbdxhhmoxcjria", supabaseSchema: "kesef", deployTarget: "vercel", protected: false, note: "הסכימה kesef חיה על ה-hub (36 טבלאות, RLS על כולן, הוחלה 02/08). קוד המקור עדיין לא אותר — ראה NEEDS_USER. הסכימה אינה ב-Exposed schemas, ולכן אין עדיין גישה דרך ה-Data API." },
  { number: "35", slug: "kioskfleet", repo: "zol", name: "KioskFleet — נעילת מכשיר", department: "misc", category: "commerce", stage: "beta", live: true, isDeployed: true, supabaseProject: null, supabaseSchema: null, deployTarget: "railway", liveUrl: "https://more30.com/kiosk", protected: false, note: "שרת stateful (Express + SQLite + WebSocket) — נשאר על Railway, לא עובר ל-Vercel. הקוד יושב בריפו zol, ענף claude/what-do-you-see-gxo5tc, שורש kiosk/server. הפורטל מנתב more30.com/kiosk לשירות." },
  // ‏33 ו-36–38 חיו ב-core.projects ומעולם לא נכתבו כאן. ‏36 הוא המקרה שעולה כסף:
  // מערכת חיה (more30.com/tivuch עונה 200 עם החבילה שלה) שכל קורא של הקובץ הזה
  // לא ידע שהיא קיימת. הוספו 10/08 מהמסד, ואומתו מול הכתובת.
  { number: "33", slug: "more30-spec-loop", repo: "more30", name: "more30 Spec Loop", department: "misc", category: "hub", stage: "live", live: true, isDeployed: true, supabaseProject: "uhnrgujbdxhhmoxcjria", supabaseSchema: null, deployTarget: "vercel", liveUrl: "https://more30.com", protected: false, note: "מנוע האפיון + אתר התדמית — הפורטל עצמו, בעל השורש more30.com. אין לו מונט תחת נתיב, ולכן אין לו TOPIC_ROUTE." },
  { number: "36", slug: "nadlan-pro", repo: "l023131500-ops/-", name: "נדל\"ן פרו — ניהול למתווכים", department: "realestate", category: "realestate", stage: "beta", live: true, isDeployed: true, supabaseProject: "uhnrgujbdxhhmoxcjria", supabaseSchema: "nadlan_pro", deployTarget: "vercel", liveUrl: "https://more30.com/tivuch", protected: false, note: "schema nadlan_pro על ה-ops. חי תחת more30.com/tivuch — אומת 10/08/2026 (200, חבילה משלו)." },
  { number: "37", slug: "bkalot-clone", repo: "more30", name: "בקלות — עותק עבודה עצמאי", department: "bkalut", category: "rights", stage: "idea", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "שכפול פתוח של מערכת 10 (§5), לא של המוגנות. ‏/bkalot-studio מחזיר 404 — טרם נבנה." },
  { number: "38", slug: "events-gifts", repo: "more30", name: "אירועים ומתנות — מערכת עצמאית", department: "community", category: "events", stage: "idea", live: false, isDeployed: false, supabaseProject: null, supabaseSchema: null, deployTarget: "unknown", protected: false, note: "מתנות באשראי, אישורי הגעה, דפי נחיתה לאולמות. ‏/events מחזיר 404 — טרם נבנה." },
];

/** Repos to archive/clean only — never treated as active apps. Imported frozen to apps/_archive/. */
export const ARCHIVE_REPOS: string[] = [
  "luxe-balance-hub-81",
  "luxe-balance-hub-81-2495305b",
  "luxe-balance-hub-81-18cf8aef",
  "luxe-balance-hub-81-906f08da",
  "luxe-balance-hub-81-8c019fba",
  "luxe-ledger-hub",
  "lux-manage",
  "bklotm",
  "pixel-perfect",
];

/**
 * Topic routes under more30.com/<topic> — the PUBLIC entry for every system.
 * One clear word per domain. NetFree blocks *.vercel.app, so the portal proxies
 * more30.com/<topic>/* → the system's deployment (Vercel rewrites); the vercel.app
 * URL is never exposed. Keys are registry numbers; values are the url-safe topic.
 * Protected (08,09) and near-empty stubs get no route (undefined).
 */
export const TOPIC_ROUTES: Record<string, string> = {
  "01": "torah",      // Torah Platform — HUB לאיגוד התורני
  "02": "tamlul",     // תמלול שיעורים (Whisper/GPT)
  "03": "modaot",     // מערכת מודעות/הכנסות לאיגוד
  "04": "imud",       // עימוד ספרים תורני
  "05": "financial",  // אתר שיווקי פיננסי
  "06": "briut",      // קופות חולים — השוואת שירותי בריאות
  "07": "zol",        // השוואת מחירים
  "10": "bkalot",     // זכויות בקלות
  "12": "smel",       // נדל"ן — סמל (variant)
  "14": "smachot",    // ניהול אירועים ושמחות
  "15": "egod",       // egod — HUB (Lovable)
  "16": "chatzor",    // קהילת חצור
  "17": "chizukim",   // תמלול חיזוקים
  "18": "orech",      // עורך OCR תורני
  "19": "shiurim",    // פורטל שיעורים
  "20": "igud",       // פורטל האיגוד
  "21": "mthbram",    // מ.ת.ברם
  "22": "zchuyot",    // מיצוי זכויות
  "24": "galil",      // חיבור הגליל
  "26": "studio",     // סטודיו מודעות AI
  "27": "mechiron",   // מחירון בקלות
  "28": "kupot",      // קופות חולים — קרנות בריאות
  "30": "crm",        // CRM זכויות (ZchuyotPro)
  "31": "gesher",     // גשר — CRM קהילתי (Hebrew Bridge)
  "32": "nadlan",     // נדל"ן ברגע — המערכת החיה הראשונה
  "36": "tivuch",     // נדל"ן פרו — ניהול למתווכים (חי; נעדר מהמפה עד 10/08)
  "34": "kesef",      // שקיפות תקציבית ברשויות מקומיות
  "35": "kiosk",      // KioskFleet — ניהול צי מכשירי קיוסק (Railway, מנותב מכאן)
};

/** The public more30.com path for a system number, e.g. "32" → "/nadlan". */
export function topicPath(number: string): string | undefined {
  const t = TOPIC_ROUTES[number];
  return t ? `/${t}` : undefined;
}

/** The full public more30.com URL for a system, e.g. "32" → "https://more30.com/nadlan". */
export function publicUrl(number: string): string | undefined {
  const t = TOPIC_ROUTES[number];
  return t ? `https://more30.com/${t}` : undefined;
}

/** Resolve the registry entry that owns a given topic path (reverse lookup). */
export function bySlugTopic(topic: string): ProjectEntry | undefined {
  const num = Object.keys(TOPIC_ROUTES).find((n) => TOPIC_ROUTES[n] === topic);
  return num ? getByNumber(num) : undefined;
}

/** Department display names (Hebrew) for the portal/admin. */
export const DEPARTMENTS: Record<string, string> = {
  // "עורך תורני" הוא שמה של מערכת אחת (18), ולא של התחום שמכיל גם שיעורים,
  // תמלול, מודעות ועימוד — הכותרת בדף הבית הבטיחה משהו צר מדי.
  torah: "עולם התורה",
  finance: "פיננסי",
  realestate: "נדל\"ן",
  health: "בריאות וקופות",
  rights: "זכויות",
  community: "קהילה ואזורי",
  bkalut: "מותג בקלות 🔒",
  misc: "שונות / מסחר",
};

export function getByNumber(n: string): ProjectEntry | undefined {
  return REGISTRY.find((p) => p.number === n);
}

export function activeProjects(): ProjectEntry[] {
  return REGISTRY.filter((p) => !p.protected && p.stage !== "archived");
}

export function byDepartment(dep: string): ProjectEntry[] {
  return REGISTRY.filter((p) => p.department === dep);
}
