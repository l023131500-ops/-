// מדידת v7 מעל HTTP — הזהות עוברת מהשער אל decided_by.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0076: קובץ .ps1 בלי BOM
// נקרא כ-cp1255, והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט קיים.
//
// כל פנייה נוצרת דרך נתיב הקליטה הציבורי ולא בהזרקה למסד, וכל לחיצה נעשית דרך
// הנתיב החי מאחורי שער הסשן — כלומר נמדד מה שהמנהל עושה, לא מה שהמסד יודע.
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

// ── שתי פניות דרך נתיב הקליטה הציבורי ────────────────────────────────────────
const a = await post(INTAKE, {
  kind: "treatment",
  source: "form",
  full_name: "בדיקה v7 א",
  phone: "0501230078",
  email: "test@more30.com",
  note: "מדידת v7 — הזהות מהשער אל decided_by",
  consent: "true",
  situation: "single_parent",
});
log("intake A (treatment)", a);

const b = await post(INTAKE, {
  kind: "info",
  source: "form",
  full_name: "בדיקה v7 ב (בקרה)",
  phone: "0501230079",
  email: "test@more30.com",
  note: "בקרה — לא נוגעים בה",
  consent: "true",
});
log("intake B (control)", b);

const caseA = a.body?.case_id ?? a.body?.case?.id;
const caseB = b.body?.case_id ?? b.body?.case?.id;

// ── כניסה לניהול מעל HTTP ────────────────────────────────────────────────────
const login = await post(ADMIN + "/login", {
  email: "qa0077@more30.test",
  password: "Qa0077-identity!",
});
log("login", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const token = login.body?.token;
const auth = { "x-admin-token": token ?? "" };

// ── המדידה של הפעימה: לחיצה אחת, והזהות נכתבת ────────────────────────────────
// ב-v6 אותה קריאה בדיוק החזירה decided_by: null (QA/bkalot-clone/decided-by-0814/
// http.json, «set-status #1»). כאן היא אמורה להחזיר את 26 — המנהל שנכנס למעלה.
const s1 = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "closed" }, auth);
log("set-status #1 (closed) — decided_by אמור להיות 26", s1);

// לחיצה כפולה — הכרעה (5) של 0076: אינה אירוע, ואינה מזיזה לא את החותמת ולא את
// הזהות.
const s2 = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "closed" }, auth);
log("set-status #2 (אותו ערך) — החותמת והזהות קפואות", s2);

// ── הבקרה שקונה את הכרעה (1) של 0076 ─────────────────────────────────────────
// הגוף נושא admin_id:1 — מנהל אחר. הגוף מועבר ל-p כפי שהוא ובלי סינון מפתחות,
// ולכן זו בדיוק הדרך שבה מחזיק טוקן היה חותם הכרעה בשם מישהו אחר. p_admin_id
// נבנה ב-edge מ-g.admin, ולכן חייב לחזור 26 ולא 1.
const s3 = await post(
  ADMIN + "/set-status",
  { case_id: String(caseA), status: "rejected", admin_id: 1 },
  auth
);
log("set-status #3 (admin_id:1 בגוף) — חייב לחזור 26", s3);

// ── מנהל שני, כדי שהזהות תהיה נתון ולא קבוע ──────────────────────────────────
const login2 = await post(ADMIN + "/login", {
  email: "qa0077b@more30.test",
  password: "Qa0077b-second!",
});
log("login (מנהל שני)", { status: login2.status, ok: login2.body?.ok, admin: login2.body?.admin });
const auth2 = { "x-admin-token": login2.body?.token ?? "" };

const s4 = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "closed" }, auth2);
log("set-status #4 (מנהל שני) — הזהות מתחלפת", s4);

// ── הבקרה: פנייה שאיש לא נגע בה ──────────────────────────────────────────────
const cB = await post(ADMIN + "/case", { id: String(caseB) }, auth);
log("case B (בקרה) — סטטוס", { status: cB.body?.case?.status });

log("case ids", { caseA, caseB });
writeFileSync(new URL("./http.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
