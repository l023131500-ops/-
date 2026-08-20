-- more30 · 36 nadlan-pro — public, no-login viewing link for a property (stage 5)
-- ============================================================================
-- Every property in this CRM was reachable only from behind office login —
-- there was no way to hand a client a link and let them look at a listing
-- without an account. The office already has an e-signature flow that solves
-- exactly this shape of problem for contracts (a random token, a
-- SECURITY DEFINER function granted to anon, minimal fields returned). This
-- reuses that pattern for viewing, not signing.
--
-- Deliberately NOT included: the cached `truth_report` JSON on the property
-- row. That JSON is whatever system 32 returned to the *office's* session,
-- which may include tier-gated content the client never paid for. Re-serving
-- it here would bypass system 32's own free/premium gate. Instead the public
-- page links out to system 32's own report page for the address, so system 32
-- decides what the visitor sees — the truth engine is not duplicated or
-- second-guessed here, only pointed to.
-- ============================================================================

-- share_token is added WITHOUT a default first, then backfilled with an
-- explicit UPDATE, then given a default for rows created from here on. Adding
-- it with `default encode(gen_random_bytes(18),'hex')` directly would ask
-- Postgres to rewrite the table and give every existing row the SAME
-- computed value (a volatile default in ADD COLUMN is evaluated once for the
-- statement, not once per row) — an instant unique-constraint violation on
-- any table that already has more than one row, which this one does (21).
alter table nadlan_pro.properties
  add column if not exists share_token text unique,
  add column if not exists share_enabled boolean not null default false;

update nadlan_pro.properties
   set share_token = encode(gen_random_bytes(18), 'hex')
 where share_token is null;

alter table nadlan_pro.properties
  alter column share_token set default encode(gen_random_bytes(18), 'hex');

-- Fixes a latent bug in np_property_save (0010) that this feature is the first
-- real caller to hit: on UPDATE, `images` fell back to the row's existing
-- value whenever the new array produced zero aggregated rows — which is
-- exactly what an EMPTY array also produces, so there was no way to ever
-- clear a property's photos once set. `p ? 'images'` (jsonb key-exists) tells
-- "the caller sent this field, and it happens to be empty" apart from "the
-- caller didn't send this field at all" — only the app.html property form
-- always sends `images` (possibly `[]`), so this only changes behavior for
-- that one case, not for any other existing caller of this function.
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
      images     = case when p ? 'images'
                     then coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'images')), '{}')
                     else pr.images end
    where pr.id = v_id;
    if not found then
      raise exception 'הנכס לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
  end if;
  return v_id;
end $$;

-- Office side: toggle the link on/off. Relies on the existing np_properties_all
-- RLS policy (security invoker, not definer) — same authorization as every
-- other property write, nothing new to get wrong here.
create or replace function public.np_property_share_set(p_id uuid, p_enabled boolean)
returns jsonb language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_token text;
begin
  update nadlan_pro.properties
     set share_enabled = p_enabled, updated_at = now()
   where id = p_id
  returning share_token into v_token;
  if not found then
    raise exception 'הנכס לא נמצא, או שאין לך הרשאה לערוך אותו';
  end if;
  return jsonb_build_object('share_enabled', p_enabled, 'share_token', v_token);
end $$;

-- Public side: a visitor is not a more30 user, same as a contract signer.
-- SECURITY DEFINER on purpose (bypasses RLS deliberately, the way np_sign_fetch
-- does), and returns only what a listing needs — never owner_id, seller_contact_id,
-- office invoice/provider fields, or the cached truth_report. `share_enabled`
-- is the single switch the office controls; there is no separate status filter
-- here; a link the office turned on stays on until they turn it off, whatever
-- the property's status is (a "sold" listing an office chooses to keep visible
-- is their call, not a rule this function invents).
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
    'status', p.status::text, 'description', p.description, 'images', p.images,
    'office_name', o.name, 'office_phone', o.phone, 'office_email', o.email,
    -- What the "view the full verified report" link on the public page queries
    -- system 32 with — address-first, gush/helka as the fallback when there is
    -- no address on file. Never both glued together (that produced garbage
    -- queries elsewhere in this codebase — see lib/nadlan.ts's own street-name
    -- notes in system 32).
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

revoke all on function public.np_property_share_set(uuid, boolean) from public, anon;
grant execute on function public.np_property_share_set(uuid, boolean) to authenticated;

revoke all on function public.np_property_public(text) from public;
grant execute on function public.np_property_public(text) to anon, authenticated;
