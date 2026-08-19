/**
 * Does an `authenticated` user actually hold UPDATE on partner_assignments.treatment_status
 * in gesher (31) PRODUCTION?
 *
 * Why this matters: migration 20260605003212 does
 *     REVOKE UPDATE ON public.partner_assignments FROM authenticated;
 *     GRANT  UPDATE (partner_feedback_notes) ON public.partner_assignments TO authenticated;
 * and no later migration re-grants treatment_status. The partner-clients screen shipped at
 * 12:04 today writes treatment_status through the CALLER's client, not service_role.
 *
 * Postgres checks column privileges BEFORE row-level security, so this is measurable with any
 * authenticated user and an id that matches no row: a missing grant gives 42501, a present
 * grant gives an empty 200/204. Nothing is mutated either way.
 *
 * Run:  node probe-column-grant.mjs
 */
import { readFileSync } from "node:fs";

const ENV = "../../../apps/31-hebrew-bridge-crm/.env";
const env = Object.fromEntries(
  readFileSync(new URL(ENV, import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const URL_ = env.SUPABASE_URL;
const KEY = env.SUPABASE_PUBLISHABLE_KEY;
const EMAIL = "test@more30.com";
const PASSWORD = "More30Test2026";

// An id that exists in no row: the privilege check still fires, the UPDATE still touches nothing.
const NO_SUCH_ROW = "00000000-0000-0000-0000-000000000000";

const signIn = async () => {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`sign-in ${r.status}: ${JSON.stringify(j)}`);
  return j.access_token;
};

const probe = async (token, column, value) => {
  const r = await fetch(
    `${URL_}/rest/v1/partner_assignments?id=eq.${NO_SUCH_ROW}`,
    {
      method: "PATCH",
      headers: {
        apikey: KEY,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ [column]: value }),
    }
  );
  const body = await r.text();
  return { column, http: r.status, body: body.slice(0, 300) };
};

const token = await signIn();
const results = [
  await probe(token, "treatment_status", "sent"),
  await probe(token, "partner_feedback_notes", "probe — no row matches, nothing written"),
];

for (const r of results) {
  const denied = /permission denied/i.test(r.body);
  console.log(
    `${r.column.padEnd(24)} HTTP ${r.http}  ${denied ? "DENIED" : "allowed"}  ${r.body || "(empty body)"}`
  );
}
