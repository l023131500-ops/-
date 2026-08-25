-- more30 · 36 nadlan-pro — np_contract_context: carry tat_helka too
-- ============================================================================
-- np_contract_context (0012) already selects pr.gush/pr.helka for the merge
-- fields a contract template can use, but never selected pr.tat_helka (the
-- sub-parcel — a real, populated column on nadlan_pro.properties, editable in
-- the property drawer and shown everywhere else in app.html: property card,
-- area-watch, panorama/street-walk lookup). A gush/helka pair alone can be
-- ambiguous for a specific apartment inside a subdivided building; the
-- sub-parcel is exactly the extra digit that disambiguates it. Contracts
-- ("הסכם תיווך"/"זיכרון דברים") that reference a specific unit should be able
-- to state it precisely, same as every other property-identifying surface in
-- this app already can.
--
-- Purely additive: one more key in the returned jsonb object, no existing key
-- removed or renamed, no signature change (still `p_deal uuid -> jsonb`).
create or replace function public.np_contract_context(p_deal uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'deal_id', d.id, 'price', d.price, 'commission_pct', d.commission_pct,
    'property_address', pr.address, 'property_city', pr.city,
    'property_rooms', pr.rooms, 'property_area', pr.area_sqm,
    'property_gush', pr.gush, 'property_helka', pr.helka, 'property_tat_helka', pr.tat_helka,
    'buyer_name', bc.full_name,  'buyer_id', bc.id_number,  'buyer_email', bc.email,
    'seller_name', sc.full_name, 'seller_id', sc.id_number, 'seller_email', sc.email,
    'office_name', o.name, 'broker_license', o.license_number,
    -- The individual's licence when they have one, the office's otherwise: the
    -- disclosure names whoever actually brokered it.
    'broker_name', coalesce(m.full_name, o.name),
    'broker_own_license', m.license_number
  )
  from nadlan_pro.deals d
  join nadlan_pro.offices o on o.id = d.office_id
  left join nadlan_pro.office_members m on m.office_id = o.id and m.user_id = auth.uid()
  left join nadlan_pro.properties pr on pr.id = d.property_id
  left join nadlan_pro.contacts bc on bc.id = d.buyer_contact_id
  left join nadlan_pro.contacts sc on sc.id = d.seller_contact_id
  where d.id = p_deal;
$$;

grant execute on function public.np_contract_context(uuid) to authenticated;
