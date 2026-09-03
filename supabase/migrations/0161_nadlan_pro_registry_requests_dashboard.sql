-- more30 · 36 nadlan-pro — office-wide pending tabu/tik-meida requests, surfaced on the dashboard
-- ============================================================================
-- The TOP BUILD DIRECTIVE's TABU workflow spec (item b) says a request must
-- "create a task in management (nihul)" -- but np_tabu_request_create /
-- np_tikmeida_request_create (0153/0155) only ever insert the row; nothing
-- ever surfaced it outside the one property it was filed against.
-- np_property_get (0010/0153/0155/0160) returns tabu_requests/tik_meida_requests
-- per-property, and tivuch/app.html only ever fetches that inside
-- openProperty() (grep confirms: the only two call sites are inside the
-- property drawer). An office with more than a handful of properties has no
-- way to discover "there is a pending nesach/tik-meida request somewhere"
-- short of opening every property card one by one -- the exact opposite of
-- "a task in management". np_dashboard (0010) already aggregates office-wide
-- signals this way for deals/commissions/activities; requests were the one
-- workflow with real DB state and zero office-wide visibility.
--
-- Adds a dedicated RPC rather than growing np_dashboard's single jsonb blob:
-- the dashboard needs a *list* here (property + status + who + how old), not
-- a KPI count, and jsonb_agg with an explicit ORDER BY over real typed
-- columns is clearer as its own function than nested inside np_dashboard's
-- already-large object literal.
-- ============================================================================

create or replace function public.np_registry_requests_pending(p_office uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  with rows as (
    select r.id, 'tabu'::text as kind, r.status, r.grade, r.property_id,
           r.created_at, r.sent_at, p.title, p.address, p.city, p.gush, p.helka
    from nadlan_pro.tabu_requests r
    join nadlan_pro.properties p on p.id = r.property_id
    where p.office_id = p_office and r.status in ('pending', 'sent')
    union all
    select r.id, 'tikmeida'::text as kind, r.status, r.grade, r.property_id,
           r.created_at, r.sent_at, p.title, p.address, p.city, p.gush, p.helka
    from nadlan_pro.tik_meida_requests r
    join nadlan_pro.properties p on p.id = r.property_id
    where p.office_id = p_office and r.status in ('pending', 'sent')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'kind', kind, 'status', status, 'grade', grade, 'property_id', property_id,
    'created_at', created_at, 'sent_at', sent_at, 'title', title, 'address', address,
    'city', city, 'gush', gush, 'helka', helka
  ) order by (grade = 'urgent') desc, created_at asc), '[]'::jsonb)
  from rows;
$$;

revoke all on function public.np_registry_requests_pending(uuid) from public, anon;
grant execute on function public.np_registry_requests_pending(uuid) to authenticated;
