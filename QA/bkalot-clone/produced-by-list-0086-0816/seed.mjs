// זריעה למדידת 0086 — רשימת העבודה אומרת מי הפיק את המסמך האחרון.
//
// ארבע פניות ולא אחת, מפני שהשורה ברשימה היא פנייה: כל מצב שהעמודה יכולה
// להיות בו צריך פנייה משלו כדי להיראות באותה תשובה אחת.
//   A — הפקה מהמסך דרך השער v8 (זהות + שם)
//   B — הפקה בצורת v7, ארגומנט אחד (null/null, ועדיין documents_count=1)
//   C — הפקה בידי מנהל שנמחק אחר כך (זהות בלי שם)
//   D — בלי מסמך כלל (null/null, documents_count=0) — זו הפנייה שמראה
//       ש-documents_count הוא שמפריד בין שני ה-null, ולא שדה נגזר.
// B ו-C נזרעים בצד ה-SQL (הקריאה בארגומנט אחד ומחיקת החשבון) ולא כאן.
//
// הקליטה היא דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס, ולא הזרקה
// ל-cases — מה שנמדד הוא המוצר.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כאן כ-cp1255
// והעברית שבתוכו נהרסת בזמן הפירוק.
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

// ── ארבע פניות ───────────────────────────────────────────────────────────────
// הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות.
// לכן זריקה על case_id ריק, ולא המשך שקט.
const seeded = {};
const plan = [
  ["A", "0501230861", "בדיקה 0086 הפקה מהמסך", "עליה יופק מסמך מהמסך — הזהות נוסעת בשער v8"],
  ["B", "0501230862", "בדיקה 0086 הפקה בצורת v7", "עליה יופק מסמך בארגומנט אחד — בלי זהות"],
  ["C", "0501230863", "בדיקה 0086 מפיק שנמחק", "עליה יופק מסמך בידי חשבון שיימחק אחריו"],
  ["D", "0501230864", "בדיקה 0086 בלי מסמך", "לא יופק עליה מסמך כלל"],
];
for (const [key, phone, name, note] of plan) {
  const r = await post(BASE + "/bkalot-clone-intake", {
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: name, phone, email: "test@more30.com", note, consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error(`intake ${key} לא החזירה case_id: ` + JSON.stringify(r));
  seeded[key] = { case_id: id, contact_id: r.body?.contact_id ?? null, rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null };
}

// ── כניסה לניהול והפקה מהמסך על A ────────────────────────────────────────────
const login = await post(BASE + "/bkalot-clone-admin/login", {
  email: "qa0086main@more30.test", password: "Qa0086-produced!",
});
if (!login.body?.token) throw new Error("login נכשלה: " + JSON.stringify(login));
const r = await post(BASE + "/bkalot-clone-admin/render", { case_id: String(seeded.A.case_id) },
                     { "x-admin-token": login.body.token });
seeded.A.document_id = r.body?.document_id ?? null;
seeded.A.produced_by = r.body?.produced_by ?? null;
seeded.A.render_queued = r.body?.queued ?? null;

const out = { admin_main: login.body?.admin ?? null, cases: seeded };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
