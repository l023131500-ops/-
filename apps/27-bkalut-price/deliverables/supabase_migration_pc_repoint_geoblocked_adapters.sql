-- Migration: repoint the four geo-blocked chains onto the adapters PR #30
-- actually implemented, so the VPS import step (PR #31) selects them by adapter.
--
-- Why this is needed
-- ------------------
-- PR #30 implemented these chains via:
--   * `matrix` (matrixcatalog.co.il, NBCompetitionRegulations.aspx) for
--     ויקטורי / מחסני השוק / ח. כהן, and
--   * `web`    (bare-IP HTML index) for נתיב החסד.
-- But the production `pc_feed_sources` rows still carry the OLD adapters:
--   * ויקטורי / מחסני השוק / ח. כהן → `laibcatalog`
--   * נתיב החסד                     → `binaprojects`
-- With PR #31's `--adapters=matrix,web,laibcatalog` filter the three chains
-- would be selected under `laibcatalog` and run through the WRONG code path,
-- and נתיב החסד (still `binaprojects`) would not be selected at all. This
-- migration repoints them to the correct adapters + discovery URLs and ensures
-- they are active so the daily importer (listActiveFeeds gates on active=1 only)
-- picks them up.
--
-- Scope & safety
-- --------------
--   * Touches ONLY these four chain_ids — no other pc_* rows, no rights/fin_*.
--   * Idempotent: guarded with `adapter IS DISTINCT FROM ...`, so a second run
--     is a no-op. Safe to re-run.
--   * `verified` is left untouched — it is a display marker, not an import gate
--     (the importer runs every active feed and records honest per-feed status).
--   * This is the same repoint already present in script/pc/seed-new-chains.sql;
--     it is extracted here as a standalone, clearly-labeled artifact so it can
--     be applied to production on its own without re-running the whole seed.
--
-- Apply with (do NOT run automatically from CI):
--   psql "$SUPABASE_DB_URL" -f deliverables/supabase_migration_pc_repoint_geoblocked_adapters.sql
-- or paste into the Supabase SQL editor.

-- ויקטורי / מחסני השוק / ח. כהן → matrix (matrixcatalog.co.il).
UPDATE pc_feed_sources
   SET adapter = 'matrix',
       discovery_url = 'http://matrixcatalog.co.il/NBCompetitionRegulations.aspx',
       active = 1,
       updated_at = now()::text
 WHERE chain_id IN ('7290696200003', '7290661400001', '7290455000004')
   AND (adapter IS DISTINCT FROM 'matrix' OR active IS DISTINCT FROM 1);

-- נתיב החסד → web (bare-IP HTML index).
UPDATE pc_feed_sources
   SET adapter = 'web',
       discovery_url = 'http://141.226.203.152/',
       active = 1,
       updated_at = now()::text
 WHERE chain_id = '7290058160839'
   AND (adapter IS DISTINCT FROM 'web' OR active IS DISTINCT FROM 1);

-- Verification (optional): after applying, this should show matrix/matrix/matrix
-- for the first three and web for נתיב החסד, all active=1.
--   SELECT chain_id, chain_name, adapter, active, discovery_url
--     FROM pc_feed_sources
--    WHERE chain_id IN ('7290696200003','7290661400001','7290455000004','7290058160839')
--    ORDER BY chain_id;
