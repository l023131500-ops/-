/**
 * Where in this repo does "מור מערכות תוכנה" live, and is there any source at
 * all for the two systems still serving it (kesef, tivuch)?
 *
 * Written because a PowerShell Select-String over the tree timed out at two
 * minutes: it walks node_modules. This skips the directories that make the
 * scan pointless and finishes in seconds.
 *
 * Run: node scripts/qa/find-brand-source.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKIP = new Set(["node_modules", ".git", "dist", ".next", ".vercel", "build", ".cache"]);
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|html|json|md|txt|vue|svelte)$/i;
const NEEDLE = /מור\s+מערכות\s+תוכנה/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(repo);
console.log(`${files.length} files scanned (node_modules, dist, .vercel excluded)\n`);

console.log('-- occurrences of "מור מערכות תוכנה" --');
let hits = 0;
for (const f of files) {
  let src;
  try {
    src = fs.readFileSync(f, "utf8");
  } catch {
    continue;
  }
  if (!NEEDLE.test(src)) continue;
  const lines = src.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (NEEDLE.test(l)) {
      console.log(`  ${path.relative(repo, f).replace(/\\/g, "/")}:${i + 1}  ${l.trim().slice(0, 110)}`);
      hits++;
    }
  });
}
if (!hits) console.log("  (none)");

// Is there any directory that could be the source of the two live offenders?
console.log("\n-- anything named kesef / tivuch / nadlan-pro --");
const named = files
  .map((f) => path.relative(repo, f).replace(/\\/g, "/"))
  .filter((p) => /(^|\/)(kesef|tivuch|nadlan-pro)/i.test(p));
if (named.length) named.slice(0, 25).forEach((p) => console.log(`  ${p}`));
else console.log("  (nothing)");

console.log(`\n${hits} line(s) carry the old brand in tracked-ish source`);
