-- /donate/success and /order/success already exist as pages, but nothing
-- ever navigates to them: nedarim-webhook (the Nedarim Plus IPN) flips
-- donations/orders.payment_status to "captured" server-side once the iframe
-- payment completes, but the browser never learns that happened -- the
-- iframe just keeps showing Nedarim's own confirmation screen forever.
--
-- The donor/buyer already knows their own donation_id/order_id (generated
-- client-side before the iframe was ever shown -- see the guest-insert fix
-- above), so the client can poll payment_status directly. The blocker is
-- the same one guest inserts hit: donations_self_read/orders_self_read
-- require user_id = auth.uid(), which is NULL = NULL (not true) for a
-- guest (no user_id) -- so a guest polling their own row via a plain
-- .select() would always come back empty. A narrow SECURITY DEFINER
-- lookup that returns only the status string for a caller-supplied id
-- (never a listing/browsing query) breaks that dependency without
-- touching the _self_read policies -- same narrow-helper pattern as
-- order_exists just above.

create or replace function public.donation_payment_status(_donation_id uuid)
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select payment_status from public.donations where id = _donation_id;
$$;

create or replace function public.order_payment_status(_order_id uuid)
returns text
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select payment_status from public.orders where id = _order_id;
$$;

revoke all on function public.donation_payment_status(uuid) from public;
revoke all on function public.order_payment_status(uuid) from public;
grant execute on function public.donation_payment_status(uuid) to anon, authenticated;
grant execute on function public.order_payment_status(uuid) to anon, authenticated;
