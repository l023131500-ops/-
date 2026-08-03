-- ============================================================================
-- Torah Platform · Migration 005 · Security Hardening
-- Locks down search_path on SECURITY DEFINER functions and removes unnecessary
-- EXECUTE permissions from anon/authenticated/public.
-- Also tightens insert policies on donations/orders/order_items.
-- ============================================================================

-- Lock down search_path
alter function public.has_tenant_role(uuid, uuid, public.app_role) set search_path = public, pg_temp;
alter function public.user_tenants(uuid) set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.handle_new_tenant() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.user_in_tenant(uuid) set search_path = public, pg_temp;
alter function public.is_super_admin(uuid) set search_path = public, pg_temp;

-- Revoke unnecessary execute permissions
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_tenant() from public, anon, authenticated;
revoke execute on function public.has_tenant_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.user_in_tenant(uuid) from public, anon;
revoke execute on function public.is_super_admin(uuid) from public, anon;
revoke execute on function public.user_tenants(uuid) from public, anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Tighten public-insert policies to require valid tenant / parent order
drop policy if exists donations_insert on public.donations;
create policy donations_insert on public.donations
  for insert
  with check (
    exists (select 1 from public.tenants t where t.id = donations.tenant_id)
  );

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert
  with check (
    exists (select 1 from public.tenants t where t.id = orders.tenant_id)
  );

drop policy if exists oi_insert on public.order_items;
create policy oi_insert on public.order_items
  for insert
  with check (
    exists (select 1 from public.orders o where o.id = order_items.order_id)
  );
