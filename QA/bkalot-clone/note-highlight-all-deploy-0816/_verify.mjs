// _verify.mjs — מכריע את הפריסה משלוש ראיות, ואינו מסתפק באף אחת מהן לבדה.
//
// (א) dist_equals_live: לפני הפריסה, כל סימן חייב להחזיר מהכתובת החיה בדיוק
//     את ספירת ה-dist שנפרס בפעם הקודמת. זו הבקרה היחידה שה-staging אינו
//     יכול לזייף — classify.json משווה שני קבצים מקומיים ואינו נוגע ברשת.
// (ב) NEW/REMOVED/DIFF: כל סימן חייב להתהפך מספירת ה-dist הישן אל ספירת המקור,
//     ובשתי הכתובות (עם לוכסן ובלעדיו).
// (ג) CONTROL: לא זז ולו סימן אחד.
import { readFileSync, writeFileSync } from "node:fs";

const R = (f) => JSON.parse(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"));
const cls = R("classify.json"), before = R("live-before.json"), after = R("live-after.json");

const URLS = Object.keys(before.urls);
const flat = {};
for (const g of Object.keys(cls.groups)) for (const m of cls.groups[g]) flat[m.key] = { ...m, group: g };

const fails = [], rows = [];
for (const [key, m] of Object.entries(flat)) {
  for (const u of URLS) {
    const b = before.urls[u].markers[key], a = after.urls[u].markers[key];
    // (א) הייצור שלפני הפריסה הוא ה-dist שנפרס בפעם הקודמת.
    if (b !== m.dist) fails.push(`dist_equals_live ${key} @${u}: live-before ${b} ≠ dist ${m.dist}`);
    // (ב)+(ג) הייצור שאחרי הפריסה הוא המקור.
    if (a !== m.src) fails.push(`src_equals_live ${key} @${u}: live-after ${a} ≠ src ${m.src}`);
  }
  rows.push({ key, group: m.group, dist: m.dist, src: m.src,
    before: URLS.map((u) => before.urls[u].markers[key]),
    after: URLS.map((u) => after.urls[u].markers[key]) });
}

// deployed-html-double-encoded-cp1255 — 200 בריא וגוף מקולקל נראים אותו הדבר.
for (const w of [["before", before], ["after", after]])
  for (const u of URLS) {
    const s = w[1].urls[u];
    if (s.status !== 200) fails.push(`${w[0]} ${u}: status ${s.status}`);
    if (s.replacement_chars !== 0) fails.push(`${w[0]} ${u}: ${s.replacement_chars} תווי החלפה`);
    if (s.times_char !== 0) fails.push(`${w[0]} ${u}: ${s.times_char} × בגוף`);
  }
// שתי הכתובות חייבות להגיש את אותו קובץ ממש.
for (const w of [["before", before], ["after", after]]) {
  const m = URLS.map((u) => w[1].urls[u].md5);
  if (new Set(m).size !== 1) fails.push(`${w[0]}: שתי הכתובות בשני MD5 ${m.join(" / ")}`);
}

const out = {
  verdict: fails.length === 0 ? "PASS" : "FAIL",
  fails,
  counts: Object.fromEntries(Object.keys(cls.groups).map((g) => [g, cls.groups[g].length])),
  files: { src: cls.src, dist: cls.dist },
  live: Object.fromEntries(URLS.map((u) => [u, {
    before: { bytes: before.urls[u].bytes, md5: before.urls[u].md5 },
    after: { bytes: after.urls[u].bytes, md5: after.urls[u].md5 },
  }])),
  rows,
};
writeFileSync(new URL("./_results.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(out.verdict, `| fails ${fails.length} | סימנים ${rows.length}`);
for (const f of fails) console.log("  ✗", f);
