// מדידת 0078 מעל HTTP — האם רשימת העבודה מבחינה בין פנייה שאדם סגר לפנייה
// שהטריגר קידם.
//
// node probe.mjs after
//
// כל קריאה נעשית דרך הנתיב החי /cases מאחורי שער הסשן, עם טוקן שהתקבל מ-/login,
// והפניות נוצרות דרך נתיב הקליטה הציבורי עם מפתח anon כמו מהטופס — כלומר נמדד
// מה שמסך הניהול מקבל, ולא מה שהמסד יודע.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט קיים.
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

// השאלה הנמדדת אינה «מה הערך» אלא «האם המפתח קיים בשורה בכלל» — שדה חסר ושדה
// שנושא null נראים זהים בקריאה רגילה, וזו ההבחנה שהפעימה כולה עומדת עליה.
const has = (o, k) => (o ? Object.prototype.hasOwnProperty.call(o, k) : null);
const shape = (r) => ({
  id: r?.id ?? null,
  status: r?.status ?? null,
  has_decided_by_key: has(r, "decided_by"),
  has_decided_at_key: has(r, "decided_at"),
  has_decided_by_name_key: has(r, "decided_by_name"),
  decided_by: r?.decided_by ?? null,
  decided_at: r?.decided_at ?? null,
  decided_by_name: r?.decided_by_name ?? null,
});

const findRow = (list, id) => (list?.cases ?? []).find((c) => c.id === id) ?? null;

// ── כניסה לניהול מעל HTTP, מנהל 31 ───────────────────────────────────────────
const login = await post(ADMIN + "/login", {
  email: "qa0078a@more30.test",
  password: "Qa0078-list-a!",
});
log("login (מנהל א)", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// ── שתי פניות דרך נתיב הקליטה הציבורי ────────────────────────────────────────
// הטלפון הוא בדיוק עשר ספרות. הריצה הראשונה בנתה אותו מאורך המערך והפיקה
// אחת-עשרה — הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות
// שאינן קיימות והציגה total:0 כאילו זו תשובה. ה-status וגוף התשובה נרשמים כאן
// כדי שכישלון כזה לא ייקרא שוב כמו הצלחה.
const mk = async (name, note, phone) => {
  const r = await post(INTAKE, {
    kind: "info",
    source: "form",
    full_name: name,
    phone,
    email: "test@more30.com",
    note,
    consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) {
    log("intake נכשלה", { status: r.status, body: r.body });
    throw new Error("intake לא החזירה case_id — אין על מה למדוד");
  }
  return id;
};
const caseA = await mk("בדיקה 0078 נסגרת", "מדידת 0078 — הפנייה שתיסגר", "0501230078");
const caseB = await mk("בדיקה 0078 בקרה", "מדידת 0078 — הבקרה, איש לא נוגע בה", "0501230079");
log("intake (שתי פניות)", { case_closed: caseA, case_control: caseB });

// ── (1) לפני כל הכרעה: שלושת המפתחות קיימים ברשימה, שלושתם null ───────────────
const before = await post(ADMIN + "/cases", { limit: 200 }, auth);
log("רשימה — לפני כל הכרעה", {
  status: before.status,
  ok: before.body?.ok,
  total: before.body?.total,
  rows_returned: (before.body?.cases ?? []).length,
  row_closed: shape(findRow(before.body, caseA)),
  row_control: shape(findRow(before.body, caseB)),
});

// ── (2) סגירה בפועל מעל HTTP, ואז אותה רשימה ─────────────────────────────────
const set = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "closed" }, auth);
log("set-status (סגירה על ידי מנהל א)", { status: set.status, changed: set.body?.changed });

const after = await post(ADMIN + "/cases", { limit: 200 }, auth);
log("רשימה — אחרי הסגירה", {
  status: after.status,
  total: after.body?.total,
  rows_returned: (after.body?.cases ?? []).length,
  row_closed: shape(findRow(after.body, caseA)),
  row_control: shape(findRow(after.body, caseB)),
});

// ── (3) הזהות היא נתון ולא קבוע: מנהל ב סוגר את אותה פנייה ───────────────────
const login2 = await post(ADMIN + "/login", {
  email: "qa0078b@more30.test",
  password: "Qa0078-list-b!",
});
const auth2 = { "x-admin-token": login2.body?.token ?? "" };
await post(ADMIN + "/set-status", { case_id: String(caseA), status: "rejected" }, auth2);
const after2 = await post(ADMIN + "/cases", { limit: 200 }, auth2);
log("רשימה — אחרי הכרעה שנייה, מנהל ב", {
  total: after2.body?.total,
  rows_returned: (after2.body?.cases ?? []).length,
  row_closed: shape(findRow(after2.body, caseA)),
});

// ── (4) הכרעה (3): הרשימה ו-total מסכימים, וה-JOIN אינו כופל שורה ────────────
const ids = (after2.body?.cases ?? []).map((c) => c.id);
log("הכרעה (3) — ה-JOIN אינו כופל שורות", {
  total: after2.body?.total,
  rows_returned: ids.length,
  distinct_ids: new Set(ids).size,
  no_duplicate_rows: ids.length === new Set(ids).size,
  total_equals_rows: after2.body?.total === ids.length,
});

// ── (5) בלי רגרסיה: שאר השדות בשורה לא זזו ───────────────────────────────────
log("הכרעה (5) — מפתחות השורה מלבד השלושה", {
  keys_without_decided: Object.keys(findRow(after2.body, caseA) ?? {})
    .filter((k) => !k.startsWith("decided_"))
    .sort(),
  top_level_keys: Object.keys(after2.body ?? {}).sort(),
});

// ── (6) הכרעה (2) — הבקרה שאין לה תחליף: המכריע נמחק ─────────────────────────
// זה החלק שנמדד מחוץ לסקריפט (מחיקת המנהל ב-SQL), ואז קריאה חוזרת כאן.
if (process.argv[3] === "after-delete") {
  const gone = await post(ADMIN + "/cases", { limit: 200 }, auth);
  const row = findRow(gone.body, caseA);
  log("הכרעה (2) — אחרי מחיקת המנהל שהכריע", {
    total: gone.body?.total,
    rows_returned: (gone.body?.cases ?? []).length,
    case_still_in_list: row !== null,
    row_closed: shape(row),
  });
}

writeFileSync(
  new URL(`./http-${LABEL}.json`, import.meta.url),
  JSON.stringify({ case_closed: caseA, case_control: caseB, steps: out }, null, 2),
  "utf8"
);
console.log("\n>> נכתב http-" + LABEL + ".json  (פניות " + caseA + " / " + caseB + ")");
