-- Migration: fix two mislabeled binaprojects feed rows + re-activate חצי חינם.
--
-- What this fixes
-- ---------------
-- 1) FINDING 1 (main bug) — two ACTIVE binaprojects feeds imported 0 stores
--    because pc_feed_sources.chain_id did NOT match the chain_id embedded in the
--    files their own subdomain serves. The binaprojects adapter is chain_id-
--    agnostic in DISCOVERY (each chain has its own subdomain, so it downloads
--    every file the subdomain lists — see script/pc/adapters.ts:discoverBinaprojects,
--    which never filters by chain_id). The store/price importer then tags rows
--    with the chain_id read from the FILE's <ChainId> header
--    (script/pc-daily-import.ts → server pc-import/xml parseStores/parsePrices).
--    So the rows WERE imported — just under the file's REAL chain_id, while the
--    feed row (and every admin/comparison view keyed on feed.chain_id) looked
--    under the WRONG id → "0 stores" for the feed. The fix is a pure data
--    correction: align pc_feed_sources.chain_id with the real chain_id in the
--    filenames. No adapter code change is required (confirmed: the adapter does
--    not filter by chain_id; a regression test in
--    script/pc/__tests__/json-adapters.test.ts pins this behaviour).
--
--      id=29 "משנת יוסף"          chain_id 5144744100001 → 7290058289400
--            discovery_url http://ktshivuk.binaprojects.com/MainIO_Hok.aspx
--            serves Price/StoresFull 7290058289400-*.gz (stores: "קיי טי מרקט",
--            "קיי טי מרקט חריש", "בית שמש"). The subdomain ("kt…") and the store
--            names show this is really the KT Market chain, so chain_name is
--            corrected to "קיי טי מרקט" (original kept in notes).
--
--      id=28 "סיטי מרקט קריית גת"  chain_id 7290058288526 → 7290058266241
--            discovery_url http://citymarketkiryatgat.binaprojects.com/MainIO_Hok.aspx
--            serves Price 7290058266241-*.gz. chain_name is left unchanged
--            (still a City Market storefront — only the chain_id was wrong).
--
--    No collision: neither 7290058289400 nor 7290058266241 exists on any other
--    pc_feed_sources row (verified against the repo seed; the WHERE guards below
--    also make each UPDATE a no-op if the row is not the expected mislabeled one).
--
-- 2) FINDING 2 — re-activate חצי חינם (id=7, adapter=cerberus, auth_user=
--    HaziHinam). The publishedprices portal is open again and this chain was
--    verified working before; it was left active=0. Flip it back on. If the
--    HaziHinam account needs a password, the cerberus adapter looks it up from
--    env secret PC_CERBERUS_PASSWORD_HAZIHINAM (see PR notes) — never hardcoded.
--
-- Scope & safety
-- --------------
--   * Touches ONLY ids 7, 28, 29 — no other pc_* rows, no rights/fin_* tables,
--     and none of the 23 working chains.
--   * Idempotent: each UPDATE matches the row by id AND its current (wrong)
--     value and carries an `IS DISTINCT FROM` guard, so a second run is a no-op.
--   * Does NOT run automatically from CI. Apply after review with:
--       psql "$SUPABASE_DB_URL" -f deliverables/supabase_migration_pc_fix_binaprojects_chainid_and_activate_hazihinam.sql
--     or paste into the Supabase SQL editor.

-- FINDING 1 — id=29 משנת יוסף → KT Market (קיי טי מרקט), chain_id corrected.
UPDATE pc_feed_sources
   SET chain_id   = '7290058289400',
       chain_name = 'קיי טי מרקט',
       notes      = COALESCE(notes, '') ||
                    ' [תוקן: chain_id 5144744100001→7290058289400 והשם ''משנת יוסף''→''קיי טי מרקט'' לפי chain_id שבשמות הקבצים בפורטל (ktshivuk.binaprojects.com).]',
       updated_at = now()::text
 WHERE id = 29
   AND chain_id = '5144744100001'
   AND (chain_id IS DISTINCT FROM '7290058289400' OR chain_name IS DISTINCT FROM 'קיי טי מרקט');

-- FINDING 1 — id=28 סיטי מרקט קריית גת, chain_id corrected (name unchanged).
UPDATE pc_feed_sources
   SET chain_id   = '7290058266241',
       notes      = COALESCE(notes, '') ||
                    ' [תוקן: chain_id 7290058288526→7290058266241 לפי chain_id שבשמות הקבצים בפורטל (citymarketkiryatgat.binaprojects.com).]',
       updated_at = now()::text
 WHERE id = 28
   AND chain_id = '7290058288526'
   AND chain_id IS DISTINCT FROM '7290058266241';

-- FINDING 2 — id=7 חצי חינם: re-activate the cerberus feed.
UPDATE pc_feed_sources
   SET active     = 1,
       updated_at = now()::text
 WHERE id = 7
   AND adapter = 'cerberus'
   AND auth_user = 'HaziHinam'
   AND active IS DISTINCT FROM 1;

-- Verification (optional): after applying, expect the corrected ids + active=1.
--   SELECT id, chain_name, chain_id, adapter, auth_user, active
--     FROM pc_feed_sources
--    WHERE id IN (7, 28, 29)
--    ORDER BY id;
