// One-time seed: push local SQLite hf_topics + hf_tiers to Supabase (bkalut-production).
// Uses the same @supabase/supabase-js client the app's sync layer uses (PostgREST).
// RLS is currently disabled on hf_* tables, so the anon key can write.
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
if (!URL || !KEY) { console.error("missing env"); process.exit(1); }

const db = new Database("/home/user/workspace/bkalut-app/data.db", { readonly: true });
const client = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "X-Client-Info": "hf-seed" } },
  realtime: { transport: WebSocket },
});

const TOPIC_COLS = ["id","catalog_no","kind","category","sub_category","topic","audience",
  "benefit_summary","range_text","range_min","range_max","best_fund","public_site_text",
  "treating_body","full_benefit","conditions","qualifying_cases","preparation","documents",
  "how_to_apply","official_links","notes","ai_search","sort_order","active","created_by",
  "created_at","updated_at","podcast_script","podcast_audio_url","podcast_status","podcast_updated_at"];
const TIER_COLS = ["id","topic_id","col","fund","fund_key","tier","prog","value","created_at","updated_at"];

function pick(row, cols) { const o = {}; for (const c of cols) o[c] = row[c] ?? null; return o; }

async function pushTable(table, rows, cols, chunk) {
  let done = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk).map(r => pick(r, cols));
    const { error } = await client.from(table).upsert(batch, { onConflict: "id" });
    if (error) { console.error(`[${table}] batch@${i}`, error.message); process.exit(2); }
    done += batch.length;
    console.log(`[${table}] ${done}/${rows.length}`);
  }
}

const topics = db.prepare("SELECT * FROM hf_topics ORDER BY id").all();
const tiers  = db.prepare("SELECT * FROM hf_tiers ORDER BY id").all();
console.log(`local: ${topics.length} topics, ${tiers.length} tiers`);

await pushTable("hf_topics", topics, TOPIC_COLS, 200);
await pushTable("hf_tiers",  tiers,  TIER_COLS, 500);

// verify
const { count: tc } = await client.from("hf_topics").select("*", { count: "exact", head: true });
const { count: rc } = await client.from("hf_tiers").select("*", { count: "exact", head: true });
console.log(`REMOTE NOW: hf_topics=${tc} hf_tiers=${rc}`);
db.close();
