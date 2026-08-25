-- more30 · 36 nadlan-pro — public office microsite (module 9, "הגדרות")
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-25 without a
-- matching repo file until now. Captures the final live state.
-- ============================================================================
--
-- Distinct from the single-property public listing (0104's listing.html):
-- a no-login office page aggregating whichever properties the office already
-- individually chose to expose (status='active' and share_enabled=true) —
-- never widens what's already shared. Same random-token/regenerate pattern
-- as properties.share_token (0104).
--
-- np_office_public_token_regenerate's search_path is restricted to
-- nadlan_pro/public/pg_temp, which does NOT include `extensions` (where this
-- project's pgcrypto actually lives) — a bare gen_random_bytes() only
-- resolved by accident of whatever session applied the original migration.
-- Fully qualifying extensions.gen_random_bytes fixes it without widening
-- search_path (a same-day live fix,
-- nadlan_pro_office_public_token_regen_fix_search_path — see CLAUDE.md).

alter table nadlan_pro.offices
  add column if not exists public_token text not null default encode(gen_random_bytes(18), 'hex'),
  add column if not exists public_enabled boolean not null default false,
  add column if not exists about text;

do $$ begin
  alter table nadlan_pro.offices add constraint offices_public_token_key unique (public_token);
exception when duplicate_object or duplicate_table then null; end $$;

create or replace function public.np_office_settings_get(p_office uuid)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v jsonb;
begin
  if p_office is null or not (
    nadlan_pro.is_super_admin() or p_office in (select nadlan_pro.my_office_ids())
  ) then
    raise exception 'המשרד לא נמצא, או שאין לך הרשאה לצפות בו';
  end if;

  select jsonb_build_object(
    'id', o.id, 'name', o.name, 'license_number', o.license_number,
    'phone', o.phone, 'email', o.email, 'address', o.address, 'city', o.city,
    'logo_url', o.logo_url, 'about', o.about,
    'public_enabled', o.public_enabled, 'public_token', o.public_token,
    'lead_intake_enabled', o.lead_intake_enabled, 'lead_intake_token', o.lead_intake_token
  ) into v
  from nadlan_pro.offices o where o.id = p_office;

  return v;
end $$;

revoke all on function public.np_office_settings_get(uuid) from anon;

create or replace function public.np_office_settings_save(p jsonb)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_office uuid := nullif(p->>'office_id','')::uuid;
declare v jsonb;
begin
  if v_office is null or not nadlan_pro.manages_office(v_office) then
    raise exception 'רק בעלים/מנהל יכולים לערוך את פרטי המשרד';
  end if;
  if p ? 'name' and coalesce(trim(p->>'name'), '') = '' then
    raise exception 'שם המשרד חובה';
  end if;

  update nadlan_pro.offices o set
    name           = coalesce(nullif(trim(p->>'name'), ''), o.name),
    license_number = case when p ? 'license_number' then nullif(trim(p->>'license_number'), '') else o.license_number end,
    phone          = case when p ? 'phone' then nullif(trim(p->>'phone'), '') else o.phone end,
    email          = case when p ? 'email' then nullif(trim(p->>'email'), '') else o.email end,
    address        = case when p ? 'address' then nullif(trim(p->>'address'), '') else o.address end,
    city           = case when p ? 'city' then nullif(trim(p->>'city'), '') else o.city end,
    logo_url       = case when p ? 'logo_url' then nullif(trim(p->>'logo_url'), '') else o.logo_url end,
    about          = case when p ? 'about' then nullif(trim(p->>'about'), '') else o.about end,
    public_enabled = coalesce((p->>'public_enabled')::boolean, o.public_enabled),
    lead_intake_enabled = coalesce((p->>'lead_intake_enabled')::boolean, o.lead_intake_enabled),
    updated_at     = now()
  where o.id = v_office
  returning jsonb_build_object(
    'id', o.id, 'name', o.name, 'license_number', o.license_number,
    'phone', o.phone, 'email', o.email, 'address', o.address, 'city', o.city,
    'logo_url', o.logo_url, 'about', o.about,
    'public_enabled', o.public_enabled, 'public_token', o.public_token,
    'lead_intake_enabled', o.lead_intake_enabled, 'lead_intake_token', o.lead_intake_token
  ) into v;

  if v is null then
    raise exception 'המשרד לא נמצא';
  end if;
  return v;
end $$;

revoke all on function public.np_office_settings_save(jsonb) from anon;

-- Anon-readable by design, same posture as np_property_public (0104): the
-- public microsite has no session.
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
    'price', p.price,
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

create or replace function public.np_office_public_token_regenerate(p_office uuid)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_token text;
begin
  if p_office is null or not nadlan_pro.manages_office(p_office) then
    raise exception 'רק בעלים/מנהל יכולים לחדש את הקישור';
  end if;

  update nadlan_pro.offices
     set public_token = encode(extensions.gen_random_bytes(18), 'hex'), updated_at = now()
   where id = p_office
  returning public_token into v_token;

  if v_token is null then
    raise exception 'המשרד לא נמצא';
  end if;
  return jsonb_build_object('public_token', v_token);
end $$;

revoke all on function public.np_office_public_token_regenerate(uuid) from anon;
