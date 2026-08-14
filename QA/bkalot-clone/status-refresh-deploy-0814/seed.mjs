// זריעה לפעימת הפריסה. שתי פניות דרך נתיב הקליטה הציבורי מעל HTTP
// (bkalot-clone-intake, מפתח anon כמו מהטופס) ולא בהזרקה ל-cases:
//   A — הפנייה שכפתור «שינוי סטטוס» יילחץ עליה על הכתובת החיה.
//   B — הבקרה. לא נוגעים בה, והיא חייבת להישאר «חדשה» עד הסוף; בלעדיה כל הבדל
//       שנראה ברשימה יכול לבוא ממקום אחר.
//
// שני טלפונים שונים בכוונה — intake מאתר איש קשר לפי טלפון, ושתי פניות מאותו
// טלפון היו נותנות איש קשר אחד.
//
// זריקה על case_id ריק ולא המשך שקט — תקלת 0078, שם המדידה שאחריה רצה על
// פניות שאינן קיימות והציגה אפס כאילו זו תשובה.
import { readFileSync, writeFileSync } from "node:fs";

const root = "C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/";
const ANON = readFileSync(root + "index.html", "utf8").match(/ANON_KEY\s*=\s*"([^"]+)"/)[1];
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";

const mk = async (name, note, phone) => {
  const res = await fetch(INTAKE, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify({
      kind: "treatment", source: "form", situation: "single_parent",
      full_name: name, phone, email: "test@more30.com", note, consent: "true",
    }),
  });
  const body = await res.json().catch(() => null);
  const id = body?.case_id ?? body?.case?.id ?? null;
  if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));
  return { id, rights: body?.rights_count ?? null, status: body?.status ?? null };
};

const a = await mk("בדיקה פריסה A", "הפנייה שהסטטוס שלה ישונה מהמסך החי", "0501230201");
const b = await mk("בדיקה פריסה B", "בקרה — לא נוגעים בה", "0501230202");

const out = { case_a: a, case_b: b };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
