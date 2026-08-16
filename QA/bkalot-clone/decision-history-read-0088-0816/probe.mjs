// 0088 — «ההיסטוריה נכתבת ואיש אינו רואה אותה»: אותה מדידה בדיוק לפני ואחרי.
//
// הקו הפתוח נכתב ב-0602701 (heartbeat 624), מילה במילה: «אף קורא אינו מחזיר את
// היומן. bkalot_clone_admin_case אינה יודעת עליו — has_history=false
// ו-has_decisions=false נמדדו גם אחרי המיגרציה, ובמכוון... ההיסטוריה נכתבת ואיש
// אינו רואה אותה — זו הלבנה הבאה».
//
// כאן נלקח מסך הפנייה ורק הוא. המדידה עוברת דרך המוצר ולא סביבו: הקליטה בנתיב
// הציבור עם מפתח anon כמו מהטופס, ההתחברות במסך ההתחברות, ושלוש ההכרעות בנתיב
// set-status שמאחורי השער — p_admin_id נוסע בטוקן ולא נמסר ביד.
//
// שלוש הכרעות בידי שני אנשים על אותה שורה:
//   1. new → in_progress  בידי המנהל הראשון
//   2. in_progress → closed  בידי מנהל שני
//   3. closed → rejected  בידי אותו מנהל שני (שיימחק אחר כך, בצד ה-SQL)
//
// ובנוסף קריאה חוזרת אחת שאינה משנה דבר — היא לא כותבת שורה ביומן (הכרעה (5)
// של 0087), ולכן היא גם המדידה שההיסטוריה שחוזרת אינה מונה קליקים אלא מעברים.
//
// מצב "reread" קורא את אותה פנייה בדיוק בלי לגעת בה — הוא רץ אחרי מחיקת המנהל
// השני, וזו המדידה שקונה את ה-LEFT JOIN.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כאן כ-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const WHEN = process.argv[2];
if (!["before", "after", "reread"].includes(WHEN)) throw new Error("usage: node probe.mjs before|after|reread [case_id]");

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { http_status: res.status, body: await res.json().catch(() => null) };
}

// ⚠️ has_* נמדד ב-Object.hasOwn ולא בערך: מפתח שאינו קיים ומפתח שערכו null
//    נראים זהים ב-?., וזו בדיוק ההבחנה שהמיגרציה משנה.
function readCase(r) {
  const b = r.body ?? null;
  const c = b?.case ?? null;
  const h = b && Object.hasOwn(b, "status_history") ? b.status_history : null;
  return {
    http_status: r.http_status,
    top_keys: b ? Object.keys(b).sort() : null,
    has_status_history_top: b ? Object.hasOwn(b, "status_history") : null,
    has_status_history_in_case: c ? Object.hasOwn(c, "status_history") : null,
    case_keys_count: c ? Object.keys(c).length : null,
    case_status: c?.status ?? null,
    decided_by: c?.decided_by ?? null,
    decided_by_name: c ? (Object.hasOwn(c, "decided_by_name") ? c.decided_by_name : "<absent>") : null,
    decided_at: c?.decided_at ?? null,
    rights_count: Array.isArray(b?.rights) ? b.rights.length : null,
    documents_count: Array.isArray(b?.documents) ? b.documents.length : null,
    templates_count: Array.isArray(b?.templates) ? b.templates.length : null,
    history_count: Array.isArray(h) ? h.length : null,
    history: h,
    // הרצף כמשפט אחד: to_status של כל שורה מול from_status של הבאה.
    history_chain: Array.isArray(h)
      ? h.map((x) => `${x.from_status}->${x.to_status}#${x.admin_id}/${x.admin_name ?? "-"}`).join(" | ")
      : null,
    history_is_continuous: Array.isArray(h) && h.length > 1
      ? h.slice(1).every((x, i) => x.from_status === h[i].to_status)
      : null,
  };
}

const out = { when: WHEN, steps: {} };

if (WHEN === "reread") {
  const caseId = process.argv[3];
  if (!caseId) throw new Error("reread דורש case_id");
  const login = await post(BASE + "/bkalot-clone-admin/login",
                           { email: "qa0090first@more30.test", password: "Qa0090-history!" });
  if (!login.body?.token) throw new Error("login נכשלה: " + JSON.stringify(login));
  out.steps.case_reread = readCase(
    await post(BASE + "/bkalot-clone-admin/case", { id: String(caseId) }, { "x-admin-token": login.body.token }));
  writeFileSync(new URL(`./http-after-gone.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify(out, null, 2));
} else {
  // ── קליטה ──────────────────────────────────────────────────────────────────
  // הטלפון הוא בדיוק עשר ספרות: קליטה שנדחית מחזירה case_id ריק, וכל המדידה
  // שאחריה הייתה רצה על פנייה שאינה קיימת. לכן זריקה, ולא המשך שקט.
  const phone = WHEN === "before" ? "0501230895" : "0501230896";
  const intake = await post(BASE + "/bkalot-clone-intake", {
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: "בדיקה 0090 קורא היסטוריה " + WHEN, phone, email: "test@more30.com",
    note: "שלוש הכרעות ברצף, ואז שאלה מי הכריע קודם", consent: "true",
  });
  const caseId = intake.body?.case_id ?? null;
  if (caseId === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(intake));
  out.steps.intake = { http_status: intake.http_status, case_id: caseId,
                       contact_id: intake.body?.contact_id ?? null,
                       rights_linked: intake.body?.rights_linked ?? null,
                       queued: intake.body?.queued ?? null };

  // ── שתי התחברויות אמיתיות ──────────────────────────────────────────────────
  const tokens = {};
  for (const [key, email] of [["first", "qa0090first@more30.test"], ["gone", "qa0090gone@more30.test"]]) {
    const login = await post(BASE + "/bkalot-clone-admin/login", { email, password: "Qa0090-history!" });
    if (!login.body?.token) throw new Error(`login ${key} נכשלה: ` + JSON.stringify(login));
    tokens[key] = login.body.token;
    out.steps["login_" + key] = { http_status: login.http_status, admin: login.body.admin ?? null };
  }

  // ── שלוש הכרעות ברצף בידי שניים, ועוד קריאה חוזרת שאינה משנה דבר ──────────
  const plan = [
    ["d1_new_to_in_progress", "in_progress", "first"],
    ["d2_same_again",         "in_progress", "first"],
    ["d3_to_closed",          "closed",      "gone"],
    ["d4_to_rejected",        "rejected",    "gone"],
  ];
  for (const [key, status, who] of plan) {
    const r = await post(BASE + "/bkalot-clone-admin/set-status",
                         { case_id: String(caseId), status },
                         { "x-admin-token": tokens[who] });
    out.steps[key] = { http_status: r.http_status, body: r.body };
  }

  // ── מה שמסך הפנייה מחזיר אחרי הרצף ─────────────────────────────────────────
  out.steps.case_after = readCase(
    await post(BASE + "/bkalot-clone-admin/case", { id: String(caseId) }, { "x-admin-token": tokens.first }));

  // ── שערי הקלט: זהים לפני ואחרי, ואינם נמדדים רק כשנוח ─────────────────────
  out.steps.gate_no_id      = await post(BASE + "/bkalot-clone-admin/case", { id: "" }, { "x-admin-token": tokens.first });
  out.steps.gate_not_found  = await post(BASE + "/bkalot-clone-admin/case", { id: "9999999999" }, { "x-admin-token": tokens.first });
  out.steps.gate_no_token   = await post(BASE + "/bkalot-clone-admin/case", { id: String(caseId) });

  writeFileSync(new URL(`./http-${WHEN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify(out, null, 2));
}
