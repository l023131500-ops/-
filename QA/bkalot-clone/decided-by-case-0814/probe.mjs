// מדידת 0077 מעל HTTP — האם מסך הפנייה יכול לשאול «מי סגר, ומתי».
//
// node probe.mjs before   → לפני המיגרציה
// node probe.mjs after    → אחריה
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0076/v7: קובץ .ps1 בלי
// BOM נקרא כ-cp1255, והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט
// קיים.
//
// כל קריאה נעשית דרך הנתיב החי מאחורי שער הסשן, עם טוקן שהתקבל מ-/login — כלומר
// נמדד מה שמסך הניהול מקבל, לא מה שהמסד יודע.
import { writeFileSync } from "node:fs";

const LABEL = process.argv[2] ?? "run";

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

// השאלה הנמדדת אינה «מה הערך» אלא «האם השדה קיים בתשובה בכלל» — undefined ו-null
// נראים זהים ב-JSON.stringify של ערך בודד, והם שני מצבים שונים לגמרי כאן.
const shape = (c) => ({
  status: c?.status ?? null,
  has_decided_by_key: c ? Object.prototype.hasOwnProperty.call(c, "decided_by") : null,
  has_decided_at_key: c ? Object.prototype.hasOwnProperty.call(c, "decided_at") : null,
  has_decided_by_name_key: c
    ? Object.prototype.hasOwnProperty.call(c, "decided_by_name")
    : null,
  decided_by: c?.decided_by ?? null,
  decided_at: c?.decided_at ?? null,
  decided_by_name: c?.decided_by_name ?? null,
});

// ── כניסה לניהול מעל HTTP ────────────────────────────────────────────────────
const login = await post(ADMIN + "/login", {
  email: "qa0077@more30.test",
  password: "Qa0077-identity!",
});
log("login", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// ── שתי הפניות שכבר קיימות מהפעימה הקודמת ────────────────────────────────────
// 98 — נסגרה בייצור על ידי מנהל 27 (f1ba90c). 99 — הבקרה, איש לא נגע בה.
for (const id of [98, 99]) {
  const r = await post(ADMIN + "/case", { id: String(id) }, auth);
  log(`case #${id}`, { status: r.status, ok: r.body?.ok, case: shape(r.body?.case) });
}

// ── פנייה חדשה, נסגרת כאן על ידי מנהל 26 ─────────────────────────────────────
// כדי שהשם יהיה נתון ולא קבוע: 98 סגורה על ידי 27, וזו תיסגר על ידי 26. אם
// ה-JOIN עובד, שתי הקריאות יחזירו שני שמות שונים.
const fresh = await post(INTAKE, {
  kind: "info",
  source: "form",
  full_name: "בדיקה 0077 " + LABEL,
  phone: "05012300" + (LABEL === "before" ? "80" : "81"),
  email: "test@more30.com",
  note: "מדידת 0077 — מי סגר את הפנייה",
  consent: "true",
});
const caseC = fresh.body?.case_id ?? fresh.body?.case?.id;
log("intake (פנייה חדשה)", { status: fresh.status, case_id: caseC });

const set = await post(ADMIN + "/set-status", { case_id: String(caseC), status: "closed" }, auth);
log("set-status (סגירה על ידי מנהל 26)", {
  status: set.status,
  changed: set.body?.changed,
  decided_by: set.body?.decided_by,
});

const back = await post(ADMIN + "/case", { id: String(caseC) }, auth);
log(`case #${caseC} (נסגרה כאן) — קריאה חוזרת`, {
  status: back.status,
  ok: back.body?.ok,
  case: shape(back.body?.case),
});

// ── ההשוואה שקונה את הכרעה (5): שאר התשובה לא זזה ────────────────────────────
log("שאר בלוקי התשובה של #98 — לא אמורים להשתנות בין before ל-after", await (async () => {
  const r = await post(ADMIN + "/case", { id: "98" }, auth);
  const c = r.body?.case ?? {};
  return {
    case_keys_without_decided: Object.keys(c).filter((k) => !k.startsWith("decided_")).sort(),
    top_level_keys: Object.keys(r.body ?? {}).sort(),
    rights_count: (r.body?.rights ?? []).length,
    documents_count: (r.body?.documents ?? []).length,
    templates_count: (r.body?.templates ?? []).length,
  };
})());

writeFileSync(new URL(`./http-${LABEL}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log("\n>> נכתב http-" + LABEL + ".json");
