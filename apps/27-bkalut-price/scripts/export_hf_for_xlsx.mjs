// Export the full health-funds dataset (topics + per-fund pivoted tiers) to JSON
// for building the comparison spreadsheet. Reads from the live Supabase project
// via direct PostgREST REST (native fetch) to avoid supabase-js Node20 WebSocket issue.
// Uses the anon key (RLS disabled on hf_* tables).
import fs from "node:fs";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("missing SUPABASE_URL / key"); process.exit(1); }

async function fetchAll(table, cols) {
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const to = from + PAGE - 1;
    const res = await fetch(`${URL}/rest/v1/${table}?select=${encodeURIComponent(cols)}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${to}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok) { console.error(table, res.status, await res.text()); process.exit(1); }
    const data = await res.json();
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

const topics = await fetchAll("hf_topics", "*");
const tiers = await fetchAll("hf_tiers", "topic_id,fund,fund_key,tier,prog,value");
console.error(`topics=${topics.length} tiers=${tiers.length}`);

const FUND_KEYS = ["clalit", "maccabi", "meuhedet", "leumit"];
const FUND_NAMES = { clalit: "כללית", maccabi: "מכבי", meuhedet: "מאוחדת", leumit: "לאומית" };

// group tiers per topic per fund
const byTopic = new Map();
for (const t of tiers) {
  if (!byTopic.has(t.topic_id)) byTopic.set(t.topic_id, {});
  const m = byTopic.get(t.topic_id);
  const fk = t.fund_key;
  if (!m[fk]) m[fk] = [];
  const parts = [t.tier, t.prog, t.value].map((x) => (x || "").trim()).filter(Boolean);
  if (parts.length) m[fk].push(parts.join(" · "));
}

const rows = topics.map((tp) => {
  const id = tp.id ?? tp.topic_id ?? tp.catalog_no;
  const m = byTopic.get(id) || byTopic.get(tp.catalog_no) || {};
  const row = {
    catalogNo: tp.catalog_no ?? tp.catalogNo ?? id,
    kind: tp.kind,
    category: tp.category || "",
    subCategory: tp.sub_category || tp.subCategory || "",
    topic: tp.topic || "",
    audience: tp.audience || "",
    benefitSummary: tp.benefit_summary || tp.benefitSummary || "",
    rangeText: tp.range_text || tp.rangeText || "",
    bestFund: tp.best_fund || tp.bestFund || "",
    sourceName: tp.source_name || tp.sourceName || "",
  };
  for (const fk of FUND_KEYS) {
    row[fk] = (m[fk] || []).join("\n\n");
  }
  return row;
});

// sort: fund topics first, then gov, then ngo; within each by catalogNo
const order = { fund: 0, gov: 1, ngo: 2 };
rows.sort((a, b) => (order[a.kind] - order[b.kind]) || ((a.catalogNo || 0) - (b.catalogNo || 0)));

fs.writeFileSync("/home/user/workspace/hf_export_for_xlsx.json", JSON.stringify({ FUND_KEYS, FUND_NAMES, rows }, null, 0));
console.error("wrote /home/user/workspace/hf_export_for_xlsx.json rows=" + rows.length);
