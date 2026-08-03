/**
 * ADDITIVE seed: insert complementary-health NGO topics (kind='ngo').
 *
 * Reads  ../../health_research/ngo_data.json  (15 verified NGOs).
 * Inserts each as an hf_topics row with kind='ngo', catalog_no numbered 1000+.
 *
 * CRITICAL — ADDITIVE ONLY:
 *   - Does NOT touch fund (500-934) or gov (935-999) rows.
 *   - Idempotent: deletes ONLY existing kind='ngo' rows before re-inserting.
 *   - Never deletes hf_tiers or hf_requests.
 *
 * Mapping (mirrors the gov mapping in seed-health-funds.cjs):
 *   name          -> topic  (+ treating_body, for source attribution)
 *   category      -> category
 *   subcategory   -> sub_category
 *   audience      -> audience
 *   benefit       -> full_benefit
 *   simple        -> public_site_text + benefit_summary (first sentence)
 *   conditions    -> conditions
 *   howto         -> how_to_apply
 *   documents     -> documents
 *   contact+links -> official_links
 *   recommendation-> notes
 *
 * Run from project root:  node scripts/seed-health-funds-ngo.cjs
 */
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.resolve(__dirname, "..", "data.db");
const DATA_PATH = path.resolve(
  __dirname, "..", "..", "health_research", "ngo_data.json"
);
const NGO_BASE = 1000;

const db = new Database(DB_PATH);
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const orgs = Array.isArray(data.orgs) ? data.orgs : [];
const now = new Date().toISOString();

// Pull every ₪/ש"ח amount out of a string (same logic as the main seed).
function extractAmounts(text) {
  if (!text) return [];
  const out = [];
  const num = String.raw`\d{1,3}(?:[,\.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?`;
  const cur = String.raw`₪|ש"ח|שח|ש”ח|ש'ח`;
  const reA = new RegExp(`(${num})\\s*(?:${cur})`, "g");
  const reB = new RegExp(`(?:${cur})\\s*(${num})`, "g");
  for (const re of [reA, reB]) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const v = parseFloat(m[1].replace(/,/g, ""));
      if (Number.isFinite(v) && v > 0) out.push(v);
    }
  }
  return out;
}
function fmt(n) { return Math.round(n).toLocaleString("he-IL"); }
function rangeFromAmounts(amts, label) {
  if (!amts.length) return { text: "", min: null, max: null };
  const min = Math.min(...amts), max = Math.max(...amts);
  if (min === max) return { text: `${label}: ${fmt(min)} ₪`, min, max };
  return { text: `${label}: ${fmt(min)}–${fmt(max)} ₪`, min, max };
}

// Build the official_links text block: contact (phone/website) + links list.
function buildLinks(o) {
  const lines = [];
  const c = o.contact || {};
  if (c.phone) lines.push(`טלפון: ${c.phone}`);
  if (c.website) lines.push(`[אתר רשמי](${c.website})`);
  if (Array.isArray(o.links)) for (const l of o.links) if (l) lines.push(String(l));
  return lines.join("\n");
}

const insTopic = db.prepare(`
  INSERT INTO hf_topics (
    catalog_no, kind, category, sub_category, topic, audience, benefit_summary,
    range_text, range_min, range_max, best_fund, public_site_text,
    treating_body, full_benefit, conditions, qualifying_cases, preparation,
    documents, how_to_apply, official_links, notes, ai_search, sort_order,
    active, created_by, created_at, updated_at
  ) VALUES (
    @catalog_no, @kind, @category, @sub_category, @topic, @audience, @benefit_summary,
    @range_text, @range_min, @range_max, @best_fund, @public_site_text,
    @treating_body, @full_benefit, @conditions, @qualifying_cases, @preparation,
    @documents, @how_to_apply, @official_links, @notes, @ai_search, @sort_order,
    1, 'seed-ngo', @created_at, @updated_at
  )
`);

const run = db.transaction(() => {
  // ADDITIVE: only clear existing NGO rows, leave fund/gov untouched.
  db.prepare("DELETE FROM hf_topics WHERE kind='ngo'").run();

  let catalog = NGO_BASE;
  for (const o of orgs) {
    const simple = String(o.simple || "").trim();
    const benefit = String(o.benefit || "");
    const benefitSummary = simple
      ? simple.split(/(?<=\.)\s/)[0].slice(0, 200)
      : benefit.split("\n")[0].slice(0, 200);
    const amts = extractAmounts(benefit);
    const rng = rangeFromAmounts(amts, "סיוע");

    const searchBlob = [
      o.name, o.category, o.subcategory, o.audience, benefit, simple,
      o.recommendation, (o.contact || {}).phone,
    ].join(" ");

    insTopic.run({
      catalog_no: catalog,
      kind: "ngo",
      category: String(o.category || ""),
      sub_category: String(o.subcategory || ""),
      topic: String(o.name || ""),
      audience: String(o.audience || ""),
      benefit_summary: benefitSummary,
      range_text: rng.text,
      range_min: rng.min,
      range_max: rng.max,
      best_fund: "",
      public_site_text: (simple || benefitSummary).slice(0, 400),
      treating_body: String(o.name || ""), // org name -> source attribution
      full_benefit: benefit,
      conditions: String(o.conditions || ""),
      qualifying_cases: "",
      preparation: "",
      documents: String(o.documents || ""),
      how_to_apply: String(o.howto || ""),
      official_links: buildLinks(o),
      notes: String(o.recommendation || ""),
      ai_search: searchBlob.slice(0, 4000),
      sort_order: catalog,
      created_at: now,
      updated_at: now,
    });
    catalog += 1;
  }
  return catalog - NGO_BASE;
});

const inserted = run();
const cFund = db.prepare("SELECT COUNT(*) c FROM hf_topics WHERE kind='fund'").get().c;
const cGov = db.prepare("SELECT COUNT(*) c FROM hf_topics WHERE kind='gov'").get().c;
const cNgo = db.prepare("SELECT COUNT(*) c FROM hf_topics WHERE kind='ngo'").get().c;
const minNo = db.prepare("SELECT MIN(catalog_no) m FROM hf_topics WHERE kind='ngo'").get().m;
const maxNo = db.prepare("SELECT MAX(catalog_no) m FROM hf_topics WHERE kind='ngo'").get().m;

console.log(JSON.stringify({
  ok: true, inserted, ngo: cNgo, ngoRange: [minNo, maxNo],
  preserved: { fund: cFund, gov: cGov },
}, null, 2));
db.close();
