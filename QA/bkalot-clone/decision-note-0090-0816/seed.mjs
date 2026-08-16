// זריעה למדידת 0090 — יומן ההכרעות אומר מה הוכרע ואינו אומר למה.
//
// שמונה פניות: ארבע לריצת ה-before וארבע לריצת ה-after. שלא כמו 0089, הבדיקה
// כאן כותבת — כל מעבר משנה סטטוס ומשאיר שורה ביומן — ולכן אי אפשר להריץ את
// אותה פנייה פעמיים; זה בדיוק הפיצול של 0087 ו-0088 (#222 לפני, #223 אחרי).
//
// ארבעת המצבים, בכל ריצה:
//   A — שני מעברים ושני נימוקים שונים  → שני הנימוקים קיימים, כל אחד על שורתו
//   B — נימוק של רווחים בלבד            → null ולא מחרוזת ריקה
//   C — לחיצה חוזרת עם נימוק אחר        → changed=false, אין שורה, אין נימוק
//   D — 501 תווים ואז 500 בדיוק         → דחייה שאינה משנה סטטוס, ואז קבלה
//
// הקליטה היא דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס, ולא הזרקה
// ל-cases — מה שנמדד הוא המוצר.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0083–0089: קובץ .ps1
// בלי BOM נקרא כאן כ-cp1255 והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא»
// על טקסט קיים.
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
const plan = [
  ["before", "A", "0501230901", "בדיקה 0090 לפני שני נימוקים"],
  ["before", "B", "0501230902", "בדיקה 0090 לפני נימוק ריק"],
  ["before", "C", "0501230903", "בדיקה 0090 לפני לחיצה חוזרת"],
  ["before", "D", "0501230904", "בדיקה 0090 לפני נימוק ארוך"],
  ["after",  "A", "0501230905", "בדיקה 0090 אחרי שני נימוקים"],
  ["after",  "B", "0501230906", "בדיקה 0090 אחרי נימוק ריק"],
  ["after",  "C", "0501230907", "בדיקה 0090 אחרי לחיצה חוזרת"],
  ["after",  "D", "0501230908", "בדיקה 0090 אחרי נימוק ארוך"],
];

const runs = { before: {}, after: {} };
for (const [run, key, phone, name] of plan) {
  const r = await post(BASE + "/bkalot-clone-intake", {
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: name, phone, email: "test@more30.com",
    note: "מה שהאזרח כתב בטופס — cases.note, ואינו הנימוק של המכריע", consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error(`intake ${run}/${key} לא החזירה case_id: ` + JSON.stringify(r));
  runs[run][key] = { case_id: id, contact_id: r.body?.contact_id ?? null,
                     rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null };
}

const out = { admin: { id: 90, email: "qa0090why@more30.test" }, runs };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
