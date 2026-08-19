// מדידת 0086 מעל HTTP — רשימת העבודה שואלת «מי הפיק את המסמך האחרון», ומקבלת תשובה.
//
// הקובץ רץ פעמיים — לפני החלת המיגרציה ואחריה — על אותן ארבע פניות בדיוק
// (seed.json, שנכתב פעם אחת ב-seed.mjs) ובאותו גוף בקשה. ההבדל היחיד בין
// הריצות הוא הפונקציה שרצה בצד השני. לפני: שני המפתחות אינם קיימים בשורה כלל
// (has_key=false) — לא null, אלא היעדר.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0083–0085: קובץ .ps1
// בלי BOM נקרא כאן כ-cp1255 והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא»
// על טקסט קיים.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
const ids = Object.fromEntries(Object.entries(seed.cases).map(([k, v]) => [k, v.case_id]));

const RUN = process.env.RUN ?? "run";
const out = [];
const log = (label, value) => {
  out.push({ label, value });
  console.log("-- " + label + "\n" + JSON.stringify(value, null, 2));
};

async function post(path, body, extra = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const login = await post("/login", { email: "qa0086main@more30.test", password: "Qa0086-produced!" });
log("login (מנהל 69)", { status: login.status, ok: login.body?.ok, admin: login.body?.admin });
const auth = { "x-admin-token": login.body?.token ?? "" };

// ── המדידה של הפעימה: ארבעת המצבים בתשובה אחת ────────────────────────────────
const list = await post("/cases", { limit: 50 }, auth);
const rows = list.body?.cases ?? [];
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
const state = (key) => {
  const r = byId[ids[key]];
  if (!r) return { case_id: ids[key], missing_from_list: true };
  return {
    case_id: r.id,
    has_key_last_produced_by: Object.prototype.hasOwnProperty.call(r, "last_produced_by"),
    has_key_last_produced_by_name: Object.prototype.hasOwnProperty.call(r, "last_produced_by_name"),
    last_produced_by: r.last_produced_by ?? null,
    last_produced_by_name: r.last_produced_by_name ?? null,
    documents_count: r.documents_count,
  };
};
log("cases — ארבעת המצבים ברשימה אחת", {
  status: list.status, ok: list.body?.ok, total: list.body?.total,
  A_מהמסך: state("A"), B_צורת_v7: state("B"), C_מפיק_שנמחק: state("C"), D_בלי_מסמך: state("D"),
});

// ── רגרסיה: כל מה ששורת הרשימה כבר קראה, לא זז ───────────────────────────────
const a = byId[ids.A] ?? {};
log("cases — שדות קיימים בשורה (רגרסיה)", {
  keys: Object.keys(a).sort(),
  kind: a.kind, status: a.status, source: a.source, situation: a.situation,
  topic_no: a.topic_no ?? null, note_chars: (a.note ?? "").length,
  decided_by: a.decided_by ?? null, decided_at: a.decided_at ?? null,
  decided_by_name: a.decided_by_name ?? null,
  contact_keys: Object.keys(a.contact ?? {}).sort(),
  rights_count: a.rights_count, chosen_count: a.chosen_count, documents_count: a.documents_count,
  page: { total: list.body?.total, limit: list.body?.limit, offset: list.body?.offset, rows: rows.length },
  order_ids: rows.map((r) => r.id),
});

// ── רגרסיה: הקבוצה הנמנית, המיון והשערים לא זזו ──────────────────────────────
const sorted = await post("/cases", { sort: "decided_at" }, auth);
const filtered = await post("/cases", { decided: "no", kind: "treatment" }, auth);
const q = await post("/cases", { q: String(ids.C) }, auth);
const bad = await post("/cases", { sort: "produced_by" }, auth);
const badStatus = await post("/cases", { status: "nope" }, auth);
const noToken = await post("/cases", {}, {});
log("cases — מיון, סינון, חיפוש ושערים (רגרסיה)", {
  sort_decided_at: { status: sorted.status, ok: sorted.body?.ok, total: sorted.body?.total, ids: (sorted.body?.cases ?? []).map((r) => r.id) },
  filter_decided_no_treatment: { status: filtered.status, total: filtered.body?.total, ids: (filtered.body?.cases ?? []).map((r) => r.id) },
  q_case_id: { status: q.status, total: q.body?.total, ids: (q.body?.cases ?? []).map((r) => r.id) },
  sort_unknown: { status: bad.status, error: bad.body?.error, allowed: bad.body?.allowed },
  status_unknown: { status: badStatus.status, error: badStatus.body?.error },
  no_token: { status: noToken.status, error: noToken.body?.error },
});

// ── 0085 מול 0086 — אותו נתון משני הקוראים ───────────────────────────────────
const cross = [];
for (const key of ["A", "B", "C", "D"]) {
  const cs = await post("/case", { id: ids[key] }, auth);
  const docs = cs.body?.documents ?? [];
  const last = docs[docs.length - 1] ?? null;
  const row = byId[ids[key]] ?? {};
  cross.push({
    key, case_id: ids[key], docs: docs.map((d) => d.id),
    case_screen_last: last ? { id: last.id, produced_by: last.produced_by ?? null, produced_by_name: last.produced_by_name ?? null } : null,
    list_row: { last_produced_by: row.last_produced_by ?? null, last_produced_by_name: row.last_produced_by_name ?? null },
    agrees: (last?.produced_by ?? null) === (row.last_produced_by ?? null) &&
            (last?.produced_by_name ?? null) === (row.last_produced_by_name ?? null),
  });
}
log("0085 מול 0086 — שורת הרשימה והמסמך האחרון שבמסך הפנייה", cross);

log("ids", { ...ids, run: RUN });
writeFileSync(new URL(`./http-${RUN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
