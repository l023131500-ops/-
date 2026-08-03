/**
 * Seed the hf_* tables from the bkalot health-fund comparison data.json.
 *
 * - Reads data.json (435 fund-comparison topics + 65 gov topics).
 * - Inserts each as an hf_topics row with catalog_no numbered 500+.
 * - Inserts per-tier rows into hf_tiers for fund topics (9 tiers each).
 * - Derives the PUBLIC basic-info fields the site shows before "קרא עוד":
 *     benefit_summary  – one-line "מה ההטבה"
 *     audience         – "למי מיועד"
 *     range_text       – "החזר ... בין X ל-Y ₪" (best→least generous)
 *     range_min/max    – numeric bounds for filtering
 *     best_fund        – the most generous fund/tier
 *
 * Idempotent: clears hf_topics + hf_tiers first (NOT hf_requests).
 *
 * Run from project root:  node scripts/seed-health-funds.cjs
 */
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.resolve(__dirname, "..", "data.db");
const DATA_PATH = path.resolve(
  __dirname,
  "..", "..", "bkalot_site_app", "client", "public", "data.json"
);
const HF_BASE = 500;

const db = new Database(DB_PATH);

// --- Ensure schema exists (mirror of bindHealthFundsDb ensure block) -------
db.exec(`
  CREATE TABLE IF NOT EXISTS hf_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_no INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'fund',
    category TEXT NOT NULL DEFAULT '',
    sub_category TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT '',
    benefit_summary TEXT NOT NULL DEFAULT '',
    range_text TEXT NOT NULL DEFAULT '',
    range_min REAL,
    range_max REAL,
    best_fund TEXT NOT NULL DEFAULT '',
    public_site_text TEXT NOT NULL DEFAULT '',
    treating_body TEXT NOT NULL DEFAULT '',
    full_benefit TEXT NOT NULL DEFAULT '',
    conditions TEXT NOT NULL DEFAULT '',
    qualifying_cases TEXT NOT NULL DEFAULT '',
    preparation TEXT NOT NULL DEFAULT '',
    documents TEXT NOT NULL DEFAULT '',
    how_to_apply TEXT NOT NULL DEFAULT '',
    official_links TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    ai_search TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS hf_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    col INTEGER NOT NULL DEFAULT 0,
    fund TEXT NOT NULL DEFAULT '',
    fund_key TEXT NOT NULL DEFAULT '',
    tier TEXT NOT NULL DEFAULT '',
    prog TEXT NOT NULL DEFAULT '',
    value TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS hf_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER,
    catalog_no INTEGER,
    topic TEXT,
    request_type TEXT NOT NULL DEFAULT 'info',
    full_name TEXT,
    phone TEXT,
    email TEXT,
    note TEXT,
    channel TEXT NOT NULL DEFAULT 'web',
    webhook_status TEXT,
    webhook_message TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_hf_tiers_topic ON hf_tiers(topic_id);
  CREATE INDEX IF NOT EXISTS idx_hf_topics_catalog ON hf_topics(catalog_no);
`);

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const funds = data.funds || [];
const gov = data.gov || [];
const now = new Date().toISOString();

// --- helpers ---------------------------------------------------------------
function fmt(n) {
  return Math.round(n).toLocaleString("he-IL");
}

// Pull every ₪/ש"ח amount out of a string. Handles both orders:
//   "1,000 ₪" / "671 ש\"ח"  and  "₪79" / "₪2,000".
function extractAmounts(text) {
  if (!text) return [];
  const out = [];
  const num = String.raw`\d{1,3}(?:[,\.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?`;
  const cur = String.raw`₪|ש"ח|שח|ש”ח|ש'ח`;
  // number then currency
  const reA = new RegExp(`(${num})\\s*(?:${cur})`, "g");
  // currency then number
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

// Build a public range_text + min/max from a list of amounts.
function rangeFromAmounts(amounts, label) {
  const valid = amounts.filter((n) => n >= 50); // ignore tiny copay-ish noise
  if (valid.length === 0) return { text: "", min: null, max: null };
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) {
    return { text: `${label} עד ${fmt(max)} ₪`, min, max };
  }
  return { text: `${label} בין ${fmt(min)} ל-${fmt(max)} ₪`, min, max };
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
    1, 'seed', @created_at, @updated_at
  )
`);
const insTier = db.prepare(`
  INSERT INTO hf_tiers (topic_id, col, fund, fund_key, tier, prog, value, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const run = db.transaction(() => {
  db.prepare("DELETE FROM hf_tiers").run();
  db.prepare("DELETE FROM hf_topics").run();

  let catalog = HF_BASE;

  // ---- FUND comparison topics ----
  for (const f of funds) {
    const tiers = Array.isArray(f.tiers) ? f.tiers : [];
    // Collect amounts across all tier values to derive a public range.
    const allAmts = [];
    for (const t of tiers) allAmts.push(...extractAmounts(t.value));
    const label = `החזר/הטבה ל${f.topic}`;
    const rng = rangeFromAmounts(allAmts, label);

    const bestTier = tiers.find(
      (t) => `${t.fund} ${t.tier}`.trim() === String(f.best || "").trim()
    );
    const benefitSummary = bestTier && bestTier.value
      ? String(bestTier.value).split("\n")[0].slice(0, 180)
      : `הטבת שב"ן בנושא ${f.topic}`;

    const searchBlob = [f.topic, f.category, f.best, ...tiers.map((t) => t.value)]
      .join(" ");

    const info = insTopic.run({
      catalog_no: catalog,
      kind: "fund",
      category: String(f.category || ""),
      sub_category: "",
      topic: String(f.topic || ""),
      audience: 'כלל מבוטחי השב"ן בקופות החולים (לפי תוכנית והקופה)',
      benefit_summary: benefitSummary,
      range_text: rng.text,
      range_min: rng.min,
      range_max: rng.max,
      best_fund: String(f.best || ""),
      public_site_text:
        rng.text || `השוואת ההטבה "${f.topic}" בין כל קופות החולים ורמות השב"ן.`,
      treating_body: "",
      full_benefit: "",
      conditions: "",
      qualifying_cases: "",
      preparation: "",
      documents: "",
      how_to_apply: "",
      official_links: "",
      notes: "",
      ai_search: searchBlob.slice(0, 4000),
      sort_order: catalog,
      created_at: now,
      updated_at: now,
    });
    const topicId = Number(info.lastInsertRowid);
    for (const t of tiers) {
      insTier.run(
        topicId,
        Number(t.col) || 0,
        String(t.fund || ""),
        String(t.fundKey || ""),
        String(t.tier || ""),
        String(t.prog || ""),
        String(t.value || ""),
        now, now
      );
    }
    catalog += 1;
  }

  // ---- GOV / national-entitlement topics ----
  for (const g of gov) {
    const amts = extractAmounts(g.benefit);
    const rng = rangeFromAmounts(amts, "הטבה/מימון");
    const simple = String(g.simple || "").trim();
    const benefitSummary = simple
      ? simple.split(/(?<=\.)\s/)[0].slice(0, 200)
      : String(g.benefit || "").split("\n")[0].slice(0, 200);

    const searchBlob = [
      g.name, g.category, g.subcategory, g.body, g.audience,
      g.benefit, g.simple,
    ].join(" ");

    insTopic.run({
      catalog_no: catalog,
      kind: "gov",
      category: String(g.category || ""),
      sub_category: String(g.subcategory || ""),
      topic: String(g.name || ""),
      audience: String(g.audience || ""),
      benefit_summary: benefitSummary,
      range_text: rng.text,
      range_min: rng.min,
      range_max: rng.max,
      best_fund: "",
      public_site_text: simple.slice(0, 400) || benefitSummary,
      treating_body: String(g.body || ""),
      full_benefit: String(g.benefit || ""),
      conditions: String(g.conditions || ""),
      qualifying_cases: String(g.qualifying || ""),
      preparation: String(g.prepare || ""),
      documents: String(g.documents || ""),
      how_to_apply: String(g.howto || ""),
      official_links: String(g.links || ""),
      notes: "",
      ai_search: searchBlob.slice(0, 4000),
      sort_order: catalog,
      created_at: now,
      updated_at: now,
    });
    catalog += 1;
  }
  return catalog - HF_BASE;
});

const total = run();
const cFund = db.prepare("SELECT COUNT(*) c FROM hf_topics WHERE kind='fund'").get().c;
const cGov = db.prepare("SELECT COUNT(*) c FROM hf_topics WHERE kind='gov'").get().c;
const cTiers = db.prepare("SELECT COUNT(*) c FROM hf_tiers").get().c;
const minNo = db.prepare("SELECT MIN(catalog_no) m FROM hf_topics").get().m;
const maxNo = db.prepare("SELECT MAX(catalog_no) m FROM hf_topics").get().m;
const withRange = db.prepare("SELECT COUNT(*) c FROM hf_topics WHERE range_text<>''").get().c;

console.log(JSON.stringify({
  ok: true, total, funds: cFund, gov: cGov, tiers: cTiers,
  catalog_from: minNo, catalog_to: maxNo, with_range_text: withRange,
}, null, 2));
db.close();
