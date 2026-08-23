-- 38 events-gifts · designed digital invitations (EVENTS_BUILD.md §4:
-- "הזמנות דיגיטליות מעוצבות (עם RSVP מובנה) + תבניות יפות").
--
-- The guest personal link (g.html) already carries RSVP + gift + entry pass —
-- this makes the same link the *invitation itself*: the event owner picks a
-- designed theme, writes the hosts line ("משפחות כהן ולוי מזמינות…") and a
-- personal message, and every personal/share link renders as a styled
-- invitation. Pure data + render-layer feature: no images uploaded, no new
-- tables — three columns on events.events and the same token-only exposure
-- path as everything else (0131 stance: anon reads only through the exact-
-- token definer RPCs; the theme/hosts/message ride the existing payload).
--
-- Themes are a fixed, DB-validated set so the render layer can trust the
-- value blindly (no user CSS/HTML ever reaches the page — hosts/message are
-- plain text, escaped client-side like every other field).

alter table events.events
  add column if not exists invite_theme text not null default 'midnight-gold'
    constraint events_invite_theme_check check (invite_theme in
      ('midnight-gold', 'ivory-gold', 'blush-rose', 'royal-navy', 'olive-garden')),
  add column if not exists invite_hosts text
    constraint events_invite_hosts_check
    check (invite_hosts is null or char_length(invite_hosts) <= 200),
  add column if not exists invite_message text
    constraint events_invite_message_check
    check (invite_message is null or char_length(invite_message) <= 600);

-- ---------- owner: set the invitation design ----------
-- null = keep as-is; empty string clears hosts/message (the dashboard always
-- sends the field's current input value, so clearing works naturally).
create or replace function public.evg_event_invite_set(
  p_event_id uuid,
  p_theme text default null,
  p_hosts text default null,
  p_message text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  if p_theme is not null and p_theme not in
     ('midnight-gold', 'ivory-gold', 'blush-rose', 'royal-navy', 'olive-garden') then
    raise exception 'invalid invitation theme';
  end if;

  update events.events set
    invite_theme = coalesce(p_theme, invite_theme),
    invite_hosts = case when p_hosts is null then invite_hosts
                        else nullif(btrim(p_hosts), '') end,
    invite_message = case when p_message is null then invite_message
                          else nullif(btrim(p_message), '') end
  where id = p_event_id;
  if not found then raise exception 'event not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.evg_event_invite_set(uuid, text, text, text) from public;
grant execute on function public.evg_event_invite_set(uuid, text, text, text) to authenticated;

-- ---------- the public payload now carries the invitation design ----------
-- (0131 definition + invite_theme/invite_hosts/invite_message — feeds both
-- evg_guest_view and evg_event_public, so personal AND share links render it)
create or replace function events.event_public_payload(p_event_id uuid)
returns jsonb
language sql
stable
set search_path = events
as $$
  select jsonb_build_object(
    'title', e.title, 'event_type', e.event_type::text,
    'event_date', e.event_date, 'event_time', e.event_time,
    'venue_name', coalesce(e.venue_name, h.name),
    'address', coalesce(e.address, h.address),
    'description', e.description,
    'invite_theme', e.invite_theme,
    'invite_hosts', e.invite_hosts,
    'invite_message', e.invite_message,
    'rsvp_enabled', e.rsvp_enabled, 'gifts_enabled', e.gifts_enabled,
    'status', e.status::text,
    'gift_goal_agorot', e.gift_goal_agorot,
    'gift_total_agorot', coalesce((
      select sum(g.amount_agorot) from events.gifts g
      where g.event_id = e.id and g.status = 'paid'), 0),
    'gift_count', coalesce((
      select count(*) from events.gifts g
      where g.event_id = e.id and g.status = 'paid'), 0),
    'test_mode', true
  )
  from events.events e
  left join events.halls h on h.id = e.hall_id
  where e.id = p_event_id
$$;

revoke all on function events.event_public_payload(uuid) from public, anon, authenticated;

-- ---------- the dashboard shows the designer its current state ----------
-- (0133 definition + the three invite fields on the event object)
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
        'invite_message', e.invite_message
      ) from events.events e where e.id = p_event_id
    ),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id, 'full_name', g.full_name, 'phone', g.phone,
        'group_name', g.group_name, 'invited_count', g.invited_count,
        'personal_token', g.personal_token,
        'rsvp_status', g.rsvp_status::text, 'rsvp_count', g.rsvp_count,
        'rsvp_note', g.rsvp_note, 'checkin_at', g.checkin_at,
        'table_id', g.table_id
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
        'id', g.id, 'donor_name', g.donor_name, 'greeting', g.greeting,
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

revoke all on function public.evg_event_dashboard(uuid) from public;
grant execute on function public.evg_event_dashboard(uuid) to authenticated;

-- ---------- defense-in-depth: owner-side RPCs are not for anon ----------
-- Discovered while verifying this migration: the project's default privileges
-- grant EXECUTE to anon on every new public function, so "revoke from public
-- + grant to authenticated" (0131-0133 and above) still left anon=X on the
-- owner-side surface. All of these are security *invoker* — an anon caller has
-- auth.uid() = null and RLS returns/updates zero rows, so nothing was
-- exposed — but the house standard (maatefet_*_revoke_anon) is to revoke
-- explicitly. Guest-facing definer RPCs (evg_hall_public, evg_hall_lead_create,
-- evg_guest_view, evg_event_public, evg_rsvp_submit, evg_gift_create) keep
-- anon on purpose: they are the token-gated product surface.
revoke execute on function public.evg_me() from anon;
revoke execute on function public.evg_hall_create(text, text, text, text, text) from anon;
revoke execute on function public.evg_hall_publish(uuid, boolean) from anon;
revoke execute on function public.evg_hall_leads_list(uuid) from anon;
revoke execute on function public.evg_hall_lead_status(uuid, text) from anon;
revoke execute on function public.evg_event_create(text, text, date, text, text, text, text, bigint, text) from anon;
revoke execute on function public.evg_event_status(uuid, text) from anon;
revoke execute on function public.evg_guests_add(uuid, jsonb) from anon;
revoke execute on function public.evg_guest_delete(uuid) from anon;
revoke execute on function public.evg_guest_checkin(uuid) from anon;
revoke execute on function public.evg_guest_checkin_by_token(uuid, text) from anon;
revoke execute on function public.evg_event_dashboard(uuid) from anon;
revoke execute on function public.evg_table_create(uuid, text, integer) from anon;
revoke execute on function public.evg_table_update(uuid, text, integer) from anon;
revoke execute on function public.evg_table_delete(uuid) from anon;
revoke execute on function public.evg_guest_set_table(uuid, uuid) from anon;
revoke execute on function public.evg_event_invite_set(uuid, text, text, text) from anon;
