-- more30 · 32 nadlan-berega — rental_data upsert, not write-only
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-20 without a
-- matching repo file until now.
-- ============================================================================
--
-- Before this, every rent-report refresh inserted a fresh row per area/month
-- instead of updating the existing one, so the "last real market rent"
-- fallback (used when the Apify listing quota is exhausted) had no single
-- current source of truth per area+month to read back. The unique index lets
-- the ingest path `on conflict (area_code, month) do update` — one refreshed
-- row per area+month, no duplicates.

create unique index if not exists rental_data_area_month_key
  on nadlan.rental_data (area_code, month);
