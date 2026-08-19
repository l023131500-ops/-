// מדידת השער עצמו מעל HTTP — לפני הפריסה ואחריה, באותו קובץ ובאותן קריאות.
// השאלה היחידה כאן: האם מונח החיפוש שהוקלד ברשימה מגיע אל 0097 דרך
// bkalot-clone-admin, או נעצר בשער. הקריאות הן אלה שהדפדפן עושה — POST על
// /bkalot-clone-admin/<action> עם מפתח anon בכותרת ו-x-admin-token אחרי הכניסה.
//
// שימוש: node probe-http.mjs <label>   (label נכנס לשם קובץ התוצאה)

const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const ANON = process.env.BK_ANON;
const EMAIL = "gate0098@more30.test";
const PASS = "Gate0098!pass";
const CASE_ID = 374;

if (!ANON) { console.error("BK_ANON missing"); process.exit(1); }

async function call(action, body, token) {
  const headers = {
    apikey: ANON,
    authorization: `Bearer ${ANON}`,
    "content-type": "application/json",
  };
  if (token) headers["x-admin-token"] = token;
  const res = await fetch(`${BASE}/${action}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* נשמר כטקסט */ }
  return { status: res.status, json, text: json ? null : text.slice(0, 300) };
}

// רק מה שמכריע: מזהה שורת יומן, הנימוק, והדגל. הרצף כולו חוזר בכל קריאה,
// ולכן נשמר גם אורכו — שדה שמסנן במקום לתאר היה מקצר אותו.
function rows(out) {
  const h = out?.json?.status_history;
  if (!Array.isArray(h)) return { n: null, rows: null };
  return {
    n: h.length,
    rows: h.map((r) => ({
      id: r.id,
      note: r.note,
      has_key: Object.hasOwn(r, "note_matched"),
      note_matched: r.note_matched,
      type: typeof r.note_matched,
    })),
  };
}

const label = process.argv[2] ?? "run";
const out = { label, base: BASE, case_id: CASE_ID, calls: {} };

const login = await call("login", { email: EMAIL, password: PASS });
out.login = { status: login.status, ok: login.json?.ok, admin_id: login.json?.admin?.id };
const token = login.json?.token;
if (!token) { console.error(JSON.stringify(login)); process.exit(1); }

// שבע הקריאות של 0097, מילה במילה, כדי שהמדידה כאן תהיה השוואה ישירה למה
// שנמדד שם ב-SQL — ההפרש היחיד הוא שכאן הן עוברות דרך השער.
const TERMS = [
  ["no_q", {}],
  ["match_87", { q: "המס הקודמת" }],
  ["match_88", { q: "בדואר רשום" }],
  ["match_two", { q: "מסמכים" }],
  ["empty", { q: "" }],
  ["percent", { q: "%" }],
  ["zzzz", { q: "zzzz" }],
];

for (const [name, extra] of TERMS) {
  const res = await call("case", { id: CASE_ID, ...extra }, token);
  out.calls[name] = { sent: { id: CASE_ID, ...extra }, status: res.status, ok: res.json?.ok, ...rows(res) };
}

// בקרה: השדה חייב להיות תיאור ולא סינון, ולכן גם נמדד שהזהות חוזרת כרגיל
// ושהנתיב לא נשבר על גוף בלי q בכלל.
out.admin_returned = out.calls.no_q.status === 200;

await call("logout", {}, token);

const fs = await import("node:fs/promises");
await fs.writeFile(new URL(`./http-${label}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
