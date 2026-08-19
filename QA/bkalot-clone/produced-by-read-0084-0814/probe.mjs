// מדידת 0084 מעל HTTP — מסך המסמך שואל «מי הפיק», ומקבל תשובה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0083: קובץ .ps1 בלי BOM
// נקרא כאן כ-cp1255, והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על
// טקסט קיים.
//
// הקובץ רץ פעמיים — לפני החלת המיגרציה ואחריה — על אותה פנייה ואותו מסמך:
// RUN=before יוצר את הפנייה דרך נתיב הקליטה הציבורי ומדפיס את המזהים,
// RUN=after מקבל אותם ב-CASE_A/DOC_ID ואינו יוצר דבר. שתי הריצות שולחות את
// אותו גוף לאותה כתובת; ההבדל היחיד ביניהן הוא הפונקציה שרצה בצד השני.
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

// ── כניסה לניהול מעל HTTP ────────────────────────────────────────────────────
const login = await post(ADMIN + "/login", {
  email: "qa0084@more30.test",
  password: "Qa0084-produced!",
});
log("login (מנהל 58)", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// ── הפנייה והמסמך ────────────────────────────────────────────────────────────
let caseA = process.env.CASE_A ? Number(process.env.CASE_A) : null;
let docId = process.env.DOC_ID ? Number(process.env.DOC_ID) : null;

if (!caseA) {
  const a = await post(INTAKE, {
    kind: "treatment",
    source: "form",
    full_name: "בדיקה 0084",
    phone: "0501230085",
    email: "test@more30.com",
    note: "מדידת 0084 — מסך המסמך שואל מי הפיק",
    consent: "true",
    situation: "single_parent",
  });
  log("intake (treatment)", { status: a.status, case_id: a.body?.case_id, queued: a.body?.queued });
  caseA = a.body?.case_id ?? a.body?.case?.id;

  // «הפק» מהמסך — v8 מעבירה את זהות המנהל מהשער אל הארגומנט השני.
  const r = await post(ADMIN + "/render", { case_id: String(caseA) }, auth);
  log("render — produced_by נכתב בשורה", {
    status: r.status,
    document_id: r.body?.document_id,
    produced_by: r.body?.produced_by,
    queued: r.body?.queued,
  });
  docId = r.body?.document_id;
} else {
  log("case/document reused (no new intake, no new render)", { caseA, docId });
}

// ── המדידה של הפעימה: מסך המסמך ──────────────────────────────────────────────
// לפני המיגרציה שני המפתחות אינם קיימים בתשובה כלל (has_key=false) — לא null,
// אלא היעדר. אחרי: 58 והשם.
const doc = await post(ADMIN + "/document", { id: String(docId) }, auth);
const d = doc.body?.document ?? {};
log("document — «מי הפיק»", {
  status: doc.status,
  ok: doc.body?.ok,
  id: d.id,
  has_key_produced_by: Object.prototype.hasOwnProperty.call(d, "produced_by"),
  has_key_produced_by_name: Object.prototype.hasOwnProperty.call(d, "produced_by_name"),
  produced_by: d.produced_by ?? null,
  produced_by_name: d.produced_by_name ?? null,
});

// ── רגרסיה: כל מה שהמסך כבר קורא, לא זז ──────────────────────────────────────
log("document — שדות קיימים (רגרסיה)", {
  case_id: d.case_id,
  kind: d.kind,
  title: d.title,
  text_chars: d.text_chars,
  html_chars: d.html_chars,
  template_key: d.template_key,
  template_name_he: d.template_name_he,
  template_fallback: d.template_fallback,
  queue_id: d.queue_id ?? null,
  queued: d.queued,
  queue_status: d.queue_status ?? null,
  overwritten: d.overwritten,
  keys: Object.keys(d).sort(),
});

// ── השערים שלפני התשובה לא זזו ───────────────────────────────────────────────
const gate1 = await post(ADMIN + "/document", {}, auth);
const gate2 = await post(ADMIN + "/document", { id: "9".repeat(19) }, auth);
const gate3 = await post(ADMIN + "/document", { id: "999999999" }, auth);
const gate4 = await post(ADMIN + "/document", { id: String(docId) }, {});
log("שערי הקלט", {
  no_id: { status: gate1.status, error: gate1.body?.error },
  nineteen_digits: { status: gate2.status, error: gate2.body?.error },
  not_found: { status: gate3.status, error: gate3.body?.error },
  no_token: { status: gate4.status, error: gate4.body?.error },
});

log("ids", { caseA, docId, run: RUN });
writeFileSync(new URL(`./http-${RUN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
