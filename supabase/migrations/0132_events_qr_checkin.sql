-- 38 events-gifts · QR check-in at the gate (EVENTS_BUILD.md §4: "צ'ק-אין
-- בכניסה ב-QR — סריקת מוזמן בכניסה, ספירה בזמן אמת").
--
-- The guest's personal link doubles as their entry pass: g.html renders it as
-- a QR, and the event owner scans it at the door from the dashboard's gate
-- mode. security invoker on purpose — RLS policy guests_event_owner already
-- limits both the token lookup and the checkin update to the event owner /
-- super-admin, so a stolen guest token is useless without an owner session,
-- and anon keeps zero access to events.guests (the 0131 anti-enumeration
-- stance unchanged).

create or replace function public.evg_guest_checkin_by_token(p_event_id uuid, p_token text)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
declare
  v_g events.guests;
  v_already boolean := false;
begin
  if p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_g from events.guests
  where personal_token = btrim(p_token);
  if v_g.id is null then
    -- unknown token, or a token whose event this caller doesn't own (RLS)
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_g.event_id <> p_event_id then
    -- valid token of this owner's OTHER event — a guest of event A must not
    -- be waved into event B just because both belong to the same organizer
    return jsonb_build_object('ok', false, 'reason', 'wrong_event');
  end if;

  if v_g.checkin_at is not null then
    v_already := true;
  else
    update events.guests set checkin_at = now()
    where id = v_g.id and checkin_at is null
    returning * into v_g;
    if v_g.id is null then
      -- lost the race to a second scanner at the same door — report theirs
      select * into v_g from events.guests where personal_token = btrim(p_token);
      v_already := true;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already', v_already,
    'guest', jsonb_build_object(
      'id', v_g.id, 'full_name', v_g.full_name, 'group_name', v_g.group_name,
      'invited_count', v_g.invited_count,
      'rsvp_status', v_g.rsvp_status::text, 'rsvp_count', v_g.rsvp_count,
      'checkin_at', v_g.checkin_at
    ),
    'counts', (
      select jsonb_build_object(
        'checked_in', count(*) filter (where g.checkin_at is not null),
        'total', count(*),
        'souls_in', coalesce(sum(coalesce(g.rsvp_count, g.invited_count))
                             filter (where g.checkin_at is not null), 0)
      ) from events.guests g where g.event_id = p_event_id
    )
  );
end;
$$;

revoke all on function public.evg_guest_checkin_by_token(uuid, text) from public;
grant execute on function public.evg_guest_checkin_by_token(uuid, text) to authenticated;
