// זריעה למדידת 0091 — מסך הפנייה אינו קורא את הנימוק שכבר נשמר.
//
// ⚠️ ארבע פניות ולא שמונה, וזה ההפרש מ-0090. שם הפיצול לפני/אחרי היה חובה מפני
// שהמיגרציה שינתה את **נתיב הכתיבה** — set_status — ולכן ריצת ה-before שינתה
// את מצב הפניות ואי אפשר היה להריץ אותן שוב. כאן המיגרציה נוגעת בקורא בלבד:
// אין בו UPDATE ואין INSERT. לכן הכתיבה קורית פעם אחת, כאן, ושתי הריצות קוראות
// את אותן ארבע שורות בדיוק. זו מדידה חזקה יותר ולא חלשה יותר — אותם נתונים,
// אותה בקשה מילה במילה, וההבדל היחיד הוא הפונקציה שרצה בצד השני.
//
// ארבעת המצבים:
//   A — שני מעברים, שני נימוקים שונים → כל נימוק על שורתו, ואף אחד אינו דורס
//   B — מעבר בלי מפתח note בגוף כלל     → שורה קיימת, נימוק null
//   C — 500 תווים בדיוק                 → חוזרים שלמים ואינם נחתכים בקריאה
//   D — נימוק של מנהל שחשבונו נמחק      → הנימוק שורד את עזיבת העובד
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס; כל מעבר דרך
// /set-status שמאחורי השער עם טוקן אמיתי אחרי כניסה אמיתית — ולא הזרקת שורה
// ליומן. מה שנמדד הוא המוצר.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו 0083–0090: קובץ .ps1 בלי BOM נקרא
// כאן כ-cp1255 והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט קיים.
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
// לכן זריקה על case_id ריק ולא המשך שקט.
const CITIZEN = "מה שהאזרח כתב בטופס — cases.note, ואינו הנימוק של המכריע";
const plan = [
  ["A", "0501240901", "בדיקה 0091 שני נימוקים"],
  ["B", "0501240902", "בדיקה 0091 בלי נימוק"],
  ["C", "0501240903", "בדיקה 0091 נימוק מלוא התקרה"],
  ["D", "0501240904", "בדיקה 0091 המכריע עזב"],
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

// ── הכתיבה, פעם אחת ──────────────────────────────────────────────────────────
const BASE = FN + "/bkalot-clone-admin";
const login = async (email, password) => {
  const r = await post(BASE + "/login", { email, password });
  if (!r.body?.token) throw new Error("login נכשלה עבור " + email + ": " + JSON.stringify(r));
  return { "x-admin-token": r.body.token };
};
const reader = await login("qa0091read@more30.test", "Qa0091-read-the-why!");
const gone   = await login("qa0091gone@more30.test", "Qa0091-gone-but-why!");

const setStatus = async (auth, case_id, status, note) => {
  const body = note === undefined ? { case_id: String(case_id), status }
                                  : { case_id: String(case_id), status, note };
  const r = await post(BASE + "/set-status", body, auth);
  return { http_status: r.status, ok: r.body?.ok, error: r.body?.error ?? null,
           changed: r.body?.changed ?? null, log_id: r.body?.log_id ?? null,
           note_chars: typeof r.body?.note === "string" ? r.body.note.length : null };
};

const A_ONE = "לקחתי לטיפול — חסרים תלושי שכר, ביקשתי מהפונה בטלפון";
const A_TWO = "נדחתה — ההכנסה מעל התקרה שנקבעה לשנת 2026, לא לפי שיקול דעת";
const C_MAX = "מ".repeat(500);
const D_WHY = "נדחתה בהחלטתי — אין זכאות בסניף הזה, הפניתי ללשכה המחוזית";

const writes = {
  A: { one: await setStatus(reader, cases.A.case_id, "in_progress", A_ONE),
       two: await setStatus(reader, cases.A.case_id, "rejected",    A_TWO) },
  // ⚠️ בלי מפתח note בגוף כלל — לא מחרוזת ריקה. «אין נימוק» ו«נימוק ריק» הם
  //    שני דברים, וההבחנה בין היעדר מפתח לבין null היא כל המדידה כאן.
  B: { one: await setStatus(reader, cases.B.case_id, "in_progress") },
  C: { one: await setStatus(reader, cases.C.case_id, "in_progress", C_MAX) },
  D: { one: await setStatus(gone,   cases.D.case_id, "rejected",    D_WHY) },
};

// ⚠️ החשבון נמחק כאן, לפני שתי הריצות ולא ביניהן — שתיהן קוראות מצב זהה.
// הפקודה היא על admin_users עצמה ולא UPDATE ידני על היומן, כפי שנמדדה
// הכרעה (3) של 0088 ב-8a577bc וב-9ea1991.
const out = {
  admins: { reader: 91, gone: 92 },
  notes: { A_ONE_chars: A_ONE.length, A_TWO_chars: A_TWO.length,
           C_MAX_chars: C_MAX.length, D_WHY_chars: D_WHY.length,
           citizen_chars: CITIZEN.length },
  cases, writes,
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
