// זריעה למדידת הענף שנרשם שש פעמים ברציפות כ«לא נמדד»: ה-coalesce של הכרעה (7)
// ב-0096, על פנייה שאין לה שם איש קשר.
//
// הקליטה דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס — ולא הזרקת שורה.
// זה חשוב כאן במיוחד: הטענה שנבדקת היא שהענף מגיע ממצב אמיתי בייצור, ולכן
// הפנייה חייבת להיוולד בדרך שבה נולדות פניות אמיתיות.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
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

const out = {};

// ⚠️ בקרת הישָׁגוּת ראשונה: הנתיב הציבורי עצמו אינו מסוגל ליצור איש קשר בלי שם.
// זה נמדד ולא הונח — אחרת אפשר היה לקרוא את כל הצעד כמו «הענף אינו קיים».
const noName = await post(FN + "/bkalot-clone-intake", {
  kind: "info", source: "form",
  full_name: "   ", phone: "0501230044",
  note: "בקרה: קליטה בלי שם", consent: "true",
});
out.intake_without_a_name_is_refused = {
  status: noName.status, ok: noName.body?.ok ?? null, error: noName.body?.error ?? null,
};

// הפנייה עצמה — עם שם, כי כך היא נולדת. השם יוסר אחר כך בדרך שהמסד עצמו מתיר.
const intake = await post(FN + "/bkalot-clone-intake", {
  kind: "info", source: "form",
  full_name: "אברהם ישראלי", phone: "0501230011",
  email: "test@more30.com", note: "פנייה לבדיקת הענף של איש קשר שנמחק",
  consent: "true",
});
const case_id = intake.body?.case_id ?? null;
if (case_id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify(intake));
out.intake = {
  status: intake.status, case_id,
  contact_id: intake.body?.contact_id ?? null,
  queued: intake.body?.queued ?? null,
};

writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
