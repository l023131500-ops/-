// Measures what /library actually ships to the phone, and what each candidate
// index would ship instead. Run from apps/40-gannenet.
import { readFileSync } from "node:fs";

const mashlima = JSON.parse(readFileSync("content/mashlima.json", "utf8"));
const regular = JSON.parse(readFileSync("content/regular.json", "utf8"));

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

const kb = (s) => (Buffer.byteLength(s, "utf8") / 1024).toFixed(1) + " kB";
const all = [...mashlima, ...regular];

const hay = all.map(searchTextOf);
const rowsNoHay = all.map((l) => ({
  id: l.id, title: l.title, month: l.month || l.meta, domain: l.tags?.domain || "",
  category: l.topic || "", sub: (l.summary || l.objectives?.[0] || "").slice(0, 90),
}));

console.log("lessons              :", all.length);
console.log("content JSON on disk :", kb(readFileSync("content/mashlima.json", "utf8") + readFileSync("content/regular.json", "utf8")));
console.log("haystack (all fields):", kb(JSON.stringify(hay)));
console.log("rows without haystack:", kb(JSON.stringify(rowsNoHay)));

// A token index instead of substrings, for comparison only.
const tokens = hay.map((h) => Array.from(new Set(h.split(/[^֐-׿a-z0-9]+/).filter((w) => w.length > 1))));
console.log("unique tokens/lesson :", kb(JSON.stringify(tokens)), "(" + Math.round(tokens.reduce((a, t) => a + t.length, 0) / tokens.length) + " avg)");
