-- more30 · 38-events-gifts — round 12: payment lifecycle (§2 "סליקה" / §3)
--
-- Until now a gift was born 'paid': evg_gift_create inserted the row, wrote
-- the wallet split and returned — the pending/failed/refunded statuses in
-- events.gift_status existed but were unreachable, there was no payment-step
-- in the donor flow, no refunds, and no receipt. That shape can never absorb
-- a real provider (נדרים פלוס / PayMe both work redirect/iframe-style:
-- create-intent -> provider page -> callback), so the simulated flow now has
-- the same skeleton the live one will use:
--
--   evg_gift_begin    -> gift row status='pending' + a private pay_token
--                        (the "payment session"); nothing is counted yet.
--   [provider page]   -> in test mode g.html renders a clearly-marked
--                        simulated payment screen; live mode will swap this
--                        single step for the provider's hosted form — the
--                        platform never touches a PAN either way.
--   evg_gift_confirm  -> pending->paid atomically (row lock, idempotent,
--                        2-hour session expiry), wallet split written at
--                        *payment* time, numbered receipt issued.
--   evg_gift_cancel   -> pending->failed (donor walked away).
--   evg_admin_gift_refund -> paid->refunded by receipt number (super-admin),
--                        reversal rows negate the split so every ledger
--                        aggregate (owner wallet, admin overview, monthly
--                        revenue report) nets to zero without any of those
--                        functions changing.
--
-- events.payment_providers is the adapter registry: 'test' enabled,
-- nedarim/payme seeded disabled and locked by trigger until the split/
-- marketplace approval (NEEDS_USER) lands in a reviewed migration. The 0131
-- guard_no_live_charges trigger stays — live charging remains impossible at
-- the DB no matter what this file adds.
--
-- Zero regression: evg_gift_create keeps its exact signature and result keys
-- (now a begin+confirm wrapper, result is a strict superset); the dashboard
-- 'gifts' array gains status/receipt fields and refunded rows (UI updated in
-- the same commit to sum only paid rows). No existing function loses a field.

-- ---------- gifts: the lifecycle columns ----------
-- pay_token is the donor's private handle on their own payment session —
-- confirm/cancel/receipt accept nothing else, so an anon caller can only ever
-- touch the gift they themselves began. events.new_token() is volatile, so
-- the ALTER evaluates it per existing row (no shared default).
alter table events.gifts
  add column if not exists pay_token text not null default events.new_token(),
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reason text;
create unique index if not exists idx_events_gifts_pay_token on events.gifts(pay_token);
update events.gifts set paid_at = created_at where status = 'paid' and paid_at is null;

-- ---------- wallet: refund reversals ----------
-- A refund is a new ledger row that negates a split row — history is never
-- rewritten. The amount check becomes direction-by-type.
alter table events.wallet_entries
  add column if not exists entry_type text not null default 'split'
    check (entry_type in ('split', 'refund'));
alter table events.wallet_entries
  drop constraint if exists wallet_entries_amount_agorot_check;
alter table events.wallet_entries
  add constraint wallet_entries_amount_direction check (
    (entry_type = 'split' and amount_agorot >= 0)
    or (entry_type = 'refund' and amount_agorot <= 0)
  );

-- ---------- receipts (קבלות — ממוספרות; "חשבונית מס" נשאר NEEDS_USER) ----------
create sequence if not exists events.receipt_seq;
create table if not exists events.receipts (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null unique references events.gifts(id) on delete cascade,
  event_id uuid not null references events.events(id) on delete cascade,
  receipt_no bigint not null unique default nextval('events.receipt_seq'),
  donor_name text not null,
  amount_agorot bigint not null check (amount_agorot > 0),
  mode text not null default 'test' check (mode in ('test', 'live')),
  issued_at timestamptz not null default now()
);
create index if not exists idx_events_receipts_event on events.receipts(event_id);
alter table events.receipts enable row level security;
grant select on events.receipts to authenticated;
grant all on events.receipts to service_role;

-- same hard lock as gifts: a 'live' receipt cannot exist yet
create or replace function events.guard_no_live_receipts()
returns trigger
language plpgsql
set search_path = events
as $$
begin
  if new.mode = 'live' then
    raise exception 'live receipts are not enabled: payment provider pending user approval — TEST MODE only';
  end if;
  return new;
end;
$$;
create trigger trg_events_receipts_no_live
  before insert or update on events.receipts
  for each row execute function events.guard_no_live_receipts();

-- owner / hall / super-admin read their events' receipts (donor path is RPC-only)
create policy receipts_event_owner_read on events.receipts
  for select
  using (exists (
    select 1 from events.events e
    left join events.halls h on h.id = e.hall_id
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid()
           or h.owner_auth_user_id = auth.uid()
           or public.more30_is_super_admin())
  ));

-- receipts for gifts that were already 'paid' before this migration
insert into events.receipts (gift_id, event_id, donor_name, amount_agorot, mode)
select g.id, g.event_id, g.donor_name, g.amount_agorot, g.mode
from events.gifts g
where g.status = 'paid'
  and not exists (select 1 from events.receipts r where r.gift_id = g.id)
order by g.created_at;

-- ---------- provider adapter registry ----------
create table if not exists events.payment_providers (
  provider text primary key check (provider in ('test', 'nedarim', 'payme')),
  display_name text not null,
  enabled boolean not null default false,
  notes text
);
alter table events.payment_providers enable row level security;
grant all on events.payment_providers to service_role;

-- the same NEEDS_USER lock, at the registry level: nedarim/payme cannot even
-- be *enabled* until the split/marketplace approval lands in a reviewed
-- migration that replaces this trigger together with guard_no_live_charges.
create or replace function events.guard_providers_locked()
returns trigger
language plpgsql
set search_path = events
as $$
begin
  if new.enabled and new.provider <> 'test' then
    raise exception 'provider "%" cannot be enabled: split/marketplace approval pending (NEEDS_USER)', new.provider;
  end if;
  return new;
end;
$$;
create trigger trg_events_providers_locked
  before insert or update on events.payment_providers
  for each row execute function events.guard_providers_locked();

insert into events.payment_providers (provider, display_name, enabled, notes) values
  ('test',    'סימולציית טסט', true,  'ללא חיוב — עד אישור ספק'),
  ('nedarim', 'נדרים פלוס',    false, 'ממתין לאישור split/marketplace — NEEDS_USER'),
  ('payme',   'PayMe',         false, 'ממתין לאישור split/marketplace — NEEDS_USER')
on conflict (provider) do nothing;

-- ---------- anon: begin a payment session ----------
create or replace function public.evg_gift_begin(
  p_token text,               -- guest personal token OR event share token
  p_donor_name text,
  p_amount_agorot bigint,
  p_donor_phone text default null,
  p_greeting text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_event events.events;
  v_guest_id uuid;
  v_guest_event_id uuid;
  v_provider text;
  v_pay_token text;
begin
  -- resolve: personal token first, then share token; never list
  select g.id, g.event_id into v_guest_id, v_guest_event_id
  from events.guests g
  where g.personal_token = btrim(p_token)
  limit 1;
  if v_guest_event_id is not null then
    select e.* into v_event from events.events e where e.id = v_guest_event_id;
  else
    select e.* into v_event from events.events e
    where e.share_token = btrim(p_token) limit 1;
  end if;
  if v_event.id is null or v_event.status <> 'active' or not v_event.gifts_enabled then
    raise exception 'event not found or gifts closed';
  end if;

  -- abandoned-session flood guard (sessions are cheap rows, but not free)
  if (select count(*) from events.gifts
      where event_id = v_event.id and status = 'pending'
        and created_at > now() - interval '1 hour') >= 200 then
    raise exception 'too many pending payment sessions — try again later';
  end if;

  -- adapter pick: a real provider once one is approved+enabled, test until then
  v_provider := coalesce((
    select provider from events.payment_providers where enabled
    order by case provider when 'test' then 2 else 1 end
    limit 1), 'test');

  insert into events.gifts (event_id, guest_id, donor_name, donor_phone, greeting,
                            amount_agorot, mode, provider, status)
  values (v_event.id, v_guest_id, btrim(p_donor_name),
          nullif(btrim(coalesce(p_donor_phone,'')),''),
          nullif(btrim(coalesce(p_greeting,'')),''),
          p_amount_agorot, 'test', v_provider, 'pending')
  returning pay_token into v_pay_token;

  return jsonb_build_object(
    'ok', true, 'gift_ref', v_pay_token,
    'provider', v_provider, 'mode', 'test',
    'amount_agorot', p_amount_agorot,
    'event_title', v_event.title);
end;
$$;

revoke all on function public.evg_gift_begin(text, text, bigint, text, text) from public;
grant execute on function public.evg_gift_begin(text, text, bigint, text, text) to anon, authenticated;

-- ---------- anon: confirm (the provider-callback seam) ----------
create or replace function public.evg_gift_confirm(p_gift_ref text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_gift events.gifts;
  v_event events.events;
  v_fee bigint;
  v_hall_cut bigint := 0;
  v_hall_share_bps integer := 0;
  v_receipt_no bigint;
begin
  select g.* into v_gift from events.gifts g
  where g.pay_token = btrim(p_gift_ref)
  for update;                      -- double-click / double-callback safe
  if v_gift.id is null then raise exception 'payment session not found'; end if;

  if v_gift.status = 'paid' then   -- idempotent: same answer twice
    select r.receipt_no into v_receipt_no from events.receipts r where r.gift_id = v_gift.id;
    return jsonb_build_object('ok', true, 'mode', v_gift.mode,
      'amount_agorot', v_gift.amount_agorot, 'receipt_no', v_receipt_no,
      'already_paid', true);
  end if;
  if v_gift.status <> 'pending' then
    raise exception 'payment session is no longer valid';
  end if;
  if v_gift.created_at < now() - interval '2 hours' then
    -- raising rolls the transaction back, so don't bother marking 'failed'
    -- here — an expired-pending row is already invisible to every aggregate
    raise exception 'payment session expired — please start again';
  end if;

  select e.* into v_event from events.events e where e.id = v_gift.event_id;

  update events.gifts
  set status = 'paid', paid_at = now(),
      provider_ref = 'TEST-' || events.new_token()
  where id = v_gift.id;

  -- wallet split at *payment* time: platform fee + optional hall share
  v_fee := (v_gift.amount_agorot * v_event.platform_fee_bps) / 10000;
  if v_event.hall_id is not null then
    select hall_share_bps into v_hall_share_bps from events.halls where id = v_event.hall_id;
    v_hall_cut := (v_gift.amount_agorot * coalesce(v_hall_share_bps, 0)) / 10000;
  end if;
  insert into events.wallet_entries (gift_id, event_id, beneficiary, amount_agorot, mode) values
    (v_gift.id, v_event.id, 'event_owner', v_gift.amount_agorot - v_fee - v_hall_cut, 'test'),
    (v_gift.id, v_event.id, 'platform', v_fee, 'test');
  if v_hall_cut > 0 then
    insert into events.wallet_entries (gift_id, event_id, beneficiary, amount_agorot, mode)
    values (v_gift.id, v_event.id, 'hall', v_hall_cut, 'test');
  end if;

  insert into events.receipts (gift_id, event_id, donor_name, amount_agorot, mode)
  values (v_gift.id, v_event.id, v_gift.donor_name, v_gift.amount_agorot, 'test')
  returning receipt_no into v_receipt_no;

  return jsonb_build_object('ok', true, 'mode', 'test',
    'amount_agorot', v_gift.amount_agorot, 'receipt_no', v_receipt_no);
end;
$$;

revoke all on function public.evg_gift_confirm(text) from public;
grant execute on function public.evg_gift_confirm(text) to anon, authenticated;

-- ---------- anon: cancel a pending session ----------
create or replace function public.evg_gift_cancel(p_gift_ref text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_status events.gift_status;
begin
  select status into v_status from events.gifts
  where pay_token = btrim(p_gift_ref) for update;
  if v_status is null then raise exception 'payment session not found'; end if;
  if v_status = 'paid' then raise exception 'already paid — cannot cancel'; end if;
  update events.gifts set status = 'failed'
  where pay_token = btrim(p_gift_ref) and status = 'pending';
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_gift_cancel(text) from public;
grant execute on function public.evg_gift_cancel(text) to anon, authenticated;

-- ---------- anon: the donor's receipt (by their private session ref) ----------
create or replace function public.evg_receipt_get(p_gift_ref text)
returns jsonb
language sql
stable
security definer
set search_path = events, public
as $$
  select jsonb_build_object(
    'receipt_no', r.receipt_no, 'donor_name', r.donor_name,
    'amount_agorot', r.amount_agorot, 'mode', r.mode,
    'issued_at', r.issued_at, 'greeting', g.greeting,
    'event_title', e.title, 'event_date', e.event_date,
    'refunded_at', g.refunded_at)
  from events.receipts r
  join events.gifts g on g.id = r.gift_id
  join events.events e on e.id = r.event_id
  where g.pay_token = btrim(p_gift_ref)
$$;

revoke all on function public.evg_receipt_get(text) from public;
grant execute on function public.evg_receipt_get(text) to anon, authenticated;

-- ---------- one-step create: now a begin+confirm wrapper ----------
-- Same signature, result a strict superset of the old
-- {ok, mode, amount_agorot} — any caller of the old shape keeps working.
create or replace function public.evg_gift_create(
  p_token text,
  p_donor_name text,
  p_amount_agorot bigint,
  p_donor_phone text default null,
  p_greeting text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_begin jsonb;
begin
  v_begin := public.evg_gift_begin(p_token, p_donor_name, p_amount_agorot,
                                   p_donor_phone, p_greeting);
  return public.evg_gift_confirm(v_begin->>'gift_ref')
         || jsonb_build_object('gift_ref', v_begin->>'gift_ref');
end;
$$;

revoke all on function public.evg_gift_create(text, text, bigint, text, text) from public;
grant execute on function public.evg_gift_create(text, text, bigint, text, text) to anon, authenticated;

-- ---------- super-admin: refund by receipt number ----------
-- The support flow starts from a receipt number (what the donor/owner holds),
-- not an internal uuid. Reversal rows negate the split exactly, so the owner
-- wallet, the admin overview and the monthly revenue report all net to zero
-- for this gift without any of those functions changing.
create or replace function public.evg_admin_gift_refund(
  p_receipt_no bigint,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = events, public
as $$
declare
  v_gift events.gifts;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;

  select g.* into v_gift
  from events.gifts g
  join events.receipts r on r.gift_id = g.id
  where r.receipt_no = p_receipt_no
  for update of g;
  if v_gift.id is null then raise exception 'receipt not found'; end if;
  if v_gift.status <> 'paid' then
    raise exception 'gift is % — only a paid gift can be refunded', v_gift.status;
  end if;

  update events.gifts
  set status = 'refunded', refunded_at = now(),
      refund_reason = nullif(btrim(coalesce(p_reason,'')),'')
  where id = v_gift.id;

  insert into events.wallet_entries (gift_id, event_id, beneficiary, amount_agorot, mode, entry_type)
  select w.gift_id, w.event_id, w.beneficiary, -w.amount_agorot, w.mode, 'refund'
  from events.wallet_entries w
  where w.gift_id = v_gift.id and w.entry_type = 'split';

  return jsonb_build_object('ok', true, 'receipt_no', p_receipt_no,
    'amount_agorot', v_gift.amount_agorot, 'mode', v_gift.mode);
end;
$$;

revoke all on function public.evg_admin_gift_refund(bigint, text) from public, anon;
grant execute on function public.evg_admin_gift_refund(bigint, text) to authenticated;

-- ---------- dashboard: gifts gain lifecycle fields (strict superset of 0138) --
-- Refunded gifts stay visible to the owner (marked, excluded from sums by the
-- UI); pending/failed sessions are noise and stay out.
create or replace function public.evg_event_dashboard(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = events, public
as $$
  select jsonb_build_object(
    'event', (
      select jsonb_build_object(
        'id', e.id, 'title', e.title, 'event_type', e.event_type::text,
        'event_date', e.event_date, 'event_time', e.event_time,
        'venue_name', e.venue_name, 'address', e.address,
        'description', e.description, 'status', e.status::text,
        'share_token', e.share_token,
        'gift_goal_agorot', e.gift_goal_agorot,
        'platform_fee_bps', e.platform_fee_bps,
        'invite_theme', e.invite_theme,
        'invite_hosts', e.invite_hosts,
        'invite_message', e.invite_message,
        'msg_invite_tpl', e.msg_invite_tpl,
        'msg_reminder_tpl', e.msg_reminder_tpl,
        'msg_thanks_tpl', e.msg_thanks_tpl
      ) from events.events e where e.id = p_event_id
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'full_name', g.full_name, 'phone', g.phone,
        'email', g.email,
        'group_name', g.group_name, 'invited_count', g.invited_count,
        'personal_token', g.personal_token,
        'rsvp_status', g.rsvp_status::text, 'rsvp_count', g.rsvp_count,
        'rsvp_note', g.rsvp_note, 'checkin_at', g.checkin_at,
        'table_id', g.table_id,
        'invite_sent_at', (select max(m.created_at) from events.messages m
                           where m.guest_id = g.id and m.kind = 'invite'),
        'reminder_sent_at', (select max(m.created_at) from events.messages m
                             where m.guest_id = g.id and m.kind = 'reminder')
      ) order by g.created_at)
      from events.guests g where g.event_id = p_event_id), '[]'::jsonb),
    'tables', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'capacity', t.capacity,
        'sort_order', t.sort_order
      ) order by t.sort_order, t.created_at)
      from events.seating_tables t where t.event_id = p_event_id), '[]'::jsonb),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'donor_name', g.donor_name, 'donor_phone', g.donor_phone,
        'greeting', g.greeting,
        'amount_agorot', g.amount_agorot, 'mode', g.mode,
        'status', g.status::text, 'thanked_at', g.thanked_at,
        'paid_at', g.paid_at,
        'refunded_at', g.refunded_at, 'refund_reason', g.refund_reason,
        'receipt_no', (select r.receipt_no from events.receipts r
                       where r.gift_id = g.id),
        'created_at', g.created_at
      ) order by g.created_at desc)
      from events.gifts g
      where g.event_id = p_event_id and g.status in ('paid', 'refunded')), '[]'::jsonb),
    'wallet', coalesce((
      select jsonb_object_agg(w.beneficiary, w.total) from (
        select beneficiary, sum(amount_agorot) as total
        from events.wallet_entries where event_id = p_event_id
        group by beneficiary
      ) w), '{}'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'category', x.category, 'name', x.name,
        'vendor_name', x.vendor_name, 'vendor_phone', x.vendor_phone,
        'planned_agorot', x.planned_agorot, 'actual_agorot', x.actual_agorot,
        'paid', x.paid, 'due_date', x.due_date, 'notes', x.notes
      ) order by x.created_at)
      from events.expenses x where x.event_id = p_event_id), '[]'::jsonb)
  )
$$;
