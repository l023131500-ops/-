/**
 * Export local SQLite hf_topics + hf_tiers to batched Postgres INSERT SQL files
 * for loading into Supabase. Preserves explicit id values so tier->topic FKs
 * stay intact. Writes to /home/user/workspace/health_research/supabase_sync/.
 */
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const db = new Database(path.resolve(__dirname, "..", "data.db"));
const OUT = path.resolve(__dirname, "..", "..", "health_research", "supabase_sync");
fs.mkdirSync(OUT, { recursive: true });

const TOPIC_COLS = [
  "id","catalog_no","kind","category","sub_category","topic","audience",
  "benefit_summary","range_text","range_min","range_max","best_fund",
  "public_site_text","treating_body","full_benefit","conditions",
  "qualifying_cases","preparation","documents","how_to_apply","official_links",
  "notes","ai_search","sort_order","active","created_by","created_at",
  "updated_at","podcast_script","podcast_audio_url","podcast_status",
  "podcast_updated_at",
];
const TIER_COLS = ["id","topic_id","col","fund","fund_key","tier","prog","value","created_at","updated_at"];

function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function dumpTable(table, cols, batchSize, fileLabel) {
  const rows = db.prepare(`SELECT ${cols.join(",")} FROM ${table} ORDER BY id`).all();
  const colList = cols.join(", ");
  let fileIdx = 0, files = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const values = chunk
      .map((r) => "(" + cols.map((c) => lit(r[c])).join(",") + ")")
      .join(",\n");
    const sql =
      `INSERT INTO public.${table} (${colList}) VALUES\n${values}\n` +
      `ON CONFLICT (id) DO NOTHING;\n`;
    const fp = path.join(OUT, `${fileLabel}_${String(fileIdx).padStart(2, "0")}.sql`);
    fs.writeFileSync(fp, sql);
    files.push({ file: path.basename(fp), rows: chunk.length });
    fileIdx++;
  }
  return { total: rows.length, files };
}

const topics = dumpTable("hf_topics", TOPIC_COLS, 25, "topics");
const tiers = dumpTable("hf_tiers", TIER_COLS, 200, "tiers");

fs.writeFileSync(
  path.join(OUT, "_manifest.json"),
  JSON.stringify({ topics, tiers }, null, 2)
);
console.log(JSON.stringify({ topics: topics.total, topicFiles: topics.files.length, tiers: tiers.total, tierFiles: tiers.files.length }, null, 2));
db.close();
