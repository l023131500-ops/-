// זריעה למדידת הלבנה — תיבת הנימוק במסך.
//
// שתי פניות ולא שלוש, וזה ההפרש מ-aff6455. שם נמדדה **התצוגה**, ולכן כל מצב שהתא
// מצייר היה חייב להיזרע מראש דרך HTTP; כאן נמדדת **הכתיבה**, והנימוק נכתב מתוך
// הדפדפן — כלומר הזריעה בונה פניות ריקות בלבד, ומה שנמדד הוא מה שהמסך שולח:
//   A — נימוק שנכתב בתיבה ונלחץ «בטיפול»    → נשמר, וחוזר בטבלה מתחת
//   B — 501 תווים                            → note_too_long, והסטטוס אינו זז
// המצב השלישי — ריק — נמדד על A עצמה לפני ההקלדה (המונה) ואחרי המעבר השני
// (לחיצה בלי הקלדה), ולכן אינו דורש פנייה שלישית.
//
// אין כאן ולו קריאת set-status אחת: כל מעבר במדידה הזו נלחץ בדפדפן. סקריפט
// שהיה כותב את המעברים מראש היה מודד את השער — וזה כבר נמדד ב-0090 — ולא את
// התיבה שנבנתה עכשיו.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו 0083–0091: קובץ .ps1 בלי BOM נקרא
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
  ["A", "0501240921", "בדיקת תיבה נימוק נשמר"],
  ["B", "0501240922", "בדיקת תיבה נימוק ארוך מדי"],
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
                 rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null,
                 status: r.body?.status ?? null };
}

const out = {
  admin: { id: 95, email: "qa-note-box@more30.test" },
  citizen_chars: CITIZEN.length,
  cases,
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
