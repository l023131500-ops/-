// scripts/qa/smel-deploy-nadlan-smart-research.mjs
// core.issues #158 — פריסת nadlan-smart-research (מערכת 12, smel) דרך Supabase Management API.
// הפונקציה חיה בפרויקט csjekrvukbdznetsrodj, שאין לו CLI ואין לו Lovable מכאן.
// verify_jwt נשמר כפי שהוא בייצור (false) — הפריסה משנה קוד בלבד.
//
// שימוש:  node scripts/qa/smel-deploy-nadlan-smart-research.mjs           (dry-run: מדפיס מה יישלח)
//         node scripts/qa/smel-deploy-nadlan-smart-research.mjs --deploy  (פריסה בפועל)
// דורש SUPABASE_ACCESS_TOKEN בסביבה (נשמר ב-core.secrets, לא בקוד).

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REF = "csjekrvukbdznetsrodj";
const SLUG = "nadlan-smart-research";
const VERIFY_JWT = false; // כפי שהוא בייצור לפני הפריסה

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "../../apps/13-property-identity/smart-research/functions", SLUG);
const FILES = ["index.ts", "engine.ts", "geo.ts", "sources.ts"];

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN missing");
  process.exit(2);
}

const form = new FormData();
form.append(
  "metadata",
  new Blob(
    [
      JSON.stringify({
        name: SLUG,
        entrypoint_path: "index.ts",
        verify_jwt: VERIFY_JWT,
      }),
    ],
    { type: "application/json" },
  ),
);

for (const f of FILES) {
  const body = await readFile(path.join(SRC, f), "utf8");
  console.log(`  ${f.padEnd(12)} ${String(body.length).padStart(6)} chars`);
  form.append("file", new Blob([body], { type: "application/typescript" }), f);
}

if (!process.argv.includes("--deploy")) {
  console.log(`\ndry-run. would POST ${FILES.length} files to project ${REF}, slug ${SLUG}, verify_jwt=${VERIFY_JWT}`);
  process.exit(0);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${SLUG}`,
  { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form },
);
const text = await res.text();
console.log(`\nHTTP ${res.status}`);
console.log(text.slice(0, 1200));
process.exit(res.ok ? 0 : 1);
