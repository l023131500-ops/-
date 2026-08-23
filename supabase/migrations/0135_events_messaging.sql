-- more30 · 38-events-gifts — round 5: messaging center + thank-you tracking
-- ============================================================================
-- EVENTS_BUILD.md §2 "אישורי הגעה: שליחה למוזמנים (SMS/וואטסאפ/מייל), תזכורות"
-- and §4 "מעקב מתנות + תודות אוטומטיות לנותנים", "סוכן AI... זיהוי מי לא ענה".
--
-- No messaging provider is approved yet (WhatsApp API cost is an open
-- EVENTS_BUILD.md §4 question, SMS provider is NEEDS_USER territory), so
-- nothing here sends anything by itself. What this round does provide is the
-- complete real workflow that needs no provider at all: the owner sends each
-- personalized message from their own phone via a wa.me deep link (WhatsApp's
-- official click-to-chat — the message opens pre-filled in the owner's own
-- WhatsApp, the owner taps send). The platform's job is composing the message
-- from a per-event template + the guest's personal link, and REMEMBERING what
-- was sent to whom — that send-log is what makes "מי טרם ענה ולא קיבל תזכורת"
-- answerable, which is the core of the reminders workflow.
--
-- Additive only: one new table, three nullable template columns, three new
-- RPCs, and a re-created dashboard RPC that keeps every existing field.

-- ---------- per-event message templates (persisted, editable in the UI) ----
-- null = the UI uses its built-in default wording; placeholders like {שם}
-- and {קישור} are substituted client-side per guest.
alter table events.events
  add column if not exists msg_invite_tpl text
    check (msg_invite_tpl is null or char_length(msg_invite_tpl) <= 1000),
  add column if not exists msg_reminder_tpl text
    check (msg_reminder_tpl is null or char_length(msg_reminder_tpl) <= 1000),
  add column if not exists msg_thanks_tpl text
    check (msg_thanks_tpl is null or char_length(msg_thanks_tpl) <= 1000);

-- ---------- send log ----------
create table events.messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events.events(id) on delete cascade,
  guest_id uuid references events.guests(id) on delete cascade,
  gift_id uuid references events.gifts(id) on delete cascade,
  kind text not null check (kind in ('invite', 'reminder', 'thankyou', 'update')),
  -- whatsapp = wa.me deep link opened from the owner's own phone;
  -- copy = message copied to clipboard for a guest without a phone number;
  -- sms/email reserved for a future provider integration (TEST MODE rules
  -- will apply to those exactly like gifts)
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp', 'copy', 'sms', 'email')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index idx_events_messages_event on events.messages(event_id, kind);
create index idx_events_messages_guest on events.messages(guest_id, kind);
alter table events.messages enable row level security;
grant select, insert, delete on events.messages to authenticated;
grant all on events.messages to service_role;

create policy messages_event_owner on events.messages
  for all
  using (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ))
  with check (exists (
    select 1 from events.events e
    where e.id = event_id
      and (e.owner_auth_user_id = auth.uid() or public.more30_is_super_admin())
  ));

-- a message may only reference a guest/gift of its own event (same DB-level
-- guard shape as events.guard_guest_table_same_event from 0133)
create or replace function events.guard_message_refs()
returns trigger
language plpgsql
set search_path = events
as $$
begin
  if new.guest_id is not null and not exists (
    select 1 from events.guests g
    where g.id = new.guest_id and g.event_id = new.event_id
  ) then
    raise exception 'message guest belongs to a different event';
  end if;
  if new.gift_id is not null and not exists (
    select 1 from events.gifts g
    where g.id = new.gift_id and g.event_id = new.event_id
  ) then
    raise exception 'message gift belongs to a different event';
  end if;
  return new;
end;
$$;

create trigger trg_events_guard_message_refs
  before insert or update on events.messages
  for each row execute function events.guard_message_refs();

-- ---------- RPCs (house convention: invoker + RLS, anon revoked) ----------
create or replace function public.evg_message_log(
  p_event_id uuid,
  p_kind text,
  p_body text,
  p_channel text default 'whatsapp',
  p_guest_id uuid default null,
  p_gift_id uuid default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_id uuid;
begin
  if p_kind not in ('invite', 'reminder', 'thankyou', 'update') then
    raise exception 'invalid message kind';
  end if;
  if p_channel not in ('whatsapp', 'copy', 'sms', 'email') then
    raise exception 'invalid message channel';
  end if;
  insert into events.messages (event_id, guest_id, gift_id, kind, channel, body)
  values (p_event_id, p_guest_id, p_gift_id, p_kind, p_channel, btrim(p_body))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.evg_message_log(uuid, text, text, text, uuid, uuid) from public, anon;
grant execute on function public.evg_message_log(uuid, text, text, text, uuid, uuid) to authenticated;

-- mark/unmark a gift as thanked (the thanked_at column + column-level grant +
-- RLS policy existed since 0131 — this is the missing entrypoint)
create or replace function public.evg_gift_thank(
  p_gift_id uuid,
  p_thanked boolean default true
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  update events.gifts
  set thanked_at = case when p_thanked then now() else null end
  where id = p_gift_id;
  if not found then raise exception 'gift not found'; end if;
  return jsonb_build_object('ok', true, 'thanked', p_thanked);
end;
$$;

revoke all on function public.evg_gift_thank(uuid, boolean) from public, anon;
grant execute on function public.evg_gift_thank(uuid, boolean) to authenticated;

create or replace function public.evg_event_templates_set(
  p_event_id uuid,
  p_invite text default null,
  p_reminder text default null,
  p_thanks text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  update events.events set
    msg_invite_tpl = nullif(btrim(coalesce(p_invite, '')), ''),
    msg_reminder_tpl = nullif(btrim(coalesce(p_reminder, '')), ''),
    msg_thanks_tpl = nullif(btrim(coalesce(p_thanks, '')), '')
  where id = p_event_id;
  if not found then raise exception 'event not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_event_templates_set(uuid, text, text, text) from public, anon;
grant execute on function public.evg_event_templates_set(uuid, text, text, text) to authenticated;

-- ---------- dashboard: templates + per-guest send state + donor phones -----
-- (0134 definition, plus: event msg_* templates; per-guest invite_sent_at /
--  reminder_sent_at from the send log; donor_phone on gifts so the thank-you
--  buttons can open WhatsApp. Everything the 0134 version returned is kept.)
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
        'created_at', g.created_at
      ) order by g.created_at desc)
      from events.gifts g where g.event_id = p_event_id and g.status = 'paid'), '[]'::jsonb),
    'wallet', coalesce((
      select jsonb_object_agg(w.beneficiary, w.total) from (
        select beneficiary, sum(amount_agorot) as total
        from events.wallet_entries where event_id = p_event_id
        group by beneficiary
      ) w), '{}'::jsonb)
  )
$$;

revoke all on function public.evg_event_dashboard(uuid) from public, anon;
grant execute on function public.evg_event_dashboard(uuid) to authenticated;
