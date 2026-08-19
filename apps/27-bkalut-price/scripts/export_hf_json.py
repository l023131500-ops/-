#!/usr/bin/env python3
"""Emit hf_topics/hf_tiers as compact JSON batches for jsonb_populate_recordset upload.
Each batch is a single execute_sql statement that's far smaller than raw INSERT VALUES."""
import sqlite3, os, json

DB = "/home/user/workspace/bkalut-app/data.db"
OUT = "/home/user/workspace/bkalut-app/hf_json_export"
os.makedirs(OUT, exist_ok=True)

con = sqlite3.connect(DB); con.row_factory = sqlite3.Row
cur = con.cursor()
topics = [dict(r) for r in cur.execute("SELECT * FROM hf_topics ORDER BY id").fetchall()]
tiers  = [dict(r) for r in cur.execute("SELECT * FROM hf_tiers ORDER BY id").fetchall()]
con.close()

def sql_for(table, rows, cols_def, chunk):
    """Build execute_sql statements using jsonb_populate_recordset."""
    files = []
    for i in range(0, len(rows), chunk):
        part = rows[i:i+chunk]
        payload = json.dumps(part, ensure_ascii=False)
        payload = payload.replace("'", "''")  # SQL-escape single quotes
        stmt = (
            f"INSERT INTO {table}\n"
            f"SELECT * FROM jsonb_populate_recordset(NULL::{table}, '{payload}'::jsonb)\n"
            f"ON CONFLICT (id) DO NOTHING;"
        )
        files.append(stmt)
    return files

topic_files = sql_for("hf_topics", topics, None, 8)
tier_files  = sql_for("hf_tiers",  tiers,  None, 60)

man = {"topics": len(topics), "tiers": len(tiers),
       "max_topic_id": max((t["id"] for t in topics), default=0),
       "max_tier_id": max((t["id"] for t in tiers), default=0),
       "topic_files": [], "tier_files": []}
for idx, s in enumerate(topic_files):
    fn=f"{OUT}/topics_{idx:03d}.sql"; open(fn,"w").write(s); man["topic_files"].append(fn)
for idx, s in enumerate(tier_files):
    fn=f"{OUT}/tiers_{idx:03d}.sql"; open(fn,"w").write(s); man["tier_files"].append(fn)
open(f"{OUT}/_manifest.json","w").write(json.dumps(man,indent=2,ensure_ascii=False))

import os as _o
sizes=[(_o.path.basename(f), _o.path.getsize(f)) for f in man["topic_files"]+man["tier_files"]]
print(json.dumps({"topics":len(topics),"tiers":len(tiers),
  "topic_files":len(topic_files),"tier_files":len(tier_files),
  "max_topic_id":man["max_topic_id"],"max_tier_id":man["max_tier_id"],
  "largest_bytes":max(s for _,s in sizes)}, ensure_ascii=False))
