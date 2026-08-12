/**
 * Verify in PRODUCTION (more30.com) that the new /gesher/partner/feedbacks screen shipped, and
 * that its one write — savePartnerFeedback — runs there behind its ownership gate.
 *
 * Two independent checks, neither of which writes a row:
 *   1. The route's client chunk is served and carries the real screen (not PlaceholderPage).
 *   2. The server function answers on its production endpoint, called as the §1ב test user with
 *      an assignment id that belongs to nobody → "Forbidden", so nothing is mutated.
 *
 * Unlike updateTreatmentStatus, this handler never touches supabaseAdmin: partner_feedback_notes
 * is the single column migration 20260605003212 granted back to `authenticated`, so the write
 * goes through the caller and is NOT blocked by core.issues #180 (missing SERVICE_ROLE_KEY).
 *
 * Run:  node verify-production.mjs
 */
import { readFileSync } from "node:fs";
// The RPC body is not plain JSON: the client fetcher seroval-encodes it, and a plain object comes
// back as "Seroval Error (step: 3)". Use the very same serializer the app ships with.
import { toJSONAsync } from "../../../apps/31-hebrew-bridge-crm/node_modules/seroval/dist/esm/production/index.mjs";

const env = Object.fromEntries(
  readFileSync(new URL("../../../apps/31-hebrew-bridge-crm/.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

// From .vercel/output/functions/__server.func/_ssr/partner.functions-*.mjs, entry
// "savePartnerFeedback_createServerFn_handler".
const FN_ID = "c98ad0e83c419988e146e31cb4913239f0603fe9410a054229a7bb266ad803a5";
const ENDPOINT = `https://more30.com/gesher/_serverFn/${FN_ID}`;
const NO_SUCH_ROW = "00000000-0000-0000-0000-000000000000";

// ---- 1. the screen itself ------------------------------------------------------------------
const rPage = await fetch("https://more30.com/gesher/partner/feedbacks", { redirect: "manual" });
const pageHtml = rPage.status < 300 ? await rPage.text() : "";
console.log(`GET /gesher/partner/feedbacks -> HTTP ${rPage.status}`);

// The route chunk is named after the file (feedbacks-*.js) and is preloaded from the page shell.
// Don't grep it for "partner/feedbacks" — that path is in the router manifest, not in the chunk.
const chunkNames = [...pageHtml.matchAll(/\/gesher\/assets\/(feedbacks-[\w.-]+\.js)/g)].map(
  (m) => m[1]
);
let screenShipped = false;
let placeholderStillThere = false;
for (const name of new Set(chunkNames)) {
  const r = await fetch(`https://more30.com/gesher/assets/${name}`);
  if (!r.ok) continue;
  const js = await r.text();
  if (js.includes("המשוב שלי על הטיפול") && js.includes("שמור משוב")) screenShipped = true;
  if (js.includes("עדכוני סטטוס טיפול ומשוב לכל לקוח")) placeholderStillThere = true;
}
console.log(`  real screen in the served bundle : ${screenShipped}`);
console.log(`  old placeholder still served     : ${placeholderStillThere}`);

// ---- 2. the write path ---------------------------------------------------------------------
const r0 = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: "test@more30.com", password: "More30Test2026" }),
});
const session = await r0.json();
if (!r0.ok) throw new Error(`sign-in ${r0.status}: ${JSON.stringify(session)}`);
console.log(`\nsigned in as test@more30.com (sub ${session.user.id})`);

const body = JSON.stringify(
  await toJSONAsync({ data: { assignmentId: NO_SUCH_ROW, notes: "QA probe — never stored" } })
);

const r = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    authorization: `Bearer ${session.access_token}`,
    "content-type": "application/json",
    "x-tsr-serverFn": "true",
    accept: "application/x-ndjson, application/json",
  },
  body,
});
const text = await r.text();
console.log(`POST ${ENDPOINT}`);
console.log(`  HTTP ${r.status}`);
console.log(`  body ${text.slice(0, 400)}`);
console.log("");
console.log(`  reached the ownership gate (Forbidden) : ${/Forbidden/.test(text)}`);
console.log(`  leaked a 42501 grant error             : ${/42501|permission denied/i.test(text)}`);
console.log(`  leaked the missing-service-key error   : ${/Missing Supabase environment/i.test(text)}`);
