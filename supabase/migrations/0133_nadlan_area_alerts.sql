-- more30 · 32 nadlan-berega — "מעקב אזור" new-deal email alerts
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-18/20 without a
-- matching repo file until now. Captures the final live state (original
-- table + the same-day delivery-tracking columns added by
-- nadlan_area_alerts_delivery_tracking, merged into one create statement).
-- ============================================================================
--
-- Backs the public POST /nadlan/api/area-alert signup form (app/api/
-- area-alert/route.ts) and the Vercel-cron email engine (lib/areaalerts.ts)
-- that periodically re-checks each watched address/gush-helka and emails the
-- subscriber once per newly-seen deal. `notified_deal_keys` is the send-once
-- ledger (matches lib/nadlan.ts's dealKey shape) so a re-run of the cron
-- never double-emails the same transaction. system 36 nadlan-pro reuses this
-- same table/endpoint for its own "מעקב אזור" property-drawer panel — no
-- duplicated alert-detection/email logic on that system's side.

create table if not exists nadlan.area_alerts (
  id                bigint generated always as identity primary key,
  email             text not null,
  address           text,
  gush              text,
  helka             text,
  city              text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  last_checked_at   timestamptz,
  last_error        text,
  notified_deal_keys text[] not null default '{}'
);

alter table nadlan.area_alerts enable row level security;

-- Public signup form has no session; the cron worker reads/updates with the
-- service key (bypasses RLS), so no authenticated-read policy is needed here.
do $$ begin
  create policy public_insert_area_alerts on nadlan.area_alerts for insert
    with check (true);
exception when duplicate_object then null; end $$;
