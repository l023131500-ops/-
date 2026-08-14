// מדידת 0076 מעל HTTP — הנתיב החי /set-status אחרי drop+create של הפונקציה.
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255,
// והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט קיים.
import { writeFileSync } from "node:fs";

const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

const out = [];
const log = (label, value) => {
  out.push({ label, value });
  console.log("── " + label + "\n" + JSON.stringify(value, null, 2));
};

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON,
      authorization: "Bearer " + ANON,
      ...extra,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ── שתי פניות דרך נתיב הקליטה הציבורי, לא בהזרקה למסד ────────────────────────
const a = await post(INTAKE, {
  kind: "treatment",
  source: "form",
  full_name: "בדיקה 0076 א",
  phone: "0501230076",
  email: "test@more30.com",
  note: "מדידת 0076 — decided_by/decided_at",
  consent: "true",
  situation: "single_parent",
});
log("intake A (treatment)", a);

const b = await post(INTAKE, {
  kind: "info",
  source: "form",
  full_name: "בדיקה 0076 ב (בקרה)",
  phone: "0501230077",
  email: "test@more30.com",
  note: "בקרה — לא נוגעים בה",
  consent: "true",
});
log("intake B (control)", b);

const caseA = a.body?.case_id ?? a.body?.case?.id;
const caseB = b.body?.case_id ?? b.body?.case?.id;

// ── כניסה לניהול מעל HTTP ────────────────────────────────────────────────────
// הנתיב הוא מקטע האחרון של ה-URL ולא מפתח בגוף (index.ts שורה 187).
const login = await post(ADMIN + "/login", {
  email: "qa0076@more30.test",
  password: "Qa0076-decided-by!",
});
log("login", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const token = login.body?.token;

const auth = { "x-admin-token": token ?? "" };

// ── המדידה שקונה את הפעימה: הנתיב החי שרד את ה-drop+create ───────────────────
const s1 = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "closed" }, auth);
log("set-status #1 (closed)", s1);

// לחיצה כפולה — הכרעה (5): אינה אירוע ואינה מזיזה את החותמת.
const s2 = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "closed" }, auth);
log("set-status #2 (same value)", s2);

// ניסיון הזרקה: admin_id בגוף הבקשה — הכרעה (1). הגוף מועבר כפי שהוא ל-p,
// ו-p_admin_id הוא ארגומנט שני שה-edge בונה בעצמו, ולכן הערך הזה אינו יכול
// להגיע לעמודה.
const s3 = await post(
  ADMIN + "/set-status",
  { case_id: String(caseA), status: "rejected", admin_id: 1 },
  auth
);
log("set-status #3 (admin_id:1 בגוף)", s3);

// הפנייה נקראת מהמוצר עצמו ולא מהמסד
const c = await post(ADMIN + "/case", { id: String(caseA) }, auth);
log("case A after", { status: c.body?.case?.status, updated_at: c.body?.case?.updated_at });

log("case ids", { caseA, caseB });
writeFileSync(new URL("./http.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
