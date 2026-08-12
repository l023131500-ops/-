#!/usr/bin/env node
// ============================================================================
// Read the source of a DEPLOYED Supabase edge function that has no source on
// disk. The Management API returns the deployed ESZIP2.3 bundle; the original
// (transpiled) index.ts sits at the front of it, before the inlined deps.
//
// Usage:
//   node scripts/qa/read-deployed-function-source.mjs <projectRef> <slug> [outFile]
//
// PAT comes from SUPABASE_ACCESS_TOKEN in the environment (core.secrets holds
// the value; never commit it).
// ============================================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [ref, slug, outFile] = process.argv.slice(2);
if (!ref || !slug) {
  console.error("usage: read-deployed-function-source.mjs <projectRef> <slug> [outFile]");
  process.exit(2);
}
const pat = process.env.SUPABASE_ACCESS_TOKEN;
if (!pat) {
  console.error("SUPABASE_ACCESS_TOKEN is not set");
  process.exit(2);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/functions/${slug}/body`,
  { headers: { Authorization: `Bearer ${pat}` } },
);
if (!res.ok) {
  console.error(`${res.status} ${await res.text()}`);
  process.exit(1);
}
const raw = Buffer.from(await res.arrayBuffer());
const text = raw.toString("utf8");

// The handler is the first thing in the bundle: from its first `import` to the
// sourcemap that closes it. Everything after is inlined third-party code.
const start = text.indexOf("import ");
const cuts = [
  text.indexOf('{"version":3', start),
  text.indexOf("/* esm.sh - @supabase/supabase-js", start),
  text.indexOf("// Copyright 2018-2022 the Deno authors", start),
].filter((i) => i > start);
const end = cuts.length ? Math.min(...cuts) : Math.min(start + 20000, text.length);
const src = text.slice(start, end);

console.log(`bundle ${raw.length} bytes -> handler ${src.length} bytes`);
if (outFile) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, src, "utf8");
  console.log(`wrote ${outFile}`);
} else {
  console.log("\n" + src);
}
