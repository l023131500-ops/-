-- nedarim-webhook flips orders.payment_status to "captured" on a real shop
-- sale, but nothing has ever touched products.stock -- ProductDetail.tsx's
-- "אזל מהמלאי" (out of stock) check was just fixed to read the real `stock`
-- column (see the shop-product-columns fix earlier today), but stock itself
-- never decreases after a sale, so a limited-stock product can be sold past
-- zero indefinitely and the badge stays wrong forever for anything that
-- actually sells out.
--
-- A single atomic UPDATE (not a read-then-write) avoids the same lost-update
-- race the campaign raised_ils CAS retry loop in nedarim-webhook exists to
-- dodge -- "subtract N, floor at 0" is commutative across concurrent
-- callers, so no retry loop is needed here. `stock is not null` in the WHERE
-- clause is required, not cosmetic: GREATEST(NULL - n, 0) evaluates to 0 in
-- Postgres (GREATEST ignores NULL args), which would wrongly turn an
-- unmanaged/untracked-inventory product (stock = NULL) into "out of stock".
create or replace function public.decrement_product_stock(_product_id uuid, _qty integer)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.products
  set stock = greatest(stock - _qty, 0)
  where id = _product_id and stock is not null;
$$;

-- Service-role only (called from nedarim-webhook with the service key) --
-- same lockdown as order_exists/ai_rate_limit_hit: creating a function grants
-- EXECUTE to PUBLIC by default, and Supabase separately auto-grants
-- anon/authenticated, so both need an explicit revoke or a public caller
-- could decrement any product's stock directly.
revoke all on function public.decrement_product_stock(uuid, integer) from public;
revoke all on function public.decrement_product_stock(uuid, integer) from anon;
revoke all on function public.decrement_product_stock(uuid, integer) from authenticated;
