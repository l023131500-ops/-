-- ============================================================================
-- Torah Platform · storage.objects INSERT — close cross-tenant write hole
-- ============================================================================
-- `authenticated_write_torah_buckets` (20260519000004) allows ANY authenticated
-- user (auth.uid() is not null, no role/tenant check at all) to INSERT into
-- portal-assets / materials-media / newsletters / site-images / shop-images
-- at ANY path. Two client flows upload under a tenant-id-prefixed path that
-- is meant to scope the file to that tenant:
--   - materials-media:  "<tenant_id>/<ts>-<rand>.<ext>"        (Materials.tsx)
--   - portal-assets:    "gallery/<tenant_id>/<ts>-<rand>.<ext>" (Gallery.tsx)
-- Because the storage policy never checks the uploader's tenant membership,
-- any signed-in user (including one with zero tenant roles) can write files
-- under another tenant's materials/gallery prefix — live-verified today via
-- a rolled-back direct insert into storage.objects as an arbitrary
-- authenticated uid with no user_roles row, succeeding against both
-- "materials-media/<foreign-tenant>/..." and
-- "portal-assets/gallery/<foreign-tenant>/...". Since the first writer also
-- becomes `owner` (owner-scoped UPDATE/DELETE policies already exist), this
-- also lets an outsider permanently squat a path and block/overwrite content
-- via upsert once the app later writes to the same generated name.
--
-- Fix: for these two specific tenant-id-prefixed path shapes, require the
-- uploader to actually hold a role in that tenant (any role) or be a super
-- admin. Every other existing path/bucket keeps the prior "any authenticated
-- user" behavior — no legitimate flow uses a tenant-id prefix on any other
-- bucket/path today, so this cannot regress newsletters/site-images/
-- shop-images or the non-tenant-prefixed portal-assets paths
-- (backgrounds/, rabbi-photos/, activity/, design/).
create or replace function public.torah_bucket_write_allowed(_bucket text, _name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp
as $$
declare
  _first_segment text;
  _tenant_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  if _bucket not in ('portal-assets','materials-media','newsletters','site-images','shop-images') then
    return false;
  end if;

  -- materials-media: "<tenant_id>/..."
  if _bucket = 'materials-media' then
    _first_segment := split_part(_name, '/', 1);
  -- portal-assets: only the "gallery/<tenant_id>/..." shape is tenant-scoped
  elsif _bucket = 'portal-assets' and split_part(_name, '/', 1) = 'gallery' then
    _first_segment := split_part(_name, '/', 2);
  else
    -- no tenant-id convention on this bucket/path shape — unchanged behavior
    return true;
  end if;

  begin
    _tenant_id := _first_segment::uuid;
  exception when invalid_text_representation then
    -- not a uuid-shaped prefix — not one of the tenant-scoped conventions,
    -- fall back to prior unrestricted behavior rather than guessing
    return true;
  end;

  if not exists (select 1 from public.tenants t where t.id = _tenant_id) then
    -- prefix isn't a real tenant id — nothing to protect against, allow
    return true;
  end if;

  -- any role in the tenant (member/moderator/tenant_admin) or super admin —
  -- matches how Materials.tsx/Gallery.tsx let plain members upload pending
  -- moderator approval, same "any-role" semantics as public.user_in_tenant.
  return public.user_in_tenant(_tenant_id);
end;
$$;

do $$ begin
  drop policy if exists "authenticated_write_torah_buckets" on storage.objects;
  create policy "authenticated_write_torah_buckets" on storage.objects for insert with check (
    bucket_id in ('portal-assets','materials-media','newsletters','site-images','shop-images')
    and public.torah_bucket_write_allowed(bucket_id, name)
  );
exception when others then null; end $$;

-- RLS `with check` expressions execute as the querying role (anon/authenticated),
-- not as this function's SECURITY DEFINER owner — SECURITY DEFINER only elevates
-- privileges *inside* the function body. anon/authenticated therefore need direct
-- EXECUTE to use the policy at all; this is the same accepted pattern already used
-- by public.has_tenant_role / public.user_in_tenant (both anon/authenticated-
-- executable SECURITY DEFINER helpers), and this function only returns a boolean
-- derived from public tenant ids — no sensitive data exposure via direct RPC call.
grant execute on function public.torah_bucket_write_allowed(text, text) to anon, authenticated;
