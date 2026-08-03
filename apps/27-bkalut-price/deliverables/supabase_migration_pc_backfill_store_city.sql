-- Migration: backfill pc_stores.city for existing cerberus + shufersal stores.
--
-- What this fixes
-- ---------------
-- The user-facing "search by city" feature was broken: 520/554 cerberus stores
-- and 10/10 shufersal stores had pc_stores.city = NULL. Two things caused this:
--
--   1) A CODE bug (fixed separately in script/pc/supabase-repo.ts:upsertStore):
--      the Stores file sets the real <City>, but a later PriceFull import for the
--      same store — whose header carries no City (→ null) — updated the row and
--      wiped the city. That fix stops FUTURE imports from nulling the city.
--
--   2) The HISTORICAL rows already in pc_stores are still NULL and the source
--      <City> value is not stored anywhere in the DB, so it cannot be recovered.
--      The pragmatic recovery is this backfill: for these chains the sampled data
--      shows pc_stores.name holds the city (e.g. "כפר סבא", "אשדוד", "חיפה") and
--      pc_stores.branch holds the street address, so copying name → city is far
--      better than leaving the column NULL and restores search-by-city today.
--
-- Note: some cerberus `name` values include a neighborhood suffix (e.g.
-- "פתח תקווה - סגולה", "אשקלון בת הדר"). Copying the whole name into city is
-- accepted here (better than NULL); we deliberately do NOT parse/split it.
--
-- Scope & safety
-- --------------
--   * Restricted to stores whose chain_id belongs to a cerberus/shufersal feed
--     (join pc_feed_sources on chain_id, adapter IN ('cerberus','shufersal')).
--     The 23 other working chains, rights/fin_* tables and price data are NOT
--     touched.
--   * Only fills rows where city IS NULL OR city = '' AND name is present, so a
--     store that already has a real city is never overwritten.
--   * Idempotent: the `city IS DISTINCT FROM name` guard makes a second run a
--     no-op (once city = name, the row no longer qualifies).
--   * Does NOT run automatically from CI. Apply after review with:
--       psql "$SUPABASE_DB_URL" -f deliverables/supabase_migration_pc_backfill_store_city.sql
--     or paste into the Supabase SQL editor.

UPDATE pc_stores AS s
   SET city       = s.name,
       updated_at = now()::text
  FROM pc_feed_sources AS f
 WHERE s.chain_id = f.chain_id
   AND lower(f.adapter) IN ('cerberus', 'shufersal')
   AND (s.city IS NULL OR s.city = '')
   AND s.name IS NOT NULL
   AND s.name <> ''
   AND s.city IS DISTINCT FROM s.name;

-- Verification: after applying, expect 0 remaining NULL/empty cities for
-- cerberus/shufersal stores, and a sample of the backfilled rows.
--   SELECT COUNT(*) AS still_missing
--     FROM pc_stores s
--     JOIN pc_feed_sources f ON f.chain_id = s.chain_id
--    WHERE lower(f.adapter) IN ('cerberus','shufersal')
--      AND (s.city IS NULL OR s.city = '');
--
--   SELECT s.id, s.chain_id, s.name, s.branch, s.city
--     FROM pc_stores s
--     JOIN pc_feed_sources f ON f.chain_id = s.chain_id
--    WHERE lower(f.adapter) IN ('cerberus','shufersal')
--    ORDER BY s.id
--    LIMIT 20;
