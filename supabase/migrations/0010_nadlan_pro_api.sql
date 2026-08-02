-- more30 · 36 nadlan-pro — the API the app actually calls
-- ============================================================================
-- `nadlan_pro` is not in the project's exposed schemas, so PostgREST answers
-- 406/PGRST106 for its tables. These functions live in `public` (which IS
-- exposed) and read `nadlan_pro` on the caller's behalf.
--
-- They are SECURITY INVOKER, and that is the important decision. kesef needed
-- DEFINER because its tables carry `public_read_*` policies that had to be
-- narrowed. Here the policies in 0009 are already exactly the rule we want, so
-- running as the caller means RLS enforces the agent/manager/super-admin split
-- for free — there is no second copy of the permission logic to drift from the
-- first, and forgetting a check in a function body cannot leak a row.
--
-- The one exception is np_office_create: you cannot insert an office you do not
-- yet manage, so it is DEFINER and does its own check. See its comment.
--
-- EXECUTE is granted to `authenticated` only, so a signed-out caller gets 401
-- rather than an empty list.
-- ============================================================================

-- Who am I, and which offices can I act in. Every screen starts here.
create or replace function public.np_me()
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'email',   auth.jwt() ->> 'email',
    'is_super_admin', nadlan_pro.is_super_admin(),
    'offices', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'name', o.name, 'role', m.role,
               'license_number', o.license_number,
               'invoice_provider', o.invoice_provider,
               'my_license', m.license_number, 'my_name', m.full_name
             ) order by o.name)
      from nadlan_pro.offices o
      join nadlan_pro.office_members m on m.office_id = o.id
      where m.user_id = auth.uid() and m.is_active
    ), '[]'::jsonb)
  );
$$;

-- Creating the first office is the one place the caller cannot already be a
-- member, so this runs as the owner and enforces its own rule: you must be
-- signed in, and you become the office owner. Nothing else is granted.
create or replace function public.np_office_create(
  p_name text, p_license text default null, p_phone text default null,
  p_email text default null, p_city text default null
) returns uuid language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'שם המשרד חובה';
  end if;

  insert into nadlan_pro.offices (name, license_number, phone, email, city, created_by)
  values (trim(p_name), nullif(trim(coalesce(p_license,'')),''), p_phone, p_email, p_city, auth.uid())
  returning id into v_id;

  insert into nadlan_pro.office_members (office_id, user_id, role, full_name, email)
  values (v_id, auth.uid(), 'owner',
          coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email'),
          auth.jwt() ->> 'email');

  return v_id;
end $$;

-- Contacts ---------------------------------------------------------------------
create or replace function public.np_contacts(
  p_office uuid, p_q text default null, p_kind text default null,
  p_source text default null, p_limit int default 100, p_offset int default 0
) returns table (
  id uuid, full_name text, kind text, phone text, email text, city text,
  source text, source_detail text, tags text[], owner_id uuid,
  open_deals bigint, last_activity timestamptz, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select c.id, c.full_name, c.kind::text, c.phone, c.email, c.city,
         c.source::text, c.source_detail, c.tags, c.owner_id,
         (select count(*) from nadlan_pro.deals d
          where (d.buyer_contact_id = c.id or d.seller_contact_id = c.id)
            and d.stage not in ('closed','lost')),
         (select max(a.created_at) from nadlan_pro.activities a where a.contact_id = c.id),
         c.created_at
  from nadlan_pro.contacts c
  where c.office_id = p_office
    and not c.is_archived
    and (p_q is null or p_q = '' or c.full_name ilike '%'||p_q||'%'
         or c.phone ilike '%'||p_q||'%' or c.email ilike '%'||p_q||'%')
    and (p_kind is null or p_kind = '' or c.kind::text = p_kind)
    and (p_source is null or p_source = '' or c.source::text = p_source)
  order by c.created_at desc
  limit greatest(1, least(coalesce(p_limit,100), 500)) offset greatest(0, coalesce(p_offset,0));
$$;

-- One jsonb argument rather than twenty parameters: the shape changes as the
-- product grows, and a caller that omits a key should leave that column alone
-- rather than blank it. `id` present means update, absent means insert.
create or replace function public.np_contact_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.contacts (
      office_id, owner_id, kind, full_name, phone, email, id_number, address, city,
      source, source_detail, tags, notes,
      want_city, want_min_rooms, want_max_price, want_min_area, want_asset_type)
    values (
      (p->>'office_id')::uuid,
      coalesce(nullif(p->>'owner_id','')::uuid, auth.uid()),
      coalesce(nullif(p->>'kind',''), 'buyer')::nadlan_pro.contact_kind,
      p->>'full_name', p->>'phone', p->>'email', p->>'id_number', p->>'address', p->>'city',
      coalesce(nullif(p->>'source',''), 'manual')::nadlan_pro.lead_source,
      p->>'source_detail',
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'tags')), '{}'),
      p->>'notes',
      p->>'want_city',
      nullif(p->>'want_min_rooms','')::numeric,
      nullif(p->>'want_max_price','')::numeric,
      nullif(p->>'want_min_area','')::int,
      nullif(p->>'want_asset_type','')::nadlan_pro.asset_type)
    returning id into v_id;
  else
    update nadlan_pro.contacts c set
      kind        = coalesce(nullif(p->>'kind','')::nadlan_pro.contact_kind, c.kind),
      full_name   = coalesce(p->>'full_name', c.full_name),
      phone       = coalesce(p->>'phone', c.phone),
      email       = coalesce(p->>'email', c.email),
      id_number   = coalesce(p->>'id_number', c.id_number),
      address     = coalesce(p->>'address', c.address),
      city        = coalesce(p->>'city', c.city),
      source      = coalesce(nullif(p->>'source','')::nadlan_pro.lead_source, c.source),
      source_detail = coalesce(p->>'source_detail', c.source_detail),
      notes       = coalesce(p->>'notes', c.notes),
      owner_id    = coalesce(nullif(p->>'owner_id','')::uuid, c.owner_id),
      is_archived = coalesce(nullif(p->>'is_archived','')::boolean, c.is_archived),
      tags        = coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'tags')), c.tags),
      want_city       = coalesce(p->>'want_city', c.want_city),
      want_min_rooms  = coalesce(nullif(p->>'want_min_rooms','')::numeric, c.want_min_rooms),
      want_max_price  = coalesce(nullif(p->>'want_max_price','')::numeric, c.want_max_price),
      want_min_area   = coalesce(nullif(p->>'want_min_area','')::int, c.want_min_area),
      want_asset_type = coalesce(nullif(p->>'want_asset_type','')::nadlan_pro.asset_type, c.want_asset_type)
    where c.id = v_id;
    -- RLS silently filters an unreachable row, which would look like a
    -- successful no-op. Say so instead.
    if not found then
      raise exception 'איש הקשר לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
  end if;
  return v_id;
end $$;

-- Everything about one contact, in one round trip: the record, their deals,
-- their timeline, and the inventory that matches their criteria.
create or replace function public.np_contact_get(p_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'contact', to_jsonb(c),
    'deals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'title', d.title, 'stage', d.stage::text, 'price', d.price,
        'commission_amount', d.commission_amount, 'expected_close', d.expected_close,
        'property_address', pr.address) order by d.created_at desc)
      from nadlan_pro.deals d
      left join nadlan_pro.properties pr on pr.id = d.property_id
      where d.buyer_contact_id = c.id or d.seller_contact_id = c.id), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind::text, 'title', a.title, 'body', a.body,
        'due_at', a.due_at, 'is_done', a.is_done, 'created_at', a.created_at)
        order by a.created_at desc)
      from nadlan_pro.activities a where a.contact_id = c.id), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(to_jsonb(m)) from public.np_match(c.id) m), '[]'::jsonb)
  )
  from nadlan_pro.contacts c where c.id = p_id;
$$;

-- Properties ---------------------------------------------------------------------
create or replace function public.np_properties(
  p_office uuid, p_q text default null, p_status text default null,
  p_limit int default 100, p_offset int default 0
) returns table (
  id uuid, title text, address text, city text, asset_type text,
  rooms numeric, area_sqm int, floor int, price numeric, status text,
  is_exclusive boolean, exclusivity_until date, gush text, helka text,
  images text[], owner_id uuid, has_truth_report boolean, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select p.id, p.title, p.address, p.city, p.asset_type::text,
         p.rooms, p.area_sqm, p.floor, p.price, p.status::text,
         p.is_exclusive, p.exclusivity_until, p.gush, p.helka,
         p.images, p.owner_id, p.truth_report is not null, p.created_at
  from nadlan_pro.properties p
  where p.office_id = p_office
    and (p_q is null or p_q = '' or p.address ilike '%'||p_q||'%'
         or p.title ilike '%'||p_q||'%' or p.city ilike '%'||p_q||'%'
         or p.gush ilike '%'||p_q||'%')
    and (p_status is null or p_status = '' or p.status::text = p_status)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit,100), 500)) offset greatest(0, coalesce(p_offset,0));
$$;

create or replace function public.np_property_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.properties (
      office_id, owner_id, seller_contact_id, title, address, city,
      gush, helka, tat_helka, asset_type, rooms, area_sqm, floor, total_floors,
      price, status, is_exclusive, exclusivity_until, description, images)
    values (
      (p->>'office_id')::uuid,
      coalesce(nullif(p->>'owner_id','')::uuid, auth.uid()),
      nullif(p->>'seller_contact_id','')::uuid,
      p->>'title', p->>'address', p->>'city',
      nullif(p->>'gush',''), nullif(p->>'helka',''), nullif(p->>'tat_helka',''),
      coalesce(nullif(p->>'asset_type',''), 'apartment')::nadlan_pro.asset_type,
      nullif(p->>'rooms','')::numeric, nullif(p->>'area_sqm','')::int,
      nullif(p->>'floor','')::int, nullif(p->>'total_floors','')::int,
      nullif(p->>'price','')::numeric,
      coalesce(nullif(p->>'status',''), 'active')::nadlan_pro.property_status,
      coalesce(nullif(p->>'is_exclusive','')::boolean, false),
      nullif(p->>'exclusivity_until','')::date,
      p->>'description',
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'images')), '{}'))
    returning id into v_id;
  else
    update nadlan_pro.properties pr set
      seller_contact_id = coalesce(nullif(p->>'seller_contact_id','')::uuid, pr.seller_contact_id),
      title      = coalesce(p->>'title', pr.title),
      address    = coalesce(p->>'address', pr.address),
      city       = coalesce(p->>'city', pr.city),
      gush       = coalesce(nullif(p->>'gush',''), pr.gush),
      helka      = coalesce(nullif(p->>'helka',''), pr.helka),
      tat_helka  = coalesce(nullif(p->>'tat_helka',''), pr.tat_helka),
      asset_type = coalesce(nullif(p->>'asset_type','')::nadlan_pro.asset_type, pr.asset_type),
      rooms      = coalesce(nullif(p->>'rooms','')::numeric, pr.rooms),
      area_sqm   = coalesce(nullif(p->>'area_sqm','')::int, pr.area_sqm),
      floor      = coalesce(nullif(p->>'floor','')::int, pr.floor),
      total_floors = coalesce(nullif(p->>'total_floors','')::int, pr.total_floors),
      price      = coalesce(nullif(p->>'price','')::numeric, pr.price),
      status     = coalesce(nullif(p->>'status','')::nadlan_pro.property_status, pr.status),
      is_exclusive = coalesce(nullif(p->>'is_exclusive','')::boolean, pr.is_exclusive),
      exclusivity_until = coalesce(nullif(p->>'exclusivity_until','')::date, pr.exclusivity_until),
      description = coalesce(p->>'description', pr.description),
      owner_id   = coalesce(nullif(p->>'owner_id','')::uuid, pr.owner_id),
      images     = coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'images')), pr.images)
    where pr.id = v_id;
    if not found then
      raise exception 'הנכס לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.np_property_get(p_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'property', to_jsonb(p),
    'seller', (select to_jsonb(c) from nadlan_pro.contacts c where c.id = p.seller_contact_id),
    'deals', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title,
             'stage', d.stage::text, 'price', d.price) order by d.created_at desc)
      from nadlan_pro.deals d where d.property_id = p.id), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind::text,
             'title', a.title, 'created_at', a.created_at) order by a.created_at desc)
      from nadlan_pro.activities a where a.property_id = p.id), '[]'::jsonb)
  )
  from nadlan_pro.properties p where p.id = p_id;
$$;

-- The truth-engine answer is written back by the app after it calls system 32.
-- Stored with the moment it was fetched, and an error string when the call
-- failed, so the card can say "לא זמין" and why rather than showing nothing.
create or replace function public.np_property_truth_set(
  p_id uuid, p_report jsonb, p_error text default null)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.properties
     set truth_report = p_report,
         truth_report_at = now(),
         truth_report_error = p_error
   where id = p_id;
  if not found then
    raise exception 'הנכס לא נמצא, או שאין לך הרשאה לערוך אותו';
  end if;
end $$;

-- Deals ----------------------------------------------------------------------
-- The board, grouped by stage in one call. A per-stage query would be seven
-- round trips for a screen that is meaningless unless all seven agree.
create or replace function public.np_board(p_office uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select coalesce(jsonb_object_agg(stage, cards), '{}'::jsonb)
  from (
    select d.stage::text as stage,
           jsonb_agg(jsonb_build_object(
             'id', d.id, 'title', d.title, 'price', d.price,
             'commission_amount', d.commission_amount,
             'expected_close', d.expected_close, 'owner_id', d.owner_id,
             'property_address', pr.address, 'property_city', pr.city,
             'buyer', bc.full_name, 'seller', sc.full_name,
             'updated_at', d.updated_at
           ) order by d.updated_at desc) as cards
    from nadlan_pro.deals d
    left join nadlan_pro.properties pr on pr.id = d.property_id
    left join nadlan_pro.contacts bc on bc.id = d.buyer_contact_id
    left join nadlan_pro.contacts sc on sc.id = d.seller_contact_id
    where d.office_id = p_office
    group by d.stage
  ) g;
$$;

create or replace function public.np_deal_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.deals (
      office_id, owner_id, property_id, buyer_contact_id, seller_contact_id,
      title, stage, price, commission_pct, commission_amount, expected_close, notes)
    values (
      (p->>'office_id')::uuid,
      coalesce(nullif(p->>'owner_id','')::uuid, auth.uid()),
      nullif(p->>'property_id','')::uuid,
      nullif(p->>'buyer_contact_id','')::uuid,
      nullif(p->>'seller_contact_id','')::uuid,
      p->>'title',
      coalesce(nullif(p->>'stage',''), 'lead')::nadlan_pro.deal_stage,
      nullif(p->>'price','')::numeric,
      nullif(p->>'commission_pct','')::numeric,
      nullif(p->>'commission_amount','')::numeric,
      nullif(p->>'expected_close','')::date,
      p->>'notes')
    returning id into v_id;
  else
    update nadlan_pro.deals d set
      property_id       = coalesce(nullif(p->>'property_id','')::uuid, d.property_id),
      buyer_contact_id  = coalesce(nullif(p->>'buyer_contact_id','')::uuid, d.buyer_contact_id),
      seller_contact_id = coalesce(nullif(p->>'seller_contact_id','')::uuid, d.seller_contact_id),
      title             = coalesce(p->>'title', d.title),
      stage             = coalesce(nullif(p->>'stage','')::nadlan_pro.deal_stage, d.stage),
      price             = coalesce(nullif(p->>'price','')::numeric, d.price),
      commission_pct    = coalesce(nullif(p->>'commission_pct','')::numeric, d.commission_pct),
      commission_amount = coalesce(nullif(p->>'commission_amount','')::numeric, d.commission_amount),
      expected_close    = coalesce(nullif(p->>'expected_close','')::date, d.expected_close),
      lost_reason       = coalesce(p->>'lost_reason', d.lost_reason),
      owner_id          = coalesce(nullif(p->>'owner_id','')::uuid, d.owner_id),
      notes             = coalesce(p->>'notes', d.notes)
    where d.id = v_id;
    if not found then
      raise exception 'העסקה לא נמצאה, או שאין לך הרשאה לערוך אותה';
    end if;
  end if;
  return v_id;
end $$;

-- Dragging a card is its own call: it is the one deal edit that happens
-- constantly and must not need the rest of the record round-tripped.
create or replace function public.np_deal_stage(p_id uuid, p_stage text)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.deals set stage = p_stage::nadlan_pro.deal_stage where id = p_id;
  if not found then
    raise exception 'העסקה לא נמצאה, או שאין לך הרשאה לערוך אותה';
  end if;
end $$;

create or replace function public.np_deal_get(p_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'deal', to_jsonb(d),
    'property', (select to_jsonb(pr) from nadlan_pro.properties pr where pr.id = d.property_id),
    'buyer',  (select to_jsonb(c) from nadlan_pro.contacts c where c.id = d.buyer_contact_id),
    'seller', (select to_jsonb(c) from nadlan_pro.contacts c where c.id = d.seller_contact_id),
    'checklist', coalesce((
      select jsonb_agg(jsonb_build_object('step_key', k.step_key, 'label', k.label,
             'sort', k.sort, 'is_done', k.is_done, 'done_at', k.done_at, 'note', k.note)
             order by k.sort)
      from nadlan_pro.deal_checklist k where k.deal_id = d.id), '[]'::jsonb),
    'commissions', coalesce((
      select jsonb_agg(jsonb_build_object('id', cm.id, 'member_id', cm.member_id,
             'payer', cm.payer, 'pct', cm.pct, 'amount', cm.amount,
             'status', cm.status::text, 'collected_at', cm.collected_at) order by cm.created_at)
      from nadlan_pro.commissions cm where cm.deal_id = d.id), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind::text, 'title', a.title,
             'body', a.body, 'due_at', a.due_at, 'is_done', a.is_done, 'created_at', a.created_at)
             order by a.created_at desc)
      from nadlan_pro.activities a where a.deal_id = d.id), '[]'::jsonb),
    'stage_history', coalesce((
      select jsonb_agg(jsonb_build_object('from', e.from_stage::text, 'to', e.to_stage::text,
             'at', e.changed_at) order by e.changed_at)
      from nadlan_pro.deal_stage_events e where e.deal_id = d.id), '[]'::jsonb)
  )
  from nadlan_pro.deals d where d.id = p_id;
$$;

create or replace function public.np_checklist_toggle(
  p_deal uuid, p_step text, p_done boolean, p_note text default null)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.deal_checklist
     set is_done = p_done,
         done_at = case when p_done then now() else null end,
         done_by = case when p_done then auth.uid() else null end,
         note    = coalesce(p_note, note)
   where deal_id = p_deal and step_key = p_step;
  if not found then
    raise exception 'שלב הצ׳קליסט לא נמצא, או שאין לך הרשאה לעדכן אותו';
  end if;
end $$;

-- Activities -------------------------------------------------------------------
create or replace function public.np_activities(
  p_office uuid, p_contact uuid default null, p_deal uuid default null,
  p_only_open boolean default false, p_limit int default 100
) returns table (
  id uuid, kind text, title text, body text, due_at timestamptz,
  is_done boolean, assigned_to uuid, contact_id uuid, deal_id uuid,
  property_id uuid, contact_name text, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select a.id, a.kind::text, a.title, a.body, a.due_at, a.is_done, a.assigned_to,
         a.contact_id, a.deal_id, a.property_id, c.full_name, a.created_at
  from nadlan_pro.activities a
  left join nadlan_pro.contacts c on c.id = a.contact_id
  where a.office_id = p_office
    and (p_contact is null or a.contact_id = p_contact)
    and (p_deal is null or a.deal_id = p_deal)
    and (not p_only_open or not a.is_done)
  order by coalesce(a.due_at, a.created_at) desc
  limit greatest(1, least(coalesce(p_limit,100), 500));
$$;

create or replace function public.np_activity_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.activities (
      office_id, contact_id, deal_id, property_id, kind, title, body,
      due_at, assigned_to, created_by)
    values (
      (p->>'office_id')::uuid,
      nullif(p->>'contact_id','')::uuid,
      nullif(p->>'deal_id','')::uuid,
      nullif(p->>'property_id','')::uuid,
      coalesce(nullif(p->>'kind',''), 'note')::nadlan_pro.activity_kind,
      p->>'title', p->>'body',
      nullif(p->>'due_at','')::timestamptz,
      coalesce(nullif(p->>'assigned_to','')::uuid, auth.uid()),
      auth.uid())
    returning id into v_id;
  else
    update nadlan_pro.activities a set
      title   = coalesce(p->>'title', a.title),
      body    = coalesce(p->>'body', a.body),
      due_at  = coalesce(nullif(p->>'due_at','')::timestamptz, a.due_at),
      is_done = coalesce(nullif(p->>'is_done','')::boolean, a.is_done),
      done_at = case when coalesce(nullif(p->>'is_done','')::boolean, a.is_done)
                     then coalesce(a.done_at, now()) else null end,
      assigned_to = coalesce(nullif(p->>'assigned_to','')::uuid, a.assigned_to)
    where a.id = v_id;
    if not found then
      raise exception 'הפעילות לא נמצאה, או שאין לך הרשאה לערוך אותה';
    end if;
  end if;
  return v_id;
end $$;

-- Buyer-to-inventory matching ---------------------------------------------------
-- A null criterion means "no preference" and is skipped, not treated as zero.
-- That distinction is the whole point: a buyer who did not state a maximum
-- price must not be matched against nothing.
create or replace function public.np_match(p_contact uuid)
returns table (
  property_id uuid, title text, address text, city text, price numeric,
  rooms numeric, area_sqm int, asset_type text, status text, score int
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  with c as (select * from nadlan_pro.contacts where id = p_contact)
  select p.id, p.title, p.address, p.city, p.price, p.rooms, p.area_sqm,
         p.asset_type::text, p.status::text,
         ((case when c.want_city is null or p.city = c.want_city then 1 else 0 end)
        + (case when c.want_max_price is null or p.price <= c.want_max_price then 1 else 0 end)
        + (case when c.want_min_rooms is null or p.rooms >= c.want_min_rooms then 1 else 0 end)
        + (case when c.want_min_area is null or p.area_sqm >= c.want_min_area then 1 else 0 end)
        + (case when c.want_asset_type is null or p.asset_type = c.want_asset_type then 1 else 0 end)
         )::int as score
  from nadlan_pro.properties p, c
  where p.office_id = c.office_id
    and p.status = 'active'
    -- Stated criteria are hard filters. A buyer who said "up to 2M" does not
    -- want a 3M flat shown as a weaker match; they want it not shown.
    and (c.want_city is null or p.city = c.want_city)
    and (c.want_max_price is null or p.price is null or p.price <= c.want_max_price)
    and (c.want_min_rooms is null or p.rooms is null or p.rooms >= c.want_min_rooms)
    and (c.want_min_area is null or p.area_sqm is null or p.area_sqm >= c.want_min_area)
    and (c.want_asset_type is null or p.asset_type = c.want_asset_type)
  order by score desc, p.created_at desc
  limit 30;
$$;

-- Dashboard ----------------------------------------------------------------------
-- Counts are what RLS lets the caller see, so an agent's dashboard is their own
-- book and a manager's is the office. That falls out of SECURITY INVOKER rather
-- than needing a separate "scope" argument nobody would remember to pass.
create or replace function public.np_dashboard(p_office uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'contacts',        (select count(*) from nadlan_pro.contacts where office_id = p_office and not is_archived),
    'new_leads_30d',   (select count(*) from nadlan_pro.contacts where office_id = p_office
                          and created_at > now() - interval '30 days'),
    'properties_active',(select count(*) from nadlan_pro.properties where office_id = p_office and status = 'active'),
    'properties_total', (select count(*) from nadlan_pro.properties where office_id = p_office),
    'deals_open',      (select count(*) from nadlan_pro.deals where office_id = p_office
                          and stage not in ('closed','lost')),
    'deals_closed',    (select count(*) from nadlan_pro.deals where office_id = p_office and stage = 'closed'),
    'deals_lost',      (select count(*) from nadlan_pro.deals where office_id = p_office and stage = 'lost'),
    'pipeline_value',  (select coalesce(sum(price),0) from nadlan_pro.deals where office_id = p_office
                          and stage not in ('closed','lost')),
    'commission_pending',   (select coalesce(sum(amount),0) from nadlan_pro.commissions
                               where office_id = p_office and status in ('pending','invoiced')),
    'commission_collected', (select coalesce(sum(amount),0) from nadlan_pro.commissions
                               where office_id = p_office and status = 'collected'),
    'tasks_open',      (select count(*) from nadlan_pro.activities where office_id = p_office
                          and not is_done and due_at is not null),
    'tasks_overdue',   (select count(*) from nadlan_pro.activities where office_id = p_office
                          and not is_done and due_at < now()),
    -- Which lead sources actually produce closed deals. This is the number the
    -- spec asks for under "winning lead sources", and it is only meaningful
    -- joined through to the deal outcome.
    'by_source', coalesce((
      select jsonb_agg(jsonb_build_object('source', s.source, 'leads', s.leads, 'closed', s.closed)
             order by s.leads desc)
      from (
        select c.source::text as source, count(*) as leads,
               count(*) filter (where exists (
                 select 1 from nadlan_pro.deals d
                 where (d.buyer_contact_id = c.id or d.seller_contact_id = c.id)
                   and d.stage = 'closed')) as closed
        from nadlan_pro.contacts c where c.office_id = p_office group by c.source
      ) s), '[]'::jsonb)
  );
$$;

-- A new deal gets the standard closing checklist. In the database rather than
-- the API so an import or a future service produces the same deal as the UI.
create or replace function nadlan_pro.seed_checklist()
returns trigger language plpgsql
set search_path = nadlan_pro, public, pg_temp as $$
begin
  insert into nadlan_pro.deal_checklist (deal_id, step_key, label, sort) values
    (new.id, 'broker_agreement',     'הסכם תיווך חתום',            10),
    (new.id, 'memorandum',           'זיכרון דברים',                20),
    (new.id, 'due_diligence',        'בדיקת נסח וזכויות',           30),
    (new.id, 'contract_draft',       'טיוטת חוזה',                  40),
    (new.id, 'contract_signed',      'חוזה חתום',                   50),
    (new.id, 'down_payment',         'תשלום ראשון',                 60),
    (new.id, 'handover',             'מסירת הנכס',                  70),
    (new.id, 'commission_invoice',   'חשבונית עמלה',                80),
    (new.id, 'commission_collected', 'עמלה נגבתה',                  90)
  on conflict (deal_id, step_key) do nothing;
  return new;
end $$;

drop trigger if exists trg_deals_seed_checklist on nadlan_pro.deals;
create trigger trg_deals_seed_checklist
  after insert on nadlan_pro.deals
  for each row execute function nadlan_pro.seed_checklist();

-- Grants -------------------------------------------------------------------------
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, so the revoke has to come
-- first or anon keeps what these are meant to withhold.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.np_me()',
    'public.np_office_create(text,text,text,text,text)',
    'public.np_contacts(uuid,text,text,text,int,int)',
    'public.np_contact_save(jsonb)',
    'public.np_contact_get(uuid)',
    'public.np_properties(uuid,text,text,int,int)',
    'public.np_property_save(jsonb)',
    'public.np_property_get(uuid)',
    'public.np_property_truth_set(uuid,jsonb,text)',
    'public.np_board(uuid)',
    'public.np_deal_save(jsonb)',
    'public.np_deal_stage(uuid,text)',
    'public.np_deal_get(uuid)',
    'public.np_checklist_toggle(uuid,text,boolean,text)',
    'public.np_activities(uuid,uuid,uuid,boolean,int)',
    'public.np_activity_save(jsonb)',
    'public.np_match(uuid)',
    'public.np_dashboard(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
