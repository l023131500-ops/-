// זריעה למדידת הלבנה — העמוד שנשאר מעבר לסוף הרשימה.
//
// PAGE במסך הוא 20, ולכן צריך 21 פניות שעונות על אותו סינון כדי שיהיה עמוד
// שני עם שורה אחת בדיוק. הפנייה הזו היא שתטופל, וברגע שהיא יוצאת מהסינון
// total יורד ל-20 ו-offset נשאר 20 — בדיוק המצב שנמדד.
//
// kind=info ולא treatment בכוונה: info אינו מחבר זכויות (case_rights), ולכן
// 21 קליטות אינן גוררות ~880 שורות שיהיה צריך לגלגל אחורה. הפער הנמדד אינו
// נוגע לזכויות כלל.
//
// הטלפון הוא בדיוק עשר ספרות אחרי הנרמול — תקלת 0078: אורך אחר נדחה בקליטה,
// case_id חוזר null, וכל המדידה שאחריו רצה על פנייה שאינה קיימת.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כאן כ-cp1255
// והעברית שבתוכו נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט קיים.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

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

// מדד ההתחלה נמסר בשורת הפקודה, כדי שהריצה השנייה (פנייה בודדת נוספת, אחרי
// שהראשונה טופלה ויצאה מהסינון) לא תתנגש בטלפונים של הראשונה.
const from = Number(process.argv[2] ?? 1);
const count = Number(process.argv[3] ?? 21);

const seeded = [];
for (let i = from; i < from + count; i++) {
  const n = String(i).padStart(2, "0");
  const r = await post(FN + "/bkalot-clone-intake", {
    kind: "info", source: "form", situation: "single_parent",
    full_name: `בדיקת דפדוף ${n}`, phone: `05471000${n}`,
    email: `pager${n}@more30.com`, note: "מה שהאזרח כתב בטופס", consent: "true",
  });
  const id = r.body?.case_id ?? r.body?.case?.id ?? null;
  if (id === null) throw new Error(`intake לא החזירה case_id עבור ${n}: ` + JSON.stringify(r));
  seeded.push({ n, case_id: id, contact_id: r.body?.contact_id ?? null,
                rights: r.body?.rights_count ?? null, queued: r.body?.queued ?? null,
                status: r.body?.status ?? null });
}

const file = new URL("./seed.json", import.meta.url);
const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { cases: [] };
const out = { cases: [...prev.cases, ...seeded] };
writeFileSync(file, JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify({ added: seeded.length, total: out.cases.length,
                             ids: seeded.map((s) => s.case_id),
                             queued: [...new Set(seeded.map((s) => s.queued))],
                             rights: [...new Set(seeded.map((s) => s.rights))] }, null, 2));
