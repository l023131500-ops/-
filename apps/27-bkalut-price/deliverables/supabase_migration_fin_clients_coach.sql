-- =============================================================================
-- Bkalut — Supabase / Postgres migration: add coach_id to fin_clients
--
-- Adds the financial-coach assignment column to fin_clients. This matches the
-- SQLite column already defined in shared/schema.ts (`coachId integer` →
-- `coach_id`) and the server logic in server/fin-routes.ts and
-- server/fin-storage.ts that filters clients by coach.
--
-- The full schema in supabase_bkalut_schema.sql already includes this column
-- (and is re-runnable), so on a clean project that script alone is enough.
-- This file exists for production environments where fin_clients was created
-- before this feature shipped and you want a small, isolated migration to
-- apply by hand or via `supabase db push`.
--
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS.
-- =============================================================================

ALTER TABLE fin_clients
  ADD COLUMN IF NOT EXISTS coach_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_clients_coach_id ON fin_clients(coach_id);
