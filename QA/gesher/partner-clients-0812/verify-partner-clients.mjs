// Exercises the REAL src/lib/partner-visibility.ts (bundled by esbuild, not copied)
// for the two helpers the new /partner/clients screen builds every card from:
//   visibleFieldsFor()  -> the fields a partner is shown, in the admin's order
//   partnerFacingName() -> the heading, or the withheld label
//
// The DB stand-in is shaped like the live tables, same as consent-enforcement-0812.
//
// Usage:  node verify-partner-clients.mjs <path-to-bundle.mjs>
const bundle = process.argv[2];
if (!bundle) {
  console.error("usage: node verify-partner-clients.mjs <bundle.mjs>");
  process.exit(2);
}
const { loadPartnerVisibility, visibleFieldsFor, partnerFacingName, CONSENT_WITHHELD_NAME } =
  await import("file://" + bundle.replace(/\\/g, "/"));

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
    // Order matters: the screen renders the fields in exactly this order.
    { partner_category: LAWYER, allowed_schema_fields: ["full_name", "phone", "lead_source"] },
    { partner_category: PENSION, allowed_schema_fields: [] },
  ],
  client_consents: [
    { client_id: C_YES, partner_category: LAWYER, is_granted: true },
    { client_id: C_NO, partner_category: LAWYER, is_granted: false },
    { client_id: C_YES, partner_category: PENSION, is_granted: true },
  ],
};

// What the service-role reads would return for each client.
const RAW = {
  [C_YES]: { full_name: "לקוח מאשר", phone: "050-0000001", lead_source: "voicemail", email: "yes@example.test", internal_admin_notes: "פנימי" },
  [C_NO]: { full_name: "לקוח מסרב", phone: "050-0000002", lead_source: "web", email: "no@example.test", internal_admin_notes: "פנימי" },
  [C_NEVER]: { full_name: "לקוח ללא שורה", phone: "050-0000003", lead_source: "web", email: "never@example.test", internal_admin_notes: "פנימי" },
};
const readerFor = (clientId) => (field) => {
  const v = RAW[clientId]?.[field];
  return v === undefined || v === null || v === "" ? null : String(v);
};

function makeAdmin() {
  return {
    from(table) {
      return {
        _rows: DB[table] ?? [],
        select() { return this; },
        eq(col, val) { this._rows = this._rows.filter((r) => r[col] === val); return this; },
        in(col, vals) { this._rows = this._rows.filter((r) => vals.includes(r[col])); return this; },
        maybeSingle() { return Promise.resolve({ data: this._rows[0] ?? null, error: null }); },
        then(resolve) { return Promise.resolve(resolve({ data: this._rows, error: null })); },
      };
    },
  };
}

const results = [];
function check(name, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  -> ${JSON.stringify(actual)}`);
  if (!pass) console.log(`      expected ${JSON.stringify(expected)}`);
}

const ALL = [C_YES, C_NO, C_NEVER];

// 1. Lawyer partner, client who consented: sees exactly the configured fields,
//    in the configured order, with full_name lifted out into the heading.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_LAWYER, ALL);
  check("consenting client: name is the real name", partnerFacingName(v, C_YES, readerFor(C_YES)), "לקוח מאשר");
  check("consenting client: fields in the admin's order, full_name excluded",
    visibleFieldsFor(v, C_YES, readerFor(C_YES)),
    [{ key: "phone", value: "050-0000001" }, { key: "lead_source", value: "voicemail" }]);
  check("email was never allowed, so it is absent",
    visibleFieldsFor(v, C_YES, readerFor(C_YES)).some((f) => f.key === "email"), false);
  check("internal_admin_notes was never allowed, so it is absent",
    visibleFieldsFor(v, C_YES, readerFor(C_YES)).some((f) => f.key === "internal_admin_notes"), false);
}

// 2. Same partner, client who refused (is_granted=false) and client with no row:
//    the card must carry no identifying value at all.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_LAWYER, ALL);
  check("refusing client: heading is the withheld label", partnerFacingName(v, C_NO, readerFor(C_NO)), CONSENT_WITHHELD_NAME);
  check("refusing client: no fields", visibleFieldsFor(v, C_NO, readerFor(C_NO)), []);
  check("client with no consent row: heading is the withheld label", partnerFacingName(v, C_NEVER, readerFor(C_NEVER)), CONSENT_WITHHELD_NAME);
  check("client with no consent row: no fields", visibleFieldsFor(v, C_NEVER, readerFor(C_NEVER)), []);
}

// 3. Pension partner: the client DID consent, but the category has [] configured.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_PENSION, ALL);
  check("empty rule: consent alone shows no name", partnerFacingName(v, C_YES, readerFor(C_YES)), CONSENT_WITHHELD_NAME);
  check("empty rule: consent alone shows no fields", visibleFieldsFor(v, C_YES, readerFor(C_YES)), []);
}

// 4. Partner with no specialization_category at all.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_NOCAT, ALL);
  check("no category: withheld heading", partnerFacingName(v, C_YES, readerFor(C_YES)), CONSENT_WITHHELD_NAME);
  check("no category: no fields", visibleFieldsFor(v, C_YES, readerFor(C_YES)), []);
}

// 5. A missing value must render as null (the screen prints "לא זמין"), never as
//    an invented placeholder, and never by falling back to another client's row.
{
  const v = await loadPartnerVisibility(makeAdmin(), P_LAWYER, ALL);
  const blank = (field) => (field === "phone" ? null : readerFor(C_YES)(field));
  check("missing phone stays null", visibleFieldsFor(v, C_YES, blank)[0], { key: "phone", value: null });
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
