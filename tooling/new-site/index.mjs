#!/usr/bin/env node
// more30 new-site generator.
// Scaffolds a new numbered app manifest and reminds you to register it in
// packages/config/src/registry.ts + supabase/seed/core_projects_seed.sql.
//
// Usage: node tooling/new-site/index.mjs <number> <slug> <category>
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [, , number, slug, category = "other"] = process.argv;
if (!number || !slug) {
  console.error("Usage: more30-new-site <number> <slug> <category>");
  process.exit(1);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = resolve(ROOT, "apps", `${number}-${slug}`);
if (existsSync(dir)) {
  console.error(`apps/${number}-${slug} already exists.`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

const manifest = {
  number, slug, name: slug, category, stage: "wip", live: false,
  repo: `l023131500-ops/${slug}`,
  basePath: `/${number}`,
  supabase: { project: "uhnrgujbdxhhmoxcjria", schema: null },
  deployTarget: "unknown",
  protected: false,
  source: "not-vendored",
};
writeFileSync(resolve(dir, "app.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`Created apps/${number}-${slug}/app.json`);
console.log("Next steps:");
console.log("  1. Add the entry to packages/config/src/registry.ts");
console.log("  2. Add the row to supabase/seed/core_projects_seed.sql");
console.log("  3. Fill in supabase.schema + deployTarget once verified.");
