/**
 * pc-mirror-to-sqlite.ts
 *
 * Resolves the architecture disconnect: the daily import + weekly enrichment
 * write the full national price dataset to Supabase/Postgres, but the web
 * server's /api/pc/* routes read from a local SQLite `data.db` via the
 * synchronous price-comparison module. In production that SQLite file is empty,
 * so search returns nothing.
 *
 * This script MIRRORS the canonical Supabase pc_* tables into the local SQLite
 * `data.db` that the server ships with. It runs in CI right after the daily
 * import, and the resulting data.db is what the deployed server serves. The
 * existing fast synchronous module is left untouched — zero regression risk.
 *
 * Design:
 *  - Bind SQLite through the real server module so every pc_ table + every
 *    runtime-added column is created exactly as the server expects.
 *  - For each table, read ALL rows from Supabase via plain PostgREST fetch
 *    (paginated past the 1000-row hard cap with limit/offset), then bulk-insert
 *    into SQLite inside a transaction, copying only the columns present in BOTH
 *    sides. The read path is deliberately supabase-js-free: that client builds a
 *    RealtimeClient on construction which needs a global WebSocket, crashing on
 *    Node 20 ("Node.js 20 detected without native WebSocket support"). The
 *    mirror only SELECTs, so PostgREST over fetch removes the dependency entirely.
 *  - Full refresh per table (DELETE + re-insert) so the mirror is an exact
 *    snapshot. IDs are preserved so price.product_id / price.store_id stay valid.
 *
 * Usage:  tsx script/pc-mirror-to-sqlite.ts [--db ./data.db] [--dry-run]
 * Env:    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { bindPriceComparisonDb } from "../server/price-comparison";

// Tables to mirror, in FK-safe order (parents before children).
const TABLES = [
  "pc_categories",
  "pc_stores",
  "pc_products",
  "pc_prices",
  "pc_promotions",
  "pc_feed_sources",
  "pc_price_history",
] as const;

// Keyset page size. Kept well under any single-query statement timeout. On a
// 57014 timeout we halve down to MIN_PAGE_SIZE and retry, so a slow window can
// never truncate the whole table (the old offset paging did exactly that:
// offset grew until Postgres cancelled the query at ~234k rows and the rest of
// pc_prices was silently dropped).
const PAGE_SIZE = 5000;
const MIN_PAGE_SIZE = 500;

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}
const DRY = process.argv.includes("--dry-run");

interface RestConfig {
  url: string;
  key: string;
}

function getRestConfig(): RestConfig {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("pc-mirror: SUPABASE_URL + a SUPABASE key env var are required");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function sqliteColumns(db: Database.Database, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

// A statement-timeout (Postgres 57014) surfaced as a PostgREST error. Retryable
// by shrinking the page size.
export class TimeoutError extends Error {}
// The table can't be read at all (missing in Supabase, auth, etc.). Not
// retryable — the mirror treats it as an empty table and moves on, matching the
// previous behavior for tables that don't exist yet.
class TableUnavailableError extends Error {}

function isStatementTimeout(status: number, body: string): boolean {
  return body.includes("57014") || body.includes("statement timeout");
}

/**
 * Timeout-safe keyset pager. Pulls every row by walking `id` ascending
 * (WHERE id > lastId ORDER BY id LIMIT pageSize) instead of limit/offset, so no
 * single query pays the cost of skipping a growing offset. On a TimeoutError it
 * halves the page size (down to minPageSize) and retries the SAME window, so
 * rows are never skipped or duplicated. Injectable `fetchPage` keeps it unit-
 * testable without a live Supabase.
 */
export async function fetchAllKeyset(
  fetchPage: (afterId: number, pageSize: number) => Promise<Record<string, unknown>[]>,
  opts: { pageSize?: number; minPageSize?: number } = {},
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const minPageSize = opts.minPageSize ?? MIN_PAGE_SIZE;
  let pageSize = Math.max(opts.pageSize ?? PAGE_SIZE, minPageSize);
  let lastId = 0; // ids are positive, so 0 is below the first row.
  for (;;) {
    let batch: Record<string, unknown>[];
    try {
      batch = await fetchPage(lastId, pageSize);
    } catch (e) {
      if (e instanceof TimeoutError && pageSize > minPageSize) {
        pageSize = Math.max(minPageSize, Math.floor(pageSize / 2));
        continue; // retry the same id window with a smaller page
      }
      throw e;
    }
    if (batch.length === 0) break;
    out.push(...batch);
    const nextId = Number((batch[batch.length - 1] as { id?: unknown }).id);
    if (!Number.isFinite(nextId)) {
      throw new Error("fetchAllKeyset: rows require a numeric 'id' for keyset pagination");
    }
    lastId = nextId;
    if (batch.length < pageSize) break;
  }
  return out;
}

async function fetchAll(cfg: RestConfig, table: string): Promise<Record<string, unknown>[]> {
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    Accept: "application/json",
  };
  const fetchPage = async (afterId: number, pageSize: number) => {
    const url =
      `${cfg.url}/rest/v1/${encodeURIComponent(table)}` +
      `?select=*&id=gt.${afterId}&order=id.asc&limit=${pageSize}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      if (isStatementTimeout(res.status, msg)) {
        throw new TimeoutError(`${res.status} ${msg}`);
      }
      throw new TableUnavailableError(`${res.status} ${msg}`);
    }
    return (await res.json()) as Record<string, unknown>[];
  };
  try {
    return await fetchAllKeyset(fetchPage, { pageSize: PAGE_SIZE });
  } catch (e) {
    if (e instanceof TableUnavailableError) {
      // Table may not exist in Supabase yet — treat as empty, warn.
      console.warn(`  ! ${table}: ${e.message} (skipping)`);
      return [];
    }
    // A timeout that persisted even at the minimum page size. Fail loudly
    // rather than silently mirror a truncated table.
    throw new Error(`pc-mirror: ${table} read failed: ${(e as Error).message}`);
  }
}

function mirrorTable(
  db: Database.Database,
  table: string,
  rows: Record<string, unknown>[],
): { inserted: number; columns: string[] } {
  const sqliteCols = sqliteColumns(db, table);
  if (sqliteCols.size === 0) {
    console.warn(`  ! ${table}: not present in SQLite schema, skipping`);
    return { inserted: 0, columns: [] };
  }
  // Columns to copy = intersection of Supabase row keys and SQLite columns.
  const srcKeys = rows.length ? Object.keys(rows[0]) : [...sqliteCols];
  const cols = srcKeys.filter((k) => sqliteCols.has(k));
  if (cols.length === 0) return { inserted: 0, columns: [] };

  const placeholders = cols.map(() => "?").join(",");
  const insert = db.prepare(
    `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`,
  );

  const toSqlite = (v: unknown): unknown => {
    if (v === null || v === undefined) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "object") return JSON.stringify(v);
    return v as string | number;
  };

  const run = db.transaction((data: Record<string, unknown>[]) => {
    db.exec(`DELETE FROM ${table}`);
    let n = 0;
    for (const r of data) {
      insert.run(...cols.map((c) => toSqlite(r[c])));
      n++;
    }
    return n;
  });

  const inserted = run(rows);
  return { inserted, columns: cols };
}

async function main() {
  const dbPath = path.resolve(arg("--db", "data.db")!);
  console.log(`[pc-mirror] target SQLite: ${dbPath}${DRY ? " (DRY RUN — no writes)" : ""}`);

  const cfg = getRestConfig();

  // Read everything from Supabase first.
  const snapshot: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLES) {
    const rows = await fetchAll(cfg, t);
    snapshot[t] = rows;
    console.log(`  · ${t}: ${rows.length} rows from Supabase`);
  }

  if (DRY) {
    console.log("[pc-mirror] dry run complete — nothing written.");
    return;
  }

  // Bind SQLite through the real server module → creates all tables + columns.
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  bindPriceComparisonDb(db);

  // Disable FK enforcement during full-refresh so order/orphan timing is safe.
  db.pragma("foreign_keys = OFF");

  let totalRows = 0;
  for (const t of TABLES) {
    const { inserted, columns } = mirrorTable(db, t, snapshot[t]);
    totalRows += inserted;
    console.log(`  ✓ ${t}: ${inserted} rows mirrored (${columns.length} cols)`);
  }

  db.pragma("foreign_keys = ON");
  db.exec("VACUUM");
  db.close();

  console.log(`[pc-mirror] done. ${totalRows} total rows mirrored into ${dbPath}.`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((e) => {
    console.error("[pc-mirror] FATAL:", e?.message || e);
    process.exit(1);
  });
}
