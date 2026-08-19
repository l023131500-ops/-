// שתי טענות שאינן נמדדות בשבע הקריאות, ושתיהן יכולות להכבות מסך:
// (א) הכרעה (3) — q שאינו מחרוזת. אובייקט, מערך, מספר ו-null בגוף חייבים
//     לחזור 200 עם שלוש שורות false, ולא 400 מ-PostgREST שנראה כמו נפילת שער.
// (ב) הרשימה עצמה — הסימן שמפנה את הקורא פנימה חייב להמשיך לדלוק, אחרת נמדד
//     כאן נתיב שאיש אינו מגיע אליו.

const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const ANON = process.env.BK_ANON;
const CASE_ID = 374;

async function call(action, body, token) {
  const headers = { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "application/json" };
  if (token) headers["x-admin-token"] = token;
  const res = await fetch(`${BASE}/${action}`, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, text: text.slice(0, 300) }; }
}

const login = await call("login", { email: "gate0098@more30.test", password: "Gate0098!pass" });
const token = login.json?.token;
if (!token) { console.error(JSON.stringify(login)); process.exit(1); }

const out = { non_string_q: {}, list: null };

for (const [name, q] of [["object", { a: 1 }], ["array", ["המס"]], ["number", 5], ["null", null], ["bool", true]]) {
  const r = await call("case", { id: CASE_ID, q }, token);
  const h = r.json?.status_history;
  out.non_string_q[name] = {
    status: r.status,
    ok: r.json?.ok,
    error: r.json?.error ?? null,
    n: Array.isArray(h) ? h.length : null,
    matched: Array.isArray(h) ? h.map((x) => x.note_matched) : null,
  };
}

const list = await call("cases", { q: "המס הקודמת" }, token);
out.list = {
  status: list.status,
  ok: list.json?.ok,
  total: list.json?.total,
  ids: (list.json?.cases ?? []).map((c) => c.id),
  matched_in_note: (list.json?.cases ?? []).map((c) => c.matched_in_note),
};

await call("logout", {}, token);

const fs = await import("node:fs/promises");
await fs.writeFile(new URL("./http-edges-v9.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out));
