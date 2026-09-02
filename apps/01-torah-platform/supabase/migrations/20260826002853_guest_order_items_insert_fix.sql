-- Guest shop checkout was fully broken: order_items' insert policy checks
-- that the parent order exists via a plain EXISTS subquery on public.orders,
-- but that subquery runs as the querying role and is itself filtered by
-- orders_self_read (user_id = auth.uid()), which is NULL = NULL (not true)
-- for a guest order (no user_id). So a guest's own order, inserted moments
-- earlier in the same request, was invisible to the EXISTS check and the
-- order_items insert was rejected by RLS. A narrow SECURITY DEFINER
-- existence-check (returns only a boolean, no row data) breaks that
-- dependency on the caller's own SELECT visibility -- same narrow-helper
-- pattern already used by has_tenant_role/is_super_admin/user_in_tenant.

create or replace function public.order_exists(_order_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (select 1 from public.orders where id = _order_id);
$$;

revoke all on function public.order_exists(uuid) from public;
grant execute on function public.order_exists(uuid) to anon, authenticated;

drop policy if exists "oi_insert" on public.order_items;
create policy "oi_insert" on public.order_items for insert with check (
  public.order_exists(order_id)
);
