#!/usr/bin/env python3
"""Export hf_topics + hf_tiers from local SQLite to Postgres-compatible INSERT SQL.
Splits into chunked files so each apply_migration call stays small."""
import sqlite3, os, json

DB = "/home/user/workspace/bkalut-app/data.db"
OUT = "/home/user/workspace/bkalut-app/hf_pg_export"
os.makedirs(OUT, exist_ok=True)

TOPIC_COLS = ["id","catalog_no","kind","category","sub_category","topic","audience",
  "benefit_summary","range_text","range_min","range_max","best_fund","public_site_text",
  "treating_body","full_benefit","conditions","qualifying_cases","preparation","documents",
  "how_to_apply","official_links","notes","ai_search","sort_order","active","created_by",
  "created_at","updated_at","podcast_script","podcast_audio_url","podcast_status","podcast_updated_at"]
TIER_COLS = ["id","topic_id","col","fund","fund_key","tier","prog","value","created_at","updated_at"]

def lit(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    s = str(v).replace("'", "''")
    return "'" + s + "'"

def rows_to_inserts(table, cols, rows, chunk=100):
    files = []
    collist = ",".join(cols)
    for i in range(0, len(rows), chunk):
        part = rows[i:i+chunk]
        lines = [f"INSERT INTO {table} ({collist}) VALUES"]
        vals = []
        for r in part:
            vals.append("(" + ",".join(lit(r[c]) for c in cols) + ")")
        lines.append(",\n".join(vals) + "\nON CONFLICT (id) DO NOTHING;")
        files.append("\n".join(lines))
    return files

con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row
cur = con.cursor()

topics = [dict(r) for r in cur.execute("SELECT * FROM hf_topics ORDER BY id").fetchall()]
tiers  = [dict(r) for r in cur.execute("SELECT * FROM hf_tiers ORDER BY id").fetchall()]
con.close()

topic_files = rows_to_inserts("hf_topics", TOPIC_COLS, topics, chunk=60)
tier_files  = rows_to_inserts("hf_tiers",  TIER_COLS,  tiers,  chunk=150)

manifest = {"topics": len(topics), "tiers": len(tiers),
            "topic_files": [], "tier_files": []}
for idx, sql in enumerate(topic_files):
    fn = f"{OUT}/topics_{idx:03d}.sql"
    open(fn, "w").write(sql)
    manifest["topic_files"].append(fn)
for idx, sql in enumerate(tier_files):
    fn = f"{OUT}/tiers_{idx:03d}.sql"
    open(fn, "w").write(sql)
    manifest["tier_files"].append(fn)

# max ids for sequence reset
manifest["max_topic_id"] = max((t["id"] for t in topics), default=0)
manifest["max_tier_id"]  = max((t["id"] for t in tiers), default=0)

open(f"{OUT}/_manifest.json","w").write(json.dumps(manifest, indent=2))
print(json.dumps({"topics": len(topics), "tiers": len(tiers),
  "topic_files": len(topic_files), "tier_files": len(tier_files),
  "max_topic_id": manifest["max_topic_id"], "max_tier_id": manifest["max_tier_id"]}))
