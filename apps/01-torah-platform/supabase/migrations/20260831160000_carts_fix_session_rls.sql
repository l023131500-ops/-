-- carts_self granted full read/write/delete to ANY caller (anon or
-- authenticated) on ANY row where session_id happened to be non-null, with
-- no comparison at all against the caller's own session:
--
--   using ( (user_id is not null and user_id = auth.uid()) or session_id is not null )
--
-- Postgres RLS has no way to see a client-generated, non-JWT "my session id"
-- value, so "session_id is not null" is not a scoping condition -- it is a
-- blanket grant covering every guest cart in the table, across every
-- tenant. Verified live via a rolled-back transaction as role 'anon': an
-- unrelated caller could select every row (bool_or match on a victim's
-- session_id = true with zero id/session filter), overwrite another
-- session's `items`, and delete it outright.
--
-- Zero live rows and zero references anywhere in src/ (the shop's actual
-- cart is the client-only Zustand store in src/hooks/useCart.tsx, persisted
-- to localStorage -- this table was wired up in the 2026-05-19 commerce
-- migration but nothing ever reads or writes it), so there is no guest-cart
-- flow depending on the open branch and nothing to migrate. Close the hole
-- by scoping to the authenticated owner plus tenant_admin/super_admin (same
-- admin-visibility shape as neda_txn/pc_write above), matching the
-- owner_user_id pattern already used for study_schedules ownership.

drop policy if exists "carts_self" on public.carts;

create policy "carts_self" on public.carts
  for all
  using (
    (user_id is not null and user_id = (select auth.uid()))
    or is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  )
  with check (
    (user_id is not null and user_id = (select auth.uid()))
    or is_super_admin((select auth.uid()))
    or has_tenant_role((select auth.uid()), tenant_id, 'tenant_admin'::app_role)
  );
