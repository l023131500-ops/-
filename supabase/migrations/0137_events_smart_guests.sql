-- 0137 — events & gifts (38): smart guest management (EVENTS_BUILD.md §4
-- "ניהול מוזמנים חכם: קבוצות, ייבוא אנשי קשר, כפילויות").
--
-- Until now the guest list only grew: evg_guests_add appended blindly (paste
-- the same Excel twice → the whole list twice, every duplicate with its own
-- personal token), a typo in a name/phone could only be fixed by delete +
-- re-add (which silently kills the guest's personal link after it was already
-- sent), and groups were write-once labels with no operations behind them.
--
-- This migration adds, all SECURITY INVOKER on top of the 0131 RLS
-- (guests_event_owner / events_owner_or_admin do the access control):
--   events.norm_phone            phone normalization for duplicate detection
--   public.evg_guests_import     bulk add with duplicate skipping (by phone;
--                                by name only when the newcomer has no phone —
--                                two real people may share a name, two guests
--                                never share a phone)
--   public.evg_guest_update      patch a guest in place — the personal token
--                                (and everything already sent) survives edits
--   public.evg_group_rename      rename/clear a group across the event
--   public.evg_guests_set_group  bulk-move guests between groups
--   evg_event_dashboard          + guests[].email (column existed since 0131,
--                                was never surfaced, and import now fills it)
--
-- evg_guests_add is left untouched (zero regression) — the UI moves to
-- evg_guests_import.

-- ---------- phone normalization (shared by import dedup + an index) ----------
-- digits only; international 972-xx → local 0-xx so "+972-50-123-4567",
-- "0501234567" and "050 123 4567" all collide.
create or replace function events.norm_phone(p text)
returns text
language sql
immutable
as $$
  select case
    when d = '' then null
    when d like '972%' and length(d) >= 11 then '0' || substr(d, 4)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) t
$$;

create index if not exists idx_events_guests_norm_phone
  on events.guests (event_id, events.norm_phone(phone))
  where phone is not null;

-- ---------- bulk import with duplicate skipping ----------
-- p_guests: [{full_name, phone?, email?, group_name?, invited_count?}, ...]
create or replace function public.evg_guests_import(
  p_event_id uuid,
  p_guests jsonb,
  p_skip_duplicates boolean default true
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_g jsonb;
  v_name text;
  v_phone text;
  v_phone_key text;
  v_inserted integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_seen_phones text[];
  v_seen_names text[];
begin
  -- RLS-scoped: a non-owner simply doesn't see the event
  if not exists (select 1 from events.events where id = p_event_id) then
    raise exception 'event not found';
  end if;
  if jsonb_typeof(p_guests) <> 'array' or jsonb_array_length(p_guests) = 0 then
    raise exception 'guests must be a non-empty array';
  end if;
  if jsonb_array_length(p_guests) > 500 then
    raise exception 'max 500 guests per call';
  end if;

  select coalesce(array_agg(distinct events.norm_phone(g.phone))
                    filter (where events.norm_phone(g.phone) is not null), '{}'),
         coalesce(array_agg(distinct lower(btrim(g.full_name))), '{}')
    into v_seen_phones, v_seen_names
  from events.guests g where g.event_id = p_event_id;

  for v_g in select * from jsonb_array_elements(p_guests) loop
    v_name := btrim(coalesce(v_g->>'full_name', ''));
    if v_name = '' then continue; end if;
    v_phone := nullif(btrim(coalesce(v_g->>'phone', '')), '');
    v_phone_key := events.norm_phone(v_phone);

    -- a phone match is always the same person; a name match counts only when
    -- the newcomer has no phone to tell them apart by
    if p_skip_duplicates and (
         (v_phone_key is not null and v_phone_key = any(v_seen_phones))
         or (v_phone_key is null and lower(v_name) = any(v_seen_names))
       ) then
      v_skipped := v_skipped || to_jsonb(v_name);
      continue;
    end if;

    if v_phone_key is not null then v_seen_phones := v_seen_phones || v_phone_key; end if;
    v_seen_names := v_seen_names || lower(v_name);

    insert into events.guests (event_id, full_name, phone, email, group_name, invited_count)
    values (
      p_event_id,
      v_name,
      v_phone,
      nullif(btrim(coalesce(v_g->>'email', '')), ''),
      nullif(btrim(coalesce(v_g->>'group_name', '')), ''),
      least(greatest(coalesce((v_g->>'invited_count')::integer, 1), 1), 50)
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'inserted', v_inserted,
    'skipped', jsonb_array_length(v_skipped),
    'skipped_names', v_skipped
  );
end;
$$;

revoke all on function public.evg_guests_import(uuid, jsonb, boolean) from public, anon;
grant execute on function public.evg_guests_import(uuid, jsonb, boolean) to authenticated;

-- ---------- edit a guest in place (the personal token survives) ----------
-- p_patch: only the keys present are applied; empty string clears an optional
-- field. Allowed keys: full_name, phone, email, group_name, invited_count.
create or replace function public.evg_guest_update(p_guest_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch must be an object';
  end if;

  update events.guests set
    full_name = case when p_patch ? 'full_name'
                     then btrim(coalesce(p_patch->>'full_name', '')) else full_name end,
    phone = case when p_patch ? 'phone'
                 then nullif(btrim(coalesce(p_patch->>'phone', '')), '') else phone end,
    email = case when p_patch ? 'email'
                 then nullif(btrim(coalesce(p_patch->>'email', '')), '') else email end,
    group_name = case when p_patch ? 'group_name'
                      then nullif(btrim(coalesce(p_patch->>'group_name', '')), '') else group_name end,
    invited_count = case when p_patch ? 'invited_count'
                         then least(greatest(coalesce((p_patch->>'invited_count')::integer, 1), 1), 50)
                         else invited_count end
  where id = p_guest_id;
  if not found then raise exception 'guest not found'; end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_guest_update(uuid, jsonb) from public, anon;
grant execute on function public.evg_guest_update(uuid, jsonb) to authenticated;

-- ---------- rename / clear a group across the event ----------
create or replace function public.evg_group_rename(p_event_id uuid, p_from text, p_to text)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_n integer;
begin
  if not exists (select 1 from events.events where id = p_event_id) then
    raise exception 'event not found';
  end if;
  if nullif(btrim(coalesce(p_from, '')), '') is null then
    raise exception 'group to rename is required';
  end if;

  update events.guests
     set group_name = nullif(btrim(coalesce(p_to, '')), '')
   where event_id = p_event_id and group_name = btrim(p_from);
  get diagnostics v_n = row_count;

  return jsonb_build_object('ok', true, 'updated', v_n);
end;
$$;

revoke all on function public.evg_group_rename(uuid, text, text) from public, anon;
grant execute on function public.evg_group_rename(uuid, text, text) to authenticated;

-- ---------- bulk-move guests to a group (null/'' = no group) ----------
create or replace function public.evg_guests_set_group(
  p_event_id uuid,
  p_guest_ids uuid[],
  p_group_name text
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_n integer;
begin
  if not exists (select 1 from events.events where id = p_event_id) then
    raise exception 'event not found';
  end if;
  if p_guest_ids is null or array_length(p_guest_ids, 1) is null then
    raise exception 'guest ids are required';
  end if;
  if array_length(p_guest_ids, 1) > 500 then
    raise exception 'max 500 guests per call';
  end if;

  -- event_id in the WHERE keeps a stray id from another event a no-op
  update events.guests
     set group_name = nullif(btrim(coalesce(p_group_name, '')), '')
   where event_id = p_event_id and id = any(p_guest_ids);
  get diagnostics v_n = row_count;

  return jsonb_build_object('ok', true, 'updated', v_n);
end;
$$;

revoke all on function public.evg_guests_set_group(uuid, uuid[], text) from public, anon;
grant execute on function public.evg_guests_set_group(uuid, uuid[], text) to authenticated;

-- ---------- dashboard: surface guests[].email ----------
-- same body as 0135, plus 'email' in the guests objects (import fills it now,
-- and the in-place editor needs to show it).
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
