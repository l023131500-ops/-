// זריעה לפעימת הפריסה: פנייה אחת שעליה יופק מסמך מהמסך החי.
//
// דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח anon כמו מהטופס)
// ולא בהזרקה ל-cases — מה שנמדד הוא בדיוק מה שהמוצר עושה.
//
// הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות
// והציגה אפס כאילו זו תשובה. לכן זריקה על case_id ריק, ולא המשך שקט.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כ-cp1255).
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";

const res = await fetch(INTAKE, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
  body: JSON.stringify({
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: "בדיקת פריסה מי הפיק", phone: "0501230802", email: "test@more30.com",
    note: "יופק עליה מסמך מהמסך החי, כדי לראות שהשורה הגיעה לייצור", consent: "true",
  }),
});
const body = await res.json().catch(() => null);
const id = body?.case_id ?? body?.case?.id ?? null;
if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));

const out = { case_id: id, rights: body?.rights_count ?? null, status: body?.status ?? null, queued: body?.queued ?? null, contact_id: body?.contact_id ?? null };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
