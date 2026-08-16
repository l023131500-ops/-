// זריעה למדידת הפריסה — «כמה ידיים עברו» בשורת רשימת העבודה, הפעם בייצור.
//
// זהה בכוונה לזריעה של 74dbf7d (hands-count-ui-0816/seed.mjs) פרט לטלפונים
// ולשמות: מה שנמדד כאן הוא אותם ארבעה מצבים בדיוק, והפעם מהכתובת החיה ולא
// משרת סטטי מקומי. ארבע פניות ולא אחת, מפני שהשורה ברשימה היא פנייה, וכל מצב
// שהסימן יכול להיות בו צריך פנייה משלו כדי להיראות בטעינה אחת:
//   A — שלושה מעברים בידי שני מנהלים  → changes 3, deciders 2  → «3 מעברים · 2 מנהלים»
//   B — לחיצה חוזרת ומעבר אחד          → changes 1, deciders 1  → «מעבר אחד · מנהל אחד»
//   C — מעבר שנכתב בלי זהות (צורת v7)  → changes 1, deciders 0  → «מעבר אחד · מי הכריע אינו ידוע»
//   D — בלי מעבר כלל                    → changes 0, deciders 0  → השורה שותקת
//
// כל מעבר של A ושל B נכתב דרך נתיב set-status שמאחורי השער עם טוקן אמיתי —
// «שינוי סטטוס» כפי שמנהל לוחץ עליו — ולא בהזרקת שורה ליומן. המעבר של C הוא
// הקריאה בארגומנט אחד ונעשה בצד ה-SQL ולא כאן: השער ממלא את מזהה המנהל מהטוקן
// תמיד, ואין דרך לקבל את הצורה הזו מעל HTTP.
//
// הקליטה היא דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס, ולא הזרקה
// ל-cases — מה שנמדד הוא המוצר.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

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

// הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות.
// לכן זריקה על case_id ריק, ולא המשך שקט.
const seeded = {};
const plan = [
  ["A", "0501231001", "בדיקה פריסה שלוש ידיים", "עליה יעברו שני מנהלים בשלושה מעברים"],
  ["B", "0501231002", "בדיקה פריסה לחיצה חוזרת", "עליה ילחצו פעמיים על אותו סטטוס ומעבר אחד"],
  ["C", "0501231003", "בדיקה פריסה מעבר בלי זהות", "עליה ייכתב מעבר בצורת v7 — בלי זהות"],
  ["D", "0501231004", "בדיקה פריסה בלי מעבר", "לא ייגעו בה כלל"],
];
for (const [key, phone, name, note] of plan) {
  const r = await post(BASE + "/bkalot-clone-intake", {
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: name, phone, email: "test@more30.com", note, consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error(`intake ${key} לא החזירה case_id: ` + JSON.stringify(r));
  seeded[key] = { case_id: id, contact_id: r.body?.contact_id ?? null,
                  rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null };
}

async function login(email, password) {
  const r = await post(BASE + "/bkalot-clone-admin/login", { email, password });
  if (!r.body?.token) throw new Error("login נכשלה: " + JSON.stringify(r));
  return { token: r.body.token, admin: r.body.admin };
}
const one = await login("qa0090dep-first@more30.test", "Qa0090dep-first-hand!");
const two = await login("qa0090dep-second@more30.test", "Qa0090dep-second-hand!");

const setStatus = async (who, case_id, status) => {
  const r = await post(BASE + "/bkalot-clone-admin/set-status",
                       { case_id: String(case_id), status },
                       { "x-admin-token": who.token });
  return { http_status: r.status, ok: r.body?.ok, previous: r.body?.previous,
           to: r.body?.status, changed: r.body?.changed, log_id: r.body?.log_id ?? null,
           has_log_id_key: Object.prototype.hasOwnProperty.call(r.body ?? {}, "log_id"),
           admin: who.admin?.id ?? null };
};

// A — שלושה מעברים, שני מנהלים. הראשון לקח את הפנייה, השני סגר ודחה.
seeded.A.transitions = [
  await setStatus(one, seeded.A.case_id, "in_progress"),
  await setStatus(two, seeded.A.case_id, "closed"),
  await setStatus(two, seeded.A.case_id, "rejected"),
];

// B — לחיצה, ואז אותה לחיצה שוב. השנייה מחזירה changed=false ואינה כותבת שורה
//     (האילוץ case_status_log_is_a_change), ולכן המונה יאמר 1 ולא 2.
seeded.B.transitions = [
  await setStatus(one, seeded.B.case_id, "in_progress"),
  await setStatus(one, seeded.B.case_id, "in_progress"),
];

const out = { admins: { first: one.admin, second: two.admin },
              tokens: { first: one.token, second: two.token },
              cases: seeded };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify({ admins: out.admins, cases: seeded }, null, 2));
