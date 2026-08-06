/**
 * The mthbram landing page states four lesson counts as fact:
 *
 *   שיעורי תורה 2,400+ · חברותות 850+ · הרצאות 1,200+ · קורסים 180+
 *
 * They are string literals in src/components/CategoriesSection.tsx. Nothing
 * derives them and nothing keeps them true. Together they tell a visitor the
 * catalogue holds over 4,630 lessons.
 *
 * This asks the database what is actually there, through the same PostgREST
 * endpoint and publishable key the site itself uses, so the numbers come from
 * the same place the site's own data does.
 *
 * Counts are read from the Content-Range header with Prefer: count=exact —
 * not by fetching rows and measuring the array, which PostgREST silently caps
 * at its max-rows (the mistake that once made chizukim report 1,000 for an
 * archive of 1,138).
 *
 * Run: node scripts/qa/mthbram-category-counts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "../../apps/21-mthbram/.env");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const REST = `${URL_}/rest/v1`;
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" };

/** Exact row count for a PostgREST filter, or null if the query was refused. */
async function count(filter = "") {
  const res = await fetch(`${REST}/lessons?select=id&limit=1${filter}`, { headers: h });
  if (!res.ok) {
    console.log(`  ! ${res.status} ${(await res.text()).slice(0, 120)}`);
    return null;
  }
  const n = Number(res.headers.get("content-range")?.split("/")[1]);
  return Number.isFinite(n) ? n : null;
}

const CLAIMED = [
  { label: "שיעורי תורה", claim: 2400 },
  { label: "חברותות", claim: 850 },
  { label: "הרצאות", claim: 1200 },
  { label: "קורסים", claim: 180 },
];

console.log("-- what the database holds --");
const total = await count();
if (total === null) {
  console.log("\nNOT AVAILABLE — the lessons table could not be read with the site's own key.");
  process.exit(2);
}
console.log(`lessons, all rows: ${total}`);

// Whatever column carries the category, find it rather than assuming.
const sample = await fetch(`${REST}/lessons?select=*&limit=1`, { headers: h }).then((r) => r.json());
const cols = sample.length ? Object.keys(sample[0]) : [];
console.log("columns:", cols.join(", ") || "(no rows)");

const catCol = ["category", "lesson_type", "type", "kind"].find((c) => cols.includes(c));
console.log("category column:", catCol ?? "(none found)");

if (catCol) {
  const rows = [];
  for (let offset = 0; offset < total; offset += 1000) {
    const res = await fetch(`${REST}/lessons?select=${catCol}&limit=1000&offset=${offset}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) break;
    rows.push(...(await res.json()));
  }
  const tally = new Map();
  for (const r of rows) tally.set(r[catCol] ?? "(null)", (tally.get(r[catCol] ?? "(null)") ?? 0) + 1);
  console.log("\nactual distribution:");
  for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  ${String(k).padEnd(28)} ${v}`);
}

const claimedTotal = CLAIMED.reduce((n, c) => n + c.claim, 0);
console.log("\n-- claim vs reality --");
for (const c of CLAIMED) console.log(`  ${c.label.padEnd(14)} page says ${c.claim}+`);
console.log(`  ${"TOTAL CLAIMED".padEnd(14)} ${claimedTotal}+`);
console.log(`  ${"ACTUAL ROWS".padEnd(14)} ${total}`);

console.log(
  "\nVERDICT:",
  total >= claimedTotal
    ? "the claimed total is supported by the row count"
    : `OVERSTATED — the page claims over ${claimedTotal} lessons; the table holds ${total}`,
);
process.exit(total >= claimedTotal ? 0 : 1);
