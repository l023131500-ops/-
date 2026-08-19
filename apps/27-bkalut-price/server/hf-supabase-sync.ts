/**
 * Health-Fund ⇄ Supabase auto-sync (השוואת קופות חולים — סנכרון אוטומטי).
 *
 * Design goals (explicitly requested):
 *  - Behave EXACTLY like the rest of Bkalut: when SUPABASE_URL + a key are set,
 *    the cloud DB is the source of truth and stays in sync automatically; when
 *    they are not set, everything keeps working from local SQLite unchanged.
 *  - DO NOT touch / break any existing health-funds logic. health-funds.ts
 *    keeps reading & writing local SQLite for fast, synchronous queries; this
 *    module mirrors those writes to Supabase in the background (best-effort)
 *    and seeds one direction on boot. A failure here never blocks a request.
 *  - Separate but connected: this lives in its own file, prefixed hf_, and is
 *    wired through a couple of tiny hooks in health-funds.ts only.
 *
 * Two-way bootstrap on startup (runs once, in background):
 *   1. If Supabase hf_topics is EMPTY  → push the local SQLite catalog up
 *      (first-time automatic load — no manual SQL needed).
 *   2. If Supabase hf_topics has ROWS  → pull them down into local SQLite so
 *      the running server reflects whatever the cloud / automation holds.
 *
 * Ongoing: every topic/tier/podcast write in health-funds.ts calls
 *   scheduleTopicSync(id) / scheduleTopicDelete(id) and the change is pushed to
 *   Supabase asynchronously (debounced, best-effort, fully non-blocking).
 */
import type Database from "better-sqlite3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocketImpl from "ws";
import { bootstrapHfSupabaseSchema } from "./hf-supabase-bootstrap";

// snake_case columns exactly as defined in
// deliverables/supabase_migration_health_funds.sql (+ the podcast migration).
const TOPIC_COLS = [
  "id", "catalog_no", "kind", "category", "sub_category", "topic", "audience",
  "benefit_summary", "range_text", "range_min", "range_max", "best_fund",
  "public_site_text", "treating_body", "full_benefit", "conditions",
  "qualifying_cases", "preparation", "documents", "how_to_apply",
  "official_links", "notes", "ai_search", "sort_order", "active", "created_by",
  "created_at", "updated_at", "podcast_script", "podcast_audio_url",
  "podcast_status", "podcast_updated_at",
] as const;

const TIER_COLS = [
  "id", "topic_id", "col", "fund", "fund_key", "tier", "prog", "value",
  "created_at", "updated_at",
] as const;

let client: SupabaseClient | null = null;
let sdb: Database.Database | null = null;
let enabled = false;
let booted = false;

// Debounced per-topic sync queue so a burst of edits collapses into one push.
const pendingTopics = new Set<number>();
const pendingDeletes = new Set<number>();
let flushTimer: NodeJS.Timeout | null = null;

function log(...args: unknown[]) {
  console.log("[hf-sync]", ...args);
}

/**
 * Initialise the sync layer. Called from bindHealthFundsDb with the same SQLite
 * handle health-funds uses. No-op (stays disabled) when Supabase env is absent,
 * so SQLite-only deployments are completely unaffected.
 */
export function initHfSupabaseSync(db: Database.Database): void {
  sdb = db;
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    log("Supabase env not set — health-funds stays on local SQLite only.");
    enabled = false;
    return;
  }
  try {
    // Mirror supabase-storage.ts client options: we only use the Postgres REST
    // API, but realtime-js needs a WebSocket constructor that Node < 22 lacks,
    // so we provide one from `ws` to avoid a crash at init.
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocketImpl as unknown as never },
      global: { headers: { "x-bkalut-app": "bkalut-hf-sync" } },
    });
    enabled = true;
    log("Supabase backend bound for health-funds.");
    // Bootstrap in the background; never block server start. First ensure the
    // hf_* schema exists in Postgres (auto DDL via DATABASE_URL), then run the
    // two-way data bootstrap once the tables are guaranteed present.
    void (async () => {
      try {
        await bootstrapHfSupabaseSchema();
      } catch (err) {
        log("schema bootstrap skipped:", (err as Error)?.message || err);
      }
      await bootstrap();
    })().catch((err) => log("bootstrap skipped:", err?.message || err));
  } catch (err) {
    enabled = false;
    log("init failed, staying on SQLite:", (err as Error)?.message || err);
  }
}

// ---- row mapping (local SQLite row -> Supabase row) ------------------------

function topicRowForUpload(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of TOPIC_COLS) out[c] = r[c] ?? null;
  return out;
}
function tierRowForUpload(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of TIER_COLS) out[c] = r[c] ?? null;
  return out;
}

// ---- bootstrap (two-way, once on boot) -------------------------------------

async function bootstrap(): Promise<void> {
  if (!client || !sdb) return;
  const { count, error } = await client
    .from("hf_topics")
    .select("id", { count: "exact", head: true });
  if (error) {
    log("bootstrap: cannot read hf_topics (is the schema applied?):", error.message);
    return;
  }
  const localCount =
    (sdb.prepare("SELECT COUNT(*) AS c FROM hf_topics").get() as { c: number }).c;

  if ((count ?? 0) === 0 && localCount > 0) {
    log(`Supabase empty, local has ${localCount} topics — pushing catalog up.`);
    await pushAll();
  } else if ((count ?? 0) > 0) {
    log(`Supabase has ${count} topics — pulling into local SQLite.`);
    await pullAll();
  } else {
    log("Both Supabase and local are empty — nothing to bootstrap.");
  }
  booted = true;
}

/** Push the entire local catalog to Supabase (upsert by primary key id). */
async function pushAll(): Promise<void> {
  if (!client || !sdb) return;
  const topics = sdb.prepare("SELECT * FROM hf_topics").all() as Record<string, unknown>[];
  const tiers = sdb.prepare("SELECT * FROM hf_tiers").all() as Record<string, unknown>[];
  const chunk = 200;
  for (let i = 0; i < topics.length; i += chunk) {
    const batch = topics.slice(i, i + chunk).map(topicRowForUpload);
    const { error } = await client.from("hf_topics").upsert(batch, { onConflict: "id" });
    if (error) { log("pushAll topics error:", error.message); return; }
  }
  for (let i = 0; i < tiers.length; i += chunk) {
    const batch = tiers.slice(i, i + chunk).map(tierRowForUpload);
    const { error } = await client.from("hf_tiers").upsert(batch, { onConflict: "id" });
    if (error) { log("pushAll tiers error:", error.message); return; }
  }
  log(`pushAll done: ${topics.length} topics, ${tiers.length} tiers.`);
}

/** Pull the entire Supabase catalog into local SQLite (replace, transactional). */
async function pullAll(): Promise<void> {
  if (!client || !sdb) return;
  const topics = await fetchAll("hf_topics");
  const tiers = await fetchAll("hf_tiers");
  if (topics === null || tiers === null) return; // read error already logged

  const db = sdb;
  const insTopic = db.prepare(
    `INSERT OR REPLACE INTO hf_topics (${TOPIC_COLS.join(",")})
     VALUES (${TOPIC_COLS.map(() => "?").join(",")})`,
  );
  const insTier = db.prepare(
    `INSERT OR REPLACE INTO hf_tiers (${TIER_COLS.join(",")})
     VALUES (${TIER_COLS.map(() => "?").join(",")})`,
  );
  const apply = db.transaction(() => {
    db.prepare("DELETE FROM hf_tiers").run();
    db.prepare("DELETE FROM hf_topics").run();
    for (const t of topics) insTopic.run(...TOPIC_COLS.map((c) => normalizeForSqlite(t[c])));
    for (const t of tiers) insTier.run(...TIER_COLS.map((c) => normalizeForSqlite(t[c])));
  });
  apply();
  log(`pullAll done: ${topics.length} topics, ${tiers.length} tiers.`);
}

// SQLite (better-sqlite3) only binds number/string/bigint/null/Buffer. Postgres
// returns booleans for INTEGER-as-bool and may return JS objects; coerce safely.
function normalizeForSqlite(v: unknown): string | number | bigint | null | Buffer {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number" || typeof v === "bigint") return v;
  if (typeof v === "string") return v;
  if (v instanceof Buffer) return v;
  return String(v);
}

async function fetchAll(table: string): Promise<Record<string, unknown>[] | null> {
  if (!client) return null;
  const pageSize = 1000;
  let from = 0;
  const rows: Record<string, unknown>[] = [];
  for (;;) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) { log(`fetchAll ${table} error:`, error.message); return null; }
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

// ---- ongoing incremental sync (called from health-funds write paths) -------

/** Queue a topic (with its tiers) to be mirrored to Supabase. Non-blocking. */
export function scheduleTopicSync(topicId: number): void {
  if (!enabled) return;
  pendingDeletes.delete(topicId);
  pendingTopics.add(topicId);
  arm();
}

/** Queue a topic deletion to be mirrored to Supabase. Non-blocking. */
export function scheduleTopicDelete(topicId: number): void {
  if (!enabled) return;
  pendingTopics.delete(topicId);
  pendingDeletes.add(topicId);
  arm();
}

function arm(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush().catch((err) => log("flush error:", err?.message || err));
  }, 400);
}

async function flush(): Promise<void> {
  if (!client || !sdb || !enabled) return;
  const upserts = Array.from(pendingTopics);
  const deletes = Array.from(pendingDeletes);
  pendingTopics.clear();
  pendingDeletes.clear();

  for (const id of deletes) {
    await client.from("hf_tiers").delete().eq("topic_id", id);
    const { error } = await client.from("hf_topics").delete().eq("id", id);
    if (error) log(`delete topic ${id} error:`, error.message);
  }

  for (const id of upserts) {
    const topic = sdb.prepare("SELECT * FROM hf_topics WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!topic) continue; // deleted meanwhile
    const { error: tErr } = await client
      .from("hf_topics")
      .upsert(topicRowForUpload(topic), { onConflict: "id" });
    if (tErr) { log(`upsert topic ${id} error:`, tErr.message); continue; }

    // Replace this topic's tiers wholesale (simplest correct mirror).
    const tiers = sdb
      .prepare("SELECT * FROM hf_tiers WHERE topic_id = ?")
      .all(id) as Record<string, unknown>[];
    await client.from("hf_tiers").delete().eq("topic_id", id);
    if (tiers.length) {
      const { error: rErr } = await client
        .from("hf_tiers")
        .upsert(tiers.map(tierRowForUpload), { onConflict: "id" });
      if (rErr) log(`upsert tiers for topic ${id} error:`, rErr.message);
    }
  }
}

export function isHfSyncEnabled(): boolean {
  return enabled;
}
export function isHfSyncBooted(): boolean {
  return booted;
}
