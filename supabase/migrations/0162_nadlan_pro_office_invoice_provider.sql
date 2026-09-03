-- more30 · 36 nadlan-pro — office settings: expose invoice_provider write path
-- ============================================================================
-- nadlan_pro.offices.invoice_provider / invoice_provider_ref have existed
-- since the very first schema migration (0009) specifically to answer
-- np_invoice_precheck's `provider_connected` / `can_issue_tax_invoice` check
-- (0011) -- the gate that decides whether a deal's invoicePanel() offers real
-- tax-invoice issuance or only a "בקש חיבור ספק" fallback (payment request).
-- But no RPC and no UI form ever wrote to either column: np_office_settings_
-- get/save (0129, the only read/write pair for office settings) never
-- selected or accepted them, and app.html's "פרטי המשרד" form (renderSettings/
-- wireSettingsBody) never rendered an input for them. The result: for every
-- office that has ever existed, invoice_provider is permanently NULL,
-- provider_connected is permanently false, and the entire "ספק מחובר...
-- הפקה מתבצעת בצד השרת" branch of invoicePanel() is dead code that can never
-- run -- every office is stuck on payment-request-only, forever, with no way
-- to record that they already have an account with an authorised provider
-- (iCount / Green Invoice / Morning) as the code comments anticipate.
--
-- This migration does NOT talk to any provider API (that still needs real
-- accreditation/keys, same "supplier pending" class as TABU/tik-meida) -- it
-- only lets an office record which provider they use and their account
-- reference with that provider, exactly like every other office-identifying
-- field already editable here (license_number, phone, email...). Purely
-- additive: two more keys in the existing jsonb get/save shape, no existing
-- key removed or renamed, no signature change.
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
    'lead_intake_enabled', o.lead_intake_enabled, 'lead_intake_token', o.lead_intake_token,
    'invoice_provider', o.invoice_provider, 'invoice_provider_ref', o.invoice_provider_ref
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
    invoice_provider     = case when p ? 'invoice_provider' then nullif(trim(p->>'invoice_provider'), '') else o.invoice_provider end,
    invoice_provider_ref = case when p ? 'invoice_provider_ref' then nullif(trim(p->>'invoice_provider_ref'), '') else o.invoice_provider_ref end,
    public_enabled = coalesce((p->>'public_enabled')::boolean, o.public_enabled),
    lead_intake_enabled = coalesce((p->>'lead_intake_enabled')::boolean, o.lead_intake_enabled),
    updated_at     = now()
  where o.id = v_office
  returning jsonb_build_object(
    'id', o.id, 'name', o.name, 'license_number', o.license_number,
    'phone', o.phone, 'email', o.email, 'address', o.address, 'city', o.city,
    'logo_url', o.logo_url, 'about', o.about,
    'public_enabled', o.public_enabled, 'public_token', o.public_token,
    'lead_intake_enabled', o.lead_intake_enabled, 'lead_intake_token', o.lead_intake_token,
    'invoice_provider', o.invoice_provider, 'invoice_provider_ref', o.invoice_provider_ref
  ) into v;

  if v is null then
    raise exception 'המשרד לא נמצא';
  end if;
  return v;
end $$;

revoke all on function public.np_office_settings_save(jsonb) from anon;
