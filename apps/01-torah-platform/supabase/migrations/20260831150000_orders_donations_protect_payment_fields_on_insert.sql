-- Follow-up to 20260831060000: that migration protected payment_status /
-- payment_reference / paid_at (and the donation receipt trio) from tamper
-- on UPDATE, but both protect_order_payment_fields() and
-- protect_donation_payment_fields() were only wired to `before update`
-- triggers. `orders_insert` / `donations_insert` RLS (with_check) only
-- verifies the target tenant exists -- it places no restriction on
-- payment_status or any other column -- so the exact same tamper that was
-- closed on UPDATE was still wide open on INSERT.
--
-- Live-verified (rolled-back transaction, SET LOCAL ROLE anon) before this
-- fix: `insert into donations (tenant_id, donor_name, donor_phone,
-- amount_ils, payment_status, payment_reference, receipt_number, paid_at)
-- values (..., 'captured', 'FAKE-REF', 'FAKE-RCPT', now())` succeeded outright
-- -- a fabricated, fully "paid" donation with a fake receipt number and
-- capture timestamp, created with zero real payment and zero involvement of
-- nedarim-create-payment/nedarim-webhook. Same reproduction against `orders`
-- (payment_status='captured', payment_reference='FAKE-REF-ORD', paid_at=now())
-- also succeeded -- a "paid" order (which fires the stock-decrement trigger
-- from 20260826060000, handing out real inventory) with nothing actually
-- charged. Both legitimate insert paths (Checkout.tsx, DonationPage.tsx)
-- always send payment_status: "pending" and never set payment_reference,
-- paid_at, or (for donations) receipt_number/receipt_issued_at/receipt_url,
-- so forcing those columns to safe defaults on INSERT for non-service-role
-- callers is purely corrective and does not change the legitimate flow.
create or replace function public.protect_order_payment_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'INSERT' then
      new.payment_status := 'pending';
      new.payment_reference := null;
      new.paid_at := null;
    else
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
  end if;
  return new;
end;
$$;

drop trigger if exists orders_protect_payment_fields_ins on public.orders;
create trigger orders_protect_payment_fields_ins
  before insert on public.orders
  for each row execute function public.protect_order_payment_fields();

create or replace function public.protect_donation_payment_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'INSERT' then
      new.payment_status := 'pending';
      new.payment_reference := null;
      new.paid_at := null;
      new.receipt_number := null;
      new.receipt_issued_at := null;
      new.receipt_url := null;
    else
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
  end if;
  return new;
end;
$$;

drop trigger if exists donations_protect_payment_fields_ins on public.donations;
create trigger donations_protect_payment_fields_ins
  before insert on public.donations
  for each row execute function public.protect_donation_payment_fields();
