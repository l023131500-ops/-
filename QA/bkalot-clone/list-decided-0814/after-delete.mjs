// הבקרה שקונה את הכרעה (2), והיא זו שאין לה תחליף ברשימה: המנהל שהכריע נמחק.
//
// ב-0077 INNER JOIN היה מרוקן מסך של פנייה אחת. כאן הוא היה מוציא את הפנייה
// מרשימת העבודה כולה — כלומר פנייה של אדם אמיתי הייתה נעלמת מהמסך שדרכו מוצאים
// אותה, בלי ששום דבר ידווח שגיאה. לכן הנמדד כאן אינו «מה כתוב בשורה» אלא
// «האם השורה עדיין ברשימה».
import { writeFileSync } from "node:fs";

const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

const post = async (url, body, extra = {}) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON, ...extra },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const login = await post(ADMIN + "/login", { email: "qa0078a@more30.test", password: "Qa0078-list-a!" });
const auth = { "x-admin-token": login.body?.token ?? "" };

const list = await post(ADMIN + "/cases", { limit: 200 }, auth);
const rows = list.body?.cases ?? [];
const row = rows.find((c) => c.id === 107) ?? null;

const result = {
  status: list.status,
  total: list.body?.total,
  rows_returned: rows.length,
  case_107_still_in_list: row !== null,
  decided_by: row?.decided_by ?? null,
  decided_by_name_key_present: row ? Object.prototype.hasOwnProperty.call(row, "decided_by_name") : null,
  decided_by_name: row?.decided_by_name ?? null,
  decided_at: row?.decided_at ?? null,
  status_of_107: row?.status ?? null,
  control_108_still_in_list: rows.some((c) => c.id === 108),
};
console.log(JSON.stringify(result, null, 2));
writeFileSync(new URL("./http-after-delete.json", import.meta.url), JSON.stringify(result, null, 2), "utf8");
