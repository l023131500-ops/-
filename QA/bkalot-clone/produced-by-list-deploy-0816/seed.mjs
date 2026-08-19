// זריעה למדידת הפריסה — ארבע פניות, ארבעת מצבי «הופק על ידי» בשורת הרשימה.
//
// אותם ארבעה מצבים של produced-by-list-ui-0816, מפני שהמסך שנמדד כאן הוא אותו
// מסך בדיוק — ההבדל היחיד הוא שהוא מוגש מ-more30.com ולא משרת סטטי מקומי:
//   A — הפקה בלחיצה על המסך החי (זהות + שם). לא נזרעת כאן במתכוון.
//   B — הפקה בצורת v7, ארגומנט אחד (null/null, ועדיין documents_count=1)
//   C — הפקה בידי מנהל שנמחק אחר כך (זהות בלי שם)
//   D — בלי מסמך כלל (null/null, documents_count=0)
//
// C נזרע כאן דרך השער v8 עם טוקן אמיתי — «הפק» כפי שמנהל לוחץ עליו — ולא
// בהזרקת שורה ל-documents. B ומחיקת חשבון 75 נעשים בצד ה-SQL.
//
// A נשאר ריק בכוונה: הוא נוצר בלחיצה על הכתובת החיה, וזו הראיה שהפריסה קנתה.
//
// הקליטה היא דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1 בלי BOM נקרא כאן כ-cp1255).
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
  ["A", "0501230881", "בדיקה 0088 הפקה בייצור", "עליה יופק מסמך בלחיצה על המסך החי"],
  ["B", "0501230882", "בדיקה 0088 הפקה בצורת v7", "עליה יופק מסמך בארגומנט אחד — בלי זהות"],
  ["C", "0501230883", "בדיקה 0088 מפיק שנמחק", "עליה יופק מסמך בידי חשבון שיימחק אחריו"],
  ["D", "0501230884", "בדיקה 0088 בלי מסמך", "לא יופק עליה מסמך כלל"],
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

// ── התחברות ─────────────────────────────────────────────────────────────────
// הטוקן של 74 חוזר החוצה כדי שהדפדפן ייכנס איתו אל המסך החי, ולא כדי לעקוף
// את מסך ההתחברות: המדידה עצמה נעשית אחרי login אמיתי בדפדפן.
const tokens = {};
for (const [key, email] of [["A", "qa0088main@more30.test"], ["C", "qa0088gone@more30.test"]]) {
  const login = await post(BASE + "/bkalot-clone-admin/login", { email, password: "Qa0088-produced!" });
  if (!login.body?.token) throw new Error(`login ${key} נכשלה: ` + JSON.stringify(login));
  tokens[key] = { token: login.body.token, admin: login.body.admin ?? null };
}

// ── הפקה על C בלבד, דרך השער v8 ─────────────────────────────────────────────
{
  const r = await post(BASE + "/bkalot-clone-admin/render", { case_id: String(seeded.C.case_id) },
                       { "x-admin-token": tokens.C.token });
  seeded.C.document_id = r.body?.document_id ?? null;
  seeded.C.produced_by = r.body?.produced_by ?? null;
  seeded.C.render_queued = r.body?.queued ?? null;
  if (seeded.C.document_id === null) throw new Error("render C לא החזירה document_id: " + JSON.stringify(r));
}

const out = {
  admins: { main: tokens.A.admin, gone: tokens.C.admin },
  login_token_main: tokens.A.token,
  cases: seeded,
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
