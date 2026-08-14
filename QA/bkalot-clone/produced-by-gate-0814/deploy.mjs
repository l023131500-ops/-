// Deploys supabase/functions/bkalot-clone-admin/index.ts to the live project (v8).
// verify_jwt is passed explicitly on purpose: the deploy SETS it, and omitting
// it can silently open a gated function.
import { readFile } from "node:fs/promises";

const REF = "uhnrgujbdxhhmoxcjria";
const SLUG = "bkalot-clone-admin";
const PAT = process.env.SB_PAT;
if (!PAT) throw new Error("set SB_PAT");

const src = await readFile(
  new URL("../../../supabase/functions/bkalot-clone-admin/index.ts", import.meta.url),
);

const fd = new FormData();
fd.append(
  "metadata",
  new Blob(
    [JSON.stringify({ name: SLUG, entrypoint_path: "index.ts", verify_jwt: true })],
    { type: "application/json" },
  ),
);
fd.append("file", new Blob([src], { type: "application/typescript" }), "index.ts");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${SLUG}`,
  { method: "POST", headers: { Authorization: `Bearer ${PAT}` }, body: fd },
);
const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 600));
console.log("source bytes:", src.length);
