// מדידת 0085 מעל HTTP — שורת המסמך ברשימת הפנייה שואלת «מי הפיק», ומקבלת תשובה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0083 ו-0084: קובץ .ps1
// בלי BOM נקרא כאן כ-cp1255, והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא»
// על טקסט קיים.
//
// הקובץ רץ פעמיים — לפני החלת המיגרציה ואחריה — על אותה פנייה ואותם שלושה
// מסמכים: RUN=before יוצר את הפנייה דרך נתיב הקליטה הציבורי ומדפיס את המזהים,
// RUN=after מקבל אותם ב-CASE_A ואינו יוצר דבר. שתי הריצות שולחות את אותו גוף
// לאותה כתובת; ההבדל היחיד ביניהן הוא הפונקציה שרצה בצד השני.
//
// שלוש השורות אינן שלוש בדיקות של אותו דבר — הן שלושת המצבים שהעמודה יכולה
// להיות בהם, על אותה פנייה ובאותה תשובה אחת:
//   (1) הפקה דרך המסך  → זהות + שם.
//   (2) הפקה בצורת v7   → שני null (הפקה שקדמה לשער).
//   (3) מפיק שנמחק      → זהות בלי שם. זו המדידה שקונה את ה-LEFT JOIN: ב-INNER
//                          השורה הזו הייתה נעלמת מהרשימה כולה.
// מצבים (2) ו-(3) נזרעים בצד ה-SQL ולא כאן, ומזהי המסמכים מגיעים ב-DOC_V7/DOC_GONE.
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
  email: "qa0085a@more30.test",
  password: "Qa0085-produced!",
});
log("login (מנהל 63)", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// ── הפנייה והמסמך הראשון ─────────────────────────────────────────────────────
let caseA = process.env.CASE_A ? Number(process.env.CASE_A) : null;

if (!caseA) {
  const a = await post(INTAKE, {
    kind: "treatment",
    source: "form",
    full_name: "בדיקה 0085",
    phone: "0501230086",
    email: "test@more30.com",
    note: "מדידת 0085 — שורת המסמך ברשימת הפנייה שואלת מי הפיק",
    consent: "true",
    situation: "single_parent",
  });
  log("intake (treatment)", { status: a.status, case_id: a.body?.case_id, queued: a.body?.queued });
  caseA = a.body?.case_id ?? a.body?.case?.id;

  // «הפק» מהמסך — v8 מעבירה את זהות המנהל מהשער אל הארגומנט השני.
  const r = await post(ADMIN + "/render", { case_id: String(caseA) }, auth);
  log("render מהמסך — produced_by נכתב בשורה", {
    status: r.status,
    document_id: r.body?.document_id,
    produced_by: r.body?.produced_by,
    queued: r.body?.queued,
  });
} else {
  log("case reused (no new intake, no new render)", { caseA });
}

// ── המדידה של הפעימה: בלוק documents של מסך הפנייה ───────────────────────────
// לפני המיגרציה שני המפתחות אינם קיימים בשורה כלל (has_key=false) — לא null,
// אלא היעדר. אחרי: שלושת המצבים, באותה תשובה אחת.
const cs = await post(ADMIN + "/case", { id: caseA }, auth);
const docs = cs.body?.documents ?? [];
log("case — בלוק documents, «מי הפיק» בכל שורה", {
  status: cs.status,
  ok: cs.body?.ok,
  case_id: cs.body?.case?.id,
  doc_count: docs.length,
  rows: docs.map((d) => ({
    id: d.id,
    template_key: d.template_key,
    has_key_produced_by: Object.prototype.hasOwnProperty.call(d, "produced_by"),
    has_key_produced_by_name: Object.prototype.hasOwnProperty.call(d, "produced_by_name"),
    produced_by: d.produced_by ?? null,
    produced_by_name: d.produced_by_name ?? null,
  })),
});

// ── רגרסיה: כל מה ששורת המסמך כבר קראה, לא זז ────────────────────────────────
const d0 = docs[0] ?? {};
log("case — שדות קיימים בשורת המסמך (רגרסיה)", {
  keys: Object.keys(d0).sort(),
  kind: d0.kind,
  title: d0.title,
  has_body: d0.has_body,
  queue_id: d0.queue_id ?? null,
  queue_status: d0.queue_status ?? null,
  queue_missing: d0.queue_missing,
  template_key: d0.template_key,
  template_name_he: d0.template_name_he,
  template_fallback: d0.template_fallback,
  overwritten: d0.overwritten,
  order_by_created_then_id: docs.map((d) => d.id),
});

// ── רגרסיה: הבלוקים האחרים של אותה תשובה זהים ────────────────────────────────
log("case — בלוקים שלא נגעו (רגרסיה)", {
  case_keys: Object.keys(cs.body?.case ?? {}).sort(),
  decided_by: cs.body?.case?.decided_by ?? null,
  decided_by_name: cs.body?.case?.decided_by_name ?? null,
  rights_count: (cs.body?.rights ?? []).length,
  rights_first: (cs.body?.rights ?? [])[0] ?? null,
  templates_count: (cs.body?.templates ?? []).length,
  templates_keys: (cs.body?.templates ?? []).map((t) => t.key),
});

// ── השערים שלפני התשובה לא זזו ───────────────────────────────────────────────
const gate1 = await post(ADMIN + "/case", {}, auth);
const gate2 = await post(ADMIN + "/case", { id: "not-a-number" }, auth);
const gate3 = await post(ADMIN + "/case", { id: 999999999 }, auth);
const gate4 = await post(ADMIN + "/case", { id: caseA }, {});
log("שערי הקלט", {
  no_id: { status: gate1.status, error: gate1.body?.error },
  not_numeric: { status: gate2.status, error: gate2.body?.error },
  not_found: { status: gate3.status, error: gate3.body?.error },
  no_token: { status: gate4.status, error: gate4.body?.error },
});

// ── מסך המסמך (0084) לא זז — אותו נתון, שני קוראים, אותה תשובה ───────────────
const docReads = [];
for (const d of docs) {
  const one = await post(ADMIN + "/document", { id: String(d.id) }, auth);
  docReads.push({
    id: d.id,
    produced_by: one.body?.document?.produced_by ?? null,
    produced_by_name: one.body?.document?.produced_by_name ?? null,
    matches_case_row:
      (one.body?.document?.produced_by ?? null) === (d.produced_by ?? null) &&
      (one.body?.document?.produced_by_name ?? null) === (d.produced_by_name ?? null),
  });
}
log("0084 מול 0085 — אותו נתון משני הקוראים", docReads);

log("ids", { caseA, run: RUN });
writeFileSync(new URL(`./http-${RUN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
