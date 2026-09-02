-- more30 · 36 nadlan-pro — external lead intake webhook (module 1, CRM)
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-25 without a
-- matching repo file until now. Captures the final live state.
-- ============================================================================
--
-- "לידים (קליטה מכל מקור: טופס/וואטסאפ/פייסבוק)" only ever meant manual entry
-- inside app.html — no external service could push a lead in. Adds an
-- anon-callable RPC gated by a per-office random token (same pattern as
-- properties.share_token / offices.public_token), so any Zapier/Make
-- automation on a Facebook Lead Ads form, or a WhatsApp-forwarding service,
-- can create a real lead with zero code on their side. Same-office-same-
-- contact-same-source retries within 5 minutes are deduped (webhook retries
-- are routine, not a new lead each time).

do $$ begin
  alter type nadlan_pro.lead_source add value if not exists 'whatsapp';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type nadlan_pro.lead_source add value if not exists 'facebook';
exception when duplicate_object then null; end $$;

alter table nadlan_pro.offices
  add column if not exists lead_intake_token text not null default encode(gen_random_bytes(18), 'hex'),
  add column if not exists lead_intake_enabled boolean not null default false;

create unique index if not exists offices_lead_intake_token_idx
  on nadlan_pro.offices (lead_intake_token);

-- SECURITY DEFINER + anon-callable by design: the caller is an external
-- automation with no Supabase session, authorized purely by possessing the
-- office's own token (rotatable via np_lead_intake_token_regenerate below).
create or replace function public.np_lead_intake(
  p_token text, p_full_name text, p_phone text default null, p_email text default null,
  p_source text default 'other', p_source_detail text default null, p_note text default null,
  p_kind text default 'buyer'
) returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_office nadlan_pro.offices%rowtype;
declare v_name text := nullif(trim(coalesce(p_full_name, '')), '');
declare v_phone text := nullif(trim(coalesce(p_phone, '')), '');
declare v_email text := nullif(trim(coalesce(p_email, '')), '');
declare v_source nadlan_pro.lead_source;
declare v_kind nadlan_pro.contact_kind;
declare v_id uuid;
declare v_dup uuid;
begin
  select * into v_office from nadlan_pro.offices
   where lead_intake_token = p_token and lead_intake_enabled = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'קישור קליטת לידים לא תקין או כבוי.');
  end if;

  if v_name is null or length(v_name) > 200 then
    return jsonb_build_object('ok', false, 'error', 'שם מלא חסר או ארוך מדי.');
  end if;
  if v_phone is null and v_email is null then
    return jsonb_build_object('ok', false, 'error', 'יש למסור טלפון או דוא״ל.');
  end if;
  if v_phone is not null and length(v_phone) > 50 then v_phone := left(v_phone, 50); end if;
  if v_email is not null and length(v_email) > 200 then v_email := left(v_email, 200); end if;

  v_source := case when p_source in ('whatsapp','facebook','website_form','portal','other')
                then p_source::nadlan_pro.lead_source else 'other' end;
  v_kind := case when p_kind in ('buyer','seller','renter','landlord','other')
                then p_kind::nadlan_pro.contact_kind else 'buyer' end;

  select c.id into v_dup from nadlan_pro.contacts c
   where c.office_id = v_office.id and c.source = v_source
     and c.created_at > now() - interval '5 minutes'
     and ((v_phone is not null and c.phone = v_phone) or (v_email is not null and c.email = v_email))
   limit 1;

  if v_dup is not null then
    return jsonb_build_object('ok', true, 'deduped', true);
  end if;

  insert into nadlan_pro.contacts (office_id, kind, full_name, phone, email, source, source_detail, notes)
  values (
    v_office.id, v_kind, v_name, v_phone, v_email, v_source,
    left(nullif(trim(coalesce(p_source_detail,'')),''), 200),
    left(nullif(trim(coalesce(p_note,'')),''), 2000)
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.np_lead_intake_token_regenerate(p_office uuid)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_token text;
begin
  if p_office is null or not nadlan_pro.manages_office(p_office) then
    raise exception 'רק בעלים/מנהל יכולים לחדש את הקישור';
  end if;

  update nadlan_pro.offices
     set lead_intake_token = encode(extensions.gen_random_bytes(18), 'hex'), updated_at = now()
   where id = p_office
  returning lead_intake_token into v_token;

  if v_token is null then
    raise exception 'המשרד לא נמצא';
  end if;
  return jsonb_build_object('lead_intake_token', v_token);
end $$;

-- `revoke all from public` alone does NOT strip the direct EXECUTE grant
-- Supabase's default privileges give `anon` on every newly created function —
-- this regenerate RPC must stay authenticated-only (unlike np_lead_intake
-- itself, which anon legitimately calls). A same-day live fix
-- (nadlan_pro_lead_intake_regen_revoke_anon) closed exactly this gap; the
-- explicit `from anon` below is why.
revoke all on function public.np_lead_intake_token_regenerate(uuid) from anon;
