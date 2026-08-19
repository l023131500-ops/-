import { useEffect, useState } from "react";
import { DEPARTMENTS } from "@more30/config";
import { createBrowserClient, type SupabaseClient } from "@more30/db";

/**
 * more30 · הניהול המאוחד — more30.com/admin. כניסה אחת (Supabase Auth) לכל מה
 * שיש: מצב כל מערכת, לוח הביקורת, הכניסות לאדמין של כל מערכת, המפתחות
 * והקרדיטים אצל הספקים, והרעיונות והאפיונים שנכנסו מהאתר.
 *
 * כל קריאה כאן עוברת דרך RPC שמאמת `more30_is_admin()`:
 *   more30_admin_snapshot (מערכות/משימות/מפתחות/באגים) · more30_intake_list ·
 *   more30_spec_list. אין קריאה אחת שרצה עם anon — ראה db/core/0008.
 */
interface Overview {
  number: string; name: string; name_he?: string | null; path?: string | null;
  what_it_does?: string | null; functions?: string | null;
  fixed_notes?: string | null; changed_notes?: string | null;
  department: string; category: string; stage: string;
  live: boolean; is_deployed: boolean; deploy_target: string | null; live_url: string | null;
  admin_url: string | null; admin_auth?: string | null; is_protected: boolean; to_delete: boolean;
  supabase_project: string | null; supabase_schema: string | null; note: string | null;
  open_bugs: number; open_tasks: number; missing_tokens: number;
  // ביקורת 29/07 — הסטטוס האמיתי של כל מערכת. הניהול מציג את כולן; האתר
  // הציבורי מציג רק את מי ש-public_visible אצלה true.
  public_visible?: boolean; audit_class?: string | null; audit_status?: string | null;
  audit_real_data?: boolean | null; audit_deploy_ok?: boolean | null; audit_live_ok?: boolean | null;
  audit_evidence?: string | null; replaced_by?: string | null;
  audit_gaps?: string | null; audit_revenue?: string | null; audited_at?: string | null;
}
const CLASS_HE: Record<string, string> = {
  A: "איכותית · מוצגת באתר",
  B: "לא מוכנה · מוסתרת",
  C: "הוחלפה בגרסה חזקה יותר",
};
const CLASS_COLOR: Record<string, string> = { A: "#16a34a", B: "#dc2626", C: "#d97706" };
const routedOnDomain = (r: Overview) => !!r.live_url && r.live_url.includes("more30.com");
interface Task { id: string; project_num: string; title: string; status: string; author: string; }
interface Token { id: string; project_num: string; env_var: string; purpose: string | null; obtain_url: string | null; paste_location: string | null; status: string; }
interface Bug { id: string; project_num: string; title: string; severity: string; status: string; }
interface Idea { id: string; full_name: string; phone: string | null; email: string | null; city: string | null;
  project_name: string | null; stage: string | null; short_description: string | null; problem: string | null;
  solution: string | null; target_customer: string | null; revenue_model: string | null; competitors: string | null;
  differentiation: string | null; funding_needed: string | null; launch_timeline: string | null;
  services_wanted: string[] | null; dream_free_text: string | null; status: string; created_at: string;
  converted_project_num: string | null; }

/** אפיון מהשאלון החכם (מערכת 33). התשובות דינמיות ולכן נשמרות כ-jsonb. */
interface Spec {
  id: string; created_at: string;
  full_name: string; phone: string | null; email: string | null; city: string | null;
  project_name: string | null; track: string | null;
  answers: Record<string, string | string[]>;
  questions: { key: string; label: string; step: string }[];
  services_wanted: string[] | null;
  status: string;
  ai_status: string; ai_model: string | null; ai_analysis: string | null; ai_error: string | null;
  ai_completed_at: string | null;
}

let sb: SupabaseClient | null = null;
try { sb = createBrowserClient("public"); } catch { sb = null; }
const DEPT_KEYS = Object.keys(DEPARTMENTS);
/** תחום שנוסף במסד ואין לו תרגום מוצג כמו שהוא, במקום להיעלם מהמסך. */
const deptLabel = (d: string) => DEPARTMENTS[d] ?? d;
const IDEA_STATUS = ["new", "reviewing", "approved", "rejected"];
const IDEA_STATUS_HE: Record<string, string> = { new: "חדש", reviewing: "בבדיקה", approved: "אושר", rejected: "נדחה" };
const SPEC_STATUS = ["new", "reviewing", "analyzed", "converted", "rejected"];
const SPEC_STATUS_HE: Record<string, string> = { new: "חדש", reviewing: "בבדיקה", analyzed: "נותח", converted: "הפך לפרויקט", rejected: "נדחה" };

/**
 * הניהול מוגש תחת more30.com/nihul, והפונקציה שמריצה את ניתוח ה-AI יושבת
 * באותו origin (הפורטל) ב-/api/spec-analyze. בפיתוח מקומי אין פונקציה —
 * ואז אפשר להצביע לפרודקשן דרך VITE_API_BASE.
 */
const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";

/**
 * ספק חיצוני, כפי ש-`/api/credits` מחזיר אותו. אין כאן מפתחות — רק מספרים.
 *
 * ⚠️ השדות כאן חייבים להיות בדיוק אלה של `portal/api/credits.ts`. הגרסה
 * הקודמת הכריזה `usedUsd`/`limitUsd` — שמות שהפונקציה מעולם לא החזירה — ולכן
 * המסך הדפיס `$undefined / $undefined` לכל ספק שכן מפרסם יתרה. TypeScript לא
 * תפס את זה כי המבנה נוצק ל-`ProviderCredit` בלי אימות (`as`), והסורק
 * הרוחבי שמחפש `undefined` על המסך אינו מגיע לכאן כי `/admin` דורש כניסה.
 */
interface ProviderCredit {
  key: string; label: string; usedBy: string;
  /** `not-deployed` = המפתח בכספת אך לא נפרס כאן. מצב נפרד מ"אין מפתח". */
  state: "ok" | "missing" | "not-deployed" | "invalid" | "unknown";
  usage?: { used: number; limit: number; percent: number; unit: string; cycleEnds?: string | null };
  detail: string;
  /** עמוד ההוספה אצל הספק — §3א דורש קישור ישיר לכל אחד. */
  topUp: string;
  /** כשהיעד אינו עמוד חיוב (הרשאות/קטלוג/API keys), תווית מדויקת במקום "הוספת קרדיט". */
  topUpLabel?: string;
  inVault: boolean;
  deployed: boolean;
}
const CREDIT_STATE_HE: Record<string, string> = {
  ok: "פועל", missing: "אין מפתח", "not-deployed": "לא נפרס",
  invalid: "נדחה", unknown: "לא נמדד",
};
const CREDIT_STATE_COLOR: Record<string, string> = {
  ok: "#16a34a", missing: "#94a3b8", "not-deployed": "#d97706",
  invalid: "#dc2626", unknown: "#d97706",
};
/** מספר בעברית, ליחידה שהספק באמת החזיר — ולא סימן דולר קבוע. */
const nfHe = (n: number) => Number(n).toLocaleString("he-IL", { maximumFractionDigits: 2 });

/**
 * פרויקט ה-Supabase שהכניסה הזו נמצאת בו. מערכת שיושבת על אותו פרויקט
 * משתמשת באותו מאגר משתמשים — כלומר הכניסה הזו באמת פותחת אותה. מערכת על
 * פרויקט אחר מחזיקה מאגר משתמשים נפרד, ואי אפשר לאחד אותם מכאן.
 */
const HUB_PROJECT = (() => {
  const url: string = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
  return url.replace(/^https?:\/\//, "").split(".")[0] ?? "";
})();

/**
 * מה באמת שומר על מסך האדמין של כל מערכת — `core.projects.admin_auth`, שנמדד
 * בדפדפן אמיתי ולא נגזר מ-HTTP 200. זו התשובה הכנה ל"אותם פרטי כניסה לכל
 * המערכות": היא נכונה למי שיושב על ה-hub, ולא נכונה לשאר, ובמקום להבטיח SSO
 * שאינו קיים המסך אומר בדיוק מי בפנים, מי בחוץ, ומה שבור.
 */
type AccessKind = "hub" | "own" | "token" | "open" | "broken" | "none";
const ACCESS_HE: Record<AccessKind, string> = {
  hub: "אותה כניסה ✓",
  own: "משתמשים נפרדים",
  token: "טוקן, לא משתמש",
  open: "⚠️ פתוח בלי סיסמה",
  broken: "הכניסה שבורה",
  none: "אין מסך אדמין",
};
const ACCESS_COLOR: Record<AccessKind, string> = {
  hub: "#16a34a", own: "#d97706", token: "#6366f1",
  open: "#dc2626", broken: "#dc2626", none: "#94a3b8",
};
const ACCESS_WHY: Record<AccessKind, string> = {
  hub: "יושבת על אותו פרויקט Supabase — המייל והסיסמה כאן נכנסים גם לשם.",
  own: "מאגר משתמשים משלה על פרויקט Supabase אחר. איחוד דורש את מפתח ה-service של אותו פרויקט, ואין כזה בחשבון הזה.",
  token: "לא עובדת עם משתמשים אלא עם סוד בכתובת או בכותרת — אין למה לחבר כניסה.",
  open: "המסך נפתח לכל אחד בלי שום אימות. זה ממצא, לא הגדרה.",
  broken: "יש מסך אדמין, אבל הכניסה אליו מפילה את הדפדפן אל מחוץ למערכת.",
  none: "לא נפרס מסך אדמין — הנתיב נופל לאפליקציה עצמה.",
};

/**
 * משתמש של הפלטפורמה, עם האתרים שהוא חבר בהם. החברות (core.app_memberships)
 * היא מה שקובע לאיזה אתר משתמש שייך — הסשן משותף לכל 33 המערכות כי כולן על
 * אותו origin, אבל זה לא אומר שמי שנרשם באתר אחד הוא משתמש של כולם.
 */
interface PlatformUser {
  user_id: string;
  email: string;
  full_name: string | null;
  /** מאיפה השם הגיע: 'profile' (הוקלד ב-/auth/callback) או 'signup' (טופס §8ב / Google). */
  name_source?: "profile" | "signup" | null;
  phone?: string | null;
  /**
   * המסלול שבתוקף. ממיגרציה 0041 הוא נגזר מ-core.subscriptions ולא מעמודת
   * more30_profiles.plan שאיש אינו כותב אליה — אותו תיקון ש-0031 עשה ל-/me
   * ולתפריט החשבון, ושהקורא הזה נשאר מאחוריו.
   */
  plan: string;
  /** בקשת מנוי שטרם נגבתה. אינה מסלול בתוקף, ולכן שדה נפרד. */
  plan_requested?: string | null;
  plan_status?: string | null;
  has_profile?: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string | null;
  confirmed: boolean;
  is_super_admin: boolean;
  apps: { app_key: string; role: string }[];
}

const PLAN_HE: Record<string, string> = {
  free: "חינמי", basic: "בסיסי", extended: "מורחב", premium: "פרימיום", vip: "VIP", pro: "פרו",
};

const ROLE_HE: Record<string, string> = { member: "משתמש", manager: "מנהל תוכן", admin: "מנהל" };

/**
 * המסכים שיושבים תחת /admin אבל אינם חלק מהאפליקציה הזו.
 *
 * ‎more30.com/admin הוא שני דברים באותה כתובת: הלוח הזה (פרויקט `nihul-more30`)
 * עונה ל-`/admin`, ותשעה מסכים עצמאיים עונים ל-`/admin/<שם>` מתוך הפורטל —
 * ה-rewrites ב-`portal/vercel.dist.json` נבדקים לפני הנפילה ל-`/admin/:path*`.
 * שני הצדדים נפרסים בנפרד ואף אחד מהם לא ידע על השני, ולכן שמונה מהמסכים היו
 * מוגשים כהלכה ובכל זאת נגישים רק למי שמקליד את הכתובת בעצמו
 * (`scripts/qa/admin-screens-reachable.mjs`: 1 מתוך 9).
 *
 * הרשימה כתובה כאן ולא נקראת מהמסד בכוונה: אלה מסכים של הניהול עצמו, לא
 * מערכות. הכניסות לאדמין של המערכות מגיעות מ-`core.projects.admin_url`
 * ומוצגות בלשונית "כניסות לאדמין".
 */
const CONSOLE_SCREENS: { href: string; label: string; hint: string }[] = [
  { href: "/admin/systems", label: "דוח מערכות", hint: "מצב, קישור ו-Lighthouse לכל מערכת" },
  { href: "/admin/issues", label: "תקלות ומה דורש אותך", hint: "תוקן · בטיפול · פתוח" },
  { href: "/admin/leads", label: "לידים", hint: "הלידים של כל המערכות במקום אחד" },
  { href: "/admin/customers", label: "לקוחות", hint: "מנויים וחשבונות" },
  { href: "/admin/pricing", label: "מחירים ותצוגה", hint: "core.plans — עריכה חיה" },
  { href: "/admin/credits", label: "יתרות וחיבורים", hint: "מה נשאר אצל כל ספק" },
  { href: "/admin/activity", label: "משתמשים פעילים", hint: "כניסות ושימוש" },
  { href: "/admin/automation", label: "אוטומציית תוכן", hint: "התור של בקלות · מצב טסט" },
  { href: "/admin/rights", label: "מאגר הזכויות · בקלות (10)", hint: "ניהול הקטלוג" },
  { href: "/admin/kesef", label: "כסף — קליטת נתונים (34)", hint: "רשויות, מקורות וסנכרון" },
  { href: "/admin/imud", label: "עימוד — ספרים ותבניות (04)", hint: "ספרים, בלוקים ותבניות בשימוש" },
  { href: "/admin/orech", label: "העורך התורני — HTR ותיקונים (18)", hint: "משימות זיהוי כתב יד, סטטוסים וביטחון" },
  { href: "/admin/studio", label: "סטודיו — תבניות ועבודות (26)", hint: "תבניות, מותגים ועבודות שמורות" },
];

const accessOf = (r: Overview): AccessKind =>
  (r.admin_auth && r.admin_auth in ACCESS_HE ? r.admin_auth : "none") as AccessKind;

/** הכתובת המלאה של מסך האדמין, כשיש כזה ואפשר להגיע אליו בלחיצה. */
function adminHref(r: Overview): string | null {
  if (!r.admin_url) return null;
  if (r.admin_url.startsWith("http")) return r.admin_url;
  if (!r.admin_url.startsWith("/")) return null; // תיאור, לא נתיב
  return r.live_url ? r.live_url.replace(/\/$/, "") + r.admin_url : null;
}

export function App() {
  const [view, setView] = useState<"systems" | "access" | "users" | "keys" | "ideas" | "specs">("systems");
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [userApp, setUserApp] = useState("");
  /**
   * ההרשאה נשאלת מהשרת (`more30_is_admin`), לא נגזרת מקיום סשן. מחובר ≠ מנהל:
   * בלי זה כל משתמש רשום היה מקבל את שלד לוח השליטה ורק אחר כך שורת שגיאה
   * מכל קריאה — מסך שנראה כאילו הוא בפנים.
   */
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Overview[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [aiBusy, setAiBusy] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [session, setSession] = useState<unknown>(null);
  /**
   * "טרם ידוע" עד שנשמעת התשובה הראשונה של Supabase על הסשן. בלי המצב הזה
   * מסך ההתחברות מהבהב לרגע גם למי שכבר מחובר, וגרוע מזה — הטעינה מתחילה
   * לפני שיש טוקן ונכשלת.
   */
  const [authReady, setAuthReady] = useState(false);
  const [credits, setCredits] = useState<ProviderCredit[] | null>(null);
  const [creditsMsg, setCreditsMsg] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(sb ? null : "מצב לא-מקוון: אין חיבור Supabase.");
  const [fDept, setFDept] = useState(""); const [fStage, setFStage] = useState(""); const [fLive, setFLive] = useState(false); const [q, setQ] = useState("");
  const [fClass, setFClass] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [conv, setConv] = useState<Record<string, { slug: string; dept: string; cat: string }>>({});

  /**
   * קריאה אחת מוגנת במקום ארבע קריאות טבלה. עד 0008 ארבע ה-views היו פתוחות
   * ל-anon, כלומר כל מבקר יכול היה לקרוא את כתובות האדמין ואת רשימת המפתחות
   * החסרים. עכשיו הן סגורות, וה-RPC מאמת `more30_is_admin()` לפני שהוא עונה.
   */
  async function loadSystems() {
    if (!sb) return;
    const { data, error } = await sb.rpc("more30_admin_snapshot");
    if (error) {
      setMsg(
        error.message.includes("admin only")
          ? "החשבון הזה מחובר, אבל אינו מוגדר כאדמין של more30."
          : "שגיאת קריאה: " + error.message,
      );
      return;
    }
    const snap = (data ?? {}) as { projects?: Overview[]; tasks?: Task[]; tokens?: Token[]; bugs?: Bug[] };
    setRows(snap.projects ?? []);
    setTasks(snap.tasks ?? []);
    setTokens(snap.tokens ?? []);
    setBugs(snap.bugs ?? []);
  }
  /**
   * משתמשי הפלטפורמה. ה-RPC מאמת סופר-אדמין בעצמו ומחזיר גם את החברויות,
   * כדי שלא נצטרך קריאה לכל מערכת בנפרד — 33 קריאות רק כדי לצייר טבלה.
   */
  async function loadUsers() {
    if (!sb) return;
    const { data, error } = await sb.rpc("more30_admin_users");
    if (error) {
      setMsg(
        error.message.includes("super admin")
          ? "רשימת המשתמשים פתוחה לסופר-אדמין של הפלטפורמה בלבד."
          : "טעינת המשתמשים נכשלה: " + error.message,
      );
      setUsers([]);
      return;
    }
    setUsers((data ?? []) as PlatformUser[]);
  }

  async function setUserRole(userId: string, appKey: string, role: string) {
    if (!sb) return;
    const { error } = await sb.rpc("more30_app_set_role", {
      p_user: userId, p_app: appKey, p_role: role,
    });
    if (error) { setMsg("שינוי התפקיד נכשל: " + error.message); return; }
    loadUsers();
  }

  async function loadIdeas() {
    if (!sb) return;
    const { data, error } = await sb.rpc("more30_intake_list");
    if (error) { setMsg("רעיונות נכנסים דורשים התחברות אדמין. " + error.message); setIdeas([]); return; }
    setIdeas((data ?? []) as Idea[]);
  }

  async function loadSpecs() {
    if (!sb) return;
    const { data, error } = await sb.rpc("more30_spec_list");
    if (error) { setMsg("אפיונים דורשים התחברות אדמין. " + error.message); setSpecs([]); return; }
    setSpecs((data ?? []) as Spec[]);
  }
  async function setSpecStatus(id: string, s: string) {
    if (!sb) return;
    const { error } = await sb.rpc("more30_spec_set_status", { p_id: id, p_status: s });
    if (error) { setMsg(error.message); return; }
    loadSpecs();
  }

  /**
   * "שלח לניתוח AI": הפונקציה בשרת היא זו שמחזיקה את מפתח ה-AI. אנחנו רק
   * מעבירים לה את ה-JWT של האדמין המחובר — היא מאמתת דרכו הרשאה, מריצה את
   * הניתוח וכותבת אותו למסד.
   *
   * הניתוח לוקח כדקה, ולכן לא מחכים לתשובת ה-fetch כדי לדעת מה קרה: הפונקציה
   * כותבת `ai_status` למסד, ואנחנו עוקבים אחריו בתשאול. כך גם אם החיבור של
   * הדפדפן נופל באמצע — התוצאה עדיין תופיע, ואין כפתור שנתקע ב"מנתח…".
   */
  async function analyzeSpec(id: string) {
    if (!sb || aiBusy[id]) return;

    // getSession מחזיר את הטוקן השמור גם כשפג תוקפו, וטוקן פג = 401 מהפונקציה.
    // refreshSession מבטיח שנשלח טוקן חי; אם הרענון נכשל — אין ממש התחברות.
    let jwt = (await sb.auth.getSession()).data.session?.access_token ?? "";
    const { data: fresh } = await sb.auth.refreshSession();
    if (fresh.session?.access_token) jwt = fresh.session.access_token;
    if (!jwt) { setMsg("צריך התחברות אדמין כדי להריץ ניתוח — התחברו שוב."); return; }

    setAiBusy((b) => ({ ...b, [id]: true }));
    setMsg("שולח לניתוח AI… (בדרך כלל כדקה)");

    let rejected = false;

    // התוצאה נקראת מהמסד בתשאול, אבל דחייה מיידית (401/403/503) לא מגיעה לשם
    // כי ai_status בכלל לא נקבע ל-running — בלי לקרוא את התשובה המסך היה נתקע.
    fetch(`${API_BASE}/api/spec-analyze`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ id }),
    })
      .then(async (r) => {
        if (r.ok) return;
        const detail = await r.text().catch(() => "");
        let note = detail.slice(0, 200);
        try { note = JSON.parse(detail).error ?? note; } catch { /* גוף שאינו JSON */ }
        if (r.status === 401) note = "ההתחברות פגה. התחברו שוב ונסו מחדש.";
        if (r.status === 403) note = "אין הרשאת אדמין למשתמש הזה, או שניתוח כבר רץ. " + note;
        rejected = true;
        setAiBusy((b) => ({ ...b, [id]: false }));
        setMsg("הניתוח לא יצא לדרך: " + note);
      })
      .catch(() => { /* נפילת רשת — התשאול עדיין יראה את התוצאה אם הניתוח כן רץ */ });

    // תשאול עד שהניתוח יוצא ממצב running (או עד 3 דקות, כבלם).
    const started = Date.now();
    const poll = window.setInterval(async () => {
      if (!sb) return;
      // הבקשה נדחתה מיד — אין מה לתשאל, וההודעה כבר על המסך.
      if (rejected) { window.clearInterval(poll); return; }
      const { data } = await sb.rpc("more30_spec_list");
      const list = (data ?? []) as Spec[];
      setSpecs(list);
      const row = list.find((x) => x.id === id);
      const timedOut = Date.now() - started > 180_000;
      if (!row || row.ai_status !== "running" || timedOut) {
        window.clearInterval(poll);
        setAiBusy((b) => ({ ...b, [id]: false }));
        if (row?.ai_status === "done") setMsg("הניתוח הושלם ✅");
        else if (row?.ai_status === "error") setMsg("הניתוח נכשל: " + (row.ai_error ?? "לא ידוע"));
        else if (timedOut) setMsg("הניתוח מתמשך — רעננו את הדף כדי לבדוק שוב.");
      }
    }, 4000);
  }

  /**
   * מצב הקרדיטים נמדד בשרת, כי המפתחות של הספקים לא יכולים להגיע לדפדפן.
   * הפונקציה מקבלת את ה-JWT ומאמתת אותו מול `more30_is_admin()`.
   */
  async function loadCredits() {
    if (!sb) return;
    setCreditsMsg(null);
    await sb.auth.refreshSession().catch(() => null);
    const jwt = (await sb.auth.getSession()).data.session?.access_token ?? "";
    if (!jwt) { setCreditsMsg("צריך התחברות אדמין."); return; }
    try {
      const res = await fetch(`${API_BASE}/api/credits`, { headers: { Authorization: `Bearer ${jwt}` } });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setCreditsMsg(body?.error ?? `שגיאה ${res.status}`); return; }
      setCredits(body.providers as ProviderCredit[]);
    } catch (e: any) {
      setCreditsMsg("לא הצלחנו לבדוק את הספקים: " + (e?.message ?? e));
    }
  }

  /**
   * ⚠️ שום טעינה לא רצה לפני שיש סשן. עד לשינוי הזה הניהול קרא את
   * `more30_project_overview` עם ה-anon — כלומר כל מי שהגיע לכתובת ראה את
   * `fixed_notes`, את `admin_url` של כל מערכת, ואת מספר המפתחות החסרים בכל
   * אחת. זה לא היה "לוח פתוח", זו הייתה דליפה.
   */
  useEffect(() => {
    if (!sb) { setAuthReady(true); return; }
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); setAuthReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setRows([]); setTasks([]); setTokens([]); setBugs([]); setIdeas([]); setSpecs([]); setCredits(null); return; }
    // רק אחרי שההרשאה אושרה. בלי זה משתמש רגיל שנוחת כאן שולח ארבע קריאות
    // מוגנות שכולן נדחות — שורת 400 באדום בקונסולה על מסך שכל כולו "אין הרשאה".
    if (isAdmin !== true) return;
    loadSystems(); loadIdeas(); loadSpecs();
  }, [session, isAdmin]);
  useEffect(() => {
    if (!sb) return;
    if (!session) { setIsAdmin(null); return; }
    sb.rpc("more30_is_admin").then(({ data }) => setIsAdmin(data === true));
  }, [session]);
  useEffect(() => { if (view === "users" && session) loadUsers(); }, [view, session]);
  useEffect(() => { if (view === "ideas" && session) loadIdeas(); }, [view, session]);
  useEffect(() => { if (view === "specs" && session) loadSpecs(); }, [view, session]);
  useEffect(() => { if (view === "keys" && session && !credits) loadCredits(); }, [view, session]);

  /**
   * הניהול מוגש מ-more30.com/nihul. בלי emailRedirectTo קישור ההתחברות חוזר
   * ל-Site URL של פרויקט Supabase (‎*.vercel.app‎ — שנטפרי חוסמת), ואז הסשן
   * נוצר בכתובת אחרת ולא כאן; מכאן ה-401 בלחיצה על "שלח לניתוח AI".
   * החזרה לכתובת הנוכחית מייצרת את הסשן במקום שבו הוא באמת נדרש.
   */
  async function signInWithLink() {
    if (!sb || !email) return;
    const back = typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : undefined;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back } });
    setMsg(error ? "שגיאה: " + error.message : `נשלח קישור התחברות ל-${email}. פתחו אותו באותו דפדפן.`);
  }

  /** כניסה עם סיסמה — זו הכניסה הרגילה. הקישור במייל נשאר כגיבוי. */
  async function signInWithPassword() {
    if (!sb || !email || !password) return;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(
        error.message.toLowerCase().includes("invalid")
          ? "המייל או הסיסמה אינם נכונים. אם עוד לא הוגדרה סיסמה — היכנסו בקישור למייל, ומשם אפשר לקבוע אחת."
          : "שגיאה: " + error.message,
      );
      return;
    }
    setPassword("");
    setMsg(null);
  }

  /**
   * קביעת סיסמה למשתמש המחובר. כך נוצרת "כניסה אחת עם סיסמה" בלי שאף אחד
   * — כולל מי שבנה את המסך — יידע מה היא. הסיסמה לעולם לא נשמרת בקוד ולא במסד.
   */
  async function setOwnPassword() {
    if (!sb || newPassword.length < 8) { setMsg("סיסמה חייבת להיות באורך 8 תווים לפחות."); return; }
    const { error } = await sb.auth.updateUser({ password: newPassword });
    setMsg(error ? "שגיאה: " + error.message : "הסיסמה נקבעה. מכאן אפשר להיכנס עם מייל וסיסמה.");
    setNewPassword("");
  }

  async function signOut() { if (sb) { await sb.auth.signOut(); setSession(null); } }
  async function addTask(num: string) { const t = (draft[num] ?? "").trim(); if (!sb || !t) return;
    const { error } = await sb.rpc("more30_add_task", { p_num: num, p_title: t, p_author: "user" });
    if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; } setDraft({ ...draft, [num]: "" }); loadSystems(); }
  async function toggleTask(t: Task) { if (!sb) return; const next = t.status === "done" ? "todo" : "done";
    const { error } = await sb.rpc("more30_set_task_status", { p_id: t.id, p_status: next }); if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; } loadSystems(); }
  async function toggleDelete(num: string, flag: boolean) { if (!sb) return;
    const { error } = await sb.rpc("more30_set_delete", { p_num: num, p_flag: flag }); if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; } loadSystems(); }
  /** הצגה/הסתרה באתר הציבורי. שינוי הפיך לחלוטין — רק דגל, שום מחיקה. */
  async function toggleVisible(num: string, flag: boolean) { if (!sb) return;
    const { error } = await sb.rpc("more30_set_public_visible", { p_num: num, p_flag: flag });
    if (error) { setMsg("צריך התחברות אדמין. " + error.message); return; } loadSystems(); }
  async function setIdeaStatus(id: string, s: string) { if (!sb) return;
    const { error } = await sb.rpc("more30_intake_set_status", { p_id: id, p_status: s }); if (error) { setMsg(error.message); return; } loadIdeas(); }
  async function convertIdea(id: string) { if (!sb) return; const c = conv[id] ?? { slug: "", dept: "misc", cat: "other" };
    if (!c.slug.trim()) { setMsg("צריך slug לפרויקט החדש."); return; }
    const { data, error } = await sb.rpc("more30_intake_to_project", { p_id: id, p_slug: c.slug.trim(), p_department: c.dept, p_category: c.cat });
    if (error) { setMsg("המרה נכשלה (צריך אדמין): " + error.message); return; }
    setMsg("נוצר פרויקט חדש #" + data); loadIdeas(); loadSystems(); }

  const isAuthed = !!session;
  const deniedEmail = (session as { user?: { email?: string } } | null)?.user?.email ?? "";
  /**
   * בכוונה בלי נפילה למרשם שב-config: הניהול הוא המקום שבו חייבים לראות את
   * המצב האמיתי. רשימה מקובעת שנשלפת כשהקריאה נכשלת נראית בדיוק כמו אמת,
   * ומסתירה בדיוק את התקלה שבגללה נכנסו לכאן.
   */
  const merged: Overview[] = rows;
  const filtered = merged.filter((r) => (!fDept || r.department === fDept) && (!fStage || r.stage === fStage) && (!fLive || r.live) &&
    (!fClass || (r.audit_class ?? "") === fClass) &&
    (!q || (r.name + r.number + (r.note ?? "")).toLowerCase().includes(q.toLowerCase())));
  const classCount = (c: string) => merged.filter((r) => r.audit_class === c).length;
  const shownCount = merged.filter((r) => r.public_visible !== false).length;
  const byDept: Record<string, Overview[]> = {}; for (const r of filtered) (byDept[r.department] ??= []).push(r);
  // סדר התחומים נגזר מהשורות עצמן, כדי שתחום חדש במסד יופיע בלי שינוי קוד.
  const deptOrder = [...new Set(merged.map((r) => r.department))];
  const withAdmin = merged.filter((r) => accessOf(r) !== "none" && !r.is_protected);
  const sameLogin = withAdmin.filter((r) => accessOf(r) === "hub").length;
  const alarming = withAdmin.filter((r) => ["open", "broken"].includes(accessOf(r)));

  if (!authReady) {
    return (
      <main style={{ ...shell, display: "grid", placeItems: "center" }}>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>בודקים התחברות…</div>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main style={{ ...shell, display: "grid", placeItems: "center" }}>
        <div style={{ ...card, width: "min(420px, 92vw)" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>more30 · ניהול</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginTop: 8 }}>
            כניסה אחת לניהול כל המערכות: המצב האמיתי של כל אחת, לוח הביקורת,
            המפתחות החסרים, הקרדיטים אצל הספקים, והרעיונות והאפיונים שנכנסו.
          </p>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            <input placeholder="מייל" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" style={{ ...inp, padding: "8px 12px" }} />
            <PwField id="admin-pass" placeholder="סיסמה" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
              onKeyDown={(e) => { if (e.key === "Enter") signInWithPassword(); }}
              style={{ ...inp, padding: "8px 12px" }} />
            <button onClick={signInWithPassword} style={{ ...btn, background: "var(--accent)", color: "#fff", borderColor: "var(--accent)", padding: "8px 12px", fontWeight: 700 }}>
              כניסה
            </button>
            <button onClick={signInWithLink} style={{ ...btn, padding: "8px 12px" }}>
              אין לי סיסמה — שלחו קישור למייל
            </button>
            {/* הכניסה המשותפת של הפלטפורמה — אותה אחת של כל 33 המערכות,
                כולל Google. מי שנכנס שם כבר נכנס גם לכאן. */}
            <a href="https://more30.com/login?from=https%3A%2F%2Fmore30.com%2Fadmin"
               style={{ ...btn, padding: "8px 12px", textAlign: "center", textDecoration: "none", color: "var(--fg)" }}>
              כניסה דרך החשבון של more30 (כולל Google)
            </a>
          </div>
          {msg && <div style={{ background: "var(--t-yellow)", border: "1px solid var(--t-yellow-b)", padding: "8px 12px", borderRadius: 8, marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>{msg}</div>}
        </div>
      </main>
    );
  }

  // מחובר, אבל לא מנהל. אומרים את זה במפורש עם החשבון שבו הוא מחובר —
  // אחרת המסך נראה כאילו נכשל, והמשתמש מנסה להתחבר שוב עם אותו חשבון.
  if (isAdmin === false) {
    return (
      <main style={{ ...shell, display: "grid", placeItems: "center" }}>
        <div style={{ ...card, width: "min(460px, 92vw)" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>אין הרשאת ניהול</h1>
          <p style={{ fontSize: 14, color: "var(--fg-3)", lineHeight: 1.7, marginTop: 10 }}>
            אתה מחובר כ־<b style={{ direction: "ltr", display: "inline-block" }}>{deniedEmail}</b>,
            וזה חשבון משתמש רגיל. מרכז השליטה פתוח לסופר-אדמין של הפלטפורמה בלבד.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <a href="https://more30.com/me" style={{ ...linkBtn, padding: "8px 14px" }}>האזור האישי שלי</a>
            <a href="https://more30.com/" style={{ ...linkBtn, padding: "8px 14px" }}>כל המערכות</a>
            <button onClick={signOut} style={{ ...btn, padding: "8px 14px" }}>יציאה והתחברות בחשבון אחר</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ ...shell, padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>more30 · לוח שליטה</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => setView("systems")} style={{ ...tab, ...(view === "systems" ? tabOn : {}) }}>מערכות ({merged.length})</button>
            <button onClick={() => setView("access")} style={{ ...tab, ...(view === "access" ? tabOn : {}) }}>כניסות לאדמין{withAdmin.length ? ` (${withAdmin.length})` : ""}</button>
            <button onClick={() => setView("users")} style={{ ...tab, ...(view === "users" ? tabOn : {}) }}>משתמשים{users.length ? ` (${users.length})` : ""}</button>
            <button onClick={() => setView("keys")} style={{ ...tab, ...(view === "keys" ? tabOn : {}) }}>מפתחות וקרדיטים{tokens.length ? ` (${tokens.length})` : ""}</button>
            <button onClick={() => setView("ideas")} style={{ ...tab, ...(view === "ideas" ? tabOn : {}) }}>רעיונות נכנסים{ideas.length ? ` (${ideas.length})` : ""}</button>
            <button onClick={() => setView("specs")} style={{ ...tab, ...(view === "specs" ? tabOn : {}) }}>אפיונים מהשאלון{specs.length ? ` (${specs.length})` : ""}</button>
          </div>
        </div>
        <div style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>מחובר</span>
          <details>
            <summary style={{ cursor: "pointer", color: "var(--accent-fg)" }}>שינוי סיסמה</summary>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <PwField id="admin-new-pass" placeholder="סיסמה חדשה (8+)" value={newPassword}
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)} style={inp} />
              <button onClick={setOwnPassword} style={btn}>קבע</button>
            </div>
          </details>
          <button onClick={signOut} style={btn}>התנתק</button>
        </div>
      </header>
      {msg && <div style={{ background: "var(--t-yellow)", border: "1px solid var(--t-yellow-b)", padding: "8px 12px", borderRadius: 8, margin: "10px 0", fontSize: 13 }}>{msg}</div>}

      {/* המסכים שאינם חלק מהאפליקציה הזו — ראה CONSOLE_SCREENS. בלי השורה הזו
          הם קיימים בכתובת ואין מהיכן ללחוץ עליהם. */}
      <nav aria-label="מסכי מרכז השליטה"
        style={{ ...card, marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <b style={{ fontSize: 13, color: "var(--fg-3)" }}>מרכז השליטה:</b>
        {CONSOLE_SCREENS.map((s) => (
          <a key={s.href} href={s.href} title={s.hint}
            style={{ ...linkBtn, padding: "5px 12px", fontSize: 12.5, fontWeight: 600 }}>
            {s.label}
          </a>
        ))}
      </nav>

      {view === "systems" ? (
        <>
          {/* ביקורת 29/07 — התמונה בשורה אחת. הניהול תמיד מציג את כל המערכות. */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", marginTop: 12 }}>
            <b style={{ fontSize: 13 }}>ביקורת 29/07:</b>
            {(["A", "B", "C"] as const).map((c) => (
              <button key={c} onClick={() => setFClass(fClass === c ? "" : c)}
                style={{ ...pillBtn, background: fClass === c ? CLASS_COLOR[c] : CLASS_COLOR[c] + "1a", color: fClass === c ? "#fff" : CLASS_COLOR[c], fontWeight: 700 }}>
                {c} · {CLASS_HE[c]} ({classCount(c)})
              </button>
            ))}
            <span style={{ fontSize: 12, color: "var(--muted)" }}>מוצגות באתר: {shownCount} מתוך {merged.length}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 16px" }}>
            <select value={fDept} onChange={(e) => setFDept(e.target.value)} style={inp}><option value="">כל המחלקות</option>{deptOrder.map((d) => <option key={d} value={d}>{deptLabel(d)}</option>)}</select>
            <select value={fStage} onChange={(e) => setFStage(e.target.value)} style={inp}><option value="">כל השלבים</option>{["live", "beta", "wip", "idea", "protected"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <label style={{ fontSize: 13, alignSelf: "center" }}><input type="checkbox" checked={fLive} onChange={(e) => setFLive(e.target.checked)} /> חי בלבד</label>
            <input placeholder="חיפוש…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inp, flex: 1, minWidth: 160 }} />
          </div>
          {deptOrder.map((dep) => ({ dep, list: byDept[dep] ?? [] })).filter((g) => g.list.length).map(({ dep, list }) => (
            <section key={dep} style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, borderBottom: "2px solid var(--border)", paddingBottom: 6 }}>{deptLabel(dep)} <span style={{ color: "var(--muted-2)", fontSize: 14 }}>({list.length})</span></h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {list.sort((a, b) => a.number.localeCompare(b.number)).map((r) => {
                  const myTasks = tasks.filter((t) => t.project_num === r.number);
                  const myTokens = tokens.filter((t) => t.project_num === r.number);
                  const myBugs = bugs.filter((b) => b.project_num === r.number && b.status !== "closed");
                  return (
                    <div key={r.number} style={{ ...card, opacity: r.is_protected ? 0.7 : 1, borderColor: r.to_delete ? "var(--t-red-b)" : "var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <b>{r.number} · {r.name_he || r.name}{r.is_protected ? " 🔒" : ""}</b><span style={{ fontSize: 11, color: "var(--muted-2)" }}>{r.category}</span>
                      </div>
                      {r.path && <div style={{ fontSize: 12, marginTop: 2, direction: "ltr", textAlign: "right" }}>
                        {routedOnDomain(r)
                          ? <a href={`https://more30.com/${r.path}`} target="_blank" rel="noreferrer" style={{ color: "var(--on-green)", fontWeight: 700 }}>● more30.com/{r.path} ↗</a>
                          : <span style={{ color: "var(--muted-2)" }}>◦ more30.com/{r.path} · בהכנה</span>}
                      </div>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                        {r.audit_class && <Badge on label={`${r.audit_class} · ${CLASS_HE[r.audit_class] ?? ""}`} color={CLASS_COLOR[r.audit_class] ?? "#334155"} />}
                        {r.audit_class && <Badge on label={r.public_visible === false ? "מוסתרת מהאתר" : "מוצגת באתר"} color={r.public_visible === false ? "#64748b" : "#0ea5e9"} />}
                        {r.replaced_by && <Badge on label={`הוחלפה ע״י ${r.replaced_by}`} color="#d97706" />}
                        {r.audit_class && <Badge on={!!r.audit_real_data} label={r.audit_real_data ? "נתוני אמת ✓" : "בלי נתוני אמת"} color={r.audit_real_data ? "#16a34a" : "#dc2626"} />}
                        <Badge on={r.live} label={r.live ? "חי" : "לא חי"} color={r.live ? "#16a34a" : "#94a3b8"} />
                        <Badge on label={r.stage} color="#6366f1" />
                        <Badge on={r.is_deployed} label={r.is_deployed ? "פרוס" : "לא פרוס"} color={r.is_deployed ? "#0891b2" : "#94a3b8"} />
                        {r.deploy_target && r.deploy_target !== "unknown" && <Badge on label={r.deploy_target} color="#334155" />}
                        {r.missing_tokens > 0 && <Badge on label={`${r.missing_tokens} טוקנים`} color="#dc2626" />}
                        {myBugs.length > 0 && <Badge on label={`${myBugs.length} באגים`} color="#ea580c" />}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-3)" }}>DB: {r.supabase_project ? `${r.supabase_project.slice(0, 8)}… / ${r.supabase_schema ?? "?"}` : "—"}</div>
                      {r.note && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{r.note}</div>}
                      {r.audit_status && <div style={{ fontSize: 12, color: "var(--fg)", marginTop: 6, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px" }}>
                        <b>מצב אמת:</b> {r.audit_status}
                      </div>}
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ fontSize: 12, cursor: "pointer", fontWeight: 700, color: "var(--accent-fg)" }}>דו״ח מערכת 📋</summary>
                        <div style={{ fontSize: 12, color: "var(--fg-2)", display: "grid", gap: 5, marginTop: 6, lineHeight: 1.5 }}>
                          {r.audit_evidence && <div style={{ background: "var(--surface-2)", padding: "5px 8px", borderRadius: 6 }}><b>🔎 מה נמדד:</b> {r.audit_evidence}</div>}
                          {r.audit_gaps && <div style={{ background: "var(--t-amber)", padding: "5px 8px", borderRadius: 6 }}><b>💳 חסר למנוי בתשלום:</b> {r.audit_gaps}</div>}
                          {r.audit_revenue && <div style={{ background: "var(--t-green)", padding: "5px 8px", borderRadius: 6 }}><b>💰 הכי קרוב לכסף:</b> {r.audit_revenue}</div>}
                          {r.what_it_does && <div><b>מה עושה:</b> {r.what_it_does}</div>}
                          {r.functions && <div><b>פונקציות:</b> {r.functions}</div>}
                          {r.fixed_notes && <div style={{ background: "var(--t-green)", padding: "5px 8px", borderRadius: 6 }}><b>🔧 מה תוקן:</b> {r.fixed_notes}</div>}
                          {r.changed_notes && <div style={{ background: "var(--t-blue)", padding: "5px 8px", borderRadius: 6 }}><b>🔄 מה השתנה:</b> {r.changed_notes}</div>}
                        </div>
                      </details>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {r.live_url && <a href={r.live_url} target="_blank" rel="noreferrer" style={linkBtn}>אתר חי ↗</a>}
                        {(() => {
                          const kind = accessOf(r);
                          if (kind === "none") return null;
                          const href = adminHref(r);
                          return href
                            ? <a href={href} target="_blank" rel="noreferrer" style={linkBtn}>כניסת אדמין ↗</a>
                            : <span style={{ ...linkBtn, opacity: 0.7 }}>אדמין: {r.admin_url}</span>;
                        })()}
                        {accessOf(r) !== "none" && <Badge on label={ACCESS_HE[accessOf(r)]} color={ACCESS_COLOR[accessOf(r)]} />}
                      </div>
                      {myBugs.length > 0 && <details style={{ marginTop: 8 }}><summary style={{ fontSize: 12, color: "var(--on-amber)", cursor: "pointer" }}>באגים ({myBugs.length})</summary>
                        <ul style={{ fontSize: 12, margin: "4px 0", paddingInlineStart: 18 }}>{myBugs.map((b) => <li key={b.id}>{b.title} <em style={{ color: "var(--muted-2)" }}>({b.severity})</em></li>)}</ul></details>}
                      {myTokens.length > 0 && <details style={{ marginTop: 8 }}><summary style={{ fontSize: 12, color: "var(--on-red)", cursor: "pointer" }}>מפתחות חסרים ({myTokens.length})</summary>
                        <ul style={{ fontSize: 12, margin: "4px 0", paddingInlineStart: 18 }}>{myTokens.map((t) => <li key={t.id}><code>{t.env_var}</code>{t.obtain_url ? <> · <a href={t.obtain_url} target="_blank" rel="noreferrer">השג</a></> : null}</li>)}</ul></details>}
                      <details style={{ marginTop: 8 }} open={myTasks.length > 0}>
                        <summary style={{ fontSize: 12, cursor: "pointer" }}>משימות ({myTasks.filter((t) => t.status !== "done").length})</summary>
                        <ul style={{ listStyle: "none", padding: 0, margin: "6px 0" }}>{myTasks.map((t) => (
                          <li key={t.id} style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                            <input type="checkbox" checked={t.status === "done"} onChange={() => toggleTask(t)} />
                            <span style={{ textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title} <em style={{ color: "var(--muted-2)" }}>({t.author})</em></span>
                          </li>))}</ul>
                        {!r.is_protected && <div style={{ display: "flex", gap: 4 }}>
                          <input placeholder="משימה חדשה…" value={draft[r.number] ?? ""} onChange={(e) => setDraft({ ...draft, [r.number]: e.target.value })} style={{ ...inp, flex: 1, fontSize: 12 }} />
                          <button onClick={() => addTask(r.number)} style={btn}>＋</button></div>}
                      </details>
                      {!r.is_protected && <label style={{ fontSize: 12, color: "var(--on-blue)", display: "block", marginTop: 8 }}>
                        <input type="checkbox" checked={r.public_visible !== false} onChange={(e) => toggleVisible(r.number, e.target.checked)} /> מוצגת באתר הציבורי</label>}
                      {!r.is_protected && <label style={{ fontSize: 12, color: "var(--on-red)", display: "block", marginTop: 4 }}>
                        <input type="checkbox" checked={r.to_delete} onChange={(e) => toggleDelete(r.number, e.target.checked)} /> סמן למחיקה</label>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      ) : view === "access" ? (
        <section>
          {/* "אותם פרטי כניסה לכל המערכות" נכון בדיוק למערכות שיושבות על ה-hub.
              המסך אומר את זה במספר, ולא מבטיח SSO רוחבי שלא קיים. */}
          <div style={{ ...card, marginTop: 12, lineHeight: 1.7, fontSize: 13 }}>
            <b style={{ fontSize: 15 }}>
              הכניסה הזו פותחת {sameLogin} מתוך {withAdmin.length} מסכי האדמין שקיימים.
            </b>
            <div style={{ color: "var(--fg-3)", marginTop: 6 }}>
              אותו מייל ואותה סיסמה נכנסים לכל מערכת שיושבת על פרויקט ה-Supabase
              של הניהול (<code style={code}>{HUB_PROJECT || "—"}</code>). מערכת על
              פרויקט אחר מחזיקה מאגר משתמשים נפרד, ואיחוד שלה דורש את מפתח
              ה-service של אותו פרויקט — מפתחות שאינם בחשבון הזה. כל שורה כאן
              נמדדה בדפדפן אמיתי, לא לפי קוד תגובה.
            </div>
          </div>

          {alarming.length > 0 && (
            <div style={{ ...card, marginTop: 10, borderColor: "var(--t-red-b)", background: "var(--t-red)", fontSize: 13, lineHeight: 1.7 }}>
              <b style={{ color: "var(--on-red)" }}>דורש את תשומת ליבך ({alarming.length}):</b>
              <ul style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>
                {alarming.map((r) => (
                  <li key={r.number}>
                    <b>{r.number} · {r.name_he || r.name}</b> — {ACCESS_WHY[accessOf(r)]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {/* כל המערכות, לא רק אלה שיש להן מסך אדמין משלהן. מערכת בלי מסך
                כזו מנוהלת מכאן — וזו תשובה, לא חור ברשימה. */}
            {merged.filter((r) => !r.is_protected)
              .sort((a, b) => (accessOf(a) === "none" ? 1 : 0) - (accessOf(b) === "none" ? 1 : 0)
                              || a.number.localeCompare(b.number)).map((r) => {
              const kind = accessOf(r);
              const href = adminHref(r);
              return (
                <div key={r.number} style={{ ...card, padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ minWidth: 190 }}>{r.number} · {r.name_he || r.name}</b>
                    <Badge on label={ACCESS_HE[kind]} color={ACCESS_COLOR[kind]} />
                    <span style={{ fontSize: 12, color: "var(--muted)", direction: "ltr" }}>
                      {r.supabase_project ? r.supabase_project.slice(0, 10) + "…" : "— ללא מסד"}
                    </span>
                    <span style={{ flex: 1 }} />
                    {routedOnDomain(r) && <a href={`https://more30.com/${r.path}`} target="_blank" rel="noreferrer" style={linkBtn}>המערכת ↗</a>}
                    {href
                      ? <a href={href} target="_blank" rel="noreferrer" style={{ ...linkBtn, borderColor: "var(--accent)", color: "var(--accent-fg)", fontWeight: 700 }}>ניהול ↗</a>
                      : r.admin_url
                        ? <span style={{ ...linkBtn, opacity: 0.75 }}>{r.admin_url}</span>
                        : <span style={{ ...linkBtn, opacity: 0.75 }}>מנוהלת מכאן</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{ACCESS_WHY[kind]}</div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 12 }}>
            מתוכן {merged.filter((r) => accessOf(r) === "none" && !r.is_protected).length} אינן
            מציגות מסך אדמין משלהן — הנתיב שלהן נופל לאפליקציה עצמה, והניהול שלהן
            נעשה מהמסך הזה. {merged.filter((r) => r.is_protected).length} מערכות מוגנות
            אינן מוצגות כאן במכוון.
          </div>
        </section>
      ) : view === "users" ? (
        <section>
          <div style={{ ...card, marginTop: 12, lineHeight: 1.7, fontSize: 13 }}>
            <b style={{ fontSize: 15 }}>
              {users.length} משתמשים במאגר המשותף · {users.filter((u) => u.apps.length > 0).length} מחוברים לאתר אחד לפחות
            </b>
            <div style={{ color: "var(--fg-3)", marginTop: 6 }}>
              הכניסה משותפת לכל המערכות (origin אחד), אבל <b>החברות היא לאתר</b>:
              מי שנרשם ב-<code style={code}>/chizukim</code> מופיע כמשתמש של chizukim
              בלבד. סינון לפי אתר מראה בדיוק את רשימת המשתמשים של אותה מערכת.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 14px", alignItems: "center" }}>
            <select value={userApp} onChange={(e) => setUserApp(e.target.value)} style={inp}>
              <option value="">כל האתרים</option>
              {[...new Set(users.flatMap((u) => u.apps.map((a) => a.app_key)))].sort().map((k) => (
                <option key={k} value={k}>{merged.find((r) => r.path === k)?.name_he ?? k}</option>
              ))}
            </select>
            <button onClick={loadUsers} style={btn}>רענון</button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              נקרא חי מ-<code style={code}>auth.users</code> + <code style={code}>core.app_memberships</code> +
              {" "}<code style={code}>core.subscriptions</code>.
            </span>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {users
              .filter((u) => !userApp || u.apps.some((a) => a.app_key === userApp))
              .map((u) => (
                <div key={u.user_id} style={{ ...card, padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ minWidth: 190 }}>{u.full_name || "— ללא שם מלא"}</b>
                    {/*
                      "יש שם" ו"יש פרופיל" אינם אותו דבר: 37 מ-91 המשתמשים אינם
                      מחזיקים שורה ב-more30_profiles, ו-14 מהם בכל זאת נושאים שם
                      אמיתי שההרשמה שלחה ב-signUp. הסימון אומר מאיפה השם הגיע.
                    */}
                    {u.name_source === "signup" && (
                      <span style={{ fontSize: 11, color: "var(--muted-2)" }}>מההרשמה</span>
                    )}
                    <span style={{ ...code, fontSize: 12 }}>{u.email}</span>
                    {u.phone && <span style={{ ...code, fontSize: 12 }}>{u.phone}</span>}
                    {u.is_super_admin && <Badge on label="סופר-אדמין" color="#16a34a" />}
                    {u.plan !== "free" && (
                      <Badge on label={PLAN_HE[u.plan] ?? u.plan} color="#c9a227" />
                    )}
                    {/*
                      בקשה רשומה אינה תשלום: כל שורות המנוי הן status='requested'
                      ו-core.billing_settings.mode='off'. באדג' זהב על בקשה היה
                      הופך את המסך לשקר מסוג אחר, ולכן היא נאמרת בלשונה.
                    */}
                    {u.plan === "free" && u.plan_requested && (
                      <Badge
                        on
                        label={`ביקש ${PLAN_HE[u.plan_requested] ?? u.plan_requested} · טרם נגבה`}
                        color="#6b7280"
                      />
                    )}
                    {!u.confirmed && <Badge on label="אימייל לא אושר" color="#dc2626" />}
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {u.last_sign_in_at
                        ? "כניסה אחרונה " + new Date(u.last_sign_in_at).toLocaleDateString("he-IL")
                        : "טרם נכנס"}
                      {u.provider ? ` · ${u.provider}` : ""}
                      {u.has_profile === false ? " · ללא פרופיל" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7, alignItems: "center" }}>
                    {u.apps.length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--muted-2)" }}>לא מחובר לאף אתר</span>
                    ) : (
                      u.apps.map((a) => (
                        <span key={a.app_key} style={{ ...linkBtn, display: "inline-flex", gap: 6, alignItems: "center" }}>
                          {merged.find((r) => r.path === a.app_key)?.name_he ?? a.app_key}
                          <select
                            value={a.role}
                            onChange={(e) => setUserRole(u.user_id, a.app_key, e.target.value)}
                            style={{ border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, padding: "1px 4px" }}
                          >
                            {Object.keys(ROLE_HE).map((r) => <option key={r} value={r}>{ROLE_HE[r]}</option>)}
                          </select>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            {users.length === 0 && (
              <div style={{ ...card, fontSize: 13, color: "var(--muted)" }}>אין משתמשים להצגה.</div>
            )}
          </div>
        </section>
      ) : view === "keys" ? (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>קרדיטים אצל הספקים</h2>
            <button onClick={loadCredits} style={btn}>בדוק עכשיו</button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              נמדד בשרת מול הספק עצמו. אף מפתח אינו מגיע לדפדפן.
            </span>
          </div>
          {creditsMsg && <div style={{ background: "var(--t-red-2)", border: "1px solid var(--t-red-b)", padding: "8px 12px", borderRadius: 8, margin: "10px 0", fontSize: 13 }}>{creditsMsg}</div>}
          {!credits && !creditsMsg && <div style={{ ...card, marginTop: 10, color: "var(--muted)", fontSize: 13 }}>בודקים מול הספקים…</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 10 }}>
            {(credits ?? []).map((p) => (
              <div key={p.key} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <b>{p.label}</b>
                  <Badge on label={CREDIT_STATE_HE[p.state] ?? p.state} color={CREDIT_STATE_COLOR[p.state] ?? "#334155"} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{p.usedBy}</div>
                {/* מד היתרה רק כשיש תקרה אמיתית. עמודה ריקה ליד ספק שאינו
                    מפרסם יתרה נקראת כמו "אפס נשאר" — בדיוק ההפך מהאמת. */}
                {p.usage && p.usage.limit > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, p.usage.percent))}%`, height: "100%", background: p.usage.percent >= 80 ? "#dc2626" : "#16a34a" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4 }}>
                      נותרו {nfHe(p.usage.limit - p.usage.used)} {p.usage.unit} · {nfHe(p.usage.used)} מתוך {nfHe(p.usage.limit)}
                    </div>
                    {p.usage.cycleEnds && <div style={{ fontSize: 11, color: "var(--muted-2)" }}>מתאפס ב-{new Date(p.usage.cycleEnds).toLocaleDateString("he-IL")}</div>}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 8, lineHeight: 1.5 }}>{p.detail}</div>
                <a href={p.topUp} target="_blank" rel="noreferrer" style={{ ...linkBtn, marginTop: 8, alignSelf: "start" }}>
                  {p.topUpLabel ? `${p.topUpLabel} ↗` : (p.state === "missing" ? "פתיחת חשבון והוספת מפתח ↗" : "הוספת קרדיט אצל הספק ↗")}
                </a>
              </div>
            ))}
          </div>
          {credits && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.7 }}>
              <b>לא נפרס</b> — המפתח קיים ב-<code style={code}>core.secrets</code> אבל אינו משתנה
              סביבה בפריסה הזאת: תיקון של העתקת ערך קיים, לא של פתיחת חשבון.
              <b> לא נמדד</b> — לספק אין ממשק שמחזיר יתרה, או שלא ענה בזמן; לא מוצג מספר
              שאין מאחוריו מדידה. מד יתרה קיים רק אצל Apify, Recraft ו-ElevenLabs.
              {" "}<a href="https://more30.com/admin/credits" target="_blank" rel="noreferrer">המסך המלא ↗</a>
            </div>
          )}

          <h2 style={{ fontSize: 18, margin: "24px 0 4px" }}>מפתחות חסרים למערכות ({tokens.filter((t) => t.status === "missing").length})</h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            אלה שמות המשתנים בלבד — הערכים לעולם לא נשמרים כאן.
          </div>
          {(() => {
            const missing = tokens.filter((t) => t.status === "missing");
            const nums = [...new Set(missing.map((t) => t.project_num))].sort();
            if (!nums.length) return <div style={{ ...card, color: "var(--muted)", fontSize: 13 }}>אין מפתחות מסומנים כחסרים.</div>;
            return nums.map((num) => {
              const sys = merged.find((r) => r.number === num);
              return (
                <div key={num} style={{ ...card, marginBottom: 10 }}>
                  <b>{num} · {sys?.name_he || sys?.name || "—"}</b>
                  <ul style={{ fontSize: 13, margin: "6px 0 0", paddingInlineStart: 18, display: "grid", gap: 4 }}>
                    {missing.filter((t) => t.project_num === num).map((t) => (
                      <li key={t.id}>
                        <code style={code}>{t.env_var}</code>
                        {t.purpose ? <span style={{ color: "var(--fg-3)" }}> — {t.purpose}</span> : null}
                        {t.paste_location ? <span style={{ color: "var(--muted-2)" }}> · להזין ב-{t.paste_location}</span> : null}
                        {t.obtain_url ? <> · <a href={t.obtain_url} target="_blank" rel="noreferrer">להשגה ↗</a></> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            });
          })()}
        </section>
      ) : view === "ideas" ? (
        <section>
          {!isAuthed && <div style={{ ...card, textAlign: "center" }}>🔒 רעיונות נכנסים מכילים מידע אישי — יש להתחבר כאדמין כדי לצפות.</div>}
          {ideas.map((i) => {
            const c = conv[i.id] ?? { slug: "", dept: "misc", cat: "other" };
            return (
              <div key={i.id} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <b>{i.project_name || "(ללא שם פרויקט)"} — {i.full_name}</b>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {IDEA_STATUS.map((s) => <button key={s} onClick={() => setIdeaStatus(i.id, s)}
                      style={{ ...pillBtn, background: i.status === s ? "var(--accent)" : "var(--surface-2)", color: i.status === s ? "#fff" : "var(--fg-2)" }}>{IDEA_STATUS_HE[s]}</button>)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{new Date(i.created_at).toLocaleDateString("he-IL")} · {i.phone} · {i.email} · {i.city}</div>
                <div style={{ fontSize: 13, marginTop: 8, display: "grid", gap: 4 }}>
                  {i.short_description && <div><b>תיאור:</b> {i.short_description}</div>}
                  {i.problem && <div><b>בעיה:</b> {i.problem}</div>}
                  {i.solution && <div><b>פתרון:</b> {i.solution}</div>}
                  {i.target_customer && <div><b>קהל:</b> {i.target_customer}</div>}
                  {i.revenue_model && <div><b>מודל הכנסה:</b> {i.revenue_model}</div>}
                  {i.differentiation && <div><b>בידול:</b> {i.differentiation}</div>}
                  {i.funding_needed && <div><b>גיוס דרוש:</b> {i.funding_needed} · <b>לו״ז:</b> {i.launch_timeline}</div>}
                  {i.services_wanted?.length ? <div><b>שירותים:</b> {i.services_wanted.join(", ")}</div> : null}
                  {i.dream_free_text && <div><b>החלום:</b> {i.dream_free_text}</div>}
                </div>
                {i.converted_project_num
                  ? <div style={{ marginTop: 8, color: "var(--on-green)", fontSize: 13 }}>✅ הומר לפרויקט #{i.converted_project_num}</div>
                  : <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input placeholder="slug לפרויקט" value={c.slug} onChange={(e) => setConv({ ...conv, [i.id]: { ...c, slug: e.target.value } })} style={{ ...inp, fontSize: 12 }} />
                      <select value={c.dept} onChange={(e) => setConv({ ...conv, [i.id]: { ...c, dept: e.target.value } })} style={{ ...inp, fontSize: 12 }}>{DEPT_KEYS.map((d) => <option key={d} value={d}>{DEPARTMENTS[d]}</option>)}</select>
                      <button onClick={() => convertIdea(i.id)} style={{ ...btn, background: "var(--accent)", color: "#fff", border: "none" }}>הפוך לפרויקט →</button>
                    </div>}
              </div>
            );
          })}
          {isAuthed && ideas.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--muted)" }}>אין רעיונות נכנסים עדיין.</div>}
        </section>
      ) : (
        <section>
          {!isAuthed && <div style={{ ...card, textAlign: "center" }}>🔒 אפיונים מכילים מידע אישי — יש להתחבר כאדמין כדי לצפות.</div>}
          {specs.map((sp) => {
            const busy = !!aiBusy[sp.id] || sp.ai_status === "running";
            return (
              <div key={sp.id} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <b>{sp.project_name || "(ללא שם פרויקט)"} — {sp.full_name}</b>
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {SPEC_STATUS.map((s) => <button key={s} onClick={() => setSpecStatus(sp.id, s)}
                      style={{ ...pillBtn, background: sp.status === s ? "var(--accent)" : "var(--surface-2)", color: sp.status === s ? "#fff" : "var(--fg-2)" }}>{SPEC_STATUS_HE[s]}</button>)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {new Date(sp.created_at).toLocaleString("he-IL")}
                  {sp.track ? ` · מסלול: ${sp.track}` : ""}
                  {sp.phone ? ` · ${sp.phone}` : ""}{sp.email ? ` · ${sp.email}` : ""}{sp.city ? ` · ${sp.city}` : ""}
                </div>
                {sp.services_wanted?.length ? <div style={{ fontSize: 13, marginTop: 6 }}><b>שירותים:</b> {sp.services_wanted.join(", ")}</div> : null}

                {/* התשובות מוצגות עם נוסח השאלה שהוצג בפועל — השאלון דינמי. */}
                <details style={{ marginTop: 8 }} open>
                  <summary style={{ fontSize: 12, cursor: "pointer", fontWeight: 700, color: "var(--accent-fg)" }}>
                    התשובות ({sp.questions?.length ?? 0})
                  </summary>
                  <div style={{ fontSize: 13, marginTop: 6, display: "grid", gap: 4 }}>
                    {(sp.questions ?? []).map((q) => {
                      const v = sp.answers?.[q.key];
                      if (v === undefined || v === null || (Array.isArray(v) ? !v.length : !String(v).trim())) return null;
                      return <div key={q.key}><b>{q.label}:</b> {Array.isArray(v) ? v.join(", ") : String(v)}</div>;
                    })}
                  </div>
                </details>

                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={() => analyzeSpec(sp.id)} disabled={busy || !isAuthed}
                    style={{ ...btn, background: busy ? "var(--accent-soft)" : "var(--accent)", color: "#fff", border: "none", cursor: busy ? "wait" : "pointer", fontWeight: 700 }}>
                    {busy ? "מנתח…" : sp.ai_analysis ? "🤖 נתח מחדש" : "🤖 שלח לניתוח AI"}
                  </button>
                  <span style={{ fontSize: 12, color: sp.ai_status === "error" ? "#dc2626" : "#64748b" }}>
                    {sp.ai_status === "done" && sp.ai_completed_at ? `נותח ${new Date(sp.ai_completed_at).toLocaleString("he-IL")}${sp.ai_model ? ` · ${sp.ai_model}` : ""}` : null}
                    {sp.ai_status === "pending" ? "עוד לא נותח" : null}
                    {sp.ai_status === "running" ? "ניתוח בעיבוד…" : null}
                    {sp.ai_status === "error" ? `שגיאה: ${sp.ai_error ?? "לא ידוע"}` : null}
                  </span>
                </div>

                {sp.ai_analysis && (
                  <div style={{ marginTop: 10, background: "var(--t-violet)", border: "1px solid var(--t-violet-b)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--on-violet)", marginBottom: 6 }}>🤖 ניתוח AI</div>
                    <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--on-violet)" }}>{sp.ai_analysis}</div>
                  </div>
                )}
              </div>
            );
          })}
          {isAuthed && specs.length === 0 && <div style={{ ...card, textAlign: "center", color: "var(--muted)" }}>אין אפיונים עדיין. השאלון חי ב-more30.com (מקטע "שאלון האפיון החכם").</div>}
        </section>
      )}
    </main>
  );
}

/**
 * הגוון מגיע כ-hex מהמפות שלמעלה (CLASS_COLOR / ACCESS / STATUS) ומשורשר כאן
 * ל-"22" בשביל הרקע, ולכן הוא חייב להישאר hex ולא יכול להיות משתנה ערכה.
 * במצב כהה חלק מהגוונים האלה כהים מדי (למשל הפצחה של deploy_target, #334155)
 * ומתמזגים ברקע — color-mix מושך כל אחד מהם רבע-הדרך אל צבע הטקסט של העמוד,
 * שהוא כהה במצב בהיר ובהיר במצב כהה, ולכן הכיוון נכון בשני המצבים.
 */
function Badge({ on, label, color }: { on: boolean; label: string; color: string }) {
  return <span style={{
    ...badge,
    background: on ? color + "22" : "var(--surface-2)",
    color: on ? `color-mix(in oklab, ${color}, var(--fg) 25%)` : "var(--muted-2)",
  }}>{label}</span>;
}
const EYE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EYE_OFF = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M17.9 17.9A10.1 10.1 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9m3.8-1.9A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M9.9 9.9a3 3 0 1 0 4.2 4.2" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

/**
 * שדה סיסמה עם «הצג סיסמה» (§1א). שני שדות הסיסמה של מרכז השליטה היו בלי שום
 * דרך לראות מה הוקלד, ובשדה «סיסמה חדשה» זה הכבד מהשניים: אין שם סיסמה קודמת
 * שאפשר לנסות שוב איתה, ולכן שגיאת הקלדה נשמרת והאדמין ננעל מחוץ למרכז
 * השליטה של עצמו עד לאיפוס דרך המייל.
 *
 * type="button" מפורש: אין כאן <form> היום, אבל שדה הכניסה כבר מגיב ל-Enter,
 * וכפתור בלי type בתוך form עתידי הוא submit — כל לחיצה על «הצג» הייתה שולחת.
 * הכפתור ב-insetInlineEnd, כלומר בצד שמאל בעמוד ה-RTL הזה, כדי שלא ישב על
 * תחילת התווים; ה-paddingInlineEnd על הקלט הוא מה שמפנה לו את המקום.
 * ה-state מקומי לכל שדה, ולכן גילוי אחד אינו חושף את השני.
 */
function PwField({ id, style, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  const [shown, setShown] = useState(false);
  const label = shown ? "הסתר סיסמה" : "הצג סיסמה";
  return (
    <div style={{ position: "relative", display: "grid" }}>
      <input {...rest} id={id} type={shown ? "text" : "password"}
        style={{ ...style, paddingInlineEnd: 36 }} />
      <button type="button" onClick={() => setShown((v) => !v)}
        aria-pressed={shown} aria-controls={id} aria-label={label} title={label}
        style={{
          position: "absolute", insetInlineEnd: 4, top: "50%", transform: "translateY(-50%)",
          display: "grid", placeItems: "center", width: 28, height: 28, padding: 0,
          border: "none", background: "transparent", color: "var(--muted)",
          borderRadius: 6, cursor: "pointer",
        }}>
        {shown ? EYE_OFF : EYE}
      </button>
    </div>
  );
}

/** המסגרת של כל המסך — גם מסך ההתחברות וגם הלוח, כדי ששניהם ייראו אותו דבר. */
const shell: React.CSSProperties = {
  fontFamily: "Assistant, system-ui, sans-serif", direction: "rtl",
  background: "var(--bg)", minHeight: "100vh", padding: 20,
};
const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
const code: React.CSSProperties = { background: "var(--surface-2)", padding: "1px 6px", borderRadius: 5, direction: "ltr", display: "inline-block", fontSize: 12 };
const badge: React.CSSProperties = { fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600 };
const btn: React.CSSProperties = { border: "1px solid var(--border-2)", background: "var(--surface)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 13 };
const pillBtn: React.CSSProperties = { border: "none", borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontSize: 12 };
const linkBtn: React.CSSProperties = { border: "1px solid var(--border-2)", background: "var(--surface-2)", borderRadius: 8, padding: "4px 10px", fontSize: 12, textDecoration: "none", color: "var(--fg)" };
const inp: React.CSSProperties = { border: "1px solid var(--border-2)", borderRadius: 8, padding: "5px 10px", fontSize: 13 };
const tab: React.CSSProperties = { border: "1px solid var(--border-2)", background: "var(--surface)", borderRadius: 8, padding: "5px 14px", cursor: "pointer", fontSize: 14 };
const tabOn: React.CSSProperties = { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" };
