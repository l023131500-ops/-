-- ============================================================================
-- Chatzor Connect — schema `chatzor` (migration 0003)
-- ----------------------------------------------------------------------------
-- Additive only. `resolveTeacherId()` (src/data/repositories.ts) does a
-- check-then-insert: SELECT a teacher by (organization_id, name), and if none
-- is found, INSERT one. Two admins/gabaim entering a lesson with the same new
-- teacher name at the same time both pass the SELECT before either INSERT
-- lands, so both INSERT — chatzor.teachers had no constraint stopping that,
-- and ended up with two rows for the same teacher (different `id`s, so
-- lessons split across them and `resolveTeacherId` keeps "choosing" between
-- duplicates depending on which row a later SELECT happens to return first).
--
-- This constraint closes the race at the database, not just in application
-- code: a concurrent INSERT for the same (organization_id, name) now fails
-- the constraint instead of creating a duplicate row. The application side
-- (repositories.ts) was changed in the same commit to INSERT ... ON CONFLICT
-- DO NOTHING and then SELECT, so the loser of the race gets the winner's row
-- instead of an error.
--
-- Verified against live data first (uhnrgujbdxhhmoxcjria, 19/08/2026): zero
-- existing (organization_id, name) duplicates in chatzor.teachers, so the
-- constraint applies cleanly.
-- ⚠️ Already APPLIED live via Supabase MCP apply_migration on uhnrgujbdxhhmoxcjria
--    (19/08/2026) — this file mirrors that change for the repo record.
-- ============================================================================

alter table chatzor.teachers
  add constraint teachers_org_name_uniq unique (organization_id, name);
