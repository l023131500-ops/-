// זריעה למדידת הפריסה של 0088 בייצור — מסך הפנייה מצייר את רצף ההכרעות.
//
// שלוש הפניות של status-history-ui-0816/seed.mjs, מילה במילה ובאותה כוונה, מפני
// שהצד השני של אותה מדידה חייב לרוץ על אותם שלושה מצבים בדיוק:
//   X — רצף מלא: ארבע לחיצות שהן שלושה מעברים, בשני מנהלים, והשני נמחק אחריו.
//   Y — הוכרעה ואין לה יומן: decided_at מלא והיומן ריק (הדמיה מוצהרת של מצב
//       הפנייה שקדמה ל-0087; שורות היומן נמחקות בצד ה-SQL ולא כאן).
//   Z — לא נגעו בה: decided_at ריק והיומן ריק.
//
// המצב הרביעי של ה-UI — «השרת אינו מחזיר את יומן ההכרעות» — אינו ניתן למדידה
// בייצור בלי לגעת בפונקציה החיה, ולכן אינו נזרע כאן. הוא נמדד ב-8a577bc בעטיפת
// fetch בצד הלקוח, וההפרש מוצהר ולא נבלע.
//
// כל המעברים נכתבים דרך נתיב set-status שמאחורי השער עם טוקן אמיתי — «שינוי
// סטטוס» כפי שמנהל לוחץ עליו — ולא בהזרקת שורה ל-case_status_log. הקליטה היא
// דרך נתיב הציבור מעל HTTP עם מפתח anon, כמו מהטופס.
//
// נכתב ב-node ולא ב-PowerShell בכוונה (ps1-without-bom-parsed-as-cp1255).
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

const seeded = {};
const plan = [
  ["X", "0501230901", "בדיקה 0090 רצף מלא בייצור", "עליה ייעשו ארבע לחיצות בשני מנהלים"],
  ["Y", "0501230902", "בדיקה 0090 הוכרעה בלי יומן", "עליה תיעשה לחיצה אחת ושורת היומן שלה תימחק"],
  ["Z", "0501230903", "בדיקה 0090 לא נגעו בה", "לא תיעשה עליה ולו לחיצה אחת"],
];
// הטלפון הוא בדיוק עשר ספרות: קליטה שנדחית מחזירה case_id ריק, וכל המדידה
// שאחריה הייתה רצה על פניות שאינן קיימות. לכן זריקה, ולא המשך שקט.
for (const [key, phone, name, note] of plan) {
  const r = await post(BASE + "/bkalot-clone-intake", {
    kind: "treatment", source: "form", situation: "single_parent",
    full_name: name, phone, email: "test@more30.com", note, consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error(`intake ${key} לא החזירה case_id: ` + JSON.stringify(r));
  seeded[key] = { case_id: id, contact_id: r.body?.contact_id ?? null, rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null };
}

const tokens = {};
for (const [key, email] of [["main", "qa0090main@more30.test"], ["gone", "qa0090gone@more30.test"]]) {
  const login = await post(BASE + "/bkalot-clone-admin/login", { email, password: "Qa0090-history!" });
  if (!login.body?.token) throw new Error(`login ${key} נכשלה: ` + JSON.stringify(login));
  tokens[key] = { token: login.body.token, admin: login.body.admin ?? null };
}

// ── ארבע לחיצות על X, ולא שלוש ───────────────────────────────────────────────
// הלחיצה השנייה חוזרת על אותו סטטוס בדיוק. 0072 מחזירה ok:true עם changed:false,
// ו-0087 אינה כותבת עליה שורה (האילוץ case_status_log_is_a_change) — ולכן היומן
// אמור להראות שלושה מעברים ולא ארבעה. אילו נזרעו שלוש לחיצות בלבד, ההבחנה בין
// «כמה לחצו» ל«כמה מעברים היו» לא הייתה נמדדת כלל.
//
// שתי הראשונות בחשבון 82 והשתיים האחרונות ב-83 — מנהל אחד לוקח את הפנייה ואחר
// דוחה אותה, כלומר בדיוק המצב ששורה אחת על cases אינה יכולה להחזיק.
const clicks = [
  ["main", "in_progress"],
  ["main", "in_progress"],
  ["gone", "closed"],
  ["gone", "rejected"],
];
seeded.X.clicks = [];
for (const [who, status] of clicks) {
  const r = await post(BASE + "/bkalot-clone-admin/set-status",
    { case_id: String(seeded.X.case_id), status },
    { "x-admin-token": tokens[who].token });
  seeded.X.clicks.push({ who, status, http: r.status, ok: r.body?.ok ?? null, changed: r.body?.changed ?? null, log_id: r.body?.log_id ?? null });
}

// ── לחיצה אחת על Y ───────────────────────────────────────────────────────────
// שורת היומן שלה נמחקת בצד ה-SQL, ולא כאן.
const y = await post(BASE + "/bkalot-clone-admin/set-status",
  { case_id: String(seeded.Y.case_id), status: "closed" },
  { "x-admin-token": tokens.main.token });
seeded.Y.click = { status: "closed", http: y.status, ok: y.body?.ok ?? null, changed: y.body?.changed ?? null, log_id: y.body?.log_id ?? null };

const out = {
  admins: { main: tokens.main.admin, gone: tokens.gone.admin },
  login_token_main: tokens.main.token,
  cases: seeded,
};
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
