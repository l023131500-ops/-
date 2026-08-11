// Does the served index answer every query exactly as the in-page haystack did?
// Old /library: searchTextOf(lesson).includes(q), computed in the browser.
// New /library: index[lesson.id].includes(q), where index comes off the route.
// Run from apps/40-gannenet with the production server up.
import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:3140/gannenet";
const mashlima = JSON.parse(readFileSync("content/mashlima.json", "utf8"));
const regular = JSON.parse(readFileSync("content/regular.json", "utf8"));
const all = [...mashlima, ...regular];

const normalize = (raw) =>
  (raw || "").replace(/[֑-ׇ]/g, "").replace(/[׳״'"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

function searchTextOf(lesson) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  Object.entries(lesson).forEach(([k, v]) => { if (k !== "id") walk(v); });
  return out.map(normalize).filter(Boolean).join("\n");
}

const served = await (await fetch(BASE + "/api/library-index")).json();

// 1. Every lesson present, byte-identical to what the page used to compute.
let missing = 0, differing = 0;
for (const l of all) {
  if (!(l.id in served)) { missing++; continue; }
  if (served[l.id] !== searchTextOf(l)) differing++;
}
console.log("lessons                :", all.length);
console.log("served entries         :", Object.keys(served).length);
console.log("missing from index     :", missing);
console.log("differing from old text:", differing);

// 2. Same result set for a spread of real terms — from pointed body text, from
// titles, from a term in no lesson at all.
const terms = ["ציפור", "מנורה", "בראשית", "שבת", "פרשת", "ריקוד", "טבע", "זריעה", "קרמבו", "אווז"];
let mismatched = 0;
for (const t of terms) {
  const q = normalize(t);
  const oldHits = all.filter((l) => searchTextOf(l).includes(q)).map((l) => l.id).sort();
  const newHits = all.filter((l) => (served[l.id] || "").includes(q)).map((l) => l.id).sort();
  const same = oldHits.join(",") === newHits.join(",");
  if (!same) mismatched++;
  console.log(`  "${t}" → ${oldHits.length} lessons  ${same ? "same" : "MISMATCH (" + newHits.length + ")"}`);
}
console.log("term mismatches        :", mismatched);
process.exit(missing + differing + mismatched === 0 ? 0 : 1);
