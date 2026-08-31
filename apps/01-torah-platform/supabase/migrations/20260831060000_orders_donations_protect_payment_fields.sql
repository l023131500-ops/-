-- Same class of gap as 20260831050000 (donation_campaigns.raised_ils), one
-- table over: "orders_admin_update" / "donations_admin_update" (RLS) grant
-- tenant_admin `for update using has_tenant_role(...)` with no column
-- restriction and no `with check`. RLS gates rows, not columns, so any
-- tenant_admin's already-authenticated supabase-js session (loaded on every
-- page of the SPA) can call e.g.
-- `.from("orders").update({ payment_status: "captured" })` directly and have
-- it accepted -- independent of the fact that NO admin UI in this codebase
-- ever calls `.update()` on `orders` or `donations` at all (grep confirms
-- every reference is a `.select()` except the customer-side `.insert()` in
-- Checkout.tsx/DonationPage.tsx). The only intended writer of these columns
-- is nedarim-webhook's service-role key, after a real Nedarim payment IPN.
--
-- Left open, a tenant_admin could: flip a never-paid order/donation straight
-- to payment_status='captured' (which also fires the stock-decrement trigger
-- from 20260826060000, handing out real inventory for nothing paid), or
-- fabricate `receipt_number`/`receipt_issued_at`/`receipt_url` on a donation
-- that was never captured -- an official-looking tax-deductible receipt with
-- no real donation behind it. Same "trust a client-writable financial/status
-- field" class as the checkout price-tampering and raised_ils fixes earlier
-- this round. A trigger, not a narrower RLS policy, is required because RLS
-- cannot restrict individual columns.
--
-- Protects exactly the columns nedarim-webhook writes on capture/failure
-- (payment_status, payment_reference, paid_at, plus the donation receipt
-- trio) -- not `orders.status`/`payment_meta`, which no UI treats as proof
-- of payment and which stay free for a future manual fulfillment-status
-- feature to write.
create or replace function public.protect_order_payment_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.payment_status is distinct from old.payment_status then
      new.payment_status := old.payment_status;
    end if;
    if new.payment_reference is distinct from old.payment_reference then
      new.payment_reference := old.payment_reference;
    end if;
    if new.paid_at is distinct from old.paid_at then
      new.paid_at := old.paid_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_protect_payment_fields on public.orders;
create trigger orders_protect_payment_fields
  before update on public.orders
  for each row execute function public.protect_order_payment_fields();

create or replace function public.protect_donation_payment_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.payment_status is distinct from old.payment_status then
      new.payment_status := old.payment_status;
    end if;
    if new.payment_reference is distinct from old.payment_reference then
      new.payment_reference := old.payment_reference;
    end if;
    if new.paid_at is distinct from old.paid_at then
      new.paid_at := old.paid_at;
    end if;
    if new.receipt_number is distinct from old.receipt_number then
      new.receipt_number := old.receipt_number;
    end if;
    if new.receipt_issued_at is distinct from old.receipt_issued_at then
      new.receipt_issued_at := old.receipt_issued_at;
    end if;
    if new.receipt_url is distinct from old.receipt_url then
      new.receipt_url := old.receipt_url;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists donations_protect_payment_fields on public.donations;
create trigger donations_protect_payment_fields
  before update on public.donations
  for each row execute function public.protect_donation_payment_fields();
