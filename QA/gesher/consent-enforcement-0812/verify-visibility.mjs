// Exercises the REAL src/lib/partner-visibility.ts (bundled by esbuild, not copied)
// against a stand-in for the service-role client, shaped like the live tables:
//   partner_profiles(id, specialization_category)
//   visibility_rules(partner_category, allowed_schema_fields)   -- 3 seeded rows
//   client_consents(client_id, partner_category, is_granted)
//
// Usage:  node verify-visibility.mjs <path-to-bundle.mjs>
import { readFileSync } from "node:fs";

const bundle = process.argv[2];
if (!bundle) {
  console.error("usage: node verify-visibility.mjs <bundle.mjs>");
  process.exit(2);
}
const { loadPartnerVisibility, canPartnerSeeField, CONSENT_WITHHELD_NAME } = await import(
  "file://" + bundle.replace(/\\/g, "/")
);

const LAWYER = "עורכי_דין";
const PENSION = "סוכני_פנסיה"; // seeded with [] — no fields configured
const P_LAWYER = "11111111-1111-1111-1111-111111111111";
const P_PENSION = "22222222-2222-2222-2222-222222222222";
const P_NOCAT = "33333333-3333-3333-3333-333333333333";
const C_YES = "aaaaaaaa-0000-0000-0000-000000000001"; // consented to lawyers
const C_NO = "aaaaaaaa-0000-0000-0000-000000000002"; // row exists, is_granted=false
const C_NEVER = "aaaaaaaa-0000-0000-0000-000000000003"; // no consent row at all

const DB = {
  partner_profiles: [
    { id: P_LAWYER, specialization_category: LAWYER },
    { id: P_PENSION, specialization_category: PENSION },
    { id: P_NOCAT, specialization_category: null },
  ],
  visibility_rules: [
    { partner_category: LAWYER, allowed_schema_fields: ["full_name", "phone"] },
    { partner_category: PENSION, allowed_schema_fields: [] },
    { partner_category: "יועצים_פיננסיים", allowed_schema_fields: ["full_name"] },
  ],
  client_consents: [
    { client_id: C_YES, partner_category: LAWYER, is_granted: true },
    { client_id: C_NO, partner_category: LAWYER, is_granted: false },
    { client_id: C_YES, partner_category: PENSION, is_granted: true },
  ],
};

let queryCount = 0;
function makeAdmin() {
  return {
    from(table) {
      const q = {
        _rows: DB[table] ?? [],
        _cols: null,
        select(cols) {
          this._cols = cols;
          return this;
        },
        eq(col, val) {
          this._rows = this._rows.filter((r) => r[col] === val);
          return this;
        },
        in(col, vals) {
          this._rows = this._rows.filter((r) => vals.includes(r[col]));
          return this;
        },
        maybeSingle() {
          queryCount++;
          return Promise.resolve({ data: this._rows[0] ?? null, error: null });
        },
        then(resolve) {
          queryCount++;
          return Promise.resolve(resolve({ data: this._rows, error: null }));
        },
      };
      return q;
    },
  };
}

const results = [];
function check(name, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, pass, actual, expected });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  -> ${JSON.stringify(actual)}`);
}

const ALL_CLIENTS = [C_YES, C_NO, C_NEVER];

// 1. Lawyer partner: allowed full_name, and only C_YES granted.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_LAWYER, ALL_CLIENTS);
  check("lawyer: category resolved", v.category, LAWYER);
  check("lawyer: allowed fields from the rule", v.allowedFields, ["full_name", "phone"]);
  check("lawyer sees consenting client's name", canPartnerSeeField(v, C_YES, "full_name"), true);
  check("lawyer blocked on is_granted=false", canPartnerSeeField(v, C_NO, "full_name"), false);
  check("lawyer blocked when no consent row", canPartnerSeeField(v, C_NEVER, "full_name"), false);
  check("field outside the rule stays hidden", canPartnerSeeField(v, C_YES, "internal_admin_notes"), false);
}

// 2. Pension partner: client consented, but the category has no fields configured.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_PENSION, ALL_CLIENTS);
  check("pension: empty rule yields no fields", v.allowedFields, []);
  check("consent alone does not expose a name", canPartnerSeeField(v, C_YES, "full_name"), false);
}

// 3. Partner with no specialization_category.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_NOCAT, ALL_CLIENTS);
  check("no category: nothing visible", canPartnerSeeField(v, C_YES, "full_name"), false);
}

// 4. No clients on screen -> no queries at all.
{
  const before = queryCount;
  const v = await loadPartnerVisibility(makeAdmin(), P_LAWYER, []);
  check("empty task list issues no queries", queryCount - before, 0);
  check("empty task list exposes nothing", canPartnerSeeField(v, C_YES, "full_name"), false);
}

check("withheld label is non-empty", typeof CONSENT_WITHHELD_NAME === "string" && CONSENT_WITHHELD_NAME.length > 0, true);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
