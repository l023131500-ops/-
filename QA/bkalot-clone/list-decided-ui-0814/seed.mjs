// הכנת המדידה של «מי הכריע» ברשימה — שלוש פניות דרך נתיב הקליטה הציבורי
// (bkalot-clone-intake, מפתח anon כמו מהטופס) ולא בהזרקה למסד.
//
//   node seed.mjs
//
// הסקריפט אינו נוגע במסך: הוא מכין שלוש שורות שהמסך יצייר, ואת אחת מהן הוא
// מכריע בשם מנהל ב — כדי שמחיקת החשבון הזה (ב-SQL, מחוץ לסקריפט) תייצר את
// המצב היחיד שאין דרך לייצר מהמסך: הכרעה ששרדה את מי שהכריע אותה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק.
import { writeFileSync } from "node:fs";

const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות
// והציגה אפס כאילו זו תשובה. לכן זריקה על case_id ריק, ולא המשך שקט.
const mk = async (name, note, phone) => {
  const r = await post(INTAKE, {
    kind: "info", source: "form", full_name: name, phone,
    email: "test@more30.com", note, consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(r));
  return id;
};

const caseHuman = await mk("בדיקה 0079 אדם", "מדידת הרשימה — תוכרע מהמסך", "0501230081");
const caseTrigger = await mk("בדיקה 0079 טריגר", "מדידת הרשימה — תזוז בלי לחיצה", "0501230082");
const caseGone = await mk("בדיקה 0079 מכריע שנמחק", "מדידת הרשימה — המכריע יימחק", "0501230083");

// מנהל ב מכריע את השלישית מעל HTTP — הכרעה אמיתית שעברה את השער, ולא UPDATE.
const login = await post(ADMIN + "/login", { email: "qa0079b@more30.test", password: "Qa0079-row-b!" });
const auth = { "x-admin-token": login.body?.token ?? "" };
const set = await post(ADMIN + "/set-status", { case_id: String(caseGone), status: "closed" }, auth);
if (set.body?.ok !== true) throw new Error("set-status נכשלה: " + JSON.stringify(set));

const out = {
  case_human: caseHuman,
  case_trigger: caseTrigger,
  case_gone: caseGone,
  decider_b: login.body?.admin ?? null,
  set_status: { status: set.status, changed: set.body?.changed, new_status: set.body?.status },
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
