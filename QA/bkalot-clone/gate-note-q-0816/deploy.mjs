// פריסת bkalot-clone-admin מבייטי הקובץ עצמו, דרך Management API.
// הפריסה נעשית מהקובץ שב-git ולא מטקסט שהודבק לכלי — כדי שמה שנפרס ומה
// שנשמר יהיו אותו דבר בדיוק, וניתן לאימות ב-sha אחרי.
//
// verify_jwt נשאר true, כפי שהוא ב-v8 ומאז v1: הטוקן שלנו יושב ב-x-admin-token
// והמפתח ה-anon ב-Authorization (⚠️ של v1 למעלה). כיבוי שלו כאן היה פותח את
// כל הנתיבים לכל העולם בלי שנאמר עליו מילה.

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const PAT = process.env.SB_PAT;
const REF = "uhnrgujbdxhhmoxcjria";
const SLUG = "bkalot-clone-admin";
const SRC = new URL("../../../supabase/functions/bkalot-clone-admin/index.ts", import.meta.url);

if (!PAT) { console.error("SB_PAT missing"); process.exit(1); }

const bytes = await readFile(SRC);
const sha = createHash("sha256").update(bytes).digest("hex");

const form = new FormData();
form.append("metadata", JSON.stringify({
  name: SLUG,
  entrypoint_path: "index.ts",
  verify_jwt: true,
}));
form.append("file", new File([bytes], "index.ts", { type: "text/typescript" }));

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${SLUG}`,
  { method: "POST", headers: { Authorization: `Bearer ${PAT}` }, body: form },
);
const text = await res.text();
console.log(JSON.stringify({ status: res.status, bytes: bytes.length, sha256: sha, body: text.slice(0, 800) }, null, 2));
process.exit(res.ok ? 0 : 1);
