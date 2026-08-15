// זריעה למדידת ה-UI של 0086 — שורת הרשימה אומרת מי הפיק את המסמך האחרון.
//
// אותן ארבע פניות של 0086, מפני שהמסך שנמדד כאן הוא הצרכן של אותה תשובה בדיוק,
// ומדידה על מצבים אחרים לא הייתה מודדת את הלבנה שנבנתה:
//   A — הפקה מהמסך דרך השער v8 (זהות + שם)
//   B — הפקה בצורת v7, ארגומנט אחד (null/null, ועדיין documents_count=1)
//   C — הפקה בידי מנהל שנמחק אחר כך (זהות בלי שם)
//   D — בלי מסמך כלל (null/null, documents_count=0)
//
// A ו-C נזרעים כאן דרך השער v8 עם טוקן אמיתי — כלומר «הפק» כפי שמנהל לוחץ
// עליו — ולא בהזרקת שורה ל-documents. B נזרע בצד ה-SQL (הקריאה בארגומנט אחד),
// ומחיקת חשבון 73 גם היא שם.
//
// הקליטה היא דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס.
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
// הטלפון הוא בדיוק עשר ספרות: קליטה שנדחית מחזירה case_id ריק, וכל המדידה
// שאחריה הייתה רצה על פניות שאינן קיימות. לכן זריקה, ולא המשך שקט.
const seeded = {};
const plan = [
  ["A", "0501230871", "בדיקה 0087 הפקה מהמסך", "עליה יופק מסמך מהמסך — הזהות נוסעת בשער v8"],
  ["B", "0501230872", "בדיקה 0087 הפקה בצורת v7", "עליה יופק מסמך בארגומנט אחד — בלי זהות"],
  ["C", "0501230873", "בדיקה 0087 מפיק שנמחק", "עליה יופק מסמך בידי חשבון שיימחק אחריו"],
  ["D", "0501230874", "בדיקה 0087 בלי מסמך", "לא יופק עליה מסמך כלל"],
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

// ── הפקה מהמסך על A (חשבון 72) ועל C (חשבון 73) ─────────────────────────────
const tokens = {};
for (const [key, email] of [["A", "qa0087main@more30.test"], ["C", "qa0087gone@more30.test"]]) {
  const login = await post(BASE + "/bkalot-clone-admin/login", { email, password: "Qa0087-produced!" });
  if (!login.body?.token) throw new Error(`login ${key} נכשלה: ` + JSON.stringify(login));
  tokens[key] = { token: login.body.token, admin: login.body.admin ?? null };
  const r = await post(BASE + "/bkalot-clone-admin/render", { case_id: String(seeded[key].case_id) },
                       { "x-admin-token": login.body.token });
  seeded[key].document_id = r.body?.document_id ?? null;
  seeded[key].produced_by = r.body?.produced_by ?? null;
  seeded[key].render_queued = r.body?.queued ?? null;
  if (seeded[key].document_id === null) throw new Error(`render ${key} לא החזירה document_id: ` + JSON.stringify(r));
}

const out = {
  admins: { main: tokens.A.admin, gone: tokens.C.admin },
  login_token_main: tokens.A.token,
  cases: seeded,
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
