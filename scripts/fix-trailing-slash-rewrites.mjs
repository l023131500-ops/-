/**
 * Add the missing { "source": "/x/" } rewrite for every mount that has a
 * "/x/:path*" rule but no explicit trailing-slash rule.
 *
 * Vercel's `:path*` does not match the empty segment a trailing slash leaves
 * behind, so "/x/" matches neither "/x" nor "/x/:path*" and lands on the
 * portal's SPA catch-all — the system's own root URL quietly serves a
 * different site. Measured with scripts/qa/trailing-slash-audit.mjs.
 *
 * The destination is taken from the mount's own :path* rule with ":path*"
 * removed, so each mount keeps pointing at its own deployment. Nothing is
 * invented and no mount that already has the rule is touched.
 *
 * Run: node scripts/fix-trailing-slash-rewrites.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, "../portal/vercel.dist.json");
const write = process.argv.includes("--write");

const raw = fs.readFileSync(file, "utf8");
const table = JSON.parse(raw);

// ⚠️ Edit the text, do not re-serialise. This file is written one rule per
// line; JSON.stringify(table, null, 2) reformats all 83 lines into 448 and
// turns a 19-line change into a 374-line diff nobody can review. Parsing is
// only used to decide *what* to insert.
const lines = raw.split(/\r?\n/);
const patched = [];
let added = 0;

for (const line of lines) {
  const m = /^(\s*)\{\s*"source":\s*"\/([a-z0-9-]+)\/:path\*"\s*,\s*"destination":\s*"([^"]+)"\s*\}(,?)\s*$/.exec(
    line,
  );
  if (m) {
    const [, indent, mount, destination, comma] = m;
    const already = table.rewrites.some((r) => r.source === `/${mount}/`);
    if (!already) {
      const dest = destination.replace(/:path\*$/, "");
      patched.push(`${indent}{ "source": "/${mount}/", "destination": "${dest}" },`);
      added++;
      console.log(`+ /${mount}/  ->  ${dest}`);
    }
    patched.push(line);
    continue;
  }
  patched.push(line);
}

const result = patched.join("\n");

// The output must still parse, and must only have grown by `added` rules.
const reparsed = JSON.parse(result);
const before = table.rewrites.length;
if (reparsed.rewrites.length !== before + added) {
  console.error(
    `refusing to write: expected ${before + added} rewrites, produced ${reparsed.rewrites.length}`,
  );
  process.exit(1);
}

console.log(`\n${added} rule(s) added, ${reparsed.rewrites.length} total (was ${before})`);
if (!write) {
  console.log("dry run — pass --write to apply");
  process.exit(0);
}
fs.writeFileSync(file, result, "utf8");
console.log(`written: ${file}`);
