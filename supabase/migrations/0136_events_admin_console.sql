-- more30 · 38-events-gifts — round 6: the super-admin console
-- ============================================================================
-- EVENTS_BUILD.md §1 role #1: "מנהל-על: רואה הכל — אולמות, אירועים, סליקות,
-- עמלות, לידים, דוחות הכנסה, ניהול משתמשים" and §4 "דוחות עמלות והכנסות
-- למנהל-על". Until now that role existed only inside RLS policies — there was
-- not a single evg_admin_* entrypoint, and the one flow the foundation
-- migration DESIGNED around the admin (halls start unpublished, only a
-- super-admin can flip `published` — the guard trigger from 0131) had no
-- working surface: evg_me() lists only the caller's OWN halls, so an admin
-- could never even see another owner's hall waiting for approval, let alone
-- approve it. This migration is that missing quarter of the platform.
--
-- Shape: SECURITY DEFINER + an explicit more30_is_super_admin() raise at the
-- top of every function (the same gate every other more30 admin surface
-- uses). Definer is needed because the admin views join auth.users for owner
-- emails (spec: "ניהול משתמשים" — the admin must know WHO owns what), which
-- `authenticated` can't read through invoker. The one WRITE here
-- (evg_admin_hall_share_set) stays SECURITY INVOKER on purpose: the 0131
-- halls RLS policy already admits a super-admin and the
-- guard_hall_admin_fields trigger already enforces admin on exactly this
-- column — defense in depth over a second definer path, same as
-- evg_hall_publish.
--
-- Additive only: five new public.evg_admin_* functions. No table changes, no
-- existing function touched. All wallet/gift figures are TEST-mode rows (the
-- 0131 guard_no_live_charges trigger still makes 'live' impossible) and are
-- labeled as such in the UI.

-- ---------- admin: platform-wide overview (the "רואה הכל" numbers) ----------
create or replace function public.evg_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = events, public, auth
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;

  return jsonb_build_object(
    'halls', (select jsonb_build_object(
        'total', count(*),
        'published', count(*) filter (where published),
        'pending', count(*) filter (where not published))
      from events.halls),
    'events', (select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status = 'active'),
        'upcoming', count(*) filter (where status = 'active'
                                       and event_date >= current_date))
      from events.events),
    'guests', (select jsonb_build_object(
        'total', count(*),
        'yes_souls', coalesce(sum(rsvp_count) filter (where rsvp_status = 'yes'), 0),
        'checked_in', count(*) filter (where checkin_at is not null))
      from events.guests),
    'leads', (select jsonb_build_object(
        'total', count(*),
        'new', count(*) filter (where status = 'new'))
      from events.hall_leads),
    'gifts', (select jsonb_build_object(
        'count', count(*),
        'total_agorot', coalesce(sum(amount_agorot), 0),
        'live_count', count(*) filter (where mode = 'live'))
      from events.gifts where status = 'paid'),
    'wallet', coalesce((select jsonb_object_agg(w.beneficiary, w.total) from (
        select beneficiary, sum(amount_agorot) as total
        from events.wallet_entries group by beneficiary) w), '{}'::jsonb),
    'users', jsonb_build_object(
        'hall_owners', (select count(distinct owner_auth_user_id) from events.halls),
        'event_owners', (select count(distinct owner_auth_user_id) from events.events)),
    'test_mode', true
  );
end;
$$;

revoke all on function public.evg_admin_overview() from public, anon;
grant execute on function public.evg_admin_overview() to authenticated;

-- ---------- admin: every hall, with its owner (approval queue lives here) --
create or replace function public.evg_admin_halls_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = events, public, auth
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', h.id, 'slug', h.slug, 'name', h.name, 'city', h.city,
      'phone', h.phone,
      'published', h.published, 'hall_share_bps', h.hall_share_bps,
      'owner_email', (select u.email from auth.users u
                      where u.id = h.owner_auth_user_id),
      'created_at', h.created_at,
      'leads_total', (select count(*) from events.hall_leads l
                      where l.hall_id = h.id),
      'leads_new', (select count(*) from events.hall_leads l
                    where l.hall_id = h.id and l.status = 'new'),
      'event_count', (select count(*) from events.events e
                      where e.hall_id = h.id)
    ) order by h.published asc, h.created_at desc)
    from events.halls h), '[]'::jsonb);
end;
$$;

revoke all on function public.evg_admin_halls_list() from public, anon;
grant execute on function public.evg_admin_halls_list() to authenticated;

-- ---------- admin: every event, with its owner and its commission ----------
create or replace function public.evg_admin_events_list(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = events, public, auth
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from events.events),
    'rows', coalesce((
      select jsonb_agg(r) from (
        select jsonb_build_object(
          'id', e.id, 'title', e.title, 'event_type', e.event_type::text,
          'event_date', e.event_date, 'status', e.status::text,
          'owner_email', (select u.email from auth.users u
                          where u.id = e.owner_auth_user_id),
          'hall_name', (select h.name from events.halls h where h.id = e.hall_id),
          'platform_fee_bps', e.platform_fee_bps,
          'guest_count', (select count(*) from events.guests g
                          where g.event_id = e.id),
          'yes_souls', (select coalesce(sum(g.rsvp_count), 0) from events.guests g
                        where g.event_id = e.id and g.rsvp_status = 'yes'),
          'gift_count', (select count(*) from events.gifts g
                         where g.event_id = e.id and g.status = 'paid'),
          'gift_total_agorot', (select coalesce(sum(g.amount_agorot), 0)
                                from events.gifts g
                                where g.event_id = e.id and g.status = 'paid'),
          'commission_agorot', (select coalesce(sum(w.amount_agorot), 0)
                                from events.wallet_entries w
                                where w.event_id = e.id
                                  and w.beneficiary = 'platform'),
          'created_at', e.created_at
        ) as r
        from events.events e
        order by e.created_at desc
        limit v_limit offset v_offset
      ) t), '[]'::jsonb));
end;
$$;

revoke all on function public.evg_admin_events_list(integer, integer) from public, anon;
grant execute on function public.evg_admin_events_list(integer, integer) to authenticated;

-- ---------- admin: revenue & commission report, by month ----------
-- "דוחות עמלות והכנסות למנהל-על": every wallet split bucketed by the month
-- the gift was given, so the admin sees gift volume, platform commission,
-- hall cuts and owner payouts side by side. Months come from gifts.created_at
-- (the ledger rows are written in the same transaction as the gift).
create or replace function public.evg_admin_revenue_report(
  p_months integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = events, public
as $$
declare
  v_months integer := least(greatest(coalesce(p_months, 12), 1), 36);
begin
  if not public.more30_is_super_admin() then
    raise exception 'super-admin only';
  end if;

  return coalesce((
    select jsonb_agg(r order by r->>'month' desc) from (
      select jsonb_build_object(
        'month', to_char(date_trunc('month', g.created_at), 'YYYY-MM'),
        'gift_count', count(distinct g.id),
        'gift_total_agorot', coalesce(sum(w.amount_agorot)
          filter (where w.beneficiary = 'event_owner'), 0)
          + coalesce(sum(w.amount_agorot)
          filter (where w.beneficiary = 'platform'), 0)
          + coalesce(sum(w.amount_agorot)
          filter (where w.beneficiary = 'hall'), 0),
        'event_owner_agorot', coalesce(sum(w.amount_agorot)
          filter (where w.beneficiary = 'event_owner'), 0),
        'platform_agorot', coalesce(sum(w.amount_agorot)
          filter (where w.beneficiary = 'platform'), 0),
        'hall_agorot', coalesce(sum(w.amount_agorot)
          filter (where w.beneficiary = 'hall'), 0)
      ) as r
      from events.gifts g
      join events.wallet_entries w on w.gift_id = g.id
      where g.status = 'paid'
        and g.created_at >= date_trunc('month', now()) - make_interval(months => v_months - 1)
      group by date_trunc('month', g.created_at)
    ) t), '[]'::jsonb);
end;
$$;

revoke all on function public.evg_admin_revenue_report(integer) from public, anon;
grant execute on function public.evg_admin_revenue_report(integer) to authenticated;

-- ---------- admin: set a hall's revenue share (bps) ----------
-- SECURITY INVOKER on purpose: the halls RLS policy admits a super-admin and
-- guard_hall_admin_fields (0131) already rejects this exact change for anyone
-- else — same entrypoint shape as evg_hall_publish.
create or replace function public.evg_admin_hall_share_set(
  p_hall_id uuid,
  p_share_bps integer
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = events, public
as $$
begin
  if p_share_bps is null or p_share_bps < 0 or p_share_bps > 2000 then
    raise exception 'hall share must be 0–2000 bps (0%%–20%%)';
  end if;
  update events.halls set hall_share_bps = p_share_bps where id = p_hall_id;
  if not found then raise exception 'hall not found'; end if;
  return jsonb_build_object('ok', true, 'hall_share_bps', p_share_bps);
end;
$$;

revoke all on function public.evg_admin_hall_share_set(uuid, integer) from public, anon;
grant execute on function public.evg_admin_hall_share_set(uuid, integer) to authenticated;
