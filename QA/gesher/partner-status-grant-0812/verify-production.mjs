/**
 * Verify in PRODUCTION (more30.com) that updateTreatmentStatus no longer writes through the
 * caller's client, and that its ownership gate still holds.
 *
 * The server function is reached at /gesher/_serverFn/<id> with a Supabase bearer token
 * (see src/integrations/supabase/auth-attacher.ts). Called as the §1ב test user with an
 * assignment id that belongs to nobody, so nothing is mutated.
 *
 * Run:  node verify-production.mjs
 */
import { readFileSync } from "node:fs";
// The RPC body is not plain JSON: the client fetcher seroval-encodes it (see E1/X0/Z0 in the
// production bundle) and a plain object comes back as "Seroval Error (step: 3)". Use the very
// same serializer the app ships with.
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

// From .vercel/output/functions/__server.func/_ssr/server-*.mjs, entry
// "updateTreatmentStatus_createServerFn_handler".
const FN_ID = "b5d3f70f4987d908dcac7654cb6b2a42422900bd58f5b0c0bdea27b9e636cb61";
const ENDPOINT = `https://more30.com/gesher/_serverFn/${FN_ID}`;
const NO_SUCH_ROW = "00000000-0000-0000-0000-000000000000";

const r0 = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: "test@more30.com", password: "More30Test2026" }),
});
const session = await r0.json();
if (!r0.ok) throw new Error(`sign-in ${r0.status}: ${JSON.stringify(session)}`);
console.log(`signed in as test@more30.com (sub ${session.user.id})`);

const body = JSON.stringify(
  await toJSONAsync({ data: { assignmentId: NO_SUCH_ROW, status: "in_progress" } })
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

const denied42501 = /42501|permission denied/i.test(text);
const forbidden = /Forbidden/.test(text);
console.log("");
console.log(`  reached the ownership gate (Forbidden) : ${forbidden}`);
console.log(`  leaked a 42501 grant error             : ${denied42501}`);
