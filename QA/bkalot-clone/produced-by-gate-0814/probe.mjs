// מדידת v8 מעל HTTP — הזהות עוברת מהשער אל produced_by.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של v7: קובץ .ps1 בלי BOM
// נקרא כאן כ-cp1255, והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על
// טקסט קיים.
//
// הקובץ רץ פעמיים — לפני הפריסה ואחריה — על אותה פנייה בדיוק: RUN=v7-before
// יוצר את הפניות דרך נתיב הקליטה הציבורי ומדפיס את המזהים, ו-RUN=v8-after
// מקבל אותם ב-CASE_A/CASE_B ואינו יוצר דבר. שתי הריצות שולחות את אותו גוף
// לאותה כתובת; ההבדל היחיד ביניהן הוא הקוד שרץ בצד השני.
import { writeFileSync } from "node:fs";

const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

const RUN = process.env.RUN ?? "run";
const out = [];
const log = (label, value) => {
  out.push({ label, value });
  console.log("-- " + label + "\n" + JSON.stringify(value, null, 2));
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

// ── הפניות ───────────────────────────────────────────────────────────────────
let caseA = process.env.CASE_A ? Number(process.env.CASE_A) : null;
let caseB = process.env.CASE_B ? Number(process.env.CASE_B) : null;

if (!caseA) {
  const a = await post(INTAKE, {
    kind: "treatment",
    source: "form",
    full_name: "בדיקה v8 א",
    phone: "0501230083",
    email: "test@more30.com",
    note: "מדידת v8 — הזהות מהשער אל produced_by",
    consent: "true",
    situation: "single_parent",
  });
  log("intake A (treatment)", a);
  caseA = a.body?.case_id ?? a.body?.case?.id;

  const b = await post(INTAKE, {
    kind: "info",
    source: "form",
    full_name: "בדיקה v8 ב (בקרה)",
    phone: "0501230084",
    email: "test@more30.com",
    note: "בקרה — לא מפיקים עליה מסמך",
    consent: "true",
  });
  log("intake B (control)", b);
  caseB = b.body?.case_id ?? b.body?.case?.id;
} else {
  log("cases reused (no new intake)", { caseA, caseB });
}

// ── כניסה לניהול מעל HTTP ────────────────────────────────────────────────────
const login = await post(ADMIN + "/login", {
  email: "qa0083@more30.test",
  password: "Qa0083-produced!",
});
log("login (מנהל 56)", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// ── המדידה של הפעימה: לחיצה אחת על «הפק», והזהות נכתבת ───────────────────────
// ב-v7 אותה קריאה בדיוק מחזירה produced_by: null. כאן היא אמורה להחזיר 56 —
// המנהל שנכנס למעלה.
const r1 = await post(ADMIN + "/render", { case_id: String(caseA) }, auth);
log("render #1 — produced_by אמור להיות 56", {
  status: r1.status,
  document_id: r1.body?.document_id,
  produced_by: r1.body?.produced_by,
  queued: r1.body?.queued,
  admin_echo: r1.body?.admin?.id,
});

// ── הבקרה שקונה את הכרעה (1) של 0083 ─────────────────────────────────────────
// הגוף נושא produced_by, admin_id ו-p_admin_id — שלושת השמות שמישהו היה מנסה.
// הגוף מועבר ל-p כפי שהוא ובלי סינון מפתחות, ולכן זו בדיוק הדרך שבה מחזיק
// טוקן היה חותם מסמך בשם מנהל אחר. p_admin_id נבנה ב-edge מ-g.admin, ולכן
// חייב לחזור 56 ולא 1.
const r2 = await post(
  ADMIN + "/render",
  { case_id: String(caseA), produced_by: 1, admin_id: 1, p_admin_id: 1 },
  auth,
);
log("render #2 (זיוף בגוף) — חייב לחזור 56", {
  status: r2.status,
  document_id: r2.body?.document_id,
  produced_by: r2.body?.produced_by,
  same_document: r2.body?.document_id === r1.body?.document_id,
});

// ── מנהל שני, כדי שהזהות תהיה נתון ולא קבוע ──────────────────────────────────
// ובאותה מדידה — הכרעה (5) של 0083: הפקה חוזרת דורסת, ואינה משמרת את הראשון.
const login2 = await post(ADMIN + "/login", {
  email: "qa0083b@more30.test",
  password: "Qa0083b-second!",
});
log("login (מנהל 57)", { status: login2.status, ok: login2.body?.ok, admin: login2.body?.admin });
const auth2 = { "x-admin-token": login2.body?.token ?? "" };

const r3 = await post(ADMIN + "/render", { case_id: String(caseA) }, auth2);
log("render #3 (מנהל שני) — הזהות מתחלפת ל-57", {
  status: r3.status,
  document_id: r3.body?.document_id,
  produced_by: r3.body?.produced_by,
  same_document: r3.body?.document_id === r1.body?.document_id,
});

// ── השער עצמו לא זז ──────────────────────────────────────────────────────────
// v8 נוגעת בנתיב שכותב, ולכן נמדד שהשער שלפניו נשאר כפי שהיה.
const noTok = await post(ADMIN + "/render", { case_id: String(caseA) }, {});
log("render בלי x-admin-token", { status: noTok.status, error: noTok.body?.error });

// ── הבקרה: פנייה שאיש לא הפיק עליה ───────────────────────────────────────────
const cB = await post(ADMIN + "/case", { id: String(caseB) }, auth);
log("case B (בקרה)", { status: cB.body?.case?.status, documents: cB.body?.documents?.length ?? null });

log("case ids", { caseA, caseB, run: RUN });
writeFileSync(new URL(`./http-${RUN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
