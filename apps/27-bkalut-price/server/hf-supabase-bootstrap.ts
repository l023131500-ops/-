/**
 * Automatic Supabase schema bootstrap for the Health-Fund (hf_*) module.
 *
 * Runs the additive, idempotent DDL (CREATE TABLE / ADD COLUMN IF NOT EXISTS +
 * RLS enable) directly against Postgres on server start, so the hf_topics /
 * hf_tiers / hf_requests tables and the podcast columns always exist in the
 * hosted DB without any manual SQL Editor step.
 *
 * Trigger: only runs when DATABASE_URL (the Supabase Postgres connection
 * string) is set. The Supabase REST/anon API cannot execute DDL, so a direct
 * Postgres connection is required — this is the standard Supabase migration
 * path. When DATABASE_URL is absent (e.g. local SQLite dev), this is a no-op.
 *
 * Safety:
 *   - All statements are additive & idempotent (IF NOT EXISTS). Re-running on
 *     every boot is safe and never drops or alters existing data.
 *   - Failures are logged, never fatal — the server still starts.
 *   - Touches ONLY the hf_* tables (its own migration files).
 */
import { readFileSync } from "fs";
import { join } from "path";

// Migration files, in apply order. Resolved relative to the repo root so it
// works both from source (server/) and from the bundled dist/.
const MIGRATION_FILES = [
  "deliverables/supabase_migration_health_funds.sql",
  "deliverables/supabase_migration_health_funds_podcast.sql",
  "deliverables/supabase_rls_health_funds.sql",
];

function log(...args: unknown[]) {
  console.log("[hf-bootstrap]", ...args);
}

function resolveRoot(): string {
  // dist/index.cjs runs from <repo>/dist; source runs from <repo>/server.
  // process.cwd() is the repo root in both `npm start` and `npm run dev`.
  return process.cwd();
}

function readMigration(rel: string): string | null {
  const base = rel.replace(/^deliverables\//, "");
  const candidates = [
    // Source / repo-root layout.
    join(resolveRoot(), rel),
    join(resolveRoot(), "..", rel),
    join(__dirname, "..", rel),
    // Bundled dist layout: build.ts copies these into dist/deliverables/.
    join(resolveRoot(), "dist", "deliverables", base),
    join(__dirname, "deliverables", base),
    join(__dirname, "..", "deliverables", base),
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p, "utf8");
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Apply the hf_* schema to Supabase Postgres. Safe to call on every boot.
 * Returns true if the schema was applied (or already present), false if skipped
 * or failed. Never throws.
 */
export async function bootstrapHfSupabaseSchema(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    log("DATABASE_URL not set — skipping DDL bootstrap (SQLite-only mode).");
    return false;
  }

  // Lazy import so `pg` is only loaded when actually needed.
  let Client: typeof import("pg").Client;
  try {
    ({ Client } = await import("pg"));
  } catch (err) {
    log("pg module unavailable — skipping DDL bootstrap:", (err as Error)?.message);
    return false;
  }

  // Supabase requires SSL. Allow self-signed (pooler) certs.
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (err) {
    log("could not connect to Postgres — skipping DDL bootstrap:", (err as Error)?.message);
    return false;
  }

  let appliedAny = false;
  try {
    for (const rel of MIGRATION_FILES) {
      const sql = readMigration(rel);
      if (!sql) {
        log(`migration file not found, skipping: ${rel}`);
        continue;
      }
      try {
        await client.query(sql);
        appliedAny = true;
        log(`applied: ${rel}`);
      } catch (err) {
        // Idempotent DDL rarely errors, but never let one file abort the rest.
        log(`error applying ${rel}:`, (err as Error)?.message);
      }
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  if (appliedAny) log("hf_* schema bootstrap complete.");
  return appliedAny;
}
