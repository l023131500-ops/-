# Supabase — core registry

This folder holds the **`core`** schema (the project registry the admin and
portal read from). There is **one** Supabase project for the whole account:

- Project ref: `uhnrgujbdxhhmoxcjria`
- Org: איגוד שיעורים קלואד
- Region: ap-northeast-1

## ⚠️ Not auto-applied

These SQL files are **not** run automatically. Applying them is a change to the
**live** database, so it needs an explicit go-ahead. The migration is additive
(new `core` schema only) and does **not** touch `public`, `zr_*`, or any existing
table — but review the diff before applying.

Apply order:

1. `migrations/0001_core_schema.sql` — creates `core` schema, tables, view, RLS.
2. `seed/core_projects_seed.sql` — upserts the 31 registry rows (idempotent).

### Notes before applying

- The admin write-policy references `public.platform_admins`. Verify its
  user-id column name matches before applying (the policy assumes `user_id`).
- Nothing here creates new keys or databases. It only adds a registry schema.
