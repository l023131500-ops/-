# bieebmnm → hub: the logic half of the replication (applied 30/07/2026)

The structural pass (139 tables, 329 constraints, 189 indexes, enums, RLS enabled,
5,107 rows) ran on 29/07 and deliberately stopped before functions, views, triggers
and policies — they carry the highest rewrite risk and are only needed at cutover.
This directory is that second half, generated, guarded and applied.

Source of truth: `_more30_vault/supabase_backups/bieebmnm_2026-07-29/schema.json`
(kept out of git — it holds a full introspection of a production database).
`generate.mjs` reads it and emits the four SQL files. Re-running it is deterministic.

Schema map: `public→igud`, `ads→igud_ads`, `transcribe→igud_transcribe`,
`otvedaf→igud_otvedaf`.

## Applied and verified in `uhnrgujbdxhhmoxcjria`

| object | count |
|---|---|
| tables (unchanged, from the structural pass) | 139 |
| views | 18 |
| functions | 18 |
| triggers | 8 |
| policies | 155 |

The hub's own live schemas were untouched: `public` still has exactly 27 tables and
2 policies, `core` and `nadlan` unchanged, and **the new schemas are still not exposed
to PostgREST** (`pgrst.db_schemas` is at its default). Exposing them is what took the
hub's API down for two minutes on 29/07; a cold replica does not need it.

## Four rewrites that were not optional

1. **`SET search_path TO 'public'` inside function bodies.** In the hub, `public` is
   the *live* schema (the 32-system registry, spec submissions, studio storage). A
   SECURITY DEFINER function carrying that search_path would have looked for
   `admin_sessions`, `tenants`, `lessons` there. Rewritten to the replica's schema.

2. **Unqualified trigger targets.** `pg_get_triggerdef` omits the schema for objects
   that were in the search_path when it ran, so the stored definitions read
   `ON nedarim_configs ... EXECUTE FUNCTION set_updated_at()`. In the hub that binds
   to the wrong schema or fails. Both the table and the function are now qualified.

3. **Bare function calls in policy predicates.** 78 policies call `is_super_admin(...)`,
   `has_tenant_role(...)`, `user_in_tenant(...)` unqualified. Resolution goes through
   search_path, which starts at the hub's `public`, where they do not exist — the
   policy would fail the moment it was evaluated. Qualified to the replica.

4. **A schema name that is also a table name.** The source has a table `ads` inside a
   schema `ads`, and RLS predicates self-reference their table: the real text contains
   `ads.tenant_id`, a *column*. Blind schema rewriting turned that into
   `igud_ads.tenant_id`, which is a column of nothing. The rewriter now only replaces
   `<schema>.<name>` when `<name>` is an object that actually lives in that schema.

## Guards in `generate.mjs`

- **Nothing may target `public.`** — every generated statement is re-scanned after
  rewriting and the run aborts rather than guess. Last run: 0 violations.
- **The six protected `zr_*` tables are excluded**, as in the structural pass. That
  drops their 12 policies, listed in `skipped.txt`.
- **Extension-owned functions are excluded.** 114 of the 132 "functions" in the
  source's `public` schema belong to pgvector, which was installed there
  (`array_to_halfvec`, `cosine_distance`, `binary_quantize`, …). Copying them into
  `igud` would be wrong — in the hub pgvector lives in `extensions`. The discriminator
  is `LANGUAGE c`/`internal` with `$libdir/`. That left the 18 real application
  functions.

## Known residue

`igud` contains 4 empty sequences named `zr_*_id_seq`, created by the structural pass
before the exclusion list was applied. Their tables were never copied, so no protected
data is present. They are left in place on purpose: deleting anything named `zr_*` is
exactly what the standing rule forbids, even when it is our own empty artifact.

## Still open (needs a decision, not a script)

Repointing the live applications. Every one of them assumes it owns `public`; in the
hub that is the hub. Each app would have to move to a schema-qualified client or the
schema would have to be exposed to PostgREST. The Lovable-hosted apps (15, 22, 31) are
bound to their own Supabase projects and cannot be detached cleanly. The foreign
sources are all still live as fallback and nothing was deleted anywhere.
