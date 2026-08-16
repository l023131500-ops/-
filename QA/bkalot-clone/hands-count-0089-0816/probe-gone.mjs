// מדידת הכרעה (4) של 0089 — המספר שורד את מחיקת החשבון.
//
// קובץ נפרד ולא סעיף שנוסף ל-probe.mjs, ובמכוון: probe.mjs רץ פעמיים — לפני
// המיגרציה ואחריה — ושתי הריצות חייבות לרוץ מאותו קובץ בדיוק ולא משתי גרסאות
// שלו (התקלה שנרשמה במדידת 0087). המדידה הזו אפשרית רק אחרי, ולכן היא כאן.
//
// מה נמדד: החשבון השני (85) נמחק בפקודה על admin_users עצמה — ולא UPDATE ידני
// על היומן. שתי שורות היומן שנושאות אותו הן שתיים מתוך שלוש של פנייה A, ולכן
// INNER JOIN או ספירה שפותרת שם היו מחזירים 1 במקום 3: מוחקים מההיסטוריה את
// הדחייה עצמה מפני שעובד התפטר. הכרעה (2) של 0087 השאירה את admin_id בלי FK
// דווקא כדי שזה לא יקרה, והכרעה (4) של 0089 היא שהמונה אינו נוגע ב-admin_users
// כלל. הצד השני של אותה מדידה: במסך הפנייה (0088) admin_name של אותן שתי שורות
// מתרוקן בעוד admin_id נשאר 85 — הראיה נשארת, השם הוא שנעלם.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";
const seed = JSON.parse(readFileSync(new URL("./seed.json", import.meta.url), "utf8"));
const ids = Object.fromEntries(Object.entries(seed.cases).map(([k, v]) => [k, v.case_id]));

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
  return { http_status: res.status, body: await res.json().catch(() => null) };
}

// הכניסה היא בחשבון הראשון (84), שלא נמחק. השני (85) הוא זה שאיננו.
const login = await post("/login", { email: "qa0089first@more30.test", password: "Qa0089-first-hand!" });
const auth = { "x-admin-token": login.body?.token ?? "" };
log("login (יד ראשונה — 85 כבר נמחק)", { http_status: login.http_status, ok: login.body?.ok, admin: login.body?.admin });

const list = await post("/cases", { limit: 50 }, auth);
const row = (list.body?.cases ?? []).find((r) => r.id === ids.A) ?? {};
const cs = await post("/case", { id: ids.A }, auth);
const h = cs.body?.status_history ?? [];

log("A — המונה אחרי מחיקת החשבון שהכריע פעמיים", {
  case_id: ids.A,
  list_row: {
    status_changes_count: row.status_changes_count ?? null,
    status_deciders_count: row.status_deciders_count ?? null,
    decided_by: row.decided_by ?? null,
    decided_by_name: row.decided_by_name ?? null,
    row_still_in_list: Object.keys(row).length > 0,
  },
  case_screen: {
    rows: h.length,
    lines: h.map((x) => ({ id: x.id, from: x.from_status, to: x.to_status,
                           admin_id: x.admin_id ?? null, admin_name: x.admin_name ?? null })),
    distinct_admins: new Set(h.map((x) => x.admin_id).filter((x) => x != null)).size,
  },
  agrees: (row.status_changes_count ?? null) === h.length &&
          (row.status_deciders_count ?? null) ===
            new Set(h.map((x) => x.admin_id).filter((x) => x != null)).size,
  total: list.body?.total,
});

writeFileSync(new URL("./http-after-gone.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
