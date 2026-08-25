-- more30 · 36 nadlan-pro — separate sale price from rent price (P2 ACCURACY SPEC v2 §D)
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-25 without a
-- matching repo file until now. Captures the final live state; np_property_save
-- below also folds in an unrelated same-day fix already present in its final
-- body — `images` only clears when the caller explicitly sends the key
-- (`p ? 'images'`), not merely omits it.
-- ============================================================================
--
-- properties.price had no sale/rent flag: a rent listing's monthly figure
-- flowed silently through the investment-feasibility panel's purchase-tax/
-- mortgage math and through the truth-report valuation diff as if it were a
-- sale asking price. Default 'sale' is zero behavior change for existing rows.

do $$ begin
  create type nadlan_pro.listing_purpose as enum ('sale', 'rent');
exception when duplicate_object then null; end $$;

alter table nadlan_pro.properties
  add column if not exists listing_purpose nadlan_pro.listing_purpose not null default 'sale';

create or replace function public.np_property_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.properties (
      office_id, owner_id, seller_contact_id, title, address, city,
      gush, helka, tat_helka, asset_type, rooms, area_sqm, floor, total_floors,
      price, listing_purpose, status, is_exclusive, exclusivity_until, description, images, video_url)
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
      coalesce(nullif(p->>'listing_purpose',''), 'sale')::nadlan_pro.listing_purpose,
      coalesce(nullif(p->>'status',''), 'active')::nadlan_pro.property_status,
      coalesce(nullif(p->>'is_exclusive','')::boolean, false),
      nullif(p->>'exclusivity_until','')::date,
      p->>'description',
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'images')), '{}'),
      nullif(p->>'video_url',''))
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
      listing_purpose = coalesce(nullif(p->>'listing_purpose','')::nadlan_pro.listing_purpose, pr.listing_purpose),
      status     = coalesce(nullif(p->>'status','')::nadlan_pro.property_status, pr.status),
      is_exclusive = coalesce(nullif(p->>'is_exclusive','')::boolean, pr.is_exclusive),
      exclusivity_until = coalesce(nullif(p->>'exclusivity_until','')::date, pr.exclusivity_until),
      description = coalesce(p->>'description', pr.description),
      owner_id   = coalesce(nullif(p->>'owner_id','')::uuid, pr.owner_id),
      images     = case when p ? 'images'
                     then coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'images')), '{}')
                     else pr.images end,
      video_url  = case when p ? 'video_url' then nullif(p->>'video_url','') else pr.video_url end
    where pr.id = v_id;
    if not found then
      raise exception 'הנכס לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
  end if;
  return v_id;
end $$;

-- New overload with p_purpose — the pre-existing 5-arg np_properties (0104)
-- is left in place rather than dropped, so any in-flight caller bound to the
-- old signature keeps working.
create or replace function public.np_properties(
  p_office uuid, p_q text default null, p_status text default null,
  p_limit int default 100, p_offset int default 0, p_purpose text default null
) returns table(
  id uuid, title text, address text, city text, asset_type text, rooms numeric,
  area_sqm int, floor int, price numeric, listing_purpose text, status text,
  is_exclusive boolean, exclusivity_until date, gush text, helka text, images text[],
  owner_id uuid, has_truth_report boolean, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select p.id, p.title, p.address, p.city, p.asset_type::text,
         p.rooms, p.area_sqm, p.floor, p.price, p.listing_purpose::text, p.status::text,
         p.is_exclusive, p.exclusivity_until, p.gush, p.helka,
         p.images, p.owner_id, p.truth_report is not null, p.created_at
  from nadlan_pro.properties p
  where p.office_id = p_office
    and (p_q is null or p_q = '' or p.address ilike '%'||p_q||'%'
         or p.title ilike '%'||p_q||'%' or p.city ilike '%'||p_q||'%'
         or p.gush ilike '%'||p_q||'%')
    and (p_status is null or p_status = '' or p.status::text = p_status)
    and (p_purpose is null or p_purpose = '' or p.listing_purpose::text = p_purpose)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit,100), 500)) offset greatest(0, coalesce(p_offset,0));
$$;

-- np_office_public (0129) predates this column — re-created here so the
-- office microsite's listing cards also carry listing_purpose.
create or replace function public.np_office_public(p_token text)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_office nadlan_pro.offices%rowtype;
declare v_listings jsonb;
begin
  select * into v_office from nadlan_pro.offices
   where public_token = p_token and public_enabled = true;

  if not found then
    return jsonb_build_object('ok', false,
      'error', 'העמוד אינו זמין. ייתכן שהמשרד הסיר את הפרסום, או שהקישור שגוי.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'title', p.title, 'address', p.address, 'city', p.city,
    'asset_type', p.asset_type::text, 'rooms', p.rooms, 'area_sqm', p.area_sqm,
    'price', p.price, 'listing_purpose', p.listing_purpose::text,
    'images', p.images, 'share_token', p.share_token
  ) order by p.created_at desc), '[]'::jsonb)
  into v_listings
  from nadlan_pro.properties p
  where p.office_id = v_office.id and p.status = 'active' and p.share_enabled = true;

  return jsonb_build_object(
    'ok', true,
    'name', v_office.name, 'license_number', v_office.license_number,
    'phone', v_office.phone, 'email', v_office.email,
    'address', v_office.address, 'city', v_office.city,
    'logo_url', v_office.logo_url, 'about', v_office.about,
    'listings', v_listings
  );
end $$;

create or replace function public.np_property_public(p_token text)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'ok', true,
    'title', p.title, 'address', p.address, 'city', p.city,
    'asset_type', p.asset_type::text, 'rooms', p.rooms, 'area_sqm', p.area_sqm,
    'floor', p.floor, 'total_floors', p.total_floors, 'price', p.price,
    'listing_purpose', p.listing_purpose::text,
    'status', p.status::text, 'description', p.description, 'images', p.images,
    'video_url', p.video_url,
    'office_name', o.name, 'office_phone', o.phone, 'office_email', o.email,
    'report_query', case
      when nullif(trim(coalesce(p.address, '')), '') is not null
        then trim(p.address || coalesce(' ' || nullif(p.city, ''), ''))
      when p.gush is not null and p.helka is not null then p.gush || '/' || p.helka
      else null
    end
  ) into v
  from nadlan_pro.properties p
  join nadlan_pro.offices o on o.id = p.office_id
  where p.share_token = p_token and p.share_enabled = true;

  if v is null then
    return jsonb_build_object('ok', false,
      'error', 'הקישור אינו זמין. ייתכן שהמתווך הסיר את השיתוף, או שהקישור שגוי.');
  end if;
  return v;
end $$;
