// הכנת המדידה בייצור — שתי פניות דרך נתיב הקליטה הציבורי (bkalot-clone-intake,
// מפתח anon כמו מהטופס) ולא בהזרקה למסד.
//
//   node seed.mjs
//
// הסקריפט אינו מכריע דבר ואינו נוגע במסך: שתי השורות נשארות status=new, וכל
// שינוי שייראה אחר כך הוא תוצאה של לחיצה בדפדפן על הכתובת החיה. זה מה שקונה
// את הפעימה — פריסה, לא קוד.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק.
import { writeFileSync } from "node:fs";

const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";

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

const caseHuman = await mk("בדיקה 0080 אדם", "מדידת פריסה — תיסגר בלחיצה בדפדפן", "0501230091");
const caseTrigger = await mk("בדיקה 0080 טריגר", "מדידת פריסה — תזוז בהפקת מסמך", "0501230092");

const out = { case_human: caseHuman, case_trigger: caseTrigger };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
