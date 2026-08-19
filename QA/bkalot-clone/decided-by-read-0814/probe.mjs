// מדידת 0077 מעל HTTP — שלושת השדות חוזרים בקריאת הפנייה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה, כמו probe.mjs של 0076 ושל v7: קובץ .ps1
// בלי BOM נקרא כ-cp1255, והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על
// טקסט קיים.
//
// כל פנייה נוצרת דרך נתיב הקליטה הציבורי ולא בהזרקה למסד, כל לחיצה נעשית מאחורי
// שער הסשן, וכל קריאה נעשית דרך נתיב /case החי — כלומר נמדד מה שהמסך מקבל, לא מה
// שהמסד יודע.
//
// שני שלבים, כי הבקרה שקונה את הכרעות (1) ו-(2) דורשת מחיקת חשבון מנהל בין
// הקריאות: `node probe.mjs 1` ואחריו מחיקה ב-SQL ואז `node probe.mjs 2`.
import { writeFileSync, readFileSync } from "node:fs";

const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ADMIN = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin";

const stage = process.argv[2] === "2" ? 2 : 1;
const statePath = new URL("./_state.json", import.meta.url);
const outPath = new URL(`./http-stage${stage}.json`, import.meta.url);

const out = [];
const log = (label, value) => {
  out.push({ label, value });
  console.log("── " + label + "\n" + JSON.stringify(value, null, 2));
};

async function post(url, body, extra = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON,
      authorization: "Bearer " + ANON,
      ...extra,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// שלושת השדות נקראים דרך hasOwnProperty ולא דרך `?? null`: המדידה כאן היא שהמפתח
// קיים בתשובה ונושא null, ולא שהוא חסר. שדה חסר ושדה null נראים זהים בקריאה
// רגילה, וזו בדיוק ההבחנה שהפעימה הזו עומדת עליה.
const triple = (c) => ({
  has_decided_by: Object.hasOwn(c ?? {}, "decided_by"),
  has_decided_at: Object.hasOwn(c ?? {}, "decided_at"),
  has_decided_by_name: Object.hasOwn(c ?? {}, "decided_by_name"),
  decided_by: c?.decided_by ?? null,
  decided_at: c?.decided_at ?? null,
  decided_by_name: c?.decided_by_name ?? null,
  status: c?.status ?? null,
  updated_at: c?.updated_at ?? null,
});

const ADMIN_A = { email: "qa0077@more30.test", password: "Qa0077-identity!" };
const ADMIN_B = { email: "qa0077b@more30.test", password: "Qa0077b-second!" };

if (stage === 1) {
  const a = await post(INTAKE, {
    kind: "treatment",
    source: "form",
    full_name: "בדיקה 0077 א",
    phone: "0501230088",
    email: "test@more30.com",
    note: "מדידת 0077 — שלושת השדות בקריאת הפנייה",
    consent: "true",
    situation: "single_parent",
  });
  log("intake A (treatment)", a);

  const b = await post(INTAKE, {
    kind: "info",
    source: "form",
    full_name: "בדיקה 0077 ב (בקרה)",
    phone: "0501230089",
    email: "test@more30.com",
    note: "בקרה — לא נוגעים בה",
    consent: "true",
  });
  log("intake B (control)", b);

  const caseA = a.body?.case_id ?? a.body?.case?.id;
  const caseB = b.body?.case_id ?? b.body?.case?.id;

  const l1 = await post(ADMIN + "/login", ADMIN_A);
  log("login (מנהל ראשון)", { status: l1.status, ok: l1.body?.ok, admin: l1.body?.admin });
  const auth1 = { "x-admin-token": l1.body?.token ?? "" };

  // (א) המצב הראשון של הכרעה (2) של 0076 — «איש לא הכריע». זה מה שכל פנייה
  // חדשה מחזירה, ולפני הפעימה הזו הוא לא היה נראה מהמסך כלל.
  const before = await post(ADMIN + "/case", { id: String(caseA) }, auth1);
  log("case A לפני כל הכרעה — שלושת המפתחות קיימים ונושאים null", triple(before.body?.case));

  // המדידה שקונה את הפעימה: לחיצה אחת, והמסך יכול לומר מי סגר.
  const s1 = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "closed" }, auth1);
  log("set-status closed (מנהל ראשון)", s1);
  const after1 = await post(ADMIN + "/case", { id: String(caseA) }, auth1);
  log("case A אחרי — הזהות, החותמת והשם", triple(after1.body?.case));

  // הזהות היא נתון ולא קבוע: מנהל שני, ערך אחר, והשלושה מתחלפים יחד.
  const l2 = await post(ADMIN + "/login", ADMIN_B);
  log("login (מנהל שני)", { status: l2.status, ok: l2.body?.ok, admin: l2.body?.admin });
  const auth2 = { "x-admin-token": l2.body?.token ?? "" };
  const s2 = await post(ADMIN + "/set-status", { case_id: String(caseA), status: "rejected" }, auth2);
  log("set-status rejected (מנהל שני)", s2);
  const after2 = await post(ADMIN + "/case", { id: String(caseA) }, auth2);
  log("case A אחרי מנהל שני", triple(after2.body?.case));

  // (ב) הבקרה על הכרעה (5): תוספת בלבד — שאר הבלוקים לא זזו.
  const c = after2.body;
  log("בלי רגרסיה — שאר התשובה", {
    ok: c?.ok,
    rights: Array.isArray(c?.rights) ? c.rights.length : null,
    documents: Array.isArray(c?.documents) ? c.documents.length : null,
    templates: Array.isArray(c?.templates) ? c.templates.length : null,
    contact_full_name: c?.case?.contact?.full_name ?? null,
    contact_email_differs: c?.case?.contact_email_differs ?? null,
    kind: c?.case?.kind ?? null,
    to_email: c?.case?.to_email ?? null,
  });

  // (ג) הבקרה: פנייה שאיש לא נגע בה כלל.
  const cB = await post(ADMIN + "/case", { id: String(caseB) }, auth1);
  log("case B (בקרה) — שלושתם null", triple(cB.body?.case));

  writeFileSync(statePath, JSON.stringify({ caseA, caseB }, null, 2), "utf8");
  log("case ids", { caseA, caseB });
} else {
  // שלב 2 — הבקרה שקונה את הכרעות (1) ו-(2), על שורה אמיתית ולא בעדכון ישיר של
  // העמודה: חשבון המנהל השני נמחק בין השלבים. decided_by אינו FK (הכרעה (4) של
  // 0076), ולכן הזהות נשארת והשם הוא היחיד שנעלם. full_name הוא NOT NULL, ולכן
  // ה-null הזה אומר דבר אחד בדיוק: «החשבון שהכריע כאן אינו קיים עוד».
  const { caseA, caseB } = JSON.parse(readFileSync(statePath, "utf8"));
  const l1 = await post(ADMIN + "/login", ADMIN_A);
  log("login (מנהל ראשון)", { status: l1.status, ok: l1.body?.ok, admin: l1.body?.admin });
  const auth1 = { "x-admin-token": l1.body?.token ?? "" };

  const after = await post(ADMIN + "/case", { id: String(caseA) }, auth1);
  log("case A אחרי מחיקת החשבון שהכריע — הזהות נשארת, השם null", triple(after.body?.case));
  log("בלי רגרסיה — INNER JOIN היה מעלים את הפנייה", {
    ok: after.body?.ok,
    case_present: after.body?.case != null,
    rights: Array.isArray(after.body?.rights) ? after.body.rights.length : null,
  });

  const cB = await post(ADMIN + "/case", { id: String(caseB) }, auth1);
  log("case B (בקרה) — לא זזה", triple(cB.body?.case));
}

writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
