// seed.mjs — זריעה דרך נתיב המוצר: bkalot-clone-intake מעל HTTP עם מפתח anon,
// בדיוק כמו מהטופס. ארבעה טלפונים שונים בכוונה — הקליטה מאתרת איש קשר לפי טלפון.
//
// הזריעה היא היפוך מלא ולא ארבע שורות: created_at עולה, ואז ההכרעה בסדר הפוך,
// כך שאין תחילית משותפת שמאחוריה תקלת סדר יכולה להסתתר, והפנייה שאיש לא הכריע
// עוברת מהראש לזנב — הדרך היחידה לראות nulls last על המסך.
import { writeFileSync } from "node:fs";

const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON_KEY = process.env.CLONE_ANON;

const rows = [
  { full_name: "QA מיון בייצור א", phone: "0501110001" },
  { full_name: "QA מיון בייצור ב", phone: "0501110002" },
  { full_name: "QA מיון בייצור ג", phone: "0501110003" },
  { full_name: "QA מיון בייצור ד", phone: "0501110004" },
];

const out = [];
for (const r of rows) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON_KEY, authorization: "Bearer " + ANON_KEY },
    body: JSON.stringify({
      kind: "info",
      source: "form",
      full_name: r.full_name,
      phone: r.phone,
      email: "",
      note: "QA sort-deploy-0814",
      consent: "true",
    }),
  });
  const body = await res.json();
  out.push({ phone: r.phone, status: res.status, body });
  console.log(r.phone, res.status, JSON.stringify(body));
}
writeFileSync("QA/bkalot-clone/sort-deploy-0814/_seed.json", JSON.stringify(out, null, 2), "utf8");
