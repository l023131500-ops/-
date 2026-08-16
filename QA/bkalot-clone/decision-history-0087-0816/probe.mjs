// 0087 — «אין היסטוריית הכרעות»: אותה מדידה בדיוק לפני המיגרציה ואחריה.
//
// הקו הפתוח נכתב שוב ושוב מאז 0076 ועד 839386a, מילה במילה: «אין היסטוריית
// הכרעות». cases.decided_by ו-cases.decided_at הם ערך אחרון ולא רצף: כל הכרעה
// דורסת את הקודמת, ולכן פנייה שמנהל אחד לקח והשני סגר מציגה רק את השני —
// ומי שלקח אותה נעלם בלי שגיאה ובלי שדה שנראה שגוי.
//
// המדידה עוברת דרך המוצר ולא סביבו: הקליטה בנתיב הציבור עם מפתח anon כמו
// מהטופס, ההתחברות במסך ההתחברות, ושלוש ההכרעות בנתיב set-status שמאחורי
// השער — כלומר p_admin_id נוסע בטוקן ולא נמסר ביד.
//
// ארבעת המצבים על פנייה אחת, ברצף, על אותה שורה:
//   1. new → in_progress בידי המנהל הראשון
//   2. in_progress → in_progress — אותה הכרעה שוב, changed=false
//   3. in_progress → closed בידי מנהל שני
//   4. closed → rejected בידי מנהל שיימחק אחר כך (המחיקה בצד ה-SQL)
//
// אחרי הרצף השורה מחזיקה עובדה אחת בלבד — מי הכריע אחרון — ושלושת הצעדים
// שלפניו אינם ניתנים לשחזור משום מקום. זו המדידה שהמיגרציה קונה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כאן כ-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const WHEN = process.argv[2];
if (WHEN !== "before" && WHEN !== "after") throw new Error("usage: node probe.mjs before|after");

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const BASE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const out = { when: WHEN, steps: {} };

// ── קליטה ────────────────────────────────────────────────────────────────────
// הטלפון הוא בדיוק עשר ספרות: קליטה שנדחית מחזירה case_id ריק, וכל המדידה
// שאחריה הייתה רצה על פנייה שאינה קיימת. לכן זריקה, ולא המשך שקט.
const phone = WHEN === "before" ? "0501230893" : "0501230894";
const intake = await post(BASE + "/bkalot-clone-intake", {
  kind: "treatment", source: "form", situation: "single_parent",
  full_name: "בדיקה 0089 היסטוריית הכרעות " + WHEN, phone, email: "test@more30.com",
  note: "עליה יוכרעו ארבע הכרעות ברצף", consent: "true",
});
const caseId = intake.body?.case_id ?? null;
if (caseId === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(intake));
out.steps.intake = { status: intake.status, case_id: caseId, contact_id: intake.body?.contact_id ?? null,
                     rights_linked: intake.body?.rights_linked ?? null, queued: intake.body?.queued ?? null };

// ── שתי התחברויות אמיתיות ────────────────────────────────────────────────────
const tokens = {};
for (const [key, email] of [["first", "qa0089first@more30.test"], ["gone", "qa0089gone@more30.test"]]) {
  const login = await post(BASE + "/bkalot-clone-admin/login", { email, password: "Qa0089-decided!" });
  if (!login.body?.token) throw new Error(`login ${key} נכשלה: ` + JSON.stringify(login));
  tokens[key] = login.body.token;
  out.steps["login_" + key] = { status: login.status, admin: login.body.admin ?? null };
}

// ── ארבע הכרעות ברצף על אותה שורה ────────────────────────────────────────────
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
  out.steps[key] = { status: r.status, body: r.body };
}

// ── מה שהפנייה מחזיקה אחרי הרצף, מהמוצר ולא מהמסד ────────────────────────────
{
  const r = await post(BASE + "/bkalot-clone-admin/case", { id: String(caseId) },
                       { "x-admin-token": tokens.first });
  const c = r.body?.case ?? null;
  // ⚠️ http_status ולא status: בגרסה הראשונה שני המפתחות נקראו status, והשני
  //    דרס את הראשון בשקט — קוד ה-HTTP פשוט לא נמדד. נרשם ולא נבלע, והריצה
  //    הראשונה נזרקה כדי ששתי הריצות ירוצו מאותו קובץ בדיוק.
  out.steps.case_after = {
    http_status: r.status,
    case_keys: c ? Object.keys(c).sort() : null,
    // ⚠️ has_* נמדד ב-Object.hasOwn ולא בערך: מפתח שאינו קיים ומפתח שערכו null
    //    נראים זהים ב-?., וזו בדיוק ההבחנה שהמיגרציה משנה.
    has_history: c ? Object.hasOwn(c, "status_history") : null,
    has_decisions: c ? Object.hasOwn(c, "decisions") : null,
    case_status: c?.status ?? null,
    decided_by: c ? (Object.hasOwn(c, "decided_by") ? c.decided_by : "<absent>") : null,
    decided_by_name: c ? (Object.hasOwn(c, "decided_by_name") ? c.decided_by_name : "<absent>") : null,
    decided_at: c ? (Object.hasOwn(c, "decided_at") ? c.decided_at : "<absent>") : null,
  };
}

writeFileSync(new URL(`./http-${WHEN}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
