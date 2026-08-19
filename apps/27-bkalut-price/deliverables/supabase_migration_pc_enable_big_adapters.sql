-- Migration: enable the three large-chain feeds whose real adapters were just
-- implemented (super-pharm, wolt, publishprice/קוויק), and enable מגה/קרפור on
-- the already-working cerberus adapter.
--
-- Why this is needed
-- ------------------
-- These pc_feed_sources rows existed only as documented SKELETONS (active=0)
-- because their adapters were not implemented. The PR that ships alongside this
-- file implements them for real, reusing the shared download → gunzip → XML
-- parse → hash-dedup → resolveCity → barcode-master → Supabase-upsert pipeline:
--   * super-pharm  (id 35, chain 7290172900007) — prices.super-pharm.co.il,
--                  paginated HTML table, download resolved from the הורדה href.
--   * wolt         (id 36, chain 7290058249350) — wm-gateway.wolt.com/isr-prices,
--                  date-index → per-date file list (LIVE-verified from CI).
--   * publishprice (id 34, chain 7291029710008, קוויק) — generic U-CODE grid,
--                  keyed off discovery_url (prices.quik.co.il).
-- Flipping active=1 lets the daily importer (listActiveFeeds gates on active=1)
-- pick them up. discovery_url / adapter are re-asserted defensively so a row
-- that drifted still lands on the correct code path.
--
-- מגה / קרפור (id 9, chain 7290055700007)
-- ---------------------------------------
-- Already carries the WORKING `cerberus` adapter (publishedprices.co.il); it was
-- merely active=0. The published-prices username for Carrefour Israel (which
-- absorbed Mega) is `Carrefour` — set here as auth_user, mirroring the other 15
-- cerberus chains. The cerberus adapter logs in with an EMPTY password by default
-- and, if the portal requires one, reads the secret PC_CERBERUS_PASSWORD_CARREFOUR
-- (uppercased auth_user) — the value is NEVER stored here or in code. This is the
-- exact pattern already used for PAZ/יילו (PC_CERBERUS_PASSWORD_PAZ_BO). Until/if
-- that secret is set, the feed reports an honest per-feed auth failure rather than
-- fake success, so enabling it is safe. See the PR body for the credential note.
--
-- Scope & safety
-- --------------
--   * Touches ONLY these four rows — no other pc_* rows, no rights/fin_* tables.
--   * Idempotent: each UPDATE is guarded so a second run is a no-op. Safe to re-run.
--   * `verified` is left untouched — it is a display marker, not an import gate.
--
-- Apply with (do NOT run automatically from CI):
--   psql "$SUPABASE_DB_URL" -f deliverables/supabase_migration_pc_enable_big_adapters.sql
-- or paste into the Supabase SQL editor.

-- super-pharm → prices.super-pharm.co.il
UPDATE pc_feed_sources
   SET adapter = 'super-pharm',
       discovery_url = 'http://prices.super-pharm.co.il/',
       active = 1,
       updated_at = now()::text
 WHERE chain_id = '7290172900007'
   AND (adapter IS DISTINCT FROM 'super-pharm'
        OR active IS DISTINCT FROM 1
        OR discovery_url IS DISTINCT FROM 'http://prices.super-pharm.co.il/');

-- wolt → wm-gateway.wolt.com/isr-prices
UPDATE pc_feed_sources
   SET adapter = 'wolt',
       discovery_url = 'https://wm-gateway.wolt.com/isr-prices/public/v1/index.html',
       active = 1,
       updated_at = now()::text
 WHERE chain_id = '7290058249350'
   AND (adapter IS DISTINCT FROM 'wolt'
        OR active IS DISTINCT FROM 1
        OR discovery_url IS DISTINCT FROM 'https://wm-gateway.wolt.com/isr-prices/public/v1/index.html');

-- publishprice / קוויק → prices.quik.co.il
UPDATE pc_feed_sources
   SET adapter = 'publishprice',
       discovery_url = 'https://prices.quik.co.il/',
       active = 1,
       updated_at = now()::text
 WHERE chain_id = '7291029710008'
   AND (adapter IS DISTINCT FROM 'publishprice'
        OR active IS DISTINCT FROM 1
        OR discovery_url IS DISTINCT FROM 'https://prices.quik.co.il/');

-- מגה / קרפור → cerberus (already-working adapter), username Carrefour.
-- Password (if the portal requires one) comes ONLY from the secret
-- PC_CERBERUS_PASSWORD_CARREFOUR — never stored here.
UPDATE pc_feed_sources
   SET adapter = 'cerberus',
       discovery_url = 'https://url.publishedprices.co.il',
       auth_user = 'Carrefour',
       active = 1,
       updated_at = now()::text
 WHERE chain_id = '7290055700007'
   AND (adapter IS DISTINCT FROM 'cerberus'
        OR active IS DISTINCT FROM 1
        OR auth_user IS DISTINCT FROM 'Carrefour'
        OR discovery_url IS DISTINCT FROM 'https://url.publishedprices.co.il');

-- Verification (optional): after applying, all four should be active=1 on the
-- expected adapters.
--   SELECT id, chain_id, chain_name, adapter, auth_user, active, discovery_url
--     FROM pc_feed_sources
--    WHERE chain_id IN ('7290172900007','7290058249350','7291029710008','7290055700007')
--    ORDER BY chain_id;
