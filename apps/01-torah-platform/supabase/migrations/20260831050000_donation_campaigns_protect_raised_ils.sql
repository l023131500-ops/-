-- donation_campaigns.raised_ils is meant to be a server-computed total,
-- written only by nedarim-webhook's compare-and-swap loop (service-role
-- key) after a real Nedarim payment is captured. But "campaigns_write_upd"
-- (RLS) grants tenant_admin `for update using/with check
-- has_tenant_role(...)` with no column restriction -- Postgres RLS policies
-- gate rows, not columns -- so any tenant_admin's already-authenticated
-- supabase-js session (loaded on every page of the SPA) can call
-- `.from("donation_campaigns").update({ raised_ils: 999999 })` directly and
-- have it accepted, independent of any UI ever exposing that field. That
-- inflates the number shown to real donors on the public /donate page
-- (DonationPage.tsx) with zero real money behind it -- the same class of
-- "trust a client-writable financial figure" gap already fixed in
-- nedarim-create-payment (checkout price tampering) and the products.stock
-- decrement race. A trigger, not a narrower RLS policy, is required because
-- RLS cannot restrict individual columns.
create or replace function public.protect_campaign_raised_ils()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.raised_ils is distinct from old.raised_ils and auth.role() is distinct from 'service_role' then
    new.raised_ils := old.raised_ils;
  end if;
  return new;
end;
$$;

drop trigger if exists campaigns_protect_raised_ils on public.donation_campaigns;
create trigger campaigns_protect_raised_ils
  before update on public.donation_campaigns
  for each row execute function public.protect_campaign_raised_ils();
