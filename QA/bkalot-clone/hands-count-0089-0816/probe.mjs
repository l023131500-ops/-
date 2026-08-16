// מדידת 0089 מעל HTTP — רשימת העבודה שואלת «כמה ידיים עברו על הפנייה», ומקבלת תשובה.
//
// הקובץ רץ פעמיים — לפני החלת המיגרציה ואחריה — על אותן ארבע פניות בדיוק
// (seed.json, שנכתב פעם אחת ב-seed.mjs) ובאותו גוף בקשה. ההבדל היחיד בין
// הריצות הוא הפונקציה שרצה בצד השני. לפני: שני המפתחות אינם קיימים בשורה כלל
// (has_key=false) — לא 0, אלא היעדר. ההבחנה הזו היא כל המדידה: 0 הוא ערך
// שאפשר להאמין לו, והיעדר מפתח הוא שורה שאינה יודעת לשאול.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0083–0088: קובץ .ps1
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
const has = (o, k) => Object.prototype.hasOwnProperty.call(o ?? {}, k);

async function post(path, body, extra = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ⚠️ שני מפתחות בשם זהה באובייקט אחד — קוד ה-HTTP ומצב הפנייה — דרסו זה את זה
// בשקט במדידת 0087, והקוד לא נמדד כלל. השמות מופרדים כאן מלכתחילה.
const login = await post("/login", { email: "qa0089first@more30.test", password: "Qa0089-first-hand!" });
log("login (יד ראשונה)", { http_status: login.status, ok: login.body?.ok, admin: login.body?.admin });
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
    has_key_status_changes_count:  has(r, "status_changes_count"),
    has_key_status_deciders_count: has(r, "status_deciders_count"),
    status_changes_count:  r.status_changes_count  ?? null,
    status_deciders_count: r.status_deciders_count ?? null,
    case_status: r.status,
    decided_by: r.decided_by ?? null,
    decided_by_name: r.decided_by_name ?? null,
    decided_at_set: r.decided_at != null,
  };
};
log("cases — ארבעת המצבים ברשימה אחת", {
  http_status: list.status, ok: list.body?.ok, total: list.body?.total,
  A_שלוש_ידיים: state("A"), B_לחיצה_חוזרת: state("B"),
  C_בלי_זהות: state("C"), D_בלי_מעבר: state("D"),
});

// ── 0088 מול 0089 — אותו יומן משני הקוראים ───────────────────────────────────
// המסך אומר מי, הרשימה אומרת כמה. אם שני המספרים אינם נגזרים מאותן שורות בדיוק,
// מנהל שסורק ומנהל שפותח רואים שתי מערכות שונות.
const cross = [];
for (const key of ["A", "B", "C", "D"]) {
  const cs = await post("/case", { id: ids[key] }, auth);
  const h = cs.body?.status_history ?? [];
  const distinct = new Set(h.map((x) => x.admin_id).filter((x) => x != null));
  const row = byId[ids[key]] ?? {};
  cross.push({
    key, case_id: ids[key],
    case_screen: {
      has_key_status_history: has(cs.body ?? {}, "status_history"),
      rows: h.length, distinct_admins: distinct.size,
      sequence: h.map((x) => `${x.from_status}->${x.to_status}#${x.admin_id ?? "—"}`).join(" | "),
      log_ids: h.map((x) => x.id),
      chain_is_whole: h.every((x, i) => i === 0 || h[i - 1].to_status === x.from_status),
    },
    list_row: { status_changes_count: row.status_changes_count ?? null,
                status_deciders_count: row.status_deciders_count ?? null },
    agrees: (row.status_changes_count ?? null) === h.length &&
            (row.status_deciders_count ?? null) === distinct.size,
  });
}
log("0088 מול 0089 — הרצף שבמסך הפנייה מול שני המונים שבשורה", cross);

// ── רגרסיה: כל מה ששורת הרשימה כבר קראה, לא זז ───────────────────────────────
const a = byId[ids.A] ?? {};
log("cases — שדות קיימים בשורה (רגרסיה)", {
  keys: Object.keys(a).sort(),
  key_count: Object.keys(a).length,
  kind: a.kind, status: a.status, source: a.source, situation: a.situation,
  topic_no: a.topic_no ?? null, note_chars: (a.note ?? "").length,
  decided_by: a.decided_by ?? null, decided_by_name: a.decided_by_name ?? null,
  contact_keys: Object.keys(a.contact ?? {}).sort(),
  rights_count: a.rights_count, chosen_count: a.chosen_count, documents_count: a.documents_count,
  last_produced_by: a.last_produced_by ?? null,
  last_produced_by_name: a.last_produced_by_name ?? null,
  page: { total: list.body?.total, limit: list.body?.limit, offset: list.body?.offset, rows: rows.length },
  order_ids: rows.map((r) => r.id),
});

// ── רגרסיה: הקבוצה הנמנית, המיון והשערים לא זזו ──────────────────────────────
const sorted    = await post("/cases", { sort: "decided_at" }, auth);
const filtered  = await post("/cases", { decided: "no", kind: "treatment" }, auth);
const q         = await post("/cases", { q: String(ids.C) }, auth);
const bad       = await post("/cases", { sort: "status_changes_count" }, auth);
const badStatus = await post("/cases", { status: "nope" }, auth);
const badDecid  = await post("/cases", { decided: "maybe" }, auth);
const noToken   = await post("/cases", {}, {});
log("cases — מיון, סינון, חיפוש ושערים (רגרסיה)", {
  sort_decided_at: { http_status: sorted.status, ok: sorted.body?.ok, total: sorted.body?.total, ids: (sorted.body?.cases ?? []).map((r) => r.id) },
  filter_decided_no_treatment: { http_status: filtered.status, total: filtered.body?.total, ids: (filtered.body?.cases ?? []).map((r) => r.id) },
  q_case_id: { http_status: q.status, total: q.body?.total, ids: (q.body?.cases ?? []).map((r) => r.id) },
  sort_unknown: { http_status: bad.status, error: bad.body?.error, allowed: bad.body?.allowed },
  status_unknown: { http_status: badStatus.status, error: badStatus.body?.error },
  decided_unknown: { http_status: badDecid.status, error: badDecid.body?.error },
  no_token: { http_status: noToken.status, error: noToken.body?.error },
});

log("ids", { ...ids, run: RUN });
writeFileSync(new URL(`./http-${RUN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
