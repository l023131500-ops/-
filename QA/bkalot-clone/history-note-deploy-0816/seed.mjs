// זריעה למדידת הפריסה — «למה» בטבלת רצף ההכרעות, הפעם מהכתובת החיה.
//
// זהה בכוונה לזריעה של aff6455 (history-note-ui-0816/seed.mjs) פרט לטלפונים,
// לשמות ולחשבון: מה שנמדד כאן הוא אותם שלושה מצבים בדיוק, והפעם מ-more30.com
// ולא משרת סטטי מקומי.
//   A — שני מעברים, שני נימוקים שונים → כל נימוק על שורתו, ואף אחד אינו דורס
//   B — מעבר בלי מפתח note בגוף כלל   → «—» ו-title «לא נכתב נימוק», ולא stale
//   C — 500 תווים בלי רווח אחד        → נכנסים שלמים ואינם מותחים את הטבלה
// המצב הרביעי — היעדר המפתח, כלומר קורא שקדם ל-0091 — אינו ניתן לזריעה מכאן:
// הקורא החי מחזיר את המפתח מאז c6e4a81. הוא נמדד בצד השרת ב-0091 ובקוד ב-aff6455,
// ונאמר כאן ולא נעקף.
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס; כל מעבר דרך
// /set-status שמאחורי השער עם טוקן אמיתי — ולא הזרקת שורה ליומן.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const FN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1";

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ⚠️ הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות.
const CITIZEN = "מה שהאזרח כתב בטופס — cases.note, ואינו הנימוק של המכריע";
const plan = [
  ["A", "0501250911", "בדיקת פריסה שני נימוקים"],
  ["B", "0501250912", "בדיקת פריסה בלי נימוק"],
  ["C", "0501250913", "בדיקת פריסה נימוק מלוא התקרה"],
];

const cases = {};
for (const [key, phone, name] of plan) {
  const r = await post(FN + "/bkalot-clone-intake", {
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: name, phone, email: "test@more30.com", note: CITIZEN, consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error(`intake ${key} לא החזירה case_id: ` + JSON.stringify(r));
  cases[key] = { case_id: id, contact_id: r.body?.contact_id ?? null,
                 rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null };
}

const BASE = FN + "/bkalot-clone-admin";
const login = await post(BASE + "/login", { email: "qa-note-deploy@more30.test", password: "QaNoteDeploy-0816-why!" });
if (!login.body?.token) throw new Error("login נכשלה: " + JSON.stringify(login));
const auth = { "x-admin-token": login.body.token };

const setStatus = async (case_id, status, note) => {
  const body = note === undefined ? { case_id: String(case_id), status }
                                  : { case_id: String(case_id), status, note };
  const r = await post(BASE + "/set-status", body, auth);
  return { http_status: r.status, ok: r.body?.ok, error: r.body?.error ?? null,
           changed: r.body?.changed ?? null, log_id: r.body?.log_id ?? null,
           note_chars: typeof r.body?.note === "string" ? r.body.note.length : null };
};

const A_ONE = "לקחתי לטיפול — חסרים תלושי שכר, ביקשתי מהפונה בטלפון";
const A_TWO = "נדחתה — ההכנסה מעל התקרה שנקבעה לשנת 2026, לא לפי שיקול דעת";
// ⚠️ 500 תווים בלי רווח אחד ולא 500 תווי טקסט רגיל. מחרוזת עם רווחים נשברת
//    מעצמה בכל דפדפן, ולכן היא אינה בודקת דבר; זו בודקת את overflow-wrap.
const C_MAX = "מ".repeat(500);

const writes = {
  A: { one: await setStatus(cases.A.case_id, "in_progress", A_ONE),
       two: await setStatus(cases.A.case_id, "rejected",    A_TWO) },
  // ⚠️ בלי מפתח note בגוף כלל — לא מחרוזת ריקה.
  B: { one: await setStatus(cases.B.case_id, "in_progress") },
  C: { one: await setStatus(cases.C.case_id, "in_progress", C_MAX) },
};

const out = {
  admin: { id: 94, email: "qa-note-deploy@more30.test" },
  notes: { A_ONE_chars: A_ONE.length, A_TWO_chars: A_TWO.length,
           C_MAX_chars: C_MAX.length, citizen_chars: CITIZEN.length },
  cases, writes,
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
