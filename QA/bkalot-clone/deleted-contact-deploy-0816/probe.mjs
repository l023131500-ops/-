// probe.mjs — נכתב אחרי classify.mjs ורץ פעמיים בדיוק כפי שהוא (לפני הפריסה
// ואחריה), בלי שינוי ביניהן. הסיווג לשלוש הקבוצות נקבע ב-classify.json ולא כאן.
//
// שימוש:  node probe.mjs before    |    node probe.mjs after
import { readFileSync, writeFileSync } from "node:fs";

const phase = process.argv[2];
if (phase !== "before" && phase !== "after") throw new Error("usage: node probe.mjs before|after");

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");

// שלוש הקבוצות, כפי שיצאו מ-classify.json ולא כפי שהונחו מראש.
const NEW = [
  "איש הקשר נמחק",
  "רק הזהות שלה הוסרה מהמאגר",
  'Object.hasOwn(c, "contact")',
  "const who = c.contact?.full_name",
  "אמר שאין שם, ולא למה אין",
  "שרת ישן מלפני 0088",
  "הכותרת היא זו שנשארה",
  "האחת «המשך לטפל», השנייה «רענן»",
  "returning id של ה-upsert",
  "שנולדה בלעדיו",
];
// ⚠️ «מי הכריע» סווג מלכתחילה כמועמד בקרה, ונמדד ב-classify כ-13 מול 14 —
// התיעוד החדש מזכיר אותו בשמו. מסומן שגדל ונספר כבקרה היה מפיל את old_unchanged,
// ולכן הועבר ל-DIFF לפני הריצה הראשונה ולא אחריה.
const DIFF = [
  "Object.hasOwn",
  "— ללא איש קשר —",
  "ללא איש קשר",
  's.className = "stale"',
  "הפנייה עצמה נשמרה במלואה",
  "0088",
  "מי הכריע",
];
const CONTROL = JSON.parse(readFileSync(new URL("./classify.json", import.meta.url), "utf8"))
  .rows.map((r) => r.marker)
  .filter((m) => !NEW.includes(m) && !DIFF.includes(m));

const URLS = [
  "https://more30.com/bkalot-studio/admin",
  "https://more30.com/bkalot-studio/admin/",
];
const CONTROL_URLS = [
  "https://more30.com/bkalot-studio/",
  "https://more30.com/",
];

const count = (h, n) => h.split(n).length - 1;
const get = async (u) => {
  const r = await fetch(u + (u.includes("?") ? "&" : "?") + "cb=" + phase + Math.random().toString(36).slice(2), {
    headers: { "cache-control": "no-cache" },
  });
  return { status: r.status, body: await r.text() };
};

const out = { phase, src_bytes: Buffer.byteLength(SRC, "utf8"), urls: {}, control_urls: {} };

for (const u of URLS) {
  const { status, body } = await get(u);
  const nw = NEW.map((m) => ({ m, src: count(SRC, m), live: count(body, m) }));
  const df = DIFF.map((m) => ({ m, src: count(SRC, m), live: count(body, m) }));
  const ct = CONTROL.map((m) => ({ m, src: count(SRC, m), live: count(body, m) }));
  out.urls[u] = {
    status,
    bytes: Buffer.byteLength(body, "utf8"),
    new_zero_in_live: nw.every((r) => r.live === 0),
    new_equals_source: nw.every((r) => r.live === r.src),
    diff_below_source: df.every((r) => r.live < r.src),
    diff_equals_source: df.every((r) => r.live === r.src),
    old_unchanged: ct.every((r) => r.live === r.src),
    // תו החלפה וכפל-קידוד — deployed-html-double-encoded-cp1255
    replacement_chars: count(body, "\uFFFD"),
    double_encoded: count(body, "×"),
    new: nw,
    diff: df,
    control_mismatches: ct.filter((r) => r.live !== r.src),
  };
}
for (const u of CONTROL_URLS) {
  const { status, body } = await get(u);
  out.control_urls[u] = { status, bytes: Buffer.byteLength(body, "utf8") };
}

writeFileSync(new URL(`./http-${phase}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
for (const [u, v] of Object.entries(out.urls)) {
  console.log(u, v.status, v.bytes,
    "new_zero=" + v.new_zero_in_live, "new_eq=" + v.new_equals_source,
    "diff_below=" + v.diff_below_source, "diff_eq=" + v.diff_equals_source,
    "old_unchanged=" + v.old_unchanged, "repl=" + v.replacement_chars, "dbl=" + v.double_encoded);
  if (v.control_mismatches.length) console.log("  MISMATCH", JSON.stringify(v.control_mismatches));
}
for (const [u, v] of Object.entries(out.control_urls)) console.log("control", u, v.status, v.bytes);
