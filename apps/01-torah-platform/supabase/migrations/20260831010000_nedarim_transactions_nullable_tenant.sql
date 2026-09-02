-- nedarim-webhook has two code paths that log a nedarim_transactions row with no
-- known tenant (an IP-rejected call arrives before the payload/tenant can be parsed;
-- an orphan webhook whose our_payment_id matches no pending row has no tenant either).
-- tenant_id was `not null`, so both inserts have always violated the constraint and
-- silently failed (verified live: 23502 null value in column "tenant_id") -- meaning
-- the webhook's own security/reconciliation audit trail has never actually persisted.
-- The FK to tenants(id) still applies to any real tenant_id; only NULL becomes legal.
alter table public.nedarim_transactions alter column tenant_id drop not null;
